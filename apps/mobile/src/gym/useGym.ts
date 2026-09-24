import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createGymController } from './controller';
import type { TrainerSave } from '../trainer/types';
import { trainerRepository } from '../trainer/storage';
export function useGym(enabled: boolean, save: TrainerSave) {
  const [controller] = useState(() =>
    createGymController({
      initiallyActive: enabled && AppState.currentState === 'active',
      rosters: save.rosters,
      persistRosters: (rosters) => trainerRepository.saveRosters(rosters, save.fixtureVersion),
    }),
  );
  const display = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    const update = () => controller.setActive(enabled && AppState.currentState === 'active');
    update();
    const subscription = AppState.addEventListener('change', update);
    return () => {
      subscription.remove();
      controller.setActive(false);
    };
  }, [controller, enabled]);
  return {
    controller,
    display,
    canLeave: display.stage === 'preview' || display.stage === 'finished',
  };
}
