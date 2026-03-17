import { useState, useEffect, useMemo } from 'react';
import { Compass, PawPrint, Search, Users } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { LostPetBanner } from '../LostPetBanner';
import { getActiveLostPets, type LostPetAlert } from '../../utils/lostPetsApi';

const CATEGORY_FILTERS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Reptile', 'Fish', 'Horse', 'Small Animal'] as const;

export default function DiscoverSection() {
  const { groups, joinGroup } = useCommunity();
  const { user, profile } = useAuth();
  const { pets } = usePets();
  const [lostPets, setLostPets] = useState<LostPetAlert[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.zipCode) return;
    getActiveLostPets(profile.zipCode).then(setLostPets).catch(() => {});
  }, [profile?.zipCode]);

  const discoverGroups = useMemo(() => {
    if (!user) return [];
    const userPetTypes = new Set(pets.map(p => (p.type?.toLowerCase() ?? '')));
    return groups
      .filter(g => !g.members[user.uid])
      .map(g => {
        const overlap = g.tags.filter(t => userPetTypes.has(t.toLowerCase())).length;
        return { ...g, score: overlap };
      })
      .sort((a, b) => b.score - a.score);
  }, [groups, user, pets]);

  const filteredGroups = useMemo(() => {
    let result = discoverGroups;
    if (categoryFilter) {
      result = result.filter(g =>
        g.tags.some(t => t.toLowerCase() === categoryFilter.toLowerCase()) ||
        g.name.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.tags.some(t => t.toLowerCase().includes(q)) ||
        g.description?.toLowerCase().includes(q)
      );
    }
    return result.slice(0, 8);
  }, [discoverGroups, searchQuery, categoryFilter]);

  const handleJoin = async (groupId: string) => {
    setJoiningId(groupId);
    try { await joinGroup(groupId); }
    finally { setJoiningId(null); }
  };

  const hasGroups = discoverGroups.length > 0;
  const hasSomething = hasGroups || lostPets.length > 0;
  if (!hasSomething) return null;

  return (
    <section className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-2xl border border-stone-100 dark:border-stone-700 p-5">
      <h2 className="font-semibold text-stone-900 dark:text-stone-50 flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        Discover
      </h2>

      {/* Lost Pet Alerts */}
      {lostPets.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
            Lost Pet Alerts
          </h3>
          {lostPets.map(pet => (
            <LostPetBanner key={pet.id} lostPet={pet} />
          ))}
        </div>
      )}

      {/* Recommended Groups */}
      {hasGroups && (
        <>
          {/* Category filter chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors ${
                !categoryFilter ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
              }`}
            >All</button>
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors ${
                  categoryFilter === cat ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >{cat}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide flex-1">
              {categoryFilter ? `${categoryFilter} Groups` : 'Groups to Join'}
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search groups…"
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36"
              />
            </div>
          </div>
          {filteredGroups.length === 0 ? (
            <EmptyState
              icon={<Search className="w-10 h-10" />}
              title="No matches found"
              description="Try a different search term or broaden your filters."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredGroups.map(group => {
                const memberCount = Object.keys(group.members).length;
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{group.description}</p>
                      )}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {group.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoin(group.id)}
                      disabled={joiningId === group.id}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      aria-label={`Join ${group.name}`}
                    >
                      {joiningId === group.id ? '…' : 'Join'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {!searchQuery && discoverGroups.length > 6 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center">
              {discoverGroups.length - 6} more — search to find them
            </p>
          )}
        </>
      )}

      {discoverGroups.length === 0 && lostPets.length === 0 && (
        <div className="text-center py-6 text-stone-400 dark:text-stone-500">
          <PawPrint className="w-10 h-10 mx-auto mb-2 opacity-40" aria-hidden="true" />
          <p className="text-sm">You've joined all available groups!</p>
        </div>
      )}
    </section>
  );
}
