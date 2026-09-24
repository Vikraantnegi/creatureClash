# Combat checkpoint and persistence baseline

## Working decisions

Keep species clues for unplayed opponent categories, exact own values, and exact opponent values only after their exchange is revealed. Keep simultaneous hidden commitments, each category once, 2 HP, three normal exchanges and the conditional automatic fourth. Draws remain explicit.

Gym preparation previews six species/types, privately locks three instances and secretly deploys unused participants. Each creature fights once with fresh HP/categories. All three duels count. Only the encounter winner can optionally exchange participating instances; the local opponent exercises the same right when it wins. Standalone duels remain fixture practice and do not change ownership.

Keep `phase6-v2-slate` (70/90/35/45) as the working roster. This closes the current implementation checkpoint; it does not declare final balance, long-term enjoyment or multiplayer readiness. Exact/range visibility remain comparison controls. Persistent ownership is the next step; XP growth and opponent-level rules need a separate decision before implementation.

## Bounded automated comparison

Run `pnpm build && node tools/battle-study/combat-checkpoint.mjs` with the pinned Node 22.23.2. The script uses the real engine/session and the mobile clue adapter. It writes full results, seeds and example traces to `outputs/battle-study/combat-checkpoint.json`.

For each oriented matchup, compare strongest-first with weakest-first followed by strongest-first against all 24 fixed opposing category orders. The opponent sequence is identical within each comparison. Swapping engine sides must preserve the outcome. These are order enumerations, not independent human matches; early-ending prefixes can repeat.

| Subject → opponent | Strongest-first wins / 24 | Weakest-first wins / 24 | Different winner / 24 |
| ------------------ | ------------------------: | ----------------------: | --------------------: |
| Slate → Voltik     |                        21 |                      20 |                     7 |
| Voltik → Slate     |                        12 |                       8 |                    12 |
| Slate → Fernlet    |                        12 |                       8 |                    12 |
| Fernlet → Slate    |                        22 |                      20 |                     6 |
| Slate → Emberhorn  |                        16 |                      16 |                    12 |
| Emberhorn → Slate  |                        20 |                      12 |                    12 |

Selection can change the winner in all six directions. Automatically sacrificing first is not a superior general strategy. No fixture change is justified by the previous single successful sacrifice trace alone.

A second comparison uses 30 reproducible, widely distributed seeds per direction. Both subject policies face the clue-based tactical opponent with the same separate RNG stream. Opponent decisions can still change in response to changed history, so this is a fixed-policy comparison, not identical opposing moves.

| Subject → opponent | Greedy wins / 30 | Tactical wins / 30 |
| ------------------ | ---------------: | -----------------: |
| Slate → Voltik     |               22 |                 24 |
| Voltik → Slate     |                6 |                 10 |
| Slate → Fernlet    |               14 |                  8 |
| Fernlet → Slate    |               21 |                 26 |
| Slate → Emberhorn  |               11 |                 15 |
| Emberhorn → Slate  |               20 |                 19 |

The tactical policy is sometimes worse: it relies on coarse estimates and assumes uniformly distributed opposing choices. These samples do not establish optimal balance, human win rates, or a difficulty ranking. Maintain Greedy as a comparison control.

## Evidence limits

Device tests demonstrated playable reveals, a successful sacrifice sequence and updated Slate values. Earlier timeout-affected runs are excluded from deliberate-choice evidence. A previous narrated Fernlet trace also listed Speed twice for the opponent, so it is not a valid verified sequence. Use the engine-generated traces above for numerical conclusions. The player's positive play report supports proceeding; automated agents cannot stand in for human enjoyment testing.

The earlier [Slate analysis](slate-balance.md) found four other exact-information forced-strategy pairings in the roster. This update fixes the Slate problem, not every possible forced position. Fixture memorization, matchup advantage and predictable policy exploitation remain things to watch before adding progression.
