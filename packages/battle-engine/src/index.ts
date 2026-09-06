/** Public category vocabulary. Battle resolution will be implemented next. */
export const CATEGORIES = Object.freeze([
  'Attack',
  'Defense',
  'Speed',
  'Special',
] as const);

export type Category = (typeof CATEGORIES)[number];
