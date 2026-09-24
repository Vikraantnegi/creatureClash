import { useCallback, useEffect, useState } from 'react';
import { trainerRepository } from './storage';
import type { TrainerLoadState } from './types';

export function useTrainerSave() {
  const [state, setState] = useState<TrainerLoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    trainerRepository.load().then(
      (save) => {
        if (!cancelled) setState({ status: 'ready', save });
      },
      (error: unknown) => {
        if (!cancelled)
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Could not load your trainer. Please retry.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);
  return { state, retry };
}
