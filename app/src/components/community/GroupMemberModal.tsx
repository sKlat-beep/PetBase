import { useState, useEffect, useRef, useMemo } from 'react';
import { useSocial } from '../../contexts/SocialContext';
import { useCommunity, type CommunityRole } from '../../contexts/CommunityContext';
import type { GroupMember } from '../../contexts/CommunityContext';

type RoleFilter = 'All' | 'Owner' | 'Moderator' | 'Event Coordinator' | 'Member';

interface GroupMemberModalProps {
  members: Record<string, GroupMember>;
  onClose: () => void;
  userRole?: CommunityRole | null;
  groupId: string;
}

export function GroupMemberModal({ members, onClose, userRole, groupId }: GroupMemberModalProps) {
  const { directory } = useSocial();
  const { updateMemberRole, banMember } = useCommunity();
  const [roleChangeTarget, setRoleChangeTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input on open
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const allMembers = useMemo(() => {
    const roleOrder: Record<string, number> = { Owner: 0, Moderator: 1, 'Event Coordinator': 2, User: 3 };
    return (Object.values(members) as GroupMember[]).sort((a, b) => {
      const ro = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
      if (ro !== 0) return ro;
      return a.joinedAt - b.joinedAt;
    });
  }, [members]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      const dirEntry = directory.find(p => p.uid === m.userId);
      const displayName = dirEntry?.displayName ?? 'Member';
      const matchesSearch = displayName.toLowerCase().includes(search.toLowerCase());
      const matchesRole =
        roleFilter === 'All' ||
        (roleFilter === 'Member' ? (m.role === 'User' || m.role === 'Event Coordinator') : m.role === roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [allMembers, search, roleFilter, directory]);

  const roleBgClass = (role: string) => {
    if (role === 'Owner') return 'bg-primary-container text-on-primary-container';
    if (role === 'Moderator') return 'bg-tertiary-container text-on-tertiary-container';
    if (role === 'Event Coordinator') return 'bg-amber-100 text-amber-700';
    return 'bg-surface-container-high text-on-surface-variant';
  };

  const roleCircleClass = (role: string) => {
    if (role === 'Owner') return 'bg-primary-container text-on-primary-container';
    if (role === 'Moderator') return 'bg-tertiary-container text-on-tertiary-container';
    if (role === 'Event Coordinator') return 'bg-amber-200 text-amber-800';
    return 'bg-surface-container-highest text-on-surface';
  };

  const roleLabel = (role: string) => (role === 'User' ? 'Member' : role);

  const roleFilters: RoleFilter[] = ['All', 'Owner', 'Moderator', 'Event Coordinator', 'Member'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container rounded-2xl border border-outline-variant shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Group Members"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Members</h2>
            <p className="text-[10px] text-on-surface-variant">{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">search</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-container-high border border-outline-variant text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Role filter pills */}
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {roleFilters.map(f => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                roleFilter === f
                  ? 'bg-sky-500 text-white'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Member list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4 text-center">No members match your search.</p>
          ) : (
            filteredMembers.map(m => {
              const dirEntry = directory.find(p => p.uid === m.userId);
              const displayName = dirEntry?.displayName ?? 'Member';
              const initial = displayName.charAt(0).toUpperCase();
              return (
                <div key={m.userId} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${roleCircleClass(m.role)}`}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{displayName}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      Joined {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${roleBgClass(m.role)}`}>
                      {roleLabel(m.role)}
                    </span>
                    {/* Owner can change roles of non-owners */}
                    {userRole === 'Owner' && m.role !== 'Owner' && (
                      <div className="relative">
                        <button
                          onClick={() => setRoleChangeTarget(roleChangeTarget === m.userId ? null : m.userId)}
                          className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          aria-label="Change role"
                          title="Change role"
                        >
                          <span className="material-symbols-outlined text-[12px]">expand_more</span>
                        </button>
                        {roleChangeTarget === m.userId && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-surface-container border border-outline-variant rounded-lg shadow-lg py-1 min-w-[130px]">
                            {(['User', 'Event Coordinator', 'Moderator', 'Owner'] as CommunityRole[])
                              .filter(r => r !== m.role)
                              .map(r => (
                                <button
                                  key={r}
                                  onClick={() => {
                                    if (confirm(`Change ${displayName} from ${m.role} to ${r}?`)) {
                                      updateMemberRole(groupId, m.userId, r);
                                    }
                                    setRoleChangeTarget(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[10px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                                >
                                  {r === 'User' ? 'Member' : r}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Owner/Mod can ban non-owners (Mod can only ban Users) */}
                    {((userRole === 'Owner' && m.role !== 'Owner') ||
                      (userRole === 'Moderator' && m.role === 'User')) && (
                      <button
                        onClick={() => {
                          if (confirm(`Ban ${displayName} from this group? They will be removed.`)) {
                            banMember(groupId, m.userId);
                          }
                        }}
                        className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        aria-label="Ban member"
                        title="Ban member"
                      >
                        <span className="material-symbols-outlined text-[12px]">block</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
