import { ExternalLink, Heart } from 'lucide-react';
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
      <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Popular Pet Websites</h3>
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-4 snap-x">
        {sorted.map(site => (
          <div
            key={site.id}
            onClick={() => onRecordInteraction(site.id, site.name)}
            className="snap-start shrink-0 w-64 bg-white dark:bg-neutral-800 rounded-2xl p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-start gap-4"
          >
            <div className="w-full flex justify-between items-start">
              <div className="w-12 h-12 bg-neutral-50 dark:bg-neutral-700 rounded-xl flex items-center justify-center p-2 border border-neutral-200 dark:border-neutral-600">
                <img src={site.logo} alt={site.name} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(site.id); }}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition text-neutral-400"
              >
                <Heart className={`w-5 h-5 ${favoriteWebsites.includes(site.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{site.name}</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{site.description}</p>
              {site.category && (
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 dark:text-neutral-400 rounded text-[10px] font-medium">
                  {site.category}
                </span>
              )}
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
            >
              Visit Website <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
