import {
  CATEGORY,
  CATEGORIES,
  DUEL_WINNER,
  PLAYER,
  type ExchangeResultEvent,
  type SidePublic,
} from '@creature-clash/battle-engine';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Matchup } from './controller';
import { FIXTURES, creatureName } from './fixtures';
import { useBattle } from './useBattle';

const CATEGORY_LABEL: Record<CATEGORY, string> = {
  [CATEGORY.ATTACK]: 'Attack',
  [CATEGORY.DEFENSE]: 'Defense',
  [CATEGORY.SPEED]: 'Speed',
  [CATEGORY.SPECIAL]: 'Special',
};
const score = (tenths: number) => String(tenths / 10);
const typeLabel = (type: string) => type[0] + type.slice(1).toLowerCase();

function Button({
  label,
  onPress,
  disabled = false,
  selected = false,
  primary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        (primary || selected) && styles.selectedButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text style={[styles.buttonText, (primary || selected) && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

function CreatureSheet({ side, label }: { side: SidePublic; label: string }) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.creatureName}>{creatureName(side.creature.speciesId)}</Text>
      <Text style={styles.detail}>
        {typeLabel(side.creature.typeId)} · ×{(side.typeFactor / 10).toFixed(2)}
      </Text>
      <Text style={styles.hp}>HP: {side.hp} / 2</Text>
      <Text style={styles.small}>Raw → effective</Text>
      {CATEGORIES.map((category) => {
        const spent = side.usedCategories.includes(category);
        return (
          <View key={category} style={styles.statRow}>
            <Text style={[styles.statLabel, spent && styles.spent]}>
              {CATEGORY_LABEL[category]}
              {spent ? ' · spent' : ''}
            </Text>
            <Text style={[styles.statValue, spent && styles.spent]}>
              {side.creature.stats[category]} → {score(side.effectiveScores[category])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function MatchupControls({
  matchup,
  configure,
}: {
  matchup: Matchup;
  configure: (value: Matchup) => void;
}) {
  return (
    <View style={styles.setup}>
      {(['yours', 'opponent'] as const).map((role) => (
        <View key={role}>
          <Text style={styles.caption}>{role === 'yours' ? 'Your creature' : 'Opponent'}</Text>
          <View style={styles.chips}>
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
      <View style={styles.chips}>
        <Button
          label="AI: Greedy"
          selected={matchup.ai === 'greedy'}
          onPress={() => configure({ ...matchup, ai: 'greedy' })}
        />
        <Button
          label="AI: Random"
          selected={matchup.ai === 'random'}
          onPress={() => configure({ ...matchup, ai: 'random' })}
        />
      </View>
    </View>
  );
}

function exchangeSummary(event: ExchangeResultEvent): string {
  if (event.exchangeWinner === 'tie') return 'Tie · no HP lost';
  return event.exchangeWinner === PLAYER.A
    ? `You win · opponent loses ${event.damageToB} HP`
    : `Opponent wins · you lose ${event.damageToA} HP`;
}

function Reveal({ event }: { event: ExchangeResultEvent }) {
  return (
    <View style={styles.reveal} testID="exchange-reveal">
      <Text style={styles.sectionTitle}>
        {event.isAutomaticFourth
          ? 'Automatic tiebreak · exchange 4'
          : `Exchange ${event.exchangeNumber} revealed`}
      </Text>
      <Text style={styles.detail}>
        You: {CATEGORY_LABEL[event.aPick]} · {event.aRawStat} ×{' '}
        {(event.aTypeFactor / 10).toFixed(2)} = {score(event.aEffective)}
      </Text>
      <Text style={styles.detail}>
        Opponent: {CATEGORY_LABEL[event.bPick]} · {event.bRawStat} ×{' '}
        {(event.bTypeFactor / 10).toFixed(2)} = {score(event.bEffective)}
      </Text>
      <Text style={styles.result}>{exchangeSummary(event)}</Text>
      {event.isAutomaticFourth && (
        <Text style={styles.small}>
          HP was tied after three. Each creature used its remaining category.
        </Text>
      )}
    </View>
  );
}

export function BattleScreen() {
  const { controller, display } = useBattle();
  const { phase, view, paused } = display;
  const canConfigure = phase === 'ready' || phase === 'finished';
  const selecting = phase === 'selecting';
  const resultLabel =
    view.winner === DUEL_WINNER.DRAW
      ? 'Duel drawn'
      : view.winner === DUEL_WINNER.A
        ? 'You won the duel'
        : 'Opponent won the duel';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Creature Clash</Text>
          <Text style={styles.caption}>Single duel · {display.matchup.ai} opponent</Text>
        </View>

        {phase === 'ready' && (
          <MatchupControls matchup={display.matchup} configure={controller.configure} />
        )}
        {paused && (
          <Text style={styles.notice}>
            Paused while the app is inactive. Your remaining time is saved.
          </Text>
        )}

        <View style={styles.sheets}>
          <CreatureSheet side={view.self} label="YOU · A" />
          <CreatureSheet side={view.opponent} label="OPPONENT · B" />
        </View>

        {phase === 'ready' && (
          <View style={styles.actions}>
            <Text style={styles.detail}>Each category once. Losing an exchange costs 1 HP.</Text>
            <Button
              testID="start-duel"
              label="Start duel"
              primary
              disabled={paused}
              onPress={controller.start}
            />
          </View>
        )}

        {selecting && (
          <View style={styles.actions}>
            <View style={styles.timerRow}>
              <Text style={styles.sectionTitle}>Exchange {view.currentExchangeId} · choose</Text>
              <Text testID="selection-clock" style={styles.timer}>
                {Math.ceil(display.remainingMs / 1000)}s
              </Text>
            </View>
            <Text style={styles.small}>
              Opponent locked in. Its choice stays hidden until reveal.
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => {
                const available = view.self.availableCategories.includes(category);
                return (
                  <View key={category} style={styles.categoryCell}>
                    <Button
                      testID={`choose-${category}`}
                      label={`${CATEGORY_LABEL[category]} · ${available ? score(view.self.effectiveScores[category]) : 'spent'}`}
                      disabled={paused || !available}
                      onPress={() => controller.choose(category, display.actionKey)}
                    />
                  </View>
                );
              })}
            </View>
            <Text style={styles.small}>
              On timeout: first unused category in Attack, Defense, Speed, Special order.
            </Text>
          </View>
        )}

        {phase === 'committed' && display.choice !== null && (
          <View style={styles.reveal} testID="commitment-feedback">
            <Text style={styles.sectionTitle}>Committed: {CATEGORY_LABEL[display.choice]}</Text>
            <Text style={styles.detail}>
              {display.choiceSource === 'timeout'
                ? 'Time expired. The first unused category was selected.'
                : 'Your choice is locked.'}
            </Text>
            <Text style={styles.small}>Revealing both choices…</Text>
          </View>
        )}

        {phase === 'reveal' && display.reveal && (
          <View style={styles.actions}>
            {display.choiceSource === 'timeout' && !display.reveal.isAutomaticFourth && (
              <Text style={styles.small}>Your category was selected on timeout.</Text>
            )}
            <Reveal event={display.reveal} />
            <Button
              testID="continue"
              label="Continue"
              primary
              disabled={paused}
              onPress={() => controller.continue(display.actionKey)}
            />
          </View>
        )}

        {phase === 'finished' && (
          <View style={styles.actions}>
            <Text testID="duel-result" style={styles.result}>
              {resultLabel}
            </Text>
            <Text style={styles.detail}>
              Final HP · You {view.self.hp} / Opponent {view.opponent.hp}
            </Text>
            <Button
              testID="rematch"
              label="Rematch"
              primary
              disabled={paused}
              onPress={controller.rematch}
            />
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.actions}>
            <Text accessibilityRole="alert" style={styles.result}>
              Duel paused by an error
            </Text>
            <Text style={styles.detail}>{display.error}</Text>
            <Button label="Restart duel" onPress={controller.rematch} disabled={paused} />
          </View>
        )}

        {view.history.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.sectionTitle}>Exchange history</Text>
            {view.history.map((event) => (
              <View key={event.exchangeId} style={styles.historyItem}>
                <Text style={styles.detail}>
                  {event.exchangeNumber}
                  {event.isAutomaticFourth ? ' · Auto' : ''}: {CATEGORY_LABEL[event.aPick]}{' '}
                  {score(event.aEffective)} vs {CATEGORY_LABEL[event.bPick]}{' '}
                  {score(event.bEffective)}
                </Text>
                <Text style={styles.small}>{exchangeSummary(event)}</Text>
              </View>
            ))}
          </View>
        )}

        {canConfigure && phase === 'finished' && (
          <View style={styles.setup}>
            <Text style={styles.sectionTitle}>Next matchup</Text>
            <MatchupControls matchup={display.matchup} configure={controller.configure} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f5f7' },
  page: { padding: 16, gap: 16, paddingBottom: 32 },
  header: { gap: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#172333' },
  caption: { fontSize: 12, fontWeight: '600', color: '#526173' },
  detail: { fontSize: 14, color: '#27384a', lineHeight: 21 },
  small: { fontSize: 12, color: '#526173', lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#172333' },
  setup: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  button: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9caab9',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  selectedButton: { backgroundColor: '#214f79', borderColor: '#214f79' },
  disabledButton: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#172333', textAlign: 'center' },
  selectedText: { color: '#ffffff' },
  sheets: { flexDirection: 'row', gap: 10 },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#d4dce4',
  },
  creatureName: { fontSize: 19, fontWeight: '700', color: '#172333' },
  hp: { fontSize: 19, fontWeight: '700', color: '#214f79', marginVertical: 5 },
  statRow: { paddingVertical: 4, gap: 2 },
  statLabel: { fontSize: 13, color: '#27384a' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#172333', fontVariant: ['tabular-nums'] },
  spent: { color: '#657381', textDecorationLine: 'line-through' },
  actions: { gap: 10 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontSize: 24, fontWeight: '700', color: '#214f79', fontVariant: ['tabular-nums'] },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCell: { width: '48%' },
  reveal: { gap: 7, padding: 14, borderRadius: 10, backgroundColor: '#e6edf5' },
  result: { fontSize: 18, fontWeight: '700', color: '#172333' },
  notice: { padding: 10, backgroundColor: '#fff0ca', color: '#59430c' },
  history: { gap: 8 },
  historyItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#d4dce4' },
});
