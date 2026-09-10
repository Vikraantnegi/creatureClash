# Phase 6 implementation

> Historical checkpoint. The playable Swap run and fixed Paired 3v3 have been superseded by [Gym 3v3](gym-encounter.md). The rules below document the earlier experiment, not the current encounter flow.

## Decisions

The duel contract is unchanged. Four categories, two battle HP, up to three normal exchanges, conditional automatic fourth, ten-second selection, and manual Continue.

Three playable modes share one mobile duel controller:

- **Duel:** fixture selection with greedy/random AI.
- **Swap run:** choose three distinct species from six, face three preset opponents, select any roster creature per duel. A win before the final opponent offers an optional replacement of any roster slot. The next opponent is visible. Each duel starts with fresh HP/categories. A loss or draw ends the run. Final victory completes it without a purposeless last swap. Restart returns to roster selection. Nothing persists outside the run.
- **Paired 3v3:** A1/B1, A2/B2, A3/B3, each with fresh combat state. All three pairs play. A duel victory awards one point, a draw awards neither side a point. Equal totals draw the encounter. A mirrored-team preset provides a visible draw/automatic-fourth comparison fixture alongside the mixed-team preset.

**D16 remains open. Paired 3v3 is a temporary comparison, not the final gym format.** Relay needs a separate decision on carried HP, category exhaustion, and replacement rules. Implementing paired mode does not resolve those questions.

No XP, wild capture system, permanent collection, broader rewards, relay, online play, or animation expansion is included.

## Ownership

- `packages/battle-engine/src/run`: pure roster/run transitions.
- `packages/battle-engine/src/paired`: pure fixed-pair progression and scoring.
- `packages/battle-engine/src/encounters`: narrow shared validation and copy helpers, not a generic encounter framework. Completed results are checked against the expected duel and replayed through the existing resolver to reject partial/inconsistent results. This is local application integrity, not multiplayer security.
- `packages/battle-fixtures`: six prototype definitions and snapshot factory used by the app and study. Definitions are not production content or a balance claim.
- `apps/mobile/src/battle/controller.ts`: the one commitment/timing/reveal path; accepts fresh prepared duels and notifies its owner only after the last reveal is acknowledged.
- `apps/mobile/src/encounters/hooks`: call engine actions and handle run/pair progression. Functional state updates reject obsolete callbacks after a restart.
- `apps/mobile/src/atoms` and feature components: NativeWind styling, rendering, and action forwarding. The hooks expose actions; domain rules remain usable outside React.
- `tools/battle-study`: offline lookahead and reports; no dependency from the mobile app to analysis code.

NativeWind scans `src/`. Components use complete class strings and explicit variants. No new global state or navigation library was added. Switching mode resets that mode's current encounter, as the UI states.

## Analysis

Run `pnpm study` (or `pnpm study /absolute/output/path`). Results are written to `outputs/battle-study/results.json` and `matches.csv` by default; generated reports are gitignored.

The planner enumerates hypothetical legal picks using `advanceDuel`. Its objective is final win=1, draw=0.5, loss=0 under an assumed 80% greedy / 20% uniform opponent. Exact ties use canonical category order with a small floating-point accumulation tolerance. Search does not consume match RNG or receive session commitments. Actual games use `runPolicyExchange` and separate seeded RNG streams.

The study evaluates 21 unordered fixture pairs including mirrors, both perspectives, three seeds, and three actual opponent models. Each model has 126 greedy-versus-lookahead comparisons. Deterministic greedy repeats are not independent observations. The state-based analysis adapter captures only the pre-commit duel state; it does not pretend the existing view-only policy signature includes a type chart.

Initial results under these fixtures/seeds:

| Actual opponent | Comparisons | Greedy wins | Lookahead wins | Outcomes changed |
| --------------- | ----------: | ----------: | -------------: | ---------------: |
| Greedy          |         126 |          45 |             93 |               48 |
| Random          |         126 |          78 |             74 |               34 |
| 80/20 mixed     |         126 |          44 |             92 |               49 |

The planner is specialized to its assumed opponent; it slightly underperformed greedy against random in this seed set. Outcome changes are not synonymous with improvements. Simulation does not establish fun. Reports include fixtures, chart, seed, perspective, model, revision/dirty status, expected utilities, and engine events.

## Verification

- `pnpm test`: engine, mobile controller, and Node lookahead tests.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm bundle:check`.
- Device: win a run duel, replace a roster member, choose it in the next duel, verify fresh HP/categories, and verify a loss/draw/restart. Decline a swap in another run.
- Device: play all three paired duels, acknowledge an automatic fourth separately, inspect the final score, restart, and background a later duel.
- Preserve standalone duel as the comparison baseline. Physical-phone pacing and whether swapping changes player decisions remain personal playtest questions.

No package/native SDK upgrades were made. pnpm reports an existing React Native Metro peer-version mismatch; track it separately from these changes.

## Implementation checkpoint

- 86 tests pass: 66 engine, 17 mobile-controller, 3 offline-analysis tests.
- Root typechecks, ESLint, formatting, and Android/iOS production bundle exports pass.
- `pnpm check` reaches the Expo compatibility check, which still requests the existing Expo 57.0.20 → ~57.0.21 patch update. This pre-existing dependency advisory is not a passing check; no SDK upgrade was made here.
- Android emulator: completed a swap run with a replacement, use of the replacement in a fresh duel, a declined swap, final victory, and restart.
- Android emulator: swap-run loss and draw each ended the run with the correct explicit result and a restart action.
- Android emulator: completed mirrored paired encounters ending 1–1 (draw) and 2–0 (win), with the Slate automatic fourth shown separately. Backgrounding the third duel for over ten seconds preserved selection time on return.
- Physical-phone playtesting and iOS native execution remain unverified in this implementation session. Human judgement of the swap decision and overall encounter pacing is still required.

Changes are left uncommitted for review.
