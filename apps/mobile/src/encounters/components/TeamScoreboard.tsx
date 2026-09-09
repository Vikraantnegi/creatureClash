import { DUEL_WINNER, type PairedState } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Text, View } from 'react-native';
export function TeamScoreboard({
  state,
  score,
  compact = false,
}: {
  state: PairedState;
  score: { a: number; b: number };
  compact?: boolean;
}) {
  return (
    <View className="gap-2 rounded-lg bg-blue-50 p-3">
      <Text testID="team-score" className="font-bold text-slate-900">
        Duels won: You {score.a} · Opponent {score.b}
      </Text>
      {!compact &&
        state.teamA.map((creature, index) => (
          <Text key={creature.instanceId} className="text-sm text-slate-700">
            {index + 1}. {creatureName(creature.speciesId)} vs{' '}
            {creatureName(state.teamB[index]!.speciesId)} ·{' '}
            {state.completed[index]
              ? state.completed[index].winner === DUEL_WINNER.DRAW
                ? 'Draw'
                : state.completed[index].winner === DUEL_WINNER.A
                  ? 'You won'
                  : 'Opponent won'
              : 'Not played'}
          </Text>
        ))}
    </View>
  );
}
