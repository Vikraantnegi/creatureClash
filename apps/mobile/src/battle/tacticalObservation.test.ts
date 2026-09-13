import { describe, expect, it } from 'vitest';
import {
  advanceDuel,
  CATEGORY,
  createDuel,
  DEFAULT_TYPE_CHART,
  getPlayerView,
  PLAYER,
  tacticalPolicy,
} from '@creature-clash/battle-engine';
import {
  creatureFor,
  CREATURES,
  FIXTURES,
  speciesProfile,
  TRAIT_ESTIMATE,
} from '@creature-clash/battle-fixtures';
import { tacticalObservation } from './tacticalObservation';
import { projectCreatureSheet } from './visibility';
function duel() {
  const created = createDuel({
    duelId: 'profile',
    creatureA: creatureFor(CREATURES.VOLTIK, 'a'),
    creatureB: creatureFor(CREATURES.EMBERHORN, 'b'),
    typeChart: DEFAULT_TYPE_CHART,
  });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}
describe('species knowledge boundary', () => {
  it('keeps species clues independent of an individual’s hidden stats and reveals only played rows', () => {
    const side = getPlayerView(duel(), PLAYER.A).opponent;
    const original = projectCreatureSheet(side, 'profile');
    side.creature.stats.ATTACK = 999;
    side.effectiveScores.ATTACK = 9990;
    expect(projectCreatureSheet(side, 'profile')).toEqual(original);
    expect(original.categories.every((c) => c.raw === null && !/\d/.test(c.effective))).toBe(true);
    side.usedCategories = [CATEGORY.SPECIAL];
    expect(projectCreatureSheet(side, 'profile').categories[3]).toMatchObject({
      raw: '60',
      effective: '60',
      spent: true,
    });
    side.creature.speciesId = 'unknown';
    expect(projectCreatureSheet(side, 'profile').categories[0]?.effective).toBe('Unknown profile');
  });
  it('does not read unrevealed individual stats for a profile policy', () => {
    const view = getPlayerView(duel(), PLAYER.B);
    const before = tacticalObservation(view, 'profile');
    Object.defineProperty(view.opponent.creature, 'stats', {
      get() {
        throw new Error('Hidden stats read');
      },
    });
    Object.defineProperty(view.opponent, 'effectiveScores', {
      get() {
        throw new Error('Hidden scores read');
      },
    });
    const after = tacticalObservation(view, 'profile');
    expect(after).toEqual(before);
    expect(tacticalPolicy(after, DEFAULT_TYPE_CHART, () => 0.4)).toEqual(
      tacticalPolicy(before, DEFAULT_TYPE_CHART, () => 0.4),
    );
    after.self.stats.ATTACK = 1;
    expect(view.self.creature.stats.ATTACK).toBe(75);
  });
  it('uses revealed history from either perspective, keeping unplayed categories estimated', () => {
    const state = duel();
    const step = advanceDuel(state, {
      duelId: state.duelId,
      exchangeId: 1,
      aPick: CATEGORY.SPECIAL,
      bPick: CATEGORY.SPEED,
    });
    if (!step.ok) throw new Error(step.reason);
    const a = tacticalObservation(getPlayerView(step.value.nextState, PLAYER.A), 'profile');
    const b = tacticalObservation(getPlayerView(step.value.nextState, PLAYER.B), 'profile');
    expect(a.estimatedOpponent.stats.SPEED).toBe(30);
    expect(a.estimatedOpponent.stats.ATTACK).toBe(80);
    expect(b.estimatedOpponent.stats.SPECIAL).toBe(55);
    expect(b.estimatedOpponent.stats.SPEED).toBe(80);
    expect(
      tacticalObservation(getPlayerView(state, PLAYER.A), 'exact').estimatedOpponent.stats.ATTACK,
    ).toBe(75);
  });
  it('has truthful broad profiles for every fixture, rather than instance-derived hints', () => {
    for (const fixture of FIXTURES) {
      const profile = speciesProfile(fixture.id);
      expect(profile).not.toBeNull();
      for (const category of Object.values(CATEGORY)) {
        const trait = profile![category];
        const stat = fixture.stats[category];
        expect(
          trait === 'low' ? stat < 50 : trait === 'high' ? stat >= 70 : stat >= 50 && stat < 70,
        ).toBe(true);
        expect(TRAIT_ESTIMATE[trait]).toBeGreaterThan(0);
      }
    }
  });
});
