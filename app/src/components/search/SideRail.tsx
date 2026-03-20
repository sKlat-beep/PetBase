/**
 * SideRail — Community reports feed + Pet Resources 2x2 grid.
 * Visible only on xl+ screens.
 */

import type { WebsiteResult } from '../../utils/storeApi';

interface SideRailTip {
  text: string;
  author: string;
  date: string;
  rating?: number;
  serviceId: string;
}

interface SideRailProps {
  recentTips: SideRailTip[];
  websiteResults: WebsiteResult[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function SideRail({ recentTips, websiteResults }: SideRailProps) {
  const topResources = websiteResults.slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Recent Community Reports */}
      <div>
        <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">campaign</span>
          Recent Community Reports
        </h3>
        {recentTips.length > 0 ? (
          <div className="space-y-3">
            {recentTips.map((tip, idx) => (
              <div
                key={idx}
                className="bg-surface-container rounded-2xl p-4 border-l-4 border-primary-container"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 text-on-surface flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(tip.author)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-on-surface">{tip.author}</span>
                      <span className="text-xs text-on-surface-variant">{timeAgo(tip.date)}</span>
                    </div>
                    {tip.rating && tip.rating > 0 && (
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className={`text-xs ${s <= tip.rating! ? 'text-secondary' : 'text-outline-variant'}`}>
                            &#9733;
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-on-surface-variant leading-relaxed">{tip.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No community reports yet. Be the first to share a tip!</p>
        )}
      </div>

      {/* Pet Resources */}
      {topResources.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">language</span>
            Pet Resources
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {topResources.map(site => (
              <a
                key={site.id}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-high p-4 rounded-2xl hover:bg-surface-container-highest transition-colors flex flex-col items-center gap-2 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
                  <img src={site.logo} alt={site.name} className="w-6 h-6 object-contain" />
                </div>
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">{site.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
