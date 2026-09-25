import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as E from '@creature-clash/battle-engine';
import { FIXTURES, FIXTURE_VERSION, creatureFor } from '@creature-clash/battle-fixtures';
import { seededRandom } from './random.mjs';

// Experimental candidates only. These are not progression rules used by the app.
const curves = {
  flat1: (base, level) => base + level - 1,
  flat2: (base, level) => base + 2 * (level - 1),
  percent2: (base, level) => Math.round((base * (100 + 2 * (level - 1))) / 100),
};
// Frozen historical uniform-growth experiment. Production now uses specialisation.
const thresholds = [0, 30, 80, 150, 240];
const levelOf = (xp) => thresholds.filter((threshold) => xp >= threshold).length;
const unwrap = (result) => {
  assert(result.ok, result.error ?? result.reason);
  return result.value;
};
function snapshot(instance, curve) {
  return {
    ...instance.base,
    stats: Object.fromEntries(
      E.CATEGORIES.map((category) => [
        category,
        curves[curve](instance.base.stats[category], levelOf(instance.xp)),
      ]),
    ),
  };
}
function atLevel(species, id, level, curve) {
  return snapshot({ base: creatureFor(species, id), xp: thresholds[level - 1] }, curve);
}
function duel(a, b) {
  return unwrap(
    E.createDuel({
      duelId: 'progression-study',
      creatureA: a,
      creatureB: b,
      typeChart: E.DEFAULT_TYPE_CHART,
    }),
  );
}
function advance(state, aPick, bPick) {
  return unwrap(
    E.advanceDuel(state, {
      duelId: state.duelId,
      exchangeId: state.nextExchangeId,
      aPick,
      bPick,
    }),
  ).nextState;
}
const legal = (state, side) =>
  E.CATEGORIES.filter((category) => !(side === 'A' ? state.usedA : state.usedB).includes(category));

// Exact full-information pure-strategy diagnostic; no policy sees a current opposing pick.
// This is not a mixed-strategy equilibrium solver or a player win-rate estimate.
function analyze(initial) {
  const memo = new Map();
  function visit(state) {
    if (state.status === E.DUEL_STATUS.FINISHED)
      return {
        forceA: state.winner === 'A',
        forceB: state.winner === 'B',
        possibleA: state.winner === 'A',
        possibleB: state.winner === 'B',
      };
    const key = `${state.hpA}:${state.hpB}:${[...state.usedA].sort()}:${[...state.usedB].sort()}`;
    if (memo.has(key)) return memo.get(key);
    const a = legal(state, 'A'),
      b = legal(state, 'B');
    const matrix = a.map((x) => b.map((y) => visit(advance(state, x, y))));
    const result = {
      forceA: matrix.some((row) => row.every((entry) => entry.forceA)),
      forceB: b.some((_, index) => matrix.every((row) => row[index].forceB)),
      possibleA: matrix.some((row) => row.some((entry) => entry.possibleA)),
      possibleB: matrix.some((row) => row.some((entry) => entry.possibleB)),
    };
    assert(!(result.forceA && result.forceB));
    memo.set(key, result);
    return result;
  }
  return visit(initial);
}

