import { useState } from 'react';
import {
  canReplaceRunSlot,
  createRun,
  DEFAULT_TYPE_CHART,
  recordRunDuel,
  selectRunCreature,
  swapRunCreature,
  TEAM_SIZE,
  type DuelState,
  type RunState,
} from '@creature-clash/battle-engine';
import { CREATURES, creatureFor } from '@creature-clash/battle-fixtures';
import { DEFAULT_ROSTER, RUN_OPPONENTS } from '../constants';
import { nextEncounterId } from '../ids';

export function useRun() {
  const [selected, setSelected] = useState<CREATURES[]>([...DEFAULT_ROSTER]);
  const [state, setState] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  function toggle(id: CREATURES) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < TEAM_SIZE
          ? [...current, id]
          : current,
    );
  }
  function start() {
    const runId = nextEncounterId();
    const result = createRun({
      runId,
      roster: selected.map((id, i) => creatureFor(id, `${runId}-roster-${i}`)),
      opponents: RUN_OPPONENTS.map((id, i) => creatureFor(id, `${runId}-opponent-${i}`)),
      typeChart: DEFAULT_TYPE_CHART,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setState(result.value);
  }
  function choose(slot: number) {
    if (!state) return;
    const action = { runId: state.runId, opponentIndex: state.opponentIndex, slot };
    setState((current) => {
      if (!current) return current;
      const result = selectRunCreature(current, action);
      return result.ok ? result.value : current;
    });
  }
  function complete(duel: DuelState) {
    setState((current) => {
      if (!current) return current;
      const result = recordRunDuel(current, duel);
      return result.ok ? result.value : current;
    });
  }
  function swap(replaceSlot: number | null) {
    if (!state) return;
    const action = { runId: state.runId, duelId: state.completed.at(-1)!.duelId, replaceSlot };
    setState((current) => {
      if (!current) return current;
      const result = swapRunCreature(current, action);
      return result.ok ? result.value : current;
    });
  }
  return {
    state,
    selected,
    error,
    toggle,
    start,
    choose,
    complete,
    swap,
    canStart: selected.length === TEAM_SIZE,
    replacements: state?.roster.map((_, index) => canReplaceRunSlot(state, index)) ?? [],
    restart: () => {
      setState(null);
      setSelected([...DEFAULT_ROSTER]);
      setError(null);
    },
  };
}
