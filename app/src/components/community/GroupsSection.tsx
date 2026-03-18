import { useState, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { UsersRound, Star, PawPrint, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';

const CreateGroupModal = lazy(() =>
  import('../CreateGroupModal').then(m => ({ default: m.CreateGroupModal }))
);
const ManageGroupsModal = lazy(() =>
  import('../ManageGroupsModal').then(m => ({ default: m.ManageGroupsModal }))
);

interface GroupsSectionProps {
  groupSearch?: string;
}

export default function GroupsSection({ groupSearch = '' }: GroupsSectionProps) {
  const { groups, userPreferences, toggleFavorite, loading } = useCommunity();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const userGroups = useMemo(() =>
    groups
      .filter(g => user && g.members[user.uid])
      .sort((a, b) => {
        const af = userPreferences[a.id]?.isFavorite ? 1 : 0;
        const bf = userPreferences[b.id]?.isFavorite ? 1 : 0;
        return bf - af;
      }),
    [groups, user, userPreferences]
  );

  const filteredGroups = useMemo(() =>
    userGroups.filter(g =>
      groupSearch === '' ||
      g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      (g.tags ?? []).some((t: string) => t.toLowerCase().includes(groupSearch.toLowerCase()))
    ),
    [userGroups, groupSearch]
  );

  const displayed = showAll ? filteredGroups : filteredGroups.slice(0, 6);

  return (
    <section className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Your Groups
          {userGroups.length > 0 && (
            <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
              {userGroups.length}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManage(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Manage groups"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" /> Manage
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Create a new group"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Create
          </button>
        </div>
      </div>

      {/* Skeleton loading state */}
      {loading && userGroups.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden animate-pulse">
              <div className="h-16 bg-neutral-200 dark:bg-neutral-700" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && userGroups.length === 0 && (
        <div className="text-center py-8 text-neutral-400 dark:text-neutral-500">
          <PawPrint className="w-10 h-10 mx-auto mb-2 opacity-40" aria-hidden="true" />
          <p className="text-sm">You haven't joined any groups yet.</p>
          <p className="text-xs mt-1">Check out Discover below to find your community.</p>
        </div>
      )}

      {/* Search no-results state */}
      {userGroups.length > 0 && filteredGroups.length === 0 && groupSearch !== '' && (
        <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-8">
          No groups match &ldquo;{groupSearch}&rdquo;
        </p>
      )}

      {/* Groups Grid */}
      {filteredGroups.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayed.map(group => {
              const isFav = userPreferences[group.id]?.isFavorite ?? false;
              const memberCount = Object.keys(group.members).length;
              return (
                <motion.div
                  key={group.id}
                  whileHover={{ y: -2 }}
                  className="relative rounded-xl overflow-hidden border border-neutral-100 dark:border-neutral-700 cursor-pointer"
                  onClick={() => navigate(`/community/${group.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/community/${group.id}`)}
                  aria-label={`View ${group.name} group`}
                >
                  {/* Cover image / gradient fallback */}
                  <div className="h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 relative overflow-hidden">
                    {group.image && (
                      <img
                        src={group.image}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {/* Favorite star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(group.id); }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      aria-label={isFav ? `Unfavorite ${group.name}` : `Favorite ${group.name}`}
                      aria-pressed={isFav}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-white'}`} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-neutral-800">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">{group.name}</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </p>
                    {group.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {group.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {filteredGroups.length > 6 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded min-h-[36px] flex items-center justify-center"
            >
              {showAll ? 'Show less' : `Show ${filteredGroups.length - 6} more`}
            </button>
          )}
        </>
      )}

      <Suspense>
        {showCreate && createPortal(<CreateGroupModal isOpen={showCreate} onClose={() => setShowCreate(false)} />, document.body)}
        {showManage && createPortal(<ManageGroupsModal isOpen={showManage} onClose={() => setShowManage(false)} />, document.body)}
      </Suspense>
    </section>
  );
}
