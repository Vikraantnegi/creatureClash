import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { FIXTURES } from '../fixtures';
import { BATTLE_MODES, type Matchup } from '../types';
import { CreatureTile } from '../../components/CreatureTile';
import { Disclosure } from '../../components/Disclosure';
export function MatchupControls({
  matchup,
  configure,
}: {
  matchup: Matchup;
  configure: (value: Matchup) => void;
}) {
  return (
    <View className="gap-4">
      {(['yours', 'opponent'] as const).map((role) => (
        <View key={role} className="gap-2">
          <Text className="text-muted font-mono text-xs font-semibold uppercase tracking-widest">
            {role === 'yours' ? 'Your creature · exact values' : 'Opponent · species and type'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {FIXTURES.map((f) => (
              <View className="w-[31%]" key={f.id}>
                <CreatureTile
                  creature={{ speciesId: f.id, typeId: f.typeId, stats: f.stats }}
                  selected={matchup[role] === f.id}
                  showStats={role === 'yours'}
                  onPress={() => configure({ ...matchup, [role]: f.id })}
                  testID={`${role}-${f.id}`}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
      <Disclosure label="Playtest opponent">
        <View className="flex-row flex-wrap gap-2">
          {Object.values(BATTLE_MODES).map((ai) => (
            <Button
              key={ai}
              label={ai}
              selected={matchup.ai === ai}
              onPress={() => configure({ ...matchup, ai })}
            />
          ))}
        </View>
        <Text className="text-muted font-sans text-xs">
          Tactical plans with visible clues. Greedy spends its strongest category.
        </Text>
      </Disclosure>
    </View>
  );
}
