interface PointsBadgeProps {
  level: number;
  totalPoints: number;
  levelLabel: string;
  compact?: boolean;
}

export default function PointsBadge({ level, totalPoints, levelLabel, compact }: PointsBadgeProps) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-xs font-medium text-on-primary-container"
        title={`${levelLabel} — ${totalPoints.toLocaleString()} pts`}
      >
        <span className="material-symbols-outlined text-sm">military_tech</span>
        {level}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-sm font-medium text-on-primary-container">
      <span className="material-symbols-outlined text-base">military_tech</span>
      <span>Lv {level}</span>
      <span className="text-on-primary-container/70">{totalPoints.toLocaleString()} pts</span>
    </span>
  );
}
