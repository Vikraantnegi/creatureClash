import type { CreatureSnapshot } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { FixtureCard } from './FixtureCard';
export function SwapChoice({
  defeated,
  next,
  roster,
  allowed,
  swap,
}: {
  defeated: CreatureSnapshot;
  next: CreatureSnapshot;
  roster: CreatureSnapshot[];
  allowed: boolean[];
  swap: (slot: number | null) => void;
}) {
  return (
    <View className="gap-3">
      <Text className="text-xl font-bold text-slate-900">Keep your team or make a swap</Text>
      <FixtureCard creature={next} label="NEXT OPPONENT" />
      <FixtureCard creature={defeated} label="AVAILABLE AFTER YOUR WIN" />
      <Button testID="keep-roster" label="Keep roster" primary onPress={() => swap(null)} />
      {roster.map((creature, slot) => (
        <View key={creature.instanceId} className="gap-2">
          <FixtureCard creature={creature} />
          <Button
            testID={`swap-${slot}`}
            label={`Replace ${creatureName(creature.speciesId)}`}
            disabled={!allowed[slot]}
            onPress={() => swap(slot)}
          />
        </View>
      ))}
      <Text className="text-xs text-slate-600">
        Swaps last for this run. Your roster must keep three distinct species.
      </Text>
    </View>
  );
}
