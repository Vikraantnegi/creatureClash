import { useState } from 'react';
import {
  CATEGORY_TRAINING_CAP,
  getProgressionView,
  trainCreature,
  type CATEGORY,
  type CreatureProgress,
} from '@creature-clash/battle-engine';
import { unwrapProgress } from './progression';

export function useTraining(progress: CreatureProgress) {
  const [allocation, setAllocation] = useState({ ...progress.allocation });
  const preview = unwrapProgress(
    getProgressionView(unwrapProgress(trainCreature(progress, allocation))),
  );
  const changed = Object.keys(allocation).some(
    (key) => allocation[key as CATEGORY] !== progress.allocation[key as CATEGORY],
  );
  const canAdd = (category: CATEGORY) =>
    preview.unspentPoints > 0 && allocation[category] < CATEGORY_TRAINING_CAP;
  const canRemove = (category: CATEGORY) => allocation[category] > progress.allocation[category];
  function adjust(category: CATEGORY, amount: 1 | -1) {
    setAllocation((current) => {
      const next = { ...current, [category]: current[category] + amount };
      return trainCreature(progress, next).ok ? next : current;
    });
  }
  return {
    allocation,
    preview,
    changed,
    canAdd,
    canRemove,
    adjust,
    reset: () => setAllocation({ ...progress.allocation }),
  };
}
