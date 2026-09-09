import type { DUEL_WINNER } from '@creature-clash/battle-engine';
import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { encounterResult } from '../copy';
export function EncounterResult({
  winner,
  mode,
  restart,
}: {
  winner: DUEL_WINNER;
  mode: 'run' | 'paired';
  restart: () => void;
}) {
  return (
    <View className="gap-3 rounded-xl bg-blue-50 p-4">
      <Text testID="encounter-result" className="text-xl font-bold text-slate-900">
        {encounterResult(winner, mode)}
      </Text>
      <Button testID="restart-encounter" label="Play again" primary onPress={restart} />
    </View>
  );
}
