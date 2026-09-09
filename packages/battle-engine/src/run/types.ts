import type { CreatureSnapshot, DuelState, DUEL_WINNER, TypeChart } from '../types.js';
export enum RUN_PHASE {
  CHOOSING = 'choosing-creature',
  DUELING = 'dueling',
  SWAPPING = 'choosing-swap',
  FINISHED = 'finished',
}
export type RunState = {
  runId: string;
  roster: CreatureSnapshot[];
  opponents: CreatureSnapshot[];
  typeChart: TypeChart;
  opponentIndex: number;
  phase: RUN_PHASE;
  activeDuel: DuelState | null;
  completed: DuelState[];
  winner: DUEL_WINNER;
};
export type CreateRunInput = {
  runId: string;
  roster: CreatureSnapshot[];
  opponents: CreatureSnapshot[];
  typeChart: TypeChart;
};
export type RunSelection = { runId: string; opponentIndex: number; slot: number };
export type RunSwap = { runId: string; duelId: string; replaceSlot: number | null };
