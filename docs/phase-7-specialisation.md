# Phase 7: trainer-directed creature specialisation

## Status and goal

Implemented after approval of trainer-directed category training. Supersedes the automatic +1-to-every-category, five-level recommendation. The [uniform-growth study](phase-7-progression.md) remains historical evidence. See [implementation and verification](phase-7-verification.md) for what was tested and the remaining balance limits.

The app now awards gym XP, restores pending settlement after restart, offers literal exchanges, and supports saved training in the journal. Save v1 migrates to v2 with a retained backup. Levels 1–10, two points per level and +8/category are the provisional playtest rules, not a competitive-balance conclusion.

Goal: two creatures of the same species and level can have different strengths because their trainers made different choices. Judge whether building, deploying and exchanging those creatures creates understandable, consequential decisions. A longer grind alone does not establish depth.

## Corrections to the previous discussion

Small stat gains are not necessarily cosmetic: 76 beats 75 and causes the same one-HP loss as a large margin. Participation XP affects progression speed, but identical automatic growth is what makes equal-level creatures converge. Increasing the win/loss XP gap would extend inequality without creating specialisation.

The earlier study tested uniform growth, not custom allocations. Concentrating eight points may cross different thresholds from distributing two to every category. Its results cannot establish that a freely allocated budget is balanced.

| Design question          | Previous approach                 | Revised direction                                        |
| ------------------------ | --------------------------------- | -------------------------------------------------------- |
| Who determines growth?   | Automatic increase everywhere     | Trainer chooses categories                               |
| Same species, same level | Same values given the same base   | Different allocations/builds                             |
| Progression horizon      | Five levels                       | Longer test range; final journey cap undecided           |
| Meaning of XP            | Directly drives uniform stats     | Determines level and earned training budget              |
| Why award XP for losses? | Participation progression         | Keep recovery/progress without granting identical builds |
| Creature exchange        | Base stats and XP follow instance | Allocation and unspent budget follow instance too        |
| Battle power             | Broad level advantage             | Investment amount and placement both matter              |

## Recommended progression contract

### XP, level and training points

- Lifetime XP accumulates on the creature instance and is never spent or transferred to a different creature.
- Level derives from lifetime XP and the active progression rules.
- Each level-up earns training points. Spend them on any of the four categories, within the category cap. One point adds one raw stat point.
- Spending leaves XP and level unchanged. Unspent points stay with that creature and have no combat effect.
- There is no automatic all-stat growth on top of allocation.

This is the recommended interpretation of “spend XP on categories.” Subtracting from the same XP number used to derive level could delevel the creature. A separate spendable-XP wallet works but adds a second XP balance and conversion costs. Whole training points give the trainer a clearer budget; do not implement both models.

### Candidate numbers to model

| Parameter                                       | Initial candidate                            |
| ----------------------------------------------- | -------------------------------------------- |
| Test levels                                     | 1–10                                         |
| Training points per level-up                    | 2                                            |
| Total earned point budget at cap                | 18                                           |
| Maximum allocated to one category               | +8                                           |
| Win / loss / draw XP per participating creature | 15 / 10 / 10                                 |
| Bench XP and overall gym-victory bonus          | 0                                            |
| Battle HP                                       | 2                                            |
| Cumulative XP thresholds                        | 0, 30, 70, 120, 180, 250, 330, 420, 520, 630 |

These are candidates, not measured balance conclusions. Level 2 takes two wins or three losses with that creature. Level 10 takes 42 wins or 63 losses from level 1 if it participates each time. Each creature appears once per gym, so these are gym appearances, not category exchanges. Use development fixtures to compare mature builds without grinding.

Ten levels is a test range, not the final game's lifetime ceiling. Lifetime XP can continue at this test cap but earns no additional points in this rules version; show “training cap reached.” Extending the range is a versioned design decision, not an automatic release of banked points.

