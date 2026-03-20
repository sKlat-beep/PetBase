import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import EmptyState from '../ui/EmptyState';
import { useNavigate } from 'react-router';
import { useCommunity, type CommunityRole } from '../../contexts/CommunityContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfileModal } from '../social/UserProfileModal';
import PostComments from './PostComments';
import ReportModal from './ReportModal';
import { SkeletonPost } from '../ui/Skeleton';
import { Tooltip } from '../ui/Tooltip';
import { searchPublicProfiles } from '../../lib/firestoreService';
import { ImageLightbox } from '../ui/ImageLightbox';

const REACTION_CONFIG = [
  { key: 'paw'  as const, emoji: '🐾', label: 'Paw' },
  { key: 'bone' as const, emoji: '🦴', label: 'Bone' },
  { key: 'heart' as const, emoji: '❤️', label: 'Heart' },
];

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function formatReactors(uids: string[], profileMap: Record<string, string>): string {
  if (uids.length === 0) return '';
  const names = uids.map(uid => profileMap[uid] ?? 'Someone');
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`;
}

// ─── Long-press reaction button with tooltip ──────────────────────────────────
function ReactionButton({
  emoji,
  label,
  count,
  isActive,
  tooltipText,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  isActive: boolean;
  tooltipText: string;
  onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => setShowTooltip(true), 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Hide after a brief display so user can read
    setTimeout(() => setShowTooltip(false), 1500);
  }, []);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <Tooltip content={tooltipText} forceShow={showTooltip}>
      <button
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex items-center gap-1 text-sm px-2 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[32px]
          ${isActive
            ? 'bg-primary-container text-on-primary-container'
            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest [&>span:first-child]:drop-shadow-sm'
          }`}
        aria-label={`${label} reaction${count > 0 ? `, ${count}` : ''}`}
        aria-pressed={isActive}
      >
        <span className="text-lg leading-none" aria-hidden="true">{emoji}</span>
        {count > 0 && <span>{count}</span>}
      </button>
    </Tooltip>
  );
}

function useReactorProfileCache(uids: string[]): Record<string, string> {
  const [cache, setCache] = useState<Record<string, string>>({});
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (uids.length === 0) return;
    const key = [...uids].sort().join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    searchPublicProfiles('').then(profiles => {
      const map: Record<string, string> = {};
      profiles.forEach(p => {
        if (uids.includes(p.uid)) {
          map[p.uid] = p.displayName;
        }
      });
      setCache(map);
    }).catch(() => {});
  }, [uids]);

  return cache;
}

interface PostCardProps {
  post: {
    id: string;
    groupId: string;
    groupName: string;
    authorId: string;
    authorName: string;
    content: string;
    imageUrl?: string;
    createdAt: number;
    isPinned: boolean;
    isFlagged?: boolean;
    reactions?: { paw: string[]; bone: string[]; heart: string[] };
  };
  uid: string;
  memberRole: CommunityRole;
  isGroupMember: boolean;
  reacted: { paw: boolean; bone: boolean; heart: boolean };
  profileMap: Record<string, string>;
  onViewProfile: (uid: string) => void;
  onNavigateGroup: (groupId: string) => void;
  onReact: (groupId: string, postId: string, key: 'paw' | 'bone' | 'heart') => void;
  onReport: (postId: string, groupId: string) => void;
  onImageClick?: (url: string) => void;
}

