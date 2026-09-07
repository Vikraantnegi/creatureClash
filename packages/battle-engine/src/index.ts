export {
  CATEGORIES,
  TYPES,
  SUPPORTED_MULTIPLIER_TENTHS,
  STARTING_HP,
  MAX_NORMAL_EXCHANGES,
  CONDITIONAL_FOURTH_EXCHANGES,
  MAX_SAFE_STAT,
} from './types.js';

export type {
  CategoryId,
  Category,
  TypeId,
  MultiplierTenths,
  TypeChart,
  CreatureSnapshot,
  Result,
} from './types.js';

export { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
export { multiplierTenths, effectiveTenths } from './scoring.js';
export { validateSnapshot, validateTypeChart } from './validate.js';
