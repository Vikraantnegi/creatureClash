import {
  createGym,
  commitGymTeam,
  commitGymDeployment,
  recordGymDuel,
  exchangeGymCreatures,
  getGymView,
  DEFAULT_TYPE_CHART,
  PLAYER,
  DUEL_WINNER,
  TEAM_SIZE,
  type DuelState,
  type Result,
  type GymState,
  type TrainingAllocation,
} from '@creature-clash/battle-engine';
import { FIXTURE_VERSION } from '@creature-clash/battle-fixtures';
import {
  allocateTraining,
  chooseOpponentExchange,
  createTrainerSave,
  finishSettlement,
  settleGym,
} from '../trainer/progression';
import type { TrainerSave } from '../trainer/types';
import type { BattleClock, StatVisibility } from '../battle/types';
import { initialTrainerRosters } from './fixtures';
import { chooseGymCreatures } from './policy';
import { TEAM_SELECTION_MS, DEPLOYMENT_MS } from './constants';
import type { GymDisplay, GymOptions, GymStage } from './types';

let sequence = 0;
const systemClock: BattleClock = {
  now: () => performance.now(),
  schedule: setTimeout,
  cancel: clearTimeout,
};
const unwrap = <T>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

export function createGymController(options: GymOptions = {}) {
  const clock = options.clock ?? systemClock;
  const rng = options.rng ?? Math.random;
  const nextId = options.nextId ?? (() => `gym-${Date.now()}-${++sequence}`);
  let trainer =
    options.trainerSave ??
    createTrainerSave(options.rosters ?? initialTrainerRosters(), FIXTURE_VERSION);
  let state =
    trainer.pending?.gym ??
    unwrap(
      createGym({
        encounterId: nextId(),
        rosters: trainer.rosters,
        typeChart: DEFAULT_TYPE_CHART,
      }),
    );
  let active = options.initiallyActive ?? true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let deadline: number | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  let display: GymDisplay = {
    stage: trainer.pending ? 'rewards' : 'preview',
    view: getGymView(state, PLAYER.A),
    draft: [],
    remainingMs: 0,
    paused: !active,
    actionKey: `${state.encounterId}:${trainer.pending ? 'rewards' : 'preview'}:1`,
    error: null,
    notice: null,
    visibility: 'profile',
    saving: false,
    saveError: null,
    trainer,
  };

  function publish(patch: Partial<GymDisplay>) {
    display = { ...display, ...patch };
    listeners.forEach((listener) => listener());
  }
  function cancel() {
    generation++;
    if (timer !== null) clock.cancel(timer);
    timer = null;
    deadline = null;
  }
  function move(stage: GymStage, notice: string | null = null) {
    cancel();
    publish({
      stage,
      view: getGymView(state, PLAYER.A),
      actionKey: `${state.encounterId}:${stage}:${state.completed.length + 1}`,
      notice,
      remainingMs: 0,
    });
  }
  function protect(work: () => void) {
    try {
      work();
    } catch (error) {
      cancel();
      publish({
        error: error instanceof Error ? error.message : 'Could not continue the encounter',
      });
    }
  }
  function allowed(stage: GymStage, key: string) {
    return (
      active &&
      !display.error &&
      !display.saving &&
      display.stage === stage &&
      key === display.actionKey
    );
  }
  async function persist(next: TrainerSave) {
    if (options.persistTrainer) await options.persistTrainer(next, trainer.revision);
    trainer = next;
    publish({ trainer });
  }
  async function saveRewards() {
    publish({ saving: true, saveError: null });
    try {
      await persist(settleGym(trainer, state));
      publish({ saving: false });
    } catch (error) {
      publish({
        saving: false,
        saveError: error instanceof Error ? error.message : 'Could not save rewards. Try again.',
      });
    }
  }
  async function finishExchange(next: GymState) {
    publish({ saving: true, saveError: null });
    try {
      // Commit both owners durably before publishing the new roster or allowing another gym.
      await persist(finishSettlement(trainer, next));
      state = { ...next, rosters: trainer.rosters };
      publish({ saving: false });
      move('finished');
    } catch {
      // The old state still owns both creatures. The same exchange can safely be retried.
      publish({
        saving: false,
        saveError: 'Could not save the exchange. Your rosters have not changed. Try again.',
      });
    }
  }
  function sendTeam(ids: string[], timedOut = false) {
    state = unwrap(
      commitGymTeam(state, {
        encounterId: state.encounterId,
        round: 1,
        side: PLAYER.A,
        creatures: ids,
      }),
    );
    publish({ draft: [...ids] });
    move(
      'deployment-ready',
      timedOut ? 'Time expired. Your selection was filled from your active roster in order.' : null,
    );
  }
  function sendDeployment(id: string, timedOut = false) {
    state = unwrap(
      commitGymDeployment(state, {
        encounterId: state.encounterId,
        round: state.completed.length + 1,
        side: PLAYER.A,
        creature: id,
      }),
    );
    move(
      'dueling',
      timedOut ? 'Time expired. Your first unused selected creature was deployed.' : null,
    );
  }
  function expire() {
    protect(() => {
      if (display.stage === 'team') {
        const ids = [
          ...display.draft,
          ...display.view.roster
            .map((c) => c.instanceId)
            .filter((id) => !display.draft.includes(id)),
        ].slice(0, TEAM_SIZE);
        sendTeam(ids, true);
      } else if (display.stage === 'deployment')
        sendDeployment(display.view.available[0]!.instanceId, true);
    });
  }
  function arm(ms: number) {
    cancel();
    publish({ remainingMs: ms });
    if (!active) return;
    deadline = clock.now() + ms;
    const ticket = generation;
    const key = display.actionKey;
    const tick = () => {
      if (!active || ticket !== generation || key !== display.actionKey) return;
      const remaining = Math.max(0, deadline! - clock.now());
      publish({ remainingMs: remaining });
      if (!remaining) expire();
      else timer = clock.schedule(tick, Math.min(100, remaining));
    };
    timer = clock.schedule(tick, Math.min(100, ms));
  }
  function expired() {
    if (deadline !== null && clock.now() >= deadline) {
      expire();
      return true;
    }
    return false;
  }
  return {
    getSnapshot: () => display,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configureVisibility(value: StatVisibility) {
      if (display.stage === 'preview') publish({ visibility: value });
    },
    beginTeam(key: string) {
      if (!allowed('preview', key)) return;
      protect(() => {
        const picks = chooseGymCreatures(getGymView(state, PLAYER.B), TEAM_SIZE, rng);
        state = unwrap(
          commitGymTeam(state, {
            encounterId: state.encounterId,
            round: 1,
            side: PLAYER.B,
            creatures: picks,
          }),
        );
        move('team');
        arm(TEAM_SELECTION_MS);
      });
    },
    toggle(id: string, key: string) {
      if (
        !allowed('team', key) ||
        expired() ||
        !display.view.roster.some((c) => c.instanceId === id)
      )
        return;
      const draft = display.draft.includes(id)
        ? display.draft.filter((candidate) => candidate !== id)
        : display.draft.length < TEAM_SIZE
          ? [...display.draft, id]
          : display.draft;
      publish({ draft });
    },
    lockTeam(key: string) {
      if (!allowed('team', key) || expired() || display.draft.length !== TEAM_SIZE) return;
      protect(() => sendTeam(display.draft));
    },
    beginDeployment(key: string) {
      if (!allowed('deployment-ready', key)) return;
      protect(() => {
        const id = chooseGymCreatures(getGymView(state, PLAYER.B), 1, rng)[0]!;
        state = unwrap(
          commitGymDeployment(state, {
            encounterId: state.encounterId,
            round: state.completed.length + 1,
            side: PLAYER.B,
            creature: id,
          }),
        );
        move('deployment');
        arm(DEPLOYMENT_MS);
      });
    },
    deploy(id: string, key: string) {
      if (
        !allowed('deployment', key) ||
        expired() ||
        !display.view.available.some((c) => c.instanceId === id)
      )
        return;
      protect(() => sendDeployment(id));
    },
    complete(duel: DuelState) {
      if (display.stage !== 'dueling') return;
      const result = recordGymDuel(state, duel);
      if (!result.ok) return; // A completion from an abandoned/previous duel cannot advance this one.
      state = result.value;
      if (state.phase === 'deployment') move('deployment-ready');
      else {
        move('rewards');
        return saveRewards();
      }
    },
    retryRewards(key: string) {
      if (!allowed('rewards', key) || trainer.pending) return;
      return saveRewards();
    },
    continueRewards(key: string) {
      if (!allowed('rewards', key) || !trainer.pending) return;
      if (state.phase === 'exchange') move('exchange');
      else return finishExchange(state);
    },
    async train(id: string, allocation: TrainingAllocation) {
      if (display.saving || !['preview', 'finished'].includes(display.stage) || trainer.pending)
        return;
      publish({ saving: true, saveError: null });
      try {
        await persist(allocateTraining(trainer, id, allocation));
        state = { ...state, rosters: trainer.rosters };
        publish({ saving: false, view: getGymView(state, PLAYER.A) });
      } catch (error) {
        publish({
          saving: false,
          saveError: error instanceof Error ? error.message : 'Could not save training',
        });
      }
    },
    exchange(swap: { give: string; receive: string } | null, key: string) {
      if (!allowed('exchange', key) || state.winner !== DUEL_WINNER.A) return;
      const result = exchangeGymCreatures(state, {
        encounterId: state.encounterId,
        side: PLAYER.A,
        swap,
      });
      if (!result.ok) return;
      return finishExchange(result.value);
    },
    resolveOpponentExchange(key: string) {
      if (!allowed('exchange', key) || state.winner !== DUEL_WINNER.B) return;
      const result = exchangeGymCreatures(state, {
        encounterId: state.encounterId,
        side: PLAYER.B,
        swap: chooseOpponentExchange(state, trainer),
      });
      if (!result.ok) return;
      return finishExchange(result.value);
    },
    nextEncounter(key: string) {
      if (!allowed('finished', key)) return;
      state = unwrap(
        createGym({ encounterId: nextId(), rosters: state.rosters, typeChart: state.typeChart }),
      );
      publish({ draft: [], error: null });
      move('preview');
    },
    setActive(value: boolean) {
      if (active === value) return;
      const remainingMs =
        deadline !== null ? Math.max(0, deadline - clock.now()) : display.remainingMs;
      active = value;
      cancel();
      publish({ paused: !active, remainingMs });
      if (active && !display.error && (display.stage === 'team' || display.stage === 'deployment'))
        arm(remainingMs);
    },
  };
}
export type GymController = ReturnType<typeof createGymController>;
