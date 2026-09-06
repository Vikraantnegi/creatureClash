import { CATEGORIES } from '@creature-clash/battle-engine';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creature Clash</Text>
      <Text style={styles.subtitle}>Workspace connected</Text>
      <Text style={styles.categories}>{CATEGORIES.join(' · ')}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#475569', marginBottom: 16 },
  categories: { fontSize: 14, color: '#475569', textAlign: 'center' },
});
