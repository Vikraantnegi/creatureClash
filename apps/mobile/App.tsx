import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BattleScreen } from './src/battle/BattleScreen';
import { GymScreen } from './src/gym/GymScreen';
import { useGym } from './src/gym/useGym';
import { Button } from './src/atoms/Button';
import { useGameMode } from './src/useGameMode';
export default function App() {
  const { mode, setMode } = useGameMode();
  const gym = useGym(mode === 'gym');
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-100">
        <View className="gap-3 px-4 pt-3">
          <Text className="text-2xl font-bold text-slate-900">Creature Clash</Text>
          <View className="flex-row gap-2">
            <Button
              testID="mode-duel"
              label="Duel"
              disabled={mode === 'gym' && !gym.canLeave}
              selected={mode === 'duel'}
              onPress={() => setMode('duel')}
            />
            <Button
              testID="mode-gym"
              label="Gym 3v3"
              selected={mode === 'gym'}
              onPress={() => setMode('gym')}
            />
          </View>
          <Text className="text-xs text-slate-500">
            {mode === 'gym' && !gym.canLeave
              ? 'Finish the encounter before changing modes.'
              : 'Duel: no exchange. Gym: winner may exchange a participant.'}
          </Text>
        </View>
        {mode === 'duel' ? (
          <BattleScreen />
        ) : (
          <GymScreen controller={gym.controller} display={gym.display} />
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
