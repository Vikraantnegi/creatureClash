import {
  createSession,
  DUEL_STATUS,
  greedyPolicy,
  randomPolicy,
  runPolicyExchange,
  PLAYER,
} from '@creature-clash/battle-engine';
import { GREEDY_WEIGHT } from './constants.mjs';
import { analyzeDuel } from './lookahead.mjs';
import { seededRandom } from './random.mjs';

export function mixedPolicy(view, rng) {
  return rng() < GREEDY_WEIGHT ? greedyPolicy(view, rng) : randomPolicy(view, rng);
}
export function studyMatch(duel, policyName, opponentModel, seed, side = PLAYER.A) {
  let session = createSession(duel);
  const rngA = seededRandom(seed);
  const rngB = seededRandom(seed ^ 0x9e3779b9);
  const opponentPolicy = { greedy: greedyPolicy, random: randomPolicy, mixed: mixedPolicy }[
    opponentModel
  ];
  if (!opponentPolicy) throw new Error('Unknown opponent model');
  const decisions = [];
  while (session.duel.status !== DUEL_STATUS.FINISHED) {
    // Snapshot before either commitment. The planner cannot inspect pending picks or future RNG.
    const preCommit = session.duel;
    const policy =
      policyName === 'lookahead'
        ? () => {
            const analysis = analyzeDuel(preCommit, side);
            decisions.push({ exchange: preCommit.nextExchangeId, ...analysis });
            return { ok: true, value: analysis.pick };
          }
        : greedyPolicy;
    const result = runPolicyExchange(
      session,
      side === PLAYER.A ? policy : opponentPolicy,
      side === PLAYER.B ? policy : opponentPolicy,
      rngA,
      rngB,
    );
    if (!result.ok) throw new Error(result.reason);
    session = result.value.session;
  }
  return {
    policy: policyName,
    opponentModel,
    seed,
    side,
    winner: session.duel.winner,
    exchanges: session.duel.exchangesCompleted,
    decisions,
    history: session.duel.history,
  };
}
