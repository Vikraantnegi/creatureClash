import { describe, expect, it } from 'vitest';
import { advanceDuel } from '../duel/duel.js';
import { CATEGORIES } from '../constants.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import {
  DUEL_STATUS,
  DUEL_WINNER,
  TYPE,
  type CreatureSnapshot,
  type DuelState,
  type Result,
} from '../types.js';
import {
  createRun,
  selectRunCreature,
  recordRunDuel,
  swapRunCreature,
  canReplaceRunSlot,
} from './run.js';
import { RUN_PHASE } from './types.js';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
function creature(id: string, power: number): CreatureSnapshot {
  return {
    instanceId: id,
    speciesId: id,
    typeId: TYPE.FIRE,
    stats: { ATTACK: power, DEFENSE: power, SPEED: power, SPECIAL: power },
  };
}
function run(power = 10) {
  return unwrap(
    createRun({
      runId: 'run',
      roster: [creature('a', 100), creature('b', 80), creature('c', 70)],
      opponents: [creature('x', power), creature('y', 5), creature('z', 1)],
      typeChart: DEFAULT_TYPE_CHART,
    }),
  );
}
function finish(initial: DuelState): DuelState {
  let duel = initial;
  for (const pick of CATEGORIES) {
    if (duel.status === DUEL_STATUS.FINISHED) break;
    const step = advanceDuel(duel, {
      duelId: duel.duelId,
      exchangeId: duel.nextExchangeId,
      aPick: pick,
      bPick: pick,
    });
    if (!step.ok) throw new Error(step.reason);
    duel = step.value.nextState;
  }
  return duel;
}
function start(state: ReturnType<typeof run>, slot = 0) {
  return unwrap(
    selectRunCreature(state, { runId: state.runId, opponentIndex: state.opponentIndex, slot }),
  );
}
function win(state: ReturnType<typeof run>) {
  const ready = start(state);
  return unwrap(recordRunDuel(ready, finish(ready.activeDuel!)));
}
function swap(state: ReturnType<typeof run>, replaceSlot: number | null) {
  return unwrap(
    swapRunCreature(state, {
      runId: state.runId,
      duelId: state.completed.at(-1)!.duelId,
      replaceSlot,
    }),
  );
}

describe('swap run', () => {
  it('validates roster shape, distinct species and instance IDs; copies input', () => {
    const input = {
      runId: 'r',
      roster: [creature('a', 10), creature('b', 20), creature('c', 30)],
      opponents: [creature('x', 1), creature('y', 2), creature('z', 3)],
      typeChart: DEFAULT_TYPE_CHART,
    };
    expect(createRun({ ...input, roster: input.roster.slice(1) }).ok).toBe(false);
    expect(
      createRun({
        ...input,
        roster: [input.roster[0]!, { ...input.roster[1]!, speciesId: 'a' }, input.roster[2]!],
      }).ok,
    ).toBe(false);
    expect(
      createRun({ ...input, opponents: [input.roster[0]!, ...input.opponents.slice(1)] }).ok,
    ).toBe(false);
    const state = unwrap(createRun(input));
    input.roster[0]!.stats.ATTACK = 999;
    expect(state.roster[0]!.stats.ATTACK).toBe(10);
  });
  it('replaces one slot, preserves it into a fresh duel, allows reuse, and skips a final swap', () => {
    const original = run();
    const won = win(original);
    expect(won.phase).toBe(RUN_PHASE.SWAPPING);
    const replaced = swap(won, 0);
    expect(original.roster[0]!.speciesId).toBe('a');
    expect(replaced.roster.map((c) => c.speciesId)).toEqual(['x', 'b', 'c']);
    const next = start(replaced);
    expect(next.activeDuel).toMatchObject({
      hpA: 2,
      hpB: 2,
      usedA: [],
      usedB: [],
      creatureA: { speciesId: 'x' },
    });
    const nextWon = unwrap(recordRunDuel(next, finish(next.activeDuel!)));
    const kept = swap(nextWon, null);
    expect(kept.roster).toEqual(replaced.roster);
    const final = win(kept);
    expect(final.phase).toBe(RUN_PHASE.FINISHED);
    expect(final.winner).toBe(DUEL_WINNER.A);
    expect(
      swapRunCreature(final, {
        runId: final.runId,
        duelId: final.completed.at(-1)!.duelId,
        replaceSlot: 0,
      }).ok,
    ).toBe(false);
  });
  it('ends on a loss or draw without a swap', () => {
    expect(win(run(200))).toMatchObject({ phase: RUN_PHASE.FINISHED, winner: DUEL_WINNER.B });
    expect(win(run(100))).toMatchObject({ phase: RUN_PHASE.FINISHED, winner: DUEL_WINNER.DRAW });
  });
  it('rejects unfinished, wrong-participant, duplicate and stale actions without progressing', () => {
    const state = start(run());
    const complete = finish(state.activeDuel!);
    expect(recordRunDuel(state, { ...complete, winner: DUEL_WINNER.B }).ok).toBe(false);
    expect(recordRunDuel(state, { ...complete, history: [] }).ok).toBe(false);
    expect(recordRunDuel(state, state.activeDuel!).ok).toBe(false);
    expect(recordRunDuel(state, { ...complete, creatureB: creature('wrong', 10) }).ok).toBe(false);
    const won = unwrap(recordRunDuel(state, complete));
    expect(recordRunDuel(won, complete).ok).toBe(false);
    const next = swap(won, null);
    expect(
      swapRunCreature(next, { runId: state.runId, duelId: complete.duelId, replaceSlot: 0 }).ok,
    ).toBe(false);
    expect(selectRunCreature(next, { runId: state.runId, opponentIndex: 0, slot: 0 }).ok).toBe(
      false,
    );
    expect(selectRunCreature(next, { runId: state.runId, opponentIndex: 1, slot: 99 }).ok).toBe(
      false,
    );
    expect(state.completed).toHaveLength(0);
  });
  it('allows replacing the matching species slot but rejects a duplicate in another slot', () => {
    const state = run();
    state.opponents[0]!.speciesId = 'b';
    const won = win(state);
    expect(canReplaceRunSlot(won, 0)).toBe(false);
    expect(canReplaceRunSlot(won, 1)).toBe(true);
    expect(
      swapRunCreature(won, { runId: won.runId, duelId: won.completed[0]!.duelId, replaceSlot: 0 })
        .ok,
    ).toBe(false);
  });
});
