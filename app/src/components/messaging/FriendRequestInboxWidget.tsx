import { useSocial } from '../../contexts/SocialContext';
import { useNavigate } from 'react-router';

export function FriendRequestInboxWidget() {
  const { pendingRequests, acceptFriendRequest, rejectFriendRequest, acceptFriendRequestAndGreet, directory } = useSocial();
  const navigate = useNavigate();

  if (!pendingRequests || pendingRequests.length === 0) return null;

  // directory is PublicProfile[] — build lookup map
  const dirMap = Object.fromEntries(directory.map(u => [u.uid, u]));

  return (
    <div className="rounded-xl border border-outline-variant bg-tertiary-container overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-on-tertiary-container text-[14px]">person_add</span>
          <span className="text-xs font-semibold text-on-tertiary-container">Friend Requests</span>
        </div>
        <span className="text-[10px] font-bold text-on-primary bg-primary rounded-full w-4 h-4 flex items-center justify-center">{pendingRequests.length}</span>
      </div>
      <div className="divide-y divide-outline-variant">
        {pendingRequests.slice(0, 5).map((req) => {
          const user = dirMap[req.fromUid];
          const name = user?.displayName ?? 'Someone';
          const avatar = user?.avatarUrl;
          return (
            <div key={req.id} className="flex items-center gap-2 px-3 py-2">
              {avatar ? (
                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-bold text-on-tertiary shrink-0">{name[0]}</div>
              )}
              <p className="flex-1 text-xs font-medium text-on-surface truncate">{name}</p>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => (acceptFriendRequestAndGreet as any)(req.id, navigate)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => rejectFriendRequest(req.id)}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container transition-colors"
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
