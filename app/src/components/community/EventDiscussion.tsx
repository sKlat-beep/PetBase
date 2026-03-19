import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { subscribeEventPosts, type EventPost } from '../../lib/firestoreService';
import { useCommunity, type CommunityRole } from '../../contexts/CommunityContext';
import { UserProfileModal } from '../social/UserProfileModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const EVENT_REACTION_CONFIG = [
  { key: 'paw'   as const, emoji: '🐾' },
  { key: 'bone'  as const, emoji: '🦴' },
  { key: 'heart' as const, emoji: '❤️' },
];

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? '?').toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-component: single post row
// ---------------------------------------------------------------------------

interface PostRowProps {
  post: EventPost;
  currentUserUid: string;
  currentUserRole: CommunityRole;
  onDelete: (postId: string, authorId: string) => void;
  onReact: (postId: string, reaction: 'paw' | 'bone' | 'heart') => void;
  onViewProfile: (uid: string) => void;
}

function PostRow({
  post,
  currentUserUid,
  currentUserRole,
  onDelete,
  onReact,
  onViewProfile,
}: PostRowProps) {
  const canDelete =
    post.authorId === currentUserUid ||
    currentUserRole === 'Owner' ||
    currentUserRole === 'Moderator';

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <button
        onClick={() => onViewProfile(post.authorId)}
        className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-sky-700 hover:ring-2 hover:ring-sky-400 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-0.5"
        aria-label={`View ${post.authorName}'s profile`}
      >
        {authorInitials(post.authorName)}
      </button>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="bg-surface-container-high rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <button
              onClick={() => onViewProfile(post.authorId)}
              className="text-[11px] font-semibold text-on-surface hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
            >
              {post.authorName}
            </button>
            <span className="text-[10px] text-on-surface-variant">
              {relativeTime(post.createdAt)}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed break-words">
            {post.content}
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
          {/* Reactions */}
          {EVENT_REACTION_CONFIG.map(({ key, emoji }) => {
            const count = post.reactions?.[key]?.length ?? 0;
            const isActive = post.reactions?.[key]?.includes(currentUserUid) ?? false;
            return (
              <button
                key={key}
                onClick={() => onReact(post.id, key)}
                className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500
                  ${isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                aria-pressed={isActive}
                aria-label={`${key} reaction${count > 0 ? `, ${count}` : ''}`}
              >
                <span aria-hidden="true">{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id, post.authorId)}
              className="text-[10px] text-on-surface-variant hover:text-error transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded ml-auto"
              aria-label="Delete post"
            >
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface EventDiscussionProps {
  groupId: string;
  eventId: string;
  currentUserUid: string;
  attendeeIds: string[];
  currentUserRole: CommunityRole;
}

export default function EventDiscussion({
  groupId,
  eventId,
  currentUserUid,
  attendeeIds,
  currentUserRole,
}: EventDiscussionProps) {
  const { createEventPost, deleteEventPost, reactToEventPost } = useCommunity();

  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const isAttendee = attendeeIds.includes(currentUserUid);

  // Subscribe to event posts on mount
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeEventPosts(
      groupId,
      eventId,
      (incoming) => {
        setPosts(incoming);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [groupId, eventId]);

  // Scroll to bottom when new posts arrive
  useEffect(() => {
    if (posts.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [posts.length]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleSubmit() {
    const text = newPostText.trim();
    if (!text || text.length > 500) {
      if (text.length > 500) setSubmitError('Posts must be 500 characters or less.');
      return;
    }
    setSubmitting(true);
    try {
      await createEventPost(groupId, eventId, text);
      setNewPostText('');
      setSubmitError(null);
    } catch {
      setSubmitError('Failed to post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(postId: string, authorId: string) {
    try {
      await deleteEventPost(groupId, eventId, postId, authorId);
    } catch {
      // Show brief error - for now just log; full error UI is Phase 4
      console.error('Failed to delete event post');
    }
  }

  async function handleReact(postId: string, reaction: 'paw' | 'bone' | 'heart') {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const alreadyReacted = (post.reactions?.[reaction] ?? []).includes(currentUserUid);
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const current = p.reactions?.[reaction] ?? [];
      const updated = alreadyReacted
        ? current.filter(uid => uid !== currentUserUid)
        : [...current, currentUserUid];
      return {
        ...p,
        reactions: {
          paw: [],
          bone: [],
          heart: [],
          ...p.reactions,
          [reaction]: updated,
        },
      };
    }));
    await reactToEventPost(groupId, eventId, postId, reaction, alreadyReacted);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant">
      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading posts" />
        </div>
      )}

      {/* Post list */}
      {!loading && (
        <div className="space-y-3">
          {posts.length === 0 && isAttendee && (
            <p className="text-center text-xs text-on-surface-variant py-2">
              No posts yet — be the first to share something about this event! 🐾
            </p>
          )}

          {posts.length === 0 && !isAttendee && (
            <p className="text-center text-xs text-on-surface-variant py-2">
              RSVP to join the discussion
            </p>
          )}

          {posts.map(post => (
            <PostRow
              key={post.id}
              post={post}
              currentUserUid={currentUserUid}
              currentUserRole={currentUserRole}
              onDelete={handleDelete}
              onReact={handleReact}
              onViewProfile={setProfileUid}
            />
          ))}

          <div ref={bottomRef} />
        </div>
      )}

      {/* New post input — only for attendees */}
      {isAttendee && !loading && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Share something about this event…"
              className="flex-1 text-xs rounded-full border border-outline-variant bg-surface-container-low text-on-surface placeholder-on-surface-variant px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={submitting}
            />
            <span className="text-xs text-on-surface-variant">{newPostText.length}/500</span>
            <button
              onClick={handleSubmit}
              disabled={!newPostText.trim() || submitting}
              className="p-1.5 rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Post"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">send</span>
            </button>
          </div>
          {submitError && (
            <p className="text-error text-xs mt-1">{submitError}</p>
          )}
        </div>
      )}

      {/* UserProfileModal */}
      <AnimatePresence>
        {profileUid && (
          <UserProfileModal
            uid={profileUid}
            onClose={() => setProfileUid(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
