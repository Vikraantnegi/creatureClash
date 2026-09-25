# Phase 7 implementation and evidence

## Playable scope

- Each owned instance stores original base stats, lifetime XP and four training allocations. Equal-level creatures can develop different builds. Species fixture data never changes.
- Levels 1–10 use thresholds 0/30/70/120/180/250/330/420/520/630. Each level grants two points; each spent point adds one raw stat, up to +8/category. XP continues at level 10 without additional points.
- Every gym participant earns 15 XP for its own win or 10 for its loss/draw. Benched creatures and standalone practice duels earn none. No automatic growth.
- The gym uses entry snapshots for all three duels. Rewards are persisted before exchange actions become available. Reopening a saved pending settlement restores the result; it does not award XP again.
- Exchange transfers identity, XP, base stats, allocations and unspent points. The current owner trains after settlement. The AI also trains only after ownership is final.
- Journal training has a draft, per-category plus/minus controls, preview, reset and explicit confirmation. Only draft additions can be removed. Persistence completes before updated stats appear as saved.
- Opponent levels are public; unplayed opponent values remain species clues. Full participating builds are disclosed after the gym, before the exchange.

## Code boundaries

`packages/battle-engine/src/progression/` owns thresholds, validation, XP and allocation arithmetic. Battle snapshots contain resulting stats and a public level, with no training ledger.

`apps/mobile/src/trainer/progression.ts` owns settlement, ownership-linked progress and training authorization. The gym controller locks training during an encounter and sequences rewards → exchange → finished. `useTraining` owns draft interaction; the small NativeWind training/reward components render it.

The v2 trainer record stores source progress plus the existing roster snapshots as a checked cache. Loading derives snapshots again and rejects inconsistent caches. Both owners, progress, revision and pending settlement are one AsyncStorage value. Migration retains the exact v1 JSON under `creature-clash:trainer:v1-backup`, preserving individual saved stats and ownership at XP zero. A failed migration leaves v1 recoverable. Corrupt/unsupported saves are not reset.

Pending gym receipts are reconstructed through engine team/deployment/completion transitions before use. Reward totals are rebuilt from participant outcomes. Repository writes serialize and check an expected revision; identical retries are idempotent. This protects the local controller from accidental duplicate work. It is not a multiplayer security boundary.

## Allocation study

Run after `pnpm build`:

```sh
node tools/battle-study/specialisation.mjs
pnpm --filter @creature-clash/mobile exec jiti ../../tools/battle-study/specialisation-sessions.ts
```

Outputs: `outputs/battle-study/specialisation-results.json` and `specialisation-sessions.json` (generated, gitignored).

The allocation study uses production snapshots and duel transitions across all 36 ordered species pairs. It samples balanced training and four rotated concentration builds, at budgets/caps 8/4, 8/8, 12/6 and 18/8, against both untrained and equal-budget opponents. That is 4,320 build-matchup cases, including mirrors. It exhausts category continuations for each sampled case, **not every possible allocation** and not mixed-strategy equilibria.

Distinct-species cases with no winning sequence for side B:

| Budget / cap | Trained vs untrained | Equal budget |
| ------------ | -------------------: | -----------: |
| 8 / 4        |              0 / 150 |      0 / 750 |
| 8 / 8        |              1 / 150 |      4 / 750 |
| 12 / 6       |              2 / 150 |      4 / 750 |
| 18 / 8       |              2 / 150 |      4 / 750 |

At 18/8, both sides still have some winning sequence in 742/750 sampled equal-budget distinct-species cases. Four cases prevent B winning; four reversed cases prevent A winning. All 150 sampled mirror cases allow either side to win through some sequence. These are possibilities, **not win probabilities**.

The four equal-budget no-win cases are Emberhorn against Fernlet, with each using one of the Speed-first or Special-first concentration builds. This extends an already difficult species matchup: Emberhorn already had a pure forced strategy at baseline, but training can remove even Fernlet's chance of winning against a mistake. Hiding stats cannot fix that.

