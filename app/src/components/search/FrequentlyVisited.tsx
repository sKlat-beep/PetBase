/**
 * FrequentlyVisited — Horizontal scroll carousel of recent visits.
 */

import type { RecentInteraction } from '../../hooks/useRecentInteractions';

interface FrequentlyVisitedProps {
  interactions: RecentInteraction[];
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export function FrequentlyVisited({ interactions }: FrequentlyVisitedProps) {
  if (interactions.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">history</span>
        Frequently Visited
      </h3>
      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none">
        {interactions.map(item => (
          <div
            key={`${item.type}-${item.id}`}
            className="shrink-0 w-64 bg-surface-container-low rounded-2xl p-4 flex items-center gap-4 border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                  {item.type === 'store' ? 'storefront' : 'language'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-on-surface text-sm truncate">{item.name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Last visit: {timeAgo(item.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
