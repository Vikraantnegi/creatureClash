import { describe, expect, it, vi } from 'vitest';
import { initialTrainerRosters } from '../gym/fixtures';
import { createTrainerRepository } from './repository';
import { TRAINER_SAVE_KEY, TRAINER_BACKUP_KEY } from './constants';
import { allocateTraining, refreshSnapshots } from './progression';
import type { TrainerStorage } from './types';

function memory(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(TRAINER_SAVE_KEY, raw);
  const storage: TrainerStorage = {
    getItem: vi.fn(async (key) => values.get(key) ?? null),
    setItem: vi.fn(async (key, value) => {
      values.set(key, value);
    }),
  };
  return { values, storage, repository: createTrainerRepository(storage) };
}
describe('trainer persistence', () => {
  it('recovers an acknowledged-late write without applying the transition twice', async () => {
    const { values, storage, repository } = memory();
    const original = await repository.load();
    const next = { ...original, revision: 1 };
    vi.mocked(storage.setItem).mockImplementationOnce(async (key, value) => {
      values.set(key, value);
      throw new Error('write acknowledgement lost');
    });
    await expect(repository.commit(next, 0)).rejects.toThrow('acknowledgement');
    vi.mocked(storage.setItem).mockClear();
    await expect(repository.commit(next, 0)).resolves.toEqual(next);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it('migrates actual v1 identities, owners and individual stats without replacing them with fixture defaults', async () => {
    const rosters = initialTrainerRosters();
    [rosters.A[0], rosters.B[2]] = [rosters.B[2]!, rosters.A[0]!];
    rosters.A[0]!.stats.ATTACK = 71;
    const raw = JSON.stringify({ version: 1, fixtureVersion: 'older-fixture', rosters });
    const { storage, repository, values } = memory(raw);
    const save = await repository.load();
    expect(save.version).toBe(2);
    expect(save.progress['trainer-b-3']!.base.stats.ATTACK).toBe(71);
    expect(save.rosters.A[0]!.instanceId).toBe('trainer-b-3');
    expect(save.progress['trainer-b-3']!.xp).toBe(0);
    expect(values.get(TRAINER_BACKUP_KEY)).toBe(raw);
    expect(await createTrainerRepository(storage).load()).toEqual(save);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
  it.each([
    '{broken',
    JSON.stringify({ version: 999 }),
    JSON.stringify({ version: 1, rosters: {} }),
  ])('does not overwrite unreadable or unsupported data', async (raw) => {
    const { storage, repository, values } = memory(raw);
    await expect(repository.load()).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(values.get(TRAINER_SAVE_KEY)).toBe(raw);
  });
  it('keeps the old save and backup if migration writing fails', async () => {
    const raw = JSON.stringify({
      version: 1,
      fixtureVersion: 'old',
      rosters: initialTrainerRosters(),
    });
    const { values, storage, repository } = memory(raw);
    vi.mocked(storage.setItem).mockImplementation(async (key, value) => {
      if (key === TRAINER_SAVE_KEY) throw new Error('disk full');
      values.set(key, value);
    });
    await expect(repository.load()).rejects.toThrow('disk full');
    expect(values.get(TRAINER_SAVE_KEY)).toBe(raw);
    expect(values.get(TRAINER_BACKUP_KEY)).toBe(raw);
  });
  it('persists training, serializes concurrent revisions, and accepts an identical retry only', async () => {
    const { storage, repository } = memory();
    const original = await repository.load();
    original.progress[original.rosters.A[0]!.instanceId]!.xp = 30;
    const leveled = refreshSnapshots({ ...original, revision: 1 });
    await repository.commit(leveled, 0);
    const id = leveled.rosters.A[0]!.instanceId;
    const first = allocateTraining(leveled, id, { ATTACK: 2, DEFENSE: 0, SPEED: 0, SPECIAL: 0 });
    const second = allocateTraining(leveled, id, { ATTACK: 0, DEFENSE: 2, SPEED: 0, SPECIAL: 0 });
    const results = await Promise.allSettled([
      repository.commit(first, 1),
      repository.commit(second, 1),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    await expect(repository.commit(first, 1)).resolves.toEqual(first);
    expect(await createTrainerRepository(storage).load()).toEqual(first);
  });
  it('rejects duplicate ownership, derived-stat tampering and unsupported rules without writing', async () => {
    const { storage, repository } = memory();
    const save = await repository.load();
    vi.mocked(storage.setItem).mockClear();
    const duplicate = structuredClone(save);
    duplicate.rosters.B[0] = duplicate.rosters.A[0]!;
    await expect(repository.commit({ ...duplicate, revision: 1 }, 0)).rejects.toThrow(/duplicate/);
    const invalid = structuredClone(save);
    invalid.rosters.A[0]!.stats.ATTACK++;
    await expect(repository.commit({ ...invalid, revision: 1 }, 0)).rejects.toThrow(/training/);
    await expect(
      repository.commit({ ...save, rulesVersion: 99, revision: 1 }, 0),
    ).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
