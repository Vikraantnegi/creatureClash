import { useState } from 'react';
import { Text, View } from 'react-native';
import type { TrainingAllocation } from '@creature-clash/battle-engine';
import { CreatureTile } from '../components/CreatureTile';
import { TrainingCard } from './TrainingCard';
import type { TrainerSave } from './types';

export function TrainingJournal({
  save,
  disabled,
  error,
  train,
}: {
  save: TrainerSave;
  disabled: boolean;
  error: string | null;
  train: (id: string, allocation: TrainingAllocation) => void;
}) {
  const [selected, setSelected] = useState(save.rosters.A[0]!.instanceId);
  const progress = save.progress[selected];
  return (
    <View className="gap-3">
      <Text className="text-ink font-sans text-xl font-bold">Develop your team</Text>
      <Text className="text-muted font-sans text-sm">
        Gym participants earn XP. Each new level grants two points for you to spend. Standalone
        duels are practice and award no XP.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {save.rosters.A.map((creature, index) => (
          <View className="w-[31%]" key={creature.instanceId}>
            <CreatureTile
              creature={creature}
              slot={index + 1}
              selected={selected === creature.instanceId}
              disabled={disabled}
              onPress={() => setSelected(creature.instanceId)}
            />
          </View>
        ))}
      </View>
      {error && (
        <Text accessibilityRole="alert" className="font-sans text-red-800">
          {error}
        </Text>
      )}
      {disabled && <Text className="text-muted font-sans">Saving training…</Text>}
      {progress && (
        <TrainingCard
          key={`${selected}:${progress.xp}:${JSON.stringify(progress.allocation)}`}
          progress={progress}
          slot={save.rosters.A.findIndex((c) => c.instanceId === selected) + 1}
          disabled={disabled}
          commit={(allocation) => train(selected, allocation)}
        />
      )}
    </View>
  );
}
