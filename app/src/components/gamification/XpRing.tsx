import type { GamificationPrefs } from '../../types/user';
import { pointsForNextLevel } from '../../lib/gamificationService';

/** Hex color per level (1–7). Used for 'tier' ring color mode and public crest. */
export const TIER_COLORS: Record<number, string> = {
  1: '#F28B82',  // Puppy Parent — coral
  2: '#FFA726',  // Pet Pal — amber
  3: '#EC407A',  // Animal Ally — rose
  4: '#26C6DA',  // Critter Champion — teal
  5: '#FFD700',  // Beast Master — gold
  6: '#CE93D8',  // Pet Whisperer — purple
  7: '#FF4081',  // Legendary Guardian — hot pink/accent
};

interface XpRingProps {
  totalPoints: number;
  level: number;
  prefs: GamificationPrefs;
  /** Avatar diameter in px. Ring is drawn outside this. Default 40. */
  size?: number;
  children: React.ReactNode;
}

/**
 * Wraps an avatar with an SVG XP progress ring.
 * If showXpRing is false, renders children at the original size with no extra DOM.
 */
export function XpRing({ totalPoints, level, prefs, size = 40, children }: XpRingProps) {
  const resolvedRingColor =
    prefs.ringColor === 'theme'
      ? 'var(--md-sys-color-primary)'
      : prefs.ringColor === 'tier'
        ? (TIER_COLORS[level] ?? '#F28B82')
        : prefs.ringColor;

  if (!prefs.showXpRing) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {children}
        {prefs.showLevelNumber && (
          <LevelDot level={level} color={resolvedRingColor} />
        )}
      </div>
    );
  }

  const { progress } = pointsForNextLevel(totalPoints);
  const strokeWidth = 3;
  const gap = 2;
  const svgSize = size + (strokeWidth + gap) * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r = cx - strokeWidth / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(progress, 1));

  const arcClass =
    prefs.ringAnimation === 'pulse'
      ? 'xp-ring-pulse'
      : prefs.ringAnimation === 'shimmer'
        ? 'xp-ring-shimmer'
        : '';

  return (
    <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
      {/* SVG ring — drawn outside the avatar */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={svgSize}
        height={svgSize}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track (unfilled arc) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          className={arcClass}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={resolvedRingColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Avatar — inset by ring + gap */}
      <div
        className="absolute rounded-full overflow-hidden bg-surface-container"
        style={{
          top: strokeWidth + gap,
          left: strokeWidth + gap,
          width: size,
          height: size,
        }}
      >
        {children}
      </div>

      {/* Level dot */}
      {prefs.showLevelNumber && (
        <LevelDot level={level} color={resolvedRingColor} />
      )}
    </div>
  );
}

function LevelDot({ level, color }: { level: number; color: string }) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full font-bold z-10 ring-1 ring-surface"
      style={{
        width: 17,
        height: 17,
        fontSize: 9,
        backgroundColor: color,
        color: '#111',
      }}
      aria-label={`Level ${level}`}
    >
      {level}
    </span>
  );
}
