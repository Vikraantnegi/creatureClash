export enum CATEGORY {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  SPEED = 'SPEED',
  SPECIAL = 'SPECIAL',
}

export enum TYPE {
  FIRE = 'FIRE',
  WATER = 'WATER',
  GRASS = 'GRASS',
  ELECTRIC = 'ELECTRIC',
  ROCK = 'ROCK',
}

export type MULTIPLIER_TENTHS = 9 | 10 | 11;

export type TypeChart = Record<TYPE, Record<TYPE, MULTIPLIER_TENTHS>>;

export type CreatureSnapshot = {
  instanceId: string;
  speciesId: string;
  typeId: TYPE;
  stats: Record<CATEGORY, number>;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export enum PLAYER {
  A = 'A',
  B = 'B',
}

export enum DUEL_STATUS {
  ONGOING = 'ongoing',
  FINISHED = 'finished',
}

export enum DUEL_WINNER {
  NONE = 'none',
  A = 'A',
  B = 'B',
  DRAW = 'draw',
}

export type ExchangeResultEvent = {
  exchangeId: number;
  exchangeNumber: number;
  aPick: CATEGORY;
  bPick: CATEGORY;
  aRawStat: number;
  bRawStat: number;
  aTypeFactor: MULTIPLIER_TENTHS;
  bTypeFactor: MULTIPLIER_TENTHS;
  aEffective: number;
  bEffective: number;
  exchangeWinner: PLAYER | 'tie';
  damageToA: 0 | 1;
  damageToB: 0 | 1;
  hpA: number;
  hpB: number;
  isAutomaticFourth: boolean;
};

export type DuelState = {
  duelId: string;
  creatureA: CreatureSnapshot;
  creatureB: CreatureSnapshot;
  typeChart: TypeChart;
  hpA: number;
  hpB: number;
  usedA: CATEGORY[];
  usedB: CATEGORY[];
  exchangesCompleted: number;
  nextExchangeId: number;
  status: DUEL_STATUS;
  winner: DUEL_WINNER;
  history: ExchangeResultEvent[];
};

export type CreateDuelInput = {
  duelId: string;
  creatureA: unknown;
  creatureB: unknown;
  typeChart: unknown;
};

export type AdvanceDuelAction = {
  duelId: string;
  exchangeId: number;
  aPick: unknown;
  bPick: unknown;
};

export type AdvanceDuelRejection =
  | { ok: false; reason: 'duel_finished' }
  | { ok: false; reason: 'wrong_duel'; expected: string; received: string }
  | { ok: false; reason: 'wrong_exchange'; expected: number; received: number }
  | { ok: false; reason: 'invalid_category'; side: PLAYER; pick: unknown }
  | { ok: false; reason: 'category_already_used'; side: PLAYER; pick: CATEGORY };

export type AdvanceDuelSuccess = {
  ok: true;
  value: { nextState: DuelState; events: ExchangeResultEvent[] };
};

export type AdvanceDuelResult = AdvanceDuelSuccess | AdvanceDuelRejection;

export type TimeoutPickResult =
  | { ok: true; value: CATEGORY }
  | { ok: false; error: 'duel_finished' | 'no_legal_category' };

export type ResolvedExchange = {
  event: ExchangeResultEvent;
  hpA: number;
  hpB: number;
  usedA: CATEGORY[];
  usedB: CATEGORY[];
};

export type SidePublic = {
  creature: CreatureSnapshot;
  hp: number;
  usedCategories: CATEGORY[];
  availableCategories: CATEGORY[];
  typeFactor: MULTIPLIER_TENTHS;
  effectiveScores: Record<CATEGORY, number>;
};

export type PlayerView = {
  duelId: string;
  viewer: PLAYER;
  status: DUEL_STATUS;
  winner: DUEL_WINNER;
  currentExchangeId: number | null;
  exchangesCompleted: number;
  history: ExchangeResultEvent[];
  self: SidePublic;
  opponent: SidePublic;
};

export type SessionState = {
  duel: DuelState;
  pendingA: CATEGORY | null;
  pendingB: CATEGORY | null;
};

export type SessionView = {
  view: PlayerView;
  aCommitted: boolean;
  bCommitted: boolean;
};

export type SubmitAction = {
  duelId: string;
  exchangeId: number;
  side: PLAYER;
  pick: unknown;
};

export enum SUBMIT_REASON {
  DUEL_FINISHED = 'duel_finished',
  WRONG_DUEL = 'wrong_duel',
  WRONG_EXCHANGE = 'wrong_exchange',
  ALREADY_COMMITTED = 'already_committed',
  INVALID_CATEGORY = 'invalid_category',
  CATEGORY_ALREADY_USED = 'category_already_used',
  ADVANCE_REJECTED = 'advance_rejected',
}

export enum DRIVER_REASON {
  SESSION_NOT_READY = 'session_not_ready',
  POLICY_FAILED = 'policy_failed',
}

export type SubmitRejection =
  | { ok: false; reason: SUBMIT_REASON.DUEL_FINISHED }
  | {
      ok: false;
      reason: SUBMIT_REASON.WRONG_DUEL;
      expected: string;
      received: string;
    }
  | {
      ok: false;
      reason: SUBMIT_REASON.WRONG_EXCHANGE;
      expected: number;
      received: number;
    }
  | { ok: false; reason: SUBMIT_REASON.ALREADY_COMMITTED; side: PLAYER }
  | {
      ok: false;
      reason: SUBMIT_REASON.INVALID_CATEGORY;
      side: PLAYER;
      pick: unknown;
    }
  | {
      ok: false;
      reason: SUBMIT_REASON.CATEGORY_ALREADY_USED;
      side: PLAYER;
      pick: CATEGORY;
    }
  | {
      ok: false;
      reason: SUBMIT_REASON.ADVANCE_REJECTED;
      cause: AdvanceDuelRejection;
    };

export type SubmitSuccess = {
  ok: true;
  value: {
    session: SessionState;
    events: ExchangeResultEvent[];
    advanced: boolean;
  };
};

export type SubmitResult = SubmitSuccess | SubmitRejection;

export type PolicyResult = Result<CATEGORY>;

export type Policy = (view: PlayerView, rng: () => number) => PolicyResult;

export type DriverRejection =
  | { ok: false; reason: DRIVER_REASON.SESSION_NOT_READY }
  | { ok: false; reason: DRIVER_REASON.POLICY_FAILED; side: PLAYER; error: string }
  | SubmitRejection;

export type DriverResult = SubmitSuccess | DriverRejection;

export enum POLICY_RESULT {
  NO_LEGAL_CATEGORY = 'no_legal_category',
  INVALID_RNG = 'invalid_rng',
}
