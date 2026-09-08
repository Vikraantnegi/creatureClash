import {
  createDuel,
  createSession,
  DEFAULT_TYPE_CHART,
  DUEL_STATUS,
  DUEL_WINNER,
  getPlayerView,
  getSessionView,
  greedyPolicy,
  PLAYER,
  randomPolicy,
  submit,
  timeoutPick,
  type CATEGORY,
  type ExchangeResultEvent,
  type PlayerView,
  type SessionState,
} from '@creature-clash/battle-engine';

import { creatureFor, type FixtureId } from './fixtures';

export const SELECTION_MS = 10_000;
export const COMMITMENT_MS = 400;
export type AiMode = 'greedy' | 'random';
export type BattlePhase = 'ready' | 'selecting' | 'committed' | 'reveal' | 'finished' | 'error';
export type Matchup = { yours: FixtureId; opponent: FixtureId; ai: AiMode };
export type BattleDisplay = {
  phase: BattlePhase;
  matchup: Matchup;
  view: PlayerView;
  paused: boolean;
  remainingMs: number;
  choice: CATEGORY | null;
  choiceSource: 'manual' | 'timeout' | null;
  reveal: ExchangeResultEvent | null;
  // UI callbacks carry the token captured when their controls were rendered.
  actionKey: string;
  error: string | null;
};

type Timer = ReturnType<typeof setTimeout>;
export type BattleClock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => Timer;
  cancel: (timer: Timer) => void;
};
type Options = {
  clock?: BattleClock;
  rng?: () => number;
  nextDuelId?: () => string;
  initiallyActive?: boolean;
};

let duelSequence = 0;
const systemClock: BattleClock = {
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: (timer) => clearTimeout(timer),
};

// Presentation only: apply an already-resolved event. No comparison or damage math.
function presentEvent(view: PlayerView, event: ExchangeResultEvent): PlayerView {
  return {
    ...view,
    status: DUEL_STATUS.ONGOING,
    winner: DUEL_WINNER.NONE,
    currentExchangeId: null,
    exchangesCompleted: event.exchangeNumber,
    history: [...view.history, { ...event }],
    self: {
      ...view.self,
      hp: event.hpA,
      usedCategories: [...view.self.usedCategories, event.aPick],
      availableCategories: [],
    },
    opponent: {
      ...view.opponent,
      hp: event.hpB,
      usedCategories: [...view.opponent.usedCategories, event.bPick],
      availableCategories: [],
    },
  };
}

