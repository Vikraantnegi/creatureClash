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

export { DEFAULT_TYPE_CHART } from './snapshots/defaultTypeChart.js';
export { getTypeMultiplier, getEffectiveScore } from './scoring/scoring.js';
export { validateCreatureSnapshot, validateTypeChart } from './snapshots/validate.js';
export { createDuel, advanceDuel, timeoutPick } from './duel/duel.js';
