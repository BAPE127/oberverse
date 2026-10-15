# Save Format

## Storage

- Browser `localStorage` keys: `oberverse.save.auto`, `oberverse.save.slot1..3`, each with a `…​.bak` holding the previous write. Settings live in `oberverse.settings`.
- Saves can be exported to / imported from `.json` files from the Load/Save panel.
- If `localStorage` is unavailable (private mode, blocked storage), saving falls back to an in-memory store for the session and the UI still works; export your save to keep it.

## Envelope (schema 1)

```json
{
  "format": "oberverse-save",
  "saveVersion": 1,
  "gameVersion": "0.1.0",
  "savedAt": "2026-10-13T10:00:00.000Z",
  "meta": { "playerName": "Wren", "day": 1, "weekday": "Moonday", "time": "08:00", "location": "Canal Row" },
  "state": {
    "clock": { "total": 480, "rate": 1 },
    "rng": { "state": 123456 },
    "player": {
      "id": "player", "name": "Wren", "appearance": { "...": "..." },
      "map": "player_flat", "x": 144, "y": 208, "facing": "up",
      "health": 100, "energy": 85, "money": 12,
      "inventory": { "item_flat_key": 1 },
      "stolen": { "item_lighthouse_key": "npc_osric" },
      "knowledge": { "fact_lighthouse_dark": { "kind": "fact", "source": "read", "at": 490, "confidence": 1 } },
      "reputation": { "lanternside": 0, "fac_civic": 0, "fac_merchants": 0, "fac_quay": 0 },
      "stats": { "charm": 2, "wits": 2, "grit": 2, "finesse": 2 },
      "discovered": { "maps": { "player_flat": true }, "areas": { "area_brindle": true } },
      "equipped": "item_pistol", "mags": { "item_pistol": 11 }
    },
    "npcs": {
      "npc_osric": {
        "map": "civic_office", "x": 272, "y": 80, "facing": "down", "activity": "work",
        "mood": { "id": "content", "until": 900 }, "met": true,
        "relationships": { "player": { "trust": 10, "affection": 8, "respect": 0, "suspicion": 0 } },
        "knowledge": {}, "memory": { "recent": [], "significant": [] },
        "topicsUsed": {}, "recentLines": [], "gifts": { "day": 1, "count": 1 },
        "chatCooldownUntil": 0, "hooksRun": {}, "impulseCooldowns": {}, "intent": null,
        "health": 74, "dead": true, "diedAt": 1530, "downUntil": 1700
      }
    },
    "world": {
      "containers": { "ct_civic_desk": { "items": { "item_lighthouse_key": 1 }, "money": 0 } },
      "shops": { "shop_kettle": { "stock": { "item_honey_bun": 5 } } },
      "props": { "lighthouse_hatch": { "open": true } },
      "flags": { "lighthouse_permission": true },
      "publicFacts": {},
      "events": { "lastFired": {}, "pending": [], "log": [] },
      "lastHour": 8
    },
    "quests": { "q_dark_lamp": { "state": "active", "stage": "find_way_in", "notes": [] } }
  }
}
```

Combat fields (v0.6.0, optional): `player.equipped` (weapon item id, absent = fists), `player.mags` (rounds loaded per gun); per NPC `health` (absent = full), `dead`/`diedAt`, `downUntil` (game minute an unconscious NPC wakes). In-fight state (`hostile`, cooldowns, effects) is not saved: loading ends any fight.

Business state (all optional, created on first use, so older saves simply lack them): `world.market`, `world.arms`, `world.factory`, `world.vehicles`, `world.transit`, `world.tablet`, and since **v0.21.0 `world.logistics`** — Ober & Sons Maritime: ownership, ports, vessels (with their voyages and pre-rolled voyage events), contracts, upkeep arrears, the ledger, reports and which ports the Yards berths show. See `docs/LOGISTICS.md#state`. A save from before 0.21.0 loads with the company unowned (it is never granted for free).

Version-dependent fixes on load (no schema change): saves older than **0.20.0** have positions on the widened maps shifted (`Game.widenSave`).

NPC `profile` data is **not** saved; it is reattached from content on load. Paths are recomputed. Only errand intents are persisted.

## Loading pipeline

1. Parse JSON. Unparseable → try the slot's `.bak`.
2. If `saveVersion` < current → run migrations in order (`src/save/migrations.js`).
3. `validateSave` — rejects missing essentials (player map/position, clock), rejects saves newer than the game, repairs optional fields with safe defaults and lists every repair as a warning shown to the player.
4. `Game.loadState` merges with fresh defaults: characters, containers and shops that exist in content but not in the save are created fresh; maps that no longer exist move the player home with a warning.

Nothing is ever deleted automatically. Deleting a slot keeps its `.bak`.

## Changing the schema

1. Bump `SAVE_SCHEMA_VERSION` in `src/core/version.js` and `saveSchemaVersion` in the manifest.
2. Add `{ from: N, describe, up(save) }` to `MIGRATIONS` — never edit or remove existing ones.
3. Extend `validateSave` for new fields (with defaults).
4. Add a fixture of an old save to `tests/fixtures/` and a test that it loads and keeps relationships, inventory, quests and memories.
5. Document the change in the schema history below, `CHANGELOG.md` and `VERSION_HISTORY.md`. A schema change that cannot be migrated is a MAJOR version bump.

## Schema history

| Schema | Game version | Change |
| --- | --- | --- |
| 1 | 0.1.0 | Initial schema. |
