# Species clues and tactical opponent experiment

The playable default is **Species clues + Tactical AI** in standalone Duel and Gym 3v3. Exact and Ranges remain pre-battle comparison controls. Standalone also retains Greedy and Random. Gym uses Tactical for every visibility condition; deployment remains secret and random from the locked team. No category, type, HP, ownership or ending rule changes.

## Information

Your own stats remain exact. Opponent category names, spent markers, species and type remain visible. In Species clues, each unplayed opponent category displays Usually low/moderate/high from a shared species catalogue, not the actual instance's values. Once its exchange is presented, that category's raw and effective values become exact; the automatic fourth is revealed separately. Unplayed numbers stay hidden even when the duel ends. The post-gym exchange screen still shows participant stats for ownership decisions.

The current six profiles are authored against the fixture roster (low below 50, moderate 50–69, high 70 and up) and checked for consistency. They describe species tendencies, not guaranteed individual ranges. The catalogue is independent of runtime instance stats. Unknown species show Unknown profile. No XP or stat variation was added: familiar fixtures, mirror matches, historical reveals and acquiring a creature can still teach a player exact numbers. This experiment must be tested after that learning, not only on first exposure.

## Opponent

Tactical AI receives its own exact snapshot and an explicitly reconstructed opponent estimate. In Species clues mode it uses coarse priors 40/60/80 for low/moderate/high (60 for unknown), plus exact already-revealed history. The projection does not read hidden instance stats or effective values. Exact mode uses public exact values; Ranges uses the displayed band's midpoint adjusted back to a raw estimate. No current commitment enters the policy. It locks before human controls open.

The engine evaluates remaining duel branches using the existing `advanceDuel`, including ties, HP and automatic-fourth endings. It assumes uniformly distributed opponent legal actions and optimizes estimated eventual win/draw/loss, rather than immediate score. It samples equally good choices, with 10% exploration across legal categories. It can therefore preserve a strong category or sacrifice a weak one. This is not an equilibrium solver, adaptive human model or guarantee of strong play. It does not learn across encounters. It also does not treat species estimates as actual hidden values during real resolution: the real duel still resolves against original snapshots.

Code boundaries: species catalogue in battle-fixtures; pure tactical policy in battle-engine; observation projection and NativeWind display in mobile. The application boundary prevents accidental leakage; it is not multiplayer security.

## Play protocol

1. Use Voltik vs Emberhorn repeatedly with Species clues + Tactical. Before selecting, name two plausible actions and why you prefer one. Note when the rest of a duel becomes certain.
2. Switch only visibility to Exact while keeping Tactical and the same creatures. Then compare against Greedy while keeping visibility fixed. One duel or a different random sequence cannot establish which mode is better.
3. Repeat after learning the fixtures. Track decisions that changed, not just wins. Distinguish uncertainty about numbers from uncertainty about opponent actions.
4. Try gym team/deployment choices with the same information mode. Do not add alternating counterpicks yet.

If the game becomes mechanical after learning the six creatures, hiding UI numbers has not solved the problem. The original Fernlet vs Slate forced outcome was addressed by the later [Slate fixture change](slate-balance.md). See the [combat checkpoint](combat-checkpoint.md) for controlled follow-up results and the remaining limitations. No claim that hiding information establishes fun or fixes forced losses.
