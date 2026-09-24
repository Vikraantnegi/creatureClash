import * as E from '@creature-clash/battle-engine';
import * as F from '@creature-clash/battle-fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const candidates = [
  ['baseline', [60, 60, 60, 60]],
  ['defensive', [65, 80, 35, 60]],
  ['bulky', [70, 85, 35, 50]],
  ['polarized', [75, 90, 30, 45]],
  ['defense-specialist', [70, 90, 35, 45]],
  ['moderate-attack', [65, 85, 40, 50]],
];
const permutations = (xs) =>
  xs.length
    ? xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j)).map((p) => [x, ...p]))
    : [[]];
const orders = permutations(E.CATEGORIES);
function advance(s, aPick, bPick) {
  const r = E.advanceDuel(s, { duelId: s.duelId, exchangeId: s.nextExchangeId, aPick, bPick });
  assert(r.ok);
  return r.value.nextState;
}
function analyze(s) {
  const cache = new Map();
  const legal = (s, side) => E.getPlayerView(s, side).self.availableCategories;
  function force(s, side) {
    if (s.status === 'finished') return s.winner === side;
    const k = `${side}:${s.hpA}:${s.hpB}:${[...s.usedA].sort()}:${[...s.usedB].sort()}`;
    if (cache.has(k)) return cache.get(k);
    const other = side === 'A' ? 'B' : 'A';
    const yes = legal(s, side).some((a) =>
      legal(s, other).every((b) =>
        force(advance(s, side === 'A' ? a : b, side === 'A' ? b : a), side),
      ),
    );
    cache.set(k, yes);
    return yes;
  }
  const outcomes = { A: 0, B: 0, draw: 0 },
    examples = {};
  for (const a of orders)
    for (const b of orders) {
      let next = s,
        i = 0;
      while (next.status !== 'finished') {
        next = advance(next, a[i], b[i]);
        i++;
      }
      outcomes[next.winner]++;
      examples[next.winner] ??= next.history;
    }
  return {
    forceSlate: force(s, 'A'),
    forceOpponent: force(s, 'B'),
    sequenceOutcomes: outcomes,
    examples,
  };
}
const results = [];
for (const [name, values] of candidates) {
  assert.equal(
    values.reduce((a, b) => a + b),
    240,
  );
  const stats = Object.fromEntries(E.CATEGORIES.map((c, i) => [c, values[i]]));
  const matchups = [];
  for (const f of F.FIXTURES.filter((f) => f.id !== 'slate')) {
    const r = E.createDuel({
      duelId: name + '-' + f.id,
      creatureA: { ...F.creatureFor('slate', 'a'), stats },
      creatureB: F.creatureFor(f.id, 'b'),
      typeChart: E.DEFAULT_TYPE_CHART,
    });
    assert(r.ok);
    matchups.push({ opponent: f.id, ...analyze(r.value) });
  }
  results.push({
    name,
    stats,
    matchups,
    forcedPairings: matchups.filter((m) => m.forceSlate || m.forceOpponent).length,
    unavoidablePairings: matchups.filter((m) => Object.values(m.sequenceOutcomes).includes(576))
      .length,
  });
}
const output = new URL('../../outputs/battle-study/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL('slate-balance-results.json', output),
  JSON.stringify(
    {
      fixtureVersion: F.FIXTURE_VERSION,
      method:
        'Exact engine transitions. Exhaustive 24x24 category orders, not human win rates. Pure-strategy forced-win search against all opposing commitments; no peeking at current choice. Slate is always side A. Only Slate stats vary, all totals 240.',
      results,
    },
    null,
    2,
  ),
);
for (const r of results)
  console.log(JSON.stringify({ ...r, matchups: r.matchups.map(({ examples, ...m }) => m) }));
