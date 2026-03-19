import React, { useState, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
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
        className="relative bg-surface-container rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md flex flex-col max-h-[70vh] z-10"
      >
        <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <img src={toUser.avatarUrl} alt={toUser.displayName} className="w-9 h-9 rounded-full object-cover bg-surface-container-high" referrerPolicy="no-referrer" />
            <span className="font-semibold text-on-surface">{toUser.displayName}</span>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {thread.length === 0 && (
            <p className="text-center text-sm text-on-surface-variant py-6">No messages yet. Say hi!</p>
          )}
          {thread.map(m => (
            <div key={m.id} className={`flex ${m.fromUid === currentUid ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.fromUid === currentUid
                ? 'bg-primary text-on-primary rounded-br-sm'
                : 'bg-surface-container-high text-on-surface rounded-bl-sm'}`}
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
            className="flex-1 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" disabled={!text.trim()} className="p-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-on-primary rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[16px]">send</span>
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
    <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <img
          src={person.avatarUrl}
          alt={person.displayName}
          className="w-14 h-14 rounded-2xl object-cover bg-surface-container-high shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-on-surface truncate">{person.displayName}</h3>
            {person.username && (
              <span className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
                @{person.username.split('#')[0]}<span className="opacity-60">#{person.username.split('#')[1]}</span>
              </span>
            )}
            {isFriend && (
              <span className="text-[10px] font-bold bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full uppercase tracking-wide">
                Friend
              </span>
            )}
            {person.visibility === 'Friends Only' && !isFriend && (
              <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
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
                <span key={i} className="text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-md">
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
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary-container/80 font-medium text-sm transition-colors relative"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              Message
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
            {!isInMyFamily && (
              <button
                onClick={onPromoteToFamily}
                title="Promote to Family — share pet management access"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 font-medium text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                Family
              </button>
            )}
            {isInMyFamily && (
              <span className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-tertiary-container text-on-tertiary-container text-sm font-medium">
                <span className="material-symbols-outlined text-[16px]">home</span> Family
              </span>
            )}
          </>
        ) : hasPendingRequest ? (
          <button disabled className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-container-high text-on-surface-variant font-medium text-sm cursor-default">
            <span className="material-symbols-outlined text-[16px]">person_check</span>
            Request Sent
          </button>
        ) : (
          <button
            onClick={onAddFriend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-on-surface text-surface hover:bg-on-surface/90 font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add Friend
          </button>
        )}
        <button
          onClick={onViewProfile}
          className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 transition-colors"
          title="View profile"
          aria-label={`View ${person.displayName}'s profile`}
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
        </button>
        <button
          onClick={onBlock}
          className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-error hover:border-error/30 hover:bg-error-container transition-colors"
          title="Block user"
          aria-label={`Block ${person.displayName}`}
        >
          <span className="material-symbols-outlined text-[16px]">shield</span>
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
    <section className="bg-surface-container-low backdrop-blur-sm rounded-2xl border border-outline-variant p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">pets</span>
          Friends & People
          {friends.length > 0 && (
            <span className="text-xs font-normal text-on-surface-variant">
              {friends.length}
            </span>
          )}
          {pendingIncoming.length > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {pendingIncoming.length} request{pendingIncoming.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowSearch(s => !s)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-expanded={showSearch}
          aria-label={showSearch ? 'Close people search' : 'Find people'}
        >
          {showSearch ? <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span> : <span className="material-symbols-outlined text-[14px]" aria-hidden="true">search</span>}
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
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* People You May Know (PYMK) — hidden when searching */}
      {pymkSuggestions.length > 0 && !query.trim() && (
        <div className="mb-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
            <span className="material-symbols-outlined text-[14px] text-primary" aria-hidden="true">auto_awesome</span>
            People You May Know
          </h3>
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {pymkSuggestions.map(suggestion => (
                <div
                  key={suggestion.uid}
                  className="flex flex-col items-center gap-1.5 bg-surface-container border border-outline-variant rounded-xl p-3 w-28 shrink-0"
                >
                  <img
                    src={suggestion.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${suggestion.uid}`}
                    alt={suggestion.displayName}
                    className="w-12 h-12 rounded-full object-cover bg-surface-container-highest"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-xs font-semibold text-on-surface text-center truncate w-full leading-tight">
                    {suggestion.displayName}
                  </p>
                  {suggestion.mutualFriends > 0 && (
                    <p className="text-[10px] text-on-surface-variant text-center leading-tight">
                      {suggestion.mutualFriends} mutual
                    </p>
                  )}
                  <button
                    onClick={() => sendFriendRequest(suggestion.uid)}
                    className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-on-surface text-surface hover:bg-on-surface/90 font-medium text-[11px] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px]">person_add</span>
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
        <section className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-4">
          <button
            onClick={() => setShowRequests(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="font-semibold text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Friend Requests ({pendingIncoming.length})
            </span>
            {showRequests ? <span className="material-symbols-outlined text-[16px] text-amber-600">expand_less</span> : <span className="material-symbols-outlined text-[16px] text-amber-600">expand_more</span>}
          </button>
          <AnimatePresence initial={false}>
            {showRequests && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-amber-200 divide-y divide-amber-100"
              >
                {pendingIncoming.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4">
                    <p className="text-sm font-medium text-amber-900">
                      Friend request from <span className="font-bold">{req.fromUid}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm font-medium transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeFriend(req.fromUid)}
                        className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-sm font-medium transition-colors"
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
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px] mx-auto mb-2 opacity-40">group</span>
          <p className="text-sm">No public profiles match "{query}".</p>
        </div>
      ) : displayResults.length === 0 && !query.trim() ? (
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px] mx-auto mb-2 opacity-40" aria-hidden="true">pets</span>
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
              className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-tertiary p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-on-tertiary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">home</span> Invite to Family
                  </h2>
                  <button onClick={() => setFamilyInvite(null)} className="text-on-tertiary/70 hover:text-on-tertiary p-1 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                <p className="text-on-tertiary/80 text-sm mt-1">{familyInvite.householdName}</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-on-surface-variant">
                  Share this invite code with your friend. Once they join your household via <strong>Settings → Family Sharing</strong>, they'll have co-management access to your pets.
                </p>
                <div className="bg-surface-container-high rounded-xl p-4 text-center">
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wide font-semibold">Invite Code</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-on-surface">{familyInvite.code}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(familyInvite.code).catch(() => {}); }}
                  className="w-full py-2 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-medium text-sm transition-colors"
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
