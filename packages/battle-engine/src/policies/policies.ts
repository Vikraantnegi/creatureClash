import { CATEGORIES } from '../constants.js';
import {
  POLICY_RESULT,
  type CATEGORY,
  type PlayerView,
  type Policy,
  type PolicyResult,
} from '../types.js';
import { produceFailResult } from '../utils.js';

export const greedyPolicy: Policy = (view: PlayerView, _rng: () => number): PolicyResult => {
  const available = view.self.availableCategories;
  if (available.length === 0) {
    return produceFailResult(POLICY_RESULT.NO_LEGAL_CATEGORY);
  }

  let best: CATEGORY | undefined;
  let bestScore = -Infinity;

  for (const category of CATEGORIES) {
    if (!available.includes(category)) continue;
    const score = view.self.effectiveScores[category]!;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  if (best === undefined) {
    return produceFailResult(POLICY_RESULT.NO_LEGAL_CATEGORY);
  }

  return { ok: true, value: best };
};

export const randomPolicy: Policy = (view: PlayerView, rng: () => number): PolicyResult => {
  const available = view.self.availableCategories;
  if (available.length === 0) {
    return produceFailResult(POLICY_RESULT.NO_LEGAL_CATEGORY);
  }

  const r = rng();
  if (!Number.isFinite(r) || r < 0 || r >= 1) {
    return produceFailResult(POLICY_RESULT.INVALID_RNG);
  }

  const index = Math.floor(r * available.length);
  return { ok: true, value: available[index]! };
};
