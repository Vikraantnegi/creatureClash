import { useState } from 'react';
import {
  createPairedEncounter,
  PAIRED_PHASE,
  DEFAULT_TYPE_CHART,
  pairedScore,
  recordPairedDuel,
  startPairedDuel,
  type DuelState,
} from '@creature-clash/battle-engine';
import { creatureFor } from '@creature-clash/battle-fixtures';
import { PAIRED_TEAM_A, PAIRED_TEAM_B } from '../constants';
import { nextEncounterId } from '../ids';
function prepare(mirror = false) {
  const encounterId = nextEncounterId();
  const created = createPairedEncounter({
    encounterId,
    teamA: PAIRED_TEAM_A.map((id, i) => creatureFor(id, `${encounterId}-a-${i}`)),
    teamB: (mirror ? PAIRED_TEAM_A : PAIRED_TEAM_B).map((id, i) =>
      creatureFor(id, `${encounterId}-b-${i}`),
    ),
    typeChart: DEFAULT_TYPE_CHART,
  });
  if (!created.ok) throw new Error(created.error);
  return created.value;
}
export function usePaired() {
  const [state, setState] = useState(() => prepare());
  function start() {
    const id = state.encounterId;
    const index = state.completed.length;
    setState((current) => {
      const result = startPairedDuel(current, id, index);
      return result.ok ? result.value : current;
    });
  }
  function complete(duel: DuelState) {
    setState((current) => {
      const result = recordPairedDuel(current, duel);
      return result.ok ? result.value : current;
    });
  }
  const mirror = state.teamA.every(
    (creature, index) => creature.speciesId === state.teamB[index]!.speciesId,
  );
  function configureMirror(value: boolean) {
    const prepared = prepare(value);
    setState((current) =>
      current.phase === PAIRED_PHASE.READY && current.completed.length === 0 ? prepared : current,
    );
  }
  return {
    state,
    score: pairedScore(state),
    start,
    complete,
    mirror,
    configureMirror,
    restart: () => setState(prepare(mirror)),
  };
}
