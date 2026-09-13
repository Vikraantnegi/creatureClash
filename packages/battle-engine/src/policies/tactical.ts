import { advanceDuel, createDuel } from '../duel/duel.js';
import { getPlayerView } from '../view/view.js';
import {
  PLAYER,
  DUEL_STATUS,
  DUEL_WINNER,
  type CreatureSnapshot,
  type CATEGORY,
  type TypeChart,
  type PolicyResult,
  type DuelState,
} from '../types.js';

// The caller must supply estimates for hidden categories, never an unfiltered opponent snapshot.
export type TacticalObservation = {
  self: CreatureSnapshot;
  estimatedOpponent: CreatureSnapshot;
  hp: number;
  opponentHp: number;
  used: CATEGORY[];
  opponentUsed: CATEGORY[];
  exchangesCompleted: number;
};

export function tacticalPolicy(
  observation: TacticalObservation,
  chart: TypeChart,
  rng: () => number,
): PolicyResult {
  const r = rng();
  if (!Number.isFinite(r) || r < 0 || r >= 1) return { ok: false, error: 'invalid_rng' };
  const created = createDuel({
    duelId: 'tactical-estimate',
    creatureA: observation.self,
    creatureB: observation.estimatedOpponent,
    typeChart: chart,
  });
  if (!created.ok) return created;
  const initial: DuelState = {
    ...created.value,
    hpA: observation.hp,
    hpB: observation.opponentHp,
    usedA: [...observation.used],
    usedB: [...observation.opponentUsed],
    exchangesCompleted: observation.exchangesCompleted,
    nextExchangeId: observation.exchangesCompleted + 1,
  };
  if (initial.hpA <= 0 || initial.hpB <= 0 || initial.exchangesCompleted >= 3)
    return { ok: false, error: 'no_legal_category' };
  const memo = new Map<string, number>();
  function choices(state: DuelState): { pick: CATEGORY; value: number }[] {
    const own = getPlayerView(state, PLAYER.A).self.availableCategories;
    const opposing = getPlayerView(state, PLAYER.B).self.availableCategories;
    return own.map((pick) => ({
      pick,
      value: opposing.reduce((sum, other) => {
        const result = advanceDuel(state, {
          duelId: state.duelId,
          exchangeId: state.nextExchangeId,
          aPick: pick,
          bPick: other,
        });
        if (!result.ok) throw new Error(result.reason);
        return sum + evaluate(result.value.nextState) / opposing.length;
      }, 0),
    }));
  }
  function evaluate(state: DuelState): number {
    if (state.status === DUEL_STATUS.FINISHED)
      return state.winner === DUEL_WINNER.A ? 1 : state.winner === DUEL_WINNER.DRAW ? 0 : -1;
    const key = `${state.hpA}:${state.hpB}:${[...state.usedA].sort()}:${[...state.usedB].sort()}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const value = Math.max(...choices(state).map((c) => c.value));
    memo.set(key, value);
    return value;
  }
  const candidates = choices(initial);
  if (!candidates.length) return { ok: false, error: 'no_legal_category' };
  const best = Math.max(...candidates.map((c) => c.value));
  const tied = candidates.filter((c) => c.value >= best - 1e-9);
  // 90% best estimated duel outcome, 10% exploration. Randomize equally good choices.
  const pool = r < 0.9 ? tied : candidates;
  const bucket = r < 0.9 ? r / 0.9 : (r - 0.9) / 0.1;
  return {
    ok: true,
    value: pool[Math.min(pool.length - 1, Math.floor(bucket * pool.length))]!.pick,
  };
}
