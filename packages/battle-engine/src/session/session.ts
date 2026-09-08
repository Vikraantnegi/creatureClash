import { advanceDuel } from '../duel/duel.js';
import { DUEL_STATUS, PLAYER, SUBMIT_REASON } from '../types.js';
import type {
  CATEGORY,
  DuelState,
  SessionState,
  SessionView,
  SubmitAction,
  SubmitResult,
} from '../types.js';
import { isCategory } from '../utils.js';
import { getPlayerView } from '../view/view.js';

export const createSession = (duel: DuelState): SessionState => ({
  duel,
  pendingA: null,
  pendingB: null,
});

export const getSessionView = (session: SessionState, side: PLAYER): SessionView => ({
  view: getPlayerView(session.duel, side),
  aCommitted: session.pendingA !== null,
  bCommitted: session.pendingB !== null,
});

export const submit = (session: SessionState, action: SubmitAction): SubmitResult => {
  const { duel } = session;

  if (duel.status === DUEL_STATUS.FINISHED) {
    return { ok: false, reason: SUBMIT_REASON.DUEL_FINISHED };
  }

  if (action.duelId !== duel.duelId) {
    return {
      ok: false,
      reason: SUBMIT_REASON.WRONG_DUEL,
      expected: duel.duelId,
      received: action.duelId,
    };
  }

  if (action.exchangeId !== duel.nextExchangeId) {
    return {
      ok: false,
      reason: SUBMIT_REASON.WRONG_EXCHANGE,
      expected: duel.nextExchangeId,
      received: action.exchangeId,
    };
  }

  const alreadyPending = action.side === PLAYER.A ? session.pendingA : session.pendingB;
  if (alreadyPending !== null) {
    return { ok: false, reason: SUBMIT_REASON.ALREADY_COMMITTED, side: action.side };
  }

  if (!isCategory(action.pick)) {
    return {
      ok: false,
      reason: SUBMIT_REASON.INVALID_CATEGORY,
      side: action.side,
      pick: action.pick,
    };
  }

  const used = action.side === PLAYER.A ? duel.usedA : duel.usedB;
  if (used.includes(action.pick)) {
    return {
      ok: false,
      reason: SUBMIT_REASON.CATEGORY_ALREADY_USED,
      side: action.side,
      pick: action.pick,
    };
  }

  const nextPendingA: CATEGORY | null = action.side === PLAYER.A ? action.pick : session.pendingA;
  const nextPendingB: CATEGORY | null = action.side === PLAYER.B ? action.pick : session.pendingB;

  // No pending picks
  if (nextPendingA === null || nextPendingB === null) {
    return {
      ok: true,
      value: {
        session: {
          duel,
          pendingA: nextPendingA,
          pendingB: nextPendingB,
        },
        events: [],
        advanced: false,
      },
    };
  }

  const advanced = advanceDuel(duel, {
    duelId: duel.duelId,
    exchangeId: duel.nextExchangeId,
    aPick: nextPendingA,
    bPick: nextPendingB,
  });

  if (!advanced.ok) {
    return { ok: false, reason: SUBMIT_REASON.ADVANCE_REJECTED, cause: advanced };
  }

  return {
    ok: true,
    value: {
      session: {
        duel: advanced.value.nextState,
        pendingA: null,
        pendingB: null,
      },
      events: advanced.value.events,
      advanced: true,
    },
  };
};
