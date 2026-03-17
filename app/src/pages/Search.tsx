import { motion } from 'motion/react';
import { Search as SearchIcon, Star, MapPin, Filter, ShieldCheck, AlertTriangle, Loader2, MessageSquare, ExternalLink, Heart, Clock } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { searchServices, getPlaceDetails, type ServiceResult, type SearchFilters, type PlaceDetails } from '../utils/serviceApi';
import { ServiceDetailModal } from '../components/services/ServiceDetailModal';
import { getNearbyStores, getPopularWebsites, type StoreResult, type WebsiteResult } from '../utils/storeApi';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { markServicesFound } from '../components/GettingStartedGuide';
import { getSavedServices } from '../lib/firestoreService';
import { SkeletonServiceCard } from '../components/ui/Skeleton';

const COMMON_FILTERS = [
  'Emergency', '24/7', 'Vaccination', 'Surgery', 'Dental', 'Microchipping', 'Spay/Neuter', 'Exotics',
  'Bathing', 'Haircut', 'Nail Trimming', 'Deshedding', 'Mobile Grooming',
  'Boarding', 'Daycare', 'Training', 'House Sitting', 'Drop-in Visits', 'Dog Walking', 'Pet Taxi'
];

export function Search() {
  const { pets } = usePets();
  const { profile, updateProfile } = useAuth();

  const [searchParams] = useSearchParams();
  const initTab = (searchParams.get('tab') as SearchFilters['type']) || 'Vets';
  const initFilters = searchParams.get('filters') ? searchParams.get('filters')!.split(',') : [];

  const [activeTab, setActiveTab] = useState<SearchFilters['type'] | 'Saved'>(initTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>(initFilters);
  const [selectedService, setSelectedService] = useState<ServiceResult | null>(null);

  // Community-sourced tips: keyed by serviceId
  type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };
  const [localTips, setLocalTips] = useState<Record<string, Tip[]>>(
    () => { try { return JSON.parse(localStorage.getItem('petbase-service-tips') || '{}'); } catch { return {}; } }
  );
  const [tipInputs, setTipInputs] = useState<Record<string, string>>({});

  const [tipRating, setTipRating] = useState<Record<string, number>>({});

  const addLocalTip = (serviceId: string, text: string) => {
    const rating = tipRating[serviceId] ?? 0;
    const newTip: Tip = {
      text,
      author: profile?.displayName || 'Anonymous',
      date: new Date().toISOString(),
      ...(rating > 0 ? { rating } : {}),
    };
    const updated = { ...localTips, [serviceId]: [newTip, ...(localTips[serviceId] || [])].slice(0, 5) };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
    setTipInputs(prev => ({ ...prev, [serviceId]: '' }));
  };

  const upvoteTip = (serviceId: string, tipIdx: number) => {
    const uid = user?.uid ?? 'anon';
    const tips = localTips[serviceId] ?? [];
    const tip = tips[tipIdx];
    if (!tip) return;
    const voters = tip.upvoters ?? [];
    if (voters.includes(uid)) return; // already voted
    const updatedTip = { ...tip, upvotes: (tip.upvotes ?? 0) + 1, upvoters: [...voters, uid] };
    const updatedTips = tips.map((t, i) => i === tipIdx ? updatedTip : t);
    // Sort by upvotes descending
    updatedTips.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    const updated = { ...localTips, [serviceId]: updatedTips };
    setLocalTips(updated);
    localStorage.setItem('petbase-service-tips', JSON.stringify(updated));
  };

  // Results State
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [savedResults, setSavedResults] = useState<ServiceResult[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResult[]>([]);
  const [websiteResults, setWebsiteResults] = useState<WebsiteResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Place details cache: persists across renders without causing re-renders
  const placeDetailsCache = useRef<Map<string, PlaceDetails>>(new Map());

  // Favorites & Recents State
  const [favoriteStores, setFavoriteStores] = useState<string[]>(JSON.parse(localStorage.getItem('petbase_fav_stores') || '[]'));
  const [favoriteWebsites, setFavoriteWebsites] = useState<string[]>(JSON.parse(localStorage.getItem('petbase_fav_websites') || '[]'));
  const [recentInteractions, setRecentInteractions] = useState<{ id: string, type: 'store' | 'website', name: string, timestamp: number }[]>(JSON.parse(localStorage.getItem('petbase_recent_interactions') || '[]'));

  // Sync initial location from profile
  useEffect(() => {
    if (profile?.zipCode && !location) {
      setLocation(profile.zipCode);
    } else if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { } // ignore
      );
    }
  }, [profile?.zipCode]);

  // Fetch saved services from Firestore when Saved tab is active
  useEffect(() => {
    if (activeTab !== 'Saved') return;
    const savedIds: string[] = (profile as any)?.savedServices ?? [];
    if (savedIds.length === 0) { setSavedResults([]); return; }
    getSavedServices(savedIds).then(docs => {
      const mapped: ServiceResult[] = docs.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.category,
        rating: d.rating,
        reviews: d.reviewCount,
        distance: '',
        address: d.address,
        image: d.photos?.[0] ?? '',
        yelpUrl: d.yelpUrl,
        isPetBaseVerified: d.isPetBaseVerified,
        isSponsored: d.isSponsored,
        status: d.status,
        specialties: d.specialties ?? [],
        isVerified: d.isPetBaseVerified,
        petVerified: false,
        tags: d.specialties ?? [],
      }));
      setSavedResults(mapped);
    }).catch(() => setSavedResults([]));
  }, [activeTab, profile?.savedServices]);

  // Smart filters derived from the user's actual pets
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

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (activeTab === 'Stores') {
      Promise.all([
        getNearbyStores(location),
        getPopularWebsites(location)
      ]).then(([stores, websites]) => {
        if (active) {
          setStoreResults(stores);
          setWebsiteResults(websites);
          setLoading(false);
        }
      });
    } else if (activeTab === 'Saved') {
      setLoading(false);
    } else {
      searchServices({
        query: debouncedQuery,
        location: location,
        type: activeTab,
        petTypesQuery: activePetTypes,
        petBreedsQuery: activeBreeds,
        petSizesQuery: activeSizes,
        serviceFilters: activeServiceFilters,
        ...(gpsCoords ? { lat: gpsCoords.lat, lng: gpsCoords.lng } : {}),
      }).then(res => {
        if (active) {
          setResults(res);
          setLoading(false);
          // Pre-fetch place details for the top 3 results in the background
          res.slice(0, 3).forEach(service => {
            if (!placeDetailsCache.current.has(service.id)) {
              getPlaceDetails(service.id, service.name, service.address)
                .then(details => {
                  if (details) placeDetailsCache.current.set(service.id, details);
                })
                .catch(() => {}); // silently ignore errors
            }
          });
        }
      });
    }

    return () => { active = false; };
  }, [debouncedQuery, location, activeTab, activePetTypes, activeBreeds, activeSizes, activeServiceFilters, gpsCoords]);

  const tabs: (SearchFilters['type'] | 'Saved')[] = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers', 'Stores', 'Boarding', 'Shelters', 'Saved'];

  const savedServiceIds: string[] = (profile as any)?.savedServices ?? [];
  const displayedResults = activeTab === 'Saved' ? savedResults : results;

  const triggerSearchAction = () => markServicesFound();

  const handleSaveService = async (id: string) => {
    if (!profile) return;
    const saved = (profile as any).savedServices ?? [];
    const next = saved.includes(id) ? saved.filter((s: string) => s !== id) : [...saved, id];
    await updateProfile({ savedServices: next } as any);
  };

  const toggleFavorite = (id: string, type: 'store' | 'website') => {
    if (type === 'store') {
      const updated = favoriteStores.includes(id) ? favoriteStores.filter(fav => fav !== id) : [...favoriteStores, id];
      setFavoriteStores(updated);
      localStorage.setItem('petbase_fav_stores', JSON.stringify(updated));
    } else {
      const updated = favoriteWebsites.includes(id) ? favoriteWebsites.filter(fav => fav !== id) : [...favoriteWebsites, id];
      setFavoriteWebsites(updated);
      localStorage.setItem('petbase_fav_websites', JSON.stringify(updated));
    }
  };

  const recordInteraction = (id: string, type: 'store' | 'website', name: string) => {
    const interaction = { id, type, name, timestamp: Date.now() };
    const filtered = recentInteractions.filter(i => i.id !== id);
    const updated = [interaction, ...filtered].slice(0, 5); // Keep last 5
    setRecentInteractions(updated);
    localStorage.setItem('petbase_recent_interactions', JSON.stringify(updated));
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Find Services
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          Discover top-rated professionals for your pets.
        </p>
      </header>

      {/* Search Bar & Smart Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  triggerSearchAction();
                }}
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="relative w-32 md:w-48">
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setLocation(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
                        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        triggerSearchAction();
                      },
                      (err) => console.error(err)
                    );
                  }
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-emerald-500 transition-colors bg-transparent border-none p-1 cursor-pointer"
                title="Use Current Location"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  triggerSearchAction();
                }}
                placeholder="Zip Code"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {location && profile && location !== profile.zipCode && (
              <button
                onClick={() => updateProfile({ zipCode: location })}
                className="px-4 py-3 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors whitespace-nowrap"
              >
                Make Permanent
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition-colors flex items-center justify-center ${showFilters ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">My Pets (Smart Filter)</h4>
                {availablePetTypes.length === 0 ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">Add pets to your profile to enable smart filtering.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availablePetTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setActivePetTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${activePetTypes.includes(type) ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                      >
                        {type} Friendly
                      </button>
                    ))}
                  </div>
                )}
                {availableBreeds.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Breeds (used for Verified matching)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBreeds.map(breed => (
                        <button
                          key={breed}
                          onClick={() => setActiveBreeds(prev => prev.includes(breed) ? prev.filter(b => b !== breed) : [...prev, breed])}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${activeBreeds.includes(breed) ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-500 line-through hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                          {breed}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {availableSizes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Size (derived from pet weight)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSizes.map(size => (
                        <button
                          key={size}
                          onClick={() => setActiveSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${activeSizes.includes(size) ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-800 dark:text-violet-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeTab !== 'Stores' && (
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Service Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_FILTERS.map(filter => (
                      <button
                        key={filter}
                        onClick={() => {
                          setActiveServiceFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
                          triggerSearchAction();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeServiceFilters.includes(filter) ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              triggerSearchAction();
            }}
            className={`
              whitespace-nowrap px-5 py-2 rounded-full font-medium text-sm transition-colors
              ${activeTab === tab
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map(i => <SkeletonServiceCard key={i} />)}
        </div>
      ) : activeTab === 'Stores' ? (
        <div className="space-y-8 tracking-tight">
          {recentInteractions.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-600" /> Recently Viewed
              </h3>
              <div className="flex gap-2 flex-wrap">
                {recentInteractions.map(interaction => (
                  <span key={`${interaction.type}-${interaction.id}`} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                    {interaction.type === 'store' ? <MapPin className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    {interaction.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Popular Local Websites</h3>
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-4 snap-x">
              {websiteResults.sort((a, b) => favoriteWebsites.includes(b.id) ? 1 : favoriteWebsites.includes(a.id) ? -1 : 0).map(site => (
                <div key={site.id} onClick={() => recordInteraction(site.id, 'website', site.name)} className="snap-start shrink-0 w-64 bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-start gap-4">
                  <div className="w-full flex justify-between items-start">
                    <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-700 rounded-xl flex items-center justify-center p-2 border border-neutral-200 dark:border-neutral-600">
                      <img src={site.logo} alt={site.name} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(site.id, 'website'); }} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition text-neutral-400">
                      <Heart className={`w-5 h-5 ${favoriteWebsites.includes(site.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{site.name}</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{site.description}</p>
                  </div>
                  <a href={site.url} target="_blank" rel="noopener noreferrer" className="mt-auto text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
                    Visit Website <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Nearby Stores & Supplies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeResults.sort((a, b) => favoriteStores.includes(b.id) ? 1 : favoriteStores.includes(a.id) ? -1 : 0).map(store => (
                <div key={store.id} onClick={() => recordInteraction(store.id, 'store', store.name)} className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition">
                  <div className="h-40 relative">
                    <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(store.id, 'store'); }} className="absolute top-3 right-3 p-2 bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full transition shadow-sm">
                      <Heart className={`w-5 h-5 ${favoriteStores.includes(store.id) ? 'fill-rose-500 text-rose-500' : 'text-neutral-700'}`} />
                    </button>
                    <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-bold shadow-sm ${store.isOpen ? 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/50' : 'bg-rose-100/90 text-rose-700 border border-rose-200/50'}`}>
                      {store.isOpen ? 'Open Now' : 'Closed'}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase mb-1">{store.type}</p>
                    <h4 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{store.name}</h4>
                    <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                      <MapPin className="w-4 h-4" /> {store.address} ({store.distance})
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {store.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 rounded-md text-[11px] font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : displayedResults.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-neutral-800 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700">
          <SearchIcon className="w-8 h-8 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">No results found</h3>
          <p className="text-neutral-500 dark:text-neutral-400">Try adjusting your filters or searching a different area.</p>
        </div>
      ) : (
        <div>
          {/* Sponsored section */}
          {displayedResults.filter(r => r.isSponsored).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2 px-1">Sponsored</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {displayedResults.filter(r => r.isSponsored).map(r => (
                  <button key={r.id} onClick={() => setSelectedService(r)}
                    className="shrink-0 w-48 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-left hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors">
                    {r.image && <img src={r.image} alt={r.name} className="w-full h-20 object-cover rounded-lg mb-2" />}
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{r.name}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{r.address}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && displayedResults.length === 0 && activeTab !== 'Saved' && (
            <div className="py-16 flex flex-col items-center gap-3 text-neutral-500 dark:text-neutral-400">
              <MapPin className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
              <p className="font-medium">No {activeTab.toLowerCase()} found</p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center max-w-xs">
                Try a different location or check that your zip code is correct.
                {!gpsCoords && ' You can also use the GPS button for more accurate results.'}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedResults.map((result) => (
              <div
                key={result.id}
                onClick={() => setSelectedService(result)}
                className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow flex flex-col cursor-pointer"
              >
                <div className="h-48 relative">
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {result.isPetBaseVerified && (
                      <div className="bg-emerald-600/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-white shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </div>
                    )}
                    {result.petVerified ? (
                      <div className="bg-emerald-600/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-white shadow-sm" title="This provider explicitly supports your pet's type and breed">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified for your pet
                      </div>
                    ) : activePetTypes.length > 0 ? (
                      <div className="bg-amber-100/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-amber-800 shadow-sm border border-amber-200/50" title={`Call to confirm they can accommodate: ${activePetTypes.join(', ')}`}>
                        <AlertTriangle className="w-3.5 h-3.5" /> Call to verify
                      </div>
                    ) : result.isVerified && (
                      <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-emerald-700 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </div>
                    )}
                  </div>
                  {/* Save button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleSaveService(result.id); }}
                    className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-sm transition-colors ${savedServiceIds.includes(result.id) ? 'bg-rose-500/90 text-white' : 'bg-white/70 text-neutral-500 hover:bg-rose-50 hover:text-rose-500'}`}
                  >
                    <Heart className={`w-4 h-4 ${savedServiceIds.includes(result.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 leading-tight">
                      {result.name}
                    </h3>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md text-sm font-bold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {result.rating}
                    </div>
                  </div>

                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    {result.reviews} reviews
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    <span className="truncate">{result.address}</span>
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium shrink-0">
                      ({result.distance})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-700">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2.5 py-1 rounded-md text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {(() => {
                    const allTips = [...(localTips[result.id] || []), ...(result.communityTips || [])];
                    return (
                      <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Community Tips</span>
                        </div>
                        {allTips.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {allTips.map((tip, idx) => (
                              <div key={idx} className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-3">
                                {tip.rating && tip.rating > 0 && (
                                  <div className="flex gap-0.5 mb-1">
                                    {[1,2,3,4,5].map(s => (
                                      <span key={s} className={`text-xs ${s <= tip.rating! ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`}>★</span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">"{tip.text}"</p>
                                <div className="flex justify-between items-center mt-1.5">
                                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">— {tip.author}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); upvoteTip(result.id, idx); }}
                                      disabled={(tip.upvoters ?? []).includes(user?.uid ?? '')}
                                      className="flex items-center gap-0.5 text-[10px] text-neutral-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-default transition-colors"
                                      aria-label="Upvote tip"
                                    >
                                      ▲ {tip.upvotes ?? 0}
                                    </button>
                                    <span className="text-[10px] text-neutral-400">{new Date(tip.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const t = (tipInputs[result.id] || '').trim();
                            if (t) addLocalTip(result.id, t);
                          }}
                          className="flex gap-2"
                        >
                          <div className="flex gap-1 mb-1">
                            {[1,2,3,4,5].map(s => (
                              <button key={s} type="button" onClick={(ev) => { ev.stopPropagation(); setTipRating(prev => ({ ...prev, [result.id]: prev[result.id] === s ? 0 : s })); }}
                                className={`text-sm ${s <= (tipRating[result.id] ?? 0) ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'} hover:text-amber-400 transition-colors`}
                              >★</button>
                            ))}
                            <span className="text-[10px] text-neutral-400 ml-1 self-center">
                              {tipRating[result.id] ? `${tipRating[result.id]}/5` : 'Rate (optional)'}
                            </span>
                          </div>
                          <input
                            type="text"
                            maxLength={200}
                            value={tipInputs[result.id] || ''}
                            onChange={(e) => setTipInputs(prev => ({ ...prev, [result.id]: e.target.value }))}
                            placeholder="Share a review or tip..."
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="submit"
                            disabled={!(tipInputs[result.id] || '').trim()}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Post
                          </button>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              </div>
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