More levels alone do not solve convergence. If eventually everyone can max all four categories, specialisation disappears. The final design must preserve a limited allocation budget at its ceiling. Unbounded combat growth cannot coexist with close matches between arbitrary experience levels merely because both players are skilled.

### Concrete equal-budget example

With twelve earned points and a cap of eight per category:

| Ashkit build          | Attack | Defense | Speed | Special |
| --------------------- | -----: | ------: | ----: | ------: |
| Base                  |     85 |      35 |    70 |      50 |
| +8 Attack, +4 Defense |     93 |      39 |    70 |      50 |
| +8 Speed, +4 Defense  |     85 |      39 |    78 |      50 |

Both trained builds total 252. The Speed investment can cross a comparison threshold that the Attack investment cannot, and vice versa. Neither is proven superior by these rows. Repairing a weak category is permitted; it forgoes other investment but does not literally reduce another stat.

### Allocation lifecycle

- Allocate in the journal between encounters, after pending settlement and exchanges finish. Lock editing from team selection onward.
- Show available points, category cap, current values and proposed values. Plus/minus edits a draft; Confirm persists it. Undoing draft choices is free.
- Do not award category-specific growth for using a category in combat; that would encourage farming a build through otherwise poor plays.
- Proposed first-slice rule: confirmed allocations remain with the creature after exchange. No regular retraining UI yet. Preview/confirmation makes investment deliberate, but mistakes may discourage experimentation; assess retraining after playing. Development comparison fixtures must not secretly reset real saved creatures.

## Rewards and ownership sequence

1. Complete all three gym duels using encounter-start snapshots.
2. Award both teams' participants XP once from their own duel outcome. Recompute earned point budgets; do not automatically allocate anything.
3. Persist rewards plus the pending exchange, then present results.
4. Winner selects a literal participant exchange or declines. Draws have no exchange.
5. Persist ownership and clear the pending settlement.
6. Return to the journal, where current owners can train their creatures.

**Training occurs after exchange.** This prevents the loser from altering an incoming creature by spending fresh points just before the winner takes it. XP, existing allocations and unspent points all follow the instance. There is no way to spend the departing creature's budget on another creature.

The winner may trade its weakest participant for the loser's strongest. Bringing a weak trade candidate consumes a battle slot; the winner must still win the encounter. With specialisation, the strongest replacement depends on team coverage, not just the sum of stats. Do not add a copy, XP reset, automatic compensation or ownership protection without a separate decision.

## Information rules included in the approved implementation

Retain hidden category commitments, public spent categories, exact own values, species clues for unplayed opponent categories, and exact values when revealed. Players learning species or opponent habits is expected; specialisation does not guarantee permanent uncertainty.

**Public opponent level in six-creature preview and the active duel, with allocations/XP/unspent points hidden.** Level communicates a possible training budget without revealing its placement or whether it was spent. Species clues describe a species' base tendencies, not the individual's trained values.

**Full participant stats, level and allocation on the post-gym exchange screen.** Ownership stakes deserve a reviewable choice. This discloses unused categories after the encounter and supports learning in rematches.

AI follows the same information rules. It knows its own build. For hidden opponent training, start with a legal estimated allocation consistent with public level, category caps and revealed values. Compare a simple distributed-budget estimate with a small sample of legal builds. Never feed the true hidden allocation to the policy. Keep this adapter separate from the exact-information diagnostic solver.

Own AI training can use a small set of legal species-oriented build priorities chosen independently of the player's hidden build. The existing first-participant exchange heuristic is weak for developed creatures; compare it with a heuristic using only the information disclosed after the gym. Total stats is a baseline heuristic, not an optimality claim.

## Ordered modelling and implementation

### 1. Model placement before quantity

At the same investment budget, compare even allocation, Attack-focus, Speed-focus, weakness repair and two-category focus. Start with eight points and per-category caps of four/eight, then twelve/six and the proposed eighteen/eight. Reject illegal profiles instead of silently clipping them.

Test all six species, mirrors, mixed matchups, equal investment, unequal investment and unspent points. Specialised builds must face other specialised builds as well as untrained fixtures. Report mirrors and level gaps separately.

