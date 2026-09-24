import { describe, expect, it, vi } from 'vitest';
import { initialTrainerRosters } from '../gym/fixtures';
import { createTrainerRepository } from './repository';
import { TRAINER_SAVE_KEY } from './constants';
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
  it('seeds only a missing save, then restores identities and individually changed stats', async () => {
    const { storage, repository } = memory();
    const original = await repository.load();
    const rosters = original.rosters;
    [rosters.A[0], rosters.B[2]] = [rosters.B[2]!, rosters.A[0]!];
    rosters.A[0]!.stats.ATTACK = 71;
    await repository.saveRosters(rosters, 'older-fixture');
    const restored = await createTrainerRepository(storage).load();
    expect(restored.rosters).toEqual(rosters);
    expect(restored.fixtureVersion).toBe('older-fixture');
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(restored.rosters.A[0]!.instanceId).toBe('trainer-b-3');
    expect(restored.rosters.B[2]!.instanceId).toBe('trainer-a-1');
  });

  it.each([
    '{broken',
    JSON.stringify({ version: 999 }),
    JSON.stringify({ version: 1, rosters: {} }),
  ])('preserves unreadable or unsupported data without silently resetting it', async (raw) => {
    const { storage, repository, values } = memory(raw);
    await expect(repository.load()).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(values.get(TRAINER_SAVE_KEY)).toBe(raw);
  });

  it('rejects cross-owner duplicates, malformed stats, and missing active slots before writing', async () => {
    const { storage, repository } = memory();
    const duplicate = initialTrainerRosters();
    duplicate.B[0] = duplicate.A[0]!;
    await expect(repository.saveRosters(duplicate, 'fixture')).rejects.toThrow(/duplicate/);
    const invalid = initialTrainerRosters();
    invalid.A[0]!.stats.DEFENSE = -1;
    await expect(repository.saveRosters(invalid, 'fixture')).rejects.toThrow(/invalid/);
    const incomplete = initialTrainerRosters();
    incomplete.A.pop();
    await expect(repository.saveRosters(incomplete, 'fixture')).rejects.toThrow(/six/);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not replace a save on a read error or claim an unsuccessful write', async () => {
    const { storage, repository } = memory();
    vi.mocked(storage.getItem).mockRejectedValueOnce(new Error('read unavailable'));
    await expect(repository.load()).rejects.toThrow('read unavailable');
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.mocked(storage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(repository.load()).rejects.toThrow('disk full');
    await expect(repository.load()).resolves.toHaveProperty('version', 1);
  });
});
