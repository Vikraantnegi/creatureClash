import { Text, View } from 'react-native';
import type { CreaturePreview } from '@creature-clash/battle-engine';
import { CreatureTile } from '../../components/CreatureTile';
export function RosterPreview({ creatures }: { creatures: CreaturePreview[] }) {
  return (
    <View className="gap-2">
      <Text className="text-muted font-mono text-xs font-semibold uppercase tracking-widest">
        Opponent’s six · values hidden
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {creatures.map((creature) => (
          <View key={creature.instanceId} className="w-[31%]">
            <CreatureTile creature={creature} />
          </View>
        ))}
      </View>
      <Text className="text-muted font-sans text-xs">
        Their chosen three and deployment order stay hidden.
      </Text>
    </View>
  );
}
