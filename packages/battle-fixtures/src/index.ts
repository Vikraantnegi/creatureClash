import { CATEGORY, TYPE, type CreatureSnapshot } from '@creature-clash/battle-engine';
export enum CREATURES {
  ASHKIT = 'ashkit',
  BROOKFIN = 'brookfin',
  SLATE = 'slate',
  FERNLET = 'fernlet',
  VOLTIK = 'voltik',
  EMBERHORN = 'emberhorn',
}
export const FIXTURE_VERSION = 'phase6-v2-slate';

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
      [CATEGORY.ATTACK]: 70,
      [CATEGORY.DEFENSE]: 90,
      [CATEGORY.SPEED]: 35,
      [CATEGORY.SPECIAL]: 45,
    },
  },
  {
    id: CREATURES.FERNLET,
    name: 'Fernlet',
    typeId: TYPE.GRASS,
    stats: {
      [CATEGORY.ATTACK]: 55,
      [CATEGORY.DEFENSE]: 80,
      [CATEGORY.SPEED]: 35,
      [CATEGORY.SPECIAL]: 70,
    },
  },
  {
    id: CREATURES.VOLTIK,
    name: 'Voltik',
    typeId: TYPE.ELECTRIC,
    stats: {
      [CATEGORY.ATTACK]: 65,
      [CATEGORY.DEFENSE]: 40,
      [CATEGORY.SPEED]: 90,
      [CATEGORY.SPECIAL]: 55,
    },
  },
  {
    id: CREATURES.EMBERHORN,
    name: 'Emberhorn',
    typeId: TYPE.FIRE,
    stats: {
      [CATEGORY.ATTACK]: 75,
      [CATEGORY.DEFENSE]: 75,
      [CATEGORY.SPEED]: 30,
      [CATEGORY.SPECIAL]: 60,
    },
  },
];

export function creatureFor(id: CREATURES, instanceId: string): CreatureSnapshot {
  const fixture = FIXTURES.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Unknown fixture: ${id}`);
  return { instanceId, speciesId: fixture.id, typeId: fixture.typeId, stats: { ...fixture.stats } };
}

export function creatureName(speciesId: string): string {
  return FIXTURES.find((fixture) => fixture.id === speciesId)?.name ?? speciesId;
}

export {
  speciesProfile,
  TRAIT_LABEL,
  TRAIT_ESTIMATE,
  type SpeciesProfile,
  type SpeciesTrait,
} from './profiles.js';
