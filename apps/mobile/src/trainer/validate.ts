import {
  ACTIVE_ROSTER_SIZE,
  PLAYERS,
  validateCreatureSnapshot,
  type TrainerRosters,
} from '@creature-clash/battle-engine';
import { TRAINER_SAVE_VERSION } from './constants';
import type { TrainerSave } from './types';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateTrainerSave(value: unknown): TrainerSave {
  if (!object(value) || value.version !== TRAINER_SAVE_VERSION)
    throw new Error('This trainer save uses an unsupported format. It has not been changed.');
  if (
    typeof value.fixtureVersion !== 'string' ||
    !value.fixtureVersion.trim() ||
    !object(value.rosters)
  )
    throw new Error('The trainer save is incomplete. It has not been changed.');

  const rosters: TrainerRosters = { A: [], B: [] };
  const ids = new Set<string>();
  for (const side of PLAYERS) {
    const input = value.rosters[side];
    if (!Array.isArray(input) || input.length !== ACTIVE_ROSTER_SIZE)
      throw new Error('The trainer save must contain six creatures for each trainer.');
    for (const item of input) {
      const result = validateCreatureSnapshot(item);
      if (!result.ok || ids.has(result.value.instanceId))
        throw new Error(
          'The trainer save contains invalid or duplicate creatures. It has not been changed.',
        );
      ids.add(result.value.instanceId);
      rosters[side].push(result.value);
    }
  }
  return { version: TRAINER_SAVE_VERSION, fixtureVersion: value.fixtureVersion, rosters };
}

export function parseTrainerSave(raw: string): TrainerSave {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('The trainer save could not be read. It has not been changed.');
  }
  return validateTrainerSave(value);
}
