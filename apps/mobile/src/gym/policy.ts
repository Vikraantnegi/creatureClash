import type { GymView } from '@creature-clash/battle-engine';

// Selection policy sees only its own team and the public preview, never the other commitment.
export function chooseGymCreatures(view: GymView, count: number, rng: () => number): string[] {
  const pool = [...(view.phase === 'team' ? view.roster : view.available)];
  if (pool.length < count) throw new Error('Not enough eligible creatures');
  const picks: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error('Invalid opponent randomness');
    picks.push(pool.splice(Math.floor(value * pool.length), 1)[0]!.instanceId);
  }
  return picks;
}
