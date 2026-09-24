import { FIXTURE_VERSION } from '@creature-clash/battle-fixtures';
import type { TrainerRosters } from '@creature-clash/battle-engine';
import { initialTrainerRosters } from '../gym/fixtures';
import { TRAINER_SAVE_KEY, TRAINER_SAVE_VERSION } from './constants';
import { parseTrainerSave, validateTrainerSave } from './validate';
import type { TrainerSave, TrainerStorage } from './types';

export function createTrainerRepository(storage: TrainerStorage) {
  // One value contains both owners. Never split an exchange into independent writes.
  async function write(save: TrainerSave) {
    const valid = validateTrainerSave(save);
    await storage.setItem(TRAINER_SAVE_KEY, JSON.stringify(valid));
    return valid;
  }
  return {
    async load(): Promise<TrainerSave> {
      const raw = await storage.getItem(TRAINER_SAVE_KEY);
      if (raw !== null) return parseTrainerSave(raw);
      return write({
        version: TRAINER_SAVE_VERSION,
        fixtureVersion: FIXTURE_VERSION,
        rosters: initialTrainerRosters(),
      });
    },
    saveRosters(rosters: TrainerRosters, fixtureVersion: string) {
      return write({ version: TRAINER_SAVE_VERSION, fixtureVersion, rosters });
    },
  };
}
