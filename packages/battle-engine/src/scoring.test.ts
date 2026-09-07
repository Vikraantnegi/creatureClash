import { describe, expect, it } from 'vitest';

import { MAX_SAFE_STAT, TYPES } from './constants.js';
import { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
import { getEffectiveScore, getTypeMultiplier } from './scoring.js';
import { CATEGORY, TYPE, type MULTIPLIER_TENTHS } from './types.js';
import { validateCreatureSnapshot } from './validate.js';

/** Independent Contract expectations — not derived from DEFAULT_TYPE_CHART. */
const CONTRACT_EXPECTED_TENTHS: readonly (readonly MULTIPLIER_TENTHS[])[] = [
  // FIRE WATER GRASS ELECTRIC ROCK
  [10, 9, 11, 10, 10],
  [11, 10, 10, 9, 10],
  [9, 10, 10, 10, 11],
  [10, 11, 10, 10, 9],
  [10, 10, 9, 11, 10],
];

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

describe('getTypeMultiplierTenths — Contract 5×5', () => {
  it('matches every Contract table cell against DEFAULT_TYPE_CHART', () => {
    for (let i = 0; i < TYPES.length; i += 1) {
      for (let j = 0; j < TYPES.length; j += 1) {
        const own = TYPES[i]!;
        const opp = TYPES[j]!;
        expect(getTypeMultiplier(DEFAULT_TYPE_CHART, own, opp)).toBe(
          CONTRACT_EXPECTED_TENTHS[i]![j],
        );
      }
    }
  });
});

describe('injected TypeChart', () => {
  it('changes scores when a valid altered chart is supplied', () => {
    const altered = cloneDefaultChart();
    altered[TYPE.FIRE] = { ...altered[TYPE.FIRE], [TYPE.GRASS]: 9 };

    expect(getTypeMultiplier(DEFAULT_TYPE_CHART, TYPE.FIRE, TYPE.GRASS)).toBe(11);
    expect(getTypeMultiplier(altered, TYPE.FIRE, TYPE.GRASS)).toBe(9);
    expect(getEffectiveScore(85, DEFAULT_TYPE_CHART, TYPE.FIRE, TYPE.GRASS)).toBe(935);
    expect(getEffectiveScore(85, altered, TYPE.FIRE, TYPE.GRASS)).toBe(765);
  });
});

describe('getEffectiveScore', () => {
  it('returns exact integer tenths', () => {
    expect(getEffectiveScore(85, DEFAULT_TYPE_CHART, TYPE.FIRE, TYPE.WATER)).toBe(765);
    expect(getEffectiveScore(85, DEFAULT_TYPE_CHART, TYPE.FIRE, TYPE.FIRE)).toBe(850);
    expect(getEffectiveScore(85, DEFAULT_TYPE_CHART, TYPE.FIRE, TYPE.GRASS)).toBe(935);
    expect(getEffectiveScore(0, DEFAULT_TYPE_CHART, TYPE.ROCK, TYPE.ELECTRIC)).toBe(0);
    expect(getEffectiveScore(100, DEFAULT_TYPE_CHART, TYPE.WATER, TYPE.FIRE)).toBe(1100);
  });
});

describe('validateCreatureSnapshot', () => {
  const validInput = {
    instanceId: 'inst-1',
    speciesId: 'species-a',
    typeId: TYPE.FIRE,
    stats: {
      [CATEGORY.ATTACK]: 80,
      [CATEGORY.DEFENSE]: 70,
      [CATEGORY.SPEED]: 60,
      [CATEGORY.SPECIAL]: 90,
    },
  };

  it('accepts a valid snapshot and isolates from input mutation', () => {
    const input = {
      ...validInput,
      stats: { ...validInput.stats },
    };
    const result = validateCreatureSnapshot(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    input.instanceId = 'mutated';
    input.stats[CATEGORY.ATTACK] = 1;

    expect(result.value.instanceId).toBe('inst-1');
    expect(result.value.stats[CATEGORY.ATTACK]).toBe(80);
  });

  it('accepts zero stats and the exact max safe bound', () => {
    const zero = validateCreatureSnapshot({
      ...validInput,
      stats: {
        [CATEGORY.ATTACK]: 0,
        [CATEGORY.DEFENSE]: 0,
        [CATEGORY.SPEED]: 0,
        [CATEGORY.SPECIAL]: 0,
      },
    });
    expect(zero.ok).toBe(true);

    const atMax = validateCreatureSnapshot({
      ...validInput,
      stats: {
        [CATEGORY.ATTACK]: MAX_SAFE_STAT,
        [CATEGORY.DEFENSE]: MAX_SAFE_STAT,
        [CATEGORY.SPEED]: MAX_SAFE_STAT,
        [CATEGORY.SPECIAL]: MAX_SAFE_STAT,
      },
    });
    expect(atMax.ok).toBe(true);
  });

  it('rejects invalid ids, types, categories, and numeric edges', () => {
    expect(validateCreatureSnapshot({ ...validInput, instanceId: '' }).ok).toBe(false);
    expect(validateCreatureSnapshot({ ...validInput, speciesId: '' }).ok).toBe(false);
    expect(validateCreatureSnapshot({ ...validInput, typeId: 'Ice' }).ok).toBe(false);
    expect(validateCreatureSnapshot({ ...validInput, stats: null }).ok).toBe(false);
    expect(validateCreatureSnapshot({ ...validInput, stats: [] }).ok).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: {
          [CATEGORY.ATTACK]: 1,
          [CATEGORY.DEFENSE]: 1,
          [CATEGORY.SPEED]: 1,
        },
      }).ok,
    ).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: { ...validInput.stats, [CATEGORY.ATTACK]: -1 },
      }).ok,
    ).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: { ...validInput.stats, [CATEGORY.ATTACK]: 1.5 },
      }).ok,
    ).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: { ...validInput.stats, [CATEGORY.ATTACK]: Number.NaN },
      }).ok,
    ).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: { ...validInput.stats, [CATEGORY.ATTACK]: Number.POSITIVE_INFINITY },
      }).ok,
    ).toBe(false);
    expect(
      validateCreatureSnapshot({
        ...validInput,
        stats: { ...validInput.stats, [CATEGORY.ATTACK]: MAX_SAFE_STAT + 1 },
      }).ok,
    ).toBe(false);
  });
});
