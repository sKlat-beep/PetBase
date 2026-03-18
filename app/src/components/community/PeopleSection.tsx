import React, { useState, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PawPrint, Search, X, Users, UserPlus, UserCheck, MessageSquare, ShieldOff, Send, ChevronDown, ChevronUp, Home, Eye, Sparkles } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useSocial, type PublicProfile, pymkScore } from '../../contexts/SocialContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { useMessaging } from '../../contexts/MessagingContext';
import type { DmMessage } from '../../lib/firestoreService';

const PublicProfilePanel = lazy(() =>
  import('../PublicProfilePanel').then(m => ({ default: m.PublicProfilePanel }))
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
        className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md flex flex-col max-h-[70vh] z-10"
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
          <div className="flex items-center gap-3">
            <img src={toUser.avatarUrl} alt={toUser.displayName} className="w-9 h-9 rounded-full object-cover bg-neutral-100" referrerPolicy="no-referrer" />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{toUser.displayName}</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.length === 0 && (
            <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 py-6">No messages yet. Say hi!</p>
          )}
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.fromUid === currentUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.fromUid === currentUid
                ? 'bg-emerald-500 text-white rounded-br-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'}`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="p-3 border-t border-neutral-100 dark:border-neutral-700 flex gap-2 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <img
          src={person.avatarUrl}
          alt={person.displayName}
          className="w-14 h-14 rounded-2xl object-cover bg-neutral-100 shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{person.displayName}</h3>
            {person.username && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
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
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{statusLabel}</p>
          )}
          {person.pets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {person.pets.map((p, i) => (
                <span key={i} className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md">
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
          <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 font-medium text-sm cursor-default">
            <UserCheck className="w-4 h-4" />
            Request Sent
          </button>
        ) : (
          <button
            onClick={onAddFriend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 font-medium text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        )}
        <button
          onClick={onViewProfile}
          className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-900/20 dark:hover:border-sky-800 transition-colors"
          title="View profile"
          aria-label={`View ${person.displayName}'s profile`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onBlock}
          className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:border-rose-800 transition-colors"
          title="Block user"
          aria-label={`Block ${person.displayName}`}
        >
          <ShieldOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function PeopleSection() {
  const { user, profile } = useAuth();
  const {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    friendRequests,
    directory,
  } = useSocial();
  const { sendMessage, threadMessages, setActiveUid, unreadByUser } = useMessaging();
  const { members, promoteToFamily } = useHousehold();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [messagingUser, setMessagingUser] = useState<PublicProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<PublicProfile | null>(null);
  const [showRequests, setShowRequests] = useState(true);
  const [familyInvite, setFamilyInvite] = useState<{ code: string; householdName: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'default' } | null>(null);

  const pendingIncoming = useMemo(
    () => friendRequests.filter(r => user && r.toUid === user.uid && r.status === 'pending'),
    [friendRequests, user]
  );

  const sentPendingUids = useMemo(
    () => new Set(friendRequests.filter(r => user && r.fromUid === user.uid && r.status === 'pending').map(r => r.toUid)),
    [friendRequests, user]
  );

  const familyMemberUids = useMemo(() => new Set(members.map(m => m.uid)), [members]);

  // PYMK: score non-friend directory entries by mutual friends
  const pymkSuggestions = useMemo(() => {
    if (!profile) return [];
    const myFriendSet = new Set(profile.friends);
    const sentSet = new Set(friendRequests.filter(r => user && r.fromUid === user.uid && r.status === 'pending').map(r => r.toUid));
    return directory
      .filter(p => !myFriendSet.has(p.uid) && !sentSet.has(p.uid))
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
      .slice(0, 8);
  }, [directory, profile, friendRequests, user]);

  const friends = useMemo(
    () => directory.filter(p => profile?.friends?.includes(p.uid)),
    [directory, profile]
  );

  React.useEffect(() => {
    if (!query.trim()) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    let active = true;
    const timer = setTimeout(() => {
      searchUsers(query).then(res => {
        if (active) { setResults(res); setIsSearching(false); }
      });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, searchUsers]);

  const handlePromoteToFamily = async () => {
    try {
      const hh = await promoteToFamily();
      setFamilyInvite({ code: hh.inviteCode, householdName: hh.name });
    } catch {}
  };

  if (!user || !profile) return null;

  const displayResults = query.trim() ? results : friends;

  return (
    <section className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <PawPrint className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Friends & People
          {friends.length > 0 && (
            <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
              {friends.length}
            </span>
          )}
          {pendingIncoming.length > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {pendingIncoming.length} request{pendingIncoming.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowSearch(s => !s)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-expanded={showSearch}
          aria-label={showSearch ? 'Close people search' : 'Find people'}
        >
          {showSearch ? <X className="w-3.5 h-3.5" aria-hidden="true" /> : <Search className="w-3.5 h-3.5" aria-hidden="true" />}
          {showSearch ? 'Close' : 'Find People'}
        </button>
      </div>

      {/* Search input */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <input
              id="community-people-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* People You May Know (PYMK) — hidden when searching */}
      {pymkSuggestions.length > 0 && !query.trim() && (
        <div className="mb-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            People You May Know
          </h3>
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {pymkSuggestions.map(suggestion => (
                <div
                  key={suggestion.uid}
                  className="flex flex-col items-center gap-1.5 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-100 dark:border-neutral-700 rounded-xl p-3 w-28 shrink-0"
                >
                  <img
                    src={suggestion.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${suggestion.uid}`}
                    alt={suggestion.displayName}
                    className="w-12 h-12 rounded-full object-cover bg-neutral-200 dark:bg-neutral-600"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 text-center truncate w-full leading-tight">
                    {suggestion.displayName}
                  </p>
                  {suggestion.mutualFriends > 0 && (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center leading-tight">
                      {suggestion.mutualFriends} mutual
                    </p>
                  )}
                  <button
                    onClick={() => sendFriendRequest(suggestion.uid)}
                    className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 font-medium text-[11px] transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingIncoming.length > 0 && (
        <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl overflow-hidden mb-4">
          <button
            onClick={() => setShowRequests(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Friend Requests ({pendingIncoming.length})
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
                {pendingIncoming.map(req => (
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
                        className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium transition-colors"
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

      {/* Results / Friends Grid */}
      {displayResults.length === 0 && query.trim() && !isSearching ? (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No public profiles match "{query}".</p>
        </div>
      ) : displayResults.length === 0 && !query.trim() ? (
        <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
          <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
          <p className="text-sm">No friends yet.</p>
          <p className="text-xs mt-1">Use "Find People" to search for fellow pet parents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayResults.map(person => (
            <UserCard
              key={person.uid}
              person={person}
              currentUid={user.uid}
              isFriend={profile.friends.includes(person.uid)}
              hasPendingRequest={sentPendingUids.has(person.uid)}
              unreadCount={unreadByUser[person.uid] || 0}
              isInMyFamily={familyMemberUids.has(person.uid)}
              onAddFriend={() => sendFriendRequest(person.uid)}
              onMessage={() => { setMessagingUser(person); setActiveUid(person.uid); }}
              onBlock={() => {
                setConfirmDialog({
                  title: 'Block User',
                  message: `Block ${person.displayName}? They will no longer appear in your search results.`,
                  variant: 'danger',
                  onConfirm: () => { blockUser(person.uid); setConfirmDialog(null); },
                });
              }}
              onPromoteToFamily={handlePromoteToFamily}
              onViewProfile={() => setViewingProfile(person)}
            />
          ))}
        </div>
      )}

      {/* Public Profile Panel — portaled to escape Reorder.Item stacking context */}
      {viewingProfile && createPortal(
        <Suspense fallback={null}>
          <AnimatePresence>
            <PublicProfilePanel
              key={viewingProfile.uid}
              profile={viewingProfile}
              onClose={() => setViewingProfile(null)}
            />
          </AnimatePresence>
        </Suspense>,
        document.body
      )}

      {/* Message Modal — portaled */}
      {messagingUser && createPortal(
        <AnimatePresence>
          <MessageModal
            toUser={messagingUser}
            thread={threadMessages}
            onSend={(content) => sendMessage(messagingUser.uid, content).catch(() => {})}
            onClose={() => { setMessagingUser(null); setActiveUid(null); }}
            currentUid={user.uid}
          />
        </AnimatePresence>,
        document.body
      )}

      {/* Family Invite Modal — portaled */}
      {familyInvite && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setFamilyInvite(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Share this invite code with your friend. Once they join your household via <strong>Settings → Family Sharing</strong>, they'll have co-management access to your pets.
                </p>
                <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-4 text-center">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 uppercase tracking-wide font-semibold">Invite Code</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-neutral-900 dark:text-neutral-100">{familyInvite.code}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(familyInvite.code).catch(() => {}); }}
                  className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
                >
                  Copy Code
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel="Block"
        variant={confirmDialog?.variant}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </section>
  );
}
