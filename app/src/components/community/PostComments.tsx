import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { subscribePostComments, createNotification, type GroupComment } from '../../lib/firestoreService';
import { useCommunity, type CommunityRole } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfileModal } from '../social/UserProfileModal';
import ReportModal from './ReportModal';
import MentionInput, { renderMentions, extractMentionUids } from './MentionInput';

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

const COMMENT_REACTION_CONFIG = [
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
// Sub-component: single comment row
// ---------------------------------------------------------------------------

interface CommentRowProps {
  comment: GroupComment;
  currentUserUid: string;
  currentUserRole: CommunityRole;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string, authorId: string) => void;
  onReact: (commentId: string, reaction: 'paw' | 'bone' | 'heart') => void;
  onViewProfile: (uid: string) => void;
  onReport: (commentId: string) => void;
  onMentionClick?: (uid: string) => void;
  isReply?: boolean;
}

function CommentRow({
  comment,
  currentUserUid,
  currentUserRole,
  onReply,
  onDelete,
  onReact,
  onViewProfile,
  onReport,
  onMentionClick,
  isReply = false,
}: CommentRowProps) {
  const canDelete =
    comment.authorId === currentUserUid ||
    currentUserRole === 'Owner' ||
    currentUserRole === 'Moderator';
  const isModerator = currentUserRole === 'Owner' || currentUserRole === 'Moderator';
  const isOwnComment = comment.authorId === currentUserUid;

  return (
    <div className={`flex gap-2.5 ${isReply ? 'pl-8' : ''}`}>
      {/* Avatar */}
      <button
        onClick={() => onViewProfile(comment.authorId)}
        className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-sky-700 hover:ring-2 hover:ring-sky-400 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-0.5"
        aria-label={`View ${comment.authorName}'s profile`}
      >
        {authorInitials(comment.authorName)}
      </button>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="bg-surface-container-high rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <button
              onClick={() => onViewProfile(comment.authorId)}
              className="text-xs font-semibold text-on-surface hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
            >
              {comment.authorName}
            </button>
            <span className="text-xs text-on-surface-variant">
              {relativeTime(comment.createdAt)}
            </span>
            {comment.isFlagged && isModerator && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                ⚠️ Under review
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed break-words">
            {/* TODO: open UserProfileModal when onMentionClick is wired from parent */}
            {renderMentions(comment.content, onMentionClick ?? (() => {}))}
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
          {/* Reactions */}
          {COMMENT_REACTION_CONFIG.map(({ key, emoji }) => {
            const count = comment.reactions?.[key]?.length ?? 0;
            const isActive = comment.reactions?.[key]?.includes(currentUserUid) ?? false;
            return (
              <button
                key={key}
                onClick={() => onReact(comment.id, key)}
                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500
                  ${isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                aria-pressed={isActive}
                aria-label={`${key} reaction${count > 0 ? `, ${count}` : ''}`}
                title={`React with ${key}`}
              >
                <span aria-hidden="true">{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}

          {/* Reply — only on top-level comments */}
          {!isReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
            >
              Reply
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id, comment.authorId)}
              className="text-xs text-on-surface-variant hover:text-error transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded ml-auto"
              aria-label="Delete comment"
              title="Delete comment"
            >
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">delete</span>
            </button>
          )}

          {/* Report — only for non-authors */}
          {!isOwnComment && (
            <button
              onClick={() => onReport(comment.id)}
              className="text-xs text-on-surface-variant hover:text-amber-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded flex items-center gap-0.5"
              aria-label="Report comment"
              title="Report comment"
            >
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">flag</span>
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

export interface PostCommentsProps {
  groupId: string;
  postId: string;
  isGroupMember: boolean;
  currentUserUid: string;
  currentUserRole: CommunityRole;
  onProfileClick?: (uid: string) => void;
}

export default function PostComments({
  groupId,
  postId,
  isGroupMember,
  currentUserUid,
  currentUserRole,
  onProfileClick,
}: PostCommentsProps) {
  const { addComment, deleteComment, reactToComment } = useCommunity();
  const { user, profile } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Report modal state
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // New comment input
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Profile modal
  const [profileUid, setProfileUid] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe when expanded; unsubscribe when collapsed
  useEffect(() => {
    if (!expanded) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }
    setLoadingComments(true);
    const unsub = subscribePostComments(
      groupId,
      postId,
      (incoming) => {
        setComments(incoming);
        setLoadingComments(false);
      },
      () => setLoadingComments(false),
    );
    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [expanded, groupId, postId]);

  // Scroll to bottom when new comments arrive while expanded
  useEffect(() => {
    if (expanded && comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [comments.length, expanded]);

  // Counts (works even when collapsed because FeedSection can pass a commentCount prop later)
  const topLevel = comments.filter(c => !c.parentCommentId);
  const replies = comments.filter(c => c.parentCommentId);

  const totalCount = comments.length;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleToggle() {
    setExpanded(prev => !prev);
  }

  async function handleSubmitComment() {
    const text = newCommentText.trim();
    if (!text) return;
    setSubmittingComment(true);
    try {
      await addComment(groupId, postId, text);
      setNewCommentText('');
      setSubmitError(null);
      // Notify mentioned members
      if (user) {
        const mentionedUids = extractMentionUids(text);
        for (const uid of mentionedUids) {
          if (uid !== user.uid) {
            createNotification(uid, {
              type: 'mention',
              fromUid: user.uid,
              targetType: 'comment',
              message: `${profile?.displayName ?? 'Someone'} mentioned you in a comment`,
              read: false,
              createdAt: Date.now(),
            }).catch(() => {});
          }
        }
      }
    } catch {
      setSubmitError('Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleSubmitReply(parentId: string) {
    const text = replyText.trim();
    if (!text) return;
    setReplyError(null);
    setSubmittingReply(true);
    try {
      await addComment(groupId, postId, text, parentId);
      setReplyText('');
      setReplyingToId(null);
      // Notify mentioned members
      if (user) {
        const mentionedUids = extractMentionUids(text);
        for (const uid of mentionedUids) {
          if (uid !== user.uid) {
            createNotification(uid, {
              type: 'mention',
              fromUid: user.uid,
              targetType: 'comment',
              message: `${profile?.displayName ?? 'Someone'} mentioned you in a comment`,
              read: false,
              createdAt: Date.now(),
            }).catch(() => {});
          }
        }
      }
    } catch {
      setReplyError('Failed to post reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleDelete(commentId: string, authorId: string) {
    await deleteComment(groupId, postId, commentId, authorId);
  }

  async function handleReact(commentId: string, reaction: 'paw' | 'bone' | 'heart') {
    const comment = comments.find(c => c.id === commentId);
    const alreadyReacted = (comment?.reactions?.[reaction] ?? []).includes(currentUserUid);
    await reactToComment(groupId, postId, commentId, reaction, alreadyReacted);
  }

  function handleReply(commentId: string) {
    setReplyingToId(prev => (prev === commentId ? null : commentId));
    setReplyText('');
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mt-3 pt-3 border-t border-outline-variant">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
        aria-expanded={expanded}
        aria-controls={`comments-${postId}`}
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chat</span>
        <span>
          {totalCount === 0
            ? (expanded ? 'Hide comments' : '0 comments')
            : expanded
              ? `Hide ${totalCount} comment${totalCount === 1 ? '' : 's'}`
              : `${totalCount} comment${totalCount === 1 ? '' : 's'}`}
        </span>
      </button>

      {/* Expandable body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id={`comments-${postId}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mt-3 space-y-3">
              {/* Loading spinner */}
              {loadingComments && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading comments" />
                </div>
              )}

              {/* Comment list */}
              {!loadingComments && topLevel.map(comment => {
                const commentReplies = replies.filter(r => r.parentCommentId === comment.id);
                return (
                  <div key={comment.id} className="space-y-2">
                    <CommentRow
                      comment={comment}
                      currentUserUid={currentUserUid}
                      currentUserRole={currentUserRole}
                      onReply={handleReply}
                      onDelete={handleDelete}
                      onReact={handleReact}
                      onViewProfile={setProfileUid}
                      onReport={setReportCommentId}
                      onMentionClick={onProfileClick ?? setProfileUid}
                    />

                    {/* Replies */}
                    {commentReplies.map(reply => (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        currentUserUid={currentUserUid}
                        currentUserRole={currentUserRole}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onReact={handleReact}
                        onViewProfile={setProfileUid}
                        onReport={setReportCommentId}
                        onMentionClick={onProfileClick ?? setProfileUid}
                        isReply
                      />
                    ))}

                    {/* Inline reply input */}
                    {replyingToId === comment.id && (
                      <div className="pl-8">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant flex-shrink-0 mt-2" aria-hidden="true">subdirectory_arrow_right</span>
                          <div className="flex-1 flex items-start gap-2">
                            <MentionInput
                              groupId={groupId}
                              value={replyText}
                              onChange={setReplyText}
                              onSubmit={() => handleSubmitReply(comment.id)}
                              placeholder="Write a reply…"
                              rows={1}
                              className="flex-1 text-xs rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder-on-surface-variant px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              disabled={submittingReply}
                            />
                            <button
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={!replyText.trim() || submittingReply}
                              className="p-1.5 rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-0.5"
                              aria-label="Send reply"
                              title="Send reply"
                            >
                              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">send</span>
                            </button>
                          </div>
                        </div>
                        {replyError && (
                          <p className="text-error text-xs mt-1 pl-5">{replyError}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {!loadingComments && topLevel.length === 0 && (
                <p className="text-center text-xs text-on-surface-variant py-2">
                  No comments yet. Be the first!
                </p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* New comment input — only for members */}
            {isGroupMember && (
              <div className="mt-3">
                <div className="flex items-start gap-2">
                  <MentionInput
                    groupId={groupId}
                    value={newCommentText}
                    onChange={setNewCommentText}
                    onSubmit={handleSubmitComment}
                    placeholder="Add a comment…"
                    rows={1}
                    className="flex-1 text-xs rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder-on-surface-variant px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={submittingComment}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newCommentText.trim() || submittingComment}
                    className="p-1.5 rounded-full bg-primary text-on-primary disabled:opacity-40 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-0.5 shrink-0"
                    aria-label="Post comment"
                    title="Post comment"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">send</span>
                  </button>
                </div>
                {submitError && (
                  <p className="text-error text-xs mt-1">{submitError}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* UserProfileModal */}
      <AnimatePresence>
        {profileUid && (
          <UserProfileModal
            uid={profileUid}
            onClose={() => setProfileUid(null)}
          />
        )}
      </AnimatePresence>

      {/* ReportModal */}
      <ReportModal
        open={reportCommentId !== null}
        onClose={() => setReportCommentId(null)}
        targetType="comment"
        targetId={reportCommentId ?? ''}
        groupId={groupId}
        parentPostId={postId}
      />
    </div>
  );
}
