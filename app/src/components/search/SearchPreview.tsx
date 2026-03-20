/**
 * SearchPreview — Editable tag list showing the exact query before Yelp redirect.
 *
 * 3 labeled sections:
 *   1. Pet Filters — Default tags as toggle chips (solid when active, dashed when disabled)
 *   2. Suggestions — Optional/enhancer tags with add/remove
 *   3. Your Terms — Custom pinned tags with pin icon + remove
 *
 * URL preview shown below as muted text.
 */

import type { PreviewTag } from '../../utils/yelpOrchestrator';

interface SearchPreviewProps {
  tags: PreviewTag[];
  url: string;
  inactiveTags: string[];
  disabledDefaultTags: string[];
  customTags: string[];
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
  onToggleDefaultTag: (tag: string) => void;
  onRemoveCustomTag: (tag: string) => void;
}

export function SearchPreview({
  tags,
  url,
  inactiveTags,
  disabledDefaultTags,
  customTags,
  onRemoveTag,
  onAddTag,
  onToggleDefaultTag,
  onRemoveCustomTag,
}: SearchPreviewProps) {
  if (tags.length === 0 && customTags.length === 0) return null;

  // Separate tags into sections
  const defaultTags = tags.filter(t => t.isDefault);
  const enhancerTags = tags.filter(t => !t.isDefault && !t.isPinned);

  return (
    <div className="space-y-4">
      {/* Section 1: Pet Filters — toggle chips */}
      {defaultTags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Pet Filters
          </h3>
          <div className="flex flex-wrap gap-2">
            {defaultTags.map(tag => {
              const isDisabled = disabledDefaultTags.includes(tag.text);
              return (
                <button
                  key={`default-${tag.text}`}
                  onClick={() => onToggleDefaultTag(tag.text)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all motion-safe:active:scale-[0.97] ${
                    isDisabled
                      ? 'border border-dashed border-outline-variant text-on-surface-variant/40 bg-transparent'
                      : 'bg-primary-container text-on-primary-container'
                  }`}
                  aria-pressed={!isDisabled}
                  aria-label={`${isDisabled ? 'Enable' : 'Disable'} filter: ${tag.text}`}
                >
                  {tag.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 2: Suggestions — optional tags */}
      {(enhancerTags.length > 0 || inactiveTags.length > 0) && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Suggestions
          </h3>
          <div className="flex flex-wrap gap-2">
            {enhancerTags.map(tag => (
              <span
                key={`enhancer-${tag.text}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-tertiary-container text-on-tertiary-container"
              >
                {tag.text}
                <button
                  onClick={() => onRemoveTag(tag.text)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  aria-label={`Remove ${tag.text}`}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            ))}
            {inactiveTags.map(tag => (
              <button
                key={`inactive-${tag}`}
                onClick={() => onAddTag(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-highest/50 text-on-surface-variant/60 hover:bg-surface-container-highest hover:text-on-surface-variant transition-colors border border-dashed border-outline-variant"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Your Terms — custom pinned tags */}
      {customTags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
            Your Terms
          </h3>
          <div className="flex flex-wrap gap-2">
            {customTags.map(tag => (
              <span
                key={`custom-${tag}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-tertiary-container text-on-tertiary-container"
              >
                <span className="material-symbols-outlined text-sm">push_pin</span>
                {tag}
                <button
                  onClick={() => onRemoveCustomTag(tag)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  aria-label={`Remove custom term: ${tag}`}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* URL preview */}
      {url && (
        <p className="text-xs text-on-surface-variant/40 truncate font-mono">
          {url}
        </p>
      )}
    </div>
  );
}
