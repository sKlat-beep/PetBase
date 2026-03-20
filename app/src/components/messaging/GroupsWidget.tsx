import { useNavigate } from 'react-router';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';

export function GroupsWidget() {
  const { groups } = useCommunity();
  const { user } = useAuth() as { user: { uid: string } | null };
  const navigate = useNavigate();
  const uid = user?.uid ?? '';

  const joinedGroups = groups
    .filter(g => g.members?.[uid])
    .sort((a, b) => ((b as any).updatedAt ?? b.createdAt ?? 0) - ((a as any).updatedAt ?? a.createdAt ?? 0))
    .slice(0, 8);

  if (joinedGroups.length === 0) return null;

  const handleGroupClick = (groupId: string) => {
    const lastVisitedKey = `groupLastVisited:${groupId}`;
    localStorage.setItem(lastVisitedKey, String(Date.now()));
    navigate(`/community?group=${groupId}`);
  };

  const hasUnread = (g: typeof joinedGroups[0]) => {
    const lastVisited = parseInt(localStorage.getItem(`groupLastVisited:${g.id}`) ?? '0', 10);
    return ((g as any).updatedAt ?? 0) > lastVisited;
  };

  return (
    <div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Your Groups</p>
      <div className="space-y-0.5">
        {joinedGroups.map(g => (
          <button
            key={g.id}
            onClick={() => handleGroupClick(g.id)}
            className="w-full flex items-center gap-2.5 px-1.5 py-2 rounded-xl hover:bg-surface-container-highest transition-colors text-left"
          >
            {g.image ? (
              <img src={g.image} alt={g.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary-container text-[14px]">group</span>
              </div>
            )}
            <span className="flex-1 text-xs font-medium text-on-surface truncate">{g.name}</span>
            {hasUnread(g) && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
