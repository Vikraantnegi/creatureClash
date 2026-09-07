import type { MultiplierTenths, TypeChart, TypeId } from './types.js';

/**
 * Look up the integer tenths factor for own vs opponent type.
 * Assumes a validated chart — not a Result boundary; always uses the supplied chart.
 */
export function multiplierTenths(
  chart: TypeChart,
  ownType: TypeId,
  opponentType: TypeId,
): MultiplierTenths {
  return chart[ownType][opponentType];
}

/**
 * Effective comparison score in tenths: `stat * factor`.
 * Assumes validated chart and a safe nonnegative integer `stat`.
 */
export function effectiveTenths(
  stat: number,
  chart: TypeChart,
  ownType: TypeId,
  opponentType: TypeId,
): number {
  return stat * multiplierTenths(chart, ownType, opponentType);
}
