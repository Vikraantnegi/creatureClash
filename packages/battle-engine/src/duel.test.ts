import { describe, expect, it } from 'vitest';

import { CATEGORIES, TYPES } from './constants.js';
import { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
import { advanceDuel, createDuel, timeoutPick } from './duel.js';
import { CATEGORY, PLAYER, TYPE, type DuelState, type MULTIPLIER_TENTHS } from './types.js';

const ashkit = {
  instanceId: 'ashkit-1',
  speciesId: 'Ashkit',
  typeId: TYPE.FIRE,
  stats: {
    [CATEGORY.ATTACK]: 85,
    [CATEGORY.DEFENSE]: 35,
    [CATEGORY.SPEED]: 70,
    [CATEGORY.SPECIAL]: 50,
  },
};

const brookfin = {
  instanceId: 'brookfin-1',
  speciesId: 'Brookfin',
  typeId: TYPE.WATER,
  stats: {
    [CATEGORY.ATTACK]: 50,
    [CATEGORY.DEFENSE]: 65,
    [CATEGORY.SPEED]: 45,
    [CATEGORY.SPECIAL]: 80,
  },
};

const equalFire = {
  instanceId: 'equal-a',
  speciesId: 'Equal',
  typeId: TYPE.FIRE,
  stats: {
    [CATEGORY.ATTACK]: 50,
    [CATEGORY.DEFENSE]: 50,
    [CATEGORY.SPEED]: 50,
    [CATEGORY.SPECIAL]: 50,
  },
};

const equalFireB = {
  ...equalFire,
  instanceId: 'equal-b',
};

type MutableTypeChart = {
  [K in TYPE]: { [P in TYPE]: MULTIPLIER_TENTHS };
};

function cloneDefaultChart(): MutableTypeChart {
  const chart = {} as MutableTypeChart;
  for (const own of TYPES) {
    chart[own] = { ...DEFAULT_TYPE_CHART[own] };
  }
  return chart;
}

function mustCreate(
  duelId: string,
  creatureA: unknown,
  creatureB: unknown,
  typeChart: unknown = DEFAULT_TYPE_CHART,
): DuelState {
  const result = createDuel({ duelId, creatureA, creatureB, typeChart });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function mustAdvance(state: DuelState, aPick: CATEGORY, bPick: CATEGORY) {
  const result = advanceDuel(state, {
    duelId: state.duelId,
    exchangeId: state.nextExchangeId,
    aPick,
    bPick,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('createDuel', () => {
  it('initializes ongoing state and rejects bad inputs', () => {
    const state = mustCreate('duel-1', ashkit, brookfin);
    expect(state.hpA).toBe(2);
    expect(state.hpB).toBe(2);
    expect(state.usedA).toEqual([]);
    expect(state.usedB).toEqual([]);
    expect(state.nextExchangeId).toBe(1);
    expect(state.status).toBe('ongoing');
    expect(state.winner).toBe('none');

    expect(
      createDuel({
        duelId: '',
        creatureA: ashkit,
        creatureB: brookfin,
        typeChart: DEFAULT_TYPE_CHART,
      }).ok,
    ).toBe(false);
  });

  it('does not share mutable refs with caller inputs', () => {
    const chart = cloneDefaultChart();
    const creatureA = {
      ...ashkit,
      stats: { ...ashkit.stats },
    };
    const state = mustCreate('duel-iso', creatureA, brookfin, chart);

    creatureA.stats[CATEGORY.ATTACK] = 1;
    chart[TYPE.FIRE][TYPE.WATER] = 11;

    expect(state.creatureA.stats[CATEGORY.ATTACK]).toBe(85);
    expect(state.typeChart[TYPE.FIRE][TYPE.WATER]).toBe(9);
  });
});

describe('ordinary exchange resolution', () => {
  it('awards the exchange to the higher effective score and deducts one HP', () => {
    const state = mustCreate('duel-ord', ashkit, brookfin);
    const { nextState, events } = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL);

    expect(events).toHaveLength(1);
    expect(events[0]!.exchangeWinner).toBe('B');
    expect(events[0]!.aEffective).toBe(765);
    expect(events[0]!.bEffective).toBe(880);
    expect(nextState.hpA).toBe(1);
    expect(nextState.hpB).toBe(2);
    expect(nextState.usedA).toEqual([CATEGORY.ATTACK]);
    expect(nextState.usedB).toEqual([CATEGORY.SPECIAL]);
    expect(nextState.nextExchangeId).toBe(2);
  });

  it('spends both categories on an exact tie without HP loss', () => {
    const state = mustCreate('duel-tie', equalFire, equalFireB);
    const { nextState, events } = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK);

    expect(events[0]!.exchangeWinner).toBe('tie');
    expect(nextState.hpA).toBe(2);
    expect(nextState.hpB).toBe(2);
    expect(nextState.usedA).toEqual([CATEGORY.ATTACK]);
    expect(nextState.usedB).toEqual([CATEGORY.ATTACK]);
  });

  it('changes duel resolution when an injected chart is supplied', () => {
    const altered = cloneDefaultChart();
    altered[TYPE.FIRE] = { ...altered[TYPE.FIRE], [TYPE.WATER]: 10 };
    altered[TYPE.WATER] = { ...altered[TYPE.WATER], [TYPE.FIRE]: 10 };

    const defaultDuel = mustCreate('duel-chart-default', ashkit, brookfin);
    const alteredDuel = mustCreate('duel-chart-altered', ashkit, brookfin, altered);

    // Default Attack vs Special: 85*9=765 vs 80*11=880 → B
    // Altered Attack vs Special: 85*10=850 vs 80*10=800 → A
    expect(
      mustAdvance(defaultDuel, CATEGORY.ATTACK, CATEGORY.SPECIAL).events[0]!.exchangeWinner,
    ).toBe('B');
    expect(
      mustAdvance(alteredDuel, CATEGORY.ATTACK, CATEGORY.SPECIAL).events[0]!.exchangeWinner,
    ).toBe('A');
  });
});

describe('endings', () => {
  it('stops immediately on early KO and rejects further advances', () => {
    const hi = {
      instanceId: 'hi',
      speciesId: 'hi',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 90,
        [CATEGORY.DEFENSE]: 90,
        [CATEGORY.SPEED]: 90,
        [CATEGORY.SPECIAL]: 90,
      },
    };
    const lo = {
      instanceId: 'lo',
      speciesId: 'lo',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 10,
        [CATEGORY.DEFENSE]: 10,
        [CATEGORY.SPEED]: 10,
        [CATEGORY.SPECIAL]: 10,
      },
    };

    let state = mustCreate('duel-ko', hi, lo);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    expect(state.status).toBe('ongoing');
    expect(state.hpB).toBe(1);

    const finished = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE);
    expect(finished.nextState.status).toBe('finished');
    expect(finished.nextState.winner).toBe('A');
    expect(finished.nextState.hpB).toBe(0);
    expect(finished.events).toHaveLength(1);
    expect(finished.events.some((event) => event.isAutomaticFourth)).toBe(false);

    const rejected = advanceDuel(finished.nextState, {
      duelId: finished.nextState.duelId,
      exchangeId: finished.nextState.nextExchangeId,
      aPick: CATEGORY.SPEED,
      bPick: CATEGORY.SPEED,
    });
    expect(rejected).toEqual({ ok: false, reason: 'duel_finished' });
  });

  it('third-exchange KO produces no fourth exchange', () => {
    // A wins exchanges 1 and 3; exchange 2 ties → B KO on exchange 3.
    const a = {
      instanceId: 'a',
      speciesId: 'a',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 80,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 80,
        [CATEGORY.SPECIAL]: 50,
      },
    };
    const b = {
      instanceId: 'b',
      speciesId: 'b',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 40,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 40,
        [CATEGORY.SPECIAL]: 50,
      },
    };

    let state = mustCreate('duel-third-ko', a, b);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    expect(state.hpA).toBe(2);
    expect(state.hpB).toBe(1);

    const third = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED);
    expect(third.events).toHaveLength(1);
    expect(third.events[0]!.isAutomaticFourth).toBe(false);
    expect(third.nextState.status).toBe('finished');
    expect(third.nextState.winner).toBe('A');
    expect(third.nextState.hpB).toBe(0);
    expect(third.nextState.exchangesCompleted).toBe(3);
  });

  it('unequal HP after three with neither KO ends without a fourth', () => {
    // One decisive win + two ties → HP 2–1 after three.
    const a = {
      instanceId: 'a',
      speciesId: 'a',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 80,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 50,
      },
    };
    const b = {
      instanceId: 'b',
      speciesId: 'b',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 40,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 50,
      },
    };

    let state = mustCreate('duel-unequal-3', a, b);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    const third = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED);

    expect(third.events).toHaveLength(1);
    expect(third.nextState.hpA).toBe(2);
    expect(third.nextState.hpB).toBe(1);
    expect(third.nextState.status).toBe('finished');
    expect(third.nextState.winner).toBe('A');
    expect(third.events.some((event) => event.isAutomaticFourth)).toBe(false);
  });

  it('equal HP after three returns exchange three then automatic four in one call', () => {
    const a = {
      instanceId: 'a',
      speciesId: 'a',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 50,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 80,
      },
    };
    const b = {
      instanceId: 'b',
      speciesId: 'b',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 50,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 40,
      },
    };

    let state = mustCreate('duel-auto-fourth-decisive', a, b);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    const third = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED);

    expect(third.events).toHaveLength(2);
    expect(third.events[0]!.exchangeNumber).toBe(3);
    expect(third.events[0]!.isAutomaticFourth).toBe(false);
    expect(third.events[1]!.exchangeNumber).toBe(4);
    expect(third.events[1]!.isAutomaticFourth).toBe(true);
    expect(third.events[1]!.aPick).toBe(CATEGORY.SPECIAL);
    expect(third.events[1]!.bPick).toBe(CATEGORY.SPECIAL);
    expect(third.nextState.status).toBe('finished');
    expect(third.nextState.winner).toBe('A');
  });

  it('four tied comparisons produce an explicit draw', () => {
    let state = mustCreate('duel-draw', equalFire, equalFireB);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    const third = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED);

    expect(third.events).toHaveLength(2);
    expect(third.events.every((event) => event.exchangeWinner === 'tie')).toBe(true);
    expect(third.nextState.status).toBe('finished');
    expect(third.nextState.winner).toBe('draw');
    expect(third.nextState.hpA).toBe(2);
    expect(third.nextState.hpB).toBe(2);
  });
});

