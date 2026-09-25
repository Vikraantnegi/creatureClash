import {
  ACTIVE_ROSTER_SIZE,
  PLAYERS,
  PROGRESSION_RULES_VERSION,
  PARTICIPATION_XP,
  DUEL_VICTORY_XP,
  createCreatureProgress,
  validateCreatureSnapshot,
  createGym,
  commitGymTeam,
  commitGymDeployment,
  recordGymDuel,
  type TrainerRosters,
  type GymState,
} from '@creature-clash/battle-engine';
import { createTrainerSave, refreshSnapshots, settleGym, unwrapProgress } from './progression';
import type { TrainerSave } from './types';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Rebuild the receipt through the same engine transitions used during play.
// A serialized winner/HP/participant list is never trusted on its own.
function restoreCompletedGym(input: GymState): GymState {
  let gym = unwrapProgress(
    createGym({
      encounterId: input.encounterId,
      rosters: input.rosters,
      typeChart: input.typeChart,
    }),
  );
  for (const side of PLAYERS)
    gym = unwrapProgress(
      commitGymTeam(gym, {
        encounterId: gym.encounterId,
        round: 1,
        side,
        creatures: input.selected[side]!,
      }),
    );
  for (const duel of input.completed) {
    for (const side of PLAYERS)
      gym = unwrapProgress(
        commitGymDeployment(gym, {
          encounterId: gym.encounterId,
          round: gym.completed.length + 1,
          side,
          creature: side === 'A' ? duel.creatureA.instanceId : duel.creatureB.instanceId,
        }),
      );
    gym = unwrapProgress(recordGymDuel(gym, duel));
  }
  if (gym.completed.length !== 3 || JSON.stringify(gym) !== JSON.stringify(input))
    throw new Error('Invalid pending encounter');
  return gym;
}

export function validateTrainerSave(value: unknown): TrainerSave {
  if (!object(value) || (value.version !== 1 && value.version !== 2))
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
  if (value.version === 1) return createTrainerSave(rosters, value.fixtureVersion);
  if (
    value.rulesVersion !== PROGRESSION_RULES_VERSION ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !object(value.progress) ||
    !(
      value.lastSettledEncounterId === null ||
      (typeof value.lastSettledEncounterId === 'string' && value.lastSettledEncounterId.trim())
    )
  )
    throw new Error('Invalid or unsupported progression save');
  if (Object.keys(value.progress).length !== ids.size)
    throw new Error('Invalid progression ownership');
  const progress: TrainerSave['progress'] = {};
  for (const id of ids) {
    const p = value.progress[id];
    if (!object(p) || typeof p.xp !== 'number' || !object(p.allocation))
      throw new Error('Missing creature progression');
    const valid = unwrapProgress(createCreatureProgress(p.base, p.xp, p.allocation));
    if (valid.base.instanceId !== id)
      throw new Error('Progression identity does not match ownership');
    progress[id] = valid;
  }
  let save: TrainerSave = {
    version: 2,
    rulesVersion: PROGRESSION_RULES_VERSION,
    revision: value.revision as number,
    fixtureVersion: value.fixtureVersion,
    rosters,
    progress,
    pending: null,
    lastSettledEncounterId: value.lastSettledEncounterId as string | null,
  };
  if (JSON.stringify(refreshSnapshots(save).rosters) !== JSON.stringify(rosters))
    throw new Error('Saved battle stats do not match training');
  if (value.pending !== null) {
    if (!object(value.pending) || !object(value.pending.gym))
      throw new Error('Invalid pending rewards');
    const gym = restoreCompletedGym(value.pending.gym as unknown as GymState);
    if (save.lastSettledEncounterId !== gym.encounterId)
      throw new Error('Pending encounter identity mismatch');
    const before: TrainerSave = JSON.parse(JSON.stringify(save));
    before.pending = null;
    before.lastSettledEncounterId = null;
    before.rosters = gym.rosters;
    for (const duel of gym.completed)
      for (const side of PLAYERS) {
        const id = side === 'A' ? duel.creatureA.instanceId : duel.creatureB.instanceId;
        const p = before.progress[id];
        if (!p) throw new Error('Missing participant');
        p.xp -= PARTICIPATION_XP + (String(duel.winner) === side ? DUEL_VICTORY_XP : 0);
      }
    const rebuilt = settleGym(refreshSnapshots(before), gym);
    if (
      JSON.stringify(rebuilt.progress) !== JSON.stringify(save.progress) ||
      JSON.stringify(rebuilt.rosters) !== JSON.stringify(save.rosters)
    )
      throw new Error('Invalid pending reward totals');
    save = { ...save, pending: rebuilt.pending };
  }
  return save;
}

export function parseTrainerSave(raw: string): TrainerSave {
  try {
    return validateTrainerSave(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'The trainer save could not be read. It has not been changed.',
    );
  }
}
