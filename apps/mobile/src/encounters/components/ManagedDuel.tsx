import type { DuelState } from '@creature-clash/battle-engine';
import { DuelPanel } from '../../battle/components/DuelPanel';
import { useBattle } from '../../battle/useBattle';
import type { StatVisibility } from '../../battle/types';
export function ManagedDuel({
  duel,
  complete,
  visibility = 'exact',
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