const PostCard = React.memo(function PostCard({
  post,
  uid,
  memberRole,
  isGroupMember,
  reacted,
  profileMap,
  onViewProfile,
  onNavigateGroup,
  onReact,
  onReport,
  onImageClick,
}: PostCardProps) {
  return (
    <motion.div
      className="rounded-xl border border-outline-variant p-4 bg-surface-container-low"
      layout
    >
      {/* Flagged banner — visible to Owners and Moderators only */}
      {post.isFlagged && (memberRole === 'Owner' || memberRole === 'Moderator') && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-3">
          ⚠️ Under review
        </div>
      )}

      {/* Author row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => onViewProfile(post.authorId)}
            className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 text-xs font-medium text-on-primary-container hover:ring-2 hover:ring-primary transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label={`View ${post.authorName}'s profile`}
          >
            {post.authorName?.[0]?.toUpperCase() ?? '?'}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onViewProfile(post.authorId)}
                className="text-xs font-semibold text-on-surface truncate hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
              >
                {post.authorName}
              </button>
              {post.isPinned && (
                <span className="material-symbols-outlined text-[12px] text-amber-500 flex-shrink-0" aria-label="Pinned post">push_pin</span>
              )}
            </div>
            <span className="text-xs text-on-surface-variant">
              in{' '}
              <button
                onClick={() => onNavigateGroup(post.groupId)}
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
              >
                {post.groupName}
              </button>
              {' · '}
              {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Report button — only for non-authors */}
          {uid && post.authorId !== uid && (
            <button
              onClick={() => onReport(post.id, post.groupId)}
              className="text-on-surface-variant hover:text-amber-500 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded transition-colors"
              aria-label="Report post"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">flag</span>
            </button>
          )}
          <button
            onClick={() => onNavigateGroup(post.groupId)}
            className="text-on-surface-variant hover:text-on-surface p-1 min-w-[28px] min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
            aria-label={`View post in ${post.groupName}`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Post content */}
      <p className="text-sm text-on-surface-variant mt-2.5 leading-relaxed line-clamp-3">
        {post.content}
      </p>

      {/* Post image */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post attachment"
          className="rounded-xl mt-3 max-h-80 w-full object-cover cursor-pointer"
          onClick={() => onImageClick?.(post.imageUrl!)}
        />
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2 mt-3" role="group" aria-label="Post reactions">
        {REACTION_CONFIG.map(({ key, emoji, label }) => {
          const reactionUids = post.reactions?.[key] ?? [];
          const count = reactionUids.length;
          const isActive = reacted[key];
          return (
            <ReactionButton
              key={key}
              emoji={emoji}
              label={label}
              count={count}
              isActive={isActive}
              tooltipText={formatReactors(reactionUids, profileMap)}
              onClick={() => onReact(post.groupId, post.id, key)}
            />
          );
        })}
      </div>

      {/* Comments */}
      <PostComments
        groupId={post.groupId}
        postId={post.id}
        isGroupMember={isGroupMember}
        currentUserUid={uid}
        currentUserRole={memberRole}
      />
    </motion.div>
  );
});

