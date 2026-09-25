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
import { createTrainerRepository } from '../trainer/repository';
import { createTrainerSave, refreshSnapshots } from '../trainer/progression';
import { TRAINER_SAVE_KEY } from '../trainer/constants';

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
async function play(c: GymController) {
  lock(c);
  for (let i = 0; i < 3; i++) {
    c.beginDeployment(key(c));
    c.deploy(`a${i}`, key(c));
    await c.complete(finish(c.getSnapshot().view.activeDuel!));
  }
  await c.continueRewards(key(c));
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
  it('retains ownership exchanges and visibility across encounters; stale exchange cannot repeat', async () => {
    const c = make();
    c.configureVisibility('approximate');
    await play(c);
    expect(c.getSnapshot().stage).toBe('exchange');
    expect(c.getSnapshot().view.winner).toBe(DUEL_WINNER.A);
    const oldKey = key(c);
    await c.exchange({ give: 'a1', receive: 'b2' }, oldKey);
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
  it('supports decline, opponent-winner decline, and draws without an exchange', async () => {
    const declined = make();
    await play(declined);
    await declined.exchange(null, key(declined));
    expect(declined.getSnapshot().view.roster).toEqual(
      createTrainerSave(rosters(), 'test').rosters.A,
    );
    const lost = make({ rosters: rosters(10) });
    await play(lost);
    lost.exchange(null, key(lost));
    expect(lost.getSnapshot().stage).toBe('exchange');
    await lost.resolveOpponentExchange(key(lost));
    expect(lost.getSnapshot().view.roster[0]!.instanceId).toBe('a0');
    expect(lost.getSnapshot().view.opponentRoster[0]!.instanceId).toBe('b0');
    const drawn = make({ rosters: rosters(20) });
    await play(drawn);
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

  it('locks duplicate exchanges while saving and retries failed writes without moving either creature', async () => {
    let rejectWrite!: (error: Error) => void;
    const persistTrainer = vi.fn(async () => {});
    const c = make({ persistTrainer });
    await play(c);
    persistTrainer.mockClear();
    persistTrainer.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectWrite = reject;
        }),
    );
    const actionKey = key(c);
    const before = c.getSnapshot().view;
    const pending = c.exchange({ give: 'a1', receive: 'b2' }, actionKey);
    c.exchange(null, actionKey);
    c.nextEncounter(actionKey);
    expect(persistTrainer).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().saving).toBe(true);
    expect(c.getSnapshot().view).toEqual(before);
    rejectWrite(new Error('disk full'));
    await pending;
    expect(c.getSnapshot().stage).toBe('exchange');
    expect(c.getSnapshot().view).toEqual(before);
    expect(c.getSnapshot().saveError).toContain('Try again');
    persistTrainer.mockResolvedValueOnce();
    await c.exchange({ give: 'a1', receive: 'b2' }, actionKey);
    expect(c.getSnapshot().saving).toBe(false);
    expect(c.getSnapshot().saveError).toBeNull();
    expect(c.getSnapshot().stage).toBe('finished');
    expect(c.getSnapshot().view.roster[1]!.instanceId).toBe('b2');
    c.exchange({ give: 'a1', receive: 'b2' }, actionKey);
    expect(persistTrainer).toHaveBeenCalledTimes(2);
  });

  it.each([40, 10])(
    'restores both owners after a completed gym and restart (player strength %i)',
    async (power) => {
      let raw: string | null = JSON.stringify(createTrainerSave(rosters(power), 'test'));
      const storage = {
        getItem: async () => raw,
        setItem: async (_key: string, value: string) => {
          raw = value;
        },
      };
      const repository = createTrainerRepository(storage);
      const c = make({
        trainerSave: await repository.load(),
        persistTrainer: repository.commit,
      });
      await play(c);
      if (power > 20) await c.exchange({ give: 'a1', receive: 'b2' }, key(c));
      else await c.resolveOpponentExchange(key(c));
      const savedView = c.getSnapshot().view;
      c.setActive(false);
      const restored = await createTrainerRepository(storage).load();
      const restarted = make({ trainerSave: restored });
      expect(restarted.getSnapshot().view.roster).toEqual(savedView.roster);
      expect(restarted.getSnapshot().view.opponentRoster).toEqual(savedView.opponentRoster);
      expect(restarted.getSnapshot().view.completed).toEqual([]);
      expect(
        new Set([...restored.rosters.A, ...restored.rosters.B].map((r) => r.instanceId)).size,
      ).toBe(12);
      // Re-enter and use an acquired creature. Its identity persists; HP/categories start fresh.
      const acquired = restarted
        .getSnapshot()
        .view.roster.find((r) => r.instanceId.startsWith(power > 20 ? 'b' : 'a'))!;
      restarted.beginTeam(key(restarted));
      const ids = [
        acquired.instanceId,
        ...restored.rosters.A.filter((r) => r.instanceId !== acquired.instanceId)
          .slice(0, 2)
          .map((r) => r.instanceId),
      ];
      ids.forEach((id) => restarted.toggle(id, key(restarted)));
      restarted.lockTeam(key(restarted));
      restarted.beginDeployment(key(restarted));
      restarted.deploy(acquired.instanceId, key(restarted));
      const duel = restarted.getSnapshot().view.activeDuel!;
      expect(duel.creatureA).toEqual(acquired);
      expect(duel.hpA).toBe(2);
      expect(duel.usedA).toEqual([]);
    },
  );

  it('saves rewards before exchange, restores a pending settlement, and trains only after ownership is final', async () => {
    let save = createTrainerSave(rosters(), 'test');
    for (const progress of Object.values(save.progress)) progress.xp = 20;
    save = refreshSnapshots(save);
    const values = new Map([[TRAINER_SAVE_KEY, JSON.stringify(save)]]);
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const repository = createTrainerRepository(storage);
    const c = make({ trainerSave: await repository.load(), persistTrainer: repository.commit });
    lock(c);
    const allocation = { ATTACK: 2, DEFENSE: 0, SPEED: 0, SPECIAL: 0 };
    await c.train('a0', allocation);
    expect(c.getSnapshot().trainer.progress.a0!.allocation.ATTACK).toBe(0);
    let last!: DuelState;
    for (let i = 0; i < 3; i++) {
      c.beginDeployment(key(c));
      c.deploy(`a${i}`, key(c));
      last = finish(c.getSnapshot().view.activeDuel!);
      await c.complete(last);
    }
    expect(c.getSnapshot().stage).toBe('rewards');
    expect(c.getSnapshot().saveError).toBeNull();
    const paid = await repository.load();
    expect(paid.progress.a0!.xp).toBe(35);
    expect(paid.progress.b0!.xp).toBe(30);
    expect(paid.progress.a3!.xp).toBe(20);
    expect(paid.rosters.A[0]!.stats.ATTACK).toBe(40);
    expect(paid.rosters.A[0]!.level).toBe(2);
    expect(c.getSnapshot().view.completed[0]!.creatureA.level).toBe(1);
    const resumed = make({ trainerSave: paid, persistTrainer: repository.commit });
    expect(resumed.getSnapshot().stage).toBe('rewards');
    await resumed.complete(last);
    await resumed.retryRewards(key(resumed));
    await resumed.train('a0', allocation);
    expect(resumed.getSnapshot().trainer.progress.a0!.xp).toBe(35);
    await resumed.continueRewards(key(resumed));
    await resumed.exchange({ give: 'a1', receive: 'b2' }, key(resumed));
    expect(resumed.getSnapshot().trainer.pending).toBeNull();
    expect(resumed.getSnapshot().trainer.progress.b2!.xp).toBe(30);
    await resumed.train('a1', allocation); // The given creature now belongs to the AI.
    expect(resumed.getSnapshot().saveError).toContain('Only your');
    await resumed.train('b2', allocation);
    const trained = await repository.load();
    expect(trained.progress.b2!.allocation.ATTACK).toBe(2);
    expect(trained.rosters.A[1]!.stats.ATTACK).toBe(22);
    expect(trained.progress.a1!.allocation.ATTACK).toBe(2); // AI trains after the exchange too.
    const restarted = make({ trainerSave: trained });
    restarted.beginTeam(key(restarted));
    for (const id of ['a0', 'b2', 'a2']) restarted.toggle(id, key(restarted));
    restarted.lockTeam(key(restarted));
    restarted.beginDeployment(key(restarted));
    restarted.deploy('b2', key(restarted));
    expect(restarted.getSnapshot().view.activeDuel!.creatureA.stats.ATTACK).toBe(22);
    expect(restarted.getSnapshot().view.activeDuel!.usedA).toEqual([]);
    expect(restarted.getSnapshot().view.activeDuel!.hpA).toBe(2);
  });

  it('retries a failed reward write without reopening the last duel or doubling XP', async () => {
    const persistTrainer = vi.fn(async () => {}).mockRejectedValueOnce(new Error('disk full'));
    const c = make({ persistTrainer });
    await play(c);
    expect(c.getSnapshot().stage).toBe('rewards');
    expect(c.getSnapshot().trainer.pending).toBeNull();
    expect(c.getSnapshot().trainer.progress.a0!.xp).toBe(0);
    expect(c.getSnapshot().saveError).toContain('disk full');
    await c.retryRewards(key(c));
    await c.retryRewards(key(c));
    expect(c.getSnapshot().trainer.progress.a0!.xp).toBe(15);
    expect(persistTrainer).toHaveBeenCalledTimes(2);
  });
});
