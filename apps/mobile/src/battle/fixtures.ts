import { CATEGORY, TYPE, type CreatureSnapshot } from '@creature-clash/battle-engine';
import { CREATURES } from './types';

export const FIXTURES = [
  {
    id: CREATURES.ASHKIT,
    name: 'Ashkit',
    typeId: TYPE.FIRE,
    stats: {
      [CATEGORY.ATTACK]: 85,
      [CATEGORY.DEFENSE]: 35,
      [CATEGORY.SPEED]: 70,
      [CATEGORY.SPECIAL]: 50,
    },
  },
  {
    id: CREATURES.BROOKFIN,
    name: 'Brookfin',
    typeId: TYPE.WATER,
    stats: {
      [CATEGORY.ATTACK]: 50,
      [CATEGORY.DEFENSE]: 65,
      [CATEGORY.SPEED]: 45,
      [CATEGORY.SPECIAL]: 80,
    },
  },
  {
    id: CREATURES.SLATE,
    name: 'Slate',
    typeId: TYPE.ROCK,
    stats: {
      [CATEGORY.ATTACK]: 60,
      [CATEGORY.DEFENSE]: 60,
      [CATEGORY.SPEED]: 60,
      [CATEGORY.SPECIAL]: 60,
    },
  },
];

export function creatureFor(id: CREATURES, instanceId: string): CreatureSnapshot {
  const fixture = FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Unknown fixture: ${id}`);
  return { instanceId, speciesId: fixture.id, typeId: fixture.typeId, stats: { ...fixture.stats } };
}

export function creatureName(speciesId: CREATURES): string {
  return FIXTURES.find((fixture) => fixture.id === speciesId)?.name ?? 'Unknown';
}
