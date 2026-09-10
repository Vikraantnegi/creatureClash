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

export {
  CATEGORY,
  TYPE,
  PLAYER,
  DUEL_STATUS,
  DUEL_WINNER,
  SUBMIT_REASON,
  DRIVER_REASON,
  POLICY_RESULT,
} from './types.js';

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
  SidePublic,
  PlayerView,
  SessionState,
  SessionView,
  SubmitAction,
  SubmitRejection,
  SubmitSuccess,
  SubmitResult,
  PolicyResult,
  Policy,
  DriverRejection,
  DriverResult,
} from './types.js';

export { DEFAULT_TYPE_CHART } from './snapshots/defaultTypeChart.js';
export { getTypeMultiplier, getEffectiveScore } from './scoring/scoring.js';
export { validateCreatureSnapshot, validateTypeChart } from './snapshots/validate.js';
export { createDuel, advanceDuel, timeoutPick } from './duel/duel.js';
export { getPlayerView } from './view/view.js';
export { createSession, getSessionView, submit } from './session/session.js';
export { greedyPolicy, randomPolicy } from './policies/policies.js';
export { runPolicyExchange } from './policies/driver.js';

export { TEAM_SIZE, RUN_LENGTH } from './encounters/constants.js';
export { RUN_PHASE } from './run/types.js';
export type { RunState, CreateRunInput, RunSelection, RunSwap } from './run/types.js';
export {
  createRun,
  selectRunCreature,
  recordRunDuel,
  swapRunCreature,
  canReplaceRunSlot,
} from './run/run.js';
export { PAIRED_PHASE } from './paired/types.js';
export type { PairedState, CreatePairedInput } from './paired/types.js';
export {
  createPairedEncounter,
  startPairedDuel,
  recordPairedDuel,
  pairedScore,
} from './paired/paired.js';

export {
  ACTIVE_ROSTER_SIZE,
  createGym,
  commitGymTeam,
  commitGymDeployment,
  recordGymDuel,
  exchangeGymCreatures,
  getGymView,
} from './gym/gym.js';
export type {
  GymState,
  GymView,
  GymPhase,
  TrainerRosters,
  GymExchange,
  CreateGymInput,
  TeamCommit,
  DeploymentCommit,
  GymExchangeAction,
  CreaturePreview,
} from './gym/types.js';
