import { CATEGORIES, type SidePublic } from '@creature-clash/battle-engine';
import { score } from './format';
import { EFFECTIVE_RANGE_WIDTH_TENTHS } from './constants';
import type { CreatureSheetView, StatVisibility } from './types';

export function effectiveScoreRange(value: number): string {
  const lower = Math.floor(value / EFFECTIVE_RANGE_WIDTH_TENTHS) * EFFECTIVE_RANGE_WIDTH_TENTHS;
  return `${score(lower)}–${score(lower + EFFECTIVE_RANGE_WIDTH_TENTHS - 1)}`;
}

// Project only display values. Unrevealed opponent rows carry neither exact raw nor effective stats.
export function projectCreatureSheet(
  side: SidePublic,
  visibility: StatVisibility = 'exact',
): CreatureSheetView {
  return {
    speciesId: side.creature.speciesId,
    typeId: side.creature.typeId,
    typeFactor: side.typeFactor,
    hp: side.hp,
    categories: CATEGORIES.map((category) => {
      const spent = side.usedCategories.includes(category);
      const exact = visibility === 'exact' || spent;
      return {
        category,
        spent,
        raw: exact ? String(side.creature.stats[category]) : null,
        effective: exact
          ? score(side.effectiveScores[category])
          : effectiveScoreRange(side.effectiveScores[category]),
      };
    }),
  };
}
