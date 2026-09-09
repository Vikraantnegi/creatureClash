import { CATEGORIES, STARTING_HP, type SidePublic } from '@creature-clash/battle-engine';
import { Text, View } from 'react-native';
import { creatureName } from '../fixtures';
import { CATEGORY_LABEL } from '../constants';
import { score, typeLabel } from '../format';
export function CreatureSheet({ side, label }: { side: SidePublic; label: string }) {
  return (
    <View className="flex-1 gap-1 rounded-xl border border-slate-300 bg-white p-3">
      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
      <Text className="text-lg font-bold text-slate-900">
        {creatureName(side.creature.speciesId)}
      </Text>
      <Text className="text-sm text-slate-700">
        {typeLabel(side.creature.typeId)} · ×{(side.typeFactor / 10).toFixed(2)}
      </Text>
      <Text className="my-1 text-lg font-bold text-blue-900">
        HP: {side.hp} / {STARTING_HP}
      </Text>
      <Text className="text-xs text-slate-600">Raw → effective</Text>
      {CATEGORIES.map((category) => {
        const spent = side.usedCategories.includes(category);
        return (
          <View key={category} className="gap-1 py-1">
            <Text className={`text-xs ${spent ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
              {CATEGORY_LABEL[category]}
              {spent ? ' · spent' : ''}
            </Text>
            <Text
              className={`text-sm font-semibold ${spent ? 'text-slate-500 line-through' : 'text-slate-900'}`}
            >
              {side.creature.stats[category]} → {score(side.effectiveScores[category])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
