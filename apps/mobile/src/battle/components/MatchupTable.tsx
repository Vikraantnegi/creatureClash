import { Text, View } from 'react-native';
import type { BattleSheets } from '../types';
import { CATEGORY_LABEL } from '../constants';
export function MatchupTable({ sheets }: { sheets: BattleSheets }) {
  return (
    <View className="border-line bg-card gap-2 rounded-xl border p-3">
      <View className="flex-row justify-between">
        <Text className="text-muted font-mono text-xs font-semibold">YOUR VALUES</Text>
        <Text className="text-muted font-mono text-xs font-semibold">OPPONENT</Text>
      </View>
      {sheets.self.categories.map((row, index) => (
        <View key={row.category} className="flex-row justify-between gap-2">
          <Text className="text-ink flex-1 font-mono text-sm">
            {CATEGORY_LABEL[row.category]} · {row.effective}
          </Text>
          <Text className="text-muted font-mono text-xs">
            {sheets.opponent.categories[index]?.effective}
          </Text>
        </View>
      ))}
    </View>
  );
}
