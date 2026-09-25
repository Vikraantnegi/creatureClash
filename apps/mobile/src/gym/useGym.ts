import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createGymController } from './controller';
import type { TrainerSave } from '../trainer/types';
import { trainerRepository } from '../trainer/storage';
export function useGym(enabled: boolean, save: TrainerSave) {
  const [controller] = useState(() =>
    createGymController({
      initiallyActive: enabled && AppState.currentState === 'active',
      trainerSave: save,
      persistTrainer: trainerRepository.commit,
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
    canLeave: !display.saving && (display.stage === 'preview' || display.stage === 'finished'),
  };
}
