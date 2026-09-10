import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceDuel,
  CATEGORIES,
  DUEL_STATUS,
  DUEL_WINNER,
  TYPE,
  type CreatureSnapshot,
  type DuelState,
  type TrainerRosters,
} from '@creature-clash/battle-engine';
import { createGymController, type GymController } from './controller';
import { TEAM_SELECTION_MS, DEPLOYMENT_MS } from './constants';

let controllers: GymController[];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  controllers = [];
});
afterEach(() => {
  controllers.forEach((controller) => controller.setActive(false));
  vi.useRealTimers();
});
function rosters(power = 40): TrainerRosters {
  const creature = (id: string, stat: number): CreatureSnapshot => ({
    instanceId: id,
    speciesId: id,
    typeId: TYPE.FIRE,
    stats: { ATTACK: stat, DEFENSE: stat, SPEED: stat, SPECIAL: stat },
  });
  return {
    A: Array.from({ length: 6 }, (_, i) => creature(`a${i}`, power)),
    B: Array.from({ length: 6 }, (_, i) => creature(`b${i}`, 20)),
  };
}
function make(overrides: Parameters<typeof createGymController>[0] = {}) {
  let id = 0;
  const controller = createGymController({
    rosters: rosters(),
    clock: { now: Date.now, schedule: setTimeout, cancel: clearTimeout },
    rng: () => 0,
    nextId: () => `gym-${++id}`,
    ...overrides,
  });
  controllers.push(controller);
  return controller;
}
const key = (c: GymController) => c.getSnapshot().actionKey;
function lock(c: GymController) {
  c.beginTeam(key(c));
  for (const id of ['a0', 'a1', 'a2']) c.toggle(id, key(c));
  c.lockTeam(key(c));
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
function play(c: GymController) {
  lock(c);
  for (let i = 0; i < 3; i++) {
    c.beginDeployment(key(c));
    c.deploy(`a${i}`, key(c));
    c.complete(finish(c.getSnapshot().view.activeDuel!));
  }
}

describe('gym mobile orchestration', () => {
  it('does not start clocks until requested; AI locks independently before human choices', () => {
    const rng = vi.fn(() => 0.4);
    const c = make({ rng });
    vi.advanceTimersByTime(60_000);
    expect(c.getSnapshot().stage).toBe('preview');
    expect(rng).not.toHaveBeenCalled();
    c.beginTeam(key(c));
    expect(rng).toHaveBeenCalledTimes(3);
    expect(c.getSnapshot().view.opponentCommitted).toBe(true);
    expect(c.getSnapshot().view.opponentRoster[0]).not.toHaveProperty('stats');
    for (const id of ['a0', 'a1', 'a2']) c.toggle(id, key(c));
    c.lockTeam(key(c));
    expect(c.getSnapshot().stage).toBe('deployment-ready');
    vi.advanceTimersByTime(60_000);
    expect(rng).toHaveBeenCalledTimes(3);
    c.beginDeployment(key(c));
    expect(rng).toHaveBeenCalledTimes(4);
    expect(c.getSnapshot().view.activeDuel).toBeNull();
    expect(c.getSnapshot().view.available).toHaveLength(3);
    const deploymentKey = key(c);
    c.deploy('a2', deploymentKey);
    expect(rng).toHaveBeenCalledTimes(4);
    expect(c.getSnapshot().view.activeDuel?.creatureA.instanceId).toBe('a2');
    const before = c.getSnapshot();
    c.deploy('a1', deploymentKey);
    expect(c.getSnapshot()).toBe(before);
  });
  it('fills incomplete team on timeout, pauses deployment, and uses first eligible fallback', () => {
    const c = make();
    c.beginTeam(key(c));
    c.toggle('a4', key(c));
    vi.advanceTimersByTime(1000);
    c.setActive(false);
    vi.advanceTimersByTime(60_000);
    expect(c.getSnapshot().remainingMs).toBe(TEAM_SELECTION_MS - 1000);
    c.setActive(true);
    vi.advanceTimersByTime(TEAM_SELECTION_MS - 1000);
    expect(c.getSnapshot().view.selected).toEqual(['a4', 'a0', 'a1']);
    c.beginDeployment(key(c));
    vi.advanceTimersByTime(3500);
    c.setActive(false);
    const selection = key(c);
    c.deploy('a4', selection);
    vi.advanceTimersByTime(60_000);
    expect(c.getSnapshot().remainingMs).toBe(DEPLOYMENT_MS - 3500);
    c.setActive(true);
    vi.advanceTimersByTime(DEPLOYMENT_MS - 3500);
    expect(c.getSnapshot().view.activeDuel?.creatureA.instanceId).toBe('a0');
    expect(c.getSnapshot().notice).toContain('Time expired');
  });
  it('rejects late clicks, stale deployment callbacks and incomplete/duplicate duel results', () => {
    const callbacks: (() => void)[] = [];
    const c = make({
      clock: {
        now: Date.now,
        schedule: (callback, delay) => {
          callbacks.push(callback);
          return setTimeout(callback, delay);
        },
        cancel: clearTimeout,
      },
    });
    lock(c);
    c.beginDeployment(key(c));
    const oldKey = key(c);
    const oldCallback = callbacks.at(-1)!;
    vi.setSystemTime(DEPLOYMENT_MS + 1);
    c.deploy('a2', oldKey);
    expect(c.getSnapshot().view.activeDuel?.creatureA.instanceId).toBe('a0');
    const duel = c.getSnapshot().view.activeDuel!;
    c.complete(duel);
    expect(c.getSnapshot().stage).toBe('dueling');
    const completed = finish(duel);
    c.complete(completed);
    c.complete(completed);
    c.beginDeployment(key(c));
    const snapshot = c.getSnapshot();
    oldCallback();
    c.deploy('a2', oldKey);
    c.complete(completed);
    expect(c.getSnapshot()).toBe(snapshot);
    expect(c.getSnapshot().view.available.map((creature) => creature.instanceId)).toEqual([
      'a1',
      'a2',
    ]);
  });
  it('retains ownership exchanges and visibility across encounters; stale exchange cannot repeat', () => {
    const c = make();
    c.configureVisibility('approximate');
    play(c);
    expect(c.getSnapshot().stage).toBe('exchange');
    expect(c.getSnapshot().view.winner).toBe(DUEL_WINNER.A);
    const oldKey = key(c);
    c.exchange({ give: 'a1', receive: 'b2' }, oldKey);
    expect(c.getSnapshot().stage).toBe('finished');
    c.nextEncounter(key(c));
    c.exchange({ give: 'a0', receive: 'b0' }, oldKey);
    expect(c.getSnapshot().stage).toBe('preview');
    expect(c.getSnapshot().visibility).toBe('approximate');
    expect(c.getSnapshot().view.roster.map((creature) => creature.instanceId)).toEqual([
      'a0',
      'b2',
      'a2',
      'a3',
      'a4',
      'a5',
    ]);
    expect(c.getSnapshot().view.opponentRoster.map((creature) => creature.instanceId)).toContain(
      'a1',
    );
    expect(c.getSnapshot().view.completed).toEqual([]);
  });
  it('supports decline, opponent-winner exchange, and draws without an exchange', () => {
    const declined = make();
    play(declined);
    declined.exchange(null, key(declined));
    expect(declined.getSnapshot().view.roster).toEqual(rosters().A);
    const lost = make({ rosters: rosters(10) });
    play(lost);
    lost.exchange(null, key(lost));
    expect(lost.getSnapshot().stage).toBe('exchange');
    lost.resolveOpponentExchange(key(lost));
    expect(lost.getSnapshot().view.roster[0]!.instanceId).toBe('b0');
    expect(lost.getSnapshot().view.opponentRoster[0]!.instanceId).toBe('a0');
    const drawn = make({ rosters: rosters(20) });
    play(drawn);
    expect(drawn.getSnapshot().stage).toBe('finished');
    expect(drawn.getSnapshot().view.winner).toBe(DUEL_WINNER.DRAW);
    expect(drawn.getSnapshot().view.exchange).toBeNull();
  });
  it('reports policy errors without starting a timer or fabricating a team', () => {
    const c = make({ rng: () => 1 });
    c.beginTeam(key(c));
    expect(c.getSnapshot().error).toContain('Invalid opponent randomness');
    vi.advanceTimersByTime(60_000);
    expect(c.getSnapshot().view.selected).toBeNull();
    expect(c.getSnapshot().stage).toBe('preview');
  });
});
