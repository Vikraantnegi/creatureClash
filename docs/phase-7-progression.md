# Phase 7: individual creature progression

> Historical uniform-growth experiment. The user has selected trainer-directed category specialisation. See [the revised Phase 7 plan](phase-7-specialisation.md). The evidence below remains valid for uniform growth; it does not validate specialisation. Existing progression code still implements this unwired baseline. Do not wire it into mobile saves as the selected progression design.

## Goal and current checkpoint

Finish a gym, develop the participating creatures, decide whether to exchange one, and use the resulting team in another gym. Evaluate whether growth makes team selection and ownership more meaningful without making category choices irrelevant.

The initial modelling and pure progression foundation are implemented. Mobile XP, save migration, durable encounter settlement and progression UI are **not implemented yet**. The current app still uses the previous saved rosters. The rules below are provisional values to playtest, not final balance or ranked rules.

## Working rules

- Individual instance owns base stats and cumulative XP. Level and battle stats are derived. Never increase an already-grown battle snapshot or reset an exchanged creature's XP.
- Levels 1–5. Cumulative thresholds: 0, 30, 80, 150, 240 XP.
- Each level adds 1 to each of the four base categories. HP stays 2. No new categories, abilities or evolution.
- A participant gets 10 XP for completing its duel, plus 5 if it won that duel. Draw and loss both grant 10. No bench XP and no extra overall-gym victory bonus.
- Apply progression after all three gym duels, before the optional exchange. All three participants on both teams earn their own duel rewards, irrespective of the encounter winner. Do not change stats during the encounter.
- The cap discards overflow and the UI reports actual applied XP. Reaching level 2 takes two victories or three losses with that creature. Reaching level 5 takes sixteen victories or twenty-four losses from level 1; mixed results fall between. These are pacing hypotheses.
- Literal exchanges still involve participating creatures only. Taking a strong participant by giving a weaker one remains legal. XP and identity follow the creature in both directions.
- Standalone duel remains practice with no ownership or XP rewards. Both local gym trainers follow the same growth rules, with no automatic opponent-level scaling in this slice.
- Own XP/level and growth are visible. Keep opponent species clues during preparation and hidden category values during selection. Opponent-level visibility is not implicitly added by progression. The reward/exchange screen can disclose participant progress after the encounter; battle-stat disclosure remains governed by the existing visibility rules.

## Growth evidence

Reproduce with `pnpm build && node tools/battle-study/progression.mjs` using the pinned Node version. Full output is `outputs/battle-study/progression-results.json` (ignored generated data).

The study uses exact engine transitions for all 36 ordered species pairs, six level pairings (1/1, 2/1, 3/1, 5/1, 5/4, 5/5), and three growth curves. It checks existence of winning sequences and exact-information pure forced strategies. The latter asks whether a policy can guarantee victory against every opposing commitment without seeing the current commitment. It does not solve mixed-strategy equilibria or measure human win rates.

At level 5 versus level 1, for the 30 ordered different-species pairs:

| Growth per level                  | Newly forced winning strategies for higher-level side | Pairs with no winning sequence for lower-level side |
| --------------------------------- | ----------------------------------------------------: | --------------------------------------------------: |
| +1 per category                   |                                                     2 |                                                   0 |
| +2 per category                   |                                                     6 |                                                   1 |
| +2% of base per category, rounded |                                                     5 |                                                   0 |

There are already four forced strategies per side across the 30 ordered baseline pairs. With +1, level 2/1 and 3/1 add none among different species. At 5/1, the new higher-level forced strategies are Slate against Voltik and Fernlet against Slate. The lower side can still win if the higher side plays poorly. All curves create a forced higher-level Emberhorn mirror strategy even at a one-level gap; mirrors are reported separately rather than concealed in aggregate counts.

**Recommendation: start with +1, cap 5.** It creates fewer new forced strategies than the alternatives at the cap and is easy to explain. This is a bounded first experiment; it does not prove progression preserves fairness across future creatures or levels.

## Exchanges as a source of compounding advantage

