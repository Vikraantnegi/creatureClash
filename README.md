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

The initial screen displays categories imported from the engine. This proves workspace integration; it is not a playable battle yet.

Native projects are regenerated from Expo config (`app.json` + config plugins). Prefer changing native behaviour through Expo configuration/plugins, then re-run `pnpm native:prebuild` (or `expo run:*`, which prebuilds when dirs are missing). Do not hand-maintain `ios/` / `android/` as the source of truth.

## Structure

**Current:**

```text
apps/mobile/                 Expo SDK 57 + TypeScript + expo-dev-client
packages/battle-engine/      Framework-independent TypeScript, compiled to dist/
```

**Deferred (later passes — do not scaffold yet):**

```text
packages/game-data/          Creatures, type chart, scalar rule settings, fixtures
apps/simulator/              Match schedules, seeds, policy comparisons, traces
docs/battle-contract.md      Approved Phase 0 contract snapshot
```

The engine has no runtime dependencies, React imports, native APIs, or app imports. Its public entry point is `src/index.ts`. Phase 1 covers snapshot/type-chart validation and fixed-point scoring (Vitest colocated in the package). Duel resolution comes next. Mobile never depends on engine source (`dist/` only); the engine never imports Expo or React Native.

Expo uses its standard Metro monorepo support. No custom resolver, hoisting workaround, or Turborepo. Add Turborepo only when build orchestration becomes useful. EAS cloud builds are optional and not configured yet.

## Package boundaries

- **battle-engine** owns legal selection, commitment/resolution, type-adjusted comparison, HP and early termination, conditional fourth exchange, draws, opponent policies (information-limited), and a separate **`pairedGymCoordinator`** (named for the Phase 0 paired format — not a settled “the gym”). The duel resolver stays format-agnostic so a relay coordinator can sit beside it later without engine changes.
- **game-data** (future) owns stable creature ids/attributes, the type chart, six fixtures, and **scalar** rule settings only (HP count, exchange cap, timer seconds, ±% multipliers, stats). Structural rules (tie → fourth exchange, category consumption, simultaneous reveal) stay in the engine as an explicit config type boundary — scalars in, structure never.
- **mobile** owns screens, input, presentation, and app lifecycle. It calls the engine and displays results. It does not compute winners or damage.
- **simulator** (future) owns schedules, seeds, policy comparisons, and traces. Same rule: no local winner/damage math — one resolution source for sim and phone.
- Engine receives roster/data as input. It must not import a particular roster or contain creature-name conditionals.

Battle implementation should follow the [authoritative Phase 0 contract](https://hurrrphurr.atlassian.net/wiki/spaces/POKCL75/pages/75563009/PC+Battle+Contract+Phase+0+AUTHORITATIVE). The earlier Python simulator is research material, not a second implementation to maintain alongside this engine.

## Checks

```sh
pnpm test           # battle-engine Vitest suite
pnpm check          # Engine build, both TypeScript checks, Expo dependency check
pnpm bundle:check   # Export iOS and Android JavaScript bundles through Metro
pnpm native:prebuild  # Regenerate native projects from app config (needs CocoaPods for iOS pods)
```

The bundle check verifies package resolution and production bundling. Compiling and installing a development build requires local Xcode / Android Studio (`pnpm ios` / `pnpm android`). Output and generated native folders are ignored by Git.

## Later

`game-data`, simulator, duel resolution (`advanceDuel` / `timeoutPick`), progression, signing, and EAS stay for subsequent work.

The mobile starter includes the Expo template's original license in `apps/mobile/LICENSE`.
