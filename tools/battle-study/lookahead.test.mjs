import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDuel,
  advanceDuel,
  CATEGORY,
  DEFAULT_TYPE_CHART,
  PLAYER,
} from '@creature-clash/battle-engine';
import { CREATURES, creatureFor } from '@creature-clash/battle-fixtures';
import { analyzeDuel } from './lookahead.mjs';
import { studyMatch } from './match.mjs';
function duel(a = CREATURES.ASHKIT, b = CREATURES.BROOKFIN) {
  const result = createDuel({
    duelId: 'study',
    creatureA: creatureFor(a, 'a'),
    creatureB: creatureFor(b, 'b'),
    typeChart: DEFAULT_TYPE_CHART,
  });
  assert.ok(result.ok);
  return result.value;
}
test('lookahead preserves a winning sequence; greedy loses, with unchanged inputs', () => {
  const state = duel();
  const before = JSON.stringify(state);
  const analysis = analyzeDuel(state, PLAYER.A, 1);
  assert.notEqual(analysis.pick, CATEGORY.ATTACK);
  assert.equal(analysis.utility, 1);
  assert.equal(studyMatch(state, 'greedy', 'greedy', 11).winner, PLAYER.B);
  assert.equal(studyMatch(state, 'lookahead', 'greedy', 11).winner, PLAYER.A);
  assert.equal(JSON.stringify(state), before);
});
test('draw utility, spent categories, canonical tie choice, and finished input', () => {
  let state = duel(CREATURES.SLATE, CREATURES.SLATE);
  // Equal-score synthetic mirror isolates canonical tie-breaking from roster balance changes.
  const flat = { ATTACK: 60, DEFENSE: 60, SPEED: 60, SPECIAL: 60 };
  state = {
    ...state,
    creatureA: { ...state.creatureA, stats: { ...flat } },
    creatureB: { ...state.creatureB, stats: { ...flat } },
  };
  assert.equal(analyzeDuel(state).pick, CATEGORY.ATTACK);
  assert.ok(Math.abs(analyzeDuel(state).utility - 0.5) < 1e-12);
  const result = advanceDuel(state, {
    duelId: state.duelId,
    exchangeId: 1,
    aPick: CATEGORY.ATTACK,
    bPick: CATEGORY.ATTACK,
  });
  assert.ok(result.ok);
  state = result.value.nextState;
  assert.equal(analyzeDuel(state).pick, CATEGORY.DEFENSE);
  assert.ok(!analyzeDuel(state).choices.some((choice) => choice.pick === CATEGORY.ATTACK));
  for (const pick of [CATEGORY.DEFENSE, CATEGORY.SPEED]) {
    const next = advanceDuel(state, {
      duelId: state.duelId,
      exchangeId: state.nextExchangeId,
      aPick: pick,
      bPick: pick,
    });
    assert.ok(next.ok);
    state = next.value.nextState;
  }
  assert.equal(state.history.length, 4);
  assert.throws(() => analyzeDuel(state), /ongoing/);
});
test('reproduces stochastic traces and supports the B perspective', () => {
  const state = duel();
  assert.deepEqual(
    studyMatch(state, 'lookahead', 'mixed', 29),
    studyMatch(state, 'lookahead', 'mixed', 29),
  );
  const reversed = duel(CREATURES.BROOKFIN, CREATURES.ASHKIT);
  assert.equal(analyzeDuel(state, PLAYER.A).pick, analyzeDuel(reversed, PLAYER.B).pick);
});

for (const [opponent, winning, losing] of [
  [
    CREATURES.FERNLET,
    ['ATTACK:ATTACK', 'DEFENSE:SPEED'],
    ['ATTACK:ATTACK', 'DEFENSE:DEFENSE', 'SPEED:SPEED'],
  ],
  [
    CREATURES.VOLTIK,
    ['ATTACK:ATTACK', 'DEFENSE:DEFENSE'],
    ['ATTACK:SPEED', 'DEFENSE:ATTACK', 'SPEED:SPECIAL'],
  ],
  [
    CREATURES.EMBERHORN,
    ['ATTACK:ATTACK', 'DEFENSE:DEFENSE', 'SPEED:SPEED'],
    ['ATTACK:ATTACK', 'DEFENSE:DEFENSE', 'SPEED:SPECIAL'],
  ],
]) {
  test(`Slate can win and lose against ${opponent} through legal category choices`, () => {
    for (const [sequence, winner] of [
      [winning, PLAYER.A],
      [losing, PLAYER.B],
    ]) {
      let state = duel(CREATURES.SLATE, opponent);
      for (const pair of sequence) {
        const [aPick, bPick] = pair.split(':');
        const result = advanceDuel(state, {
          duelId: state.duelId,
          exchangeId: state.nextExchangeId,
          aPick,
          bPick,
        });
        assert.ok(result.ok);
        state = result.value.nextState;
      }
      assert.equal(state.winner, winner);
    }
  });
}
