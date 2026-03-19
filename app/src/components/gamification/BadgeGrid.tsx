import type { Badge } from '../../types/gamification';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface BadgeGridProps {
  earnedBadges: Badge[];
  allBadges: BadgeDefinition[];
}

export default function BadgeGrid({ earnedBadges, allBadges }: BadgeGridProps) {
  const earnedMap = new Map(earnedBadges.map((b) => [b.id, b]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {allBadges.map((def) => {
        const earned = earnedMap.get(def.id);
        return (
          <div
            key={def.id}
            className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition ${
              earned
                ? 'border-outline-variant bg-surface-container'
                : 'border-outline-variant/50 bg-surface-container-highest opacity-50'
            }`}
          >
            {/* Icon circle */}
            <div
              className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${
                earned
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{def.icon}</span>
              {!earned && (
                <span className="absolute right-2 top-2 material-symbols-outlined text-base text-on-surface-variant">
                  lock
                </span>
              )}
            </div>

            {/* Name + description */}
            <h4 className="text-sm font-medium text-on-surface">{def.name}</h4>
            <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">
              {def.description}
            </p>

            {/* Earned indicator */}
            {earned && (
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>
                  {new Date(earned.earnedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
