# Golden Whale Guild — Save System

This document is the source of truth for how the game persists, migrates,
backs up, and recovers player data. It exists because a save can be corrupted
by a partial write, an interrupted migration, a bad import — or by a careless
test that clears the wrong key. The rules below make all of those recoverable.

## Current save version

`SAVE_VERSION = 10` — defined once in [`src/systems/saveMigrations.js`](../src/systems/saveMigrations.js)
and re-exported through [`src/systems/saveManager.js`](../src/systems/saveManager.js).
`TownScene` imports it; there is no second copy.

## Storage keys

All keys live in `saveManager.js`. Nothing else should hard-code a storage key.

| Constant | Key | Purpose |
| --- | --- | --- |
| `PROD_SAVE_KEY` | `golden-whale-guild-save-v2` | The one save real players use. **Automated tests must never touch it.** |
| `TEST_SAVE_KEY` | `golden-whale-guild-test-save-v2` | Isolated key for automated/dev testing. |
| `UI_PREFS_KEY` | `gwg-hero-roster-ui-v1` | Hero-roster UI preferences (owned by `UIScene`). |
| `BACKUP_RING_KEY` | `golden-whale-guild-backups-v1` | Rotating backup ring (one key, newest-first array, max 3). |
| `BROKEN_SAVE_KEY` | `golden-whale-guild-broken-save-v1` | Where a save that failed to load is parked. Never auto-deleted. |
| `TEMP_SAVE_KEY` | `golden-whale-guild-save-tmp` | Scratch key used during an atomic write; always cleaned up. |
| `LEGACY_SAVE_KEYS` | `golden-whale-guild-save`, `…-v1` | Read-only fallbacks migrated on first load. |

The active key is resolved per session by `getActiveSaveKey()`:
production by default, `TEST_SAVE_KEY` when `isTestSaveMode()` is true.

## Load / migration sequence

`TownScene.loadSavedState()` → `saveManager.loadActiveSave(key)`:

1. Read the raw string from the active key (falling back to a legacy key once).
2. `JSON.parse` inside a guard — a parse failure returns `ok:false`.
3. `migrateAndValidate(parsed)`:
   - Reject anything that is not a plain object (→ recovery).
   - `sanitizeContainers`: repair container *types* without discarding unknown
     fields (object fields → `{}`, nullable object fields with a wrong type →
     `null`, array fields → `[]`). Unknown/future fields are preserved.
   - Run any registered version migrations sequentially (`MIGRATIONS` map).
   - Stamp `saveVersion` forward (never downgrade a newer save).
4. `TownScene` then applies its existing field-level normalizers.

If any step throws or returns `ok:false`, the raw bytes are stashed to
`BROKEN_SAVE_KEY`, a fresh town boots (never a black screen), and the Save
Recovery panel is shown.

### Migrations are

- **Deterministic** — same input, same output.
- **Null-safe** — a default parameter only covers `undefined`; migrations and
  normalizers must also handle explicit `null` (this was the black-screen bug:
  `tradeSettings: null` reaching `normalize(raw = {})`).
- **Additive** — fill defaults, never drop unknown fields.
- **Independently testable** — see `scripts/test-save-system.mjs`.

## Atomic writes

`writeSaveAtomic(key, payload)` never overwrites a valid save with a bad one:

1. `JSON.stringify` the payload (reject unserializable data).
2. Validate the serialized bytes re-load cleanly.
3. Write to `TEMP_SAVE_KEY`, read it back, verify byte-identical.
4. Promote the temp bytes to the real key.
5. Remove the temp key.

If any step fails, the previous save stays intact and `saveGame` reports it.

## Backup ring

A single key holds a newest-first array capped at `BACKUP_RING_SIZE = 3`.
Each entry stores the raw payload plus metadata (timestamp, save version, day,
building count, hero count, town rank, reason). Backups are created:

- before an **import** (`pre-import`),
- before a **reset** (`pre-reset`),
- before a **restore** (`pre-restore`),
- once per in-game **day** (`daily`, throttled — one per day number),
- on demand from the Save Manager (`manual`).

A new backup identical to the newest entry is skipped, so a repeated (or
repeatedly corrupt) payload cannot evict good history.

## Export / import format

Export produces `golden-whale-guild-save-YYYY-MM-DD.json`:

```json
{
  "format": "golden-whale-guild-save",
  "exportedAt": "<ISO timestamp>",
  "saveVersion": 10,
  "town": { "rank": "...", "day": 5, "buildings": 30, "heroes": 26 },
  "save": { /* full getSavePayload(): buildings, heroes, resources, map/fog,
              quests, policies, economy/production, etc. */ },
  "preferences": { /* UI prefs, optional */ }
}
```

Import accepts either this bundle or a bare save object. It parses safely,
migrates/validates, shows a summary for confirmation, backs up the current save,
then writes atomically and reloads. Invalid JSON is rejected without touching
the current save.

## Recovery

Two layers:

1. **Load-time** — if `loadActiveSave` fails, the Save Recovery panel offers
   Retry, Restore Latest Backup, Export Broken Save, Start New Game.
2. **Construction-time** — `create()` runs inside a try/catch. If scene
   construction throws while consuming a save, `handleCreateFailure` stashes the
   save and renders a **self-contained DOM** recovery panel (no dependency on
   the half-built Phaser scene). Starting a new game moves the broken save aside
   first; it is never destroyed.

## Reset

Reset is no longer destructive-by-default. The confirm panel offers Export First
and Create Backup. `safeReset` snapshots the current town into the backup ring,
then removes **only the active key** — never `localStorage.clear()`.

## Testing rules

- **Automated tests MUST NOT read, write, or remove `PROD_SAVE_KEY`.** Use
  `TEST_SAVE_KEY` via `?testSave=1` or by setting `globalThis.__GWG_USE_TEST_SAVE__`.
- Never call `localStorage.clear()` and never `removeItem` the production key in
  a test.
- Never use the player's real save as a disposable fixture. Build fixtures (see
  `scripts/test-save-system.mjs`).
- The headless suite asserts the production key is byte-for-byte unchanged after
  all test-key operations. Run it with `npm run test:save`.

> History note: during an earlier verification pass the real save was cleared
> because a test removed the production key before a durable backup existed.
> The rules above — test-key isolation, the backup ring, and the byte-for-byte
> assertion — exist specifically to prevent a repeat.