describe('rejections leave state unchanged', () => {
  it('rejects wrong duel, wrong exchange, used category, and finished', () => {
    const state = mustCreate('duel-rej', ashkit, brookfin);
    const snapshot = structuredClone({
      ...state,
      usedA: [...state.usedA],
      usedB: [...state.usedB],
      history: [...state.history],
    });

    expect(
      advanceDuel(state, {
        duelId: 'other',
        exchangeId: 1,
        aPick: CATEGORY.ATTACK,
        bPick: CATEGORY.ATTACK,
      }),
    ).toEqual({
      ok: false,
      reason: 'wrong_duel',
      expected: 'duel-rej',
      received: 'other',
    });

    expect(
      advanceDuel(state, {
        duelId: 'duel-rej',
        exchangeId: 99,
        aPick: CATEGORY.ATTACK,
        bPick: CATEGORY.ATTACK,
      }),
    ).toEqual({
      ok: false,
      reason: 'wrong_exchange',
      expected: 1,
      received: 99,
    });

    expect(state.usedA).toEqual(snapshot.usedA);
    expect(state.hpA).toBe(snapshot.hpA);

    const after = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL).nextState;
    expect(
      advanceDuel(after, {
        duelId: after.duelId,
        exchangeId: after.nextExchangeId,
        aPick: CATEGORY.ATTACK,
        bPick: CATEGORY.DEFENSE,
      }),
    ).toEqual({
      ok: false,
      reason: 'category_already_used',
      side: 'A',
      pick: CATEGORY.ATTACK,
    });
  });

  it('valid A pick plus invalid B pick consumes neither category', () => {
    const state = mustCreate('duel-partial', ashkit, brookfin);
    const rejected = advanceDuel(state, {
      duelId: state.duelId,
      exchangeId: state.nextExchangeId,
      aPick: CATEGORY.ATTACK,
      bPick: 'NOT_A_CATEGORY',
    });

    expect(rejected).toEqual({
      ok: false,
      reason: 'invalid_category',
      side: 'B',
      pick: 'NOT_A_CATEGORY',
    });
    expect(state.usedA).toEqual([]);
    expect(state.usedB).toEqual([]);
    expect(state.nextExchangeId).toBe(1);
  });
});

