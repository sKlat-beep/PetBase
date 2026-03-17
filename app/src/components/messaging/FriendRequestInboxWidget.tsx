import { useSocial } from '../../contexts/SocialContext';
import { useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';

export function FriendRequestInboxWidget() {
  const { pendingRequests, acceptFriendRequest, rejectFriendRequest, acceptFriendRequestAndGreet, directory } = useSocial();
  const navigate = useNavigate();

  if (!pendingRequests || pendingRequests.length === 0) return null;

  // directory is PublicProfile[] — build lookup map
  const dirMap = Object.fromEntries(directory.map(u => [u.uid, u]));

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Friend Requests</span>
        </div>
        <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center">{pendingRequests.length}</span>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900">
        {pendingRequests.slice(0, 5).map((req) => {
          const user = dirMap[req.fromUid];
          const name = user?.displayName ?? 'Someone';
          const avatar = user?.avatarUrl;
          return (
            <div key={req.id} className="flex items-center gap-2 px-3 py-2">
              {avatar ? (
                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300 shrink-0">{name[0]}</div>
              )}
              <p className="flex-1 text-xs font-medium text-stone-700 dark:text-stone-200 truncate">{name}</p>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => (acceptFriendRequestAndGreet as any)(req.id, navigate)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectFriendRequest(req.id)}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
