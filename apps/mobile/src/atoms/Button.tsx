import { Pressable, Text } from 'react-native';
import type { ButtonProps } from './types';

export function Button({
  label,
  onPress,
  disabled = false,
  selected = false,
  primary = false,
  testID,
}: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 items-center justify-center rounded-lg border px-3 py-3 ${primary || selected ? 'border-blue-900 bg-blue-900' : 'border-slate-400 bg-white'} ${disabled ? 'opacity-40' : 'active:opacity-75'}`}
    >
      <Text
        className={`text-center text-sm font-semibold ${primary || selected ? 'text-white' : 'text-slate-900'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
