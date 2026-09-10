import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CATEGORY,
  DUEL_WINNER,
  createDuel,
  DEFAULT_TYPE_CHART,
} from '@creature-clash/battle-engine';

import { COMMITMENT_MS, SELECTION_MS } from './constants';

import { createBattleController, type BattleController } from './controller';
import { BATTLE_MODES, CREATURES, type BattleClock } from './types';
import { creatureFor } from './fixtures';
import { projectCreatureSheet } from './visibility';

let controllers: BattleController[];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  controllers = [];
});
afterEach(() => {
  controllers.forEach((controller) => controller.dispose());
  vi.useRealTimers();
});

function make(overrides: Parameters<typeof createBattleController>[0] = {}) {
  let id = 0;
  const controller = createBattleController({
    clock: { now: Date.now, schedule: setTimeout, cancel: clearTimeout },
    nextDuelId: () => `test-${++id}`,
    ...overrides,
  });
  controllers.push(controller);
  return controller;
}

function choose(controller: BattleController, pick: CATEGORY) {
  controller.choose(pick, controller.getSnapshot().actionKey);
}
function next(controller: BattleController) {
  controller.continue(controller.getSnapshot().actionKey);
}
function reveal(controller: BattleController, pick: CATEGORY) {
  choose(controller, pick);
  vi.advanceTimersByTime(COMMITMENT_MS);
  expect(controller.getSnapshot().phase).toBe('reveal');
}

describe('selection and presentation', () => {
  it('starts only on request and locks the AI once, before the human chooses', () => {
    const rng = vi.fn(() => 0.75);
    const controller = make({ rng });
    controller.configure({
      yours: CREATURES.ASHKIT,
      opponent: CREATURES.BROOKFIN,
      ai: BATTLE_MODES.RANDOM,
    });
    vi.advanceTimersByTime(20_000);
    expect(controller.getSnapshot().phase).toBe('ready');
    expect(rng).not.toHaveBeenCalled();
    controller.start();
    expect(rng).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().view.history).toEqual([]);
    expect(controller.getSnapshot().view.opponent.availableCategories).toHaveLength(4);
    choose(controller, CATEGORY.ATTACK);
    expect(rng).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().phase).toBe('committed');
    expect(controller.getSnapshot().reveal).toBeNull();
    expect(controller.getSnapshot().view.self.hp).toBe(2);
    expect(controller.getSnapshot().view.history).toEqual([]);
    vi.advanceTimersByTime(COMMITMENT_MS - 1);
    expect(controller.getSnapshot().phase).toBe('committed');
    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot().reveal?.bPick).toBe(CATEGORY.SPECIAL);
    expect(controller.getSnapshot().view.self.hp).toBe(1);
    vi.advanceTimersByTime(60_000);
    expect(controller.getSnapshot().phase).toBe('reveal');
    expect(rng).toHaveBeenCalledTimes(1);
    next(controller);
    expect(rng).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().remainingMs).toBe(SELECTION_MS);
  });

  it('presents the real sacrifice win, withholding the duel result until Continue', () => {
    const controller = make();
    controller.start();
    reveal(controller, CATEGORY.SPECIAL);
    expect(controller.getSnapshot().reveal?.aEffective).toBe(450);
    next(controller);
    reveal(controller, CATEGORY.ATTACK);
    next(controller);
    reveal(controller, CATEGORY.SPEED);
    expect(controller.getSnapshot().view.opponent.hp).toBe(0);
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.NONE);
    next(controller);
    expect(controller.getSnapshot().phase).toBe('finished');
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.A);
    expect(controller.getSnapshot().view.history).toHaveLength(3);
  });

  it('presents the greedy loss and stops at KO', () => {
    const controller = make();
    controller.start();
    reveal(controller, CATEGORY.ATTACK);
    next(controller);
    reveal(controller, CATEGORY.SPEED);
    next(controller);
    expect(controller.getSnapshot().phase).toBe('finished');
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.B);
    expect(controller.getSnapshot().view.history).toHaveLength(2);
  });

  it('reveals exchange three, automatic four, then the draw without leaking future history', () => {
    const controller = make();
    controller.configure({
      yours: CREATURES.SLATE,
      opponent: CREATURES.SLATE,
      ai: BATTLE_MODES.GREEDY,
    });
    controller.start();
    reveal(controller, CATEGORY.ATTACK);
    next(controller);
    reveal(controller, CATEGORY.DEFENSE);
    next(controller);
    reveal(controller, CATEGORY.SPEED);
    const thirdKey = controller.getSnapshot().actionKey;
    expect(controller.getSnapshot().reveal?.exchangeNumber).toBe(3);
    expect(controller.getSnapshot().view.history).toHaveLength(3);
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.NONE);
    controller.continue(thirdKey);
    expect(controller.getSnapshot().reveal?.isAutomaticFourth).toBe(true);
    expect(controller.getSnapshot().view.history).toHaveLength(4);
    // A queued double-tap from the prior reveal cannot skip this tiebreak.
    controller.continue(thirdKey);
    expect(controller.getSnapshot().phase).toBe('reveal');
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.NONE);
    next(controller);
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.DRAW);
    expect(controller.getSnapshot().view.self.availableCategories).toEqual([]);
  });

  it('reads each reveal HP from the event, not the final duel state', () => {
    const controller = make();
    // Ashkit mirror: tie, each side wins once, and the two remaining categories differ.
    controller.configure({
      yours: CREATURES.ASHKIT,
      opponent: CREATURES.ASHKIT,
      ai: BATTLE_MODES.GREEDY,
    });
    controller.start();
    reveal(controller, CATEGORY.ATTACK); // 85 vs 85
    next(controller);
    reveal(controller, CATEGORY.DEFENSE); // 35 vs 70, human loses
    next(controller);
    reveal(controller, CATEGORY.SPEED); // 70 vs 50, human wins
    expect(controller.getSnapshot().reveal?.exchangeNumber).toBe(3);
    expect(controller.getSnapshot().view.self.hp).toBe(1);
    expect(controller.getSnapshot().view.opponent.hp).toBe(1);
    next(controller); // Special 50 vs Defense 35, automatic fourth KO
    expect(controller.getSnapshot().reveal?.isAutomaticFourth).toBe(true);
    expect(controller.getSnapshot().view.opponent.hp).toBe(0);
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.NONE);
    next(controller);
    expect(controller.getSnapshot().view.winner).toBe(DUEL_WINNER.A);
  });
});

