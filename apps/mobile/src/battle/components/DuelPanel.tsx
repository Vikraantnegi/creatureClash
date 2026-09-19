import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import type { BattleController } from '../controller';
import type { BattleDisplay, BattleSheets } from '../types';
import { CATEGORY_LABEL } from '../constants';
import { duelResult } from '../copy';
import { MatchupTable } from './MatchupTable';
import { BattleArena } from './BattleArena';
import { Disclosure } from '../../components/Disclosure';
import { CategoryPicker } from './CategoryPicker';
import { ExchangeReveal } from './ExchangeReveal';
import { ExchangeHistory } from './ExchangeHistory';
export function DuelPanel({
  controller,
  display,
  sheets,
  standalone = false,
}: {
  controller: BattleController;
  display: BattleDisplay;
  sheets: BattleSheets;
  standalone?: boolean;
}) {
  const { phase, view, paused } = display;
  return (
    <View className="gap-4">
      {paused && (
        <Text className="rounded-lg bg-amber-100 p-3 font-sans text-amber-950">
          Paused while the app is inactive. Your remaining time is saved.
        </Text>
      )}
      <BattleArena sheets={sheets} finished={phase === 'finished'} />
      {phase === 'ready' && (
        <View className="gap-2">
          <MatchupTable sheets={sheets} />
          <Text className="text-muted font-sans text-sm">
            Each category once. Losing an exchange costs 1 HP. Opponent values become exact after
            they are played.
          </Text>
          <Button
            testID="start-duel"
            label="Start duel"
            primary
            disabled={paused}
            onPress={controller.start}
          />
        </View>
      )}
      {phase === 'selecting' && (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-ink font-sans text-lg font-semibold">
              Exchange {view.currentExchangeId} · choose
            </Text>
            <Text testID="selection-clock" className="text-rust font-mono text-2xl font-bold">
              {Math.ceil(display.remainingMs / 1000)}s
            </Text>
          </View>
          <Text className="text-muted font-sans text-xs">
            Opponent locked in. Its choice stays hidden until reveal.
          </Text>
          <CategoryPicker
            key={display.actionKey}
            opponent={sheets.opponent}
            side={view.self}
            disabled={paused}
            choose={(pick) => controller.choose(pick, display.actionKey)}
          />
          <Text className="text-muted font-sans text-xs">
            On timeout: first unused category in Attack, Defense, Speed, Special order.
          </Text>
        </View>
      )}
      {phase === 'committed' && display.choice !== null && (
        <View testID="commitment-feedback" className="bg-ground gap-2 rounded-xl p-4">
          <Text className="text-ink font-sans text-lg font-semibold">
            Committed: {CATEGORY_LABEL[display.choice]}
          </Text>
          <Text className="text-muted font-sans text-sm">
            {display.choiceSource === 'timeout'
              ? 'Time expired. The first unused category was selected.'
              : 'Your choice is locked.'}
          </Text>
          <Text className="text-muted font-sans text-xs">Revealing both choices…</Text>
        </View>
      )}
      {phase === 'reveal' && display.reveal && (
        <View className="gap-3">
          {display.choiceSource === 'timeout' && !display.reveal.isAutomaticFourth && (
            <Text className="text-muted font-sans text-xs">
              Your category was selected on timeout.
            </Text>
          )}
          <ExchangeReveal key={display.reveal.exchangeId} event={display.reveal} />
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
        <View className="gap-3">
          <Text testID="duel-result" className="text-ink font-sans text-xl font-bold">
            {duelResult(view.winner)}
          </Text>
          <Text className="text-muted font-sans text-sm">
            Final HP · You {view.self.hp} / Opponent {view.opponent.hp}
          </Text>
          {standalone && (
            <Button
              testID="rematch"
              label="Rematch"
              primary
              disabled={paused}
              onPress={controller.rematch}
            />
          )}
        </View>
      )}
      {phase === 'error' && (
        <View className="gap-2">
          <Text accessibilityRole="alert" className="text-ink font-sans font-bold">
            Duel paused by an error
          </Text>
          <Text className="text-muted font-sans text-sm">{display.error}</Text>
          {standalone && (
            <Button label="Restart duel" onPress={controller.rematch} disabled={paused} />
          )}
        </View>
      )}
      <Disclosure label={`Exchange history · ${view.history.length}`}>
        <ExchangeHistory events={view.history} />
      </Disclosure>
    </View>
  );
}
