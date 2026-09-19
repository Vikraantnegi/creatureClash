import type { ExchangeResultEvent } from '@creature-clash/battle-engine';
import { Animated, Text, View } from 'react-native';
import { CATEGORY_LABEL } from '../constants';
import { exchangeSummary } from '../copy';
import { score } from '../format';
import { useRevealMotion } from '../useRevealMotion';
export function ExchangeReveal({ event }: { event: ExchangeResultEvent }) {
  const opacity = useRevealMotion();
  return (
    <Animated.View style={{ opacity }} testID="exchange-reveal" className="gap-3">
      <Text className="text-rust font-mono text-xs font-semibold uppercase tracking-widest">
        {event.isAutomaticFourth
          ? 'Automatic fourth · final categories'
          : `Exchange ${event.exchangeNumber} · both revealed`}
      </Text>
      <View className="flex-row gap-3">
        {[
          {
            label: 'YOU',
            category: event.aPick,
            raw: event.aRawStat,
            factor: event.aTypeFactor,
            value: event.aEffective,
            lost: event.damageToA > 0,
          },
          {
            label: 'OPPONENT',
            category: event.bPick,
            raw: event.bRawStat,
            factor: event.bTypeFactor,
            value: event.bEffective,
            lost: event.damageToB > 0,
          },
        ].map((card) => (
          <View
            key={card.label}
            className={`flex-1 gap-1 rounded-2xl border p-4 ${card.lost ? 'border-rust bg-rust' : 'border-ink bg-card'}`}
          >
            <Text className={`font-mono text-xs ${card.lost ? 'text-white' : 'text-muted'}`}>
              {card.label}
            </Text>
            <Text
              className={`font-sans text-base font-bold ${card.lost ? 'text-white' : 'text-ink'}`}
            >
              {CATEGORY_LABEL[card.category]}
            </Text>
            <Text
              className={`font-mono text-4xl font-bold ${card.lost ? 'text-white' : 'text-ink'}`}
            >
              {score(card.value)}
            </Text>
            <Text className={`font-mono text-xs ${card.lost ? 'text-white' : 'text-muted'}`}>
              {card.raw} × {(card.factor / 10).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" className="text-ink font-sans text-lg font-bold">
        {exchangeSummary(event)}
      </Text>
      <View className="border-line bg-card gap-1 rounded-xl border p-3">
        <Text className="text-muted font-mono text-xs font-semibold uppercase">
          What you learned
        </Text>
        <Text className="text-ink font-sans text-sm">
          Opponent {CATEGORY_LABEL[event.bPick]} resolved at {score(event.bEffective)}. Both played
          categories are now spent.
        </Text>
      </View>
      {event.isAutomaticFourth && (
        <Text className="text-muted font-sans text-xs">
          HP was tied after three. The final unused categories were compared automatically.
        </Text>
      )}
    </Animated.View>
  );
}
