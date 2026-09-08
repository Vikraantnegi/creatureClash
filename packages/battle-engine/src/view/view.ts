import { CATEGORIES } from '../constants.js';
import { getEffectiveScore, getTypeMultiplier } from '../scoring/scoring.js';
import { DUEL_STATUS, PLAYER } from '../types.js';
import type {
  CATEGORY,
  CreatureSnapshot,
  DuelState,
  ExchangeResultEvent,
  MULTIPLIER_TENTHS,
  PlayerView,
  SidePublic,
  TYPE,
  TypeChart,
} from '../types.js';
import { copySnapshot } from '../utils.js';

const copyEvent = (event: ExchangeResultEvent): ExchangeResultEvent => ({ ...event });

const buildEffectiveScores = (
  stats: CreatureSnapshot['stats'],
  chart: TypeChart,
  ownType: TYPE,
  opponentType: TYPE,
): Record<CATEGORY, number> => {
  const scores = {} as Record<CATEGORY, number>;
  for (const category of CATEGORIES) {
    scores[category] = getEffectiveScore(stats[category], chart, ownType, opponentType);
  }
  return scores;
};

const buildSidePublic = (
  creature: CreatureSnapshot,
  hp: number,
  used: CATEGORY[],
  opponentType: TYPE,
  chart: TypeChart,
  finished: boolean,
): SidePublic => {
  const typeFactor: MULTIPLIER_TENTHS = getTypeMultiplier(chart, creature.typeId, opponentType);
  return {
    creature: copySnapshot(creature),
    hp,
    usedCategories: [...used],
    availableCategories: finished ? [] : CATEGORIES.filter((category) => !used.includes(category)),
    typeFactor,
    effectiveScores: buildEffectiveScores(creature.stats, chart, creature.typeId, opponentType),
  };
};

export const getPlayerView = (state: DuelState, side: PLAYER): PlayerView => {
  const finished = state.status === DUEL_STATUS.FINISHED;
  const selfIsA = side === PLAYER.A;

  const self = buildSidePublic(
    selfIsA ? state.creatureA : state.creatureB,
    selfIsA ? state.hpA : state.hpB,
    selfIsA ? state.usedA : state.usedB,
    selfIsA ? state.creatureB.typeId : state.creatureA.typeId,
    state.typeChart,
    finished,
  );

  const opponent = buildSidePublic(
    selfIsA ? state.creatureB : state.creatureA,
    selfIsA ? state.hpB : state.hpA,
    selfIsA ? state.usedB : state.usedA,
    selfIsA ? state.creatureA.typeId : state.creatureB.typeId,
    state.typeChart,
    finished,
  );

  return {
    duelId: state.duelId,
    viewer: side,
    status: state.status,
    winner: state.winner,
    currentExchangeId: finished ? null : state.nextExchangeId,
    exchangesCompleted: state.exchangesCompleted,
    history: state.history.map(copyEvent),
    self,
    opponent,
  };
};
