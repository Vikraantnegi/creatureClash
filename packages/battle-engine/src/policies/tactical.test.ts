import { describe, expect, it } from 'vitest';
import { CATEGORY, TYPE } from '../types.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import { tacticalPolicy, type TacticalObservation } from './tactical.js';
const { ATTACK, DEFENSE, SPEED, SPECIAL } = CATEGORY;
function observation(): TacticalObservation {
  return {
    self: {
      instanceId: 'a',
      speciesId: 'fast',
      typeId: TYPE.FIRE,
      stats: { ATTACK: 65, DEFENSE: 40, SPEED: 90, SPECIAL: 55 },
    },
    estimatedOpponent: {
      instanceId: 'b',
      speciesId: 'balanced',
      typeId: TYPE.FIRE,
      stats: { ATTACK: 60, DEFENSE: 60, SPEED: 60, SPECIAL: 60 },
    },
    hp: 2,
    opponentHp: 2,
    used: [],
    opponentUsed: [],
    exchangesCompleted: 0,
  };
}
describe('tactical policy', () => {
  it('can preserve the strongest category instead of always choosing it', () => {
    const input = observation();
    const original = structuredClone(input);
    expect(tacticalPolicy(input, DEFAULT_TYPE_CHART, () => 0)).toEqual({ ok: true, value: ATTACK });
    expect(input.self.stats[ATTACK]).toBeLessThan(input.self.stats[SPEED]);
    expect(input).toEqual(original);
  });
  it('takes a certain finishing win rather than sacrificing at one HP', () => {
    const input = observation();
    input.hp = 1;
    input.opponentHp = 1;
    input.used = [ATTACK];
    input.opponentUsed = [DEFENSE];
    input.exchangesCompleted = 1;
    expect(tacticalPolicy(input, DEFAULT_TYPE_CHART, () => 0.5)).toEqual({
      ok: true,
      value: SPEED,
    });
  });
  it('never repeats spent categories, supports exploration, and is reproducible', () => {
    const input = observation();
    input.used = [ATTACK, SPEED];
    input.opponentUsed = [ATTACK, SPEED];
    input.exchangesCompleted = 2;
    for (const r of [0, 0.5, 0.89999, 0.9, 0.99999]) {
      const first = tacticalPolicy(input, DEFAULT_TYPE_CHART, () => r);
      expect(first).toEqual(tacticalPolicy(input, DEFAULT_TYPE_CHART, () => r));
      expect(first.ok && [DEFENSE, SPECIAL].includes(first.value)).toBe(true);
    }
  });
  it('rejects invalid randomness and completed input', () => {
    for (const r of [NaN, -1, 1, Infinity])
      expect(tacticalPolicy(observation(), DEFAULT_TYPE_CHART, () => r)).toEqual({
        ok: false,
        error: 'invalid_rng',
      });
    expect(tacticalPolicy({ ...observation(), hp: 0 }, DEFAULT_TYPE_CHART, () => 0)).toEqual({
      ok: false,
      error: 'no_legal_category',
    });
  });
});
