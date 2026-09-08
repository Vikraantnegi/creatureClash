import { describe, expect, it, vi } from 'vitest';

import { CATEGORIES } from '../constants.js';
import { createDuel } from '../duel/duel.js';
import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import { createSession, submit } from '../session/session.js';
import {
  CATEGORY,
  DUEL_STATUS,
  PLAYER,
  TYPE,
  type DuelState,
  type PlayerView,
  type Policy,
  type SessionState,
} from '../types.js';
import { getPlayerView } from '../view/view.js';
import { runPolicyExchange } from './driver.js';
import { greedyPolicy, randomPolicy } from './policies.js';

const ashkit = {
  instanceId: 'ashkit-1',
  speciesId: 'Ashkit',
  typeId: TYPE.FIRE,
  stats: {
    [CATEGORY.ATTACK]: 85,
    [CATEGORY.DEFENSE]: 35,
    [CATEGORY.SPEED]: 70,
    [CATEGORY.SPECIAL]: 50,
  },
};

const brookfin = {
  instanceId: 'brookfin-1',
  speciesId: 'Brookfin',
  typeId: TYPE.WATER,
  stats: {
    [CATEGORY.ATTACK]: 50,
    [CATEGORY.DEFENSE]: 65,
    [CATEGORY.SPEED]: 45,
    [CATEGORY.SPECIAL]: 80,
  },
};

const tiedStats = {
  instanceId: 'tied-a',
  speciesId: 'Tied',
  typeId: TYPE.FIRE,
  stats: {
    [CATEGORY.ATTACK]: 50,
    [CATEGORY.DEFENSE]: 50,
    [CATEGORY.SPEED]: 50,
    [CATEGORY.SPECIAL]: 50,
  },
};

