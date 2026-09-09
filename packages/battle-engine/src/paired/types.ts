import type { CreatureSnapshot, DuelState, DUEL_WINNER, TypeChart } from '../types.js';
export enum PAIRED_PHASE {
  READY = 'ready',
  DUELING = 'dueling',
  FINISHED = 'finished',
}
export type PairedState = {
  encounterId: string;
  teamA: CreatureSnapshot[];
  teamB: CreatureSnapshot[];
  typeChart: TypeChart;
  phase: PAIRED_PHASE;
  activeDuel: DuelState | null;
  completed: DuelState[];
  winner: DUEL_WINNER;
};
export type CreatePairedInput = {
  encounterId: string;
  teamA: CreatureSnapshot[];
  teamB: CreatureSnapshot[];
  typeChart: TypeChart;
};