export default function FeedSection() {
  const { groups, reactToPost, loadMorePosts, hasMorePosts } = useCommunity();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [reportPost, setReportPost] = useState<{ postId: string; groupId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(false);
  }, [groups, refreshKey]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  const handleViewProfile = useCallback((uid: string) => {
    setProfileUid(uid);
  }, []);

  const handleNavigateGroup = useCallback((groupId: string) => {
    navigate(`/community/${groupId}`);
  }, [navigate]);

  const handleReact = useCallback((groupId: string, postId: string, key: 'paw' | 'bone' | 'heart') => {
    if (user) reactToPost(groupId, postId, key);
  }, [user, reactToPost]);

  const handleReport = useCallback((postId: string, groupId: string) => {
    setReportPost({ postId, groupId });
  }, []);

  usePullToRefresh({ onRefresh: handleRefresh, containerRef: feedScrollRef });

  // IntersectionObserver sentinel — triggers loadMorePosts when the bottom of the
  // virtualized list scrolls into view. Only active when a specific group is selected
  // (pagination is per-group; "all" is a local merge of already-loaded posts).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || groupFilter === 'all') return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || isPaginating) return;
        if (hasMorePosts[groupFilter] === false) return;
        setIsPaginating(true);
        try {
          await loadMorePosts(groupFilter);
        } finally {
          setIsPaginating(false);
        }
      },
      { root: feedScrollRef.current, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [groupFilter, isPaginating, hasMorePosts, loadMorePosts]);

  const userGroups = useMemo(
    () => groups.filter(g => user && g.members[user.uid]),
    [groups, user]
  );

  const friendIds = useMemo(() => new Set(profile?.friends ?? []), [profile?.friends]);

  const recentPosts = useMemo(() => {
    const cutoff = Date.now() - SIXTY_DAYS_MS;
    const reactionCount = (p: any) =>
      (p.reactions?.paw?.length ?? 0) + (p.reactions?.bone?.length ?? 0) + (p.reactions?.heart?.length ?? 0);

    return userGroups
      .flatMap(g => g.posts
        .filter(p => p.createdAt > cutoff)
        .map(p => ({ ...p, groupId: g.id, groupName: g.name }))
      )
      .filter(p => groupFilter === 'all' || p.groupId === groupFilter)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        // Personalization: boost friend posts and high-engagement posts
        const aFriend = friendIds.has(a.authorId) ? 1 : 0;
        const bFriend = friendIds.has(b.authorId) ? 1 : 0;
        if (aFriend !== bFriend) return bFriend - aFriend;
        // Secondary: engagement-weighted recency
        const aScore = a.createdAt + reactionCount(a) * 3600_000; // each reaction = 1hr boost
        const bScore = b.createdAt + reactionCount(b) * 3600_000;
        return bScore - aScore;
      })
      .slice(0, 20);
  }, [userGroups, groupFilter, friendIds]);

  const feedVirtualizer = useVirtualizer({
    count: recentPosts.length,
    getScrollElement: () => feedScrollRef.current,
    estimateSize: () => 200,
    overscan: 3,
  });

  const allReactorUids = useMemo(() => {
    const uids = new Set<string>();
    recentPosts.forEach(p => {
      (p.reactions?.paw ?? []).forEach(u => uids.add(u));
      (p.reactions?.bone ?? []).forEach(u => uids.add(u));
      (p.reactions?.heart ?? []).forEach(u => uids.add(u));
    });
    return Array.from(uids);
  }, [recentPosts]);

  const profileMap = useReactorProfileCache(allReactorUids);

  return (
    <section className="bg-surface-container-low backdrop-blur-sm rounded-2xl border border-outline-variant p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">chat</span>
          Community Feed
        </h2>
        {userGroups.length > 1 && (
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface-variant px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
            aria-label="Filter feed by group"
          >
            <option value="all">All Groups</option>
            {userGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <SkeletonPost key={i} />)}
        </div>
      ) : recentPosts.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[48px]">chat</span>}
          title="Be the first!"
          description="Start a conversation — share something with the group!"
        />
      ) : null}

      {/* Virtualized feed — fixed height scroll container required by react-virtual.
          NOTE: usePullToRefresh is attached to feedScrollRef; the pull gesture still works
          because feedScrollRef is the scroll element. */}
      <div
        ref={feedScrollRef}
        className="overflow-y-auto"
        style={{ height: recentPosts.length > 0 ? 'calc(100vh - 16rem)' : undefined }}
      >
        {recentPosts.length > 0 && (
          <div
            style={{ height: feedVirtualizer.getTotalSize(), position: 'relative' }}
          >
            {feedVirtualizer.getVirtualItems().map(item => {
              const post = recentPosts[item.index];
              const uid = user?.uid ?? '';
              const reacted = {
                paw:   post.reactions?.paw?.includes(uid)   ?? false,
                bone:  post.reactions?.bone?.includes(uid)  ?? false,
                heart: post.reactions?.heart?.includes(uid) ?? false,
              };
              const postGroup = userGroups.find(g => g.id === post.groupId);
              const isGroupMember = !!(uid && postGroup?.members[uid]);
              const memberRole: CommunityRole = postGroup?.members[uid]?.role ?? 'User';
              return (
                <div
                  key={`${post.groupId}-${post.id}`}
                  ref={feedVirtualizer.measureElement}
                  data-index={item.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${item.start}px)`,
                    width: '100%',
                    paddingBottom: '12px',
                  }}
                >
                  <PostCard
                    post={post}
                    uid={uid}
                    memberRole={memberRole}
                    isGroupMember={isGroupMember}
                    reacted={reacted}
                    profileMap={profileMap}
                    onViewProfile={handleViewProfile}
                    onNavigateGroup={handleNavigateGroup}
                    onReact={handleReact}
                    onReport={handleReport}
                    onImageClick={setLightboxImageUrl}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination sentinel + status — only shown when a specific group is filtered */}
        {groupFilter !== 'all' && (
          <div ref={sentinelRef} className="py-3 text-center">
            {isPaginating ? (
              <div className="space-y-2 px-2">
                <div className="h-3 bg-surface-container-highest rounded animate-pulse w-3/4 mx-auto" />
                <div className="h-3 bg-surface-container-highest rounded animate-pulse w-1/2 mx-auto" />
              </div>
            ) : hasMorePosts[groupFilter] === false ? (
              <p className="text-xs text-on-surface-variant">No more posts</p>
            ) : null}
          </div>
        )}
      </div>

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
        open={reportPost !== null}
        onClose={() => setReportPost(null)}
        targetType="post"
        targetId={reportPost?.postId ?? ''}
        groupId={reportPost?.groupId}
      />

      {/* Image lightbox */}
      {lightboxImageUrl && (
        <ImageLightbox
          images={[lightboxImageUrl]}
          initialIndex={0}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}
    </section>
  );
}
