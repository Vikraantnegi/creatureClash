import { DUEL_WINNER } from '@creature-clash/battle-engine';
export function encounterResult(winner: DUEL_WINNER, mode: 'run' | 'paired') {
  const noun = mode === 'run' ? 'Run' : 'Encounter';
  return winner === DUEL_WINNER.DRAW
    ? `${noun} drawn`
    : winner === DUEL_WINNER.A
      ? mode === 'run'
        ? 'Run complete'
        : 'You won the encounter'
      : mode === 'run'
        ? 'Run ended'
        : 'Opponent won the encounter';
}
