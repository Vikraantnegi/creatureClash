export enum CATEGORY {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  SPEED = 'SPEED',
  SPECIAL = 'SPECIAL',
}

export enum TYPE {
  FIRE = 'FIRE',
  WATER = 'WATER',
  GRASS = 'GRASS',
  ELECTRIC = 'ELECTRIC',
  ROCK = 'ROCK',
}

export type MULTIPLIER_TENTHS = 9 | 10 | 11;

export type TypeChart = Record<TYPE, Record<TYPE, MULTIPLIER_TENTHS>>;

export type CreatureSnapshot = {
  instanceId: string;
  speciesId: string;
  typeId: TYPE;
  stats: Record<CATEGORY, number>;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
