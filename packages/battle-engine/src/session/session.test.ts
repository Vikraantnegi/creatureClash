import { describe, expect, it } from 'vitest';

import { DEFAULT_TYPE_CHART } from '../snapshots/defaultTypeChart.js';
import { createDuel, timeoutPick } from '../duel/duel.js';
import {
  CATEGORY,
  DUEL_STATUS,
  PLAYER,
  TYPE,
  type DuelState,
  type SessionState,
} from '../types.js';
import { getPlayerView } from '../view/view.js';
import { createSession, getSessionView, submit } from './session.js';

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

function mustCreate(duelId = 'duel-1'): DuelState {
  const result = createDuel({
    duelId,
    creatureA: ashkit,
    creatureB: brookfin,
    typeChart: DEFAULT_TYPE_CHART,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function mustSubmit(session: SessionState, side: PLAYER, pick: CATEGORY) {
  const result = submit(session, {
    duelId: session.duel.duelId,
    exchangeId: session.duel.nextExchangeId,
    side,
    pick,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('session', () => {
  it('createSession starts with null pending on both sides', () => {
    const session = createSession(mustCreate());
    expect(session.pendingA).toBeNull();
    expect(session.pendingB).toBeNull();
    const viewA = getSessionView(session, PLAYER.A);
    expect(viewA.aCommitted).toBe(false);
    expect(viewA.bCommitted).toBe(false);
  });

  it('first submit does not change public available categories', () => {
    const session = createSession(mustCreate());
    const beforeA = getPlayerView(session.duel, PLAYER.A).self.availableCategories;
    const beforeB = getPlayerView(session.duel, PLAYER.B).self.availableCategories;

    const after = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK);

    expect(getPlayerView(after.session.duel, PLAYER.A).self.availableCategories).toEqual(beforeA);
    expect(getPlayerView(after.session.duel, PLAYER.B).self.availableCategories).toEqual(beforeB);

    const sessionView = getSessionView(after.session, PLAYER.B);
    expect(sessionView.aCommitted).toBe(true);
    expect(sessionView.bCommitted).toBe(false);
    expect(sessionView.view.self.availableCategories).toEqual(beforeB);
  });

  it('duplicate commit returns already_committed and leaves duel + pending unchanged', () => {
    const session = createSession(mustCreate());
    const once = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK);

    const dup = submit(once.session, {
      duelId: once.session.duel.duelId,
      exchangeId: once.session.duel.nextExchangeId,
      side: PLAYER.A,
      pick: CATEGORY.DEFENSE,
    });

    expect(dup).toEqual({ ok: false, reason: 'already_committed', side: PLAYER.A });
    expect(once.session.pendingA).toBe(CATEGORY.ATTACK);
    expect(once.session.pendingB).toBeNull();
    expect(once.session.duel.exchangesCompleted).toBe(0);
  });

  it('invalid first pick creates no commitment', () => {
    const session = createSession(mustCreate());
    const bad = submit(session, {
      duelId: session.duel.duelId,
      exchangeId: session.duel.nextExchangeId,
      side: PLAYER.A,
      pick: 'NOT_A_CATEGORY',
    });

    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error('expected rejection');
    expect(bad.reason).toBe('invalid_category');
    expect(session.pendingA).toBeNull();
    expect(session.pendingB).toBeNull();
  });

  it('invalid second pick preserves the valid first commitment', () => {
    const session = createSession(mustCreate());
    const once = mustSubmit(session, PLAYER.A, CATEGORY.SPEED);

    const bad = submit(once.session, {
      duelId: once.session.duel.duelId,
      exchangeId: once.session.duel.nextExchangeId,
      side: PLAYER.B,
      pick: 42,
    });

    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error('expected rejection');
    expect(bad.reason).toBe('invalid_category');
    expect(once.session.pendingA).toBe(CATEGORY.SPEED);
    expect(once.session.pendingB).toBeNull();
  });

  it('late timeout cannot overwrite a manual commitment', () => {
    const session = createSession(mustCreate());
    const once = mustSubmit(session, PLAYER.A, CATEGORY.DEFENSE);

    const timed = timeoutPick(once.session.duel, PLAYER.A);
    expect(timed.ok).toBe(true);
    if (!timed.ok) throw new Error(timed.error);

    const late = submit(once.session, {
      duelId: once.session.duel.duelId,
      exchangeId: once.session.duel.nextExchangeId,
      side: PLAYER.A,
      pick: timed.value,
    });

    expect(late).toEqual({ ok: false, reason: 'already_committed', side: PLAYER.A });
    expect(once.session.pendingA).toBe(CATEGORY.DEFENSE);
  });

  it('after ordinary resolution both pending are cleared', () => {
    const session = createSession(mustCreate());
    const afterA = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK);
    const afterB = mustSubmit(afterA.session, PLAYER.B, CATEGORY.SPECIAL);

    expect(afterB.advanced).toBe(true);
    expect(afterB.events).toHaveLength(1);
    expect(afterB.session.pendingA).toBeNull();
    expect(afterB.session.pendingB).toBeNull();
    expect(afterB.session.duel.exchangesCompleted).toBe(1);
  });

  it('A-then-B vs B-then-A with same picks yield identical outcomes', () => {
    const base = mustCreate('order-duel');

    const ab1 = mustSubmit(createSession(base), PLAYER.A, CATEGORY.ATTACK);
    const ab2 = mustSubmit(ab1.session, PLAYER.B, CATEGORY.DEFENSE);

    const ba1 = mustSubmit(createSession(base), PLAYER.B, CATEGORY.DEFENSE);
    const ba2 = mustSubmit(ba1.session, PLAYER.A, CATEGORY.ATTACK);

    expect(ab2.session.duel).toEqual(ba2.session.duel);
    expect(ab2.events).toEqual(ba2.events);
  });

  it('rejects stale duel and exchange ids', () => {
    const session = createSession(mustCreate('stale-duel'));

    expect(
      submit(session, {
        duelId: 'other',
        exchangeId: 1,
        side: PLAYER.A,
        pick: CATEGORY.ATTACK,
      }),
    ).toMatchObject({ ok: false, reason: 'wrong_duel' });

    expect(
      submit(session, {
        duelId: 'stale-duel',
        exchangeId: 99,
        side: PLAYER.A,
        pick: CATEGORY.ATTACK,
      }),
    ).toMatchObject({ ok: false, reason: 'wrong_exchange' });
  });

  it('replaying either submission after resolution cannot advance again', () => {
    const session = createSession(mustCreate('replay'));
    const afterA = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK);
    const afterB = mustSubmit(afterA.session, PLAYER.B, CATEGORY.SPECIAL);
    expect(afterB.advanced).toBe(true);

    const replayA = submit(afterB.session, {
      duelId: afterB.session.duel.duelId,
      exchangeId: 1,
      side: PLAYER.A,
      pick: CATEGORY.ATTACK,
    });
    expect(replayA.ok).toBe(false);
    if (replayA.ok) throw new Error('expected rejection');
    expect(replayA.reason === 'wrong_exchange' || replayA.reason === 'category_already_used').toBe(
      true,
    );

    const replayB = submit(afterB.session, {
      duelId: afterB.session.duel.duelId,
      exchangeId: afterB.session.duel.nextExchangeId,
      side: PLAYER.B,
      pick: CATEGORY.SPECIAL,
    });
    expect(replayB.ok).toBe(false);
  });

  it('rejects spent categories without committing', () => {
    let session = createSession(mustCreate('spent'));
    session = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK).session;
    session = mustSubmit(session, PLAYER.B, CATEGORY.ATTACK).session;

    const reuse = submit(session, {
      duelId: session.duel.duelId,
      exchangeId: session.duel.nextExchangeId,
      side: PLAYER.A,
      pick: CATEGORY.ATTACK,
    });
    expect(reuse).toEqual({
      ok: false,
      reason: 'category_already_used',
      side: PLAYER.A,
      pick: CATEGORY.ATTACK,
    });
    expect(session.pendingA).toBeNull();
  });

  it('after KO, further submits are rejected as duel_finished', () => {
    const hi = {
      instanceId: 'hi',
      speciesId: 'hi',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 90,
        [CATEGORY.DEFENSE]: 90,
        [CATEGORY.SPEED]: 90,
        [CATEGORY.SPECIAL]: 90,
      },
    };
    const lo = {
      instanceId: 'lo',
      speciesId: 'lo',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 10,
        [CATEGORY.DEFENSE]: 10,
        [CATEGORY.SPEED]: 10,
        [CATEGORY.SPECIAL]: 10,
      },
    };

    const created = createDuel({
      duelId: 'ko',
      creatureA: hi,
      creatureB: lo,
      typeChart: DEFAULT_TYPE_CHART,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    let session = createSession(created.value);
    session = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK).session;
    session = mustSubmit(session, PLAYER.B, CATEGORY.ATTACK).session;
    session = mustSubmit(session, PLAYER.A, CATEGORY.DEFENSE).session;
    session = mustSubmit(session, PLAYER.B, CATEGORY.DEFENSE).session;
    expect(session.duel.status).toBe(DUEL_STATUS.FINISHED);

    const after = submit(session, {
      duelId: session.duel.duelId,
      exchangeId: session.duel.nextExchangeId,
      side: PLAYER.A,
      pick: CATEGORY.SPEED,
    });
    expect(after).toEqual({ ok: false, reason: 'duel_finished' });
  });

  it('after automatic fourth, session is finished and further submits rejected', () => {
    const a = {
      instanceId: 'a',
      speciesId: 'a',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 50,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 80,
      },
    };
    const b = {
      instanceId: 'b',
      speciesId: 'b',
      typeId: TYPE.FIRE,
      stats: {
        [CATEGORY.ATTACK]: 50,
        [CATEGORY.DEFENSE]: 50,
        [CATEGORY.SPEED]: 50,
        [CATEGORY.SPECIAL]: 40,
      },
    };

    const created = createDuel({
      duelId: 'auto-fourth',
      creatureA: a,
      creatureB: b,
      typeChart: DEFAULT_TYPE_CHART,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);

    let session = createSession(created.value);
    session = mustSubmit(session, PLAYER.A, CATEGORY.ATTACK).session;
    session = mustSubmit(session, PLAYER.B, CATEGORY.ATTACK).session;
    session = mustSubmit(session, PLAYER.A, CATEGORY.DEFENSE).session;
    session = mustSubmit(session, PLAYER.B, CATEGORY.DEFENSE).session;
    session = mustSubmit(session, PLAYER.A, CATEGORY.SPEED).session;
    const third = mustSubmit(session, PLAYER.B, CATEGORY.SPEED);

    expect(third.events.some((e) => e.isAutomaticFourth)).toBe(true);
    expect(third.session.duel.status).toBe(DUEL_STATUS.FINISHED);
    expect(third.session.pendingA).toBeNull();
    expect(third.session.pendingB).toBeNull();

    expect(
      submit(third.session, {
        duelId: third.session.duel.duelId,
        exchangeId: third.session.duel.nextExchangeId,
        side: PLAYER.A,
        pick: CATEGORY.SPECIAL,
      }),
    ).toEqual({ ok: false, reason: 'duel_finished' });
  });

  it('submit never mutates the input session object', () => {
    const session = createSession(mustCreate('immutable'));
    const snapshot = {
      pendingA: session.pendingA,
      pendingB: session.pendingB,
      duelRef: session.duel,
      exchanges: session.duel.exchangesCompleted,
    };

    const result = mustSubmit(session, PLAYER.A, CATEGORY.SPEED);
    expect(session.pendingA).toBe(snapshot.pendingA);
    expect(session.pendingB).toBe(snapshot.pendingB);
    expect(session.duel).toBe(snapshot.duelRef);
    expect(session.duel.exchangesCompleted).toBe(snapshot.exchanges);
    expect(result.session).not.toBe(session);
    expect(result.session.pendingA).toBe(CATEGORY.SPEED);
  });
});
