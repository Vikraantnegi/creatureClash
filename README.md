# Creature Clash

pnpm workspace for an Expo React Native app and a shared, pure TypeScript battle engine.

## Requirements

- Node.js 22.13 or newer within Node 22; `.nvmrc` pins 22.23.2. Run `nvm use` in this directory — shells often default to Node 20.
- pnpm 10.29.3, pinned in the root `packageManager` field.
- **Android (verified):** Android Studio + SDK at `~/Library/Android/sdk`, with `ANDROID_HOME` set. React Native 0.86 / Expo 57 need:
  - platforms;android-36
  - build-tools;36.0.0
  - ndk;27.1.12297006  
    Install via `sdkmanager` (Homebrew cask `android-commandlinetools` works). Use Android Studio’s JBR for `JAVA_HOME` if needed.
- **iOS (not yet verified on this machine):** full [Xcode.app](https://docs.expo.dev/get-started/set-up-your-environment/) and CocoaPods. Command Line Tools alone are not enough.

Expo SDK 57 requires Node 22.13+. If needed, install the pinned pnpm with `npm install --global pnpm@10.29.3` after selecting Node 22.

## Start

```sh
nvm use
pnpm install --frozen-lockfile
pnpm native:prebuild   # generates apps/mobile/ios and android (gitignored; CNG)
pnpm android           # local development build (verified). iOS: pnpm ios when Xcode is ready
```

`pnpm android` / `pnpm ios` compile a local **development build** (includes `expo-dev-client`), install it on the emulator/simulator or device, and start Metro. After the first native compile, day-to-day JS/TS work is:

```sh
pnpm dev
```

That builds the engine watcher and starts Expo in `--dev-client` mode against the installed development build.

Optional Expo Go smoke (compatible JS-only check; not the working app):

```sh
pnpm --filter @creature-clash/mobile start:go
```

The app opens a single-player duel prototype. Choose your creature, opponent, and greedy/random AI, then start. Each selection has ten seconds; the AI commits independently before your controls open. Both choices reveal after a short commitment beat. Press **Continue** to read the next exchange or result. The conditional fourth exchange has its own reveal. Rematch starts a fresh duel with the same setup.

Backgrounding pauses the remaining selection time. Fixture/mode controls are available before a duel and after its result. Ashkit/Brookfin reproduce the regression matchup; Slate/Slate provides an all-ties draw fixture. There is no progression or persistence yet.

When native dependencies change, rebuild the development client before testing (`pnpm android` or `pnpm ios`); a running Metro server cannot add a missing native module to an old APK. Skia is an existing dependency whose binary-copy postinstall is allowed in `pnpm.onlyBuiltDependencies` so native builds can link it.

Native projects are regenerated from Expo config (`app.json` + config plugins). Prefer changing native behaviour through Expo configuration/plugins, then re-run `pnpm native:prebuild` (or `expo run:*`, which prebuilds when dirs are missing). Do not hand-maintain `ios/` / `android/` as the source of truth.

## Structure

**Current:**

```text
apps/mobile/                 Expo SDK 57 + TypeScript + expo-dev-client + NativeWind
packages/battle-engine/      Framework-independent TypeScript, compiled to dist/
```

**Deferred (later passes — do not scaffold yet):**

```text
packages/game-data/          Creatures, type chart, scalar rule settings, fixtures
apps/simulator/              Match schedules, seeds, policy comparisons, traces
docs/battle-contract.md      Approved Phase 0 contract snapshot
```

The engine has no runtime dependencies, React imports, native APIs, or app imports. Its public entry point is `src/index.ts`. It implements validation, scoring, duel resolution, public views, clock-free sessions, and greedy/random policies. Mobile imports only the package public exports (`dist/`), never engine source. The engine never imports Expo or React Native.

Expo uses its standard Metro monorepo support. No custom resolver, hoisting workaround, or Turborepo. Add Turborepo only when build orchestration becomes useful. EAS cloud builds are optional and not configured yet.

## Package boundaries

- **battle-engine** owns legal selection, commitment/resolution, type-adjusted comparison, HP and early termination, conditional fourth exchange, draws, and policies limited to public information. The future paired-gym coordinator remains deferred; relay is not a drop-in and requires decisions about carried HP and exhausted categories.
- **game-data** (future) owns stable creature ids/attributes and the type chart. Four categories, two HP, three normal exchanges, and a conditional fourth are currently fixed engine rules, not arbitrary configuration.
- **mobile** owns screens, input, timers, presentation, and app lifecycle. `src/battle/controller.ts` owns the current session and a separate display snapshot: queued events are revealed one at a time without exposing the engine's final HP/history early. Components receive views and callbacks, not pending AI choices. `useBattle.ts` connects the controller to React and AppState. No winner, effective-score, or damage calculation lives in the app.
- **simulator** (future) owns schedules, seeds, policy comparisons, and traces. Same rule: no local winner/damage math — one resolution source for sim and phone.
- Engine receives roster/data as input. It must not import a particular roster or contain creature-name conditionals.

Battle implementation should follow the [authoritative Phase 0 contract](https://hurrrphurr.atlassian.net/wiki/spaces/POKCL75/pages/75563009/PC+Battle+Contract+Phase+0+AUTHORITATIVE). The earlier Python simulator is research material, not a second implementation to maintain alongside this engine.

## Checks

```sh
pnpm format         # Prettier write
pnpm format:check   # Prettier check
pnpm lint           # ESLint (Expo flat config + Prettier)
pnpm lint:fix      # ESLint with --fix
pnpm test           # engine + mobile controller Vitest suites (builds engine first)
pnpm check          # format:check + lint + typecheck + Expo dependency check
pnpm bundle:check   # Export iOS and Android JavaScript bundles through Metro
pnpm native:prebuild  # Regenerate native projects from app config (needs CocoaPods for iOS pods)
```

Husky runs `lint-staged` on pre-commit (ESLint --fix + Prettier on staged files). `pnpm install` runs `prepare` → `husky`.

The bundle check verifies package resolution and production bundling. Compiling and installing a development build requires local Xcode / Android Studio (`pnpm ios` / `pnpm android`). Output and generated native folders are ignored by Git.

## Later

`game-data`, simulator, lookahead, paired gyms, progression, signing, and EAS stay for subsequent work.

## Prototype checks on a device

- Ashkit vs Brookfin, greedy: Attack then Speed loses; Special then Attack then Speed wins. Read each reveal before Continue.
- Ashkit vs Ashkit, greedy: Attack, Defense, Speed reaches a tied third exchange and a decisive automatic fourth. The third reveal must not display the fourth's HP or final result.
- Slate vs Slate: three tied choices, a separately revealed automatic fourth, then a draw.
- Let a selection expire: first unused category is committed, with a timeout explanation. Waiting at a reveal must not consume the next exchange's clock.
- Background halfway through selection, wait, and return: remaining time resumes. Rematch clears history and starts a fresh clock; fast taps cannot submit twice.
- Switch sides/fixtures and try random AI between duels. Physical-phone play is still needed to judge readability, pacing, and whether you want another duel.

The mobile starter includes the Expo template's original license in `apps/mobile/LICENSE`.
