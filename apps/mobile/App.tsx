import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BattleScreen } from './src/battle/BattleScreen';
import { GymScreen } from './src/gym/GymScreen';
import { useGym } from './src/gym/useGym';
import { Button } from './src/atoms/Button';
import { useGameMode } from './src/useGameMode';
import { HomeScreen } from './src/home/HomeScreen';
export default function App() {
  const { mode, setMode } = useGameMode();
  const gym = useGym(mode === 'gym');
  return (
    <SafeAreaProvider>
      <SafeAreaView className="bg-paper flex-1">
        <View className="flex-row items-center justify-between px-5 py-2">
          <Text className="text-ink font-mono text-xs font-semibold uppercase tracking-widest">
            Creature Clash
          </Text>
          <Text className="text-muted font-sans text-xs">
            {mode === 'home'
              ? 'Trainer journal'
              : mode === 'gym'
                ? 'Gym · 3 v 3'
                : 'Standalone duel'}
          </Text>
        </View>
        {mode === 'home' ? (
          <HomeScreen open={setMode} roster={gym.display.view.roster} />
        ) : mode === 'duel' ? (
          <BattleScreen leave={() => setMode('home')} />
        ) : (
          <View className="flex-1">
            {gym.canLeave && (
              <View className="px-4">
                <Button label="← Trainer journal" onPress={() => setMode('home')} />
              </View>
            )}
            <GymScreen controller={gym.controller} display={gym.display} />
          </View>
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
