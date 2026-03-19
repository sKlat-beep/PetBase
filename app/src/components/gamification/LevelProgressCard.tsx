import type { GamificationState } from '../../types/gamification';

interface LevelProgressCardProps {
  state: GamificationState;
  pointsForNext: { current: number; next: number; progress: number };
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAction(action: string): string {
  return action.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LevelProgressCard({ state, pointsForNext }: LevelProgressCardProps) {
  const recentEvents = state.history.slice(0, 5);
  const pct = Math.min(100, Math.round(pointsForNext.progress * 100));

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">{state.levelLabel}</h3>
          <p className="text-sm text-on-surface-variant">
            {state.totalPoints.toLocaleString()} total points
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <span className="material-symbols-outlined">military_tech</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs text-on-surface-variant">
        <span>Level {state.level}</span>
        <span>Level {state.level + 1}</span>
      </div>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mb-4 text-xs text-on-surface-variant">
        {pointsForNext.current} / {pointsForNext.next} pts ({pct}%)
      </p>

      {/* Recent activity */}
      {recentEvents.length > 0 && (
        <>
          <h4 className="mb-2 text-sm font-medium text-on-surface">Recent Activity</h4>
          <ul className="space-y-1.5">
            {recentEvents.map((evt, i) => (
              <li
                key={`${evt.timestamp}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-on-surface-variant">{formatAction(evt.action)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-primary">+{evt.points} pts</span>
                  <span className="text-xs text-on-surface-variant">
                    {relativeTime(evt.timestamp)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
