import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MessageSquare, Pin, Trash2, Image as ImageIcon, X, LogIn } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import MentionInput, { renderMentions, extractMentionUids } from '../community/MentionInput';
import PostComments from '../community/PostComments';
import { createNotification } from '../../lib/firestoreService';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { GroupPost, CommunityRole } from '../../contexts/CommunityContext';
import type { User } from 'firebase/auth';

interface GroupFeedTabProps {
  group: {
    id: string;
    name: string;
    description: string;
    image?: string;
    tags: string[];
    members: Record<string, any>;
    posts: GroupPost[];
    retentionDays?: number;
  };
  userRole: string | null;
  user: User | null;
  profile: { displayName?: string; friends?: string[] } | null;
  createPost: (groupId: string, content: string, imageFile?: File) => Promise<void>;
  pinPost: (groupId: string, postId: string, pinned: boolean) => void;
  deletePost: (groupId: string, postId: string) => void;
  joinGroup: (groupId: string) => Promise<void>;
  hasMorePosts: Record<string, boolean>;
  loadMorePosts: (groupId: string) => Promise<void>;
  onProfileClick: (uid: string) => void;
  onImageClick: (url: string) => void;
}

export function GroupFeedTab({
  group,
  userRole,
  user,
  profile,
  createPost,
  pinPost,
  deletePost,
  joinGroup,
  hasMorePosts,
  loadMorePosts,
  onProfileClick,
  onImageClick,
}: GroupFeedTabProps) {
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const [feedTab, setFeedTab] = useState<'recent' | 'trending'>('recent');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (postImagePreview) URL.revokeObjectURL(postImagePreview);
    };
  }, [postImagePreview]);

  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (postImagePreview) URL.revokeObjectURL(postImagePreview);
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearPostImage = () => {
    if (postImagePreview) URL.revokeObjectURL(postImagePreview);
    setPostImageFile(null);
    setPostImagePreview(null);
  };

  const canPin = userRole === 'Owner' || userRole === 'Moderator';
  const canDeletePost = userRole === 'Owner' || userRole === 'Moderator';

  const recentPosts = useMemo(() => {
    const retentionMs = (group.retentionDays ?? 365) * 24 * 60 * 60 * 1000;
    return group.posts.filter(p => Date.now() - p.createdAt < retentionMs);
  }, [group.posts, group.retentionDays]);

  const pinnedPosts = useMemo(() => recentPosts.filter(p => p.isPinned), [recentPosts]);
  const regularPosts = useMemo(() => recentPosts.filter(p => !p.isPinned), [recentPosts]);

  const displayPosts = useMemo(() =>
    feedTab === 'trending'
      ? [...regularPosts].sort((a, b) =>
          ((b.reactions?.paw?.length ?? 0) + (b.reactions?.bone?.length ?? 0) + (b.reactions?.heart?.length ?? 0)) -
          ((a.reactions?.paw?.length ?? 0) + (a.reactions?.bone?.length ?? 0) + (a.reactions?.heart?.length ?? 0))
        )
      : regularPosts,
  [feedTab, regularPosts]);

  const submitPost = async () => {
    if (isPosting) return;
    if (!newPostContent.trim() || !user) return;
    setIsPosting(true);
    const content = newPostContent.trim();
    const imageFile = postImageFile ?? undefined;
    setNewPostContent('');
    clearPostImage();
    try {
      await createPost(group.id, content, imageFile);
      const mentionedUids = extractMentionUids(content);
      for (const uid of mentionedUids) {
        if (uid !== user.uid) {
          createNotification(uid, {
            type: 'mention',
            fromUid: user.uid,
            targetType: 'post',
            message: `${profile?.displayName ?? 'Someone'} mentioned you in ${group.name}`,
            read: false,
            createdAt: Date.now(),
          }).catch(() => {});
        }
      }
    } finally {
      setIsPosting(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPost();
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Join banner for non-members */}
      {!userRole && (
        <div className="relative bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
          <div className="h-24 w-full">
            {group.image ? (
              <img src={group.image} alt="" className="w-full h-full object-cover opacity-60" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 opacity-60" />
            )}
          </div>
          <div className="p-5 -mt-6 relative">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{group.name}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{group.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">{Object.keys(group.members).length} members</span>
              {group.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {group.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                setIsJoining(true);
                setJoinError(null);
                try {
                  await joinGroup(group.id);
                } catch (err: any) {
                  if (err?.message === 'BANNED') {
                    setJoinError('You cannot join this group');
                  } else {
                    setJoinError('Could not join -- please try again');
                  }
                } finally {
                  setIsJoining(false);
                }
              }}
              disabled={isJoining}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[44px]"
            >
              <LogIn className="w-4 h-4" />
              {isJoining ? 'Joining...' : 'Join Group'}
            </button>
            {joinError && <p className="text-xs text-rose-500 mt-2 text-center" role="alert">{joinError}</p>}
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">You can browse posts below</p>
          </div>
        </div>
      )}

      {userRole && (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
          <form onSubmit={handlePost} className="flex gap-3">
            <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="You" className="w-10 h-10 rounded-full bg-neutral-100" />
            <div className="flex-1">
              <MentionInput
                value={newPostContent}
                onChange={setNewPostContent}
                onSubmit={submitPost}
                placeholder="Share something with the group..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
                groupId={group.id}
                disabled={isPosting}
              />

              {/* Image preview thumbnail */}
              {postImagePreview && (
                <div className="relative mt-2 inline-block">
                  <img
                    src={postImagePreview}
                    alt="Attachment preview"
                    className="rounded-xl max-h-40 max-w-full object-cover border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={clearPostImage}
                    className="absolute top-1 right-1 bg-neutral-900/60 hover:bg-neutral-900/80 text-white rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    aria-label="Remove image attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={() => postImageInputRef.current?.click()}
                  disabled={isPosting}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded px-1 py-1 min-h-[36px]"
                  aria-label="Attach image"
                >
                  <ImageIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Photo</span>
                </button>
                <input
                  ref={postImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePostImageSelect}
                />
                <button
                  type="submit"
                  disabled={isPosting || !newPostContent.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors min-h-[44px]"
                >
                  Post
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Feed Tab Selector */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFeedTab('recent')}
          className={`px-3 py-1 rounded-full text-sm ${feedTab === 'recent' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
        >Recent</button>
        <button
          onClick={() => setFeedTab('trending')}
          className={`px-3 py-1 rounded-full text-sm ${feedTab === 'trending' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
        >Trending</button>
      </div>

      {/* Pinned Posts */}
      {pinnedPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Pin className="w-4 h-4" /> Pinned
          </h3>
          {pinnedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              groupId={group.id}
              canPin={canPin}
              canDelete={canDeletePost}
              pinPost={pinPost}
              deletePost={deletePost}
              isAuthor={post.authorId === user?.uid}
              onProfileClick={onProfileClick}
              currentUserUid={user?.uid ?? ''}
              currentUserRole={userRole ?? 'User'}
              isGroupMember={!!userRole}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}

      {/* Regular Feed */}
      <div className="space-y-4">
        {pinnedPosts.length > 0 && displayPosts.length > 0 && (
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mt-8">
            {feedTab === 'trending' ? 'Trending Discussions' : 'Recent Discussions'}
          </h3>
        )}
        {displayPosts.length === 0 && pinnedPosts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              title="Be the first!"
              description="Start a conversation -- share something with the group!"
            />
          </div>
        ) : (
          displayPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              groupId={group.id}
              canPin={canPin}
              canDelete={canDeletePost}
              pinPost={pinPost}
              deletePost={deletePost}
              isAuthor={post.authorId === user?.uid}
              onProfileClick={onProfileClick}
              currentUserUid={user?.uid ?? ''}
              currentUserRole={userRole ?? 'User'}
              isGroupMember={!!userRole}
              onImageClick={onImageClick}
            />
          ))
        )}
        {hasMorePosts[group.id] && (
          <button
            onClick={() => loadMorePosts(group.id)}
            className="w-full py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors"
          >
            Load more posts
          </button>
        )}
      </div>
    </div>
  );
}

// ── PostCard (local to GroupFeedTab) ────────────────────────────────────────

function PostCard({ post, groupId, canPin, canDelete, pinPost, deletePost, isAuthor, onProfileClick, currentUserUid, currentUserRole, isGroupMember, onImageClick }: {
  post: GroupPost;
  groupId: string;
  canPin: boolean;
  canDelete: boolean;
  pinPost: (groupId: string, postId: string, pinned: boolean) => void;
  deletePost: (groupId: string, postId: string) => void;
  isAuthor: boolean;
  onProfileClick: (uid: string) => void;
  currentUserUid: string;
  currentUserRole: CommunityRole | string;
  isGroupMember: boolean;
  onImageClick?: (url: string) => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border ${post.isPinned ? 'border-amber-200 dark:border-amber-900/50 outline outline-2 outline-amber-100 dark:outline-amber-900/30' : 'border-neutral-100 dark:border-neutral-700'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 mb-3">
          <img src={post.authorImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} alt={post.authorName} className="w-10 h-10 rounded-full bg-neutral-100" />
          <div>
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {post.authorName} {isAuthor && <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-500 font-normal">You</span>}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canPin && (
            <button
              onClick={() => pinPost(groupId, post.id, !post.isPinned)}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${post.isPinned ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
              aria-label={post.isPinned ? "Unpin Post" : "Pin Post"}
              title={post.isPinned ? "Unpin Post" : "Pin Post"}
            >
              <Pin className={`w-4 h-4 ${post.isPinned ? 'fill-current' : ''}`} />
            </button>
          )}
          {(canDelete || isAuthor) && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Delete Post"
              title="Delete Post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">{renderMentions(post.content, onProfileClick)}</p>
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post attachment"
          className="rounded-xl mt-3 max-h-80 w-full object-cover cursor-pointer"
          onClick={() => onImageClick?.(post.imageUrl!)}
        />
      )}
      <div className="mt-4 border-t border-neutral-100 dark:border-neutral-700 pt-3">
        <PostComments
          groupId={groupId}
          postId={post.id}
          isGroupMember={isGroupMember}
          currentUserUid={currentUserUid}
          currentUserRole={currentUserRole as CommunityRole}
          onProfileClick={onProfileClick}
        />
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          deletePost(groupId, post.id);
          setDeleteConfirm(false);
        }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
