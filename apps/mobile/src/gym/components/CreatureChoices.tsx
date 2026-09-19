import { View } from 'react-native';
import type { CreatureSnapshot } from '@creature-clash/battle-engine';
import { CreatureTile } from '../../components/CreatureTile';
export function CreatureChoices({
  creatures,
  selected,
  choose,
  disabled = false,
  prefix,
}: {
  creatures: CreatureSnapshot[];
  selected: string[];
  choose: (id: string) => void;
  disabled?: boolean;
  prefix: string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {creatures.map((creature, i) => (
        <View key={creature.instanceId} className="w-[48%]">
          <CreatureTile
            creature={creature}
            slot={i + 1}
            testID={`${prefix}-${i}`}
            selected={selected.includes(creature.instanceId)}
            disabled={disabled}
            showStats
            onPress={() => choose(creature.instanceId)}
          />
        </View>
      ))}
    </View>
  );
}
