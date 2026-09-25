import { describe, expect, it } from 'vitest';
import { TYPE, type Result } from '../types.js';
import { MAX_SAFE_STAT } from '../constants.js';
import { LEVEL_XP } from './constants.js';
import {
  createCreatureProgress,
  getProgressionView,
  awardDuelXp,
  trainCreature,
  emptyTrainingAllocation,
} from './progression.js';
const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const base = () => ({
  instanceId: 'individual-1',
  speciesId: 'ashkit',
  typeId: TYPE.FIRE,
  stats: { ATTACK: 85, DEFENSE: 35, SPEED: 70, SPECIAL: 50 },
});

describe('individual specialisation', () => {
  it('derives every threshold, grants two points, and never grows stats automatically', () => {
    LEVEL_XP.forEach((xp, index) => {
      const p = unwrap(createCreatureProgress(base(), xp));
      const view = unwrap(getProgressionView(p));
      expect(view.level).toBe(index + 1);
      expect(view.unspentPoints).toBe(index * 2);
      expect(view.creature.stats).toEqual(base().stats);
      expect(view.xpToNextLevel).toBe(index === 9 ? null : LEVEL_XP[index + 1]! - xp);
      if (xp)
        expect(
          unwrap(getProgressionView(unwrap(createCreatureProgress(base(), xp - 1)))).level,
        ).toBe(index);
      view.creature.stats.ATTACK = 0;
      expect(p.base).toEqual(base());
    });
  });
  it('lets equal-level individuals develop different builds without changing bases or sharing allocations', () => {
    const p = unwrap(createCreatureProgress(base(), 630));
    const allocation = { ATTACK: 8, DEFENSE: 8, SPEED: 2, SPECIAL: 0 };
    const a = unwrap(trainCreature(p, allocation));
    const b = unwrap(trainCreature(p, { ATTACK: 0, DEFENSE: 2, SPEED: 8, SPECIAL: 8 }));
    expect(unwrap(getProgressionView(a)).creature.stats).toEqual({
      ATTACK: 93,
      DEFENSE: 43,
      SPEED: 72,
      SPECIAL: 50,
    });
    expect(unwrap(getProgressionView(b)).creature.stats).toEqual({
      ATTACK: 85,
      DEFENSE: 37,
      SPEED: 78,
      SPECIAL: 58,
    });
    allocation.ATTACK = 0;
    expect(a.allocation.ATTACK).toBe(8);
    expect(p.allocation).toEqual(emptyTrainingAllocation());
    expect(a.base).toEqual(base());
    expect(unwrap(getProgressionView(a)).unspentPoints).toBe(0);
    expect(trainCreature(a, { ATTACK: 7, DEFENSE: 8, SPEED: 3, SPECIAL: 0 }).ok).toBe(false);
  });
  it('rejects overspending, fractions, unknown categories and per-category overflow', () => {
    const p = unwrap(createCreatureProgress(base(), 30));
    for (const amount of [-1, 0.5, NaN, Infinity, 3, 9])
      expect(trainCreature(p, { ...p.allocation, ATTACK: amount }).ok).toBe(false);
    expect(createCreatureProgress(base(), 630, { ...p.allocation, EXTRA: 0 }).ok).toBe(false);
    expect(createCreatureProgress(base(), 630, {}).ok).toBe(false);
  });
  it('awards participation XP once per call without compounding training; continues lifetime XP at cap', () => {
    for (const outcome of ['win', 'loss', 'draw'] as const) {
      const p = unwrap(createCreatureProgress(base(), 20));
      const award = unwrap(awardDuelXp(p, outcome));
      expect(award.earnedXp).toBe(outcome === 'win' ? 15 : 10);
      expect(award.after.level).toBe(2);
      expect(award.after.unspentPoints).toBe(2);
      expect(p.xp).toBe(20);
    }
    const p = unwrap(
      createCreatureProgress(base(), 630, { ATTACK: 8, DEFENSE: 0, SPEED: 8, SPECIAL: 2 }),
    );
    const award = unwrap(awardDuelXp(p, 'win'));
    expect(award.after.xp).toBe(645);
    expect(award.after.level).toBe(10);
    expect(award.after.unspentPoints).toBe(0);
    expect(award.after.creature.stats).toEqual(unwrap(getProgressionView(p)).creature.stats);
  });
  it('preserves scoring headroom and rejects XP arithmetic overflow', () => {
    for (const xp of [-1, 0.5, NaN, Infinity])
      expect(createCreatureProgress(base(), xp).ok).toBe(false);
    const huge = base();
    huge.stats.ATTACK = MAX_SAFE_STAT - 7;
    expect(createCreatureProgress(huge).ok).toBe(false);
    huge.stats.ATTACK = MAX_SAFE_STAT - 8;
    const p = unwrap(
      createCreatureProgress(huge, 630, { ATTACK: 8, DEFENSE: 0, SPEED: 0, SPECIAL: 0 }),
    );
    expect(unwrap(getProgressionView(p)).creature.stats.ATTACK).toBe(MAX_SAFE_STAT);
    expect(
      awardDuelXp(unwrap(createCreatureProgress(base(), Number.MAX_SAFE_INTEGER)), 'win').ok,
    ).toBe(false);
  });
});
