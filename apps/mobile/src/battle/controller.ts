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
  type DuelState,
} from '@creature-clash/battle-engine';

import { creatureFor } from './fixtures';
import {
  CREATURES,
  Matchup,
  BattleDisplay,
  BattleClock,
  Options,
  Timer,
  BATTLE_PHASES,
  BATTLE_MODES,
} from './types';
import { SELECTION_MS, COMMITMENT_MS } from './constants';

let duelSequence = 0;
const systemClock: BattleClock = {
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: (timer) => clearTimeout(timer),
};

const presentEvent = (view: PlayerView, event: ExchangeResultEvent): PlayerView => {
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
};

export const createBattleController = (options: Options = {}) => {
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
    publish({ phase: BATTLE_PHASES.ERROR, error: message });
  }

  function prepare(matchup: Matchup, preparedDuel?: DuelState) {
    cancelTimer();
    queuedEvents = [];
    const duelId = preparedDuel?.duelId ?? nextDuelId();
    if (
      preparedDuel &&
      (preparedDuel.status !== DUEL_STATUS.ONGOING || preparedDuel.exchangesCompleted !== 0)
    )
      throw new Error('Expected a fresh prepared duel');
    const created = createDuel({
      duelId,
      creatureA: preparedDuel?.creatureA ?? creatureFor(matchup.yours, `${duelId}-a`),
      creatureB: preparedDuel?.creatureB ?? creatureFor(matchup.opponent, `${duelId}-b`),
      typeChart: preparedDuel?.typeChart ?? DEFAULT_TYPE_CHART,
    });
    if (!created.ok) throw new Error(created.error);
    session = createSession(created.value);
    display = {
      phase: BATTLE_PHASES.READY,
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
      phase: BATTLE_PHASES.REVEAL,
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
      if (display.phase === BATTLE_PHASES.SELECTING) publish({ remainingMs: phaseTimeLeft });
      if (phaseTimeLeft <= 0) {
        if (display.phase === BATTLE_PHASES.SELECTING) commitTimeout();
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
      phase: BATTLE_PHASES.SELECTING,
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
    publish({ phase: BATTLE_PHASES.COMMITTED, choice: pick, choiceSource: source });
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

  prepare(
    {
      yours: CREATURES.ASHKIT,
      opponent: CREATURES.BROOKFIN,
      ai: options.ai ?? BATTLE_MODES.GREEDY,
    },
    options.preparedDuel,
  );

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
      if (deadline !== null && clock.now() >= deadline) {
        commitTimeout();
        return;
      }
      if (!display.view.self.availableCategories.includes(pick)) return;
      commit(pick, 'manual');
    },
    continue(actionKey: string) {
      if (
        disposed ||
        !active ||
        display.phase !== BATTLE_PHASES.REVEAL ||
        actionKey !== display.actionKey
      )
        return;
      if (queuedEvents.length > 0) revealNext();
      else if (session.duel.status === DUEL_STATUS.FINISHED) {
        publish({
          phase: BATTLE_PHASES.FINISHED,
          view: getSessionView(session, PLAYER.A).view,
          reveal: null,
          actionKey: `${session.duel.duelId}:finished`,
        });
        options.onComplete?.(session.duel);
      } else openSelection();
    },
    configure(matchup: Matchup) {
      if (
        disposed ||
        options.preparedDuel ||
        (display.phase !== BATTLE_PHASES.READY && display.phase !== BATTLE_PHASES.FINISHED)
      )
        return;
      prepare(matchup);
    },
    rematch() {
      if (disposed || options.preparedDuel) return;
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
        ...(display.phase === BATTLE_PHASES.SELECTING ? { remainingMs: phaseTimeLeft } : {}),
      });
      if (
        next &&
        (display.phase === BATTLE_PHASES.SELECTING || display.phase === BATTLE_PHASES.COMMITTED)
      )
        armTimer(phaseTimeLeft);
    },
    dispose() {
      disposed = true;
      cancelTimer();
      listeners.clear();
    },
  };
};

export type BattleController = ReturnType<typeof createBattleController>;
