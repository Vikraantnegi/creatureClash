# Slate fixture experiment

The working fixture version is `phase6-v2-slate`. Slate changes from 60/60/60/60 to **Attack 70, Defense 90, Speed 35, Special 45**. Total stats remain 240. Its species clues are now high Attack/Defense and low Speed/Special. These are broad species clues, not guaranteed numeric bounds. Combat rules, type chart, information visibility and the other five creatures are unchanged.

This is a provisional balance adjustment. With the old identical values, every possible category order made Fernlet beat Slate, Slate beat Voltik, and Emberhorn beat Slate. Hiding stats delayed recognition but could not create counterplay.

## Candidate comparison

The engine evaluated all 24 × 24 category orders against each of Slate's five distinct opponents. A separate recursive check asks whether either side can guarantee a win against every opposing commitment, assuming exact stats but without seeing the current pick. A forced strategy is different from the same winner under every sequence: mistakes can lose the former.

| Attack / Defense / Speed / Special | Pairings with a forced strategy | Same winner under every sequence |
| ---------------------------------- | ------------------------------: | -------------------------------: |
| 60 / 60 / 60 / 60 — old            |                               5 |                                3 |
| 65 / 80 / 35 / 60                  |                               2 |                                0 |
| 70 / 85 / 35 / 50                  |                               1 |                                0 |
| 75 / 90 / 30 / 45                  |                               1 |                                0 |
| **70 / 90 / 35 / 45 — selected**   |                           **0** |                            **0** |
| 65 / 85 / 40 / 50                  |                               1 |                                0 |

The selected candidate preserves a strong defensive category and clear weak categories while removing opening forced wins in all five Slate matchups. Across the whole roster, exact-information forced-strategy pairings fall from 9/15 to 4/15; the four remaining pairings do not involve Slate. This does not establish equal matchup odds, optimal mixed-strategy balance or fun.

For example, Slate's effective Defense against Fernlet is now 81: it beats Fernlet's Special 77 but loses to Defense 88. Slate's Attack 63 beats Fernlet's Attack 60.5. Using Defense at the wrong moment can waste Slate's best opportunity. In contrast, old Slate had four identical 54s and no way to change that matchup's outcome.

A secondary diagnostic ran the current tactical policy on both sides using the mobile species-clue adapter: 100 seeded matches per opponent, Slate as side A, separate seeded RNG streams. Slate recorded 58 wins / 32 losses / 10 draws against Ashkit, 67/33/0 against Brookfin, 29/71/0 against Fernlet, 69/31/0 against Voltik and 40/60/0 against Emberhorn. These are policy-specific observations, not human win rates or optimization targets.

## Reproduce and play

Run `pnpm build`, then `node tools/battle-study/slate-balance.mjs`. Candidate results and example winning/losing traces are written to `outputs/battle-study/slate-balance-results.json`. Counts of category orders include prefixes repeated by early endings and must not be interpreted as independent matches.

Regression tests exercise winning and losing legal sequences in the three formerly predetermined pairings. Controller mirror tests still exercise the ordered automatic fourth reveal using Slate's new greedy category order. The analysis test for equal-score tie-breaking uses a synthetic flat sheet rather than assuming a production creature must have identical stats forever.

Reload the app before playing, because existing gym rosters and duel snapshots retain the stats they were created with. Start with Slate versus Fernlet, then Slate versus Voltik. Look for whether spending or preserving Defense changes your options. Keep the species-clues setting. No new native build is required.

Automated checks establish counterplay opportunities; acceptance of the new fixture remains a human playtest decision. The archived Claude artwork/source profiles describe the original design iteration and do not override runtime fixture data.
