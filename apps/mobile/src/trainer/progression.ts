import {
  awardDuelXp,
  CATEGORIES,
  CATEGORY_TRAINING_CAP,
  createCreatureProgress,
  DUEL_WINNER,
  getProgressionView,
  PLAYER,
  PLAYERS,
  PROGRESSION_RULES_VERSION,
  trainCreature,
  type CreatureProgress,
  type GymState,
  type Result,
  type TrainerRosters,
  type TrainingAllocation,
} from '@creature-clash/battle-engine';
import type { TrainerSave, TrainingReward } from './types';

export const unwrapProgress = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

export function createTrainerSave(rosters: TrainerRosters, fixtureVersion: string): TrainerSave {
  const progress = Object.fromEntries(
    PLAYERS.flatMap((side) =>
      rosters[side].map((c) => [c.instanceId, unwrapProgress(createCreatureProgress(c))]),
    ),
  );
  return refreshSnapshots({
    version: 2,
    rulesVersion: PROGRESSION_RULES_VERSION,
    revision: 0,
    fixtureVersion,
    rosters,
    progress,
    pending: null,
    lastSettledEncounterId: null,
  });
}

export function refreshSnapshots(save: TrainerSave): TrainerSave {
  const snapshot = (id: string) => unwrapProgress(getProgressionView(save.progress[id]!)).creature;
  return {
    ...save,
    rosters: {
      A: save.rosters.A.map((c) => snapshot(c.instanceId)),
      B: save.rosters.B.map((c) => snapshot(c.instanceId)),
    },
  };
}

export function settleGym(save: TrainerSave, gym: GymState): TrainerSave {
  if (
    save.pending ||
    save.lastSettledEncounterId === gym.encounterId ||
    gym.completed.length !== 3 ||
    !['exchange', 'finished'].includes(gym.phase)
  )
    throw new Error('This encounter cannot award XP again');
  for (const side of PLAYERS) {
    if (JSON.stringify(save.rosters[side]) !== JSON.stringify(gym.rosters[side]))
      throw new Error('Encounter roster is stale');
  }
  const progress = { ...save.progress };
  const rewards: TrainingReward[] = [];
  for (const duel of gym.completed)
    for (const side of PLAYERS) {
      const c = side === PLAYER.A ? duel.creatureA : duel.creatureB;
      const outcome =
        duel.winner === DUEL_WINNER.DRAW ? 'draw' : String(duel.winner) === side ? 'win' : 'loss';
      const award = unwrapProgress(awardDuelXp(progress[c.instanceId]!, outcome));
      progress[c.instanceId] = award.progress;
      rewards.push({
        instanceId: c.instanceId,
        speciesId: c.speciesId,
        side,
        xp: award.earnedXp,
        beforeLevel: award.before.level,
        afterLevel: award.after.level,
        points: award.after.unspentPoints - award.before.unspentPoints,
      });
    }
  return refreshSnapshots({
    ...save,
    progress,
    pending: { gym, rewards },
    lastSettledEncounterId: gym.encounterId,
    revision: save.revision + 1,
  });
}

// Training belongs to each instance. The AI invests in its own strongest categories,
// never in response to hidden player allocations. The per-category cap forces a second focus.
export function autoTrain(progress: CreatureProgress): CreatureProgress {
  const view = unwrapProgress(getProgressionView(progress));
  let remaining = view.unspentPoints;
  const allocation = { ...view.allocation };
  const priorities = [...CATEGORIES].sort(
    (a, b) => progress.base.stats[b] - progress.base.stats[a],
  );
  for (const category of priorities) {
    const amount = Math.min(remaining, CATEGORY_TRAINING_CAP - allocation[category]);
    allocation[category] += amount;
    remaining -= amount;
  }
  return unwrapProgress(trainCreature(progress, allocation));
}

export function finishSettlement(save: TrainerSave, gym: GymState): TrainerSave {
  if (!save.pending || save.pending.gym.encounterId !== gym.encounterId || gym.phase !== 'finished')
    throw new Error('No matching pending encounter');
  const progress = { ...save.progress };
  for (const c of gym.rosters.B) progress[c.instanceId] = autoTrain(progress[c.instanceId]!);
  return refreshSnapshots({
    ...save,
    rosters: gym.rosters,
    progress,
    pending: null,
    revision: save.revision + 1,
  });
}

export function allocateTraining(
  save: TrainerSave,
  id: string,
  allocation: TrainingAllocation,
): TrainerSave {
  if (save.pending || !save.rosters.A.some((c) => c.instanceId === id))
    throw new Error('Only your available creatures can train');
  const next = unwrapProgress(trainCreature(save.progress[id]!, allocation));
  return refreshSnapshots({
    ...save,
    progress: { ...save.progress, [id]: next },
    revision: save.revision + 1,
  });
}

// A deliberately simple exchange policy: improve total trained stats, or decline.
// This is a value heuristic, not a claim that total stats identify the best team.
export function chooseOpponentExchange(gym: GymState, save: TrainerSave, side: PLAYER = PLAYER.B) {
  let best: { give: string; receive: string } | null = null;
  let gain = 0;
  const total = (id: string) =>
    Object.values(unwrapProgress(getProgressionView(save.progress[id]!)).creature.stats).reduce(
      (a, b) => a + b,
      0,
    );
  for (const give of gym.deployed[side])
    for (const receive of gym.deployed[side === PLAYER.A ? PLAYER.B : PLAYER.A]) {
      const improvement = total(receive) - total(give);
      if (improvement > gain) {
        gain = improvement;
        best = { give, receive };
      }
    }
  return best;
}
