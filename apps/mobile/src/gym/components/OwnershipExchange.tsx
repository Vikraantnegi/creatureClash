import { creatureName } from '@creature-clash/battle-fixtures';
import { Text, View } from 'react-native';
import { DUEL_WINNER, type GymView } from '@creature-clash/battle-engine';
import { Button } from '../../atoms/Button';
import { CreatureChoices } from './CreatureChoices';
import { useExchangeSelection } from '../useExchangeSelection';
export function OwnershipExchange({
  view,
  disabled,
  exchange,
  resolveOpponent,
}: {
  view: GymView;
  disabled: boolean;
  exchange: (swap: { give: string; receive: string } | null) => void;
  resolveOpponent: () => void;
}) {
  const selection = useExchangeSelection();
  if (view.winner === DUEL_WINNER.B)
    return (
      <View className="gap-3">
        <Text className="text-ink font-sans text-xl font-bold">Opponent won the encounter</Text>
        <Text className="text-muted font-sans text-sm">
          The winner may exchange one participant. This prototype opponent exchanges its first
          participant for yours.
        </Text>
        <Button
          testID="opponent-exchange"
          label="Resolve opponent’s exchange"
          disabled={disabled}
          onPress={resolveOpponent}
        />
      </View>
    );
  return (
    <View className="gap-3">
      <Text className="text-ink font-sans text-xl font-bold">
        You won · optional creature exchange
      </Text>
      <Text className="text-muted font-sans text-sm">
        Choose one of your participants to give and one of theirs to receive. These creatures change
        owners, keeping their identity and stats.
      </Text>
      <Text className="text-ink font-sans font-semibold">Give one of your three</Text>
      <CreatureChoices
        prefix="give"
        creatures={view.completed.map((duel) => duel.creatureA)}
        selected={selection.give ? [selection.give] : []}
        choose={selection.setGive}
        disabled={disabled}
      />
      <Text className="text-ink font-sans font-semibold">Receive one of their three</Text>
      <CreatureChoices
        prefix="receive"
        creatures={view.completed.map((duel) => duel.creatureB)}
        selected={selection.receive ? [selection.receive] : []}
        choose={selection.setReceive}
        disabled={disabled}
      />
      <Button
        testID="confirm-exchange"
        label={
          selection.swap
            ? `Give ${creatureName(view.roster.find((c) => c.instanceId === selection.give)!.speciesId)} → receive ${creatureName(view.completed.find((d) => d.creatureB.instanceId === selection.receive)!.creatureB.speciesId)}`
            : 'Select one to give and one to receive'
        }
        primary
        disabled={disabled || !selection.swap}
        onPress={() => {
          if (selection.swap) exchange(selection.swap);
        }}
      />
      <Button
        testID="decline-exchange"
        label="Keep both rosters unchanged"
        disabled={disabled}
        onPress={() => exchange(null)}
      />
    </View>
  );
}
