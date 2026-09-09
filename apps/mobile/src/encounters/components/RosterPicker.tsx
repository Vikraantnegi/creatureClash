import { FIXTURES, type CREATURES } from '@creature-clash/battle-fixtures';
import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { FixtureCard } from './FixtureCard';
export function RosterPicker({
  selected,
  toggle,
}: {
  selected: CREATURES[];
  toggle: (id: CREATURES) => void;
}) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-slate-900">
        Choose three creatures · {selected.length}/3
      </Text>
      {FIXTURES.map((fixture) => (
        <View key={fixture.id} className="gap-2">
          <FixtureCard creature={{ ...fixture, instanceId: fixture.id, speciesId: fixture.id }} />
          <Button
            testID={`roster-${fixture.id}`}
            label={`${selected.includes(fixture.id) ? 'Selected' : 'Choose'} ${fixture.name}`}
            selected={selected.includes(fixture.id)}
            disabled={selected.length === 3 && !selected.includes(fixture.id)}
            onPress={() => toggle(fixture.id)}
          />
        </View>
      ))}
    </View>
  );
}
