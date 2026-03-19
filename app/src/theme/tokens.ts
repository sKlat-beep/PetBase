/**
 * M3 Theme Token Definitions
 *
 * These mirror the CSS custom properties in index.css.
 * Use for JS-side logic that needs theme awareness (e.g., chart colors).
 * For styling, prefer Tailwind classes like `bg-surface-container-low`.
 */

export const THEMES = ['cinematic', 'emerald', 'amber', 'light'] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_META: Record<ThemeName, { label: string; description: string; isDark: boolean }> = {
  cinematic: { label: 'Cinematic Coral', description: 'Bold dark theme with coral & violet accents', isDark: true },
  emerald: { label: 'Botanical Emerald', description: 'Earthy dark theme with emerald tones', isDark: true },
  amber: { label: 'Golden Amber', description: 'Warm dark theme with golden accents', isDark: true },
  light: { label: 'Modern Gallery', description: 'Clean light theme with high contrast', isDark: false },
};

/** Primary swatch hex per theme — for preview chips in the theme selector */
export const THEME_SWATCHES: Record<ThemeName, { primary: string; secondary: string; tertiary: string; surface: string }> = {
  cinematic: { primary: '#FF6B6B', secondary: '#4ECDC4', tertiary: '#7C5CFC', surface: '#1A1A2E' },
  emerald: { primary: '#2ECC71', secondary: '#A8E6CF', tertiary: '#2ECC71', surface: '#1C1B1B' },
  amber: { primary: '#F1C40F', secondary: '#E67E22', tertiary: '#F1C40F', surface: '#1B1B1B' },
  light: { primary: '#FF6B6B', secondary: '#4ECDC4', tertiary: '#7C5CFC', surface: '#F8F9FA' },
};
