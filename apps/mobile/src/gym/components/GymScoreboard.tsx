import { Text, View } from 'react-native';
import { DUEL_WINNER, type GymView } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
export function GymScoreboard({ view, compact }: { view: GymView; compact: boolean }) {
  return (
    <View className="bg-ground gap-1 rounded-lg p-3">
      <Text testID="gym-score" className="text-ink font-sans font-semibold">
        Duels won · You {view.score.a} · Opponent {view.score.b}
      </Text>
      {!compact &&
        view.completed.map((duel, i) => (
          <Text key={duel.duelId} className="text-muted font-sans text-sm">
            {i + 1}. {creatureName(duel.creatureA.speciesId)} vs{' '}
            {creatureName(duel.creatureB.speciesId)} ·{' '}
            {duel.winner === DUEL_WINNER.DRAW
              ? 'Draw'
              : duel.winner === DUEL_WINNER.A
                ? 'You won'
                : 'Opponent won'}
          </Text>
        ))}
    </View>
  );
}
