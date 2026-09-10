import { FIXTURES, creatureFor } from '@creature-clash/battle-fixtures';
import type { TrainerRosters } from '@creature-clash/battle-engine';
export function initialTrainerRosters(): TrainerRosters {
  return {
    A: FIXTURES.map((fixture, i) => creatureFor(fixture.id, `trainer-a-${i + 1}`)),
    B: FIXTURES.map((fixture, i) => creatureFor(fixture.id, `trainer-b-${i + 1}`)),
  };
}
