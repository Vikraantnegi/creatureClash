// Creature Clash — prototype engine facade. Mirrors the existing RN engine's contract; numbers are design fixtures.
export const CATS = ['atk', 'def', 'spd', 'spc'];
export const CAT_NAME = { atk: 'Attack', def: 'Defense', spd: 'Speed', spc: 'Special' };
export const CAT_SHORT = { atk: 'ATK', def: 'DEF', spd: 'SPD', spc: 'SPC' };
export const TYPE_GLYPH = { Fire: '▲', Water: '◗', Rock: '◆', Grass: '❧', Electric: '↯' };
// Assumption: one strong and one weak matchup per type, ±2 on every category (engine owns the real chart).
const BEATS = { Fire: 'Grass', Grass: 'Water', Water: 'Fire', Electric: 'Water', Rock: 'Electric' };
export const SPECIES = {
  ashkit: { name: 'Ashkit', type: 'Fire', base: { atk: 9, def: 3, spd: 9, spc: 5 } },
  brookfin: { name: 'Brookfin', type: 'Water', base: { atk: 5, def: 5, spd: 3, spc: 9 } },
  slate: { name: 'Slate', type: 'Rock', base: { atk: 6, def: 6, spd: 5, spc: 5 } },
  fernlet: { name: 'Fernlet', type: 'Grass', base: { atk: 5, def: 8, spd: 3, spc: 8 } },
  voltik: { name: 'Voltik', type: 'Electric', base: { atk: 5, def: 3, spd: 9, spc: 6 } },
  emberhorn: { name: 'Emberhorn', type: 'Fire', base: { atk: 8, def: 8, spd: 3, spc: 5 } }
};
export const KEYS = Object.keys(SPECIES);
export function typeMod(mine, theirs) { if (BEATS[mine] === theirs) return 2; if (BEATS[theirs] === mine) return -2; return 0; }
export function clue(v) { return v <= 4 ? 'Usually low' : v <= 6 ? 'Usually moderate' : 'Usually high'; }
// Individuals vary ±1 from species; deterministic per instance id so the prototype is repeatable.
export function makeCreature(key, id) {
  const s = SPECIES[key], stats = {};
  CATS.forEach((c, i) => { const h = (id * 7 + i * 3 + key.length) % 5; stats[c] = Math.max(1, Math.min(10, s.base[c] + (h === 0 ? -1 : h === 4 ? 1 : 0))); });
  return { id, key, name: s.name, type: s.type, stats };
}
export function effective(me, opp, cat) { return me.stats[cat] + typeMod(me.type, opp.type); }
export function resolve(me, opp, mc, oc) {
  const mv = effective(me, opp, mc), ov = effective(opp, me, oc);
  return { mc, oc, mv, ov, outcome: mv > ov ? 'win' : mv < ov ? 'lose' : 'tie' };
}
export function firstUnused(used) { return CATS.find(c => !used.includes(c)); }
export function aiCategory(opp, me, used, mode, n) {
  const avail = CATS.filter(c => !used.includes(c));
  if (mode === 'random') return avail[Math.floor(Math.random() * avail.length)];
  // scripted: best effective value first, but exchange 2 plays second-best to feel less mechanical
  const sorted = avail.slice().sort((a, b) => effective(opp, me, b) - effective(opp, me, a));
  return sorted[n === 2 && sorted.length > 1 ? 1 : 0];
}
export function duelWinner(hp, exchanges) {
  if (hp[0] <= 0) return 'lose'; if (hp[1] <= 0) return 'win';
  if (exchanges >= 3) { if (hp[0] > hp[1]) return 'win'; if (hp[1] > hp[0]) return 'lose'; }
  return null;
}
export const TRAINERS = [
  { name: 'Mara', six: ['brookfin', 'emberhorn', 'voltik', 'slate', 'fernlet', 'ashkit'] },
  { name: 'Teodor', six: ['fernlet', 'fernlet', 'voltik', 'brookfin', 'slate', 'emberhorn'] },
  { name: 'Ines', six: ['voltik', 'ashkit', 'ashkit', 'slate', 'brookfin', 'fernlet'] }
];
