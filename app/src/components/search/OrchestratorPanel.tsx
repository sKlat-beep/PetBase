/**
 * OrchestratorPanel — Main search UI for the Pet-Aware Yelp Orchestrator.
 *
 * Layout: Pet selector (2x, multi) → Service quick buttons (3×3 with Everything) →
 *         Search Preview → Custom tag pin input → Big Search button → History
 */

import { useState, useRef } from 'react';
import type { Pet } from '../../types/pet';
import type { PreviewTag, SearchHistoryEntry } from '../../utils/yelpOrchestrator';
import { SearchPreview } from './SearchPreview';
import { EXOTIC_PET_TYPES } from '../../data/breedIntelligence';

interface OrchestratorPanelProps {
  pets: Pet[];
  selectedPets: Pet[];
  selectedPetIds: string[];
  onTogglePet: (id: string) => void;
  serviceType: string;
  onSelectService: (type: string) => void;
  previewTags: PreviewTag[];
  currentUrl: string;
  optionalTags: string[];
  activeOptionalTags: string[];
  disabledDefaultTags: string[];
  onToggleDefaultTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
  customTags: string[];
  onPinCustomTag: (term: string) => void;
  onRemoveCustomTag: (tag: string) => void;
  manualQuery: string;
  onManualQueryChange: (q: string) => void;
  onSearch: (serviceType?: string) => void;
  history: SearchHistoryEntry[];
}

const SERVICE_BUTTONS: Array<{ type: string; icon: string; label: string }> = [
  { type: 'Everything', icon: 'globe',           label: 'Everything' },
  { type: 'Vets',       icon: 'local_hospital',  label: 'Vets' },
  { type: 'Groomers',   icon: 'content_cut',     label: 'Groomers' },
  { type: 'Sitters',    icon: 'house',            label: 'Sitters' },
  { type: 'Walkers',    icon: 'directions_walk',  label: 'Walkers' },
  { type: 'Trainers',   icon: 'school',           label: 'Trainers' },
  { type: 'Stores',     icon: 'storefront',       label: 'Stores' },
  { type: 'Boarding',   icon: 'hotel',            label: 'Boarding' },
  { type: 'Shelters',   icon: 'favorite',         label: 'Shelters' },
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
  selectedPets,
  selectedPetIds,
  onTogglePet,
  serviceType,
  onSelectService,
  previewTags,
  currentUrl,
  optionalTags,
  activeOptionalTags,
  disabledDefaultTags,
  onToggleDefaultTag,
  onRemoveTag,
  onAddTag,
  customTags,
  onPinCustomTag,
  onRemoveCustomTag,
  manualQuery,
  onManualQueryChange,
  onSearch,
  history,
}: OrchestratorPanelProps) {
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const isExotic = selectedPets.some(p => EXOTIC_PET_TYPES.has((p.type ?? '').toLowerCase()));

  const inactiveTags = optionalTags.filter(t => !activeOptionalTags.includes(t));

  const handlePin = () => {
    const trimmed = pinInput.trim();
    if (trimmed) {
      onPinCustomTag(trimmed);
      setPinInput('');
    }
  };

  const searchButtonText = serviceType === 'Everything'
    ? 'Search on Yelp'
    : `Find ${serviceType} on Yelp`;

  return (
    <div className="space-y-6">
      {/* Pet Selector — 2x size, multi-select with checkmark badges */}
      {pets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
            Searching for
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {pets.map(pet => {
              const isSelected = selectedPetIds.includes(pet.id);
              return (
                <button
                  key={pet.id}
                  onClick={() => onTogglePet(pet.id)}
                  className={`flex flex-col items-center gap-1.5 min-w-[144px] p-2 rounded-2xl transition-all motion-safe:active:scale-[0.97] ${
                    isSelected
                      ? 'bg-primary-container/15 ring-2 ring-primary-container'
                      : 'hover:bg-surface-container-high'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-24 h-24 rounded-full overflow-hidden ${
                      isSelected ? 'story-ring' : 'border-2 border-outline-variant'
                    }`}>
                      {pet.image ? (
                        <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-on-surface-variant">pets</span>
                        </div>
                      )}
                    </div>
                    {/* Checkmark badge */}
                    {isSelected && (
                      <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-container flex items-center justify-center shadow-sm border-2 border-background">
                        <span className="material-symbols-outlined text-on-primary-container text-base">check</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium truncate max-w-[128px] ${
                    isSelected ? 'text-primary-container' : 'text-on-surface-variant'
                  }`}>
                    {pet.name}
                  </span>
                </button>
              );
            })}
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

      {/* Service Quick Buttons (3×3 grid) */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">
          What do you need?
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_BUTTONS.map(svc => (
            <button
              key={svc.type}
              onClick={() => onSelectService(svc.type)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all motion-safe:active:scale-[0.97] min-h-[72px] ${
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
            Exotic pet searches may return fewer results. Consider calling providers directly to confirm they treat your exotic pets.
          </p>
        </div>
      )}

      {/* Search Preview */}
      <SearchPreview
        tags={previewTags}
        url={currentUrl}
        inactiveTags={inactiveTags}
        disabledDefaultTags={disabledDefaultTags}
        customTags={customTags}
        onRemoveTag={onRemoveTag}
        onAddTag={onAddTag}
        onToggleDefaultTag={onToggleDefaultTag}
        onRemoveCustomTag={onRemoveCustomTag}
      />

      {/* Custom Tag Pin Input — always visible */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
          Add custom search terms
        </h3>
        <div className="relative">
          <input
            ref={pinInputRef}
            type="text"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePin();
              }
            }}
            onBlur={() => {
              if (pinInput.trim()) handlePin();
            }}
            placeholder="E.g., emergency, fear free, holistic"
            className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-container border-0 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container transition-all"
          />
          <button
            onClick={handlePin}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant/60 hover:text-on-surface-variant"
            aria-label="Pin search term"
          >
            <span className="material-symbols-outlined text-lg">push_pin</span>
          </button>
        </div>
      </div>

      {/* Manual Override Search */}
      <div>
        <button
          onClick={() => onManualQueryChange(manualQuery ? '' : ' ')}
          className="text-xs text-on-surface-variant/60 hover:text-on-surface-variant transition-colors flex items-center gap-1 motion-safe:active:scale-[0.97] mb-2"
        >
          <span className="material-symbols-outlined text-sm">
            {manualQuery ? 'expand_less' : 'edit'}
          </span>
          {manualQuery ? 'Hide manual override' : 'Override entire search query'}
        </button>
        {manualQuery !== '' && (
          <input
            type="text"
            value={manualQuery}
            onChange={e => onManualQueryChange(e.target.value)}
            placeholder="Replaces all auto-generated tags with your query"
            className="w-full px-4 py-3 rounded-xl bg-surface-container border-0 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container transition-all"
          />
        )}
      </div>

      {/* Big Search Button */}
      <button
        onClick={() => onSearch()}
        disabled={selectedPets.length === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-container to-tertiary text-on-primary-container font-bold text-base tracking-wide hover:opacity-90 focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg motion-safe:active:scale-95"
      >
        <span className="material-symbols-outlined text-xl">search</span>
        {searchButtonText}
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
                className="flex-shrink-0 w-48 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/30 motion-safe:active:scale-[0.97]"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-primary-container text-lg">pets</span>
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {entry.petNames.join(', ')}
                  </span>
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
