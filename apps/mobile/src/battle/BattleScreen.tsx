import { ScrollView, Text, View } from 'react-native';
import { useBattle } from './useBattle';
import { MatchupControls } from './components/MatchupControls';
import { DuelPanel } from './components/DuelPanel';
import { StatVisibilityControls } from './components/StatVisibilityControls';
export function BattleScreen() {
  const { controller, display, sheets } = useBattle();
  return (
    <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
      <Text className="text-lg font-semibold text-slate-900">
        Single duel · {display.matchup.ai} opponent
      </Text>
      {(display.phase === 'ready' || display.phase === 'finished') && (
        <StatVisibilityControls
          visibility={display.statVisibility}
          configure={controller.configureVisibility}
        />
      )}
      {display.phase === 'ready' && (
        <MatchupControls matchup={display.matchup} configure={controller.configure} />
      )}
      <DuelPanel controller={controller} display={display} sheets={sheets} standalone />
      {display.phase === 'finished' && (
        <View className="gap-3">
          <Text className="text-lg font-semibold text-slate-900">Next matchup</Text>
          <MatchupControls matchup={display.matchup} configure={controller.configure} />
        </View>
      )}
    </ScrollView>
  );
}
