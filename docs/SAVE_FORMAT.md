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

Business state (all optional, created on first use, so older saves simply lack them): `world.market`, `world.arms`, `world.factory`, `world.vehicles`, `world.transit`, `world.tablet`, and since **v0.21.0 `world.logistics`** — Ober & Sons Maritime: ownership, ports, vessels (with their voyages and pre-rolled voyage events), contracts, upkeep arrears, the ledger, reports and which ports the Yards berths show. See `docs/LOGISTICS.md#state`. A save from before 0.21.0 loads with the company unowned (it is never granted for free). Since **v0.55.0 `world.aero`** — Starling Flats: both aerospace companies (Meridian's cash, books, bays, stores; Roost once bought), tenders, contracts, production units (with their pre-rolled inspections, launches and commissioning), purchase orders, the satellite and aircraft registries, customers' budgets, suppliers' stock, MRDN's price history and your shares, and the aerospace random stream. See `docs/AEROSPACE.md#state`. A save from before 0.55.0 gets Meridian as at a new game and no firm. Since **v0.56.0** `world.aero.jobs` holds your consignments in your own ships (and each company its shipping mode, fallback policy and freight tallies; a reserved or loaded ship's `cargo.type` is `'aero'`); the logistics ledger gains `internal` (internal revenue) and `capex` tallies. Older saves get empty consignments and carrier shipping until both companies are owned. Since **v0.59.0** a satellite record carries `service`, `price`, `opex`, `own`, `hardened`, `config`, `kind`, `value`/`book` (own satellites), `revenueTotal`, `supportTotal`, `hit` (a storm's damage) and `replaceTender`; `world.aero.orbit` holds the sky's price swings (`mult`) and cool-downs; a company carries `insured`, `autoReplace`, `queue` (research), `achieved`, `orbit` (yesterday's takings) and `stats` gains `byClass`, `byProduct`, `bestStreak`, `flawless`, `bigContract`, `launchRun`, `launchBest`, `discoveries`; its books gain `months` (thirty-day accounts, two years), `fleet` (book value), `lines` and `products` (segment records) and `cf_in_*` / `cf_out_*` accounts (how cash moved); a rocket-less own satellite is a unit with `purpose: 'own'`. Older saves are given what they need on load. Since **v0.58.0** `world.aero.field` holds the runway windows and starts (`reserved`, `starts`), the aircraft on the field (`active`) and `ambientDay`; an aircraft entity gains `stand`, `move` (`{ kind, t0, rwy }` while a movement is under way), `livery`, and (Meridian's own) `ambient` and `sorties`; a rocket unit gains `rollout` and `seq`, a strategic unit `convoy`, and a pad `roll` and `seq`. Older saves are given stands for the aircraft waiting on their aprons, and Meridian's own aircraft appear at home on first load. Since **v0.57.0** each aerospace company also carries `halls` (hall id → opening time), per-bay `slot`, `engineers`, `inspectors`, `experience`, `training`, `qaLog`, `repLog`, `streaks`, `events`, `offers`, `cool`, `milestones` and `pressure`; tenders, contracts and units may carry `config` (and tenders/contracts `event`, tenders `minReputation`), and aircraft entities `config` with a configured `spec`. `afterLoad` fills these on older saves: bays that have no slot are slotted into the first hall that suits them (opening it free), staff start at what the bays need, and nothing is charged or taken away.

Since **v0.60.0 `world.corp`** — the company accounts and the wider world: `accounts` (per business: `funded`, `cash`, `contributed`, `distributed`, `inKind`, `flowIn`, `flowOut`, `arrears`, `log`, `months` — flows by 30-day month, two years), `companies` (identity: `name`, `named`, `founded`, `legacy`, `names` history), `generated` (about 45 companies with their full records, `months` rows `[month, revenue, cogs, fixed, interest, net, capex, dividends]`), `gen` (`salt`, `nextId`, `lastDay`, `lastEntry`, `news`) and `rankHistory`. Created on first use; a save from before 0.60.0 loads with every company unfunded, default names for arms and farming, and the generated companies made once at load — no money, shares, loans or businesses are ever granted by it, and nothing is consolidated. `tests/fixtures/save-v0.59.0-four-businesses.json` is a real v0.59 save used to prove it.

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
