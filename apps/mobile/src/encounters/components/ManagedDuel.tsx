import type { DuelState } from '@creature-clash/battle-engine';
import { DuelPanel } from '../../battle/components/DuelPanel';
import { useBattle } from '../../battle/useBattle';
export function ManagedDuel({
  duel,
  complete,
}: {
  duel: DuelState;
  complete: (duel: DuelState) => void;
}) {
  const { controller, display } = useBattle({ preparedDuel: duel, onComplete: complete });
  return <DuelPanel controller={controller} display={display} />;
}
