import type { MultiplierTenths, TypeChart, TypeId } from './types.js';
import { TYPES } from './types.js';

/** Contract table as integer tenths (1.10→11, 1.00→10, 0.90→9). */
const CONTRACT_TENTHS: ReadonlyArray<ReadonlyArray<MultiplierTenths>> = [
  // Attacker ↓ / Defender →  Fire Water Grass Electric Rock
  /* Fire */ [10, 9, 11, 10, 10],
  /* Water */ [11, 10, 10, 9, 10],
  /* Grass */ [9, 10, 10, 10, 11],
  /* Electric */ [10, 11, 10, 10, 9],
  /* Rock */ [10, 10, 9, 11, 10],
];

function buildDefaultTypeChart(): TypeChart {
  const chart = {} as Record<TypeId, Record<TypeId, MultiplierTenths>>;
  for (let i = 0; i < TYPES.length; i += 1) {
    const own = TYPES[i]!;
    const row = {} as Record<TypeId, MultiplierTenths>;
    for (let j = 0; j < TYPES.length; j += 1) {
      const opp = TYPES[j]!;
      row[opp] = CONTRACT_TENTHS[i]![j]!;
    }
    chart[own] = Object.freeze(row);
  }
  return Object.freeze(chart);
}

/** Frozen Contract type chart — data only; scoring never closes over this. */
export const DEFAULT_TYPE_CHART: TypeChart = buildDefaultTypeChart();
