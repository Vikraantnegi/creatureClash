/** Category vocabulary in Attack → Defense → Speed → Special order. */
export const CATEGORIES = Object.freeze([
  'Attack',
  'Defense',
  'Speed',
  'Special',
] as const);

export type CategoryId = (typeof CATEGORIES)[number];

/** @deprecated Prefer CategoryId — kept for callers that imported Category. */
export type Category = CategoryId;

/** Type vocabulary in Contract table row order. */
export const TYPES = Object.freeze([
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Rock',
] as const);

export type TypeId = (typeof TYPES)[number];

/** Integer tenths factors: ×1.10 → 11, ×1.00 → 10, ×0.90 → 9. */
export type MultiplierTenths = 9 | 10 | 11;

export const SUPPORTED_MULTIPLIER_TENTHS = Object.freeze([9, 10, 11] as const);

export type TypeChart = Readonly<
  Record<TypeId, Readonly<Record<TypeId, MultiplierTenths>>>
>;

export type CreatureSnapshot = {
  readonly instanceId: string;
  readonly speciesId: string;
  readonly typeId: TypeId;
  readonly stats: Readonly<Record<CategoryId, number>>;
};

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** Structural duel constants — hard-fixed in v1 (not editable config). */
export const STARTING_HP = 2;
export const MAX_NORMAL_EXCHANGES = 3;
export const CONDITIONAL_FOURTH_EXCHANGES = 1;

/**
 * Max safe nonnegative integer stat so `stat * 11` remains a safe integer.
 * Documented for validators / callers producing battle-ready snapshots.
 */
export const MAX_SAFE_STAT = Math.floor(Number.MAX_SAFE_INTEGER / 11);
