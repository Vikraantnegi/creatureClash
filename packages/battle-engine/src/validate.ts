import {
  CATEGORIES,
  MAX_SAFE_STAT,
  SUPPORTED_MULTIPLIER_TENTHS,
  TYPES,
  type CategoryId,
  type CreatureSnapshot,
  type MultiplierTenths,
  type Result,
  type TypeChart,
  type TypeId,
} from './types.js';

function fail(error: string): Result<never> {
  return { ok: false, error };
}

function isTypeId(value: unknown): value is TypeId {
  return typeof value === 'string' && (TYPES as readonly string[]).includes(value);
}

function isMultiplierTenths(value: unknown): value is MultiplierTenths {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (SUPPORTED_MULTIPLIER_TENTHS as readonly number[]).includes(value)
  );
}

function deepFreezeSnapshot(snapshot: CreatureSnapshot): CreatureSnapshot {
  Object.freeze(snapshot.stats);
  return Object.freeze(snapshot);
}

function deepFreezeTypeChart(chart: TypeChart): TypeChart {
  for (const own of TYPES) {
    Object.freeze(chart[own]);
  }
  return Object.freeze(chart);
}

/**
 * Validate a creature snapshot. Never throws.
 * On success returns a fresh deep-frozen object (input isolation).
 */
export function validateSnapshot(input: unknown): Result<CreatureSnapshot> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('Snapshot must be a non-null object');
  }

  const record = input as Record<string, unknown>;
  const { instanceId, speciesId, typeId, stats } = record;

  if (typeof instanceId !== 'string' || instanceId.length === 0) {
    return fail('instanceId must be a nonempty string');
  }
  if (typeof speciesId !== 'string' || speciesId.length === 0) {
    return fail('speciesId must be a nonempty string');
  }
  if (!isTypeId(typeId)) {
    return fail('typeId must be a valid TypeId');
  }
  if (stats === null || typeof stats !== 'object' || Array.isArray(stats)) {
    return fail('stats must be a non-null object');
  }

  const statsRecord = stats as Record<string, unknown>;
  const nextStats = {} as Record<CategoryId, number>;

  for (const category of CATEGORIES) {
    if (!Object.prototype.hasOwnProperty.call(statsRecord, category)) {
      return fail(`stats missing category: ${category}`);
    }
    const value = statsRecord[category];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fail(`stats.${category} must be a finite number`);
    }
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      return fail(`stats.${category} must be a safe integer`);
    }
    if (value < 0) {
      return fail(`stats.${category} must be nonnegative`);
    }
    if (value > MAX_SAFE_STAT) {
      return fail(`stats.${category} exceeds max safe stat for ×11`);
    }
    nextStats[category] = value;
  }

  return {
    ok: true,
    value: deepFreezeSnapshot({
      instanceId,
      speciesId,
      typeId,
      stats: nextStats,
    }),
  };
}

/**
 * Validate an injectable type chart. Never throws.
 * Requires a complete 5×5 of supported factors — not a cycle structure.
 * On success returns a fresh deep-frozen nested matrix.
 */
export function validateTypeChart(input: unknown): Result<TypeChart> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('TypeChart must be a non-null object');
  }

  const root = input as Record<string, unknown>;
  const rootKeys = Object.keys(root);

  for (const key of rootKeys) {
    if (!isTypeId(key)) {
      return fail(`TypeChart has unknown attacker type: ${key}`);
    }
  }
  for (const own of TYPES) {
    if (!Object.prototype.hasOwnProperty.call(root, own)) {
      return fail(`TypeChart missing attacker type: ${own}`);
    }
  }

  const chart = {} as Record<TypeId, Record<TypeId, MultiplierTenths>>;

  for (const own of TYPES) {
    const rowInput = root[own];
    if (rowInput === null || typeof rowInput !== 'object' || Array.isArray(rowInput)) {
      return fail(`TypeChart row for ${own} must be a non-null object`);
    }
    const rowRecord = rowInput as Record<string, unknown>;
    for (const key of Object.keys(rowRecord)) {
      if (!isTypeId(key)) {
        return fail(`TypeChart[${own}] has unknown defender type: ${key}`);
      }
    }

    const row = {} as Record<TypeId, MultiplierTenths>;
    for (const opp of TYPES) {
      if (!Object.prototype.hasOwnProperty.call(rowRecord, opp)) {
        return fail(`TypeChart[${own}] missing defender type: ${opp}`);
      }
      const cell = rowRecord[opp];
      if (!isMultiplierTenths(cell)) {
        return fail(`TypeChart[${own}][${opp}] must be 9, 10, or 11`);
      }
      row[opp] = cell;
    }
    chart[own] = row;
  }

  return { ok: true, value: deepFreezeTypeChart(chart) };
}
