import { Pressable, Text, View } from 'react-native';
import { creatureName } from '@creature-clash/battle-fixtures';
import type { CreatureSnapshot } from '@creature-clash/battle-engine';
import { CreatureArt } from '../creatures/CreatureArt';
import { typeLabel } from '../battle/format';
export function CreatureTile({
  creature,
  selected = false,
  disabled = false,
  onPress,
  testID,
  showStats = false,
  slot,
}: {
  creature: Pick<CreatureSnapshot, 'speciesId' | 'typeId' | 'level'> &
    Partial<Pick<CreatureSnapshot, 'stats'>>;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  showStats?: boolean;
  slot?: number;
}) {
  const name = creatureName(creature.speciesId);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${slot ? `Slot ${slot}. ` : ''}${name}, ${typeLabel(creature.typeId)}, level ${creature.level ?? 1}${showStats && creature.stats ? `, Attack ${creature.stats.ATTACK}, Defense ${creature.stats.DEFENSE}, Speed ${creature.stats.SPEED}, Special ${creature.stats.SPECIAL}` : ''}`}
      accessibilityState={{ selected, disabled }}
      className={`min-h-28 flex-1 items-center justify-center rounded-2xl border p-2 ${selected ? 'border-ink bg-ink' : 'border-line bg-card'} ${disabled ? 'opacity-40' : ''}`}
    >
      <CreatureArt speciesId={creature.speciesId} size={72} />
      <Text
        className={`text-center font-sans text-sm font-bold ${selected ? 'text-white' : 'text-ink'}`}
      >
        {name}
        {slot ? ` · ${slot}` : ''}
      </Text>
      <Text className={`font-sans text-xs ${selected ? 'text-white' : 'text-muted'}`}>
        {typeLabel(creature.typeId)}
        {` · Lv ${creature.level ?? 1}`}
        {selected ? ' · selected' : ''}
      </Text>
      {showStats && creature.stats && (
        <View className="mt-1">
          <Text
            className={`text-center font-sans text-xs ${selected ? 'text-white' : 'text-muted'}`}
          >
            ATK {creature.stats.ATTACK} · DEF {creature.stats.DEFENSE}
            {'\n'}SPD {creature.stats.SPEED} · SPC {creature.stats.SPECIAL}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
