import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import EmptyState from '../components/ui/EmptyState';
import { useSocial, type PublicProfile, pymkScore } from '../contexts/SocialContext';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useMessaging } from '../contexts/MessagingContext';
import type { DmMessage } from '../lib/firestoreService';
import { UserProfileModal } from '../components/social/UserProfileModal';
import { useRightPanel } from '../contexts/RightPanelContext';
import { PeoplePanel } from '../components/social/PeoplePanel';
import { SkeletonUserCard } from '../components/ui/Skeleton';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const PublicProfilePanel = lazy(() =>
  import('../components/PublicProfilePanel').then(m => ({ default: m.PublicProfilePanel }))
);

const STATUS_LABELS: Record<string, string> = {
  'None': '',
  'Open to Playdates': '🐾 Open to Playdates',
  'Looking for Walking Buddies': '🦮 Looking for Walking Buddies',
};

function MessageModal({
  toUser,
  thread,
  onSend,
  onClose,
  currentUid,
}: {
  toUser: PublicProfile;
  thread: DmMessage[];
  onSend: (content: string) => void;
  onClose: () => void;
  currentUid: string;
}) {
  const [text, setText] = useState('');
  const { markRead } = useMessaging();

  // Mark incoming messages as read on open
  React.useEffect(() => {
    thread.filter(m => m.toUid === currentUid && !m.read).forEach(m => markRead(m.id).catch(() => {}));
  }, [thread, currentUid, markRead]);


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add member" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative glass-card w-full max-w-md flex flex-col max-h-[70vh] z-10 shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <img src={toUser.avatarUrl} alt={toUser.displayName} className="w-9 h-9 rounded-full object-cover bg-surface-container" referrerPolicy="no-referrer" />
            <span className="font-semibold text-on-surface">{toUser.displayName}</span>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.length === 0 && (
            <p className="text-center text-sm text-on-surface-variant py-6">No messages yet. Say hi!</p>
          )}
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.fromUid === currentUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.fromUid === currentUid
                ? 'bg-primary-container text-on-primary-container rounded-br-sm'
                : 'bg-surface-container text-on-surface rounded-bl-sm'}`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-outline-variant flex gap-2 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          <button type="submit" disabled={!text.trim()} className="p-2 bg-primary-container hover:opacity-90 disabled:opacity-40 text-on-primary-container rounded-xl transition-colors">
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function UserCard({
  person,
  currentUid,
  isFriend,
  hasPendingRequest,
  unreadCount,
  isInMyFamily,
  onAddFriend,
  onMessage,
  onBlock,
  onPromoteToFamily,
  onViewProfile,
}: {
  key?: React.Key;
  person: PublicProfile;
  currentUid: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  unreadCount: number;
  isInMyFamily: boolean;
  onAddFriend: () => void;
  onMessage: () => void;
  onBlock: () => void;
  onPromoteToFamily: () => void;
  onViewProfile: () => void;
}) {
  const statusLabel = STATUS_LABELS[person.publicStatus] || '';

  return (
    <div className="glass-card p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="story-ring shrink-0">
          <img
            src={person.avatarUrl}
            alt={person.displayName}
            className="w-14 h-14 rounded-full object-cover bg-surface-container"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-on-surface truncate">{person.displayName}</h3>
            {person.username && (
              <span className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
                @{person.username.split('#')[0]}<span className="opacity-60">#{person.username.split('#')[1]}</span>
              </span>
            )}
            {isFriend && (
              <span className="text-xs font-bold bg-primary-container/20 text-primary-container px-2 py-0.5 rounded-full uppercase tracking-wide">
                Friend
              </span>
            )}
            {person.visibility === 'Friends Only' && !isFriend && (
              <span className="text-xs font-medium bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                Friends Only
              </span>
            )}
          </div>
          {statusLabel && (
            <p className="text-sm text-on-surface-variant mt-0.5">{statusLabel}</p>
          )}
          {person.pets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {person.pets.map((p, i) => (
                <span key={i} className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md">
                  {p.count > 1 ? `${p.count}× ` : ''}{p.type}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-auto flex-wrap">
        {isFriend ? (
          <>
            <button
              onClick={onMessage}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary-container/15 text-primary-container hover:bg-primary-container/25 font-medium text-sm transition-colors relative"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              Message
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-error text-on-error text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            {!isInMyFamily && (
              <button
                onClick={onPromoteToFamily}
                title="Promote to Family — share pet management access"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-tertiary-container text-on-tertiary-container hover:opacity-90 font-medium text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                Family
              </button>
            )}
            {isInMyFamily && (
              <span className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-tertiary-container text-on-tertiary-container text-sm font-medium">
                <span className="material-symbols-outlined text-lg">home</span> Family
              </span>
            )}
          </>
        ) : hasPendingRequest ? (
          <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-container text-on-surface-variant font-medium text-sm cursor-default">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Request Sent
          </button>
        ) : (
          <button
            onClick={onAddFriend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary-container text-on-primary-container hover:opacity-90 font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add Friend
          </button>
        )}
        <button
          onClick={onViewProfile}
          className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-secondary hover:border-secondary/40 hover:bg-secondary-container/20 transition-colors"
          title="View profile"
          aria-label={`View ${person.displayName}'s profile`}
        >
          <span className="material-symbols-outlined text-lg">visibility</span>
        </button>
        <button
          onClick={onBlock}
          className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-error hover:border-error/40 hover:bg-error-container/20 transition-colors"
          title="Block user"
          aria-label={`Block ${person.displayName}`}
        >
          <span className="material-symbols-outlined text-lg">block</span>
        </button>
      </div>
    </div>
  );
}

