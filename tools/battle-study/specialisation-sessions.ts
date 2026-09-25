import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as E from '@creature-clash/battle-engine';
import { FIXTURES, FIXTURE_VERSION, creatureFor } from '@creature-clash/battle-fixtures';
import { tacticalObservation } from '../../apps/mobile/src/battle/tacticalObservation';
import {
  autoTrain,
  chooseOpponentExchange,
  createTrainerSave,
  finishSettlement,
  refreshSnapshots,
  settleGym,
  unwrapProgress,
} from '../../apps/mobile/src/trainer/progression';
import { chooseGymCreatures } from '../../apps/mobile/src/gym/policy';

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function initial() {
  let save = createTrainerSave(
    {
      A: FIXTURES.map((f, i) => creatureFor(f.id, `a${i}`)),
      B: FIXTURES.map((f, i) => creatureFor(f.id, `b${i}`)),
    },
    FIXTURE_VERSION,
  );
  for (const progress of Object.values(save.progress)) progress.xp = 180;
  save = refreshSnapshots(save);
  return save;
}
function invest(save: ReturnType<typeof initial>, training: boolean) {
  return refreshSnapshots({
    ...save,
    progress: Object.fromEntries(
      Object.entries(save.progress).map(([id, progress]) => [
        id,
        training ? autoTrain(progress) : { ...progress, allocation: E.emptyTrainingAllocation() },
      ]),
    ),
  });
}
function run(seed: number, training: boolean, swaps: boolean, policy: 'tactical' | 'greedy') {
  let save = invest(initial(), training);
  const traces = [];
  for (let encounter = 0; encounter < 10; encounter++) {
    const rng = random(seed + encounter * 15485863);
    let gym = unwrapProgress(
      E.createGym({
        encounterId: `study-${seed}-${encounter}`,
        rosters: save.rosters,
        typeChart: E.DEFAULT_TYPE_CHART,
      }),
    );
    for (const side of E.PLAYERS) {
      const creatures = chooseGymCreatures(E.getGymView(gym, side), 3, rng);
      gym = unwrapProgress(
        E.commitGymTeam(gym, { encounterId: gym.encounterId, round: 1, side, creatures }),
      );
    }
    for (let duelIndex = 0; duelIndex < 3; duelIndex++) {
      for (const side of E.PLAYERS)
        gym = unwrapProgress(
          E.commitGymDeployment(gym, {
            encounterId: gym.encounterId,
            round: duelIndex + 1,
            side,
            creature: chooseGymCreatures(E.getGymView(gym, side), 1, rng)[0]!,
          }),
        );
      let duel = gym.activeDuel!;
      while (duel.status !== E.DUEL_STATUS.FINISHED) {
        const pick = (side: E.PLAYER) => {
          const view = E.getPlayerView(duel, side);
          const result =
            policy === 'greedy'
              ? E.greedyPolicy(view, rng)
              : E.tacticalPolicy(tacticalObservation(view, 'profile'), E.DEFAULT_TYPE_CHART, rng);
          if (!result.ok) throw new Error(String(result.error));
          return result.value;
        };
        const aPick = pick(E.PLAYER.A),
          bPick = pick(E.PLAYER.B);
        const result = E.advanceDuel(duel, {
          duelId: duel.duelId,
          exchangeId: duel.nextExchangeId,
          aPick,
          bPick,
        });
        assert(result.ok);
        duel = result.value.nextState;
      }
      gym = unwrapProgress(E.recordGymDuel(gym, duel));
    }
    save = settleGym(save, gym);
    if (gym.phase === 'exchange')
      gym = unwrapProgress(
        E.exchangeGymCreatures(gym, {
          encounterId: gym.encounterId,
          side: gym.winner as unknown as E.PLAYER,
          swap: swaps ? chooseOpponentExchange(gym, save, gym.winner as unknown as E.PLAYER) : null,
        }),
      );
    save = invest(finishSettlement(save, gym), training);
    assert.equal(new Set([...save.rosters.A, ...save.rosters.B].map((c) => c.instanceId)).size, 12);
    const total = (side: E.PLAYER) =>
      save.rosters[side].reduce(
        (sum, c) => sum + Object.values(c.stats).reduce((a, b) => a + b, 0),
        0,
      );
    traces.push({
      winner: gym.winner,
      exchange: gym.exchange,
      statTotalGap: Math.abs(total(E.PLAYER.A) - total(E.PLAYER.B)),
      owners: {
        A: save.rosters.A.map((c) => c.instanceId),
        B: save.rosters.B.map((c) => c.instanceId),
      },
    });
  }
  return traces;
}
const conditions = [];
for (const policy of ['greedy', 'tactical'] as const)
  for (const training of [false, true])
    for (const swaps of [false, true]) {
      const runs = Array.from({ length: 20 }, (_, seed) =>
        run(1729 + seed * 7919, training, swaps, policy),
      );
      const rows = runs.flat();
      conditions.push({
        policy,
        training,
        swaps,
        gyms: rows.length,
        winsA: rows.filter((r) => r.winner === E.DUEL_WINNER.A).length,
        winsB: rows.filter((r) => r.winner === E.DUEL_WINNER.B).length,
        draws: rows.filter((r) => r.winner === E.DUEL_WINNER.DRAW).length,
        exchanges: rows.filter((r) => r.exchange).length,
        averageFinalStatTotalGap:
          runs.reduce((sum, r) => sum + r.at(-1)!.statTotalGap, 0) / runs.length,
        runs,
      });
    }
const output = new URL('../../outputs/battle-study/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL('specialisation-sessions.json', output),
  JSON.stringify(
    {
      method:
        '20 paired seeds, 10 gyms each, training on/off crossed with participant swaps on/off, both greedy and the actual mobile profile tactical adapter. Both sides start at level 5. XP always accrues; training-off banks all points. Same own-stat-priority training and public-value exchange heuristic as the app, symmetric trainers. Training and exchanges can diverge later roster composition and duel duration. Aggregate stat totals are not team strength, remaining winning opportunities, human fun, or leaderboard predictions.',
      conditions,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    conditions.map(({ runs, ...summary }) => summary),
    null,
    2,
  ),
);
