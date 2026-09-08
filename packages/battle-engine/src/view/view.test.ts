import { describe, expect, it } from 'vitest';

import { CATEGORIES, TYPES } from '../constants.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import {
  CATEGORY,
  DUEL_STATUS,
  DUEL_WINNER,
  PLAYER,
  TYPE,
  type DuelState,
  type MULTIPLIER_TENTHS,
  type PlayerView,
} from '../types.js';
import { advanceDuel, createDuel } from '../duel/duel.js';
import { getPlayerView } from './view.js';

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

const PLAYER_VIEW_KEYS = [
  'duelId',
  'viewer',
  'status',
  'winner',
  'currentExchangeId',
  'exchangesCompleted',
  'history',
  'self',
  'opponent',
] as const;

const SIDE_PUBLIC_KEYS = [
  'creature',
  'hp',
  'usedCategories',
  'availableCategories',
  'typeFactor',
  'effectiveScores',
] as const;

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
  creatureA: unknown = ashkit,
  creatureB: unknown = brookfin,
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

function assertAllowlistedView(view: PlayerView) {
  expect(Object.keys(view).sort()).toEqual([...PLAYER_VIEW_KEYS].sort());
  expect(Object.keys(view.self).sort()).toEqual([...SIDE_PUBLIC_KEYS].sort());
  expect(Object.keys(view.opponent).sort()).toEqual([...SIDE_PUBLIC_KEYS].sort());
}

describe('getPlayerView — shape and mapping', () => {
  it('uses an allowlisted output shape for both viewers', () => {
    const state = mustCreate('view-shape');
    const viewA = getPlayerView(state, PLAYER.A);
    const viewB = getPlayerView(state, PLAYER.B);

    assertAllowlistedView(viewA);
    assertAllowlistedView(viewB);
    expect(viewA.viewer).toBe(PLAYER.A);
    expect(viewB.viewer).toBe(PLAYER.B);
  });

  it('maps self and opponent correctly for both viewers', () => {
    const state = mustCreate('view-map');
    const viewA = getPlayerView(state, PLAYER.A);
    const viewB = getPlayerView(state, PLAYER.B);

    expect(viewA.self.creature.speciesId).toBe('Ashkit');
    expect(viewA.opponent.creature.speciesId).toBe('Brookfin');
    expect(viewB.self.creature.speciesId).toBe('Brookfin');
    expect(viewB.opponent.creature.speciesId).toBe('Ashkit');
    expect(viewA.self.hp).toBe(2);
    expect(viewA.opponent.hp).toBe(2);
  });
});

describe('getPlayerView — scoring and availability', () => {
  it('exposes raw stats, factors, effectives, HP, and availability', () => {
    const state = mustCreate('view-scores');
    const viewA = getPlayerView(state, PLAYER.A);

    expect(viewA.self.creature.stats[CATEGORY.ATTACK]).toBe(85);
    expect(viewA.opponent.creature.stats[CATEGORY.ATTACK]).toBe(50);
    expect(viewA.self.typeFactor).toBe(9);
    expect(viewA.opponent.typeFactor).toBe(11);
    expect(viewA.self.effectiveScores[CATEGORY.ATTACK]).toBe(765);
    expect(viewA.opponent.effectiveScores[CATEGORY.ATTACK]).toBe(550);
    expect(viewA.self.availableCategories).toEqual([...CATEGORIES]);
    expect(viewA.opponent.availableCategories).toEqual([...CATEGORIES]);
    expect(viewA.currentExchangeId).toBe(1);
  });

  it('changes view effectives when an injected chart is supplied', () => {
    const altered = cloneDefaultChart();
    altered[TYPE.FIRE] = { ...altered[TYPE.FIRE], [TYPE.WATER]: 10 };
    altered[TYPE.WATER] = { ...altered[TYPE.WATER], [TYPE.FIRE]: 10 };

    const defaultView = getPlayerView(mustCreate('view-chart-default'), PLAYER.A);
    const alteredView = getPlayerView(
      mustCreate('view-chart-altered', ashkit, brookfin, altered),
      PLAYER.A,
    );

    expect(defaultView.self.effectiveScores[CATEGORY.ATTACK]).toBe(765);
    expect(alteredView.self.effectiveScores[CATEGORY.ATTACK]).toBe(850);
    expect(alteredView.opponent.effectiveScores[CATEGORY.ATTACK]).toBe(500);
  });

  it('shrinks available categories after spent picks while sheets remain full', () => {
    let state = mustCreate('view-used');
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL).nextState;
    const viewA = getPlayerView(state, PLAYER.A);

    expect(viewA.self.usedCategories).toEqual([CATEGORY.ATTACK]);
    expect(viewA.opponent.usedCategories).toEqual([CATEGORY.SPECIAL]);
    expect(viewA.self.availableCategories).toEqual([
      CATEGORY.DEFENSE,
      CATEGORY.SPEED,
      CATEGORY.SPECIAL,
    ]);
    expect(viewA.self.creature.stats[CATEGORY.ATTACK]).toBe(85);
    expect(viewA.self.hp).toBe(1);
    expect(viewA.opponent.hp).toBe(2);
  });
});

