import {
  advanceDuel,
  DUEL_STATUS,
  DUEL_WINNER,
  getPlayerView,
  greedyPolicy,
  PLAYER,
} from '@creature-clash/battle-engine';
import { GREEDY_WEIGHT, TERMINAL_UTILITY } from './constants.mjs';

export function analyzeDuel(state, side = PLAYER.A, greedyWeight = GREEDY_WEIGHT) {
  if (state.status !== DUEL_STATUS.ONGOING)
    throw new Error('Analysis requires an ongoing pre-commit duel');
  if (![PLAYER.A, PLAYER.B].includes(side)) throw new Error('Unknown perspective');
  if (!Number.isFinite(greedyWeight) || greedyWeight < 0 || greedyWeight > 1)
    throw new Error('Invalid opponent weight');
  let nodes = 0;
  const other = side === PLAYER.A ? PLAYER.B : PLAYER.A;
  function evaluate(current) {
    nodes += 1;
    if (current.status === DUEL_STATUS.FINISHED) {
      return {
        utility:
          current.winner === DUEL_WINNER.DRAW
            ? TERMINAL_UTILITY.draw
            : current.winner === side
              ? TERMINAL_UTILITY.win
              : TERMINAL_UTILITY.loss,
        choices: [],
      };
    }
    const own = getPlayerView(current, side).self.availableCategories;
    const opponentView = getPlayerView(current, other);
    const opposing = opponentView.self.availableCategories;
    const greedy = greedyPolicy(opponentView, () => 0);
    if (!greedy.ok) throw new Error(greedy.error);
    const choices = own.map((pick) => {
      let utility = 0;
      for (const opposingPick of opposing) {
        const probability =
          (1 - greedyWeight) / opposing.length + (opposingPick === greedy.value ? greedyWeight : 0);
        if (probability === 0) continue;
        const step = advanceDuel(current, {
          duelId: current.duelId,
          exchangeId: current.nextExchangeId,
          aPick: side === PLAYER.A ? pick : opposingPick,
          bPick: side === PLAYER.B ? pick : opposingPick,
        });
        if (!step.ok) throw new Error(step.reason);
        utility += probability * evaluate(step.value.nextState).utility;
      }
      return { pick, utility };
    });
    // Preserve canonical ordering for ties, allowing only floating-point accumulation noise.
    const best = choices.reduce((a, b) => (b.utility > a.utility + 1e-12 ? b : a));
    return { ...best, choices };
  }
  return { ...evaluate(state), nodes, greedyWeight };
}
