import { DUEL_WINNER, PLAYER, type ExchangeResultEvent } from '@creature-clash/battle-engine';
export function exchangeSummary(event: ExchangeResultEvent): string {
  if (event.exchangeWinner === 'tie') return 'Tie · no HP lost';
  return event.exchangeWinner === PLAYER.A
    ? `You win · opponent loses ${event.damageToB} HP`
    : `Opponent wins · you lose ${event.damageToA} HP`;
}
export function duelResult(winner: DUEL_WINNER): string {
  return winner === DUEL_WINNER.DRAW
    ? 'Duel drawn'
    : winner === DUEL_WINNER.A
      ? 'You won the duel'
      : 'Opponent won the duel';
}
