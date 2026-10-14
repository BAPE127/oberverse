# Known Issues and Limitations — v0.19.0

## Not yet implemented (planned)

- **Crates (v0.19.0):** an order must be filled whole, from one works' cage, in one shipment; orders can't be negotiated. Loose single weapons in a cage from older saves can only go to Lucas.
- **Police chases (v0.18.0):** cruisers don't shoot, set roadblocks or use spike strips; they pass through traffic rather than waiting behind it; they don't follow you through region gates (by design — it's a way out). A car-sized path can't always be found through cluttered plazas, so a cruiser may stop a few tiles short and send an officer on foot.
- **Transit (v0.17.0):** one bus route; buses and traffic never crash, and people never step aside for them (they wait). The bus stops 8 minutes at every stop whether or not anyone is waiting. Traffic isn't saved (it's regenerated each session) and only runs in Halvermouth and on the coast road — not yet in the Yards. Named NPCs don't drive their own cars. Between regions (the road outside the maps) a bus you're riding is out of sight for a second or two.
- **Cars (v0.16.0):** no fuel or damage (not chosen). Cars can't enter buildings or water; they're drawn top-down in a 3/4 world. People walk through parked cars (only you are blocked by them). You can't fight from the driver's seat.
- **Terminal and world map (v0.15.1):** the game is paused while the terminal is open, so your own shipments sit at their real position (they move as days pass) — the moving traffic on the globe is the rest of the world's. The world map places regions joined by gateways side by side with a short road between; the distances are not to scale. Building labels can overlap at middling zoom.
- **Tablet (v0.15.0):** the Business app covers the arms works only (the calculator warehouses are still run in person); stall alerts are checked hourly at :30, so a short stall can go unreported. Notifications posted during a long sleep or time skip all toast at once (the HUD keeps the latest six).
- **Arms trade (v0.14.0):** countries can't yet be bribed or influenced (the planned politics update); you can't own a shipping company yet; wars are abstract (no battles shown). Heavy weapons don't damage buildings or props (by the owner's choice); projectiles and drones are lost if you change map. Employees never leave their works (by design) and don't fight. Items have no per-unit quality; research raises prices for the whole family.
- **Factory (v0.12.0):** no splitters, mergers, underground belts or filtered arms; machines only face one way (no rotation); arms and belts move one item per game minute; power is a simple machine count (no fuel, no wiring). The gang doesn't raid warehouses (owner chose threats, ambushes and a truce). Build mode is mouse-and-keyboard only.
- **Calculator trade (v0.11.0):** customers live and order only in the Sumps; order meeting spots are fixed points. Gang ambushes and hunts only happen on the player's current map. Officers and gang members only trade insults (no NPC-vs-NPC fights).
- **Police limits (v0.10.0):** officers only pursue on the player's current map (a dispatched officer travels by schedule pathing, so a call across regions can take a while); no bounties or police vehicles in the open world; the jail has no other prisoners besides Petty; the only way back into the cell block is the jail keys. Being knocked out by anyone now always ends in jail.
- **Combat follow-ups:** no armour, cover, dodging or stealth attacks; NPCs only fight on the player's map (leave and the fight ends); no looting bodies; no mourning, funerals or replacement characters after a death.
- **Equipment** beyond weapons (no armour or clothing slots).
- **Character progression**: stats (Charm, Wits, Grit, Finesse) are fixed at 2. Only Charm and Wits are used (dialogue checks).
- **Controller and touch input.** Keyboard + mouse only.
- **Weather and seasons.**
- **More of the world:** No. 11 and the Collective Hall have no interiors.
- **Halvermouth is map-only:** no residents, traffic, shops, jobs or quests yet; the gun shop sells nothing; most buildings are closed (each says why). Parked cars never move.
- **Property plots:** the property system is groundwork only — there are no plots to build on yet (by design; added on request). Tenants are not simulated characters, and the shopfront pays a flat placeholder income. Player homes have no lock.
- **Imported characters:** two so far (Sir Moneybucks, Mason Nails). Their employees are lighter residents (fewer topics, no individual motifs).
- **Moneybucks's upstairs apartments** and the Collective Hall interior are not built.
- **Upstairs of the lighthouse** (blocked stair is a story hook).

## Limitations of current systems

- NPCs do not physically collide with the player or each other (they pass through; it avoids deadlocks in narrow interiors) — so in a fight, attackers can stand inside you.
- Killing a story character can make quests impossible (by design, they fail). Dialogue elsewhere may still mention a dead character as if alive (lines are not yet death-aware).
- Fleeing NPCs run in a straight line away from you and can get stuck in corners until their fear wears off (~45 game minutes).
- The Debug menu is available to everyone who plays (it's a testing tool, not hidden); saves made with it are flagged `debug_used`. `time` only moves the clock forward. Teleporting into a locked interior bypasses its lock.
- The Wrath cutscene can't be skipped (about 10 seconds). Dialogue doesn't yet react to `smitten_by_<id>` (the flag is recorded for future lines).
- The Wrath's lightning starts above the top of the screen; in tall interiors it appears through the ceiling (intentionally: it's the Oberverse).
- Gunshots only alarm people on the same map; a fight in a building is not heard outside.
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
- Skyscrapers along the northern edge of Halvermouth are cut off by the top of the map (the camera stops at the map edge).
- Halvermouth's static ground layer is large (3584×2560 px); fine on desktop Chromium (60 fps measured), not yet measured on phones or tablets.
- When NPCs are added to Halvermouth, they will need routes through the gateway doors (cross-region travel uses the door graph; untested with residents).
- Across the seam, the off-map neighbour's NPCs are drawn but you can't talk to them until you step across (interactions use the current map).
- Sleeping NPCs are drawn standing with closed eyes, not lying in bed.
- The Mason's Os site never changes (as requested); the crew's "build" impulse sends them to one spot on the Lots whatever plot is being built.
- The excavator is not solid (Mason sits in its cab); the player can walk through it.
- Mason's afternoon trip to the Civic Office is a long walk from the site office, so he spends part of his permit hour walking; off-screen the trip is estimated.

## Defects

Fixed in 0.2.0 (found while building it):
- Event templates had no `id`, so all events shared one cooldown slot; "once" events could be blocked by any other event. Saves from 0.1.x may contain a harmless `lastFired.undefined` entry.
- Several personality impulses could never outscore schedules (e.g. Mags's patio natter); weights corrected and the validator now rejects impossible impulses.

None known otherwise. Report new ones here with steps to reproduce.
