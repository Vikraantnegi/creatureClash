import { Text, View } from 'react-native';
import { creatureName } from '@creature-clash/battle-fixtures';
import type { GymView } from '@creature-clash/battle-engine';
import { CreatureArt } from '../../creatures/CreatureArt';
export function HiddenTeam({ view }: { view: GymView }) {
  return (
    <View className="gap-2">
      <Text className="text-muted font-mono text-xs font-semibold uppercase tracking-widest">
        Opponent’s three · revealed as they fight
      </Text>
      <View className="flex-row gap-2">
        {[0, 1, 2].map((i) => {
          const creature = view.completed[i]?.creatureB;
          return (
            <View
              key={i}
              className="border-line bg-card flex-1 items-center justify-center rounded-xl border border-dashed p-2"
            >
              {creature ? (
                <>
                  <CreatureArt speciesId={creature.speciesId} size={56} />
                  <Text className="text-muted font-sans text-xs">
                    {creatureName(creature.speciesId)} · spent
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-muted py-2 font-sans text-2xl">?</Text>
                  <Text className="text-muted font-sans text-xs">Hidden until sent</Text>
                </>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
