import type { MULTIPLIER_TENTHS, TYPE, TypeChart } from './types.js';

/**
 * Type-chart multiplier in integer tenths (9 / 10 / 11).
 * Assumes a validated chart — not a Result boundary; always uses the supplied chart.
 */
export const getTypeMultiplier = (
  chart: TypeChart,
  ownType: TYPE,
  opponentType: TYPE,
): MULTIPLIER_TENTHS => chart[ownType][opponentType];

/**
 * Effective comparison score in tenths: `stat * type multiplier`.
 * Assumes validated chart and a safe nonnegative integer `stat`.
 */
export const getEffectiveScore = (
  stat: number,
  chart: TypeChart,
  ownType: TYPE,
  opponentType: TYPE,
): number => stat * getTypeMultiplier(chart, ownType, opponentType);
