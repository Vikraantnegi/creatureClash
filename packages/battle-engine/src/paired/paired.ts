import { createDuel } from '../duel/duel.js';
import { TEAM_SIZE } from '../encounters/constants.js';
import { copyDuel, isExpectedCompletion, validateEncounter } from '../encounters/helpers.js';
import { DUEL_WINNER, type DuelState, type Result } from '../types.js';
import { copySnapshot, copyTypeChart } from '../utils.js';
import { PAIRED_PHASE, type CreatePairedInput, type PairedState } from './types.js';

export function createPairedEncounter(input: CreatePairedInput): Result<PairedState> {
  if (input.teamA.length !== TEAM_SIZE || input.teamB.length !== TEAM_SIZE)
    return { ok: false, error: 'Paired encounters need three creatures per team' };
  const valid = validateEncounter(
    input.encounterId,
    [...input.teamA, ...input.teamB],
    input.typeChart,
  );
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: {
      ...input,
      teamA: input.teamA.map(copySnapshot),
      teamB: input.teamB.map(copySnapshot),
      typeChart: copyTypeChart(input.typeChart),
      phase: PAIRED_PHASE.READY,
      activeDuel: null,
      completed: [],
      winner: DUEL_WINNER.NONE,
    },
  };
}

export function startPairedDuel(
  state: PairedState,
  encounterId: string,
  pairIndex: number,
): Result<PairedState> {
  if (
    state.phase !== PAIRED_PHASE.READY ||
    encounterId !== state.encounterId ||
    pairIndex !== state.completed.length
  )
    return { ok: false, error: 'This pair is no longer current' };
  const created = createDuel({
    duelId: `${state.encounterId}:pair:${pairIndex + 1}`,
    creatureA: state.teamA[pairIndex],
    creatureB: state.teamB[pairIndex],
    typeChart: state.typeChart,
  });
  if (!created.ok) return created;
  return { ok: true, value: { ...state, phase: PAIRED_PHASE.DUELING, activeDuel: created.value } };
}

export function pairedScore(state: Pick<PairedState, 'completed'>): { a: number; b: number } {
  return {
    a: state.completed.filter((duel) => duel.winner === DUEL_WINNER.A).length,
    b: state.completed.filter((duel) => duel.winner === DUEL_WINNER.B).length,
  };
}

export function recordPairedDuel(state: PairedState, completed: DuelState): Result<PairedState> {
  if (state.phase !== PAIRED_PHASE.DUELING || !isExpectedCompletion(state.activeDuel, completed))
    return { ok: false, error: 'Expected the current completed duel' };
  const results = [...state.completed, copyDuel(completed)];
  const finished = results.length === TEAM_SIZE;
  const score = pairedScore({ completed: results });
  const winner = !finished
    ? DUEL_WINNER.NONE
    : score.a === score.b
      ? DUEL_WINNER.DRAW
      : score.a > score.b
        ? DUEL_WINNER.A
        : DUEL_WINNER.B;
  return {
    ok: true,
    value: {
      ...state,
      completed: results,
      activeDuel: null,
      phase: finished ? PAIRED_PHASE.FINISHED : PAIRED_PHASE.READY,
      winner,
    },
  };
}
