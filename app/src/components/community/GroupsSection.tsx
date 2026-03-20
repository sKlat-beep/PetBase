import { useState, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
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
    <section className="bg-surface-container-low backdrop-blur-sm rounded-2xl border border-outline-variant p-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">groups</span>
          Your Groups
          {userGroups.length > 0 && (
            <span className="text-xs font-normal text-on-surface-variant">
              {userGroups.length}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManage(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Manage groups"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">settings</span> Manage
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center gap-1 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Create a new group"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span> Create
          </button>
        </div>
      </div>

      {/* Skeleton loading state */}
      {loading && userGroups.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-outline-variant overflow-hidden animate-pulse">
              <div className="h-16 bg-surface-container-highest" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 bg-surface-container-highest rounded w-3/4" />
                <div className="h-2.5 bg-surface-container-highest rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && userGroups.length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-[40px] mx-auto mb-2 opacity-40" aria-hidden="true">pets</span>
          <p className="text-sm">You haven't joined any groups yet.</p>
          <p className="text-xs mt-1">Check out Discover below to find your community.</p>
        </div>
      )}

      {/* Search no-results state */}
      {userGroups.length > 0 && filteredGroups.length === 0 && groupSearch !== '' && (
        <p className="text-sm text-on-surface-variant text-center py-8">
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
                  className="relative rounded-xl overflow-hidden border border-outline-variant cursor-pointer"
                  onClick={() => navigate(`/community/${group.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/community/${group.id}`)}
                  aria-label={`View ${group.name} group`}
                >
                  {/* Cover image / gradient fallback */}
                  <div className="h-16 bg-gradient-to-br from-primary-container to-primary-container/50 relative overflow-hidden">
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
                      <span className={`material-symbols-outlined text-[14px] ${isFav ? 'text-amber-400' : 'text-white'}`} aria-hidden="true">{isFav ? 'star' : 'star_border'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-surface-container">
                    <p className="text-xs font-semibold text-on-surface truncate">{group.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </p>
                    {group.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {group.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container">
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
              className="mt-3 text-xs text-primary hover:underline w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded min-h-[36px] flex items-center justify-center"
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
