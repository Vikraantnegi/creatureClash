import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as E from '@creature-clash/battle-engine';
import { creatureFor, FIXTURE_VERSION } from '@creature-clash/battle-fixtures';
import { tacticalObservation } from '../../apps/mobile/src/battle/tacticalObservation.ts';
import { seededRandom } from './random.mjs';

const permutations = (xs) =>
  xs.length
    ? xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j)).map((p) => [x, ...p]))
    : [[]];
const orders = permutations(E.CATEGORIES);
// Spread seed values across uint32 space: adjacent tiny seeds bias this LCG's first draw.
const seedSource = seededRandom(0xc1a5);
const seeds = Array.from({ length: 30 }, () => Math.floor(seedSource() * 0x100000000));
const opposite = (side) => (side === E.PLAYER.A ? E.PLAYER.B : E.PLAYER.A);

function match(species, opponent, side, policy, seed, fixedOrder) {
  const other = opposite(side);
  const creatures = {
    [side]: creatureFor(species, 'subject'),
    [other]: creatureFor(opponent, 'opponent'),
  };
  const created = E.createDuel({
    duelId: 'checkpoint',
    creatureA: creatures.A,
    creatureB: creatures.B,
    typeChart: E.DEFAULT_TYPE_CHART,
  });
  assert(created.ok);
  let session = E.createSession(created.value);
  const rng = seededRandom(seed);
  const opponentRng = seededRandom(seed ^ 0x9e3779b9);
  while (session.duel.status !== E.DUEL_STATUS.FINISHED) {
    const duel = session.duel;
    const view = E.getPlayerView(duel, side);
    let pick;
    if (policy === 'tactical')
      pick = E.tacticalPolicy(tacticalObservation(view, 'profile'), duel.typeChart, rng);
    else if (policy === 'weak-first' && duel.exchangesCompleted === 0) {
      const weakest = view.self.availableCategories.reduce((best, c) =>
        view.self.effectiveScores[c] < view.self.effectiveScores[best] ? c : best,
      );
      pick = { ok: true, value: weakest };
    } else pick = E.greedyPolicy(view, rng);
    const otherPick = fixedOrder
      ? { ok: true, value: fixedOrder[duel.exchangesCompleted] }
      : E.tacticalPolicy(
          tacticalObservation(E.getPlayerView(duel, other), 'profile'),
          duel.typeChart,
          opponentRng,
        );
    assert(pick.ok && otherPick.ok);
    // Both choices are made from pre-commit views. Neither policy sees the pending pick.
    for (const [player, selected] of [
      [side, pick.value],
      [other, otherPick.value],
    ]) {
      const committed = E.submit(session, {
        duelId: duel.duelId,
        exchangeId: duel.nextExchangeId,
        side: player,
        pick: selected,
      });
      assert(committed.ok);
      session = committed.value.session;
    }
  }
  return {
    outcome: session.duel.winner === side ? 'win' : session.duel.winner === other ? 'loss' : 'draw',
    history: session.duel.history.map((e) => ({
      subject: side === 'A' ? e.aPick : e.bPick,
      opponent: side === 'A' ? e.bPick : e.aPick,
      winner: e.winner,
    })),
  };
}

const rows = [];
for (const opponent of ['voltik', 'fernlet', 'emberhorn']) {
  for (const [subject, rival] of [
    ['slate', opponent],
    [opponent, 'slate'],
  ]) {
    const fixed = {
      greedy: { win: 0, loss: 0, draw: 0 },
      weakFirst: { win: 0, loss: 0, draw: 0 },
      changed: 0,
      examples: [],
    };
    for (const order of orders) {
      const greedy = match(subject, rival, 'A', 'greedy', 1, order);
      const weak = match(subject, rival, 'A', 'weak-first', 1, order);
      fixed.greedy[greedy.outcome]++;
      fixed.weakFirst[weak.outcome]++;
      if (greedy.outcome !== weak.outcome) {
        fixed.changed++;
        if (fixed.examples.length < 2) fixed.examples.push({ opponentOrder: order, greedy, weak });
      }
      assert.deepEqual(greedy.outcome, match(subject, rival, 'B', 'greedy', 1, order).outcome);
      assert.deepEqual(weak.outcome, match(subject, rival, 'B', 'weak-first', 1, order).outcome);
    }
    const seeded = {
      greedy: { win: 0, loss: 0, draw: 0 },
      tactical: { win: 0, loss: 0, draw: 0 },
      changed: 0,
    };
    for (const seed of seeds) {
      const greedy = match(subject, rival, 'A', 'greedy', seed);
      const tactical = match(subject, rival, 'A', 'tactical', seed);
      assert.equal(tactical.outcome, match(subject, rival, 'B', 'tactical', seed).outcome);
      seeded.greedy[greedy.outcome]++;
      seeded.tactical[tactical.outcome]++;
      if (greedy.outcome !== tactical.outcome) seeded.changed++;
    }
    rows.push({ subject, opponent: rival, fixed, seeded });
  }
}
const output = new URL('../../outputs/battle-study/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL('combat-checkpoint.json', output),
  JSON.stringify(
    {
      fixtureVersion: FIXTURE_VERSION,
      seeds,
      method:
        'Six oriented matchups. Fixed controls: all 24 opposing category orders, strongest-first versus weakest opening then strongest-first. Seeded controls: 30 seeds per oriented matchup, greedy versus clue-based tactical subject, clue-based tactical opponent with separate stable RNG stream. Seeded opponent choices may change when history changes. Uses the actual mobile clue adapter. No clocks, no hidden current picks, no human fun inference. Side-symmetry assertions included.',
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    rows.map(({ fixed, ...row }) => ({ ...row, fixed: { ...fixed, examples: undefined } })),
    null,
    2,
  ),
);
