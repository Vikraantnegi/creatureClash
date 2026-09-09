import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createDuel, DEFAULT_TYPE_CHART, PLAYER } from '@creature-clash/battle-engine';
import { FIXTURES, FIXTURE_VERSION, creatureFor } from '@creature-clash/battle-fixtures';
import { GREEDY_WEIGHT, OPPONENT_MODELS, SEEDS, TERMINAL_UTILITY } from './constants.mjs';
import { studyMatch } from './match.mjs';

const output = resolve(process.argv[2] ?? 'outputs/battle-study');
const matches = [];
const started = performance.now();
for (let a = 0; a < FIXTURES.length; a++) {
  for (let b = a; b < FIXTURES.length; b++) {
    for (const side of [PLAYER.A, PLAYER.B]) {
      for (const opponentModel of OPPONENT_MODELS) {
        for (const seed of SEEDS) {
          const id = `${a}-${b}-${side}-${opponentModel}-${seed}`;
          const created = createDuel({
            duelId: id,
            creatureA: creatureFor(FIXTURES[a].id, `${id}-a`),
            creatureB: creatureFor(FIXTURES[b].id, `${id}-b`),
            typeChart: DEFAULT_TYPE_CHART,
          });
          if (!created.ok) throw new Error(created.error);
          const greedy = studyMatch(created.value, 'greedy', opponentModel, seed, side);
          const lookahead = studyMatch(created.value, 'lookahead', opponentModel, seed, side);
          matches.push({ creatureA: FIXTURES[a].id, creatureB: FIXTURES[b].id, greedy, lookahead });
        }
      }
    }
  }
}
const summary = OPPONENT_MODELS.map((model) => {
  const rows = matches.filter((match) => match.greedy.opponentModel === model);
  return {
    opponentModel: model,
    comparisons: rows.length,
    outcomeChanges: rows.filter((row) => row.greedy.winner !== row.lookahead.winner).length,
    greedyWins: rows.filter((row) => row.greedy.winner === row.greedy.side).length,
    lookaheadWins: rows.filter((row) => row.lookahead.winner === row.lookahead.side).length,
    greedyDraws: rows.filter((row) => row.greedy.winner === 'draw').length,
    lookaheadDraws: rows.filter((row) => row.lookahead.winner === 'draw').length,
  };
});
const metadata = {
  fixtureVersion: FIXTURE_VERSION,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  assumedGreedyWeight: GREEDY_WEIGHT,
  terminalUtility: TERMINAL_UTILITY,
  seeds: SEEDS,
  typeChart: DEFAULT_TYPE_CHART,
  fixtures: FIXTURES,
  scope:
    'All unordered fixture pairs including mirrors; planner evaluated on both sides. Repeated seeds against deterministic greedy are not independent observations.',
  limitation:
    'Expected utility assumes the stated opponent model. Outcome changes are not all improvements and do not establish fun.',
};
await mkdir(output, { recursive: true });
await writeFile(
  resolve(output, 'results.json'),
  JSON.stringify({ metadata, summary, matches }, null, 2),
);
const header =
  'creatureA,creatureB,side,opponentModel,seed,greedyWinner,lookaheadWinner,greedyExchanges,lookaheadExchanges';
await writeFile(
  resolve(output, 'matches.csv'),
  [
    header,
    ...matches.map(({ creatureA, creatureB, greedy: g, lookahead: l }) =>
      [
        creatureA,
        creatureB,
        g.side,
        g.opponentModel,
        g.seed,
        g.winner,
        l.winner,
        g.exchanges,
        l.exchanges,
      ].join(','),
    ),
  ].join('\n') + '\n',
);
console.log(
  JSON.stringify({ summary, elapsedMs: Math.round(performance.now() - started), output }, null, 2),
);
