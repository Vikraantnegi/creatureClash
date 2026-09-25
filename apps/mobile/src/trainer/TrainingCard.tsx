import { Text, View } from 'react-native';
import {
  CATEGORIES,
  type CreatureProgress,
  type TrainingAllocation,
} from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Button } from '../atoms/Button';
import { useTraining } from './useTraining';

export function TrainingCard({
  progress,
  disabled,
  commit,
  slot,
}: {
  progress: CreatureProgress;
  disabled: boolean;
  commit: (allocation: TrainingAllocation) => void;
  slot: number;
}) {
  const training = useTraining(progress);
  const { preview } = training;
  return (
    <View className="border-line bg-card gap-3 rounded-xl border p-4">
      <Text className="text-ink font-sans text-lg font-bold">
        {creatureName(progress.base.speciesId)} · Level {preview.level}
      </Text>
      <Text className="text-muted font-sans text-xs">Active slot {slot}</Text>
      <Text className="text-muted font-sans text-sm">
        {preview.xp} XP ·{' '}
        {preview.xpToNextLevel === null
          ? 'Level cap reached'
          : `${preview.xpToNextLevel} XP to next level`}
      </Text>
      <Text className="text-rust font-sans font-semibold">
        {preview.unspentPoints} points available
      </Text>
      {CATEGORIES.map((category) => (
        <View key={category} className="gap-1">
          <Text className="text-ink font-mono text-xs">
            {category} · {progress.base.stats[category]} base + {training.allocation[category]}{' '}
            training = {preview.creature.stats[category]}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={`− ${category}`}
                disabled={disabled || !training.canRemove(category)}
                onPress={() => training.adjust(category, -1)}
              />
            </View>
            <View className="flex-1">
              <Button
                label={`+ ${category}`}
                disabled={disabled || !training.canAdd(category)}
                onPress={() => training.adjust(category, 1)}
              />
            </View>
          </View>
        </View>
      ))}
      <Text className="text-muted font-sans text-xs">
        One point adds one stat. Maximum +8 per category. Confirmed points cannot be reassigned.
        Training stays with this creature if it changes owners.
      </Text>
      <Button
        testID="confirm-training"
        primary
        label="Confirm training"
        disabled={disabled || !training.changed}
        onPress={() => commit(training.allocation)}
      />
      <Button
        label="Reset preview"
        disabled={disabled || !training.changed}
        onPress={training.reset}
      />
    </View>
  );
}
