import { ScrollView, Text, View } from 'react-native';
import type { TrainerRosters } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { CreatureArt } from '../creatures/CreatureArt';
import { Button } from '../atoms/Button';
import type { ReactNode } from 'react';
export function HomeScreen({
  open,
  roster,
  children,
  disabled = false,
}: {
  open: (mode: 'duel' | 'gym') => void;
  roster: TrainerRosters['A'];
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <ScrollView contentContainerClassName="grow justify-between gap-6 p-6 pb-8">
      <View className="gap-2 pt-6">
        <Text className="text-rust font-mono text-xs font-semibold uppercase tracking-widest">
          Trainer journal
        </Text>
        <Text className="text-ink font-sans text-4xl font-bold">Pick a fight.</Text>
        <Text className="text-muted font-sans text-base">
          Know your creature. Read your opponent.
        </Text>
      </View>
      <View className="items-center">
        <CreatureArt speciesId="ashkit" size={240} mood="confident" />
      </View>
      <View className="gap-3">
        <Button
          testID="mode-duel"
          disabled={disabled}
          primary
          label="Standalone duel  →"
          onPress={() => open('duel')}
        />
        <Text className="text-muted px-2 font-sans text-xs">
          One creature each · four categories · two HP
        </Text>
        <Button
          testID="mode-gym"
          disabled={disabled}
          label="Gym · 3 v 3  →"
          onPress={() => open('gym')}
        />
        <Text className="text-muted px-2 font-sans text-xs">
          Lock three of six · three duels · optional exchange
        </Text>
      </View>
      <Text className="text-muted text-center font-sans text-xs leading-5">
        Your active six · {roster.map((c) => creatureName(c.speciesId)).join(' · ')}
      </Text>
      {children}
      <Text className="text-muted text-center font-sans text-xs">
        Your creatures and completed exchanges are saved on this device.
      </Text>
    </ScrollView>
  );
}
