import { createDuel } from '../duel/duel.js';
import { TEAM_SIZE } from '../encounters/constants.js';
import { copyDuel, isExpectedCompletion, validateEncounter } from '../encounters/helpers.js';
import { pairedScore } from '../paired/paired.js';
import { DUEL_WINNER, PLAYER, type DuelState, type Result } from '../types.js';
import { copySnapshot, copyTypeChart } from '../utils.js';
import type {
  CreateGymInput,
  DeploymentCommit,
  GymCommit,
  GymExchangeAction,
  GymState,
  GymView,
  TeamCommit,
} from './types.js';

export const ACTIVE_ROSTER_SIZE = 6;
const other = (side: PLAYER) => (side === PLAYER.A ? PLAYER.B : PLAYER.A);
const rejected = (error: string): Result<never> => ({ ok: false, error });
const current = (state: GymState, action: GymCommit) =>
  action.encounterId === state.encounterId &&
  action.round === state.completed.length + 1 &&
  (action.side === PLAYER.A || action.side === PLAYER.B);

export function createGym(input: CreateGymInput): Result<GymState> {
  if (
    input.rosters.A.length !== ACTIVE_ROSTER_SIZE ||
    input.rosters.B.length !== ACTIVE_ROSTER_SIZE
  )
    return rejected('Each trainer needs six active creatures');
  const valid = validateEncounter(
    input.encounterId,
    [...input.rosters.A, ...input.rosters.B],
    input.typeChart,
  );
  if (!valid.ok) return valid;
  return {
    ok: true,
    value: {
      encounterId: input.encounterId,
      rosters: { A: input.rosters.A.map(copySnapshot), B: input.rosters.B.map(copySnapshot) },
      typeChart: copyTypeChart(input.typeChart),
      phase: 'team',
      selected: { A: null, B: null },
      deployed: { A: [], B: [] },
      pending: { A: null, B: null },
      activeDuel: null,
      completed: [],
      winner: DUEL_WINNER.NONE,
      exchange: null,
    },
  };
}

export function commitGymTeam(state: GymState, action: TeamCommit): Result<GymState> {
  if (!current(state, action) || state.phase !== 'team')
    return rejected('Team selection is no longer current');
  if (state.selected[action.side]) return rejected('Team is already locked');
  if (
    action.creatures.length !== TEAM_SIZE ||
    new Set(action.creatures).size !== TEAM_SIZE ||
    action.creatures.some((id) => !state.rosters[action.side].some((c) => c.instanceId === id))
  )
    return rejected('Select three different creatures from your active roster');
  const selected = { ...state.selected, [action.side]: [...action.creatures] };
  return {
    ok: true,
    value: { ...state, selected, phase: selected.A && selected.B ? 'deployment' : 'team' },
  };
}

export function commitGymDeployment(state: GymState, action: DeploymentCommit): Result<GymState> {
  if (!current(state, action) || state.phase !== 'deployment')
    return rejected('Deployment is no longer current');
  if (state.pending[action.side]) return rejected('Deployment is already locked');
  if (
    !state.selected[action.side]?.includes(action.creature) ||
    state.deployed[action.side].includes(action.creature)
  )
    return rejected('Choose an unused creature from your locked team');
  const pending = { ...state.pending, [action.side]: action.creature };
  if (!pending.A || !pending.B) return { ok: true, value: { ...state, pending } };
  const created = createDuel({
    duelId: `${state.encounterId}:duel:${action.round}`,
    creatureA: state.rosters.A.find((c) => c.instanceId === pending.A),
    creatureB: state.rosters.B.find((c) => c.instanceId === pending.B),
    typeChart: state.typeChart,
  });
  if (!created.ok) return created;
  return {
    ok: true,
    value: {
      ...state,
      phase: 'dueling',
      activeDuel: created.value,
      pending: { A: null, B: null },
      deployed: { A: [...state.deployed.A, pending.A], B: [...state.deployed.B, pending.B] },
    },
  };
}

export function recordGymDuel(state: GymState, completed: DuelState): Result<GymState> {
  if (state.phase !== 'dueling' || !isExpectedCompletion(state.activeDuel, completed))
    return rejected('Expected the current completed duel');
  const results = [...state.completed, copyDuel(completed)];
  const score = pairedScore({ completed: results });
  const winner =
    results.length !== TEAM_SIZE
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
      activeDuel: null,
      completed: results,
      winner,
      phase:
        results.length < TEAM_SIZE
          ? 'deployment'
          : winner === DUEL_WINNER.DRAW
            ? 'finished'
            : 'exchange',
    },
  };
}

export function exchangeGymCreatures(state: GymState, action: GymExchangeAction): Result<GymState> {
  if (
    state.phase !== 'exchange' ||
    action.encounterId !== state.encounterId ||
    (action.side !== PLAYER.A && action.side !== PLAYER.B) ||
    action.side !== String(state.winner)
  )
    return rejected('Only the encounter winner may choose this exchange');
  if (!action.swap) return { ok: true, value: { ...state, phase: 'finished' } };
  const loser = other(action.side);
  const { give, receive } = action.swap;
  if (!state.deployed[action.side].includes(give) || !state.deployed[loser].includes(receive))
    return rejected('Both creatures must have participated in this encounter');
  const given = state.rosters[action.side].find((c) => c.instanceId === give)!;
  const received = state.rosters[loser].find((c) => c.instanceId === receive)!;
  return {
    ok: true,
    value: {
      ...state,
      phase: 'finished',
      rosters: {
        ...state.rosters,
        [action.side]: state.rosters[action.side].map((c) =>
          copySnapshot(c.instanceId === give ? received : c),
        ),
        [loser]: state.rosters[loser].map((c) =>
          copySnapshot(c.instanceId === receive ? given : c),
        ),
      },
      exchange: {
        winner: action.side,
        given: copySnapshot(given),
        received: copySnapshot(received),
      },
    },
  };
}

export function getGymView(state: GymState, side: PLAYER): GymView {
  const opponent = other(side);
  return {
    encounterId: state.encounterId,
    phase: state.phase,
    round: Math.min(TEAM_SIZE, state.completed.length + 1),
    roster: state.rosters[side].map(copySnapshot),
    opponentRoster: state.rosters[opponent].map(({ instanceId, speciesId, typeId }) => ({
      instanceId,
      speciesId,
      typeId,
    })),
    selected: state.selected[side] ? [...state.selected[side]] : null,
    available: state.rosters[side]
      .filter(
        (c) =>
          state.selected[side]?.includes(c.instanceId) &&
          !state.deployed[side].includes(c.instanceId),
      )
      .map(copySnapshot),
    ownDeployment: state.pending[side],
    opponentCommitted:
      state.phase === 'team' ? state.selected[opponent] !== null : state.pending[opponent] !== null,
    activeDuel: state.activeDuel ? copyDuel(state.activeDuel) : null,
    completed: state.completed.map(copyDuel),
    score: pairedScore(state),
    winner: state.winner,
    exchange: state.exchange
      ? {
          ...state.exchange,
          given: copySnapshot(state.exchange.given),
          received: copySnapshot(state.exchange.received),
        }
      : null,
  };
}
