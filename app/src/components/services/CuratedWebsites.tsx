import type { WebsiteResult } from '../../utils/storeApi';

interface CuratedWebsitesProps {
  websites: WebsiteResult[];
  favoriteWebsites: string[];
  onToggleFavorite: (id: string) => void;
  onRecordInteraction: (id: string, name: string) => void;
}

export function CuratedWebsites({ websites, favoriteWebsites, onToggleFavorite, onRecordInteraction }: CuratedWebsitesProps) {
  const sorted = [...websites].sort((a, b) =>
    favoriteWebsites.includes(b.id) ? 1 : favoriteWebsites.includes(a.id) ? -1 : 0
  );

  return (
    <div>
      <h3 className="text-xl font-bold text-on-surface mb-4">Popular Pet Websites</h3>
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-4 snap-x">
        {sorted.map(site => (
          <div
            key={site.id}
            onClick={() => onRecordInteraction(site.id, site.name)}
            className="snap-start shrink-0 w-64 bg-surface-container-low rounded-2xl p-5 border border-outline-variant shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-start gap-4"
          >
            <div className="w-full flex justify-between items-start">
              <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center p-2 border border-outline-variant">
                <img src={site.logo} alt={site.name} className="max-w-full max-h-full object-contain" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(site.id); }}
                className="p-1.5 hover:bg-surface-container rounded-full transition text-on-surface-variant"
              >
                <span className={`material-symbols-outlined text-[20px] ${favoriteWebsites.includes(site.id) ? 'fill-1 text-error' : ''}`}>favorite</span>
              </button>
            </div>
            <div>
              <h4 className="font-bold text-on-surface">{site.name}</h4>
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{site.description}</p>
              {site.category && (
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-xs font-medium">
                  {site.category}
                </span>
              )}
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto text-sm font-medium text-primary flex items-center gap-1 hover:underline"
            >
              Visit Website <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