If the winner gives away a creature worth S and takes one worth T, its roster gains T−S while the loser loses T−S. The roster gap changes by 2×(T−S), even though the combined collection is conserved. Here “worth” must have a defined measure: total stats is a diagnostic proxy, not matchup power, type coverage, sentimental value or rating.

A separate diagnostic runs 40 seeded series of 10 gyms for each combination of growth curve, XP on/off and exchanges on/off: 4,800 gyms total. Each trainer starts with the same species and level distribution (1/2/3/4/5/1). Teams, deployment and category orders are uniformly shuffled. Winners exchange their lowest-total participant for the opponent's highest-total participant only when it improves the total. It uses real gym transitions, not an invented ownership simulation. These are stress scenarios with developed rosters, not predictions of a new player's first ten gyms. The current app's AI exchange heuristic is still first-participant-for-first-participant.

For the selected +1 curve:

| Condition         | Mean absolute roster stat-total gap after 10 gyms | Previous gym winner also wins next gym |
| ----------------- | ------------------------------------------------: | -------------------------------------: |
| XP off, swaps off |                                                 0 |                                161/337 |
| XP off, swaps on  |                                              37.8 |                                184/350 |
| XP on, swaps off  |                                               3.9 |                                166/342 |
| XP on, swaps on   |                                              32.1 |                                193/352 |

The repeat-win denominator excludes previous draws but includes next-gym draws; encounters within a series are dependent. Seeds are shared between conditions, but ownership changes alter later encounters. These observations show that swaps can redistribute power; they do not estimate competitive advantage against skilled team selection or establish statistical significance. XP did not amplify every gap metric: under swaps, the mean final gap was smaller with XP enabled in this sample. Do not claim a universal snowball from these runs.

Keep the user's exchange rule for the local experiment. Do not infer leaderboard movement from stat totals or adjust rank on an exchange. Before ranked play, decide whether rating measures trainer performance with a changing roster, how matching accounts for roster strength, and whether high-stakes exchange is a separate mode. Losses, reconnects and settlement must be authoritative before real ownership/ranking stakes.

## Architecture and ordered implementation

1. **Done: growth model and pure functions.** `battle-engine/src/progression` owns validation, thresholds, XP awards and snapshot projection. Types/constants/functions are separate; it has no storage, React, timer or owner dependency. Calculation is not idempotent settlement: callers must identify the completed encounter and award once.
2. **Next: owned-creature save v2 and migration.** Save base snapshot + XP per instance and trainer ownership. Derive battle snapshots at encounter creation. Migrate v1 saved snapshots to base stats at 0 XP, preserving existing individual stats and ownership instead of reseeding fixtures. Retain the original record until a validated v2 write succeeds. Reject future/invalid versions without overwriting them.
3. **Durable gym settlement.** Persist rewards and a pending exchange together immediately after the final duel result, before presenting exchange choices. Use encounter identity to prevent replayed awards. On restart, restore pending exchange rather than allowing a loss exchange to be skipped while retaining XP. Save the final ownership exchange and clear pending settlement in one record write; retry uses the same settlement. Draws settle XP with no exchange. Mid-encounter restart remains a documented local prototype limitation until active-encounter persistence is added.
4. **Mobile integration and UI.** Controller/hooks own settlement lifecycle. Small NativeWind components show each participant's applied XP, level change and stat changes, then exchange choices using the progressed participants. Add a reusable own-creature detail view accessible from the journal. Avoid showing pre-growth snapshots as the post-growth exchange offer. The journal reads current ownership after settlement.
5. **AI and information audit.** Preserve the same visible-information boundary as the player. Species estimates will become less accurate as creatures grow; evaluate that explicitly rather than secretly supplying opponent XP or exact stats. Compare current first-participant exchange AI with the diagnostic stat-total policy before adopting a new AI strategy.
6. **Acceptance.** Play consecutive gyms, level a creature, lose a gym, exchange a developed creature, restart during a pending exchange and after settlement, and check identity/XP ownership. Confirm no duplicate reward on repeated callbacks or reload; failed writes must remain retryable. Re-run balance with actual app policies once wired. Human gate: progression feels worth pursuing and category/deployment choices still matter.

Do not add ranked infrastructure, capture, inactive inventory, a world map, global state libraries or a backend as prerequisites for this slice.
