import { Text, View } from 'react-native';
import {
  CATEGORIES,
  getProgressionView,
  type CreatureProgress,
} from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { unwrapProgress } from './progression';

export function TrainingSummary({ progress }: { progress: CreatureProgress }) {
  const view = unwrapProgress(getProgressionView(progress));
  return (
    <View className="border-line bg-card gap-1 rounded-xl border p-3">
      <Text className="text-ink font-sans font-semibold">
        {creatureName(progress.base.speciesId)} · Level {view.level}
      </Text>
      <Text className="text-muted font-sans text-xs">
        {view.xp} lifetime XP · {view.unspentPoints} unspent points
      </Text>
      {CATEGORIES.map((category) => (
        <Text className="text-muted font-mono text-xs" key={category}>
          {category}: {progress.base.stats[category]} + {view.allocation[category]} ={' '}
          {view.creature.stats[category]}
        </Text>
      ))}
    </View>
  );
}
