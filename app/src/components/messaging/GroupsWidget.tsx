import { useNavigate } from 'react-router';
import { Users } from 'lucide-react';
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
      <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5">Your Groups</p>
      <div className="space-y-0.5">
        {joinedGroups.map(g => (
          <button
            key={g.id}
            onClick={() => handleGroupClick(g.id)}
            className="w-full flex items-center gap-2.5 px-1.5 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors text-left"
          >
            {g.image ? (
              <img src={g.image} alt={g.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            <span className="flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate">{g.name}</span>
            {hasUnread(g) && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