describe('clock and stale callbacks', () => {
  it('times out through the engine fallback and starts a fresh clock only after Continue', () => {
    const controller = make();
    controller.start();
    vi.advanceTimersByTime(SELECTION_MS);
    expect(controller.getSnapshot().phase).toBe('committed');
    expect(controller.getSnapshot().choice).toBe(CATEGORY.ATTACK);
    expect(controller.getSnapshot().choiceSource).toBe('timeout');
    vi.advanceTimersByTime(COMMITMENT_MS + 20_000);
    expect(controller.getSnapshot().phase).toBe('reveal');
    next(controller);
    expect(controller.getSnapshot().remainingMs).toBe(SELECTION_MS);
    vi.advanceTimersByTime(SELECTION_MS);
    expect(controller.getSnapshot().choice).toBe(CATEGORY.DEFENSE);
  });

  it('a manual commitment cannot be overwritten by a double tap or timeout', () => {
    const controller = make();
    controller.start();
    const key = controller.getSnapshot().actionKey;
    vi.advanceTimersByTime(SELECTION_MS - 1);
    controller.choose(CATEGORY.SPECIAL, key);
    controller.choose(CATEGORY.ATTACK, key);
    vi.advanceTimersByTime(20_000);
    expect(controller.getSnapshot().choice).toBe(CATEGORY.SPECIAL);
    expect(controller.getSnapshot().choiceSource).toBe('manual');
    expect(controller.getSnapshot().view.history).toHaveLength(1);
  });

  it('uses timeout if the deadline has elapsed but its callback has not run', () => {
    const controller = make();
    controller.start();
    vi.setSystemTime(SELECTION_MS + 1);
    choose(controller, CATEGORY.SPECIAL);
    expect(controller.getSnapshot().choiceSource).toBe('timeout');
    expect(controller.getSnapshot().choice).toBe(CATEGORY.ATTACK);
  });

  it('background pause preserves the remaining selection time and ignores taps', () => {
    const controller = make();
    controller.start();
    vi.advanceTimersByTime(3750);
    controller.setActive(false);
    expect(controller.getSnapshot().remainingMs).toBe(6250);
    choose(controller, CATEGORY.SPECIAL);
    vi.advanceTimersByTime(60_000);
    expect(controller.getSnapshot().phase).toBe('selecting');
    expect(controller.getSnapshot().remainingMs).toBe(6250);
    controller.setActive(true);
    vi.advanceTimersByTime(6249);
    expect(controller.getSnapshot().phase).toBe('selecting');
    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot().choiceSource).toBe('timeout');
  });

  it('pauses commitment presentation while backgrounded', () => {
    const controller = make();
    controller.start();
    choose(controller, CATEGORY.SPECIAL);
    vi.advanceTimersByTime(100);
    controller.setActive(false);
    vi.advanceTimersByTime(20_000);
    expect(controller.getSnapshot().phase).toBe('committed');
    controller.setActive(true);
    vi.advanceTimersByTime(299);
    expect(controller.getSnapshot().phase).toBe('committed');
    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot().phase).toBe('reveal');
  });

  it('rejects a previous exchange tap and duplicate Continue', () => {
    const controller = make();
    controller.start();
    const selectionKey = controller.getSnapshot().actionKey;
    reveal(controller, CATEGORY.SPECIAL);
    const revealKey = controller.getSnapshot().actionKey;
    controller.continue(revealKey);
    controller.continue(revealKey);
    controller.choose(CATEGORY.ATTACK, selectionKey);
    expect(controller.getSnapshot().phase).toBe('selecting');
    expect(controller.getSnapshot().choice).toBeNull();
    expect(controller.getSnapshot().view.exchangesCompleted).toBe(1);
  });

  it('rematch invalidates old timers and taps even when cancellation arrives too late', () => {
    const callbacks: (() => void)[] = [];
    const clock: BattleClock = {
      now: Date.now,
      schedule: (callback, delay) => {
        callbacks.push(callback);
        return setTimeout(callback, delay);
      },
      cancel: clearTimeout,
    };
    const controller = make({ clock });
    controller.start();
    const old = controller.getSnapshot();
    const oldCallback = callbacks[0]!;
    controller.rematch();
    controller.choose(CATEGORY.ATTACK, old.actionKey);
    oldCallback();
    expect(controller.getSnapshot().view.duelId).not.toBe(old.view.duelId);
    expect(controller.getSnapshot().phase).toBe('selecting');
    expect(controller.getSnapshot().choice).toBeNull();
    expect(controller.getSnapshot().view.history).toEqual([]);
    expect(controller.getSnapshot().remainingMs).toBe(SELECTION_MS);
  });

  it('clears unrevealed events on rematch', () => {
    const controller = make();
    controller.start();
    choose(controller, CATEGORY.ATTACK);
    controller.rematch();
    vi.advanceTimersByTime(COMMITMENT_MS);
    expect(controller.getSnapshot().phase).toBe('selecting');
    expect(controller.getSnapshot().view.history).toEqual([]);
    expect(controller.getSnapshot().reveal).toBeNull();
  });

  it('can suspend and resume without starting a second AI choice', () => {
    const rng = vi.fn(() => 0);
    const controller = make({ initiallyActive: false, rng });
    controller.configure({
      yours: CREATURES.SLATE,
      opponent: CREATURES.SLATE,
      ai: BATTLE_MODES.RANDOM,
    });
    controller.start();
    expect(controller.getSnapshot().phase).toBe('ready');
    controller.setActive(true);
    controller.start();
    controller.setActive(false);
    controller.setActive(true);
    expect(rng).toHaveBeenCalledTimes(1);
    controller.dispose();
    vi.advanceTimersByTime(30_000);
    expect(controller.getSnapshot().view.history).toEqual([]);
  });

  it('surfaces an AI failure without starting a timer or fabricating a pick', () => {
    const controller = make({ rng: () => NaN });
    controller.configure({
      yours: CREATURES.ASHKIT,
      opponent: CREATURES.BROOKFIN,
      ai: BATTLE_MODES.RANDOM,
    });
    controller.start();
    expect(controller.getSnapshot().phase).toBe('error');
    expect(controller.getSnapshot().error).toContain('invalid_rng');
    vi.advanceTimersByTime(30_000);
    expect(controller.getSnapshot().view.history).toEqual([]);
  });
});

