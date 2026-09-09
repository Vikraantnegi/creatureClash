import { CATEGORIES } from '../constants.js';
import { advanceDuel } from '../duel/duel.js';
import { validateCreatureSnapshot, validateTypeChart } from '../snapshots/validate.js';
import {
  DUEL_STATUS,
  DUEL_WINNER,
  type CreatureSnapshot,
  type DuelState,
  type Result,
  type TypeChart,
} from '../types.js';
import { copySnapshot, copyTypeChart } from '../utils.js';

export function validateEncounter(
  id: string,
  creatures: CreatureSnapshot[],
  chart: TypeChart,
): Result<true> {
  if (!id.trim()) return { ok: false, error: 'Encounter ID is required' };
  const checkedChart = validateTypeChart(chart);
  if (!checkedChart.ok) return checkedChart;
  const ids = new Set<string>();
  for (const creature of creatures) {
    const checked = validateCreatureSnapshot(creature);
    if (!checked.ok) return checked;
    if (ids.has(creature.instanceId))
      return { ok: false, error: 'Creature instance IDs must be unique' };
    ids.add(creature.instanceId);
  }
  return { ok: true, value: true };
}

function sameCreature(a: CreatureSnapshot, b: CreatureSnapshot): boolean {
  return (
    a.instanceId === b.instanceId &&
    a.speciesId === b.speciesId &&
    a.typeId === b.typeId &&
    CATEGORIES.every((category) => a.stats[category] === b.stats[category])
  );
}

// Local controller boundary: accept the expected engine result, not a caller-supplied point total.
export function isExpectedCompletion(expected: DuelState | null, completed: DuelState): boolean {
  if (
    !expected ||
    completed.status !== DUEL_STATUS.FINISHED ||
    ![DUEL_WINNER.A, DUEL_WINNER.B, DUEL_WINNER.DRAW].includes(completed.winner) ||
    completed.duelId !== expected.duelId ||
    !sameCreature(expected.creatureA, completed.creatureA) ||
    !sameCreature(expected.creatureB, completed.creatureB) ||
    JSON.stringify(expected.typeChart) !== JSON.stringify(completed.typeChart)
  )
    return false;
  // Replay at most three submitted pairs through the existing resolver. This rejects
  // accidental partial/tampered results without inventing a second set of ending rules.
  let replay = expected;
  for (const event of completed.history) {
    if (event.isAutomaticFourth) continue;
    const result = advanceDuel(replay, {
      duelId: replay.duelId,
      exchangeId: event.exchangeId,
      aPick: event.aPick,
      bPick: event.bPick,
    });
    if (!result.ok) return false;
    replay = result.value.nextState;
  }
  return (
    replay.status === DUEL_STATUS.FINISHED &&
    replay.winner === completed.winner &&
    replay.hpA === completed.hpA &&
    replay.hpB === completed.hpB &&
    replay.nextExchangeId === completed.nextExchangeId &&
    replay.exchangesCompleted === completed.exchangesCompleted &&
    JSON.stringify(replay.usedA) === JSON.stringify(completed.usedA) &&
    JSON.stringify(replay.usedB) === JSON.stringify(completed.usedB) &&
    JSON.stringify(replay.history) === JSON.stringify(completed.history)
  );
}

export function copyDuel(duel: DuelState): DuelState {
  return {
    ...duel,
    creatureA: copySnapshot(duel.creatureA),
    creatureB: copySnapshot(duel.creatureB),
    typeChart: copyTypeChart(duel.typeChart),
    usedA: [...duel.usedA],
    usedB: [...duel.usedB],
    history: duel.history.map((event) => ({ ...event })),
  };
}
