import { FIXTURE_VERSION } from '@creature-clash/battle-fixtures';
import { initialTrainerRosters } from '../gym/fixtures';
import { TRAINER_SAVE_KEY, TRAINER_BACKUP_KEY } from './constants';
import { parseTrainerSave, validateTrainerSave } from './validate';
import { createTrainerSave } from './progression';
import type { TrainerSave, TrainerStorage } from './types';

export function createTrainerRepository(storage: TrainerStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work);
    queue = next.catch(() => undefined);
    return next;
  }
  async function write(save: TrainerSave) {
    const valid = validateTrainerSave(save);
    await storage.setItem(TRAINER_SAVE_KEY, JSON.stringify(valid));
    return valid;
  }
  return {
    load(): Promise<TrainerSave> {
      return serial(async () => {
        const raw = await storage.getItem(TRAINER_SAVE_KEY);
        if (raw === null) return write(createTrainerSave(initialTrainerRosters(), FIXTURE_VERSION));
        const save = parseTrainerSave(raw);
        if (JSON.parse(raw).version === 1) {
          // Retain the exact previous save even if the new-format write fails.
          await storage.setItem(TRAINER_BACKUP_KEY, raw);
          return write(save);
        }
        return save;
      });
    },
    commit(save: TrainerSave, expectedRevision: number): Promise<TrainerSave> {
      return serial(async () => {
        const raw = await storage.getItem(TRAINER_SAVE_KEY);
        if (raw === null) throw new Error('Trainer save is missing');
        const current = parseTrainerSave(raw);
        const valid = validateTrainerSave(save);
        // A storage adapter can persist successfully and still reject its promise.
        // Accept an identical retry; never apply its XP a second time.
        if (JSON.stringify(current) === JSON.stringify(valid)) return current;
        if (current.revision !== expectedRevision || valid.revision !== expectedRevision + 1)
          throw new Error('Trainer save changed. Reopen the app before continuing.');
        return write(valid);
      });
    },
  };
}
