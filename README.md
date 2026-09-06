# Creature Clash

pnpm workspace for an Expo React Native app and a shared, pure TypeScript battle engine.

## Requirements

- Node.js 22.13 or newer within Node 22; `.nvmrc` pins 22.23.2.
- pnpm 10.29.3, pinned in the root `packageManager` field.

Expo SDK 57 requires Node 22.13+. With nvm, run `nvm install` and `nvm use` in this directory. If needed, install the pinned pnpm with `npm install --global pnpm@10.29.3` after selecting Node 22.

## Start

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Run commands from the repository root. `pnpm dev` builds the engine first, then starts its TypeScript watcher and Expo together. The app imports the engine by package name via `workspace:*`. Engine changes rebuild automatically while developing.

The initial screen displays the categories imported from the engine. This proves workspace integration; it is not a playable battle yet. Expo Go is optional for that smoke test. Local Expo development builds are the next pass.

## Structure

**Current (this foundation pass):**

```text
apps/mobile/                 Expo SDK 57 + React Native + TypeScript
packages/battle-engine/      Framework-independent TypeScript, compiled to dist/
```

**Deferred (later passes — do not scaffold yet):**

```text
packages/game-data/          Creatures, type chart, scalar rule settings, fixtures
apps/simulator/              Match schedules, seeds, policy comparisons, traces
docs/battle-contract.md      Approved Phase 0 contract snapshot
```

The engine has no runtime dependencies, React imports, native APIs, or app imports. Its public entry point is `src/index.ts`. Only the category vocabulary is implemented in this setup pass. Mobile never depends on engine source (`dist/` only); the engine never imports Expo or React Native.

Expo uses its standard Metro monorepo support. No custom resolver, hoisting workaround, or Turborepo. Add Turborepo only when build orchestration becomes useful.

## Package boundaries

- **battle-engine** owns legal selection, commitment/resolution, type-adjusted comparison, HP and early termination, conditional fourth exchange, draws, opponent policies (information-limited), and a separate **`pairedGymCoordinator`** (named for the Phase 0 paired format — not a settled “the gym”). The duel resolver stays format-agnostic so a relay coordinator can sit beside it later without engine changes.
- **game-data** (future) owns stable creature ids/attributes, the type chart, six fixtures, and **scalar** rule settings only (HP count, exchange cap, timer seconds, ±% multipliers, stats). Structural rules (tie → fourth exchange, category consumption, simultaneous reveal) stay in the engine as an explicit config type boundary — scalars in, structure never.
- **mobile** owns screens, input, presentation, and app lifecycle. It calls the engine and displays results. It does not compute winners or damage.
- **simulator** (future) owns schedules, seeds, policy comparisons, and traces. Same rule: no local winner/damage math — one resolution source for sim and phone.
- Engine receives roster/data as input. It must not import a particular roster or contain creature-name conditionals.

Battle implementation should follow the [authoritative Phase 0 contract](https://hurrrphurr.atlassian.net/wiki/spaces/POKCL75/pages/75563009/PC+Battle+Contract+Phase+0+AUTHORITATIVE). The earlier Python simulator is research material, not a second implementation to maintain alongside this engine.

## Checks

```sh
pnpm check          # Engine build, both TypeScript checks, Expo dependency check
pnpm bundle:check   # Export iOS and Android JavaScript bundles through Metro
```

The bundle check verifies package resolution and production bundling. It does not compile native projects or prove the app runs on a physical device. Output folders are ignored by Git.

## Next pass

Set up and run a local Expo development build (`expo-dev-client`), using Expo configuration and config plugins for native changes where practical. Expo Go remains optional for a compatible initial smoke test. Native projects, signing, EAS, `game-data`, simulator, Vitest, duel resolution, and progression stay for subsequent work.

The mobile starter includes the Expo template's original license in `apps/mobile/LICENSE`.
