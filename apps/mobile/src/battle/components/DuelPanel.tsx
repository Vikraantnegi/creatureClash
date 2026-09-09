import { Text, View } from 'react-native';
import { Button } from '../../atoms/Button';
import type { BattleController } from '../controller';
import type { BattleDisplay } from '../types';
import { CATEGORY_LABEL } from '../constants';
import { duelResult } from '../copy';
import { CreatureSheet } from './CreatureSheet';
import { CategoryPicker } from './CategoryPicker';
import { ExchangeReveal } from './ExchangeReveal';
import { ExchangeHistory } from './ExchangeHistory';
export function DuelPanel({
  controller,
  display,
  standalone = false,
}: {
  controller: BattleController;
  display: BattleDisplay;
  standalone?: boolean;
}) {
  const { phase, view, paused } = display;
  return (
    <View className="gap-4">
      {paused && (
        <Text className="rounded-lg bg-amber-100 p-3 text-amber-950">
          Paused while the app is inactive. Your remaining time is saved.
        </Text>
      )}
      <View className="flex-row gap-2">
        <CreatureSheet side={view.self} label="YOU · A" />
        <CreatureSheet side={view.opponent} label="OPPONENT · B" />
      </View>
      {phase === 'ready' && (
        <View className="gap-2">
          <Text className="text-sm text-slate-700">
            Each category once. Losing an exchange costs 1 HP.
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
            <Text className="text-lg font-semibold text-slate-900">
              Exchange {view.currentExchangeId} · choose
            </Text>
            <Text testID="selection-clock" className="text-2xl font-bold text-blue-900">
              {Math.ceil(display.remainingMs / 1000)}s
            </Text>
          </View>
          <Text className="text-xs text-slate-600">
            Opponent locked in. Its choice stays hidden until reveal.
          </Text>
          <CategoryPicker
            side={view.self}
            disabled={paused}
            choose={(pick) => controller.choose(pick, display.actionKey)}
          />
          <Text className="text-xs text-slate-600">
            On timeout: first unused category in Attack, Defense, Speed, Special order.
          </Text>
        </View>
      )}
      {phase === 'committed' && display.choice !== null && (
        <View testID="commitment-feedback" className="gap-2 rounded-xl bg-blue-50 p-4">
          <Text className="text-lg font-semibold text-slate-900">
            Committed: {CATEGORY_LABEL[display.choice]}
          </Text>
          <Text className="text-sm text-slate-700">
            {display.choiceSource === 'timeout'
              ? 'Time expired. The first unused category was selected.'
              : 'Your choice is locked.'}
          </Text>
          <Text className="text-xs text-slate-600">Revealing both choices…</Text>
        </View>
      )}
      {phase === 'reveal' && display.reveal && (
        <View className="gap-3">
          {display.choiceSource === 'timeout' && !display.reveal.isAutomaticFourth && (
            <Text className="text-xs text-slate-600">Your category was selected on timeout.</Text>
          )}
          <ExchangeReveal event={display.reveal} />
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
          <Text testID="duel-result" className="text-xl font-bold text-slate-900">
            {duelResult(view.winner)}
          </Text>
          <Text className="text-sm text-slate-700">
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
          <Text accessibilityRole="alert" className="font-bold text-slate-900">
            Duel paused by an error
          </Text>
          <Text className="text-sm text-slate-700">{display.error}</Text>
          {standalone && (
            <Button label="Restart duel" onPress={controller.rematch} disabled={paused} />
          )}
        </View>
      )}
      <ExchangeHistory events={view.history} />
    </View>
  );
}
