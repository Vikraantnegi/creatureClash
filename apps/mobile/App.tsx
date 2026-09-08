import './global.css';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BattleScreen } from './src/battle/BattleScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <BattleScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
