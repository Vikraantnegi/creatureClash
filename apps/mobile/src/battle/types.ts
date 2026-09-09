import {
  CATEGORY,
  ExchangeResultEvent,
  PlayerView,
  DuelState,
} from '@creature-clash/battle-engine';

import { CREATURES } from '@creature-clash/battle-fixtures';
export { CREATURES } from '@creature-clash/battle-fixtures';

export enum BATTLE_PHASES {
  READY = 'ready',
  SELECTING = 'selecting',
  COMMITTED = 'committed',
  REVEAL = 'reveal',
  FINISHED = 'finished',
  ERROR = 'error',
}

export enum BATTLE_MODES {
  GREEDY = 'greedy',
  RANDOM = 'random',
}

export type Matchup = { yours: CREATURES; opponent: CREATURES; ai: BATTLE_MODES };

export type BattleDisplay = {
  phase: BATTLE_PHASES;
  matchup: Matchup;
  view: PlayerView;
  paused: boolean;
  remainingMs: number;
  choice: CATEGORY | null;
  choiceSource: 'manual' | 'timeout' | null;
  reveal: ExchangeResultEvent | null;
  actionKey: string;
  error: string | null;
};

export type Timer = ReturnType<typeof setTimeout>;

export type BattleClock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => Timer;
  cancel: (timer: Timer) => void;
};

export type Options = {
  preparedDuel?: DuelState;
  ai?: BATTLE_MODES;
  onComplete?: (duel: DuelState) => void;
  clock?: BattleClock;
  rng?: () => number;
  nextDuelId?: () => string;
  initiallyActive?: boolean;
};
