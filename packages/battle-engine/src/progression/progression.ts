import { CATEGORIES, MAX_SAFE_STAT } from '../constants.js';
import { validateCreatureSnapshot } from '../snapshots/validate.js';
import type { Result } from '../types.js';
import {
  LEVEL_XP,
  POINTS_PER_LEVEL,
  CATEGORY_TRAINING_CAP,
  PARTICIPATION_XP,
  DUEL_VICTORY_XP,
} from './constants.js';
import type {
  CreatureProgress,
  DuelXpOutcome,
  ProgressionView,
  TrainingAllocation,
  XpAward,
} from './types.js';

export const emptyTrainingAllocation = (): TrainingAllocation => ({
  ATTACK: 0,
  DEFENSE: 0,
  SPEED: 0,
  SPECIAL: 0,
});

export function createCreatureProgress(
  base: unknown,
  xp = 0,
  allocation: unknown = emptyTrainingAllocation(),
): Result<CreatureProgress> {
  const valid = validateCreatureSnapshot(base);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(xp) || xp < 0)
    return { ok: false, error: 'Creature XP must be a non-negative safe integer' };
  if (!allocation || typeof allocation !== 'object' || Array.isArray(allocation))
    return { ok: false, error: 'Invalid training allocation' };
  const input = allocation as Record<string, unknown>;
  if (Object.keys(input).some((key) => !CATEGORIES.includes(key as (typeof CATEGORIES)[number])))
    return { ok: false, error: 'Unknown training category' };
  const copy = emptyTrainingAllocation();
  for (const category of CATEGORIES) {
    const amount = input[category];
    if (
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > CATEGORY_TRAINING_CAP
    )
      return { ok: false, error: 'Training must be whole points between 0 and 8 per category' };
    if (valid.value.stats[category] > MAX_SAFE_STAT - CATEGORY_TRAINING_CAP)
      return { ok: false, error: 'Base stats leave insufficient room for training' };
    copy[category] = amount;
  }
  const level = LEVEL_XP.filter((threshold) => xp >= threshold).length;
  if (Object.values(copy).reduce((sum, value) => sum + value, 0) > (level - 1) * POINTS_PER_LEVEL)
    return { ok: false, error: 'Not enough training points' };
  delete valid.value.level;
  return { ok: true, value: { base: valid.value, xp, allocation: copy } };
}

export function getProgressionView(progress: CreatureProgress): Result<ProgressionView> {
  const valid = createCreatureProgress(progress.base, progress.xp, progress.allocation);
  if (!valid.ok) return valid;
  const { base, xp, allocation } = valid.value;
  const level = LEVEL_XP.filter((threshold) => xp >= threshold).length;
  for (const category of CATEGORIES) base.stats[category] += allocation[category];
  base.level = level;
  const nextThreshold = LEVEL_XP[level];
  return {
    ok: true,
    value: {
      creature: base,
      level,
      xp,
      allocation,
      unspentPoints:
        (level - 1) * POINTS_PER_LEVEL - Object.values(allocation).reduce((a, b) => a + b, 0),
      xpIntoLevel: xp - LEVEL_XP[level - 1]!,
      xpToNextLevel: nextThreshold === undefined ? null : nextThreshold - xp,
    },
  };
}

// The argument is the new total allocation. Existing points cannot be removed.
export function trainCreature(
  progress: CreatureProgress,
  allocation: TrainingAllocation,
): Result<CreatureProgress> {
  const current = createCreatureProgress(progress.base, progress.xp, progress.allocation);
  if (!current.ok) return current;
  const next = createCreatureProgress(progress.base, progress.xp, allocation);
  if (!next.ok) return next;
  if (
    CATEGORIES.some(
      (category) => next.value.allocation[category] < current.value.allocation[category],
    )
  )
    return { ok: false, error: 'Committed training cannot be reassigned' };
  return next;
}

// The encounter settlement layer owns exactly-once delivery.
export function awardDuelXp(progress: CreatureProgress, outcome: DuelXpOutcome): Result<XpAward> {
  if (!['win', 'loss', 'draw'].includes(outcome))
    return { ok: false, error: 'XP requires a completed duel outcome' };
  const before = getProgressionView(progress);
  if (!before.ok) return before;
  const earnedXp = PARTICIPATION_XP + (outcome === 'win' ? DUEL_VICTORY_XP : 0);
  const next = createCreatureProgress(progress.base, progress.xp + earnedXp, progress.allocation);
  if (!next.ok) return next;
  const after = getProgressionView(next.value);
  if (!after.ok) return after;
  return {
    ok: true,
    value: {
      progress: next.value,
      earnedXp,
      appliedXp: earnedXp,
      before: before.value,
      after: after.value,
    },
  };
}
