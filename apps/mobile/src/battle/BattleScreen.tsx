import { ScrollView, Text, View } from 'react-native';
import { useBattle } from './useBattle';
import { useBattleFlow } from './useBattleFlow';
import { MatchupControls } from './components/MatchupControls';
import { DuelPanel } from './components/DuelPanel';
import { StatVisibilityControls } from './components/StatVisibilityControls';
import { Disclosure } from '../components/Disclosure';
import { Button } from '../atoms/Button';
export function BattleScreen({ leave }: { leave: () => void }) {
  const { controller, display, sheets } = useBattle();
  const flow = useBattleFlow();
  const setup = display.phase === 'ready' && !flow.reviewing;
  return (
    <ScrollView key={setup ? 'setup' : 'battle'} contentContainerClassName="gap-4 p-4 pb-6">
      {(display.phase === 'ready' || display.phase === 'finished') && (
        <Button label="← Trainer journal" onPress={leave} />
      )}
      {setup ? (
        <>
          <Text className="text-ink font-sans text-2xl font-bold">Choose the matchup</Text>
          <MatchupControls matchup={display.matchup} configure={controller.configure} />
          <Disclosure label="Playtest visibility">
            <StatVisibilityControls
              visibility={display.statVisibility}
              configure={controller.configureVisibility}
            />
          </Disclosure>
          <Button testID="review-matchup" label="Review matchup →" primary onPress={flow.review} />
        </>
      ) : (
        <>
          {display.phase === 'ready' && <Button label="← Change creatures" onPress={flow.edit} />}
          <DuelPanel controller={controller} display={display} sheets={sheets} standalone />
          {display.phase === 'finished' && (
            <View className="gap-3">
              <Button
                label="Choose another matchup"
                onPress={() => {
                  controller.configure(display.matchup);
                  flow.edit();
                }}
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