describe('timeoutPick', () => {
  it('returns the first unused category in CATEGORIES order', () => {
    let state = mustCreate('duel-timeout', ashkit, brookfin);
    expect(timeoutPick(state, PLAYER.A)).toEqual({ ok: true, value: CATEGORY.ATTACK });

    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    expect(timeoutPick(state, PLAYER.A)).toEqual({ ok: true, value: CATEGORY.DEFENSE });

    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    expect(timeoutPick(state, PLAYER.A)).toEqual({ ok: true, value: CATEGORY.SPEED });
    expect(CATEGORIES[0]).toBe(CATEGORY.ATTACK);
  });

  it('fails when the duel is finished', () => {
    let state = mustCreate('duel-timeout-fin', equalFire, equalFireB);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    state = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED).nextState;
    expect(state.status).toBe('finished');
    expect(timeoutPick(state, PLAYER.A)).toEqual({ ok: false, error: 'duel_finished' });
  });
});

describe('immutability across advances', () => {
  it('leaves earlier states and events unchanged after later advances', () => {
    const initial = mustCreate('duel-immut', ashkit, brookfin);
    const first = mustAdvance(initial, CATEGORY.ATTACK, CATEGORY.SPECIAL);
    const second = mustAdvance(first.nextState, CATEGORY.SPEED, CATEGORY.DEFENSE);

    expect(initial.hpA).toBe(2);
    expect(initial.usedA).toEqual([]);
    expect(initial.history).toEqual([]);
    expect(first.nextState.hpA).toBe(1);
    expect(first.nextState.usedA).toEqual([CATEGORY.ATTACK]);
    expect(first.events).toHaveLength(1);
    expect(second.nextState.history).toHaveLength(2);
    expect(first.nextState.history).toHaveLength(1);
  });
});