The narrower 8/4 candidate had no impossible wins in its sampled cases, but those samples do not establish universal fairness. The implemented 18/8 rule remains experimental. Before competitive play, revisit this matchup, investment limits and/or experience-based matchmaking. Do not claim the original uniform-growth results validate specialisation.

## Repeated-session study

1,600 gyms: 20 seeds × 10 gyms × training on/off × exchanges on/off × greedy/tactical policies. Uses the actual mobile species-clue adapter, gym team/deployment policy, production progression and exchange functions. Both sides start at level 5; XP always accrues. Training-off banks points. Both trainers use the same own-stat-priority training rule; the exchange heuristic accepts only an increase in total trained stats.

| Policy   | Training | Exchanges | A wins / B wins / draws | Actual exchanges | Mean final stat-total gap |
| -------- | -------- | --------- | ----------------------- | ---------------: | ------------------------: |
| Greedy   | Off      | Off       | 79 / 67 / 54            |                0 |                         0 |
| Greedy   | Off      | On        | 90 / 63 / 47            |               58 |                        12 |
| Greedy   | On       | Off       | 80 / 69 / 51            |                0 |                       1.5 |
| Greedy   | On       | On        | 88 / 64 / 48            |               66 |                        13 |
| Tactical | Off      | Off       | 80 / 98 / 22            |                0 |                         0 |
| Tactical | Off      | On        | 88 / 100 / 12           |               80 |                        10 |
| Tactical | On       | Off       | 84 / 97 / 19            |                0 |                       1.5 |
| Tactical | On       | On        | 93 / 96 / 11            |               93 |                      15.7 |

Ownership and participant traces are retained. Seeds share encounter starts; changed rosters and duel lengths can change later random consumption. These aggregate outcomes do not measure remaining counterplay after each loss, long-term snowballing, optimal player builds, or human attachment. The total-stat heuristic does not understand team coverage. That remains a balance/playtesting follow-up.

The tactical adapter estimates hidden training by distributing the budget implied by public level, then uses actual values for revealed categories. Tests make hidden stats throw if accessed. This is a simple prior, not inference over all allocations consistent with clues/history. Sampling alternate priors is deferred.

## Verification and limits

Automated coverage includes every XP threshold, allocation budgets/caps, arithmetic overflow, immutable bases, independent builds, v1 migration and failed migration, concurrent/stale persistence, ambiguous write acknowledgement, duplicate rewards, pending restart, exchange/decline/draw, training lockout, transferred unspent points and fresh battle snapshots. All 138 tests pass (84 engine, 48 mobile/controller, six study regressions). Formatting, lint and app/engine typechecks pass. Android and iOS production bundles export successfully.

Android emulator: existing owned roster migrated and loaded; gyms completed with correct visible XP rewards; journal displays level, XP, per-category growth and disabled spending at zero points. Force-stop/reopen restored the pending gym result, with Voltik still at 25 lifetime XP (10 before the gym +15 for its win), without a duplicate award. Full post-gym participant build inspection worked. On defeat the opponent exchanged Fernlet for Voltik; the result confirmed both owners were saved. Further device observations are recorded below as checks complete.

The aggregate `pnpm check` reaches the Expo dependency check and reports existing packages behind recommended patches: `expo` 57.0.20 → ~57.0.25, `expo-dev-client` 57.0.18 → ~57.0.19. This feature does not upgrade native dependencies. A routine Expo patch/native-build refresh remains pending.

The local watcher limit interrupted Metro during verification. `CI=1 pnpm --filter @creature-clash/mobile exec expo start --dev-client --localhost --port 8081` starts Metro without watchers; the emulator connects through `adb reverse tcp:8081 tcp:8081`. This mode serves the app but does not hot-reload source edits. Normal development still uses `nvm use && pnpm dev` from the user's terminal.

No native dependency was added. iOS runtime/physical-device verification is not covered by an iOS bundle export. Active battles are not persisted; force-closing before reward settlement can still abandon a gym. The confirmed-build permanence and emotional cost of losing a developed creature still require human playtesting.
