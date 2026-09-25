import {
  CATEGORIES,
  LEVEL_XP,
  POINTS_PER_LEVEL,
  PLAYER,
  type PlayerView,
  type TacticalObservation,
} from '@creature-clash/battle-engine';
import { speciesProfile, TRAIT_ESTIMATE } from '@creature-clash/battle-fixtures';
import type { StatVisibility } from './types';

export function tacticalObservation(
  view: PlayerView,
  visibility: StatVisibility,
): TacticalObservation {
  const opponent = view.opponent;
  const profile = speciesProfile(opponent.creature.speciesId);
  const stats = { ...view.self.creature.stats };
  // A neutral prior from public level, not the opponent's actual investment.
  const budget = (Math.min(LEVEL_XP.length, opponent.creature.level ?? 1) - 1) * POINTS_PER_LEVEL;
  for (const category of CATEGORIES) {
    const revealed = view.history.find(
      (event) => (view.viewer === PLAYER.A ? event.bPick : event.aPick) === category,
    );
    if (revealed)
      stats[category] = view.viewer === PLAYER.A ? revealed.bRawStat : revealed.aRawStat;
    else if (visibility === 'exact') stats[category] = opponent.creature.stats[category];
    else if (visibility === 'approximate') {
      const lower = Math.floor(opponent.effectiveScores[category] / 100) * 100;
      stats[category] = Math.round((lower + 50) / opponent.typeFactor);
    } else
      stats[category] =
        (profile ? TRAIT_ESTIMATE[profile[category]] : 60) +
        Math.floor(budget / CATEGORIES.length) +
        (CATEGORIES.indexOf(category) < budget % CATEGORIES.length ? 1 : 0);
  }
  return {
    self: { ...view.self.creature, stats: { ...view.self.creature.stats } },
    estimatedOpponent: {
      instanceId: opponent.creature.instanceId,
      speciesId: opponent.creature.speciesId,
      typeId: opponent.creature.typeId,
      stats,
    },
    hp: view.self.hp,
    opponentHp: opponent.hp,
    used: [...view.self.usedCategories],
    opponentUsed: [...opponent.usedCategories],
    exchangesCompleted: view.exchangesCompleted,
  };
}
