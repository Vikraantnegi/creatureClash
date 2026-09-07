export {
  CATEGORIES,
  TYPES,
  SUPPORTED_MULTIPLIER_TENTHS,
  STARTING_HP,
  MAX_NORMAL_EXCHANGES,
  CONDITIONAL_FOURTH_EXCHANGES,
  MAX_SAFE_STAT,
} from './constants.js';

export { CATEGORY, TYPE } from './types.js';

export type { MULTIPLIER_TENTHS, TypeChart, CreatureSnapshot, Result } from './types.js';

export { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
export { getTypeMultiplier, getEffectiveScore } from './scoring.js';
export { validateCreatureSnapshot, validateTypeChart } from './validate.js';
