import { CATEGORIES, MAX_NORMAL_EXCHANGES, STARTING_HP } from '../constants.js';
import { getEffectiveScore, getTypeMultiplier } from '../scoring/scoring.js';
import { DUEL_STATUS, DUEL_WINNER, PLAYER } from '../types.js';
import type {
  AdvanceDuelAction,
  AdvanceDuelResult,
  CATEGORY,
  CreateDuelInput,
  DuelState,
  ExchangeResultEvent,
  ResolvedExchange,
  Result,
  TimeoutPickResult,
} from '../types.js';
import {
  copySnapshot,
  copyTypeChart,
  isCategory,
  isNonEmptyString,
  produceFailResult,
} from '../utils.js';
import { validateCreatureSnapshot, validateTypeChart } from '../snapshots/validate.js';

const remainingCategory = (used: CATEGORY[]): CATEGORY => {
  const remaining = CATEGORIES.filter((category) => !used.includes(category));
  if (remaining.length !== 1) {
    throw new Error(`Expected exactly one remaining category, found ${remaining.length}`);
  }
  return remaining[0]!;
};

const resolveExchange = (
  state: DuelState,
  aPick: CATEGORY,
  bPick: CATEGORY,
  exchangeId: number,
  exchangeNumber: number,
  isAutomaticFourth: boolean,
): ResolvedExchange => {
  const aRawStat = state.creatureA.stats[aPick];
  const bRawStat = state.creatureB.stats[bPick];

  const aTypeFactor = getTypeMultiplier(
    state.typeChart,
    state.creatureA.typeId,
    state.creatureB.typeId,
  );
  const bTypeFactor = getTypeMultiplier(
    state.typeChart,
    state.creatureB.typeId,
    state.creatureA.typeId,
  );

  const aEffective = getEffectiveScore(
    aRawStat,
    state.typeChart,
    state.creatureA.typeId,
    state.creatureB.typeId,
  );
  const bEffective = getEffectiveScore(
    bRawStat,
    state.typeChart,
    state.creatureB.typeId,
    state.creatureA.typeId,
  );

  let hpA = state.hpA;
  let hpB = state.hpB;

  let exchangeWinner: ExchangeResultEvent['exchangeWinner'] = 'tie';
  let damageToA: 0 | 1 = 0;
  let damageToB: 0 | 1 = 0;

  if (aEffective > bEffective) {
    exchangeWinner = PLAYER.A;
    damageToB = 1;
    hpB -= 1;
  } else if (bEffective > aEffective) {
    exchangeWinner = PLAYER.B;
    damageToA = 1;
    hpA -= 1;
  }

  return {
    event: {
      exchangeId,
      exchangeNumber,
      aPick,
      bPick,
      aRawStat,
      bRawStat,
      aTypeFactor,
      bTypeFactor,
      aEffective,
      bEffective,
      exchangeWinner,
      damageToA,
      damageToB,
      hpA,
      hpB,
      isAutomaticFourth,
    },
    hpA,
    hpB,
    usedA: [...state.usedA, aPick],
    usedB: [...state.usedB, bPick],
  };
};

const finishByKo = (hpA: number, hpB: number): DUEL_WINNER => {
  if (hpA === 0 && hpB > 0) return DUEL_WINNER.B;
  if (hpB === 0 && hpA > 0) return DUEL_WINNER.A;

  throw new Error('KO finish requires exactly one side at zero HP');
};

// public functions
export const createDuel = (input: CreateDuelInput): Result<DuelState> => {
  if (!isNonEmptyString(input.duelId)) {
    return produceFailResult('duelId must be a non-empty string');
  }

  const creatureA = validateCreatureSnapshot(input.creatureA);
  if (!creatureA.ok) return creatureA;

  const creatureB = validateCreatureSnapshot(input.creatureB);
  if (!creatureB.ok) return creatureB;

  const typeChart = validateTypeChart(input.typeChart);
  if (!typeChart.ok) return typeChart;

  return {
    ok: true,
    value: {
      duelId: input.duelId,
      creatureA: copySnapshot(creatureA.value),
      creatureB: copySnapshot(creatureB.value),
      typeChart: copyTypeChart(typeChart.value),
      hpA: STARTING_HP,
      hpB: STARTING_HP,
      usedA: [],
      usedB: [],
      exchangesCompleted: 0,
      nextExchangeId: 1,
      status: DUEL_STATUS.ONGOING,
      winner: DUEL_WINNER.NONE,
      history: [],
    },
  };
};

