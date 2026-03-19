import { motion } from 'motion/react';

const COMMON_FILTERS = [
  'Emergency', '24/7', 'Vaccination', 'Surgery', 'Dental', 'Microchipping', 'Spay/Neuter', 'Exotics',
  'Bathing', 'Haircut', 'Nail Trimming', 'Deshedding', 'Mobile Grooming',
  'Boarding', 'Daycare', 'Training', 'House Sitting', 'Drop-in Visits', 'Dog Walking', 'Pet Taxi',
];

const RADIUS_OPTIONS = [
  { label: '2 mi', value: 3219 },
  { label: '5 mi', value: 8047 },
  { label: '10 mi', value: 16093 },
  { label: '25 mi', value: 40234 },
] as const;

interface ServiceFiltersProps {
  activeTab: string;
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
}

export function ServiceFilters({
  activeTab, availablePetTypes, availableBreeds, availableSizes,
  activePetTypes, activeBreeds, activeSizes, activeServiceFilters, searchRadius,
  onPetTypesChange, onBreedsChange, onSizesChange, onServiceFiltersChange, onRadiusChange,
}: ServiceFiltersProps) {
  const hasActiveFilters = activeServiceFilters.length > 0 ||
    activePetTypes.length !== availablePetTypes.length ||
    activeBreeds.length !== availableBreeds.length ||
    activeSizes.length !== availableSizes.length ||
    searchRadius !== 8047;

  const clearAll = () => {
    onPetTypesChange(availablePetTypes);
    onBreedsChange(availableBreeds);
    onSizesChange(availableSizes);
    onServiceFiltersChange([]);
    onRadiusChange(8047);
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-surface-container-low rounded-xl p-4 border border-outline-variant shadow-sm overflow-hidden">
      <div className="space-y-6">
        {/* Clear all + Radius */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-on-surface-variant">Search Radius</label>
            <select
              value={searchRadius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RADIUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-error hover:text-error/80 transition-colors">
              <span className="material-symbols-outlined text-[14px]">close</span> Clear all
            </button>
          )}
        </div>

        {/* Pet type filters */}
        <div>
          <h4 className="text-sm font-semibold text-on-surface mb-2">My Pets (Smart Filter)</h4>
          {availablePetTypes.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Add pets to your profile to enable smart filtering.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePetTypes.map(type => (
                <button
                  key={type}
                  onClick={() => onPetTypesChange(activePetTypes.includes(type) ? activePetTypes.filter(t => t !== type) : [...activePetTypes, type])}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${activePetTypes.includes(type) ? 'bg-primary-container border-primary/30 text-on-primary-container' : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  {type} Friendly
                </button>
              ))}
            </div>
          )}
          {availableBreeds.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-on-surface-variant mb-2">Breeds (used for Verified matching)</p>
              <div className="flex flex-wrap gap-1.5">
                {availableBreeds.map(breed => (
                  <button
                    key={breed}
                    onClick={() => onBreedsChange(activeBreeds.includes(breed) ? activeBreeds.filter(b => b !== breed) : [...activeBreeds, breed])}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${activeBreeds.includes(breed) ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-surface-container border-outline-variant text-on-surface-variant line-through hover:bg-surface-container-high'}`}
                  >
                    {breed}
                  </button>
                ))}
              </div>
            </div>
          )}
          {availableSizes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-on-surface-variant mb-2">Size (derived from pet weight)</p>
              <div className="flex flex-wrap gap-1.5">
                {availableSizes.map(size => (
                  <button
                    key={size}
                    onClick={() => onSizesChange(activeSizes.includes(size) ? activeSizes.filter(s => s !== size) : [...activeSizes, size])}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${activeSizes.includes(size) ? 'bg-tertiary-container border-tertiary/30 text-on-tertiary-container' : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Service capability filters */}
        {activeTab !== 'Stores' && (
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-2">Service Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {COMMON_FILTERS.map(filter => (
                <button
                  key={filter}
                  onClick={() => onServiceFiltersChange(activeServiceFilters.includes(filter) ? activeServiceFilters.filter(f => f !== filter) : [...activeServiceFilters, filter])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeServiceFilters.includes(filter) ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { RADIUS_OPTIONS };
