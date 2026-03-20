/**
 * SearchPreview — Editable tag list showing the exact query before Yelp redirect.
 *
 * Default tags (4 core filters) are locked. Optional/enhancer tags are removable.
 * URL preview shown below as muted text.
 */

import type { PreviewTag } from '../../utils/yelpOrchestrator';

interface SearchPreviewProps {
  tags: PreviewTag[];
  url: string;
  inactiveTags: string[];      // Optional tags the user has turned off
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
}

export function SearchPreview({ tags, url, inactiveTags, onRemoveTag, onAddTag }: SearchPreviewProps) {
  if (tags.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Search Preview
      </h3>

      {/* Active tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag.text}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tag.isDefault
                ? 'bg-primary-container text-on-primary-container'
                : tag.layer === 'enhancer'
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {tag.text}
            {tag.isRemovable && (
              <button
                onClick={() => onRemoveTag(tag.text)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag.text}`}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Inactive optional tags — can re-add */}
      {inactiveTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inactiveTags.map(tag => (
            <button
              key={tag}
              onClick={() => onAddTag(tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-highest/50 text-on-surface-variant/60 hover:bg-surface-container-highest hover:text-on-surface-variant transition-colors border border-dashed border-outline-variant"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              {tag}
            </button>
          ))}
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
