import type { ExchangeResultEvent } from '@creature-clash/battle-engine';
import { Text, View } from 'react-native';
import { CATEGORY_LABEL } from '../constants';
import { exchangeSummary } from '../copy';
import { score } from '../format';
export function ExchangeHistory({ events }: { events: ExchangeResultEvent[] }) {
  if (!events.length) return null;
  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold text-slate-900">Exchange history</Text>
      {events.map((event) => (
        <View key={event.exchangeId} className="gap-1 border-b border-slate-300 py-2">
          <Text className="text-sm text-slate-700">
            {event.exchangeNumber}
            {event.isAutomaticFourth ? ' · Auto' : ''}: {CATEGORY_LABEL[event.aPick]}{' '}
            {score(event.aEffective)} vs {CATEGORY_LABEL[event.bPick]} {score(event.bEffective)}
          </Text>
          <Text className="text-xs text-slate-600">{exchangeSummary(event)}</Text>
        </View>
      ))}
    </View>
  );
}
