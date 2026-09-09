import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import { FIXTURES } from '../fixtures';
import { BATTLE_MODES, type Matchup } from '../types';
export function MatchupControls({
  matchup,
  configure,
}: {
  matchup: Matchup;
  configure: (value: Matchup) => void;
}) {
  return (
    <View className="gap-3">
      {(['yours', 'opponent'] as const).map((role) => (
        <View key={role} className="gap-2">
          <Text className="text-xs font-semibold text-slate-600">
            {role === 'yours' ? 'Your creature' : 'Opponent'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {FIXTURES.map((fixture) => (
              <Button
                key={fixture.id}
                testID={`${role}-${fixture.id}`}
                label={fixture.name}
                selected={matchup[role] === fixture.id}
                onPress={() => configure({ ...matchup, [role]: fixture.id })}
              />
            ))}
          </View>
        </View>
      ))}
      <View className="flex-row gap-2">
        <Button
          label="AI: Greedy"
          selected={matchup.ai === BATTLE_MODES.GREEDY}
          onPress={() => configure({ ...matchup, ai: BATTLE_MODES.GREEDY })}
        />
        <Button
          label="AI: Random"
          selected={matchup.ai === BATTLE_MODES.RANDOM}
          onPress={() => configure({ ...matchup, ai: BATTLE_MODES.RANDOM })}
        />
      </View>
    </View>
  );
}
