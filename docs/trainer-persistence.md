# Local trainer ownership

> Historical v1 checkpoint. Phase 7 migrates this record to v2 and adds XP, training allocations, revision checks and durable pending settlement. See [the current implementation](phase-7-verification.md). The original ownership and save-failure principles below still apply; the v1 schema and excluded-progression scope are superseded.

The app loads a versioned AsyncStorage record before mounting gameplay. A missing record seeds both trainers once from the current fixtures. Read failures, malformed data, unsupported versions, invalid stats and duplicate instance IDs show a retry screen without overwriting the saved data.

The single record at `creature-clash:trainer` contains schema version 1, the source fixture version, and both six-creature rosters. Every instance keeps its ID, species, type and individual stats across exchanges and app restarts. Saved snapshots are not regenerated when fixture definitions change. Schema migrations must be explicit; changing the fixture version does not reset an existing trainer.

The gym controller applies the existing engine exchange to a candidate state, writes both rosters in one storage operation, and only then publishes the finished state. Controls are disabled while saving. On failure, both creatures retain their previous owners in memory and the player can retry the same exchange. Repeated/stale submissions cannot apply it twice. Player wins, declines and opponent-winner exchanges use the same path.

Boundaries:

- `src/trainer/validate.ts`: validate persisted data, using the engine snapshot validator; enforce six creatures per trainer and globally unique instance IDs.
- `src/trainer/repository.ts`: load/seed/write through an injected storage interface.
- `src/trainer/storage.ts`: AsyncStorage adapter.
- `src/trainer/useTrainerSave.ts`: loading/retry lifecycle.
- `src/gym/controller.ts`: serialize exchange completion around the save operation.
- UI components show loading, saving and actionable errors. They do not own persistence rules or battle arithmetic.

There are currently exactly six owned creatures per trainer and no acquisition mechanism that grows the collection, so an inactive-creature inventory is not introduced yet. Instance IDs use their original seed labels and do not change when the owner changes.

## Scope and recovery

This saves ownership, not active encounters, timers, selected teams, visibility preferences, XP or battle history. Closing before an exchange has successfully saved restarts from the last saved rosters; this local prototype can therefore be used to abandon a losing encounter. Durable encounter settlement/server authority is still needed before competitive stakes. A successful completed exchange survives restart. Standalone duel remains an isolated fixture sandbox.

Saves are local and unencrypted, not an account or cloud backup. Clearing app data/uninstalling can remove them. Corrupt saves are preserved for investigation; there is no automatic destructive reset button. AsyncStorage writes both owners under one key, avoiding a half-exchange across separate keys. This is not a multi-device transaction or multiplayer ownership system.

## Verification

Automated tests exercise first-load seeding, round-trip snapshots, preservation across fixture-version changes, corrupt/future saves, duplicate ownership, failed reads/writes, duplicate submissions while saving, retry, and complete gym → exchange → repository reload → new gym using the acquired instance with fresh HP/categories. Both player and AI victory directions are covered. Existing tests cover decline and draw rules.

AsyncStorage adds a native dependency. Rebuild the development client once with `pnpm android` (or `pnpm ios` with Xcode available); Metro reload alone cannot install it.
