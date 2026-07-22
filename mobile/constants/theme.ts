// Dark Terminal design tokens (spec 16). Single source of truth for the app's
// palette + type. Kept as plain values so components can mix them with twrnc
// layout utilities and plain style objects.

export const C = {
  bg: '#171c24',
  panel: '#1f2732',
  panel2: '#232b37',
  raise: '#2a3340',
  line: '#2f3947',
  line2: '#3b4655',
  text: '#eaeef4',
  dim: '#9aa5b4',
  faint: '#6a7688',
  blue: '#3d7bff',
  blueBright: '#6a9bff',
  blueDim: '#1c2c4d',
  blueSoft: 'rgba(61,123,255,0.14)',
  blueLine: 'rgba(61,123,255,0.42)',
  red: '#ff6b7a',
} as const;

// Monospace family, loaded via useFonts in app/_layout.tsx.
export const MONO = 'SpaceMono';
