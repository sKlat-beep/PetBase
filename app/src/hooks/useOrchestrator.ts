/**
 * useOrchestrator — Primary search hook for the Pet-Aware Yelp Orchestrator.
 *
 * Manages multi-pet selection, auto-derived tags, default tag toggling,
 * custom tag pinning, live URL preview, search history, and post-redirect verification.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePets } from '../contexts/PetContext';
import { deriveSearchAugments } from '../data/breedIntelligence';
import { trackSearchTerm } from '../lib/searchAnalytics';
import {
  buildYelpURL,
  openYelpSearch,
  loadSearchHistory,
  type PreviewTag,
  type QueryLayers,
  type SearchHistoryEntry,
} from '../utils/yelpOrchestrator';

export function useOrchestrator(zip: string) {
  const { pets } = usePets();

  // Multi-pet selection
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);

  const selectedPets = useMemo(
    () => pets.filter(p => selectedPetIds.includes(p.id)),
    [pets, selectedPetIds],
  );

  // Auto-select first pet on mount
  useEffect(() => {
    if (selectedPetIds.length === 0 && pets.length > 0) {
      setSelectedPetIds([pets[0].id]);
    }
  }, [pets, selectedPetIds.length]);

  const togglePetSelection = useCallback((id: string) => {
    setSelectedPetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // Derive combined tags from all selected pets
  const combinedAugments = useMemo(() => {
    const defaultSet = new Set<string>();
    const optionalSet = new Set<string>();
    const defaults: string[] = [];
    const optionals: string[] = [];

    for (const pet of selectedPets) {
      const augments = deriveSearchAugments(pet);
      for (const tag of augments.defaultTags) {
        if (!defaultSet.has(tag)) {
          defaultSet.add(tag);
          defaults.push(tag);
        }
      }
      for (const tag of augments.optionalTags) {
        if (!optionalSet.has(tag)) {
          optionalSet.add(tag);
          optionals.push(tag);
        }
      }
    }

    return { defaultTags: defaults, optionalTags: optionals };
  }, [selectedPets]);

  // Disabled default tags (toggled OFF by user)
  const [disabledDefaultTags, setDisabledDefaultTags] = useState<string[]>([]);

  // Reset stale disabled defaults when pet selection changes
  useEffect(() => {
    setDisabledDefaultTags(prev =>
      prev.filter(tag => combinedAugments.defaultTags.includes(tag))
    );
  }, [combinedAugments.defaultTags]);

  const toggleDefaultTag = useCallback((tag: string) => {
    setDisabledDefaultTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // Custom pinned tags
  const [customTags, setCustomTags] = useState<string[]>([]);

  const pinCustomTag = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setCustomTags(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    trackSearchTerm(trimmed);
  }, []);

  const removeCustomTag = useCallback((tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
  }, []);

  // User-controlled optional tag state (starts with all optional tags active)
  const [activeOptionalTags, setActiveOptionalTags] = useState<string[]>([]);

  // Sync optional tags when pets change
  useEffect(() => {
    setActiveOptionalTags(combinedAugments.optionalTags);
  }, [combinedAugments.optionalTags]);

  // Service type — default to "Everything"
  const [serviceType, setServiceType] = useState('Everything');

  const currentOutput = useMemo(() => {
    if (selectedPets.length === 0 && customTags.length === 0) return null;
    return buildYelpURL({
      pets: selectedPets,
      serviceType,
      zip,
      activeTags: activeOptionalTags,
      disabledDefaultTags,
      customTags,
    });
  }, [selectedPets, serviceType, zip, activeOptionalTags, disabledDefaultTags, customTags]);

  const previewTags: PreviewTag[] = currentOutput?.previewTags ?? [];
  const currentUrl: string = currentOutput?.url ?? '';
  const currentLayers: QueryLayers | null = currentOutput?.layers ?? null;

  // Search history
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadSearchHistory);

  // Manual query mode
  const [manualQuery, setManualQuery] = useState('');

  // Verification
  const [showVerification, setShowVerification] = useState(false);
  const [lastSearchEntry, setLastSearchEntry] = useState<SearchHistoryEntry | null>(null);

  // Listen for user returning from Yelp (within 30 min)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const lastRedirect = sessionStorage.getItem('petbase_last_redirect');
      if (!lastRedirect) return;
      const elapsed = Date.now() - Number(lastRedirect);
      const THIRTY_MINUTES = 30 * 60 * 1000;
      if (elapsed > 0 && elapsed < THIRTY_MINUTES) {
        sessionStorage.removeItem('petbase_last_redirect');
        setShowVerification(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Actions
  const executeSearch = useCallback((svcType?: string) => {
    if (selectedPets.length === 0 && customTags.length === 0) return;
    const type = svcType ?? serviceType;
    const entry = openYelpSearch({
      pets: selectedPets,
      serviceType: type,
      manualQuery: manualQuery || undefined,
      zip,
      activeTags: activeOptionalTags,
      disabledDefaultTags,
      customTags,
    });
    setLastSearchEntry(entry);
    setHistory(loadSearchHistory());
  }, [selectedPets, serviceType, manualQuery, zip, activeOptionalTags, disabledDefaultTags, customTags]);

  const removeOptionalTag = useCallback((tag: string) => {
    setActiveOptionalTags(prev => prev.filter(t => t !== tag));
  }, []);

  const addOptionalTag = useCallback((tag: string) => {
    setActiveOptionalTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  }, []);

  return {
    // Pet selection
    pets,
    selectedPetIds,
    togglePetSelection,
    selectedPets,

    // Tags
    defaultTags: combinedAugments.defaultTags,
    optionalTags: combinedAugments.optionalTags,
    activeOptionalTags,
    previewTags,
    disabledDefaultTags,
    toggleDefaultTag,

    // Custom tags
    customTags,
    pinCustomTag,
    removeCustomTag,

    // URL output
    currentUrl,
    currentLayers,

    // Service type
    serviceType,
    setServiceType,

    // Manual mode
    manualQuery,
    setManualQuery,

    // History
    history,

    // Verification
    showVerification,
    setShowVerification,
    lastSearchEntry,

    // Actions
    executeSearch,
    removeOptionalTag,
    addOptionalTag,
  };
}
