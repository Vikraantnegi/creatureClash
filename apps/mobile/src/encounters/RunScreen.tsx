import { RUN_PHASE } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../atoms/Button';
import { useRun } from './hooks/useRun';
import { RosterPicker } from './components/RosterPicker';
import { FixtureCard } from './components/FixtureCard';
import { SwapChoice } from './components/SwapChoice';
import { ManagedDuel } from './components/ManagedDuel';
import { EncounterResult } from './components/EncounterResult';
export function RunScreen() {
  const run = useRun();
  const state = run.state;
  return (
    <ScrollView
      key={state ? `${state.runId}:${state.opponentIndex}:${state.phase}` : 'setup'}
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <Text className="text-lg font-semibold text-slate-900">
        Swap run{state ? ` · Duel ${state.opponentIndex + 1} of 3` : ''}
      </Text>
      {!state && (
        <>
          <Text className="text-sm text-slate-700">
            Win three duels. After a win, keep your roster or swap a creature. A loss or draw ends
            the run. Every duel starts fresh.
          </Text>
          <RosterPicker selected={run.selected} toggle={run.toggle} />
          <Button
            testID="start-run"
            label="Start run"
            primary
            disabled={!run.canStart}
            onPress={run.start}
          />
          {run.error && <Text accessibilityRole="alert">{run.error}</Text>}
        </>
      )}
      {state?.phase === RUN_PHASE.CHOOSING && (
        <>
          <FixtureCard creature={state.opponents[state.opponentIndex]!} label="OPPONENT" />
          <Text className="font-semibold text-slate-900">Choose your creature</Text>
          {state.roster.map((creature, slot) => (
            <View key={creature.instanceId} className="gap-2">
              <FixtureCard creature={creature} />
              <Button
                testID={`select-run-${slot}`}
                label={`Use ${creatureName(creature.speciesId)}`}
                onPress={() => run.choose(slot)}
              />
            </View>
          ))}
        </>
      )}
      {state?.phase === RUN_PHASE.DUELING && state.activeDuel && (
        <ManagedDuel
          key={state.activeDuel.duelId}
          duel={state.activeDuel}
          complete={run.complete}
        />
      )}
      {state?.phase === RUN_PHASE.SWAPPING && (
        <SwapChoice
          defeated={state.opponents[state.opponentIndex]!}
          next={state.opponents[state.opponentIndex + 1]!}
          roster={state.roster}
          allowed={run.replacements}
          swap={run.swap}
        />
      )}
      {state?.phase === RUN_PHASE.FINISHED && (
        <EncounterResult winner={state.winner} mode="run" restart={run.restart} />
      )}
      {state && state.phase !== RUN_PHASE.FINISHED && (
        <Button testID="restart-run" label="Restart run" onPress={run.restart} />
      )}
    </ScrollView>
  );
}
