import { TYPES } from './constants.js';
import type { MULTIPLIER_TENTHS, TYPE, TypeChart } from './types.js';

/** Contract table as integer tenths (1.10→11, 1.00→10, 0.90→9). */
const CONTRACT_TENTHS: MULTIPLIER_TENTHS[][] = [
  // Attacker ↓ / Defender →  Fire Water Grass Electric Rock
  /* Fire */ [10, 9, 11, 10, 10],
  /* Water */ [11, 10, 10, 9, 10],
  /* Grass */ [9, 10, 10, 10, 11],
  /* Electric */ [10, 11, 10, 10, 9],
  /* Rock */ [10, 10, 9, 11, 10],
];

// Fire: { Fire: 10, Water: 9, Grass: 11, Electric: 10, Rock: 10 }
const buildDefaultTypeChart = (): TypeChart => {
  const chart = {} as Record<TYPE, Record<TYPE, MULTIPLIER_TENTHS>>;
  for (const own of TYPES) {
    const ownIndex = TYPES.indexOf(own);
    for (const opp of TYPES) {
      const oppIndex = TYPES.indexOf(opp);
      chart[own] = chart[own] ?? {};
      chart[own][opp] = CONTRACT_TENTHS[ownIndex]![oppIndex]!;
    }
  }
  return chart;
};

export const DEFAULT_TYPE_CHART: TypeChart = buildDefaultTypeChart();