describe('prepared encounter duels', () => {
  it('notifies once only after the automatic fourth is acknowledged, with no standalone rematch', () => {
    const created = createDuel({
      duelId: 'encounter:pair:1',
      creatureA: creatureFor(CREATURES.SLATE, 'a'),
      creatureB: creatureFor(CREATURES.SLATE, 'b'),
      typeChart: DEFAULT_TYPE_CHART,
    });
    if (!created.ok) throw new Error(created.error);
    const completed = vi.fn();
    const controller = make({ preparedDuel: created.value, onComplete: completed });
    vi.advanceTimersByTime(20_000);
    expect(controller.getSnapshot().phase).toBe('ready');
    controller.start();
    for (const pick of [CATEGORY.ATTACK, CATEGORY.DEFENSE, CATEGORY.SPEED]) {
      reveal(controller, pick);
      expect(completed).not.toHaveBeenCalled();
      next(controller);
    }
    expect(controller.getSnapshot().reveal?.isAutomaticFourth).toBe(true);
    expect(completed).not.toHaveBeenCalled();
    const oldKey = controller.getSnapshot().actionKey;
    next(controller);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed.mock.calls[0]![0].duelId).toBe(created.value.duelId);
    controller.continue(oldKey);
    controller.rematch();
    expect(completed).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().phase).toBe('finished');
    expect(created.value.history).toHaveLength(0);
  });
  it('cancels an abandoned encounter duel before a new one starts', () => {
    const complete = vi.fn();
    const old = make({ onComplete: complete });
    old.start();
    choose(old, CATEGORY.SPECIAL);
    old.dispose();
    const replacement = make();
    vi.advanceTimersByTime(20_000);
    expect(complete).not.toHaveBeenCalled();
    expect(replacement.getSnapshot().phase).toBe('ready');
  });
});

