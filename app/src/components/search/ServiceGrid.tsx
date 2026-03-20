/**
 * ServiceGrid — Main 2-col results grid with sort, loading, empty states.
 */

import { ServiceCard } from '../services/ServiceCard';
import { SearchErrorBanner } from '../services/SearchErrorBanner';
import { CuratedWebsites } from '../services/CuratedWebsites';
import { SkeletonServiceCard } from '../ui/Skeleton';
import type { ServiceResult, SearchFilters } from '../../utils/serviceApi';
import type { WebsiteResult } from '../../utils/storeApi';
import type { SortOption } from '../../hooks/useServiceSearch';

interface ServiceGridProps {
  results: ServiceResult[];
  storeResults: ServiceResult[];
  loading: boolean;
  error: { code: string; message: string } | null;
  location: string;
  activeTab: SearchFilters['type'] | 'Saved';
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  savedServiceIds: string[];
  activePetTypes: string[];
  uid?: string;
  displayName?: string;
  localTips: Record<string, { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number }[]>;
  onSelectService: (service: ServiceResult) => void;
  onSaveService: (id: string) => void;
  onAddTip: (serviceId: string, text: string, rating: number) => void;
  onUpvoteTip: (serviceId: string, tipIdx: number) => void;
  // Stores tab
  websiteResults: WebsiteResult[];
  favoriteWebsites: string[];
  onToggleFavorite: (id: string) => void;
  onRecordInteraction: (id: string, type: 'store' | 'website', name: string, image?: string) => void;
}

export function ServiceGrid({
  results, storeResults, loading, error, location, activeTab,
  sortBy, onSortChange, savedServiceIds, activePetTypes, uid, displayName,
  localTips, onSelectService, onSaveService, onAddTip, onUpvoteTip,
  websiteResults, favoriteWebsites, onToggleFavorite, onRecordInteraction,
}: ServiceGridProps) {
  // ZIP validation hint
  const zipInvalid = location && !/^\d{5}$/.test(location);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface tracking-tight">
          Local Services
          {location && /^\d{5}$/.test(location) && (
            <span className="text-on-surface-variant font-normal text-base ml-2">in {location}</span>
          )}
        </h2>
      </div>

      <SearchErrorBanner error={error} />

      {zipInvalid && (
        <div className="text-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-2">
          Enter a 5-digit ZIP code
        </div>
      )}

      {/* Sort controls */}
      {!loading && activeTab !== 'Stores' && activeTab !== 'Saved' && results.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">swap_vert</span>
          <span className="text-xs font-medium text-on-surface-variant">Sort:</span>
          {(['rating', 'reviews', 'distance'] as SortOption[]).map(opt => (
            <button
              key={opt}
              onClick={() => onSortChange(opt)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map(i => <SkeletonServiceCard key={i} />)}
          </div>
        </div>
      ) : activeTab === 'Stores' ? (
        <div className="space-y-8 tracking-tight">
          {storeResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storeResults.map(store => (
                <div key={store.id} onClick={() => { onSelectService(store); onRecordInteraction(store.id, 'store', store.name, store.image); }} className="bg-surface-container-low rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-outline-variant hover:shadow-md transition">
                  {store.image && (
                    <div className="h-40 relative">
                      <img src={store.image} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button onClick={(e) => { e.stopPropagation(); onSaveService(store.id); }}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition shadow-sm ${savedServiceIds.includes(store.id) ? 'bg-error/90 text-on-error' : 'bg-white/70 text-on-surface-variant hover:bg-error-container hover:text-error'}`}>
                        <span className={`material-symbols-outlined text-[16px] ${savedServiceIds.includes(store.id) ? 'fill-1' : ''}`}>favorite</span>
                      </button>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-lg text-on-surface">{store.name}</h4>
                      <div className="flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full text-sm font-bold shrink-0">
                        <span className="material-symbols-outlined text-[14px] fill-1">star</span>
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
          ) : !error && (
            <div className="py-10 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[24px] mx-auto mb-2 block">location_on</span>
              <p className="text-sm">No nearby pet stores found. Try a different location.</p>
            </div>
          )}

          {/* Curated websites (visible on mobile, replaced by SideRail on xl+) */}
          <div className="xl:hidden">
            <CuratedWebsites
              websites={websiteResults}
              favoriteWebsites={favoriteWebsites}
              onToggleFavorite={onToggleFavorite}
              onRecordInteraction={(id, name) => onRecordInteraction(id, 'website', name)}
            />
          </div>
        </div>
      ) : results.length === 0 ? (
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
              <p className="text-on-surface-variant">Try a different ZIP code or adjust your filters.</p>
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Sponsored section */}
          {results.filter(r => r.isSponsored).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 px-1">Sponsored</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                {results.filter(r => r.isSponsored).map(r => (
                  <button key={r.id} onClick={() => onSelectService(r)}
                    className="shrink-0 w-48 rounded-xl bg-secondary-container/20 border border-secondary-container/30 p-3 text-left hover:bg-secondary-container/30 transition-colors">
                    {r.image && <img src={r.image} alt={r.name} className="w-full h-20 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />}
                    <p className="text-xs font-semibold text-on-surface truncate">{r.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{r.address}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((result) => (
              <ServiceCard
                key={result.id}
                result={result}
                isSaved={savedServiceIds.includes(result.id)}
                activePetTypes={activePetTypes}
                uid={uid}
                localTips={localTips[result.id] || []}
                onSelect={() => onSelectService(result)}
                onSave={() => onSaveService(result.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
