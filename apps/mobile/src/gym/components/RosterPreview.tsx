import { Text, View } from 'react-native';
import type { CreaturePreview } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { typeLabel } from '../../battle/format';
export function RosterPreview({ creatures }: { creatures: CreaturePreview[] }) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-slate-900">Opponent’s active six</Text>
      <View className="flex-row flex-wrap gap-2">
        {creatures.map((creature, i) => (
          <Text
            key={creature.instanceId}
            className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700"
          >
            {i + 1}. {creatureName(creature.speciesId)} · {typeLabel(creature.typeId)}
          </Text>
        ))}
      </View>
      <Text className="text-xs text-slate-600">
        Their chosen three and next deployment stay hidden.
      </Text>
    </View>
  );
}