describe('stat visibility comparison', () => {
  it('locks visibility during play and preserves it through rematch and matchup changes', () => {
    const controller = make();
    expect(controller.getSnapshot().statVisibility).toBe('exact');
    controller.configureVisibility('approximate');
    controller.start();
    const before = controller.getSnapshot();
    controller.configureVisibility('exact');
    expect(controller.getSnapshot()).toBe(before);
    reveal(controller, CATEGORY.ATTACK);
    next(controller);
    reveal(controller, CATEGORY.SPEED);
    next(controller);
    controller.rematch();
    expect(controller.getSnapshot().statVisibility).toBe('approximate');
    expect(controller.getSnapshot().view.history).toEqual([]);
    expect(controller.getSnapshot().view.opponent.usedCategories).toEqual([]);
  });

  it('keeps resolved scores private until each reveal, including the automatic fourth', () => {
    const controller = make();
    controller.configureVisibility('approximate');
    controller.configure({
      yours: CREATURES.SLATE,
      opponent: CREATURES.SLATE,
      ai: BATTLE_MODES.GREEDY,
    });
    expect(controller.getSnapshot().statVisibility).toBe('approximate');
    controller.start();
    const sheet = () =>
      projectCreatureSheet(
        controller.getSnapshot().view.opponent,
        controller.getSnapshot().statVisibility,
      );
    for (const [index, pick] of [CATEGORY.ATTACK, CATEGORY.DEFENSE, CATEGORY.SPEED].entries()) {
      choose(controller, pick);
      expect(sheet().categories.filter((row) => row.raw !== null)).toHaveLength(index);
      vi.advanceTimersByTime(COMMITMENT_MS);
      expect(sheet().categories.filter((row) => row.raw !== null)).toHaveLength(index + 1);
      if (index < 2) next(controller);
    }
    expect(sheet().categories[3]!.raw).toBeNull();
    next(controller);
    expect(controller.getSnapshot().reveal?.isAutomaticFourth).toBe(true);
    expect(sheet().categories[3]!.raw).toBe('60');
    next(controller);
    controller.configureVisibility('exact');
    expect(controller.getSnapshot().phase).toBe('ready');
    expect(controller.getSnapshot().view.history).toEqual([]);
    expect(controller.getSnapshot().statVisibility).toBe('exact');
  });

  it('resolves identical actions identically under either presentation', () => {
    function play(visibility: 'exact' | 'approximate') {
      const controller = make();
      controller.configureVisibility(visibility);
      controller.start();
      for (const pick of [CATEGORY.SPECIAL, CATEGORY.ATTACK, CATEGORY.SPEED]) {
        reveal(controller, pick);
        next(controller);
      }
      return controller.getSnapshot().view;
    }
    expect(play('approximate')).toEqual(play('exact'));
  });
});