/** Mobile controller owns timing and the session. Components only receive display data. */
export function createBattleController(options: Options = {}) {
  const clock = options.clock ?? systemClock;
  const rng = options.rng ?? Math.random;
  const nextDuelId = options.nextDuelId ?? (() => `mobile-${Date.now()}-${++duelSequence}`);
  const listeners = new Set<() => void>();
  let active = options.initiallyActive ?? true;
  let disposed = false;
  let timer: Timer | null = null;
  let generation = 0;
  let deadline: number | null = null;
  let phaseTimeLeft = SELECTION_MS;
  let queuedEvents: ExchangeResultEvent[] = [];
  let session: SessionState;
  let display: BattleDisplay;

  function publish(patch: Partial<BattleDisplay> = {}) {
    display = { ...display, ...patch };
    listeners.forEach((listener) => listener());
  }

  function cancelTimer() {
    generation += 1;
    if (timer !== null) clock.cancel(timer);
    timer = null;
    deadline = null;
  }

  function fail(message: string) {
    cancelTimer();
    queuedEvents = [];
    publish({ phase: 'error', error: message });
  }

  function prepare(matchup: Matchup) {
    cancelTimer();
    queuedEvents = [];
    const duelId = nextDuelId();
    const created = createDuel({
      duelId,
      creatureA: creatureFor(matchup.yours, `${duelId}-a`),
      creatureB: creatureFor(matchup.opponent, `${duelId}-b`),
      typeChart: DEFAULT_TYPE_CHART,
    });
    if (!created.ok) throw new Error(created.error); // These are local, validated fixtures.
    session = createSession(created.value);
    display = {
      phase: 'ready',
      matchup: { ...matchup },
      view: getSessionView(session, PLAYER.A).view,
      paused: !active,
      remainingMs: SELECTION_MS,
      choice: null,
      choiceSource: null,
      reveal: null,
      actionKey: `${duelId}:ready`,
      error: null,
    };
    publish();
  }

  function revealNext() {
    cancelTimer();
    const event = queuedEvents.shift();
    if (!event) {
      fail('The exchange did not return a reveal. Restart the duel.');
      return;
    }
    publish({
      phase: 'reveal',
      reveal: { ...event },
      view: presentEvent(display.view, event),
      actionKey: `${session.duel.duelId}:reveal:${event.exchangeId}`,
    });
  }

  function armTimer(duration: number) {
    cancelTimer();
    phaseTimeLeft = duration;
    if (!active || disposed) return;
    deadline = clock.now() + duration;
    const ticket = generation;
    const actionKey = display.actionKey;
    const tick = () => {
      if (disposed || !active || ticket !== generation || actionKey !== display.actionKey) return;
      phaseTimeLeft = Math.max(0, (deadline ?? clock.now()) - clock.now());
      if (display.phase === 'selecting') publish({ remainingMs: phaseTimeLeft });
      if (phaseTimeLeft <= 0) {
        if (display.phase === 'selecting') commitTimeout();
        else if (display.phase === 'committed') revealNext();
        return;
      }
      timer = clock.schedule(tick, Math.min(100, phaseTimeLeft));
    };
    timer = clock.schedule(tick, Math.min(100, duration));
  }

  function openSelection() {
    const duel = session.duel;
    // Select and lock B before enabling the human's controls. No pending pick is a policy input.
    const policy = display.matchup.ai === 'greedy' ? greedyPolicy : randomPolicy;
    const selected = policy(getPlayerView(duel, PLAYER.B), rng);
    if (!selected.ok) {
      fail(`Opponent could not choose: ${selected.error}`);
      return;
    }
    const committed = submit(session, {
      duelId: duel.duelId,
      exchangeId: duel.nextExchangeId,
      side: PLAYER.B,
      pick: selected.value,
    });
    if (!committed.ok) {
      fail(`Opponent could not commit: ${committed.reason}`);
      return;
    }
    session = committed.value.session;
    publish({
      phase: 'selecting',
      view: getSessionView(session, PLAYER.A).view,
      remainingMs: SELECTION_MS,
      choice: null,
      choiceSource: null,
      reveal: null,
      actionKey: `${duel.duelId}:select:${duel.nextExchangeId}`,
      error: null,
    });
    armTimer(SELECTION_MS);
  }

  function commit(pick: CATEGORY, source: 'manual' | 'timeout') {
    const result = submit(session, {
      duelId: session.duel.duelId,
      exchangeId: session.duel.nextExchangeId,
      side: PLAYER.A,
      pick,
    });
    if (!result.ok) {
      fail(`Your choice could not be committed: ${result.reason}`);
      return;
    }
    cancelTimer();
    session = result.value.session;
    queuedEvents = result.value.events.map((event) => ({ ...event }));
    // Keep the pre-exchange view while showing commitment feedback; final state remains private.
    publish({ phase: 'committed', choice: pick, choiceSource: source });
    armTimer(COMMITMENT_MS);
  }

  function commitTimeout() {
    const pick = timeoutPick(session.duel, PLAYER.A);
    if (!pick.ok) {
      fail(`Timeout could not choose: ${pick.error}`);
      return;
    }
    commit(pick.value, 'timeout');
  }

  prepare({ yours: 'ashkit', opponent: 'brookfin', ai: 'greedy' });

  return {
    getSnapshot: () => display,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      if (!disposed && active && display.phase === 'ready') openSelection();
    },
    choose(pick: CATEGORY, actionKey: string) {
      if (disposed || !active || display.phase !== 'selecting' || actionKey !== display.actionKey)
        return;
      // A delayed timer callback must not allow a late tap to beat the deadline.
      if (deadline !== null && clock.now() >= deadline) {
        commitTimeout();
        return;
      }
      if (!display.view.self.availableCategories.includes(pick)) return;
      commit(pick, 'manual');
    },
    continue(actionKey: string) {
      if (disposed || !active || display.phase !== 'reveal' || actionKey !== display.actionKey)
        return;
      if (queuedEvents.length > 0) revealNext();
      else if (session.duel.status === DUEL_STATUS.FINISHED) {
        publish({
          phase: 'finished',
          view: getSessionView(session, PLAYER.A).view,
          reveal: null,
          actionKey: `${session.duel.duelId}:finished`,
        });
      } else openSelection();
    },
    configure(matchup: Matchup) {
      if (disposed || (display.phase !== 'ready' && display.phase !== 'finished')) return;
      prepare(matchup);
    },
    rematch() {
      if (disposed) return;
      prepare(display.matchup);
      openSelection();
    },
    setActive(next: boolean) {
      if (disposed || active === next) return;
      if (!next && deadline !== null) phaseTimeLeft = Math.max(0, deadline - clock.now());
      active = next;
      cancelTimer();
      publish({
        paused: !next,
        ...(display.phase === 'selecting' ? { remainingMs: phaseTimeLeft } : {}),
      });
      if (next && (display.phase === 'selecting' || display.phase === 'committed'))
        armTimer(phaseTimeLeft);
    },
    dispose() {
      disposed = true;
      cancelTimer();
      listeners.clear();
    },
  };
}

export type BattleController = ReturnType<typeof createBattleController>;
