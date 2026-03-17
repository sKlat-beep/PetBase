import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, MessageSquare, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocial } from '../../contexts/SocialContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { CollapsiblePanelWidget } from '../layout/CollapsiblePanelWidget';
import { FriendListModal } from './FriendListModal';

export function PeoplePanel() {
  const { user, profile } = useAuth();
  const { directory, friendRequests, acceptFriendRequest, rejectFriendRequest, sendFriendRequest, isBlocked } = useSocial();
  const { groups } = useCommunity();
  const { conversations } = useMessaging();
  const navigate = useNavigate();
  const [showFriendModal, setShowFriendModal] = useState(false);

  // All friends resolved from directory, sorted by recency of DM interaction
  const allFriends = useMemo(() => {
    if (!profile) return [];
    const friendUids = profile.friends ?? [];
    const resolved = friendUids
      .map(uid => directory.find(p => p.uid === uid))
      .filter(Boolean) as NonNullable<ReturnType<typeof directory.find>>[];

    // Build a map of uid -> lastMessage.createdAt from conversations
    const lastMsgAt: Record<string, number> = {};
    conversations.forEach(c => {
      lastMsgAt[c.otherUid] = c.lastMessage.createdAt;
    });

    return [...resolved].sort((a, b) => {
      const aTime = lastMsgAt[a.uid] ?? -1;
      const bTime = lastMsgAt[b.uid] ?? -1;
      if (aTime === -1 && bTime === -1) return 0;
      if (aTime === -1) return 1;
      if (bTime === -1) return -1;
      return bTime - aTime;
    });
  }, [profile, directory, conversations]);

  const myFriends = useMemo(() => allFriends.slice(0, 5), [allFriends]);

  const incomingRequests = useMemo(() => {
    if (!user) return [];
    return friendRequests
      .filter(r => r.toUid === user.uid && r.status === 'pending')
      .slice(0, 3);
  }, [friendRequests, user]);

  // Suggested friends: users in same groups who are not already friends and not blocked
  const suggestedFriends = useMemo(() => {
    if (!user || !profile) return [];
    const friendSet = new Set(profile.friends ?? []);
    // Collect UIDs of users sharing at least one group with the current user
    const sharedGroupUids = new Set<string>();
    groups.forEach(g => {
      if (g.members[user.uid]) {
        Object.keys(g.members).forEach(uid => {
          if (uid !== user.uid) sharedGroupUids.add(uid);
        });
      }
    });
    return directory
      .filter(p =>
        sharedGroupUids.has(p.uid) &&
        !friendSet.has(p.uid) &&
        !isBlocked(p.uid)
      )
      .slice(0, 3);
  }, [user, profile, groups, directory, isBlocked]);

  if (!user || !profile) return null;

  return (
    <div className="space-y-3">
      {/* Section: Friend Requests — only when there are pending requests */}
      {incomingRequests.length > 0 && (
        <CollapsiblePanelWidget
          id="people-requests"
          title="Friend Requests"
          icon={<UserPlus className="w-3 h-3" />}
        >
          <div className="space-y-2.5">
            {incomingRequests.map(req => {
              const sender = directory.find(p => p.uid === req.fromUid);
              const displayName = sender?.displayName ?? req.fromUid;
              const initial = displayName.charAt(0).toUpperCase();
              return (
                <div key={req.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                      {initial}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-stone-700 dark:text-zinc-200 truncate flex-1 min-w-0">
                    {displayName}
                  </p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => acceptFriendRequest(req.id)}
                      aria-label="Accept friend request"
                      className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(req.id)}
                      aria-label="Decline friend request"
                      className="p-1 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsiblePanelWidget>
      )}

      {/* Section: My Friends */}
      <CollapsiblePanelWidget
        id="people-friends"
        title="My Friends"
        icon={<Users className="w-3 h-3" />}
      >
        {allFriends.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            No friends yet. Find people below!
          </p>
        ) : (
          <div className="space-y-2.5">
            {myFriends.map(friend => {
              const initial = friend.displayName.charAt(0).toUpperCase();
              return (
                <div key={friend.uid} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-stone-600 dark:text-zinc-300 uppercase">
                        {initial}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-stone-700 dark:text-zinc-200 truncate flex-1 min-w-0">
                    {friend.displayName}
                  </p>
                  <button
                    onClick={() => navigate('/messages')}
                    aria-label={`Message ${friend.displayName}`}
                    className="p-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {allFriends.length > 0 && (
              <button
                onClick={() => setShowFriendModal(true)}
                className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded pt-0.5"
              >
                View all {allFriends.length} friend{allFriends.length !== 1 ? 's' : ''} →
              </button>
            )}
          </div>
        )}
      </CollapsiblePanelWidget>

      {/* Section: Suggested Friends */}
      <CollapsiblePanelWidget
        id="people-suggested"
        title="People You May Know"
        icon={<UserPlus className="w-3 h-3" />}
      >
        {suggestedFriends.length === 0 ? (
          <p className="text-xs text-stone-500 dark:text-zinc-400">No suggestions right now.</p>
        ) : (
          <div className="space-y-2.5">
            {suggestedFriends.map(person => {
              const initial = person.displayName.charAt(0).toUpperCase();
              return (
                <div key={person.uid} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-stone-600 dark:text-zinc-300 uppercase">
                        {initial}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-stone-700 dark:text-zinc-200 truncate flex-1 min-w-0">
                    {person.displayName}
                  </p>
                  <button
                    onClick={() => sendFriendRequest(person.uid)}
                    aria-label={`Add ${person.displayName}`}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CollapsiblePanelWidget>

      {showFriendModal && (
        <FriendListModal
          friends={allFriends}
          onClose={() => setShowFriendModal(false)}
        />
      )}
    </div>
  );
}
