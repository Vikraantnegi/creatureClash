# Active-stat visibility experiment

> This records the initial standalone visibility patch. The follow-up [Gym 3v3 implementation](gym-encounter.md) now applies the same setting across a full encounter and replaces the old run/fixed-pair entry points.

## Purpose and scope

Compare exact opponent stats with approximate opponent stats in **Duel** mode. Battle scoring, fixtures, AI policies, HP, categories, and timing remain unchanged. This is a presentation experiment, not evidence that the game is balanced against adapting humans.

The approved encounter direction is: six active creatures visible in team preview; each trainer privately selects three; deployment remains hidden until both commit; each participating creature fights once. An optional literal ownership exchange between the participating teams follows a 3v3 victory; none follows a 1v1. Active-stat visibility is still open. These encounter changes are not implemented by this patch: the existing fixed-pair comparison and old PvE swap run remain prototype scaffolding, not that final encounter flow.

## Implemented rules

- Choose **Exact** or **Ranges** under Opponent stats before starting a standalone duel, or after finishing one. Changing the setting prepares a fresh duel with the same matchup. It cannot change during selection, commitment, or reveal.
- Exact is the default. Rematch and matchup changes preserve the selected visibility; leaving Duel mode resets its local state.
- Your raw and effective stats always remain exact.
- Ranges hide both the raw value and exact effective value of each unrevealed opposing category. Each displayed range covers ten effective points: `70–79.9`, for example. Bands use the engine's integer-tenths effective scores; no battle arithmetic is duplicated.
- The ten-point width is provisional. It is defined once as `EFFECTIVE_RANGE_WIDTH_TENTHS = 100`.
- Both creatures' identities, types, type multipliers, HP, and spent categories remain visible. There is no level or XP field in current snapshots; no level is invented for this experiment.
- A category becomes exact when its exchange is presented, not when the engine resolves it privately. The automatic fourth remains its own reveal. History retains exact revealed scores.
- Unspent categories remain approximate even if the duel ends early. Rematch clears reveal knowledge for the UI, although a human naturally remembers earlier games.
- The creature-sheet renderer receives only projected display rows. Exact stats still exist in the local engine/controller; this is not a multiplayer security boundary.
- Run and paired modes retain exact stats. Their setup screens already expose fixture information, so they are not valid isolated visibility comparisons yet.

## Code responsibilities

- `battle/visibility.ts`: pure, allowlisted creature-sheet projection and effective-score range formatting.
- `battle/useBattle.ts`: exposes projected self/opponent sheets to React.
- `battle/controller.ts`: stores visibility and permits changes only between standalone duels.
- `battle/components/StatVisibilityControls.tsx`: two pre-duel choices using the shared NativeWind button.
- `battle/components/CreatureSheet.tsx`: renders projected values; never decides who wins.

## Playtest

1. Open Duel, choose a matchup and AI, and select Ranges. Start with a matchup whose individual values you do not already remember.
2. Before each pick, identify the risk you are accepting. After the reveal, judge whether the outcome was understandable or felt unknowable.
3. Finish several duels, then switch to Exact with the same matchup and AI. Keep everything else constant. Reverse the order on a different matchup to reduce order effects.
4. Compare: could you explain your decision beforehand; did the reveal teach anything useful; did uncertainty create tension or frustration; did you want another duel?
5. Try both greedy and random opponents. Greedy reveals exploitation of a predictable policy; random varies choices but does not adapt. Neither substitutes for a later human/adapting-opponent test.

Do not treat win-rate differences across unseeded random matches as caused solely by visibility. Fixed fixtures can be memorized, and mirrors expose the other creature's numbers through your own sheet. Range overlaps, remembered information, and whether a matchup actually contains uncertain comparisons all affect the experiment. Do not introduce random individual stats mid-comparison to disguise these limitations.

## Verification

Automated coverage checks range boundaries, no exact-value fields in unrevealed sheet rows, unchanged inputs, own/exact stats, delayed reveals including automatic fourth, visibility locking/reset, and identical engine outcomes for identical choices under both presentations. Existing controller tests cover timer, rematch, and background behaviour.

### Implementation checkpoint

- 92 tests pass: 66 engine, 23 mobile, and 3 offline-analysis tests.
- Root typechecks, ESLint, formatting, and Android/iOS bundle exports pass.
- Android emulator verified: exact baseline, range setup and selection, exact spent-category reveal with remaining categories still approximate, timeout/KO result, and a rematch restoring fresh HP, unspent ranges, and ten seconds. Switching away and returning resets to the exact baseline. Metro was restarted in the normal terminal after the agent environment hit its existing watcher limit.
- Human judgement of exact versus approximate stats, physical-phone playtesting, and adapting-opponent comparison remain outstanding.
