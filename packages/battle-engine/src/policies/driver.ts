import { submit } from '../session/session.js';
import { DRIVER_REASON, DUEL_STATUS, PLAYER } from '../types.js';
import type { DriverResult, Policy, SessionState } from '../types.js';
import { getPlayerView } from '../view/view.js';

export const runPolicyExchange = (
  session: SessionState,
  policyA: Policy,
  policyB: Policy,
  rngA: () => number,
  rngB: () => number,
): DriverResult => {
  if (session.duel.status === DUEL_STATUS.FINISHED) {
    return { ok: false, reason: DRIVER_REASON.SESSION_NOT_READY };
  }

  if (session.pendingA !== null || session.pendingB !== null) {
    return { ok: false, reason: DRIVER_REASON.SESSION_NOT_READY };
  }

  const viewA = getPlayerView(session.duel, PLAYER.A);
  const viewB = getPlayerView(session.duel, PLAYER.B);

  const pickA = policyA(viewA, rngA);
  if (!pickA.ok) {
    return { ok: false, reason: DRIVER_REASON.POLICY_FAILED, side: PLAYER.A, error: pickA.error };
  }

  const pickB = policyB(viewB, rngB);
  if (!pickB.ok) {
    return { ok: false, reason: DRIVER_REASON.POLICY_FAILED, side: PLAYER.B, error: pickB.error };
  }

  const first = submit(session, {
    duelId: session.duel.duelId,
    exchangeId: session.duel.nextExchangeId,
    side: PLAYER.A,
    pick: pickA.value,
  });
  if (!first.ok) {
    return first;
  }

  const second = submit(first.value.session, {
    duelId: session.duel.duelId,
    exchangeId: session.duel.nextExchangeId,
    side: PLAYER.B,
    pick: pickB.value,
  });
  if (!second.ok) {
    return second;
  }

  return second;
};
