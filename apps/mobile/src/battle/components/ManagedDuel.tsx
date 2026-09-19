import type { DuelState } from '@creature-clash/battle-engine';
import { DuelPanel } from './DuelPanel';
import { useBattle } from '../useBattle';
import type { StatVisibility } from '../types';
export function ManagedDuel({
  duel,
  complete,
  visibility = 'profile',
}: {
  duel: DuelState;
  visibility?: StatVisibility;
  complete: (duel: DuelState) => void;
}) {
  const { controller, display, sheets } = useBattle({
    preparedDuel: duel,
    onComplete: complete,
    statVisibility: visibility,
  });
  return <DuelPanel controller={controller} display={display} sheets={sheets} />;
}
