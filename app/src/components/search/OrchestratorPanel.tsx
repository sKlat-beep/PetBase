/**
 * OrchestratorPanel — Main search UI for the Pet-Aware Yelp Orchestrator.
 *
 * Layout: Pet selector → Service quick buttons → Search Preview → Big Search button → Manual mode
 */

import { useState } from 'react';
import type { Pet } from '../../types/pet';
import type { PreviewTag, SearchHistoryEntry } from '../../utils/yelpOrchestrator';
import { SearchPreview } from './SearchPreview';
import { EXOTIC_PET_TYPES } from '../../data/breedIntelligence';

interface OrchestratorPanelProps {
  pets: Pet[];
  selectedPet: Pet | null;
  selectedPetId: string | null;
  onSelectPet: (id: string) => void;
  serviceType: string;
  onSelectService: (type: string) => void;
  previewTags: PreviewTag[];
  currentUrl: string;
  optionalTags: string[];
  activeOptionalTags: string[];
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
  manualQuery: string;
  onManualQueryChange: (q: string) => void;
  onSearch: (serviceType?: string) => void;
  history: SearchHistoryEntry[];
}

const SERVICE_BUTTONS: Array<{ type: string; icon: string; label: string }> = [
  { type: 'Vets',     icon: 'local_hospital', label: 'Vets' },
  { type: 'Groomers', icon: 'content_cut',    label: 'Groomers' },
  { type: 'Sitters',  icon: 'house',          label: 'Sitters' },
  { type: 'Walkers',  icon: 'directions_walk', label: 'Walkers' },
  { type: 'Trainers', icon: 'school',         label: 'Trainers' },
  { type: 'Stores',   icon: 'storefront',     label: 'Stores' },
  { type: 'Boarding', icon: 'hotel',          label: 'Boarding' },
  { type: 'Shelters', icon: 'favorite',       label: 'Shelters' },
];

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return 'Yesterday';
}

export function OrchestratorPanel({
  pets,
  selectedPet,
  selectedPetId,
  onSelectPet,
  serviceType,
  onSelectService,
  previewTags,
  currentUrl,
  optionalTags,
  activeOptionalTags,
  onRemoveTag,
  onAddTag,
  manualQuery,
  onManualQueryChange,
  onSearch,
  history,
}: OrchestratorPanelProps) {
  const [showManual, setShowManual] = useState(false);
  const isExotic = selectedPet && EXOTIC_PET_TYPES.has((selectedPet.type ?? '').toLowerCase());

  const inactiveTags = optionalTags.filter(t => !activeOptionalTags.includes(t));

  return (
    <div className="space-y-6">
      {/* Pet Selector — horizontal avatar scroll */}
      {pets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
            Searching for
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pets.map(pet => (
              <button
                key={pet.id}
                onClick={() => onSelectPet(pet.id)}
                className={`flex flex-col items-center gap-1.5 min-w-[72px] p-2 rounded-2xl transition-all ${
                  selectedPetId === pet.id
                    ? 'bg-primary-container/15 ring-2 ring-primary-container'
                    : 'hover:bg-surface-container-high'
                }`}
              >
                <div className={`w-12 h-12 rounded-full overflow-hidden ${
                  selectedPetId === pet.id ? 'story-ring' : 'border-2 border-outline-variant'
                }`}>
                  {pet.image ? (
                    <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant">pets</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium truncate max-w-[64px] ${
                  selectedPetId === pet.id ? 'text-primary-container' : 'text-on-surface-variant'
                }`}>
                  {pet.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No pets state */}
      {pets.length === 0 && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">pets</span>
          <p className="text-sm text-on-surface-variant">Add a pet to unlock smart search</p>
        </div>
      )}

      {/* Service Quick Buttons (2×4 grid) */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
          What do you need?
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {SERVICE_BUTTONS.map(svc => (
            <button
              key={svc.type}
              onClick={() => onSelectService(svc.type)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-h-[72px] ${
                serviceType === svc.type
                  ? 'bg-primary-container/15 border border-primary-container/30 text-primary-container'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{svc.icon}</span>
              <span className="text-xs font-medium">{svc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exotic pet warning */}
      {isExotic && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary-container/20 border border-secondary/20">
          <span className="material-symbols-outlined text-secondary">info</span>
          <p className="text-xs text-on-surface-variant">
            Exotic pet searches may return fewer results. Consider calling providers directly to confirm they treat {selectedPet?.type?.toLowerCase()}s.
          </p>
        </div>
      )}

      {/* Search Preview */}
      <SearchPreview
        tags={previewTags}
        url={currentUrl}
        inactiveTags={inactiveTags}
        onRemoveTag={onRemoveTag}
        onAddTag={onAddTag}
      />

      {/* Manual Mode Toggle */}
      <div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="text-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">
            {showManual ? 'expand_less' : 'edit'}
          </span>
          {showManual ? 'Hide manual search' : 'Type your own search'}
        </button>
        {showManual && (
          <input
            type="text"
            value={manualQuery}
            onChange={e => onManualQueryChange(e.target.value)}
            placeholder="E.g., emergency vet for large breed dog"
            className="mt-2 w-full px-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container transition-all"
          />
        )}
      </div>

      {/* Big Search Button */}
      <button
        onClick={() => onSearch()}
        disabled={!selectedPet}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-container to-tertiary text-on-primary-container font-bold text-base tracking-wide hover:opacity-90 focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
      >
        <span className="material-symbols-outlined text-xl">search</span>
        Search on Yelp
      </button>

      {/* Recent Orchestrator Searches */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
            Recent Searches
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {history.map(entry => (
              <a
                key={entry.id}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-48 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/30"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-primary-container text-lg">pets</span>
                  <span className="text-xs font-semibold text-on-surface truncate">{entry.petName}</span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">{entry.serviceType} · {entry.queryPreview}</p>
                <p className="text-xs text-on-surface-variant/40 mt-1">{relativeTime(entry.timestamp)}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
