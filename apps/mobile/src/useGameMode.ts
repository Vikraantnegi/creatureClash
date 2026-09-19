import { useState } from 'react';
export type GameMode = 'home' | 'duel' | 'gym';
export function useGameMode() {
  const [mode, setMode] = useState<GameMode>('home');
  return { mode, setMode };
}
