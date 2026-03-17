import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useSocial } from '../../contexts/SocialContext';
import type { GroupMember } from '../../contexts/CommunityContext';

type RoleFilter = 'All' | 'Owner' | 'Moderator' | 'Event Coordinator' | 'Member';

interface GroupMemberModalProps {
  members: Record<string, GroupMember>;
  onClose: () => void;
}

export function GroupMemberModal({ members, onClose }: GroupMemberModalProps) {
  const { directory } = useSocial();
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
    if (role === 'Owner') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
    if (role === 'Moderator') return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400';
    if (role === 'Event Coordinator') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
    return 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300';
  };

  const roleCircleClass = (role: string) => {
    if (role === 'Owner') return 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200';
    if (role === 'Moderator') return 'bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200';
    if (role === 'Event Coordinator') return 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200';
    return 'bg-stone-200 dark:bg-zinc-600 text-stone-700 dark:text-zinc-200';
  };

  const roleLabel = (role: string) => (role === 'User' ? 'Member' : role);

  const roleFilters: RoleFilter[] = ['All', 'Owner', 'Moderator', 'Event Coordinator', 'Member'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200/60 dark:border-zinc-700/60 shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Group Members"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200/60 dark:border-zinc-700/60 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-100">Members</h2>
            <p className="text-[10px] text-stone-400 dark:text-zinc-500">{allMembers.length} member{allMembers.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-stone-400 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  : 'bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Member list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-zinc-400 py-4 text-center">No members match your search.</p>
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
                    <p className="text-xs font-medium text-stone-700 dark:text-zinc-200 truncate">{displayName}</p>
                    <p className="text-[10px] text-stone-400 dark:text-zinc-500">
                      Joined {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${roleBgClass(m.role)}`}>
                    {roleLabel(m.role)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
