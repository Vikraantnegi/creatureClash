import type { CreatureSnapshot, DuelState, DUEL_WINNER, PLAYER, TypeChart } from '../types.js';

export type GymPhase = 'team' | 'deployment' | 'dueling' | 'exchange' | 'finished';
export type TrainerRosters = Record<PLAYER, CreatureSnapshot[]>;
export type GymExchange = { winner: PLAYER; given: CreatureSnapshot; received: CreatureSnapshot };

// Controller-owned state. UI and selection policies must receive getGymView projections.
export type GymState = {
  encounterId: string;
  rosters: TrainerRosters;
  typeChart: TypeChart;
  phase: GymPhase;
  selected: Record<PLAYER, string[] | null>;
  deployed: Record<PLAYER, string[]>;
  pending: Record<PLAYER, string | null>;
  activeDuel: DuelState | null;
  completed: DuelState[];
  winner: DUEL_WINNER;
  exchange: GymExchange | null;
};
export type CreateGymInput = Pick<GymState, 'encounterId' | 'rosters' | 'typeChart'>;
export type GymCommit = { encounterId: string; side: PLAYER; round: number };
export type TeamCommit = GymCommit & { creatures: string[] };
export type DeploymentCommit = GymCommit & { creature: string };
export type GymExchangeAction = {
  encounterId: string;
  side: PLAYER;
  swap: { give: string; receive: string } | null;
};
export type CreaturePreview = Pick<CreatureSnapshot, 'instanceId' | 'speciesId' | 'typeId'>;
export type GymView = {
  encounterId: string;
  phase: GymPhase;
  round: number;
  roster: CreatureSnapshot[];
  opponentRoster: CreaturePreview[];
  selected: string[] | null;
  available: CreatureSnapshot[];
  ownDeployment: string | null;
  opponentCommitted: boolean;
  activeDuel: DuelState | null;
  completed: DuelState[];
  score: { a: number; b: number };
  winner: DUEL_WINNER;
  exchange: GymExchange | null;
};