describe('engine regression — Ashkit vs Brookfin', () => {
  it('greedy loss: Attack vs Special; Speed vs Defense → Ashkit loses 0–2', () => {
    let state = mustCreate('ashkit-greedy', ashkit, brookfin);
    const first = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL);
    expect(first.events[0]!.exchangeWinner).toBe('B');
    state = first.nextState;

    const second = mustAdvance(state, CATEGORY.SPEED, CATEGORY.DEFENSE);
    expect(second.events[0]!.exchangeWinner).toBe('B');
    state = second.nextState;

    expect(state.status).toBe('finished');
    expect(state.winner).toBe('B');
    expect(state.hpA).toBe(0);
    expect(state.hpB).toBe(2);
    expect(state.exchangesCompleted).toBe(2);
  });

  it('sacrifice win: Special vs Special; Attack vs Defense; Speed vs Attack → Ashkit wins 2–1', () => {
    let state = mustCreate('ashkit-sacrifice', ashkit, brookfin);

    const first = mustAdvance(state, CATEGORY.SPECIAL, CATEGORY.SPECIAL);
    expect(first.events[0]!.aEffective).toBe(450);
    expect(first.events[0]!.bEffective).toBe(880);
    expect(first.events[0]!.exchangeWinner).toBe('B');
    state = first.nextState;

    const second = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.DEFENSE);
    expect(second.events[0]!.aEffective).toBe(765);
    expect(second.events[0]!.bEffective).toBe(715);
    expect(second.events[0]!.exchangeWinner).toBe('A');
    state = second.nextState;

    const third = mustAdvance(state, CATEGORY.SPEED, CATEGORY.ATTACK);
    expect(third.events[0]!.aEffective).toBe(630);
    expect(third.events[0]!.bEffective).toBe(550);
    expect(third.events[0]!.exchangeWinner).toBe('A');
    state = third.nextState;

    expect(state.status).toBe('finished');
    expect(state.winner).toBe('A');
    expect(state.hpA).toBe(1);
    expect(state.hpB).toBe(0);
    expect(state.exchangesCompleted).toBe(3);
  });
});
