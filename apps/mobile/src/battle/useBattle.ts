import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { createBattleController } from './controller';

export function useBattle() {
  const [controller] = useState(() =>
    createBattleController({ initiallyActive: AppState.currentState === 'active' }),
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
