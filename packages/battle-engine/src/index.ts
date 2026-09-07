export {
  CATEGORIES,
  TYPES,
  SUPPORTED_MULTIPLIER_TENTHS,
  STARTING_HP,
  MAX_NORMAL_EXCHANGES,
  CONDITIONAL_FOURTH_EXCHANGES,
  MAX_SAFE_STAT,
  PLAYERS,
} from './constants.js';

export { CATEGORY, TYPE, PLAYER, DUEL_STATUS, DUEL_WINNER } from './types.js';

export type {
  MULTIPLIER_TENTHS,
  TypeChart,
  CreatureSnapshot,
  Result,
  ExchangeResultEvent,
  DuelState,
  CreateDuelInput,
  AdvanceDuelAction,
  AdvanceDuelRejection,
  AdvanceDuelSuccess,
  AdvanceDuelResult,
  TimeoutPickResult,
} from './types.js';

export { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
export { getTypeMultiplier, getEffectiveScore } from './scoring.js';
export { validateCreatureSnapshot, validateTypeChart } from './validate.js';
export { createDuel, advanceDuel, timeoutPick } from './duel.js';
