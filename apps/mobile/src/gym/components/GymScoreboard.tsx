import { Text, View } from 'react-native';
import { DUEL_WINNER, type GymView } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
export function GymScoreboard({ view, compact }: { view: GymView; compact: boolean }) {
  return (
    <View className="gap-1 rounded-lg bg-blue-50 p-3">
      <Text testID="gym-score" className="font-semibold text-slate-900">
        Duels won · You {view.score.a} · Opponent {view.score.b}
      </Text>
      {!compact &&
        view.completed.map((duel, i) => (
          <Text key={duel.duelId} className="text-sm text-slate-700">
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
