import { CATEGORIES, SUPPORTED_MULTIPLIER_TENTHS, TYPES } from './constants.js';
import { CATEGORY, MULTIPLIER_TENTHS, Result, TYPE } from './types.js';

export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNonEmptyString = (value: unknown): value is string =>
  isString(value) && value.length > 0;

export const produceFailResult = (error: string): Result<never> => ({ ok: false, error });

export const isTypeId = (value: unknown): value is TYPE =>
  isString(value) && (TYPES as readonly string[]).includes(value);

export const isCategory = (value: unknown): value is CATEGORY =>
  isString(value) && (CATEGORIES as readonly string[]).includes(value);

export const isMultiplierTenths = (value: unknown): value is MULTIPLIER_TENTHS =>
  isNumber(value) &&
  Number.isInteger(value) &&
  (SUPPORTED_MULTIPLIER_TENTHS as readonly number[]).includes(value);
