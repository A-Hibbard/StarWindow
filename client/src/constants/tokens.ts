/**
 * Design tokens for the StarWindow UI.
 *
 * These are the cross-platform equivalent of CSS variables: a single source of
 * truth for the palette and shape values, referenced from `StyleSheet.create`
 * so the same values work on native (iOS/Android) and web.
 *
 * UPDATED: merged in the semantic tokens dashboard.tsx needs (background
 * levels, text hierarchy, status colors) so every screen pulls from one
 * source instead of dashboard maintaining its own local `colors` object.
 * Values below are mapped onto the *existing* login palette, not the old
 * dashboard hex codes — this is now the single source of truth.
 */

export const Palette = {
  /** Deep space background */
  background: '#000008',
  /** Brand cyan accent / glow */
  accent: '#00d4ff',
  /** Subtle accent used as the new-user button's resting border */
  accentMuted: '#0387a2',
  white: '#ffffff',

  cardBackground: '#01030a',
  cardBorder: '#0a1828',

  inputBackground: '#020810',
  inputBorder: '#0d1e30',
  inputText: '#aabbcc',
  placeholder: '#2a4055',

  signInBackground: '#00111f',

  newUserText: '#0387a2',

  tagline: '#677d92',
  divider: '#1b314f',
  dividerText: '#5c7c9d',

  // ---- added for dashboard.tsx (mapped onto the palette above) ----

  /** 4 background levels, darkest to lightest — reuses existing dark tones */
  bgVoid: '#000008',          // was background
  bgDeep: '#01030a',          // was cardBackground
  surface: '#020810',         // was inputBackground
  surfaceRaised: '#00111f',   // was signInBackground

  /** borders, visible -> subtle */
  border: '#0d1e30',          // was inputBorder
  borderSoft: '#0a1828',      // was cardBorder

  /** text hierarchy */
  textPrimary: '#ffffff',     // was white
  textSecondary: '#aabbcc',   // was inputText
  textTertiary: '#2a4055',    // was placeholder

  /** moon/glow accents, recolored from teal (#3DD9E8) onto brand cyan (#00d4ff) */
  accentMoon: '#00d4ff',      // was accent
  accentMoonDim: '#0387a2',   // was accentMuted
  accentGlow: '#66e5ff',      // brighter tint of accent, for shadows/glow

  /** status colors — no login equivalent existed, kept distinct from accent */
  accentBlue: '#5B9FFF',
  accentGreen: '#4ADEC4',
  accentRed: '#FF6B5B',
} as const;

export const Radius = {
  sm: 10,
  lg: 20,

  // added for dashboard.tsx
  md: 14,
  xl: 20,
  pill: 100,
} as const;