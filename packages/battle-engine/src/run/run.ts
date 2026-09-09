import { createDuel } from '../duel/duel.js';
import { TEAM_SIZE, RUN_LENGTH } from '../encounters/constants.js';
import { copyDuel, isExpectedCompletion, validateEncounter } from '../encounters/helpers.js';
import { DUEL_WINNER, type Result, type DuelState } from '../types.js';
import { copySnapshot, copyTypeChart } from '../utils.js';
import {
  RUN_PHASE,
  type CreateRunInput,
  type RunSelection,
  type RunState,
  type RunSwap,
} from './types.js';

export function createRun(input: CreateRunInput): Result<RunState> {
  if (input.roster.length !== TEAM_SIZE || input.opponents.length !== RUN_LENGTH)
    return { ok: false, error: 'A run needs three roster creatures and three opponents' };
  const valid = validateEncounter(
    input.runId,
    [...input.roster, ...input.opponents],
    input.typeChart,
  );
  if (!valid.ok) return valid;
  if (new Set(input.roster.map((creature) => creature.speciesId)).size !== TEAM_SIZE)
    return { ok: false, error: 'Choose three distinct species' };
  return {
    ok: true,
    value: {
      ...input,
      roster: input.roster.map(copySnapshot),
      opponents: input.opponents.map(copySnapshot),
      typeChart: copyTypeChart(input.typeChart),
      opponentIndex: 0,
      phase: RUN_PHASE.CHOOSING,
      activeDuel: null,
      completed: [],
      winner: DUEL_WINNER.NONE,
    },
  };
}

export function selectRunCreature(state: RunState, action: RunSelection): Result<RunState> {
  if (
    state.phase !== RUN_PHASE.CHOOSING ||
    action.runId !== state.runId ||
    action.opponentIndex !== state.opponentIndex
  )
    return { ok: false, error: 'This selection is no longer current' };
  const creature = Number.isInteger(action.slot) ? state.roster[action.slot] : undefined;
  if (!creature) return { ok: false, error: 'Choose a roster creature' };
  const created = createDuel({
    duelId: `${state.runId}:duel:${state.opponentIndex + 1}`,
    creatureA: creature,
    creatureB: state.opponents[state.opponentIndex],
    typeChart: state.typeChart,
  });
  if (!created.ok) return created;
  return { ok: true, value: { ...state, phase: RUN_PHASE.DUELING, activeDuel: created.value } };
}

export function recordRunDuel(state: RunState, completed: DuelState): Result<RunState> {
  if (state.phase !== RUN_PHASE.DUELING || !isExpectedCompletion(state.activeDuel, completed))
    return { ok: false, error: 'Expected the current completed duel' };
  const finished = completed.winner !== DUEL_WINNER.A || state.opponentIndex === RUN_LENGTH - 1;
  return {
    ok: true,
    value: {
      ...state,
      activeDuel: null,
      completed: [...state.completed, copyDuel(completed)],
      phase: finished ? RUN_PHASE.FINISHED : RUN_PHASE.SWAPPING,
      winner: finished ? completed.winner : DUEL_WINNER.NONE,
    },
  };
}

export function canReplaceRunSlot(state: RunState, slot: number): boolean {
  const opponent = state.opponents[state.opponentIndex];
  return (
    state.phase === RUN_PHASE.SWAPPING &&
    Number.isInteger(slot) &&
    !!state.roster[slot] &&
    !!opponent &&
    !state.roster.some(
      (creature, index) => index !== slot && creature.speciesId === opponent.speciesId,
    )
  );
}

export function swapRunCreature(state: RunState, action: RunSwap): Result<RunState> {
  if (
    state.phase !== RUN_PHASE.SWAPPING ||
    action.runId !== state.runId ||
    action.duelId !== state.completed.at(-1)?.duelId
  )
    return { ok: false, error: 'This swap is no longer current' };
  if (action.replaceSlot !== null && !canReplaceRunSlot(state, action.replaceSlot))
    return { ok: false, error: 'Replacement must keep three distinct species' };
  const roster = state.roster.map((creature, index) =>
    index === action.replaceSlot
      ? copySnapshot(state.opponents[state.opponentIndex]!)
      : copySnapshot(creature),
  );
  return {
    ok: true,
    value: { ...state, roster, opponentIndex: state.opponentIndex + 1, phase: RUN_PHASE.CHOOSING },
  };
}
