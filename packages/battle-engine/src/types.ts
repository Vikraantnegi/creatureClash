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
