import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import type { StatVisibility } from '../types';

export function StatVisibilityControls({
  visibility,
  configure,
}: {
  visibility: StatVisibility;
  configure: (value: StatVisibility) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-ink font-sans text-sm font-semibold">Opponent stats</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button
          testID="stats-profile"
          label="Species clues"
          selected={visibility === 'profile'}
          onPress={() => configure('profile')}
        />
        <Button
          testID="stats-exact"
          label="Exact"
          selected={visibility === 'exact'}
          onPress={() => configure('exact')}
        />
        <Button
          testID="stats-approximate"
          label="Ranges"
          selected={visibility === 'approximate'}
          onPress={() => configure('approximate')}
        />
      </View>
      <Text className="text-muted font-sans text-xs">
        {visibility === 'profile'
          ? 'Species clues describe typical strengths, not individual numbers. Played values become exact on reveal.'
          : 'Exact values or ten-point ranges: comparison controls.'}{' '}
        Choose before starting; the setting stays locked while you play.
      </Text>
    </View>
  );
}
