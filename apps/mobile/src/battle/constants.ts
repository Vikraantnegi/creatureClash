import { CATEGORY } from '@creature-clash/battle-engine';

export const SELECTION_MS = 10_000;
export const COMMITMENT_MS = 400;
// Effective scores are integer tenths: 100 units form a displayed ten-point band.
export const EFFECTIVE_RANGE_WIDTH_TENTHS = 100;

export const CATEGORY_LABEL: Record<CATEGORY, string> = {
  [CATEGORY.ATTACK]: 'Attack',
  [CATEGORY.DEFENSE]: 'Defense',
  [CATEGORY.SPEED]: 'Speed',
  [CATEGORY.SPECIAL]: 'Special',
};
