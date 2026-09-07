import './global.css';

import { CATEGORIES } from '@creature-clash/battle-engine';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="mb-3 text-3xl font-bold text-slate-900">Creature Clash</Text>
      <Text className="mb-4 text-base text-slate-600">Workspace connected</Text>
      <Text className="text-center text-sm text-slate-600">{CATEGORIES.join(' · ')}</Text>
      <StatusBar style="auto" />
    </View>
  );
}
