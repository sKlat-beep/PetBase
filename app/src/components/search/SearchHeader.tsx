/**
 * SearchHeader — Search bar, pet category chips, service type tabs, and filter toggle.
 */

import { PET_CATEGORIES } from '../../data/petTags';
import { ServiceFilters } from '../services/ServiceFilters';
import type { SearchFilters } from '../../utils/serviceApi';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  location: string;
  onLocationChange: (loc: string) => void;
  activeTab: SearchFilters['type'] | 'Saved';
  onTabChange: (tab: SearchFilters['type'] | 'Saved') => void;
  selectedPetCategories: string[];
  onPetCategoriesChange: (cats: string[]) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  tabs: (SearchFilters['type'] | 'Saved')[];
  onTriggerSearch: () => void;
  // Pass-through for ServiceFilters
  filterProps: {
    availablePetTypes: string[];
    availableBreeds: string[];
    availableSizes: string[];
    activePetTypes: string[];
    activeBreeds: string[];
    activeSizes: string[];
    activeServiceFilters: string[];
    searchRadius: number;
    onPetTypesChange: (types: string[]) => void;
    onBreedsChange: (breeds: string[]) => void;
    onSizesChange: (sizes: string[]) => void;
    onServiceFiltersChange: (filters: string[]) => void;
    onRadiusChange: (radius: number) => void;
  };
  // ZIP permanence
  showMakePermanent: boolean;
  onMakePermanent: () => void;
}

export function SearchHeader({
  searchQuery, onSearchQueryChange, location, onLocationChange,
  activeTab, onTabChange, selectedPetCategories, onPetCategoriesChange,
  showFilters, onToggleFilters, activeFilterCount, tabs, onTriggerSearch,
  filterProps, showMakePermanent, onMakePermanent,
}: SearchHeaderProps) {
  const toggleCategory = (catId: string) => {
    onPetCategoriesChange(
      selectedPetCategories.includes(catId)
        ? selectedPetCategories.filter(c => c !== catId)
        : [...selectedPetCategories, catId],
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar row */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <span className="material-symbols-outlined text-[20px] absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              id="search-query"
              name="q"
              type="text"
              aria-label="Search services"
              value={searchQuery}
              onChange={(e) => { onSearchQueryChange(e.target.value); onTriggerSearch(); }}
              placeholder={`Search ${activeTab === 'Saved' ? 'saved' : activeTab.toLowerCase()}...`}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>
          <div className="relative w-32 md:w-44">
            <span className="material-symbols-outlined text-[20px] absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">pin_drop</span>
            <input
              id="zip-code"
              name="zip"
              type="text"
              aria-label="ZIP code"
              value={location}
              onChange={(e) => { onLocationChange(e.target.value); onTriggerSearch(); }}
              placeholder="ZIP Code"
              maxLength={5}
              className="w-full pl-11 pr-4 py-3 rounded-full border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
          </div>
        </div>
        <div className="flex gap-2">
          {showMakePermanent && (
            <button
              onClick={onMakePermanent}
              className="px-4 py-3 text-sm font-medium bg-on-surface text-surface rounded-full hover:bg-on-surface/90 transition-colors whitespace-nowrap"
            >
              Make Permanent
            </button>
          )}
          <button
            onClick={onToggleFilters}
            className={`p-3 rounded-full border transition-colors flex items-center justify-center gap-1.5 relative ${showFilters ? 'bg-primary-container border-primary/30 text-on-primary-container' : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
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

      {/* Pet category chips */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {PET_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              selectedPetCategories.includes(cat.id)
                ? 'bg-primary-container border-primary/30 text-on-primary-container'
                : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Service type tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { onTabChange(tab); onTriggerSearch(); }}
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

      {/* Expanded filters panel */}
      {showFilters && (
        <ServiceFilters
          activeTab={activeTab}
          {...filterProps}
        />
      )}
    </div>
  );
}
