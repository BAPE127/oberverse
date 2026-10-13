# Known Issues and Limitations — v0.1.0

## Not yet implemented (planned)

- **Combat** (optional system) and its nonviolent counterparts beyond what quests already offer. Health exists but nothing damages the player yet.
- **Equipment** slots; items are only consumables, tools, keys, gifts and junk.
- **Character progression**: stats (Charm, Wits, Grit, Finesse) are fixed at 2. Only Charm and Wits are used (dialogue checks).
- **Controller and touch input.** Keyboard + mouse only.
- **Weather and seasons.**
- **More of the world:** No. 11 and the Collective Hall have no interiors; only one outdoor map.
- **Imported characters:** pipeline documented and supported by the engine, none imported yet (requires player material + interview).
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

## Defects

- None known at release. Report new ones here with steps to reproduce.
