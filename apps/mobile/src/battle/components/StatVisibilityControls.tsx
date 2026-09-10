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
      <Text className="text-sm font-semibold text-slate-900">Opponent stats</Text>
      <View className="flex-row gap-2">
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
      <Text className="text-xs text-slate-600">
        Ranges cover ten effective points, such as 70–79.9. Choose before starting; this setting
        stays locked while you play.
      </Text>
    </View>
  );
}
