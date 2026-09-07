import { describe, expect, it } from 'vitest';

import { DEFAULT_TYPE_CHART } from './defaultTypeChart.js';
import { effectiveTenths, multiplierTenths } from './scoring.js';
import {
  MAX_SAFE_STAT,
  TYPES,
  type MultiplierTenths,
  type TypeId,
} from './types.js';
import { validateSnapshot, validateTypeChart } from './validate.js';

/** Independent Contract expectations — not derived from DEFAULT_TYPE_CHART. */
const CONTRACT_EXPECTED_TENTHS: ReadonlyArray<
  ReadonlyArray<MultiplierTenths>
> = [
  // Fire Water Grass Electric Rock
  [10, 9, 11, 10, 10],
  [11, 10, 10, 9, 10],
  [9, 10, 10, 10, 11],
  [10, 11, 10, 10, 9],
  [10, 10, 9, 11, 10],
];

type MutableTypeChart = {
  -readonly [K in TypeId]: { -readonly [P in TypeId]: MultiplierTenths };
};

function cloneDefaultChart(): MutableTypeChart {
  const chart = {} as MutableTypeChart;
  for (const own of TYPES) {
    chart[own] = { ...DEFAULT_TYPE_CHART[own] };
  }
  return chart;
}

describe('multiplierTenths — Contract 5×5', () => {
  it('matches every Contract table cell against DEFAULT_TYPE_CHART', () => {
    for (let i = 0; i < TYPES.length; i += 1) {
      for (let j = 0; j < TYPES.length; j += 1) {
        const own = TYPES[i]!;
        const opp = TYPES[j]!;
        expect(multiplierTenths(DEFAULT_TYPE_CHART, own, opp)).toBe(
          CONTRACT_EXPECTED_TENTHS[i]![j],
        );
      }
    }
  });
});

describe('injected TypeChart', () => {
  it('changes scores when a valid altered chart is supplied', () => {
    const altered = cloneDefaultChart();
    // Default Fire→Grass is 11; flip to disadvantage 9.
    altered.Fire = { ...altered.Fire, Grass: 9 };

    expect(multiplierTenths(DEFAULT_TYPE_CHART, 'Fire', 'Grass')).toBe(11);
    expect(multiplierTenths(altered, 'Fire', 'Grass')).toBe(9);
    expect(effectiveTenths(85, DEFAULT_TYPE_CHART, 'Fire', 'Grass')).toBe(935);
    expect(effectiveTenths(85, altered, 'Fire', 'Grass')).toBe(765);
  });
});

describe('effectiveTenths', () => {
  it('returns exact integer tenths', () => {
    expect(effectiveTenths(85, DEFAULT_TYPE_CHART, 'Fire', 'Water')).toBe(765);
    expect(effectiveTenths(85, DEFAULT_TYPE_CHART, 'Fire', 'Fire')).toBe(850);
    expect(effectiveTenths(85, DEFAULT_TYPE_CHART, 'Fire', 'Grass')).toBe(935);
    expect(effectiveTenths(0, DEFAULT_TYPE_CHART, 'Rock', 'Electric')).toBe(0);
    expect(effectiveTenths(100, DEFAULT_TYPE_CHART, 'Water', 'Fire')).toBe(1100);
  });
});

describe('validateSnapshot', () => {
  const validInput = {
    instanceId: 'inst-1',
    speciesId: 'species-a',
    typeId: 'Fire' as const,
    stats: {
      Attack: 80,
      Defense: 70,
      Speed: 60,
      Special: 90,
    },
  };

  it('accepts a valid snapshot and isolates from input mutation', () => {
    const input = {
      ...validInput,
      stats: { ...validInput.stats },
    };
    const result = validateSnapshot(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.stats)).toBe(true);

    input.instanceId = 'mutated';
    input.stats.Attack = 1;

    expect(result.value.instanceId).toBe('inst-1');
    expect(result.value.stats.Attack).toBe(80);
  });

  it('accepts zero stats and the exact max safe bound', () => {
    const zero = validateSnapshot({
      ...validInput,
      stats: { Attack: 0, Defense: 0, Speed: 0, Special: 0 },
    });
    expect(zero.ok).toBe(true);

    const atMax = validateSnapshot({
      ...validInput,
      stats: {
        Attack: MAX_SAFE_STAT,
        Defense: MAX_SAFE_STAT,
        Speed: MAX_SAFE_STAT,
        Special: MAX_SAFE_STAT,
      },
    });
    expect(atMax.ok).toBe(true);
  });

  it('rejects invalid ids, types, categories, and numeric edges', () => {
    expect(validateSnapshot({ ...validInput, instanceId: '' }).ok).toBe(false);
    expect(validateSnapshot({ ...validInput, speciesId: '' }).ok).toBe(false);
    expect(validateSnapshot({ ...validInput, typeId: 'Ice' }).ok).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { Attack: 1, Defense: 1, Speed: 1 },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: -1 },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: 1.5 },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: Number.NaN },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: Number.POSITIVE_INFINITY },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: Number.NEGATIVE_INFINITY },
      }).ok,
    ).toBe(false);
    expect(
      validateSnapshot({
        ...validInput,
        stats: { ...validInput.stats, Attack: MAX_SAFE_STAT + 1 },
      }).ok,
    ).toBe(false);
  });
});

describe('validateTypeChart', () => {
  it('accepts DEFAULT_TYPE_CHART via structural copy', () => {
    const result = validateTypeChart(cloneDefaultChart());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.Fire.Grass).toBe(11);
  });

  it('accepts a complete non-cycle matrix of supported factors', () => {
    const allNeutral = {} as Record<TypeId, Record<TypeId, MultiplierTenths>>;
    for (const own of TYPES) {
      allNeutral[own] = {} as Record<TypeId, MultiplierTenths>;
      for (const opp of TYPES) {
        allNeutral[own][opp] = 10;
      }
    }
    expect(validateTypeChart(allNeutral).ok).toBe(true);
  });

  it('rejects incomplete matrices and unsupported factors', () => {
    const incomplete = cloneDefaultChart();
    const fireRow: Partial<Record<TypeId, MultiplierTenths>> = {
      ...incomplete.Fire,
    };
    delete fireRow.Grass;
    incomplete.Fire = fireRow as MutableTypeChart[TypeId];
    expect(validateTypeChart(incomplete).ok).toBe(false);

    const badFactor = cloneDefaultChart();
    badFactor.Fire = {
      ...badFactor.Fire,
      Grass: 12 as unknown as MultiplierTenths,
    };
    expect(validateTypeChart(badFactor).ok).toBe(false);

    expect(validateTypeChart(null).ok).toBe(false);
    expect(validateTypeChart(8).ok).toBe(false);
  });

  it('isolates validated chart from nested cell mutation', () => {
    const input = cloneDefaultChart();
    const result = validateTypeChart(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Fire)).toBe(true);

    // Mutate the nested cell — a shallow row share would fail this.
    input.Fire.Grass = 9;
    expect(result.value.Fire.Grass).toBe(11);
  });
});
