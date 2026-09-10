import { useState } from 'react';
export type GameMode = 'duel' | 'gym';
export function useGameMode() {
  const [mode, setMode] = useState<GameMode>('duel');
  return { mode, setMode };
}
