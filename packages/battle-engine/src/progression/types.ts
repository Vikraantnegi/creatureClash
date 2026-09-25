import type { CATEGORY, CreatureSnapshot } from '../types.js';

// Persist base stats and XP. Project fresh battle stats; never grow a grown snapshot again.
export type TrainingAllocation = Record<CATEGORY, number>;
export type CreatureProgress = {
  base: CreatureSnapshot;
  xp: number;
  allocation: TrainingAllocation;
};
export type ProgressionView = {
  creature: CreatureSnapshot;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNextLevel: number | null;
  allocation: TrainingAllocation;
  unspentPoints: number;
};
export type DuelXpOutcome = 'win' | 'loss' | 'draw';
export type XpAward = {
  progress: CreatureProgress;
  earnedXp: number;
  appliedXp: number;
  before: ProgressionView;
  after: ProgressionView;
};
