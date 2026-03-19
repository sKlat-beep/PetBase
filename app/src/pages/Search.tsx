import { motion } from 'motion/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { searchServices, getPlaceDetails, type ServiceResult, type SearchFilters, type PlaceDetails } from '../utils/serviceApi';
import { ServiceDetailModal } from '../components/services/ServiceDetailModal';
import { ServiceCard } from '../components/services/ServiceCard';
import { ServiceFilters } from '../components/services/ServiceFilters';
import { SearchErrorBanner } from '../components/services/SearchErrorBanner';
import { CuratedWebsites } from '../components/services/CuratedWebsites';
import { getPopularWebsites, type WebsiteResult } from '../utils/storeApi';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { markServicesFound } from '../lib/onboardingService';
import { getSavedServices } from '../lib/firestoreService';
import { SkeletonServiceCard } from '../components/ui/Skeleton';

type SortOption = 'rating' | 'reviews' | 'distance';

export function Search() {
  const { pets } = usePets();
  const { user, profile, updateProfile } = useAuth();

  const [searchParams] = useSearchParams();
  const initTab = (searchParams.get('tab') as SearchFilters['type']) || 'Vets';
  const initFilters = searchParams.get('filters') ? searchParams.get('filters')!.split(',') : [];

  const [activeTab, setActiveTab] = useState<SearchFilters['type'] | 'Saved'>(initTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>(initFilters);
  const [selectedService, setSelectedService] = useState<ServiceResult | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [searchRadius, setSearchRadius] = useState(8047); // ~5mi default

  // Community-sourced tips: keyed by serviceId
  type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };
  const [localTips, setLocalTips] = useState<Record<string, Tip[]>>(
    () => { try { return JSON.parse(localStorage.getItem('petbase-service-tips') || '{}'); } catch { return {}; } }
  );

  const addLocalTip = (serviceId: string, text: string, rating: number) => {
    const newTip: Tip = {
      text,
      author: profile?.displayName || 'Anonymous',
      date: new Date().toISOString(),
      ...(rating > 0 ? { rating } : {}),
    };
    const updated = { ...localTips, [serviceId]: [newTip, ...(localTips[serviceId] || [])].slice(0, 5) };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
  };

  const upvoteTip = (serviceId: string, tipIdx: number) => {
    const currentUid = user?.uid ?? 'anon';
    const tips = localTips[serviceId] ?? [];
    const tip = tips[tipIdx];
    if (!tip) return;
    const voters = tip.upvoters ?? [];
    if (voters.includes(currentUid)) return;
    const updatedTip = { ...tip, upvotes: (tip.upvotes ?? 0) + 1, upvoters: [...voters, currentUid] };
    const updatedTips = tips.map((t, i) => i === tipIdx ? updatedTip : t);
    updatedTips.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    const updated = { ...localTips, [serviceId]: updatedTips };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
  };

  // Results State
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [savedResults, setSavedResults] = useState<ServiceResult[]>([]);
  const [storeResults, setStoreResults] = useState<ServiceResult[]>([]);
  const [websiteResults, setWebsiteResults] = useState<WebsiteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<{ code: string; message: string } | null>(null);

  // Place details cache
  const placeDetailsCache = useRef<Map<string, PlaceDetails>>(new Map());

  // Favorites & Recents
  const [favoriteWebsites, setFavoriteWebsites] = useState<string[]>(JSON.parse(localStorage.getItem('petbase_fav_websites') || '[]'));
  const [recentInteractions, setRecentInteractions] = useState<{ id: string, type: 'store' | 'website', name: string, timestamp: number }[]>(JSON.parse(localStorage.getItem('petbase_recent_interactions') || '[]'));

  // Sync initial location from profile (ZIP only — no geolocation)
  useEffect(() => {
    if (profile?.zipCode && !location) {
      setLocation(profile.zipCode);
    }
  }, [profile?.zipCode]);

  // Fetch saved services
  useEffect(() => {
    if (activeTab !== 'Saved') return;
    const savedIds: string[] = (profile as any)?.savedServices ?? [];
    if (savedIds.length === 0) { setSavedResults([]); return; }
    getSavedServices(savedIds).then(docs => {
      const mapped: ServiceResult[] = docs.map((d: any) => ({
        id: d.id, name: d.name, type: d.category, rating: d.rating,
        reviews: d.reviewCount, distance: '', address: d.address,
        image: d.photos?.[0] ?? '', yelpUrl: d.yelpUrl,
        isPetBaseVerified: d.isPetBaseVerified, isSponsored: d.isSponsored,
        status: d.status, specialties: d.specialties ?? [],
        isVerified: d.isPetBaseVerified, petVerified: false, tags: d.specialties ?? [],
      }));
      setSavedResults(mapped);
    }).catch(() => setSavedResults([]));
  }, [activeTab, profile?.savedServices]);

  // Smart filters derived from pets
  const availablePetTypes = useMemo(
    () => Array.from(new Set(pets.map(p => p.type ?? 'Dog').filter(Boolean))),
    [pets]
  );
  const availableBreeds = useMemo(
    () => Array.from(new Set(pets.map(p => p.breed).filter(Boolean))),
    [pets]
  );
  const availableSizes = useMemo(() => {
    const sizes = pets.map(p => {
      const match = (p.weight || '').match(/(\d+)/);
      if (!match) return null;
      const lbs = parseInt(match[1]);
      if (lbs < 20) return 'Small';
      if (lbs <= 50) return 'Medium';
      if (lbs <= 90) return 'Large';
      return 'Extra Large';
    }).filter(Boolean) as string[];
    return Array.from(new Set(sizes));
  }, [pets]);

  const [activePetTypes, setActivePetTypes] = useState<string[]>(availablePetTypes);
  const [activeBreeds, setActiveBreeds] = useState<string[]>(availableBreeds);
  const [activeSizes, setActiveSizes] = useState<string[]>(availableSizes);
  const [showFilters, setShowFilters] = useState(false);

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Main search effect
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSearchError(null);

    // Only search if location is a valid 5-digit ZIP
    if (!location || !/^\d{5}$/.test(location)) {
      setLoading(false);
      return;
    }

    if (activeTab === 'Stores') {
      Promise.all([
        searchServices({
          query: debouncedQuery, location, type: 'Stores',
          petTypesQuery: activePetTypes, petBreedsQuery: activeBreeds,
          petSizesQuery: activeSizes, serviceFilters: activeServiceFilters,
          radius: searchRadius,
        }),
        getPopularWebsites(location),
      ]).then(([storeResponse, websites]) => {
        if (active) {
          setStoreResults(storeResponse.results);
          setWebsiteResults(websites);
          setSearchError(storeResponse.error ?? null);
          setLoading(false);
        }
      });
    } else if (activeTab === 'Saved') {
      setLoading(false);
    } else {
      searchServices({
        query: debouncedQuery, location, type: activeTab,
        petTypesQuery: activePetTypes, petBreedsQuery: activeBreeds,
        petSizesQuery: activeSizes, serviceFilters: activeServiceFilters,
        radius: searchRadius,
      }).then(res => {
        if (active) {
          setResults(res.results);
          setSearchError(res.error ?? null);
          setLoading(false);
          res.results.slice(0, 3).forEach(service => {
            if (!placeDetailsCache.current.has(service.id)) {
              getPlaceDetails(service.id, service.name, service.address)
                .then(details => { if (details) placeDetailsCache.current.set(service.id, details); })
                .catch(() => {});
            }
          });
        }
      });
    }

    return () => { active = false; };
  }, [debouncedQuery, location, activeTab, activePetTypes, activeBreeds, activeSizes, activeServiceFilters, searchRadius]);

  const tabs: (SearchFilters['type'] | 'Saved')[] = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers', 'Stores', 'Boarding', 'Shelters', 'Saved'];
  const savedServiceIds: string[] = (profile as any)?.savedServices ?? [];
  const displayedResults = activeTab === 'Saved' ? savedResults : results;

  // Client-side sort
  const sortedResults = useMemo(() => {
    const sorted = [...displayedResults];
    switch (sortBy) {
      case 'rating': sorted.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': sorted.sort((a, b) => b.reviews - a.reviews); break;
      case 'distance': sorted.sort((a, b) => {
        const da = parseFloat(a.distance) || 999;
        const db = parseFloat(b.distance) || 999;
        return da - db;
      }); break;
    }
    // Sponsored always first
    return sorted.sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0));
  }, [displayedResults, sortBy]);

  const triggerSearchAction = () => markServicesFound();

  const handleSaveService = async (id: string) => {
    if (!profile) return;
    const saved = (profile as any).savedServices ?? [];
    const next = saved.includes(id) ? saved.filter((s: string) => s !== id) : [...saved, id];
    await updateProfile({ savedServices: next } as any);
  };

  const toggleFavoriteWebsite = (id: string) => {
    const updated = favoriteWebsites.includes(id) ? favoriteWebsites.filter(fav => fav !== id) : [...favoriteWebsites, id];
    setFavoriteWebsites(updated);
    localStorage.setItem('petbase_fav_websites', JSON.stringify(updated));
  };

  const recordInteraction = (id: string, type: 'store' | 'website', name: string) => {
    const interaction = { id, type, name, timestamp: Date.now() };
    const filtered = recentInteractions.filter(i => i.id !== id);
    const updated = [interaction, ...filtered].slice(0, 5);
    setRecentInteractions(updated);
    localStorage.setItem('petbase_recent_interactions', JSON.stringify(updated));
  };

  const activeFilterCount = activeServiceFilters.length +
    (activePetTypes.length !== availablePetTypes.length ? 1 : 0) +
    (activeBreeds.length !== availableBreeds.length ? 1 : 0) +
    (activeSizes.length !== availableSizes.length ? 1 : 0) +
    (searchRadius !== 8047 ? 1 : 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">
          Find Services
        </h1>
        <p className="text-on-surface-variant mt-1">
          Discover top-rated professionals for your pets.
        </p>
      </header>

      {/* Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-[20px] absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); triggerSearchAction(); }}
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              />
            </div>
            <div className="relative w-32 md:w-48">
              <span className="material-symbols-outlined text-[20px] absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">pin_drop</span>
              <input
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); triggerSearchAction(); }}
                placeholder="ZIP Code"
                maxLength={5}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {location && profile && location !== profile.zipCode && (
              <button
                onClick={() => updateProfile({ zipCode: location })}
                className="px-4 py-3 text-sm font-medium bg-on-surface text-surface rounded-xl hover:bg-on-surface/90 transition-colors whitespace-nowrap"
              >
                Make Permanent
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition-colors flex items-center justify-center gap-1.5 relative ${showFilters ? 'bg-primary-container border-primary/30 text-primary' : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {showFilters && (
          <ServiceFilters
            activeTab={activeTab}
            availablePetTypes={availablePetTypes}
            availableBreeds={availableBreeds}
            availableSizes={availableSizes}
            activePetTypes={activePetTypes}
            activeBreeds={activeBreeds}
            activeSizes={activeSizes}
            activeServiceFilters={activeServiceFilters}
            searchRadius={searchRadius}
            onPetTypesChange={setActivePetTypes}
            onBreedsChange={setActiveBreeds}
            onSizesChange={setActiveSizes}
            onServiceFiltersChange={setActiveServiceFilters}
            onRadiusChange={setSearchRadius}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); triggerSearchAction(); }}
            className={`whitespace-nowrap px-5 py-2 rounded-full font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'bg-on-surface text-surface'
                : 'bg-surface-container-low border border-outline-variant text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <SearchErrorBanner error={searchError} />

      {/* ZIP validation hint */}
      {location && !/^\d{5}$/.test(location) && (
        <div className="text-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-2">
          Enter a 5-digit ZIP code
        </div>
      )}

      {/* Sort controls (non-Stores, non-Saved) */}
      {!loading && activeTab !== 'Stores' && activeTab !== 'Saved' && displayedResults.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">swap_vert</span>
          <span className="text-xs font-medium text-on-surface-variant">Sort:</span>
          {(['rating', 'reviews', 'distance'] as SortOption[]).map(opt => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                sortBy === opt
                  ? 'bg-on-surface text-surface border-transparent'
                  : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {opt === 'rating' ? 'Top Rated' : opt === 'reviews' ? 'Most Reviewed' : 'Nearest'}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div>
          <p className="text-sm text-on-surface-variant mb-4">
            Searching {location ? `near ${location}` : ''}...
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3].map(i => <SkeletonServiceCard key={i} />)}
          </div>
        </div>
      ) : activeTab === 'Stores' ? (
        <div className="space-y-8 tracking-tight">
          {recentInteractions.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[20px] text-primary">schedule</span> Recently Viewed
              </h3>
              <div className="flex gap-2 flex-wrap">
                {recentInteractions.map(interaction => (
                  <span key={`${interaction.type}-${interaction.id}`} className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-full text-sm text-on-surface-variant flex items-center gap-1.5 cursor-pointer hover:bg-surface-container-high transition">
                    <span className="material-symbols-outlined text-[14px]">{interaction.type === 'store' ? 'location_on' : 'open_in_new'}</span>
                    {interaction.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby pet stores from Yelp */}
          <div>
            <h3 className="text-xl font-bold text-on-surface mb-4">Nearby Pet Stores</h3>
            {storeResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeResults.map(store => (
                  <div key={store.id} onClick={() => { setSelectedService(store); recordInteraction(store.id, 'store', store.name); }} className="bg-surface-container-low rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-outline-variant hover:shadow-md transition">
                    {store.image && (
                      <div className="h-40 relative">
                        <img src={store.image} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button onClick={(e) => { e.stopPropagation(); void handleSaveService(store.id); }}
                          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition shadow-sm ${savedServiceIds.includes(store.id) ? 'bg-error/90 text-on-error' : 'bg-white/70 text-on-surface-variant hover:bg-error-container hover:text-error'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${savedServiceIds.includes(store.id) ? 'fill-1' : ''}`}>favorite</span>
                        </button>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-lg text-on-surface">{store.name}</h4>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-sm font-bold shrink-0">
                          <span className="material-symbols-outlined text-[14px] fill-1 text-amber-500">star</span>
                          {store.rating}
                        </div>
                      </div>
                      <p className="text-sm text-on-surface-variant">{store.reviews} reviews{store.distance ? ` · ${store.distance}` : ''}</p>
                      <div className="flex items-center gap-1.5 text-sm text-on-surface-variant mt-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">location_on</span>
                        <span className="truncate">{store.address}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !searchError && (
              <div className="py-10 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[24px] mx-auto mb-2 block">location_on</span>
                <p className="text-sm">No nearby pet stores found. Try a different location.</p>
              </div>
            )}
          </div>

          <CuratedWebsites
            websites={websiteResults}
            favoriteWebsites={favoriteWebsites}
            onToggleFavorite={toggleFavoriteWebsite}
            onRecordInteraction={(id, name) => recordInteraction(id, 'website', name)}
          />
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="py-20 text-center bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant">
          {!location ? (
            <>
              <span className="material-symbols-outlined text-[32px] mx-auto mb-3 text-outline-variant block">pin_drop</span>
              <h3 className="text-lg font-medium text-on-surface">Enter a ZIP code</h3>
              <p className="text-on-surface-variant">Type a 5-digit ZIP code to find services near you.</p>
            </>
          ) : activeTab === 'Saved' ? (
            <>
              <span className="material-symbols-outlined text-[32px] mx-auto mb-3 text-outline-variant block">favorite</span>
              <h3 className="text-lg font-medium text-on-surface">No saved services</h3>
              <p className="text-on-surface-variant">Tap the heart icon on any service to save it here.</p>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[32px] mx-auto mb-3 text-outline-variant block">search</span>
              <h3 className="text-lg font-medium text-on-surface">No {activeTab.toLowerCase()} found</h3>
              <p className="text-on-surface-variant">
                Try a different ZIP code or adjust your filters.
              </p>
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Sponsored section */}
          {sortedResults.filter(r => r.isSponsored).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 px-1">Sponsored</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {sortedResults.filter(r => r.isSponsored).map(r => (
                  <button key={r.id} onClick={() => setSelectedService(r)}
                    className="shrink-0 w-48 rounded-xl bg-amber-50 border border-amber-200 p-3 text-left hover:bg-amber-100 transition-colors">
                    {r.image && <img src={r.image} alt={r.name} className="w-full h-20 object-cover rounded-lg mb-2" />}
                    <p className="text-xs font-semibold text-on-surface truncate">{r.name}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{r.address}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedResults.map((result) => (
              <ServiceCard
                key={result.id}
                result={result}
                isSaved={savedServiceIds.includes(result.id)}
                activePetTypes={activePetTypes}
                uid={user?.uid}
                displayName={profile?.displayName}
                localTips={localTips[result.id] || []}
                onSelect={() => setSelectedService(result)}
                onSave={() => void handleSaveService(result.id)}
                onAddTip={(text, rating) => addLocalTip(result.id, text, rating)}
                onUpvoteTip={(tipIdx) => upvoteTip(result.id, tipIdx)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          cachedDetails={placeDetailsCache.current.get(selectedService.id)}
        />
      )}
    </motion.div>
  );
}
