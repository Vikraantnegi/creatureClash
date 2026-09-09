import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BattleScreen } from './src/battle/BattleScreen';
import { RunScreen } from './src/encounters/RunScreen';
import { PairedScreen } from './src/encounters/PairedScreen';
import { Button } from './src/atoms/Button';
import { useGameMode } from './src/useGameMode';
export default function App() {
  const { mode, setMode } = useGameMode();
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-slate-100">
        <View className="gap-3 px-4 pt-3">
          <Text className="text-2xl font-bold text-slate-900">Creature Clash</Text>
          <View className="flex-row gap-2">
            <Button
              testID="mode-duel"
              label="Duel"
              selected={mode === 'duel'}
              onPress={() => setMode('duel')}
            />
            <Button
              testID="mode-run"
              label="Swap run"
              selected={mode === 'run'}
              onPress={() => setMode('run')}
            />
            <Button
              testID="mode-paired"
              label="Paired 3v3"
              selected={mode === 'paired'}
              onPress={() => setMode('paired')}
            />
          </View>
          <Text className="text-xs text-slate-500">
            Switching modes resets the current encounter.
          </Text>
        </View>
        {mode === 'duel' ? <BattleScreen /> : mode === 'run' ? <RunScreen /> : <PairedScreen />}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