Enumerate legal allocations at shortlisted budgets where tractable. Use real engine transitions to identify impossible wins and forced strategies, and look for builds that dominate alternatives across tested opponents. Being best on average against one policy is not global dominance or equilibrium balance. Compare actual-information greedy/tactical policies as well as exact-information diagnostics.

Repeat the exchange experiment with training and swaps independently on/off. Use comparable seeds and report both composition and remaining winning opportunities after losses. The prior 4,800 gyms used uniform growth and cannot validate this model. Select the point budget/cap only after these comparisons. If no candidate produces distinct useful builds with consequential category choices, revise the budget or duel rules before creating more progression UI.

### 2. Revise the pure progression module

Store base snapshot + lifetime XP + allocation by category. Derive level, earned budget, unspent budget and battle stats. Avoid independently storing derived values. Include a rules version for cap/threshold changes.

Retain validation/copying, outcome-based XP awards and scoring-safe integer checks. Replace automatic all-category growth and five-level constants. Add pure allocation validation and transition: integer/nonnegative amounts, legal category, cap and total budget. Owner authorization/encounter locking belong to orchestration; growth arithmetic stays independent of React, storage and clocks.

### 3. Migrate trainer saves and persist settlement

Current v1 saved snapshots become base stats at XP=0/allocation=0, preserving identity, individual values and ownership instead of reseeding from species defaults. Save both trainers and their creature progress in one validated record. Keep old data recoverable until migration succeeds. Preserve unsupported/corrupt data rather than replacing it.

Use progression rules version plus expected encounter identity and settlement status. Persist rewards and pending exchange before presenting actions. Reload must restore pending exchange and must not award XP twice. Draw settles rewards without exchange. Ownership transfer and clearing pending exchange use one record write. Failed writes remain retryable without presenting unsaved state as confirmed.

Battle stats are locked when entering the encounter. Reject training during the encounter and before pending exchange resolves. Pending-settlement durability does not prevent all force-close avoidance during a gym; active-encounter persistence remains a separate local-prototype limitation.

### 4. Add small training and reward components

Use NativeWind components for creature progress, four category allocation rows, available points, and draft confirmation. Hooks own draft interaction; controllers/repositories own settlement/persistence; pure engine functions own arithmetic.

After the gym: reward summary → exchange → journal training. Show which instance is being trained so duplicate species cannot target the wrong individual. Confirmed training must save before journal/encounter state updates. Reuse current navigation/screen patterns; this does not require Zustand or a new navigation framework.

### 5. Verify the complete loop

Tests cover caps/budgets, thresholds, unspent points, independence of same-species instances, noncompounding growth, migration, pending exchange recovery, both ownership directions, stale/duplicate reward and allocation requests, failed save/retry, draw/decline, and editing during a locked encounter. Avoid tests that merely restate visual markup.

On device: build two instances differently; use them in duels; exchange a trained instance with unspent points; lose a developed participant; restart around rewards, exchanges and allocation confirmation. Verify the same identity/build returns and category decisions still matter. Human gate: meaningful build choices, understandable results, and willingness to play again after a consequential loss.

## Scope and outstanding choices

Agreed: trainer-directed category specialisation, individual creature XP, six active creatures, private selected three/deployment, optional literal participant exchange by the winner.

Implemented provisionally: training-point representation, ten-level test range, two points per level, +8 per-category cap, allocation permanence, public opponent level and full post-gym build disclosure. Numerical balance, retraining and the final journey cap remain open. The model found some unwinnable build matchups, so these numbers must not be described as validated for ranked play.

Keep leaderboard implementation, matching, capture, inactive inventory, evolution, a backend and global state-library changes outside this slice. Exchanges affect subsequent matches and may thereby affect rating; they do not directly deduct rank. Ranked design must reconcile skill rating, roster power gaps and permanent ownership stakes. A reward that makes the loser stop playing is a product failure even if the winner enjoys it.
