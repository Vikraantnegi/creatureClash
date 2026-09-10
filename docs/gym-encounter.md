# Gym encounter implementation

This implements the agreed local 3v3 flow and supersedes the temporary fixed-pair UI. It is single-player against a local AI. It does not add networking, disk persistence, XP, or a server ownership ledger.

## Rules

- Each trainer has six active creature **instances**. Both sides preview the opponent's six species/types; individual opponent stats and the chosen three remain hidden during preparation. Fixtures have no level field, so none is invented.
- Both privately lock three distinct instances. Matching species between trainers is allowed. Instance identity, not species, governs eligibility and ownership. An exchange can leave a trainer with multiple instances of the same species.
- Between duels, each side privately commits one unused member of its locked team. Only after both commits are accepted does a fresh duel expose both participants. No preset pair order remains in the playable gym mode.
- Every creature participates once, win or lose. All three duels play, even after two wins. Each duel starts at two HP with unspent categories and uses the existing scoring/session/reveal rules.
- One point per duel victory; a drawn duel awards neither side a point. Equal encounter scores draw. Drawn encounters allow no exchange.
- After a 3v3 victory, only the winner may optionally give one of their three participants for one of the loser's three participants. No reserve can be offered or taken. Declining leaves both rosters unchanged.
- The exchange removes both actual instances from their previous owners and inserts them into the other roster in a single engine transition. Instance IDs and all current snapshot data remain unchanged; each owner retains six. Completed battle records remain historical snapshots.
- The next encounter uses the updated rosters. They remain in app memory across switching between Duel and Gym. Reloading/closing the app resets fixtures; this is not permanent collection storage.
- Standalone 1v1 offers no exchange. The old Swap run and fixed Paired 3v3 entry points have been removed from the app. Their earlier engine modules/tests remain legacy research code, not the current game flow.
- Winner-stays-on is excluded for this version: D16's playable direction is one duel per selected creature. No relay HP/category carryover is implemented.

## Timers and opponent

Preview is untimed. Entering the gym starts a provisional 30-second team-selection timer. Each deployment has a provisional 15-second timer, started explicitly after reviewing the previous duel. A partial team timeout keeps existing picks and fills remaining slots in active-roster order. Deployment timeout chooses the first eligible creature in active-roster order. Fallbacks never inspect the opponent's pending choice. Late taps use the fallback even if the timer callback has not fired yet.

The app pauses these clocks in the background, just like the existing ten-second category clock. Timer generation and stage/encounter/round keys reject stale callbacks and inputs. Mode switching is disabled during an encounter so an in-progress ownership decision cannot silently disappear through navigation. Selection and deployment are immediately binding once committed.

The local AI samples three unique creatures and samples an unused deployment. Its commits occur before the human selection opens, through the same engine commitment functions. The policy receives its own projected view, not the controller's hidden state. During duels it uses the existing greedy category policy. On an AI encounter victory, the prototype opponent always offers its first participant for the player's first participant; the result is applied after the player acknowledges it. This is a simple disclosed policy, not an adaptive opponent.

## Stat visibility

Exact versus Ranges remains an experiment, now configurable before entering the gym and applied to all three duels. The setting is locked for the encounter and preserved for the next one. Opponent preview never exposes individual raw stats. Revealed duel values follow the existing visibility projection; the outcome/exchange screen may show all participating creatures' stats because all three duels are over. Future unused deployments remain hidden.

## Boundaries

- `packages/battle-engine/src/gym`: clock-free team/deployment commitments, result validation, score, ownership exchange, and allowlisted player views. Reuses `createDuel`, the existing completion replay validation, and win-count scoring.
- `apps/mobile/src/gym/controller.ts`: private gym state, injected clock/RNG, policy calls, stage transitions and rosters across encounters. Its public snapshot contains the projected human view.
- `apps/mobile/src/gym/useGym.ts`: React subscription and AppState connection, owned by App so mode switches retain roster changes.
- Small NativeWind components display opponent preview, creature choices, scoreboard, exchange, and the stage screen. Existing `ManagedDuel` still owns the battle screen integration and calls back only after the final reveal is acknowledged.

These are application boundaries against accidental leakage. A local process holds both sides' state; this is not multiplayer security or an authoritative server.

## Verification

Automated tests cover six-roster/instance validation, immutable input copies, team commitment validity and locking, both deployment submission orders, public-view isolation, no opponent commitment leakage, fresh HP/categories, no reuse, stale/partial/tampered completion rejection, third-duel continuation after two wins, draws, winner-only participant exchanges, declines, both ownership directions, next-encounter carryover, timers, background pause, deadline races, stale callbacks and invalid AI randomness.

Checkpoint: 107 tests passed (75 engine, 29 mobile, 3 study), along with typechecks, lint and Android/iOS bundle exports. Android emulator verification completed six-creature preview, private team selection, deployment in a different order, all three duels despite an early 2–0 lead, background-paused deployment, and a victory exchange of Brookfin for Slate. Both changed rosters appeared in the next encounter and survived switching between Duel and Gym. Decline, AI victory, draw, timeout and stale callbacks are covered by automated tests; this walkthrough did not manually exercise every branch. Physical-phone pacing and strategic enjoyment still require human playtesting.

## Playtest findings — 2026-09-10

The first human screenshots exposed two distinct problems; neither is fixed by this encounter implementation:

- **Fernlet vs Slate:** Fernlet has effective Attack 60.5, Defense 88, Special 77; every Slate category is 54. Spending any two of those three Fernlet categories guarantees a 2–0 win regardless of Slate's choices. Exact stats expose the predetermined matchup. Ten-point ranges do not conceal it either: Slate's 50–59.9 still loses to all three. This needs matchup/balance review, not merely hiding information. The player raised a credible concern that someone recognising a forced loss would forfeit or close the app. No new forfeit rule is implemented here.
- **Voltik vs Emberhorn:** the player's Special → Speed → Attack beat greedy Emberhorn's Attack → Defense → Special. Replaying through the engine confirms Voltik wins. Replacing Emberhorn's sequence with Special → Speed → Attack makes that same Voltik sequence lose. This is a consequential sequence against a readable bot, not proof of an unbeatable strategy or robust human counterplay.

Keep exact/range modes as comparison conditions. Do not interpret hiding a known forced loss as correcting that loss. Next design work should distinguish uncounterable matchups from exploitable opponent policies; no stat/type/AI balance changes were silently added to this implementation.
