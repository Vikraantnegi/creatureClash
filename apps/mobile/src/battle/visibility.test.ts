import { describe, expect, it } from 'vitest';
import {
  createDuel,
  DEFAULT_TYPE_CHART,
  getPlayerView,
  PLAYER,
  CATEGORY,
} from '@creature-clash/battle-engine';
import { creatureFor } from './fixtures';
import { CREATURES } from './types';
import { effectiveScoreRange, projectCreatureSheet } from './visibility';

function view() {
  const created = createDuel({
    duelId: 'visibility',
    creatureA: creatureFor(CREATURES.ASHKIT, 'a'),
    creatureB: creatureFor(CREATURES.BROOKFIN, 'b'),
    typeChart: DEFAULT_TYPE_CHART,
  });
  if (!created.ok) throw new Error(created.error);
  return getPlayerView(created.value, PLAYER.A);
}

describe('stat presentation', () => {
  it('uses inclusive ten-point bands at fractional and exact boundaries', () => {
    expect(effectiveScoreRange(0)).toBe('0–9.9');
    expect(effectiveScoreRange(699)).toBe('60–69.9');
    expect(effectiveScoreRange(700)).toBe('70–79.9');
    expect(effectiveScoreRange(715)).toBe('70–79.9');
    expect(effectiveScoreRange(799)).toBe('70–79.9');
    expect(effectiveScoreRange(800)).toBe('80–89.9');
  });

  it('omits raw and exact effective values from unrevealed range rows', () => {
    const source = view();
    const before = structuredClone(source);
    const sheet = projectCreatureSheet(source.opponent, 'approximate');
    expect(sheet.categories).toEqual([
      { category: CATEGORY.ATTACK, spent: false, raw: null, effective: '50–59.9' },
      { category: CATEGORY.DEFENSE, spent: false, raw: null, effective: '70–79.9' },
      { category: CATEGORY.SPEED, spent: false, raw: null, effective: '40–49.9' },
      { category: CATEGORY.SPECIAL, spent: false, raw: null, effective: '80–89.9' },
    ]);
    expect(sheet).not.toHaveProperty('creature');
    expect(sheet).not.toHaveProperty('effectiveScores');
    expect(source).toEqual(before);
    sheet.categories[0]!.effective = 'changed';
    expect(projectCreatureSheet(source.opponent, 'approximate').categories[0]!.effective).toBe(
      '50–59.9',
    );
  });

  it('keeps the exact baseline and own scores, revealing only spent opponent categories', () => {
    const source = view();
    expect(projectCreatureSheet(source.self).categories[0]).toMatchObject({
      raw: '85',
      effective: '76.5',
    });
    expect(projectCreatureSheet(source.opponent).categories[1]).toMatchObject({
      raw: '65',
      effective: '71.5',
    });
    source.opponent.usedCategories = [CATEGORY.SPECIAL];
    const rows = projectCreatureSheet(source.opponent, 'approximate').categories;
    expect(rows[3]).toMatchObject({ spent: true, raw: '80', effective: '88' });
    expect(rows.slice(0, 3).every((row) => row.raw === null)).toBe(true);
  });
});
