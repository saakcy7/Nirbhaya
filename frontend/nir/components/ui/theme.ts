export const colors = {
  // Base (dark + slightly purple so pink pops)
  bg: '#0B0A10',
  card: '#141225',
  card2: '#1B1833',
  border: '#2A244D',

  // Text
  text: '#FFFFFF',
  muted: '#C9C2E5',
  muted2: '#9F95C9',

  // Core accents (pink theme)
  primary: '#FF4D8D',   // main pink (use for primary buttons)
  primary2: '#FF77A8',  // softer pink (use for highlights)
  glow: 'rgba(255, 77, 141, 0.25)',

  // Status colors (keep semantics)
  danger: '#FF2E7A',    // SOS / destructive
  success: '#22C55E',
  warning: '#F59E0B',
  safe: '#60A5FA',
};

export const TYPE_COLORS: Record<string, string> = {
  harassment: '#FF2E7A',
  stalking: '#FF5C9A',
  assault: '#E11D48',
  unsafe_area: '#F59E0B',
  poor_lighting: '#A78BFA',
};

export const RISK_COLORS: Record<string, string> = {
  high: '#FF2E7A',
  medium: '#F59E0B',
  low: '#22C55E',
  safe: '#60A5FA',
};