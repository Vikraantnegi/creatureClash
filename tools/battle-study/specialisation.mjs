import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as E from '@creature-clash/battle-engine';
import { FIXTURES, FIXTURE_VERSION, creatureFor } from '@creature-clash/battle-fixtures';

const unwrap = (r) => {
  assert(r.ok, r.error ?? r.reason);
  return r.value;
};
function creature(species, id, budget, cap, style) {
  const allocation = E.emptyTrainingAllocation();
  let remaining = budget;
  if (style === 'balanced') {
    while (remaining)
      for (const category of E.CATEGORIES)
        if (remaining && allocation[category] < cap) {
          allocation[category]++;
          remaining--;
        }
  } else {
    const offset = Number(style);
    for (let i = 0; i < 4; i++) {
      const category = E.CATEGORIES[(offset + i) % 4];
      allocation[category] = Math.min(cap, remaining);
      remaining -= allocation[category];
    }
  }
  assert.equal(remaining, 0);
  const progress = unwrap(
    E.createCreatureProgress(creatureFor(species, id), E.LEVEL_XP[budget / 2], allocation),
  );
  return unwrap(E.getProgressionView(progress)).creature;
}
function analyze(a, b) {
  const initial = unwrap(
    E.createDuel({
      duelId: 'allocation-study',
      creatureA: a,
      creatureB: b,
      typeChart: E.DEFAULT_TYPE_CHART,
    }),
  );
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
    const legalA = E.CATEGORIES.filter((c) => !state.usedA.includes(c)),
      legalB = E.CATEGORIES.filter((c) => !state.usedB.includes(c));
    const matrix = legalA.map((aPick) =>
      legalB.map((bPick) =>
        visit(
          unwrap(
            E.advanceDuel(state, {
              duelId: state.duelId,
              exchangeId: state.nextExchangeId,
              aPick,
              bPick,
            }),
          ).nextState,
        ),
      ),
    );
    const result = {
      forceA: matrix.some((row) => row.every((entry) => entry.forceA)),
      forceB: legalB.some((_, index) => matrix.every((row) => row[index].forceB)),
      possibleA: matrix.some((row) => row.some((entry) => entry.possibleA)),
      possibleB: matrix.some((row) => row.some((entry) => entry.possibleB)),
    };
    assert(!(result.forceA && result.forceB));
    memo.set(key, result);
    return result;
  }
  return visit(initial);
}
const styles = ['balanced', '0', '1', '2', '3'];
const baseline = new Map();
for (const a of FIXTURES)
  for (const b of FIXTURES)
    baseline.set(
      `${a.id}:${b.id}`,
      analyze(creature(a.id, 'a', 0, 8, 'balanced'), creature(b.id, 'b', 0, 8, 'balanced')),
    );
const rows = [];
for (const [budget, cap] of [
  [8, 4],
  [8, 8],
  [12, 6],
  [18, 8],
]) {
  for (const opponentBudget of [0, budget]) {
    const cases = [];
    for (const a of FIXTURES)
      for (const b of FIXTURES)
        for (const styleA of styles)
          for (const styleB of opponentBudget ? styles : ['balanced']) {
            const outcome = analyze(
              creature(a.id, 'a', budget, cap, styleA),
              creature(b.id, 'b', opponentBudget, cap, styleB),
            );
            const start = baseline.get(`${a.id}:${b.id}`);
            cases.push({
              a: a.id,
              b: b.id,
              styleA,
              styleB,
              mirror: a.id === b.id,
              ...outcome,
              newlyForcedA: outcome.forceA && !start.forceA,
              newlyNoWinB: !outcome.possibleB && start.possibleB,
            });
          }
    const summary = (items) => ({
      cases: items.length,
      forcedA: items.filter((c) => c.forceA).length,
      newlyForcedA: items.filter((c) => c.newlyForcedA).length,
      noWinningSequenceB: items.filter((c) => !c.possibleB).length,
      newlyNoWinB: items.filter((c) => c.newlyNoWinB).length,
      bothCanWin: items.filter((c) => c.possibleA && c.possibleB).length,
    });
    rows.push({
      budget,
      cap,
      opponentBudget,
      distinct: summary(cases.filter((c) => !c.mirror)),
      mirrors: summary(cases.filter((c) => c.mirror)),
      uniformControl: summary(
        cases.filter((c) => !c.mirror && c.styleA === 'balanced' && c.styleB === 'balanced'),
      ),
      cases,
    });
  }
}
const report = {
  fixtureVersion: FIXTURE_VERSION,
  rulesVersion: E.PROGRESSION_RULES_VERSION,
  method:
    'Production progression snapshots and duel transitions. All 36 ordered pairs; balanced allocation plus four rotated concentration builds, at budgets 8/caps4 and8, 12/cap6, 18/cap8. Each versus untrained and equal-budget opponents. Exact existence of winning sequences and pure-strategy forced wins, not a mixed-strategy equilibrium or player win rate. Five sampled builds do not exhaust every legal allocation. Separate mirrors and distinct species; balanced allocations are matched-budget controls. This diagnoses possibility, not fun or multiplayer fairness.',
  rows,
};
const output = new URL('../../outputs/battle-study/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('specialisation-results.json', output), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    rows.map(({ cases, ...summary }) => summary),
    null,
    2,
  ),
);
