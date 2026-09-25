import { useState } from 'react';
export type GameMode = 'home' | 'duel' | 'gym';
export function useGameMode(initial: GameMode = 'home') {
  const [mode, setMode] = useState<GameMode>(initial);
  return { mode, setMode };
}