const baseline = new Map();
const growth = [];
for (const curve of Object.keys(curves)) {
  for (const [levelA, levelB] of [
    [1, 1],
    [2, 1],
    [3, 1],
    [5, 1],
    [5, 4],
    [5, 5],
  ]) {
    const pairs = [];
    for (const a of FIXTURES)
      for (const b of FIXTURES) {
        const outcome = analyze(
          duel(atLevel(a.id, 'a', levelA, curve), atLevel(b.id, 'b', levelB, curve)),
        );
        const reversed = analyze(
          duel(atLevel(b.id, 'b', levelB, curve), atLevel(a.id, 'a', levelA, curve)),
        );
        assert.equal(outcome.forceA, reversed.forceB);
        assert.equal(outcome.possibleA, reversed.possibleB);
        const key = `${a.id}:${b.id}`;
        if (levelA === 1 && levelB === 1) baseline.set(key, outcome);
        const start = baseline.get(key);
        pairs.push({
          a: a.id,
          b: b.id,
          mirror: a.id === b.id,
          ...outcome,
          newlyForcedA: outcome.forceA && !start.forceA,
          newlyNoWinB: !outcome.possibleB && start.possibleB,
        });
      }
    const summarize = (items) => ({
      pairs: items.length,
      forceA: items.filter((p) => p.forceA).length,
      forceB: items.filter((p) => p.forceB).length,
      newlyForcedA: items.filter((p) => p.newlyForcedA).length,
      noWinningSequenceB: items.filter((p) => !p.possibleB).length,
      newlyNoWinB: items.filter((p) => p.newlyNoWinB).length,
    });
    growth.push({
      curve,
      levelA,
      levelB,
      distinct: summarize(pairs.filter((p) => !p.mirror)),
      mirrors: summarize(pairs.filter((p) => p.mirror)),
      pairs,
    });
  }
}

