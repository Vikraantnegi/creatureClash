import { PAIRED_PHASE } from '@creature-clash/battle-engine';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../atoms/Button';
import { usePaired } from './hooks/usePaired';
import { ManagedDuel } from './components/ManagedDuel';
import { TeamScoreboard } from './components/TeamScoreboard';
import { EncounterResult } from './components/EncounterResult';
export function PairedScreen() {
  const paired = usePaired();
  const { state } = paired;
  return (
    <ScrollView
      key={`${state.encounterId}:${state.completed.length}:${state.phase}`}
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <Text className="text-lg font-semibold text-slate-900">Paired 3v3 · comparison</Text>
      {state.phase !== PAIRED_PHASE.DUELING && (
        <Text className="text-xs text-slate-600">
          Each creature fights once. Every duel starts fresh. All three pairs are played. This is a
          temporary format.
        </Text>
      )}
      {state.phase === PAIRED_PHASE.READY && state.completed.length === 0 && (
        <View className="flex-row gap-2">
          <Button
            testID="paired-standard"
            label="Mixed teams"
            selected={!paired.mirror}
            onPress={() => paired.configureMirror(false)}
          />
          <Button
            testID="paired-mirror"
            label="Mirrored teams"
            selected={paired.mirror}
            onPress={() => paired.configureMirror(true)}
          />
        </View>
      )}
      <TeamScoreboard
        state={state}
        score={paired.score}
        compact={state.phase === PAIRED_PHASE.DUELING}
      />
      {state.phase !== PAIRED_PHASE.FINISHED && (
        <Text className="font-semibold text-slate-900">Duel {state.completed.length + 1} of 3</Text>
      )}
      {state.phase === PAIRED_PHASE.READY && (
        <Button
          testID="next-pair"
          label={state.completed.length ? 'Review next duel' : 'Review first duel'}
          primary
          onPress={paired.start}
        />
      )}
      {state.phase === PAIRED_PHASE.DUELING && state.activeDuel && (
        <ManagedDuel
          key={state.activeDuel.duelId}
          duel={state.activeDuel}
          complete={paired.complete}
        />
      )}
      {state.phase === PAIRED_PHASE.FINISHED ? (
        <EncounterResult winner={state.winner} mode="paired" restart={paired.restart} />
      ) : (
        <Button testID="restart-paired" label="Restart encounter" onPress={paired.restart} />
      )}
    </ScrollView>
  );
}
