# Known Issues and Limitations — v0.3.0

## Not yet implemented (planned)

- **Combat** (optional system) and its nonviolent counterparts beyond what quests already offer. Health exists but nothing damages the player yet.
- **Equipment** slots; items are only consumables, tools, keys, gifts and junk.
- **Character progression**: stats (Charm, Wits, Grit, Finesse) are fixed at 2. Only Charm and Wits are used (dialogue checks).
- **Controller and touch input.** Keyboard + mouse only.
- **Weather and seasons.**
- **More of the world:** No. 11 and the Collective Hall have no interiors; only one outdoor map.
- **Imported characters:** one so far (Sir Moneybucks). His ten employees are lighter residents (fewer topics, no individual motifs).
- **Moneybucks's upstairs apartments** and the Collective Hall interior are not built.
- **Upstairs of the lighthouse** (blocked stair is a story hook).

## Limitations of current systems

- NPCs do not physically collide with the player or each other (they pass through; it avoids deadlocks in narrow interiors).
- Facts are permanent once known; repeated events reuse the same fact id (e.g. a second bang does not "refresh" news for someone who already heard of the first). Event chains that depend on fresh news may therefore trigger from old knowledge.
- Abstract-tier travel uses Manhattan-distance estimates, so off-screen journeys can be slightly faster or slower than walking them.
- The game clock pauses during dialogue and menus; NPCs freeze while you talk to anyone.
- The notice board is the only "public" information channel; there are no letters/telephones yet.
- Reputation changes from facts about the player apply once per fact, the first time anyone else learns it.
- Music is synthesised; quality is intentional but not production-grade (see `docs/AUDIO_GUIDE.md`).
- Text is English only; no localisation layer.

- Sir Moneybucks's walk from the manor to the Quay takes ~45 game minutes; on the abstract tier the estimate can vary by ±10 minutes.
- During a strike, picketing workers stand at the gate but the refinery interior is simply empty (no "scab" behaviour yet).
- The Ledger can only be played once per day, and a match abandoned mid-way keeps the stake.
- Region seams are east–west only; maps can't yet be joined north–south.
- Across the seam, the off-map neighbour's NPCs are drawn but you can't talk to them until you step across (interactions use the current map).
- Sleeping NPCs are drawn standing with closed eyes, not lying in bed.

## Defects

Fixed in 0.2.0 (found while building it):
- Event templates had no `id`, so all events shared one cooldown slot; "once" events could be blocked by any other event. Saves from 0.1.x may contain a harmless `lastFired.undefined` entry.
- Several personality impulses could never outscore schedules (e.g. Mags's patio natter); weights corrected and the validator now rejects impossible impulses.

None known otherwise. Report new ones here with steps to reproduce.