const seedSource = seededRandom(0xc1a5);
const seeds = Array.from({ length: 40 }, () => Math.floor(seedSource() * 0x100000000));
const shuffle = (values, rng) => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const total = (creature) => Object.values(creature.stats).reduce((sum, stat) => sum + stat, 0);
function series(seed, swapping, earnXp, curve) {
  // Both sides begin with the same species and level distribution. Unique IDs follow ownership.
  const instances = Object.fromEntries(
    ['A', 'B'].flatMap((side) =>
      FIXTURES.map((f, index) => {
        const id = `${side}-${index}`;
        return [id, { base: creatureFor(f.id, id), xp: thresholds[index % 5] }];
      }),
    ),
  );
  let owners = Object.fromEntries(
    ['A', 'B'].map((side) => [side, FIXTURES.map((_, i) => `${side}-${i}`)]),
  );
  const rounds = [];
  for (let round = 0; round < 10; round++) {
    // Independent per-encounter streams avoid divergence from variable duel length.
    const rng = seededRandom((seed + Math.imul(round + 1, 0x9e3779b9)) >>> 0);
    const rosters = Object.fromEntries(
      ['A', 'B'].map((side) => [side, owners[side].map((id) => snapshot(instances[id], curve))]),
    );
    let gym = unwrap(
      E.createGym({ encounterId: `series-${round}`, rosters, typeChart: E.DEFAULT_TYPE_CHART }),
    );
    const teams = Object.fromEntries(
      ['A', 'B'].map((side) => [side, shuffle(owners[side], rng).slice(0, 3)]),
    );
    for (const side of ['A', 'B'])
      gym = unwrap(
        E.commitGymTeam(gym, {
          encounterId: gym.encounterId,
          round: 1,
          side,
          creatures: teams[side],
        }),
      );
    for (let index = 0; index < 3; index++) {
      for (const side of ['A', 'B'])
        gym = unwrap(
          E.commitGymDeployment(gym, {
            encounterId: gym.encounterId,
            round: index + 1,
            side,
            creature: teams[side][index],
          }),
        );
      let state = gym.activeDuel;
      const orders = { A: shuffle(E.CATEGORIES, rng), B: shuffle(E.CATEGORIES, rng) };
      while (state.status !== E.DUEL_STATUS.FINISHED) {
        state = advance(
          state,
          orders.A[state.exchangesCompleted],
          orders.B[state.exchangesCompleted],
        );
      }
      gym = unwrap(E.recordGymDuel(gym, state));
    }
    // XP earned by participation and own duel outcome, not overall gym victory.
    if (earnXp)
      for (const result of gym.completed)
        for (const side of ['A', 'B']) {
          const id = (side === 'A' ? result.creatureA : result.creatureB).instanceId;
          const outcome =
            result.winner === side ? 'win' : result.winner === 'draw' ? 'draw' : 'loss';
          instances[id] = {
            ...instances[id],
            xp: Math.min(240, instances[id].xp + (outcome === 'win' ? 15 : 10)),
          };
        }
    let transfer = 0;
    if (gym.phase === 'exchange') {
      const winner = gym.winner,
        loser = winner === 'A' ? 'B' : 'A';
      // Stat totals are only a diagnostic exchange heuristic, not matchup strength.
      const ranked = (side) =>
        teams[side]
          .map((id) => snapshot(instances[id], curve))
          .sort((a, b) => total(a) - total(b) || a.instanceId.localeCompare(b.instanceId));
      const give = ranked(winner)[0],
        receive = ranked(loser).at(-1);
      const swap =
        swapping && total(receive) > total(give)
          ? { give: give.instanceId, receive: receive.instanceId }
          : null;
      const settled = unwrap(
        E.exchangeGymCreatures(gym, { encounterId: gym.encounterId, side: winner, swap }),
      );
      const beforeTotal = Object.values(owners)
        .flat()
        .reduce((sum, id) => sum + total(snapshot(instances[id], curve)), 0);
      owners = Object.fromEntries(
        ['A', 'B'].map((side) => [side, settled.rosters[side].map((c) => c.instanceId)]),
      );
      const afterTotal = Object.values(owners)
        .flat()
        .reduce((sum, id) => sum + total(snapshot(instances[id], curve)), 0);
      assert.equal(beforeTotal, afterTotal);
      transfer = swap ? total(receive) - total(give) : 0;
    }
    const allIds = [...owners.A, ...owners.B];
    assert.equal(new Set(allIds).size, 12);
    assert.equal(owners.A.length, 6);
    assert.equal(owners.B.length, 6);
    const power = Object.fromEntries(
      ['A', 'B'].map((side) => [
        side,
        owners[side].reduce((sum, id) => sum + total(snapshot(instances[id], curve)), 0),
      ]),
    );
    rounds.push({ winner: gym.winner, transfer, powerGap: Math.abs(power.A - power.B) });
  }
  return rounds;
}
const repeated = [];
for (const curve of Object.keys(curves))
  for (const earnXp of [false, true])
    for (const swapping of [false, true]) {
      const runs = seeds.map((seed) => series(seed, swapping, earnXp, curve));
      const repeat = { opportunities: 0, wins: 0, losses: 0, draws: 0 };
      for (const run of runs)
        for (let i = 1; i < run.length; i++) {
          if (run[i - 1].winner === 'draw') continue;
          repeat.opportunities++;
          if (run[i].winner === 'draw') repeat.draws++;
          else if (run[i].winner === run[i - 1].winner) repeat.wins++;
          else repeat.losses++;
        }
      repeated.push({
        curve,
        earnXp,
        swapping,
        runs: runs.length,
        gymsPerRun: 10,
        averageFinalStatTotalGap:
          runs.reduce((sum, run) => sum + run.at(-1).powerGap, 0) / runs.length,
        maxFinalStatTotalGap: Math.max(...runs.map((run) => run.at(-1).powerGap)),
        repeat,
        traces: runs,
      });
    }
const output = new URL('../../outputs/battle-study/', import.meta.url);
mkdirSync(output, { recursive: true });
const report = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  fixtureVersion: FIXTURE_VERSION,
  thresholds,
  seeds,
  method:
    'Growth: all 36 ordered fixture pairs, six level pairs, three curves; exact pure-strategy forced wins and existence of winning sequences, mirrors separate. Series: 40 seeds x 10 gyms per condition; uniform random teams/deployment/category orders, both sides equal starting distributions of levels 1/2/3/4/5/1; optional positive-stat-total participant swaps. XP on/off crossed with swaps on/off. Exact engine gym and duel transitions. No app tactical policy, optimal team selection, human enjoyment or leaderboard inference.',
  growth,
  repeated,
};
writeFileSync(new URL('progression-results.json', output), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      growth: growth.map(({ pairs, ...row }) => row),
      repeated: repeated.map(({ traces, ...row }) => row),
    },
    null,
    2,
  ),
);
