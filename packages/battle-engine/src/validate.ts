import { CATEGORIES, MAX_SAFE_STAT, TYPES } from './constants.js';
import { CATEGORY, CreatureSnapshot, MULTIPLIER_TENTHS, Result, TYPE, TypeChart } from './types.js';
import {
  isObject,
  isNumber,
  isNonEmptyString,
  isTypeId,
  produceFailResult,
  isMultiplierTenths,
} from './utils.js';

export const validateCreatureSnapshot = (input: unknown): Result<CreatureSnapshot> => {
  if (!isObject(input)) {
    return produceFailResult('CreatureSnapshot must be a non-null object');
  }

  const { instanceId, speciesId, typeId, stats } = input;

  if (!isNonEmptyString(instanceId)) {
    return produceFailResult('instanceId must be a non-empty string');
  }
  if (!isNonEmptyString(speciesId)) {
    return produceFailResult('speciesId must be a non-empty string');
  }
  if (!isTypeId(typeId)) {
    return produceFailResult('typeId must be a valid TypeId');
  }
  if (!isObject(stats)) {
    return produceFailResult('stats must be a non-null object');
  }

  const nextStats = {} as Record<CATEGORY, number>;

  for (const category of CATEGORIES) {
    if (!Object.hasOwn(stats, category)) {
      return produceFailResult(`stats missing category: ${category}`);
    }

    const value = stats[category];
    if (!isNumber(value)) {
      return produceFailResult(`stats.${category} must be a finite number`);
    }
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
      return produceFailResult(`stats.${category} must be a safe integer`);
    }
    if (value < 0) {
      return produceFailResult(`stats.${category} must be non-negative`);
    }
    if (value > MAX_SAFE_STAT) {
      return produceFailResult(`stats.${category} exceeds max safe stat for x11`);
    }

    nextStats[category] = value;
  }

  return {
    ok: true,
    value: {
      instanceId,
      speciesId,
      typeId,
      stats: nextStats,
    },
  };
};

export const validateTypeChart = (input: unknown): Result<TypeChart> => {
  if (!isObject(input)) {
    return produceFailResult('TypeChart must be a non-null object');
  }

  for (const key of Object.keys(input)) {
    if (!isTypeId(key)) {
      return produceFailResult(`TypeChart has unknown attacker type: ${key}`);
    }
  }

  for (const own of TYPES) {
    if (!Object.hasOwn(input, own)) {
      return produceFailResult(`TypeChart missing attacker type: ${own}`);
    }
  }

  const chart = {} as Record<TYPE, Record<TYPE, MULTIPLIER_TENTHS>>;

  for (const own of TYPES) {
    const rowInput = input[own];
    if (!isObject(rowInput)) {
      return produceFailResult(`TypeChart row for ${own} must be a non-null object`);
    }

    for (const key of Object.keys(rowInput)) {
      if (!isTypeId(key)) {
        return produceFailResult(`TypeChart[${own}] has unknown defender type: ${key}`);
      }
    }

    const row = {} as Record<TYPE, MULTIPLIER_TENTHS>;
    for (const opp of TYPES) {
      if (!Object.hasOwn(rowInput, opp)) {
        return produceFailResult(`TypeChart[${own}] missing defender type: ${opp}`);
      }
      const cell = rowInput[opp];
      if (!isMultiplierTenths(cell)) {
        return produceFailResult(`TypeChart[${own}][${opp}] must be 9, 10, or 11`);
      }
      row[opp] = cell;
    }
    chart[own] = row;
  }

  return { ok: true, value: chart };
};
