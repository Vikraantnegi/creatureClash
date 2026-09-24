import { Text, View } from 'react-native';
import { Button } from '../atoms/Button';
import type { TrainerLoadState } from './types';

export function TrainerLoading({ state, retry }: { state: TrainerLoadState; retry: () => void }) {
  return (
    <View className="flex-1 justify-center gap-4 p-6">
      <Text className="text-ink font-sans text-xl font-bold">
        {state.status === 'error'
          ? 'Your trainer could not be loaded'
          : 'Opening your trainer journal…'}
      </Text>
      {state.status === 'error' && (
        <>
          <Text accessibilityRole="alert" className="text-muted font-sans">
            {state.message}
          </Text>
          <Button testID="retry-trainer-load" label="Retry loading" onPress={retry} />
        </>
      )}
    </View>
  );
}
