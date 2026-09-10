import type { GymView, TrainerRosters } from '@creature-clash/battle-engine';
import type { BattleClock, StatVisibility } from '../battle/types';
export type GymStage =
  | 'preview'
  | 'team'
  | 'deployment-ready'
  | 'deployment'
  | 'dueling'
  | 'exchange'
  | 'finished';
export type GymDisplay = {
  stage: GymStage;
  view: GymView;
  draft: string[];
  remainingMs: number;
  paused: boolean;
  actionKey: string;
  notice: string | null;
  error: string | null;
  visibility: StatVisibility;
};
export type GymOptions = {
  rosters?: TrainerRosters;
  clock?: BattleClock;
  rng?: () => number;
  nextId?: () => string;
  initiallyActive?: boolean;
};
