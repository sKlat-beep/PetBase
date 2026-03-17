import { useState, useEffect, useMemo } from 'react';
import { Compass, PawPrint, Search, Users } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import { useCommunity } from '../../contexts/CommunityContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { LostPetBanner } from '../LostPetBanner';
import { getActiveLostPets, type LostPetAlert } from '../../utils/lostPetsApi';

const CATEGORY_FILTERS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Reptile', 'Fish', 'Horse', 'Small Animal'] as const;

interface DiscoverSectionProps {
  externalSearch?: string;
}

export default function DiscoverSection({ externalSearch = '' }: DiscoverSectionProps) {
  const { groups, joinGroup } = useCommunity();
  const { user, profile } = useAuth();
  const { pets } = usePets();
  const [lostPets, setLostPets] = useState<LostPetAlert[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Sync external search from CommunityHub top bar
  useEffect(() => {
    if (externalSearch) setSearchQuery(externalSearch);
  }, [externalSearch]);

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
    setJoinError(null);
    try {
      await joinGroup(groupId);
      setExpandedId(null);
    } catch (err: any) {
      if (err?.message === 'BANNED') {
        setJoinError("You've been banned from this group");
      } else {
        setJoinError("Couldn't join — try again");
      }
    } finally {
      setJoiningId(null);
    }
  };

  const hasGroups = discoverGroups.length > 0;
  const hasSomething = hasGroups || lostPets.length > 0;
  if (!hasSomething) return null;

  return (
    <section className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl border border-neutral-100 dark:border-neutral-700 p-5">
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-50 flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        Discover
      </h2>

      {/* Lost Pet Alerts */}
      {lostPets.length > 0 && (
        <div className="mb-5">
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
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
                !categoryFilter ? 'bg-emerald-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >All</button>
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors ${
                  categoryFilter === cat ? 'bg-emerald-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >{cat}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide flex-1">
              {categoryFilter ? `${categoryFilter} Groups` : 'Groups to Join'}
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search groups…"
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40"
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
                const isExpanded = expandedId === group.id;
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{group.name}</p>
                        {!isExpanded && group.description && (
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">{group.description}</p>
                        )}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {group.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {!isExpanded && (
                        <button
                          onClick={() => { setExpandedId(group.id); setJoinError(null); }}
                          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          aria-label={`Preview ${group.name}`}
                        >
                          Join
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                        {group.description && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-2">{group.description}</p>
                        )}
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-3">
                          {group.posts.length} post{group.posts.length !== 1 ? 's' : ''} · {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                        </p>
                        {joinError && expandedId === group.id && (
                          <p className="text-xs text-rose-500 mb-2" role="alert">{joinError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleJoin(group.id)}
                            disabled={joiningId === group.id}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            {joiningId === group.id ? 'Joining…' : 'Join'}
                          </button>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!searchQuery && discoverGroups.length > 8 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center">
              {discoverGroups.length - 8} more — search to find them
            </p>
          )}
        </>
      )}

      {discoverGroups.length === 0 && lostPets.length === 0 && (
        <div className="text-center py-6 text-neutral-400 dark:text-neutral-500">
          <PawPrint className="w-10 h-10 mx-auto mb-2 opacity-40" aria-hidden="true" />
          <p className="text-sm">You've joined all available groups!</p>
        </div>
      )}
    </section>
  );
}
