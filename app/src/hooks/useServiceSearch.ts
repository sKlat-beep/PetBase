/**
 * useServiceSearch — Extracts all search state & effects from Search.tsx
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { searchServices, getPlaceDetails, type ServiceResult, type SearchFilters, type PlaceDetails } from '../utils/serviceApi';
import { getPopularWebsites, type WebsiteResult } from '../utils/storeApi';
import { usePets } from '../contexts/PetContext';
import { useAuth } from '../contexts/AuthContext';
import { markServicesFound } from '../lib/onboardingService';
import { getSavedServices } from '../lib/firestoreService';

export type SortOption = 'rating' | 'reviews' | 'distance';

export function useServiceSearch() {
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
  const [searchRadius, setSearchRadius] = useState(8047);
  const [showFilters, setShowFilters] = useState(false);

  // Pet category selection (new taxonomy-based filter)
  const [selectedPetCategories, setSelectedPetCategories] = useState<string[]>([]);

  // Results
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [savedResults, setSavedResults] = useState<ServiceResult[]>([]);
  const [storeResults, setStoreResults] = useState<ServiceResult[]>([]);
  const [websiteResults, setWebsiteResults] = useState<WebsiteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<{ code: string; message: string } | null>(null);

  // Place details cache
  const placeDetailsCache = useRef<Map<string, PlaceDetails>>(new Map());

  // Smart filters derived from pets
  const availablePetTypes = useMemo(
    () => Array.from(new Set(pets.map(p => p.type ?? 'Dog').filter(Boolean))),
    [pets],
  );
  const availableBreeds = useMemo(
    () => Array.from(new Set(pets.map(p => p.breed).filter(Boolean))),
    [pets],
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

  // Debounce
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync initial location from profile
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

  // Main search effect
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSearchError(null);

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
          radius: searchRadius, selectedPetCategories,
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
        radius: searchRadius, selectedPetCategories,
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
  }, [debouncedQuery, location, activeTab, activePetTypes, activeBreeds, activeSizes, activeServiceFilters, searchRadius, selectedPetCategories]);

  const tabs: (SearchFilters['type'] | 'Saved')[] = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers', 'Stores', 'Boarding', 'Shelters', 'Saved'];
  const savedServiceIds: string[] = (profile as any)?.savedServices ?? [];
  const displayedResults = activeTab === 'Saved' ? savedResults : results;

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
    return sorted.sort((a, b) => (b.isSponsored ? 1 : 0) - (a.isSponsored ? 1 : 0));
  }, [displayedResults, sortBy]);

  const triggerSearchAction = () => markServicesFound();

  const handleSaveService = async (id: string) => {
    if (!profile) return;
    const saved = (profile as any).savedServices ?? [];
    const next = saved.includes(id) ? saved.filter((s: string) => s !== id) : [...saved, id];
    await updateProfile({ savedServices: next } as any);
  };

  const activeFilterCount = activeServiceFilters.length +
    (activePetTypes.length !== availablePetTypes.length ? 1 : 0) +
    (activeBreeds.length !== availableBreeds.length ? 1 : 0) +
    (activeSizes.length !== availableSizes.length ? 1 : 0) +
    (searchRadius !== 8047 ? 1 : 0) +
    (selectedPetCategories.length > 0 ? 1 : 0);

  const getCachedDetails = (id: string) => placeDetailsCache.current.get(id);

  return {
    // State
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    location, setLocation,
    activeServiceFilters, setActiveServiceFilters,
    selectedService, setSelectedService,
    sortBy, setSortBy,
    searchRadius, setSearchRadius,
    showFilters, setShowFilters,
    selectedPetCategories, setSelectedPetCategories,
    activePetTypes, setActivePetTypes,
    activeBreeds, setActiveBreeds,
    activeSizes, setActiveSizes,

    // Derived
    availablePetTypes, availableBreeds, availableSizes,
    tabs, savedServiceIds, sortedResults, loading, searchError,
    storeResults, websiteResults, activeFilterCount,

    // Actions
    triggerSearchAction, handleSaveService, getCachedDetails,

    // Auth
    user, profile, updateProfile,
  };
}
