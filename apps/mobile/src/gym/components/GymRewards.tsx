import { Text, View } from 'react-native';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Button } from '../../atoms/Button';
import type { TrainingReward } from '../../trainer/types';

export function GymRewards({
  rewards,
  disabled,
  retry,
  proceed,
}: {
  rewards: TrainingReward[] | null;
  disabled: boolean;
  retry: () => void;
  proceed: () => void;
}) {
  return (
    <View className="gap-3">
      <Text className="text-ink font-sans text-xl font-bold">Your team gained experience</Text>
      <Text className="text-muted font-sans text-sm">
        Win +15 XP · loss or draw +10 XP. Only the three participants earn XP. New levels grant
        points; stats change when you train after the exchange.
      </Text>
      {rewards
        ?.filter((r) => r.side === 'A')
        .map((reward) => (
          <View key={reward.instanceId} className="border-line bg-card gap-1 rounded-lg border p-3">
            <Text className="text-ink font-sans font-semibold">
              {creatureName(reward.speciesId)} · +{reward.xp} XP
            </Text>
            <Text className="text-muted font-sans">
              {reward.afterLevel > reward.beforeLevel
                ? `Level ${reward.beforeLevel} → ${reward.afterLevel} · +${reward.points} training points`
                : `Level ${reward.afterLevel}`}
            </Text>
          </View>
        ))}
      <Button
        testID="continue-rewards"
        primary
        label={rewards ? 'Continue to encounter result' : 'Retry saving rewards'}
        disabled={disabled}
        onPress={rewards ? proceed : retry}
      />
    </View>
  );
}
