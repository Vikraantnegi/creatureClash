import type { ExchangeResultEvent } from '@creature-clash/battle-engine';
import { Text, View } from 'react-native';
import { CATEGORY_LABEL } from '../constants';
import { exchangeSummary } from '../copy';
import { score } from '../format';
export function ExchangeReveal({ event }: { event: ExchangeResultEvent }) {
  return (
    <View className="gap-2 rounded-xl bg-blue-50 p-4" testID="exchange-reveal">
      <Text className="text-lg font-semibold text-slate-900">
        {event.isAutomaticFourth
          ? 'Automatic tiebreak · exchange 4'
          : `Exchange ${event.exchangeNumber} revealed`}
      </Text>
      <Text className="text-sm text-slate-700">
        You: {CATEGORY_LABEL[event.aPick]} · {event.aRawStat} ×{' '}
        {(event.aTypeFactor / 10).toFixed(2)} = {score(event.aEffective)}
      </Text>
      <Text className="text-sm text-slate-700">
        Opponent: {CATEGORY_LABEL[event.bPick]} · {event.bRawStat} ×{' '}
        {(event.bTypeFactor / 10).toFixed(2)} = {score(event.bEffective)}
      </Text>
      <Text className="text-lg font-bold text-slate-900">{exchangeSummary(event)}</Text>
      {event.isAutomaticFourth && (
        <Text className="text-xs text-slate-600">
          HP was tied after three. Each creature used its remaining category.
        </Text>
      )}
    </View>
  );
}
