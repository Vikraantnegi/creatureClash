import { CATEGORIES, type CreatureSnapshot } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Text, View } from 'react-native';
import { CATEGORY_LABEL } from '../../battle/constants';
import { typeLabel } from '../../battle/format';
export function FixtureCard({ creature, label }: { creature: CreatureSnapshot; label?: string }) {
  return (
    <View className="gap-1 rounded-lg border border-slate-300 bg-white p-3">
      {label && <Text className="text-xs font-semibold text-slate-600">{label}</Text>}
      <Text className="font-bold text-slate-900">
        {creatureName(creature.speciesId)} · {typeLabel(creature.typeId)}
      </Text>
      <Text className="text-xs leading-5 text-slate-600">
        {CATEGORIES.map(
          (category) => `${CATEGORY_LABEL[category]} ${creature.stats[category]}`,
        ).join(' · ')}
      </Text>
    </View>
  );
}