describe('getPlayerView — history', () => {
  it('gives both viewers identical resolved history including auto-fourth', () => {
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

    let state = mustCreate('view-history', a, b);
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.ATTACK).nextState;
    state = mustAdvance(state, CATEGORY.DEFENSE, CATEGORY.DEFENSE).nextState;
    state = mustAdvance(state, CATEGORY.SPEED, CATEGORY.SPEED).nextState;

    const viewA = getPlayerView(state, PLAYER.A);
    const viewB = getPlayerView(state, PLAYER.B);

    expect(viewA.history).toEqual(viewB.history);
    expect(viewA.history).toHaveLength(4);
    expect(viewA.history[2]!.isAutomaticFourth).toBe(false);
    expect(viewA.history[3]!.isAutomaticFourth).toBe(true);
  });
});

describe('getPlayerView — finished duel', () => {
  it('nulls currentExchangeId and clears available categories', () => {
    let state = mustCreate('view-finished');
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL).nextState;
    state = mustAdvance(state, CATEGORY.SPEED, CATEGORY.DEFENSE).nextState;

    expect(state.status).toBe(DUEL_STATUS.FINISHED);
    const viewA = getPlayerView(state, PLAYER.A);
    const viewB = getPlayerView(state, PLAYER.B);

    expect(viewA.currentExchangeId).toBeNull();
    expect(viewB.currentExchangeId).toBeNull();
    expect(viewA.self.availableCategories).toEqual([]);
    expect(viewA.opponent.availableCategories).toEqual([]);
    expect(viewA.self.usedCategories).toEqual([CATEGORY.ATTACK, CATEGORY.SPEED]);
    expect(viewA.opponent.usedCategories).toEqual([CATEGORY.SPECIAL, CATEGORY.DEFENSE]);
    expect(viewA.self.creature.stats[CATEGORY.DEFENSE]).toBe(35);
    expect(viewA.winner).toBe(DUEL_WINNER.B);
  });
});

describe('getPlayerView — isolation', () => {
  it('does not let nested view mutation affect state or another view', () => {
    let state = mustCreate('view-iso');
    state = mustAdvance(state, CATEGORY.ATTACK, CATEGORY.SPECIAL).nextState;

    const viewA = getPlayerView(state, PLAYER.A);
    const viewB = getPlayerView(state, PLAYER.A);
    const originalHpA = state.history[0]!.hpA;

    viewA.self.creature.stats[CATEGORY.ATTACK] = 1;
    viewA.self.usedCategories.push(CATEGORY.SPECIAL);
    viewA.self.effectiveScores[CATEGORY.ATTACK] = 0;
    viewA.history[0]!.hpA = 999;
    viewA.history.push({
      exchangeId: 99,
      exchangeNumber: 99,
      aPick: CATEGORY.ATTACK,
      bPick: CATEGORY.ATTACK,
      aRawStat: 0,
      bRawStat: 0,
      aTypeFactor: 10,
      bTypeFactor: 10,
      aEffective: 0,
      bEffective: 0,
      exchangeWinner: 'tie',
      damageToA: 0,
      damageToB: 0,
      hpA: 2,
      hpB: 2,
      isAutomaticFourth: false,
    });

    expect(state.creatureA.stats[CATEGORY.ATTACK]).toBe(85);
    expect(state.usedA).toEqual([CATEGORY.ATTACK]);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]!.hpA).toBe(originalHpA);
    expect(viewB.self.creature.stats[CATEGORY.ATTACK]).toBe(85);
    expect(viewB.self.usedCategories).toEqual([CATEGORY.ATTACK]);
    expect(viewB.self.effectiveScores[CATEGORY.ATTACK]).toBe(765);
    expect(viewB.history).toHaveLength(1);
    expect(viewB.history[0]!.hpA).toBe(originalHpA);
  });
});
