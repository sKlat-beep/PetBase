import React, { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, UserPlus, UserCheck, MessageSquare, ShieldOff, X, Send, ChevronDown, ChevronUp, Home, Eye, Sparkles, Heart } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 w-full max-w-md flex flex-col max-h-[70vh] z-10"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-stone-700 shrink-0">
          <div className="flex items-center gap-3">
            <img src={toUser.avatarUrl} alt={toUser.displayName} className="w-9 h-9 rounded-full object-cover bg-stone-100" referrerPolicy="no-referrer" />
            <span className="font-semibold text-stone-900 dark:text-stone-100">{toUser.displayName}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.length === 0 && (
            <p className="text-center text-sm text-stone-400 dark:text-stone-500 py-6">No messages yet. Say hi!</p>
          )}
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.fromUid === currentUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.fromUid === currentUid
                ? 'bg-emerald-500 text-white rounded-br-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-sm'}`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-stone-100 dark:border-stone-700 flex gap-2 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="submit" disabled={!text.trim()} className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition-colors">
            <Send className="w-4 h-4" />
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
    <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <img
          src={person.avatarUrl}
          alt={person.displayName}
          className="w-14 h-14 rounded-2xl object-cover bg-stone-100 shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 truncate">{person.displayName}</h3>
            {person.username && (
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium whitespace-nowrap">
                @{person.username.split('#')[0]}<span className="opacity-60">#{person.username.split('#')[1]}</span>
              </span>
            )}
            {isFriend && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Friend
              </span>
            )}
            {person.visibility === 'Friends Only' && !isFriend && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                Friends Only
              </span>
            )}
          </div>
          {statusLabel && (
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{statusLabel}</p>
          )}
          {person.pets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {person.pets.map((p, i) => (
                <span key={i} className="text-xs bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md">
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
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium text-sm transition-colors relative"
            >
              <MessageSquare className="w-4 h-4" />
              Message
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            {!isInMyFamily && (
              <button
                onClick={onPromoteToFamily}
                title="Promote to Family — share pet management access"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 font-medium text-sm transition-colors"
              >
                <Home className="w-4 h-4" />
                Family
              </button>
            )}
            {isInMyFamily && (
              <span className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-sm font-medium">
                <Home className="w-4 h-4" /> Family
              </span>
            )}
          </>
        ) : hasPendingRequest ? (
          <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 font-medium text-sm cursor-default">
            <UserCheck className="w-4 h-4" />
            Request Sent
          </button>
        ) : (
          <button
            onClick={onAddFriend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 font-medium text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        )}
        <button
          onClick={onViewProfile}
          className="p-2 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/20 dark:hover:border-sky-800 transition-colors"
          title="View profile"
          aria-label={`View ${person.displayName}'s profile`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onBlock}
          className="p-2 rounded-xl border border-stone-200 dark:border-stone-600 text-stone-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:border-rose-800 transition-colors"
          title="Block user"
          aria-label={`Block ${person.displayName}`}
        >
          <ShieldOff className="w-4 h-4" />
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
        mutualFriends: (p.friends ?? []).filter(id => myFriendSet.has(id)).length,
        score: pymkScore(
          { uid: p.uid, displayName: p.displayName, avatarUrl: p.avatarUrl, friendIds: p.friends ?? [] },
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
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">People</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">Find fellow pet parents, send friend requests, and chat.</p>
      </header>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowRequests(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Friend Requests ({pendingRequests.length})
            </span>
            {showRequests ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
          </button>
          <AnimatePresence initial={false}>
            {showRequests && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-amber-200 dark:border-amber-900/50 divide-y divide-amber-100 dark:divide-amber-900/30"
              >
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Friend request from <span className="font-bold">{req.fromUid}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeFriend(req.fromUid)}
                        className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-medium transition-colors"
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by display name..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Suggested Friends (PYMK) — only shown when not searching */}
      {pymkSuggestions.length > 0 && !query.trim() && (
        <section>
          <h2 className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            Suggested Friends
          </h2>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {pymkSuggestions.map(suggestion => (
                <div
                  key={suggestion.uid}
                  className="flex flex-col items-center gap-2 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl p-4 shadow-sm w-36 shrink-0"
                >
                  <img
                    src={suggestion.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${suggestion.uid}`}
                    alt={suggestion.displayName}
                    className="w-14 h-14 rounded-full object-cover bg-stone-100"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 text-center truncate w-full">
                    {suggestion.displayName}
                  </p>
                  {suggestion.mutualFriends > 0 && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center -mt-1">
                      {suggestion.mutualFriends} mutual {suggestion.mutualFriends === 1 ? 'friend' : 'friends'}
                    </p>
                  )}
                  <button
                    onClick={() => sendFriendRequest(suggestion.uid)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 font-medium text-xs transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
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
          icon={<Search className="w-12 h-12" />}
          title="No matches found"
          description="Try a different search term or broaden your filters."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-12 h-12" />}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setFamilyInvite(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-violet-600 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Home className="w-5 h-5" /> Invite to Family
                  </h2>
                  <button onClick={() => setFamilyInvite(null)} className="text-white/70 hover:text-white p-1 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-violet-100 text-sm mt-1">{familyInvite.householdName}</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Share this invite code with your friend. Once they join your household via <strong>Settings → Family Sharing</strong>, they'll have co-management access to your pets.
                </p>
                <div className="bg-stone-50 dark:bg-stone-700 rounded-xl p-4 text-center">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wide font-semibold">Invite Code</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100">{familyInvite.code}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(familyInvite.code).catch(() => { }); }}
                  className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
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
