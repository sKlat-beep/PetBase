import type { GamificationPrefs } from '../../types/user';
import { TIER_COLORS } from './XpRing';

interface TierConfig {
  icon: string;
  label: string;
  color: string;
}

/** Maps gamification level (1–7) to crest appearance. */
const TIER_CONFIG: Record<number, TierConfig> = {
  1: { icon: 'pets',                    label: 'Puppy Parent',      color: TIER_COLORS[1] },
  2: { icon: 'explore',                 label: 'Pet Pal',           color: TIER_COLORS[2] },
  3: { icon: 'favorite',               label: 'Animal Ally',       color: TIER_COLORS[3] },
  4: { icon: 'shield',                 label: 'Critter Champion',  color: TIER_COLORS[4] },
  5: { icon: 'military_tech',           label: 'Beast Master',      color: TIER_COLORS[5] },
  6: { icon: 'workspace_premium',       label: 'Pet Whisperer',     color: TIER_COLORS[6] },
  7: { icon: 'auto_awesome',            label: 'Legendary Guardian',color: TIER_COLORS[7] },
};

interface TierCrestProps {
  level: number;
  totalPoints: number;
  prefs: GamificationPrefs;
}

/**
 * Renders the tier crest chip below the user's display name in the sidebar.
 * Three visual styles: minimal (text only), crest (icon + label), glow (icon + label + CSS glow).
 */
export function TierCrest({ level, totalPoints, prefs }: TierCrestProps) {
  if (!prefs.showCrest) return null;

  const tier = TIER_CONFIG[level] ?? TIER_CONFIG[1];
  const icon = prefs.spiritIcon || tier.icon;
  const color = TIER_COLORS[level] ?? '#F28B82';

  const label = tier.label;
  const pts = totalPoints.toLocaleString();

  if (prefs.badgeStyle === 'minimal') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
        style={{ color, backgroundColor: `${color}22` }}
        title={`${label}${prefs.showPointCount ? ` — ${pts} pts` : ''}`}
      >
        {label}
        {prefs.showPointCount && (
          <span className="opacity-70">{pts} pts</span>
        )}
      </span>
    );
  }

  const isGlow = prefs.badgeStyle === 'glow';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${isGlow ? 'crest-glow' : ''}`}
      style={{
        color,
        backgroundColor: `${color}22`,
        ['--crest-color' as string]: color,
      }}
      title={`${label}${prefs.showPointCount ? ` — ${pts} pts` : ''}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 13 }} aria-hidden="true">
        {icon}
      </span>
      {label}
      {prefs.showPointCount && (
        <span className="opacity-70">{pts} pts</span>
      )}
    </span>
  );
}

/**
 * Small spirit icon badge overlay for other users' avatars.
 * Used when publicCrestEnabled is true on a foreign profile.
 */
export function SpiritIconBadge({
  spiritIcon,
  tierColor,
  size = 16,
}: {
  spiritIcon: string;
  tierColor: string;
  size?: number;
}) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-1 ring-surface z-10"
      style={{
        width: size,
        height: size,
        backgroundColor: tierColor,
        color: '#111',
      }}
      aria-label={`Spirit: ${spiritIcon}`}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: size * 0.65 }}
        aria-hidden="true"
      >
        {spiritIcon}
      </span>
    </span>
  );
}
