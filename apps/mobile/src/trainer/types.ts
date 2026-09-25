import type { CreatureProgress, GymState, TrainerRosters } from '@creature-clash/battle-engine';

export type TrainingReward = {
  instanceId: string;
  speciesId: string;
  side: 'A' | 'B';
  xp: number;
  beforeLevel: number;
  afterLevel: number;
  points: number;
};

export type TrainerSave = {
  version: 2;
  rulesVersion: number;
  revision: number;
  lastSettledEncounterId: string | null;
  progress: Record<string, CreatureProgress>;
  pending: { gym: GymState; rewards: TrainingReward[] } | null;
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
