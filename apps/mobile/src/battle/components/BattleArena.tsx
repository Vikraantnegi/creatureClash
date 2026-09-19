import { Text, View, useWindowDimensions } from 'react-native';
import { creatureName } from '@creature-clash/battle-fixtures';
import { CreatureArt } from '../../creatures/CreatureArt';
import { typeLabel } from '../format';
import type { BattleSheets, CreatureSheetView } from '../types';
function Badge({ side, yours }: { side: CreatureSheetView; yours?: boolean }) {
  return (
    <View
      className={`border-ink bg-card min-w-36 gap-1 rounded-xl border px-3 py-2 ${yours ? '' : 'border-dashed'}`}
    >
      <Text className="text-ink font-sans text-sm font-bold">
        {creatureName(side.speciesId)} · {typeLabel(side.typeId)}
      </Text>
      <View className="flex-row items-center gap-1">
        {[1, 2].map((n) => (
          <View
            key={n}
            className={`border-ink h-3 w-6 rounded-sm border ${side.hp >= n ? 'bg-ink' : 'bg-card'}`}
          />
        ))}
        <Text className="text-muted ml-1 font-mono text-xs">
          {side.hp} HP · ×{(side.typeFactor / 10).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
export function BattleArena({
  sheets,
  finished = false,
}: {
  sheets: BattleSheets;
  finished?: boolean;
}) {
  const { width } = useWindowDimensions();
  const artSize = width < 400 ? 96 : 112;
  return (
    <View className="border-line bg-paper overflow-hidden rounded-2xl border">
      <View className="flex-row items-center justify-between px-3">
        <Badge side={sheets.opponent} />
        <CreatureArt
          speciesId={sheets.opponent.speciesId}
          mirror
          size={artSize}
          mood={
            sheets.opponent.hp === 0
              ? 'defeated'
              : finished && sheets.opponent.hp > sheets.self.hp
                ? 'confident'
                : 'neutral'
          }
        />
      </View>
      <View className="bg-ground flex-row items-center justify-between px-3">
        <CreatureArt
          speciesId={sheets.self.speciesId}
          size={artSize}
          mood={
            sheets.self.hp === 0
              ? 'defeated'
              : finished && sheets.self.hp > sheets.opponent.hp
                ? 'confident'
                : 'neutral'
          }
        />
        <Badge side={sheets.self} yours />
      </View>
    </View>
  );
}
