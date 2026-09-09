import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { createBattleController } from './controller';
import type { Options } from './types';

export function useBattle(options: Options = {}) {
  const [controller] = useState(() =>
    createBattleController({ ...options, initiallyActive: AppState.currentState === 'active' }),
  );
  const display = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    controller.setActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      controller.setActive(state === 'active');
    });
    return () => {
      subscription.remove();
      controller.setActive(false);
    };
  }, [controller]);

  return { controller, display };
}
