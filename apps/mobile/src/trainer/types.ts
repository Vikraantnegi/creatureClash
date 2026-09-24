import type { TrainerRosters } from '@creature-clash/battle-engine';

export type TrainerSave = {
  version: 1;
  fixtureVersion: string;
  rosters: TrainerRosters;
};

export type TrainerStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type TrainerLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; save: TrainerSave };
