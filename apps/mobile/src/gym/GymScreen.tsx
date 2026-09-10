import { ScrollView, Text, View } from 'react-native';
import { DUEL_WINNER, PLAYER, TEAM_SIZE } from '@creature-clash/battle-engine';
import { creatureName } from '@creature-clash/battle-fixtures';
import { Button } from '../atoms/Button';
import { StatVisibilityControls } from '../battle/components/StatVisibilityControls';
import { ManagedDuel } from '../encounters/components/ManagedDuel';
import { FixtureCard } from '../encounters/components/FixtureCard';
import type { GymController } from './controller';
import type { GymDisplay } from './types';
import { RosterPreview } from './components/RosterPreview';
import { CreatureChoices } from './components/CreatureChoices';
import { GymScoreboard } from './components/GymScoreboard';
import { OwnershipExchange } from './components/OwnershipExchange';
export function GymScreen({
  controller,
  display,
}: {
  controller: GymController;
  display: GymDisplay;
}) {
  const { stage, view, actionKey, paused, error } = display;
  const disabled = paused || !!error;
  return (
    <ScrollView key={actionKey} contentContainerClassName="gap-4 p-4 pb-8">
      <Text className="text-lg font-bold text-slate-900">
        Gym 3v3 ·{' '}
        {stage === 'preview' || stage === 'team' ? 'Choose your team' : `Duel ${view.round} of 3`}
      </Text>
      {paused && (
        <Text className="rounded-lg bg-amber-100 p-3 text-amber-950">
          Paused. Selection time is saved while the app is inactive.
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" className="text-red-800">
          {error}
        </Text>
      )}
      {display.notice && <Text className="text-sm text-slate-700">{display.notice}</Text>}
      {stage !== 'preview' && stage !== 'team' && (
        <GymScoreboard view={view} compact={stage === 'dueling'} />
      )}
      {(stage === 'preview' || stage === 'team' || stage === 'deployment-ready') && (
        <RosterPreview creatures={view.opponentRoster} />
      )}
      {stage === 'preview' && (
        <View className="gap-3">
          <Text className="text-sm text-slate-700">
            Bring six, lock three privately, then choose their order between duels. Every creature
            fights once with fresh HP and categories. All three duels count.
          </Text>
          <Text className="text-sm text-slate-700">
            The winner may exchange one participating creature with the loser. Your rosters carry
            into the next encounter while this app stays open. Reloading resets the fixtures.
          </Text>
          <StatVisibilityControls
            visibility={display.visibility}
            configure={controller.configureVisibility}
          />
          <Text className="font-semibold text-slate-900">Your active six</Text>
          {view.roster.map((creature, index) => (
            <FixtureCard
              key={creature.instanceId}
              creature={creature}
              label={`Slot ${index + 1}`}
            />
          ))}
          <Button
            testID="begin-team"
            label="Enter gym · start 30s selection"
            primary
            disabled={disabled}
            onPress={() => controller.beginTeam(actionKey)}
          />
        </View>
      )}
      {stage === 'team' && (
        <View className="gap-3">
          <Text testID="gym-clock" className="text-xl font-bold text-blue-900">
            {Math.ceil(display.remainingMs / 1000)}s · {display.draft.length} / {TEAM_SIZE} selected
          </Text>
          <Text className="text-sm text-slate-700">
            Opponent’s team is locked and hidden. Choose three, then lock yours. On timeout,
            remaining slots fill in roster order.
          </Text>
          <CreatureChoices
            prefix="team"
            creatures={view.roster}
            selected={display.draft}
            choose={(id) => controller.toggle(id, actionKey)}
            disabled={disabled}
          />
          <Button
            testID="lock-team"
            label="Lock these three"
            primary
            disabled={disabled || display.draft.length !== TEAM_SIZE}
            onPress={() => controller.lockTeam(actionKey)}
          />
        </View>
      )}
      {stage === 'deployment-ready' && (
        <View className="gap-3">
          <Text className="text-sm text-slate-700">
            Choose from your remaining team. The opponent’s next creature stays hidden until you
            both commit.
          </Text>
          <Button
            testID="begin-deployment"
            label="Choose deployment · start 15s"
            primary
            disabled={disabled}
            onPress={() => controller.beginDeployment(actionKey)}
          />
        </View>
      )}
      {stage === 'deployment' && (
        <View className="gap-3">
          <Text testID="gym-clock" className="text-xl font-bold text-blue-900">
            {Math.ceil(display.remainingMs / 1000)}s · choose a creature
          </Text>
          <Text className="text-sm text-slate-700">
            Opponent locked in. Tap a creature to commit yours. On timeout, your first unused
            selected creature deploys.
          </Text>
          <CreatureChoices
            prefix="deploy"
            creatures={view.available}
            selected={[]}
            choose={(id) => controller.deploy(id, actionKey)}
            disabled={disabled}
          />
        </View>
      )}
      {stage === 'dueling' && view.activeDuel && (
        <View className="gap-3">
          <Text className="text-sm text-slate-700">
            Both creatures revealed ·{' '}
            {display.visibility === 'exact' ? 'exact opponent stats' : 'opponent score ranges'}
          </Text>
          <ManagedDuel
            key={view.activeDuel.duelId}
            duel={view.activeDuel}
            complete={controller.complete}
            visibility={display.visibility}
          />
        </View>
      )}
      {stage === 'exchange' && (
        <OwnershipExchange
          key={view.encounterId}
          view={view}
          disabled={disabled}
          exchange={(swap) => controller.exchange(swap, actionKey)}
          resolveOpponent={() => controller.resolveOpponentExchange(actionKey)}
        />
      )}
      {stage === 'finished' && (
        <View className="gap-3">
          <Text testID="gym-result" className="text-xl font-bold text-slate-900">
            {view.winner === DUEL_WINNER.DRAW
              ? 'Encounter drawn'
              : view.winner === DUEL_WINNER.A
                ? 'You won the encounter'
                : 'Opponent won the encounter'}
          </Text>
          <Text testID="exchange-result" className="text-sm text-slate-700">
            {view.exchange
              ? `${view.exchange.winner === PLAYER.A ? 'You' : 'Opponent'} gave ${creatureName(view.exchange.given.speciesId)} and received ${creatureName(view.exchange.received.speciesId)}. Both active rosters are updated.`
              : 'No exchange. Both rosters are unchanged.'}
          </Text>
          <Button
            testID="next-gym"
            label="Next encounter · keep current rosters"
            primary
            disabled={disabled}
            onPress={() => controller.nextEncounter(actionKey)}
          />
        </View>
      )}
    </ScrollView>
  );
}
