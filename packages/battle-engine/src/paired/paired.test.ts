import { describe, expect, it } from 'vitest';
import { advanceDuel } from '../duel/duel.js';
import { CATEGORIES } from '../constants.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import {
  DUEL_STATUS,
  DUEL_WINNER,
  TYPE,
  type CreatureSnapshot,
  type DuelState,
  type Result,
} from '../types.js';
import { createPairedEncounter, startPairedDuel, recordPairedDuel, pairedScore } from './paired.js';
import { PAIRED_PHASE } from './types.js';
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
function creature(id: string, power: number): CreatureSnapshot {
  return {
    instanceId: id,
    speciesId: id,
    typeId: TYPE.FIRE,
    stats: { ATTACK: power, DEFENSE: power, SPEED: power, SPECIAL: power },
  };
}
function prepare(powers = [30, 10, 20]) {
  return unwrap(
    createPairedEncounter({
      encounterId: 'p',
      teamA: powers.map((power, i) => creature(`a${i}`, power)),
      teamB: [20, 20, 20].map((power, i) => creature(`b${i}`, power)),
      typeChart: DEFAULT_TYPE_CHART,
    }),
  );
}
function finish(initial: DuelState) {
  let duel = initial;
  for (const pick of CATEGORIES) {
    if (duel.status === DUEL_STATUS.FINISHED) break;
    const result = advanceDuel(duel, {
      duelId: duel.duelId,
      exchangeId: duel.nextExchangeId,
      aPick: pick,
      bPick: pick,
    });
    if (!result.ok) throw new Error(result.reason);
    duel = result.value.nextState;
  }
  return duel;
}

describe('temporary paired comparison', () => {
  it('uses each pair once, resets combat, and draws at equal win counts', () => {
    let state = prepare();
    for (let index = 0; index < 3; index++) {
      state = unwrap(startPairedDuel(state, 'p', index));
      expect(state.activeDuel).toMatchObject({
        creatureA: { instanceId: `a${index}` },
        creatureB: { instanceId: `b${index}` },
        hpA: 2,
        usedA: [],
        exchangesCompleted: 0,
      });
      state = unwrap(recordPairedDuel(state, finish(state.activeDuel!)));
    }
    expect(state.phase).toBe(PAIRED_PHASE.FINISHED);
    expect(pairedScore(state)).toEqual({ a: 1, b: 1 });
    expect(state.winner).toBe(DUEL_WINNER.DRAW);
    expect(startPairedDuel(state, 'p', 3).ok).toBe(false);
  });
  it('plays the third pair even after two wins, then declares the encounter winner', () => {
    let state = prepare([30, 30, 30]);
    for (let index = 0; index < 3; index++) {
      state = unwrap(startPairedDuel(state, 'p', index));
      state = unwrap(recordPairedDuel(state, finish(state.activeDuel!)));
      if (index === 1) expect(state.phase).toBe(PAIRED_PHASE.READY);
    }
    expect(state.winner).toBe(DUEL_WINNER.A);
  });
  it('rejects stale, duplicate and unfinished completions', () => {
    const initial = prepare();
    expect(startPairedDuel(initial, 'old', 0).ok).toBe(false);
    const state = unwrap(startPairedDuel(initial, 'p', 0));
    expect(recordPairedDuel(state, state.activeDuel!).ok).toBe(false);
    const completed = finish(state.activeDuel!);
    const recorded = unwrap(recordPairedDuel(state, completed));
    expect(recordPairedDuel(recorded, completed).ok).toBe(false);
    const next = unwrap(startPairedDuel(recorded, 'p', 1));
    expect(recordPairedDuel(next, completed).ok).toBe(false);
    expect(state.completed).toHaveLength(0);
  });
});