export const timeoutPick = (state: DuelState, side: PLAYER): TimeoutPickResult => {
  if (state.status === DUEL_STATUS.FINISHED) {
    return { ok: false, error: 'duel_finished' };
  }

  const used = side === PLAYER.A ? state.usedA : state.usedB;
  for (const category of CATEGORIES) {
    if (!used.includes(category)) {
      return { ok: true, value: category };
    }
  }

  return { ok: false, error: 'no_legal_category' };
};

export const advanceDuel = (state: DuelState, action: AdvanceDuelAction): AdvanceDuelResult => {
  if (state.status === DUEL_STATUS.FINISHED) {
    return { ok: false, reason: 'duel_finished' };
  }

  if (action.duelId !== state.duelId) {
    return {
      ok: false,
      reason: 'wrong_duel',
      expected: state.duelId,
      received: action.duelId,
    };
  }

  if (action.exchangeId !== state.nextExchangeId) {
    return {
      ok: false,
      reason: 'wrong_exchange',
      expected: state.nextExchangeId,
      received: action.exchangeId,
    };
  }

  if (!isCategory(action.aPick)) {
    return { ok: false, reason: 'invalid_category', side: PLAYER.A, pick: action.aPick };
  }

  if (!isCategory(action.bPick)) {
    return { ok: false, reason: 'invalid_category', side: PLAYER.B, pick: action.bPick };
  }

  if (state.usedA.includes(action.aPick)) {
    return {
      ok: false,
      reason: 'category_already_used',
      side: PLAYER.A,
      pick: action.aPick,
    };
  }
  if (state.usedB.includes(action.bPick)) {
    return {
      ok: false,
      reason: 'category_already_used',
      side: PLAYER.B,
      pick: action.bPick,
    };
  }

  const exchangeId = state.nextExchangeId;
  const exchangeNumber = state.exchangesCompleted + 1;
  const resolved = resolveExchange(
    state,
    action.aPick,
    action.bPick,
    exchangeId,
    exchangeNumber,
    false,
  );

  const events: ExchangeResultEvent[] = [resolved.event];
  let hpA = resolved.hpA;
  let hpB = resolved.hpB;
  let usedA = resolved.usedA;
  let usedB = resolved.usedB;
  let exchangesCompleted = state.exchangesCompleted + 1;
  let nextExchangeId = exchangeId + 1;
  let status: DuelState['status'] = DUEL_STATUS.ONGOING;
  let winner: DuelState['winner'] = DUEL_WINNER.NONE;

  if (hpA === 0 || hpB === 0) {
    status = DUEL_STATUS.FINISHED;
    winner = finishByKo(hpA, hpB);
  } else if (exchangesCompleted < MAX_NORMAL_EXCHANGES) {
    // open next normal exchange
  } else if (exchangesCompleted === MAX_NORMAL_EXCHANGES && hpA !== hpB) {
    status = DUEL_STATUS.FINISHED;
    winner = hpA > hpB ? DUEL_WINNER.A : DUEL_WINNER.B;
  } else if (exchangesCompleted === MAX_NORMAL_EXCHANGES && hpA === hpB) {
    const aPick = remainingCategory(usedA);
    const bPick = remainingCategory(usedB);
    const fourth = resolveExchange(
      {
        ...state,
        hpA,
        hpB,
        usedA,
        usedB,
      },
      aPick,
      bPick,
      nextExchangeId,
      exchangesCompleted + 1,
      true,
    );
    events.push(fourth.event);
    hpA = fourth.hpA;
    hpB = fourth.hpB;
    usedA = fourth.usedA;
    usedB = fourth.usedB;
    exchangesCompleted += 1;
    nextExchangeId += 1;
    status = DUEL_STATUS.FINISHED;
    if (hpA === 0 || hpB === 0) {
      winner = finishByKo(hpA, hpB);
    } else if (hpA === hpB) {
      winner = DUEL_WINNER.DRAW;
    } else {
      winner = hpA > hpB ? DUEL_WINNER.A : DUEL_WINNER.B;
    }
  }

  const nextState: DuelState = {
    duelId: state.duelId,
    creatureA: state.creatureA,
    creatureB: state.creatureB,
    typeChart: state.typeChart,
    hpA,
    hpB,
    usedA,
    usedB,
    exchangesCompleted,
    nextExchangeId,
    status,
    winner,
    history: [...state.history, ...events],
  };

  return {
    ok: true,
    value: {
      nextState,
      events: [...events],
    },
  };
};