function mustCreate(
  duelId: string,
  creatureA: unknown = ashkit,
  creatureB: unknown = brookfin,
): DuelState {
  const result = createDuel({
    duelId,
    creatureA,
    creatureB,
    typeChart: DEFAULT_TYPE_CHART,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('greedyPolicy', () => {
  it('picks the maximum effective among available and skips spent categories', () => {
    const duel = mustCreate('greedy-skip');
    // Spend ATTACK for A so greedy cannot pick it even if strongest
    let session = createSession(duel);
    const after = submit(session, {
      duelId: duel.duelId,
      exchangeId: 1,
      side: PLAYER.A,
      pick: CATEGORY.ATTACK,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) throw new Error('submit failed');
    session = after.value.session;
    const afterB = submit(session, {
      duelId: duel.duelId,
      exchangeId: 1,
      side: PLAYER.B,
      pick: CATEGORY.ATTACK,
    });
    expect(afterB.ok).toBe(true);
    if (!afterB.ok) throw new Error('submit failed');
    session = afterB.value.session;

    const view = getPlayerView(session.duel, PLAYER.A);
    expect(view.self.availableCategories).not.toContain(CATEGORY.ATTACK);

    const pick = greedyPolicy(view, () => 0);
    expect(pick).toEqual({ ok: true, value: CATEGORY.SPEED });
  });

  it('on tied effectives picks the first category in CATEGORIES order', () => {
    const duel = mustCreate(
      'greedy-tie',
      { ...tiedStats, instanceId: 'tied-a' },
      { ...tiedStats, instanceId: 'tied-b', typeId: TYPE.FIRE },
    );
    const view = getPlayerView(duel, PLAYER.A);
    // All effectives equal — should pick ATTACK (first in CATEGORIES)
    expect(greedyPolicy(view, () => 0)).toEqual({ ok: true, value: CATEGORY.ATTACK });

    // Spend ATTACK; next tie should be DEFENSE
    const usedView: PlayerView = {
      ...view,
      self: {
        ...view.self,
        availableCategories: view.self.availableCategories.filter((c) => c !== CATEGORY.ATTACK),
        usedCategories: [CATEGORY.ATTACK],
      },
    };
    expect(greedyPolicy(usedView, () => 0)).toEqual({ ok: true, value: CATEGORY.DEFENSE });
  });

  it('fails when no legal category remains', () => {
    const duel = mustCreate('greedy-empty');
    const view = getPlayerView(duel, PLAYER.A);
    const empty: PlayerView = {
      ...view,
      self: { ...view.self, availableCategories: [] },
    };
    expect(greedyPolicy(empty, () => 0)).toEqual({
      ok: false,
      error: 'no_legal_category',
    });
  });
});

describe('randomPolicy', () => {
  it('maps half-open buckets: 0 → first, just below 1 → last', () => {
    const duel = mustCreate('random-buckets');
    const view = getPlayerView(duel, PLAYER.A);
    const n = view.self.availableCategories.length;
    expect(n).toBe(4);

    expect(randomPolicy(view, () => 0)).toEqual({
      ok: true,
      value: view.self.availableCategories[0],
    });
    expect(randomPolicy(view, () => 0.249999)).toEqual({
      ok: true,
      value: view.self.availableCategories[0],
    });
    expect(randomPolicy(view, () => 0.25)).toEqual({
      ok: true,
      value: view.self.availableCategories[1],
    });
    expect(randomPolicy(view, () => 0.999999)).toEqual({
      ok: true,
      value: view.self.availableCategories[n - 1],
    });
  });

  it('rejects NaN, negative, and >= 1 rng values without clamping', () => {
    const duel = mustCreate('random-rng');
    const view = getPlayerView(duel, PLAYER.A);

    expect(randomPolicy(view, () => NaN)).toEqual({ ok: false, error: 'invalid_rng' });
    expect(randomPolicy(view, () => -0.01)).toEqual({ ok: false, error: 'invalid_rng' });
    expect(randomPolicy(view, () => 1)).toEqual({ ok: false, error: 'invalid_rng' });
    expect(randomPolicy(view, () => 1.5)).toEqual({ ok: false, error: 'invalid_rng' });
    expect(randomPolicy(view, () => Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      error: 'invalid_rng',
    });
  });

  it('fixed sequences are repeatable', () => {
    const duel = mustCreate('random-repeat');
    const view = getPlayerView(duel, PLAYER.A);
    const seq = [0.1, 0.4, 0.7, 0.9];

    const first = seq.map((r) => randomPolicy(view, () => r));
    const second = seq.map((r) => randomPolicy(view, () => r));
    expect(first).toEqual(second);
    expect(first.every((r) => r.ok)).toBe(true);
  });

  it('fails bucket tests for a constant-first stub (guard against weak tests)', () => {
    const constantFirst: Policy = (view) => {
      const first = view.self.availableCategories[0];
      if (!first) return { ok: false, error: 'no_legal_category' };
      return { ok: true, value: first };
    };

    const duel = mustCreate('random-not-stub');
    const view = getPlayerView(duel, PLAYER.A);
    const stubPick = constantFirst(view, () => 0.9);
    const realPick = randomPolicy(view, () => 0.9);
    expect(stubPick.ok && realPick.ok).toBe(true);
    if (!stubPick.ok || !realPick.ok) throw new Error('expected ok');
    expect(stubPick.value).not.toBe(realPick.value);
    expect(realPick.value).toBe(view.self.availableCategories[3]);
  });
});

describe('runPolicyExchange', () => {
  it('rejects finished or pending sessions before running policies', () => {
    const finishedSession = createSession(mustCreate('driver-finished'));
    // Force finished by mutating a copy for the precondition test
    const finished: SessionState = {
      ...finishedSession,
      duel: { ...finishedSession.duel, status: DUEL_STATUS.FINISHED },
    };
    const policy = vi.fn(greedyPolicy);
    const rejected = runPolicyExchange(
      finished,
      policy,
      policy,
      () => 0,
      () => 0,
    );
    expect(rejected).toEqual({ ok: false, reason: 'session_not_ready' });
    expect(policy).not.toHaveBeenCalled();

    const pending = createSession(mustCreate('driver-pending'));
    const withPending: SessionState = { ...pending, pendingA: CATEGORY.ATTACK };
    const policy2 = vi.fn(greedyPolicy);
    expect(
      runPolicyExchange(
        withPending,
        policy2,
        policy2,
        () => 0,
        () => 0,
      ),
    ).toEqual({
      ok: false,
      reason: 'session_not_ready',
    });
    expect(policy2).not.toHaveBeenCalled();
  });

  it('stops when a policy fails and does not submit', () => {
    const session = createSession(mustCreate('driver-policy-fail'));
    const fail: Policy = () => ({ ok: false, error: 'boom' });
    const okSpy = vi.fn(greedyPolicy);

    const result = runPolicyExchange(
      session,
      fail,
      okSpy,
      () => 0,
      () => 0,
    );
    expect(result).toEqual({
      ok: false,
      reason: 'policy_failed',
      side: PLAYER.A,
      error: 'boom',
    });
    expect(okSpy).not.toHaveBeenCalled();
    expect(session.pendingA).toBeNull();
  });

  it('enforces the info boundary with instrumented policies', () => {
    const session = createSession(mustCreate('driver-boundary'));
    let callsA = 0;
    let callsB = 0;
    let observedA: PlayerView | undefined;
    let observedB: PlayerView | undefined;

    const policyA: Policy = (view) => {
      callsA += 1;
      observedA = view;
      // Mutate received view deeply
      view.self.creature.stats[CATEGORY.ATTACK] = 999;
      view.self.availableCategories.length = 0;
      view.self.availableCategories.push(CATEGORY.SPECIAL);
      view.history.push({
        exchangeId: 99,
        exchangeNumber: 99,
        aPick: CATEGORY.ATTACK,
        bPick: CATEGORY.ATTACK,
        aRawStat: 0,
        bRawStat: 0,
        aTypeFactor: 10,
        bTypeFactor: 10,
        aEffective: 0,
        bEffective: 0,
        exchangeWinner: 'tie',
        damageToA: 0,
        damageToB: 0,
        hpA: 0,
        hpB: 0,
        isAutomaticFourth: false,
      });
      return { ok: true, value: CATEGORY.ATTACK };
    };

    const policyB: Policy = (view) => {
      callsB += 1;
      observedB = view;
      return { ok: true, value: CATEGORY.SPECIAL };
    };

    const result = runPolicyExchange(
      session,
      policyA,
      policyB,
      () => 0,
      () => 0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('driver failed');

    expect(callsA).toBe(1);
    expect(callsB).toBe(1);
    expect(observedA).toBeDefined();
    expect(observedB).toBeDefined();
    if (!observedA || !observedB) throw new Error('missing observations');

    // B still received correct pre-exchange information
    expect(observedB.self.availableCategories).toEqual([...CATEGORIES]);
    expect(observedB.self.creature.stats[CATEGORY.ATTACK]).toBe(brookfin.stats[CATEGORY.ATTACK]);
    expect(observedB.history).toEqual([]);
    expect(observedB.exchangesCompleted).toBe(0);

    // Neither observation contains pending commitments (PlayerView has none)
    expect('pendingA' in observedA).toBe(false);
    expect('pendingB' in observedB).toBe(false);
    expect(observedA.duelId).toBe(observedB.duelId);
    expect(observedA.currentExchangeId).toBe(observedB.currentExchangeId);
    expect(observedA.currentExchangeId).toBe(1);

    // Caller session untouched; result advanced with cleared pending
    expect(session.pendingA).toBeNull();
    expect(session.pendingB).toBeNull();
    expect(result.value.advanced).toBe(true);
    expect(result.value.session.pendingA).toBeNull();
    expect(result.value.session.pendingB).toBeNull();

    // Underlying duel for B was not corrupted by A's mutations
    expect(session.duel.creatureA.stats[CATEGORY.ATTACK]).toBe(ashkit.stats[CATEGORY.ATTACK]);
  });

  it('returns the session from the second successful submit', () => {
    const session = createSession(mustCreate('driver-success'));
    const result = runPolicyExchange(
      session,
      () => ({ ok: true, value: CATEGORY.SPEED }),
      () => ({ ok: true, value: CATEGORY.DEFENSE }),
      () => 0,
      () => 0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value.advanced).toBe(true);
    expect(result.value.session.duel.exchangesCompleted).toBe(1);
    expect(result.value.session.duel.usedA).toContain(CATEGORY.SPEED);
    expect(result.value.session.duel.usedB).toContain(CATEGORY.DEFENSE);
  });
});
