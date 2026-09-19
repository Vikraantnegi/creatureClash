# Claude Design native implementation

Source: project `27fc8e1e-7425-45e7-99aa-b59a85cc25c5`, supplied as the local **Mobile app design kickoff** export. Retained the four HTML documents, both creature generators, demo engine and support runtime in `design/claude-source`. Reference screenshots, the uploaded image and `.thumbnail` were removed from the repository after verifying identical originals in `/Users/vikraaantnegi/Downloads/Mobile app design kickoff/`. No MCP authentication was needed for the local export.

## Source decisions

- **Creature Clash Prototype** defines the home → choose → review → duel → result flow and gym → private team → secret deployment → duel ×3 → ownership exchange.
- **Duel Interaction** refines selection into a draft followed by explicit Lock in, introduces side-by-side revealed category cards and a learned-information explanation.
- **Creature Development v2 / creatures-v2.js** is the current artwork. The earlier Creature Direction / creatures.js remain references until visual verification is complete, not competing runtime art. Screenshot iterations remain in the original Downloads export.
- `clash-engine.js` is reference only: it uses 1–10 numbers, additive ±2 type effects, individual variation and a scripted policy. None replace our tested engine, fixtures or tactical policy.
- `support.js` is the exported browser canvas runtime. It is not shipped in the mobile runtime; screens are native React Native components rather than WebViews.

## Native changes

Warm paper, ink, rust, ground and card tokens in NativeWind. Reusable creature tiles, disclosure sections, arena badges, hidden deployment slots and vector artwork. Home uses current active roster, not invented day/progression data. Own stats stay exact; opponent values use the selected visibility experiment. Debug controls are secondary disclosures.

`tools/design/export-creatures.mjs` compiles the supplied v2 vector generator in an isolated build-time VM to `art.json`. All six species have neutral, confident and defeated poses. Existing Skia renders vectors without another native dependency. Inline style is limited to the canvas dimensions/transform and animated opacity where required by those APIs. The original export is excluded from lint/format so its source remains intact.

Selection remains editable until Lock in; only then is the controller called. At deadline, the existing first-unused timeout rule applies even if the player has a different uncommitted draft. Draft resets for each exchange. Re-entry after backgrounding preserves the existing timer behavior. Reveal fades for 240ms and respects reduced-motion preferences. There is no artificial attack animation or extra damage stage: exact values and HP come from one engine event. Automatic fourth remains a distinct reveal.

All three gym duels still play; creature eligibility, both commitment boundaries and literal ownership exchange remain engine-owned. The confirmation button names the outgoing and incoming participant. The losing player acknowledges the existing disclosed AI exchange policy. No XP, trainer progression, save persistence or new battle rules were added.

## Deliberate adaptations

The handoff’s fake phone frame/status bar are omitted on a real device. The native app uses safe areas and scrolling where larger fonts or content require it. No invented named-trainer sequence or Day 12 progress. The engine pauses commitment presentation as well as selection while backgrounded, preserving current behavior rather than adopting the export’s contradictory pause description. Navigation back to home is offered between duels/encounters where state permits; no new forfeit rule.

## Verification

Passed: 117 tests (79 engine, 35 mobile, 3 study), root typecheck, lint, formatting, and Android/iOS bundle exports. The final responsive arena adjustment also passes mobile typecheck.

Pending: on-emulator verification of source-art rendering, home/selection/review, draft versus lock, reveal/history, gym hidden slots and ownership confirmation. The emulator is connected, but Metro is offline; starting Metro from this execution environment fails with `EMFILE: too many open files, watch`. Run `nvm use && pnpm dev` from the repository in a normal terminal to resume device verification. Physical-phone accessibility and feel still require human testing.

## Typography

NativeWind `font-sans` maps to Helvetica on iOS, Android's `sans-serif`, and Helvetica/Arial on web. `font-mono` maps to Menlo on iOS, Android's `monospace`, and a browser monospace stack. Native Text elements explicitly select a family; body text, creature names and actions use sans, while compact metadata, scores and the countdown use mono. Existing weights and accessibility text scaling remain enabled. These are platform font mappings, not a bundled cross-platform Helvetica font; Android will differ slightly from the browser reference. No font download or native rebuild is required.
