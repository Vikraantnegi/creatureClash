import type { ExchangeResultEvent } from '@creature-clash/battle-engine';
import { Text, View } from 'react-native';
import { CATEGORY_LABEL } from '../constants';
import { exchangeSummary } from '../copy';
import { score } from '../format';
export function ExchangeHistory({ events }: { events: ExchangeResultEvent[] }) {
  if (!events.length) return null;
  return (
    <View className="gap-2">
      <Text className="text-ink font-sans text-lg font-semibold">Exchange history</Text>
      {events.map((event) => (
        <View key={event.exchangeId} className="border-line gap-1 border-b py-2">
          <Text className="text-muted font-sans text-sm">
            {event.exchangeNumber}
            {event.isAutomaticFourth ? ' · Auto' : ''}: {CATEGORY_LABEL[event.aPick]}{' '}
            {score(event.aEffective)} vs {CATEGORY_LABEL[event.bPick]} {score(event.bEffective)}
          </Text>
          <Text className="text-muted font-sans text-xs">{exchangeSummary(event)}</Text>
        </View>
      ))}
    </View>
  );
}