export function People() {
  const { user, profile } = useAuth();
  const {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    friendRequests,
    pendingRequests,
    directory,
  } = useSocial();
  const { setContent } = useRightPanel();

  useEffect(() => {
    setContent(<PeoplePanel />);
    return () => setContent(null);
  }, [setContent]);
  const { sendMessage, threadMessages, setActiveUid, markRead, unreadByUser } = useMessaging();
  const { members, promoteToFamily } = useHousehold();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const peopleListRef = useRef<HTMLDivElement>(null);
  const peopleScrollRef = useRef<HTMLDivElement>(null);

  const handlePeopleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  usePullToRefresh({ onRefresh: handlePeopleRefresh, containerRef: peopleScrollRef });

  // Virtualizer for search results list.
  // NOTE: The original CSS grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) is replaced
  // with a single-column layout because position:absolute virtualizer items are incompatible
  // with CSS grid flow.
  const peopleVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => peopleScrollRef.current,
    estimateSize: () => 100,
    overscan: 3,
  });
  const [messagingUser, setMessagingUser] = useState<PublicProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<PublicProfile | null>(null);
  const [profileModalUid, setProfileModalUid] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(true);
  const [familyInvite, setFamilyInvite] = useState<{ code: string; householdName: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    setIsSearching(true);

    const timer = setTimeout(() => {
      searchUsers(query).then(res => {
        if (active) {
          setResults(res);
          setIsSearching(false);
        }
      });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searchUsers, refreshKey]);

  const sentPendingUids = useMemo(
    () => new Set(friendRequests.filter(r => user && r.fromUid === user.uid && r.status === 'pending').map(r => r.toUid)),
    [friendRequests, user]
  );

  const familyMemberUids = useMemo(() => new Set(members.map(m => m.uid)), [members]);

  // PYMK: score directory members who are not already friends, not self, no pending request
  const pymkSuggestions = useMemo(() => {
    if (!profile) return [];
    const myFriendSet = new Set(profile.friends);
    const sentPendingSet = sentPendingUids;
    return directory
      .filter(p =>
        !myFriendSet.has(p.uid) &&
        !sentPendingSet.has(p.uid)
      )
      .map(p => ({
        uid: p.uid,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        mutualFriends: 0, // mutual-friends signal removed (TASK-222: friends UID list is private)
        score: pymkScore(
          { uid: p.uid, displayName: p.displayName, avatarUrl: p.avatarUrl },
          myFriendSet,
          new Set<string>(),
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [directory, profile, sentPendingUids]);

  const handlePromoteToFamily = async () => {
    try {
      const hh = await promoteToFamily();
      setFamilyInvite({ code: hh.inviteCode, householdName: hh.name });
    } catch {
      // error already set in context
    }
  };

  if (!user || !profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>Connect</h1>
        <p className="text-on-surface-variant mt-1">Find fellow pet parents, send friend requests, and chat.</p>
      </header>

      {/* Pill Tab Navigation */}
      {/* NOTE: tab switching is not wired — the existing page uses a search-based model.
           The pills are rendered but Friends is always "active" since the search bar
           below already provides the filtering/discovery. */}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section className="glass-card overflow-hidden border border-secondary/30">
          <button
            onClick={() => setShowRequests(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-secondary">person_add</span>
              Friend Requests ({pendingRequests.length})
            </span>
            <span className="material-symbols-outlined text-lg text-secondary">
              {showRequests ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {showRequests && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-outline-variant divide-y divide-outline-variant"
              >
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4">
                    <p className="text-sm font-medium text-on-surface">
                      Friend request from <span className="font-bold">{req.fromUid}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-3 py-1.5 bg-primary-container hover:opacity-90 text-on-primary-container rounded-lg text-sm font-medium transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeFriend(req.fromUid)}
                        className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant rounded-lg text-sm font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant">search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container shadow-sm"
        />
      </div>

      {/* Suggested Friends (PYMK) — only shown when not searching */}
      {pymkSuggestions.length > 0 && !query.trim() && (
        <section>
          <h2 className="flex items-center gap-2 font-semibold text-on-surface mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
            <span className="material-symbols-outlined text-lg text-primary-container" aria-hidden="true">auto_awesome</span>
            People You May Know
          </h2>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {pymkSuggestions.map(suggestion => (
                <div
                  key={suggestion.uid}
                  className="glass-card flex flex-col items-center gap-2 p-4 w-36 shrink-0"
                >
                  <div className="story-ring">
                    <img
                      src={suggestion.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${suggestion.uid}`}
                      alt={suggestion.displayName}
                      className="w-14 h-14 rounded-full object-cover bg-surface-container"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-sm font-semibold text-on-surface text-center truncate w-full">
                    {suggestion.displayName}
                  </p>
                  {suggestion.mutualFriends > 0 && (
                    <p className="text-xs text-on-surface-variant text-center -mt-1">
                      {suggestion.mutualFriends} mutual {suggestion.mutualFriends === 1 ? 'friend' : 'friends'}
                    </p>
                  )}
                  <button
                    onClick={() => sendFriendRequest(suggestion.uid)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-primary-container text-on-primary-container hover:opacity-90 font-medium text-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Results — virtualized scroll container.
          NOTE: peopleScrollRef serves as both the pull-to-refresh anchor and the
          virtualizer scroll element. The original CSS grid layout is replaced by a
          single-column list because absolute-positioned virtual items are incompatible
          with CSS grid flow. */}
      <div ref={peopleListRef}>
      {isSearching ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map(i => <SkeletonUserCard key={i} />)}
        </div>
      ) : results.length === 0 && query.trim() ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-5xl text-on-surface-variant">search</span>}
          title="No matches found"
          description="Try a different search term or broaden your filters."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<span className="material-symbols-outlined text-5xl text-on-surface-variant">favorite</span>}
          title="Make some friends!"
          description="Send friend requests to connect with other pet parents."
        />
      ) : (
        <div
          ref={peopleScrollRef}
          className="overflow-y-auto"
          style={{ height: '600px' }}
        >
          <div style={{ height: peopleVirtualizer.getTotalSize(), position: 'relative' }}>
            {peopleVirtualizer.getVirtualItems().map(item => {
              const person = results[item.index];
              return (
                <div
                  key={person.uid}
                  ref={peopleVirtualizer.measureElement}
                  data-index={item.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${item.start}px)`,
                    width: '100%',
                    paddingBottom: '16px',
                  }}
                >
                  <UserCard
                    person={person}
                    currentUid={user.uid}
                    isFriend={profile.friends.includes(person.uid)}
                    hasPendingRequest={sentPendingUids.has(person.uid)}
                    unreadCount={unreadByUser[person.uid] || 0}
                    isInMyFamily={familyMemberUids.has(person.uid)}
                    onAddFriend={() => sendFriendRequest(person.uid)}
                    onMessage={() => { setMessagingUser(person); setActiveUid(person.uid); }}
                    onBlock={() => {
                      if (window.confirm(`Block ${person.displayName}? They will no longer be able to appear in your search results.`)) {
                        blockUser(person.uid);
                      }
                    }}
                    onPromoteToFamily={handlePromoteToFamily}
                    onViewProfile={() => setProfileModalUid(person.uid)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Public Profile Panel (legacy — kept for backward compat) */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {viewingProfile && (
            <PublicProfilePanel
              key={viewingProfile.uid}
              profile={viewingProfile}
              onClose={() => setViewingProfile(null)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {/* UserProfileModal */}
      <AnimatePresence>
        {profileModalUid && (
          <UserProfileModal
            uid={profileModalUid}
            onClose={() => setProfileModalUid(null)}
          />
        )}
      </AnimatePresence>

      {/* Message Modal */}
      <AnimatePresence>
        {messagingUser && (
          <MessageModal
            toUser={messagingUser}
            thread={threadMessages}
            onSend={(content) => sendMessage(messagingUser.uid, content).catch(() => {})}
            onClose={() => { setMessagingUser(null); setActiveUid(null); }}
            currentUid={user.uid}
          />
        )}
        {familyInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Family invitation" onMouseDown={(e) => e.target === e.currentTarget && setFamilyInvite(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="bg-tertiary p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-tertiary flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
                    <span className="material-symbols-outlined">home</span> Invite to Family
                  </h2>
                  <button onClick={() => setFamilyInvite(null)} className="text-on-tertiary/70 hover:text-on-tertiary p-1 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <p className="text-on-tertiary/80 text-sm mt-1">{familyInvite.householdName}</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-on-surface-variant">
                  Share this invite code with your friend. Once they join your household via <strong>Settings → Family Sharing</strong>, they'll have co-management access to your pets.
                </p>
                <div className="bg-surface-container rounded-xl p-4 text-center">
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wide font-semibold">Invite Code</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-on-surface">{familyInvite.code}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(familyInvite.code).catch(() => { }); }}
                  className="w-full py-2 rounded-xl bg-tertiary hover:opacity-90 text-on-tertiary font-medium text-sm transition-colors"
                >
                  Copy Code
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
