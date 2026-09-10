import { View } from 'react-native';
import { CATEGORIES, type CreatureSnapshot } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Button } from '../../atoms/Button';
import { typeLabel } from '../../battle/format';
import { CATEGORY_LABEL } from '../../battle/constants';
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
    <View className="gap-2">
      {creatures.map((creature, i) => (
        <Button
          key={creature.instanceId}
          testID={`${prefix}-${i}`}
          selected={selected.includes(creature.instanceId)}
          disabled={disabled}
          label={`${i + 1}. ${creatureName(creature.speciesId)} · ${typeLabel(creature.typeId)}\n${CATEGORIES.map((category) => `${CATEGORY_LABEL[category]} ${creature.stats[category]}`).join(' · ')}`}
          onPress={() => choose(creature.instanceId)}
        />
      ))}
    </View>
  );
}
