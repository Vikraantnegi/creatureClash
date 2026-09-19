import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="border-line min-h-11 justify-center border-b py-2"
      >
        <Text className="text-muted font-sans text-sm font-semibold">
          {open ? '−' : '+'} {label}
        </Text>
      </Pressable>
      {open && children}
    </View>
  );
}
