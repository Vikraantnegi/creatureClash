import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
export function useRevealMotion() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    const stop = () => {
      opacity.stopAnimation();
      opacity.setValue(1);
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', stop);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    });
    return () => {
      active = false;
      subscription.remove();
      stop();
    };
  }, [opacity]);
  return opacity;
}
