import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../constants.js';
import { advanceDuel } from '../duel/duel.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import {
  DUEL_STATUS,
  DUEL_WINNER,
  PLAYER,
  TYPE,
  type CreatureSnapshot,
  type DuelState,
  type Result,
} from '../types.js';
import {
  createGym,
  commitGymTeam,
  commitGymDeployment,
  recordGymDuel,
  exchangeGymCreatures,
  getGymView,
} from './gym.js';
import type { GymState } from './types.js';
const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
function creature(id: string, power: number): CreatureSnapshot {
  return {
    instanceId: id,
    speciesId: 'shared-species',
    typeId: TYPE.FIRE,
    stats: { ATTACK: power, DEFENSE: power, SPEED: power, SPECIAL: power },
  };
}
function setup(powers = [30, 10, 20]) {
  return unwrap(
    createGym({
      encounterId: 'gym',
      rosters: {
        A: Array.from({ length: 6 }, (_, i) => creature(`a${i}`, powers[i % 3]!)),
        B: Array.from({ length: 6 }, (_, i) => creature(`b${i}`, 20)),
      },
      typeChart: DEFAULT_TYPE_CHART,
    }),
  );
}
function team(state: GymState) {
  for (const side of [PLAYER.A, PLAYER.B])
    state = unwrap(
      commitGymTeam(state, {
        encounterId: 'gym',
        side,
        round: 1,
        creatures: [0, 1, 2].map((i) => `${side.toLowerCase()}${i}`),
      }),
    );
  return state;
}
function deploy(state: GymState, a: string, b: string) {
  const round = state.completed.length + 1;
  state = unwrap(
    commitGymDeployment(state, { encounterId: 'gym', side: PLAYER.A, round, creature: a }),
  );
  return unwrap(
    commitGymDeployment(state, { encounterId: 'gym', side: PLAYER.B, round, creature: b }),
  );
}
function finish(initial: DuelState) {
  let duel = initial;
  for (const pick of CATEGORIES) {
    if (duel.status === DUEL_STATUS.FINISHED) break;
    const result = advanceDuel(duel, {
      duelId: duel.duelId,
      exchangeId: duel.nextExchangeId,
      aPick: pick,
      bPick: pick,
    });
    if (!result.ok) throw new Error(result.reason);
    duel = result.value.nextState;
  }
  return duel;
}
function completed(powers = [30, 30, 30]) {
  let state = team(setup(powers));
  for (let i = 0; i < 3; i++) {
    state = deploy(state, `a${i}`, `b${i}`);
    state = unwrap(recordGymDuel(state, finish(state.activeDuel!)));
  }
  return state;
}

describe('gym teams and deployment', () => {
  it('requires six per owner and globally unique instance IDs; copies input data', () => {
    const source = setup();
    expect(
      createGym({ ...source, rosters: { ...source.rosters, A: source.rosters.A.slice(0, 5) } }).ok,
    ).toBe(false);
    expect(createGym({ ...source, rosters: { A: source.rosters.A, B: source.rosters.A } }).ok).toBe(
      false,
    );
    const copy = unwrap(createGym(source));
    source.rosters.A[0]!.stats.ATTACK = 999;
    expect(copy.rosters.A[0]!.stats.ATTACK).toBe(30);
  });
  it('locks three unique owned instances and rejects stale, foreign, duplicate and replacement commits', () => {
    const state = setup();
    const action = { encounterId: 'gym', side: PLAYER.A, round: 1, creatures: ['a0', 'a1', 'a2'] };
    for (const creatures of [['a0', 'a0', 'a1'], ['a0', 'b0', 'a1'], ['a0']])
      expect(commitGymTeam(state, { ...action, creatures }).ok).toBe(false);
    expect(commitGymTeam(state, { ...action, encounterId: 'old' }).ok).toBe(false);
    expect(commitGymTeam(state, { ...action, round: 2 }).ok).toBe(false);
    const locked = unwrap(commitGymTeam(state, action));
    action.creatures[0] = 'a5';
    expect(locked.selected.A).toEqual(['a0', 'a1', 'a2']);
    expect(commitGymTeam(locked, action).ok).toBe(false);
    expect(state.selected.A).toBeNull();
  });
  it('shows six public previews but no opponent team or deployment pick; views are isolated', () => {
    let state = setup();
    const before = getGymView(state, PLAYER.A);
    state = unwrap(
      commitGymTeam(state, {
        encounterId: 'gym',
        side: PLAYER.B,
        round: 1,
        creatures: ['b2', 'b3', 'b4'],
      }),
    );
    expect(getGymView(state, PLAYER.A)).toEqual({ ...before, opponentCommitted: true });
    expect(before.opponentRoster).toHaveLength(6);
    expect(before.opponentRoster[0]).not.toHaveProperty('stats');
    state = unwrap(
      commitGymTeam(state, {
        encounterId: 'gym',
        side: PLAYER.A,
        round: 1,
        creatures: ['a0', 'a1', 'a2'],
      }),
    );
    const ready = getGymView(state, PLAYER.A);
    state = unwrap(
      commitGymDeployment(state, { encounterId: 'gym', side: PLAYER.B, round: 1, creature: 'b3' }),
    );
    expect(getGymView(state, PLAYER.A)).toEqual({ ...ready, opponentCommitted: true });
    ready.roster[0]!.stats.ATTACK = 999;
    ready.available.pop();
    expect(getGymView(state, PLAYER.B).opponentRoster[0]).not.toHaveProperty('stats');
    expect(getGymView(state, PLAYER.A).available).toHaveLength(3);
    expect(state.rosters.A[0]!.stats.ATTACK).toBe(30);
  });
  it('resolves either commitment order equally and permits free order but never reuse', () => {
    const state = team(setup());
    const a = { encounterId: 'gym', side: PLAYER.A, round: 1, creature: 'a2' };
    const b = { encounterId: 'gym', side: PLAYER.B, round: 1, creature: 'b0' };
    const first = unwrap(commitGymDeployment(state, a));
    expect(first.activeDuel).toBeNull();
    expect(commitGymDeployment(first, { ...a, creature: 'a1' }).ok).toBe(false);
    const ab = unwrap(commitGymDeployment(first, b));
    const ba = unwrap(commitGymDeployment(unwrap(commitGymDeployment(state, b)), a));
    expect(ab).toEqual(ba);
    expect(ab.activeDuel).toMatchObject({
      hpA: 2,
      hpB: 2,
      usedA: [],
      usedB: [],
      creatureA: { instanceId: 'a2' },
    });
    const next = unwrap(recordGymDuel(ab, finish(ab.activeDuel!)));
    expect(commitGymDeployment(next, { ...a, round: 2 }).ok).toBe(false);
    expect(commitGymDeployment(next, { ...a, round: 2, creature: 'a5' }).ok).toBe(false);
    expect(commitGymDeployment(next, { ...a, creature: 'a1' }).ok).toBe(false);
    const second = deploy(next, 'a0', 'b1');
    expect(second.activeDuel).toMatchObject({ hpA: 2, usedA: [], history: [] });
  });
  it('validates completions and plays all three even after two wins', () => {
    let state = team(setup([30, 30, 30]));
    let old: DuelState | null = null;
    for (let i = 0; i < 3; i++) {
      state = deploy(state, `a${i}`, `b${i}`);
      expect(recordGymDuel(state, state.activeDuel!).ok).toBe(false);
      if (old) expect(recordGymDuel(state, old).ok).toBe(false);
      old = finish(state.activeDuel!);
      expect(recordGymDuel(state, { ...old, hpA: 99 }).ok).toBe(false);
      state = unwrap(recordGymDuel(state, old));
      expect(recordGymDuel(state, old).ok).toBe(false);
      if (i < 2) expect(state.phase).toBe('deployment');
    }
    expect(state.phase).toBe('exchange');
    expect(state.winner).toBe(DUEL_WINNER.A);
  });
});

