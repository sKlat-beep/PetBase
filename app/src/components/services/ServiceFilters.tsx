import { motion } from 'motion/react';
import { X } from 'lucide-react';

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
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
      <div className="space-y-6">
        {/* Clear all + Radius */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Search Radius</label>
            <select
              value={searchRadius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {RADIUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>

        {/* Pet type filters */}
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">My Pets (Smart Filter)</h4>
          {availablePetTypes.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Add pets to your profile to enable smart filtering.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePetTypes.map(type => (
                <button
                  key={type}
                  onClick={() => onPetTypesChange(activePetTypes.includes(type) ? activePetTypes.filter(t => t !== type) : [...activePetTypes, type])}
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
                    onClick={() => onBreedsChange(activeBreeds.includes(breed) ? activeBreeds.filter(b => b !== breed) : [...activeBreeds, breed])}
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
                    onClick={() => onSizesChange(activeSizes.includes(size) ? activeSizes.filter(s => s !== size) : [...activeSizes, size])}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${activeSizes.includes(size) ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-800 dark:text-violet-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
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
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Service Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {COMMON_FILTERS.map(filter => (
                <button
                  key={filter}
                  onClick={() => onServiceFiltersChange(activeServiceFilters.includes(filter) ? activeServiceFilters.filter(f => f !== filter) : [...activeServiceFilters, filter])}
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
  );
}

export { RADIUS_OPTIONS };
