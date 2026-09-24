import { CATEGORY } from '@creature-clash/battle-engine';

export type SpeciesTrait = 'low' | 'balanced' | 'high';
export type SpeciesProfile = Record<CATEGORY, SpeciesTrait>;
const profile = (
  attack: SpeciesTrait,
  defense: SpeciesTrait,
  speed: SpeciesTrait,
  special: SpeciesTrait,
): SpeciesProfile => ({
  [CATEGORY.ATTACK]: attack,
  [CATEGORY.DEFENSE]: defense,
  [CATEGORY.SPEED]: speed,
  [CATEGORY.SPECIAL]: special,
});
// Species knowledge, independent of an individual creature's current stats.
const PROFILES: Record<string, SpeciesProfile> = {
  ashkit: profile('high', 'low', 'high', 'balanced'),
  brookfin: profile('balanced', 'balanced', 'low', 'high'),
  slate: profile('high', 'high', 'low', 'low'),
  fernlet: profile('balanced', 'high', 'low', 'high'),
  voltik: profile('balanced', 'low', 'high', 'balanced'),
  emberhorn: profile('high', 'high', 'low', 'balanced'),
};
export function speciesProfile(speciesId: string): SpeciesProfile | null {
  const found = PROFILES[speciesId.toLowerCase()];
  return found ? { ...found } : null;
}
export const TRAIT_LABEL: Record<SpeciesTrait, string> = {
  low: 'Usually low',
  balanced: 'Usually moderate',
  high: 'Usually high',
};
// Deliberately coarse priors, not the fixture's exact numbers or guaranteed bounds.
export const TRAIT_ESTIMATE: Record<SpeciesTrait, number> = { low: 40, balanced: 60, high: 80 };