describe('gym ownership exchange', () => {
  it.each([
    ['A', [30, 30, 30]],
    ['B', [10, 10, 10]],
  ] as const)(
    'atomically exchanges actual instances for winner %s and preserves six per owner',
    (winner, powers) => {
      const state = completed([...powers]);
      const before = structuredClone(state);
      const side = winner === 'A' ? PLAYER.A : PLAYER.B;
      const loser = side === PLAYER.A ? PLAYER.B : PLAYER.A;
      const give = `${side.toLowerCase()}1`,
        receive = `${loser.toLowerCase()}2`;
      const result = unwrap(
        exchangeGymCreatures(state, { encounterId: 'gym', side, swap: { give, receive } }),
      );
      expect(result.rosters[side].some((c) => c.instanceId === give)).toBe(false);
      expect(result.rosters[loser].some((c) => c.instanceId === receive)).toBe(false);
      expect(result.rosters[side].find((c) => c.instanceId === receive)).toEqual(
        state.rosters[loser][2],
      );
      expect(result.rosters[loser].find((c) => c.instanceId === give)).toEqual(
        state.rosters[side][1],
      );
      expect(result.rosters.A).toHaveLength(6);
      expect(result.rosters.B).toHaveLength(6);
      expect(
        new Set([...result.rosters.A, ...result.rosters.B].map((c) => c.instanceId)).size,
      ).toBe(12);
      expect(result.completed).toEqual(state.completed);
      expect(state).toEqual(before);
      expect(exchangeGymCreatures(result, { encounterId: 'gym', side, swap: null }).ok).toBe(false);
      const next = unwrap(createGym({ ...result, encounterId: 'next' }));
      expect(next.rosters).toEqual(result.rosters);
      expect(next.selected).toEqual({ A: null, B: null });
    },
  );
  it('rejects loser, stale and nonparticipating exchanges; decline leaves rosters unchanged', () => {
    const state = completed();
    expect(exchangeGymCreatures(state, { encounterId: 'gym', side: PLAYER.B, swap: null }).ok).toBe(
      false,
    );
    expect(exchangeGymCreatures(state, { encounterId: 'old', side: PLAYER.A, swap: null }).ok).toBe(
      false,
    );
    for (const swap of [
      { give: 'a5', receive: 'b0' },
      { give: 'a0', receive: 'b5' },
      { give: 'b0', receive: 'a0' },
    ])
      expect(exchangeGymCreatures(state, { encounterId: 'gym', side: PLAYER.A, swap }).ok).toBe(
        false,
      );
    const declined = unwrap(
      exchangeGymCreatures(state, { encounterId: 'gym', side: PLAYER.A, swap: null }),
    );
    expect(declined.phase).toBe('finished');
    expect(declined.rosters).toEqual(state.rosters);
  });
  it('gives neither side an exchange on a drawn encounter', () => {
    const state = completed([30, 10, 20]);
    expect(state.winner).toBe(DUEL_WINNER.DRAW);
    expect(state.phase).toBe('finished');
    expect(getGymView(state, PLAYER.A).score).toEqual({ a: 1, b: 1 });
    expect(
      exchangeGymCreatures(state, {
        encounterId: 'gym',
        side: PLAYER.A,
        swap: { give: 'a0', receive: 'b0' },
      }).ok,
    ).toBe(false);
  });
});
