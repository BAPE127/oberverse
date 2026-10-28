# Known Issues and Limitations — v0.59.0

- **Aerospace, stage V — services, research, reports (v0.59.0)** — a satellite of your own needs your own pad, a rocket you can build and a clean room (the same as a customer's); Meridian doesn't run networks of its own, only the support fees for its customers' satellites. Markets are one world-wide pool of demand with unnamed rivals — no geography, no individual customers, no negotiating. Your own orders are standard configurations (the hardened bus and the long-life options come on customers' tenders). Insurance is one flat policy for the whole fleet. The Orbit picture is a schematic: orbital radii are squeezed, the continents are made up, and the satellites you have not got are shown only for company. The debris decision is the only one the sky asks of you. Reports: cash flow and monthly figures start with this version (an older save has none for what came before), Roost's cash isn't on its balance sheet (it spends from your own account) and its plant is counted at 60% of cost without depreciation. Achievements on an older save are awarded on the next morning for what the record already shows (and pay their grants then). Achievement grants come from nowhere in particular and are not in the books.

- **Aerospace, stage IV — the field in motion (v0.58.0)** — aircraft are bigger than the runway is wide (a widebody's wings overhang the grass: the art is to the game's scale, not the map's). Only departures of finished aircraft and Meridian's own sorties are drawn; a customer's aircraft is never seen again once it leaves the map, and nobody else's aircraft arrive (the flight update). Taxiing aircraft can pass nose to nose on taxiway A; only the runway is queued. The Roost apron's tight connector makes big aircraft swing round sharply. Aircraft already waiting on the apron in an older save are parked on the first free stands. Nobody stands guard: you can walk onto the runway, through a launch's flame trench or under a convoy and nothing happens to you. The launch clock counts a game minute as a second; sped up or slowed down, the show follows. Roost's own rockets are not shown arriving from the West Works (the crawler starts at the launch complex's gate). The ascent models one falling stage, no boosters landing.

- **Aerospace, stage III — halls, people, configuration (v0.57.0)** — Meridian's extra bays (beyond the halls drawn for it) go up unseen, at ×1.5. A Roost bay with no slot to be had (an old save, with all halls full) keeps working but isn't drawn. Each hall has a fixed number of slots; there's no way to demolish or rearrange. Old saves start paying engineers and inspectors from the first day (their wages are new). Experience is the company's, not each worker's; there are no individual employees. Options are bounded groups per product, not free design; a customer's wishes are fixed by its tender and can't be negotiated. Reputation events are rare by design (cool-downs). The Floor shows eight bays at most before it scrolls.
- **Aerospace, stage II — your own ships (v0.56.0)** — a consignment travels in one ship (up to its hold; a bigger one waits, or goes by carrier under the fallback policy). Your ships carry aerospace materials only to Mill Road, never onward or back. A ship reserved for a consignment can't take a contract until it's unloaded (Fleet Command says so). Ships don't pick up aerospace consignments on the way back from another contract's port — each is its own voyage. On a save from before v0.56.0 the 30-day group figures may include what you paid for Ober & Sons and its ships (the capital tally starts now).
- **Aerospace, stage I (v0.55.0)** — see docs/AEROSPACE.md for the plan. Materials in your own ships arrived in v0.56.0 (below). Not yet: aircraft taxiing and taking off and rockets launching on screen (v0.58.0: deliveries and launches happen, and are recorded, without the animation); satellite services and networks (v0.59.0: satellites are built, launched, commissioned and registered, but earn nothing after delivery yet); bays and facilities you build appear on the map from v0.57.0. Pad 2 can be paid for but there's no service tower drawn on it yet. The aerospace terminal is a paged screen (no map view). Nobody drives: everyone walks the Cut.


- **Morganius at the table (v0.54.0):** he's painted at 200 × 190 art pixels and scaled to the scene, so on very large screens his pixels are big (on purpose — the game's look). The world sprite of him (walking about the casino) is unchanged. The roulette ball's flick is a pose, not a thrown ball. On narrow screens the spellbook and the Curios hide (keys still cast).


- **The Spade's Gambit (v0.53.0):** 17 Curios, 6 Inks, 5 Twists, and (v0.54.0) 6 Marvels and 10 Spells. You can't reorder your Curios (part with one and buy again to change the order). The Cabinet's "part with" asks with the browser's own confirm box. Loading an earlier save takes the Gambit back to how it was then (as with everything else in a save).


- **The Phonograph Grand (v0.52.0):** Texas Hold'em isn't open yet (its tables say so). Octavius wears a stand-in look until the owner's picture arrives. Nobody else plays at the tables and there are no croupiers or visitors yet (nightlife comes after the aerospace stages), so every seat is yours. The world pauses while you're at a table. The cage is shut 02:00–10:00. Blackjack pays 3:2 rounded down to whole chips (a 5-chip blackjack returns 12). Morganius is drawn at the table as his pixel figure scaled up (deliberately: the scene is in the game's own pixels), with the photo as his portrait beside what he says. Private floors open by flags that nothing in the game sets yet (invitations come later).


- **Light (v0.51.0):** a lit room is lit evenly (no lamps of its own inside it yet); the floors of towers and other rooms that aren't laid into a street still use the old indoor light. Light pools are round and don't stop at walls.

- **People and cars (v0.50.0):** cars turn in 64 steps (about 6° each). The signature cars, the tractors and Chuckie's cows keep their earlier drawings; imported characters with their own picture still use it. A person's sprite cache is cleared after 3000 looks (only a wardrobe marathon gets there).

- **Props (v0.49.0):** about 50 kinds of prop are sprites now; the rarer ones (ships and their berths, the works' machines, the oil field, the building site, Chuckie's cheese plant, the big road signs, cars on display, stairs) are still the old drawings. A tree's shadow falls on whoever stands in it only if they're drawn after it (the shadows are on the ground, under everyone). People, cars and cows are next (phase 5).

- **Ground and walls (v0.48.0):** props, furniture, trees, people and cars are still the 0.46 drawings (phases 4 and 5 of the overhaul); the night light is the 0.43 banded light (phase 6). A river's colour can change slightly where it crosses into the next part of town if that part's shore is out of reach (more than two tiles past the seam). Walls are a whole tile thick. A building's door is drawn as an open doorway whatever its lock.

- **Open doors (v0.47.0):** the art is still the 0.46 look — the Streets of Rogue detail (textured ground, thick brick walls with windows, drop shadows, detailed furniture, people and cars) comes in the next releases. Buildings bought and built on a plot still have a separate interior behind a door. The lighthouse keeps its door. A shop's sign and awning aren't drawn over its room yet. The bigger towns make walks longer.

- **Fine pixels (v0.46.0):** props, buildings and the ordinary cars are still built from two-pixel blocks (with one-pixel outlines now); only the people, the ground and the signature cars are fully fine. The player can wobble by a pixel against the smooth-scrolling world while walking.

- **Special weapons (v0.45.0):** their ammunition isn't sold anywhere — when a stash runs out, the weapon is a trophy. Their owners don't yet notice they're missing (beyond the burglary itself) or carry them. The Golden Handshake sits in Moneybucks's vault, which needs the vault key.

- **Gun play (v0.44.0):** your own bullets are for show — the hit is decided the instant you fire, so a target can't step out of the way of your shot (theirs can be dodged). NPC bullets don't hit other NPCs or cars. Blood, cases and bullets aren't saved.

- **Menus (v0.43.0):** a few panels set colours in their own code (rather than the stylesheet) and may still show a cream card or two inside the navy frame.

- **Look (v0.42.0):** people seen inside a roofless building are placed by scaling their spot in the real (bigger) room, so someone can appear to stand in a piece of furniture. Sprite-based characters (imported art) and Chuckie's cows keep their own drawings. The hotbar holds weapons only (no food or tools yet).

- **Towers (v0.41.0):** only Vantage Point is open to the public; the other office towers and Ober's Oil Tower are still locked. Nobody works or drinks in the Sky Lounge yet (NPCs don't use lifts). The city seen below a floor is the street's ground only (no buildings or traffic), and above the northern towers it is mostly sky.

- **Art revamp (v0.41.0, stage 4 of 5):** buildings are roofless, but what you see inside is a scaled cutaway of the interior map (its furniture in proportion), not the room itself — the people inside aren't shown, and you still enter through the door (a scene change). The lighthouse keeps its old look. The rarer props (ships, the works, farm kit, building sites, the oil field) are the old drawings through the pixel filter; fields and crops are the old drawing. Captions, notifications and menus are the old style (stage 5). World text is drawn on top of everything.

- **The works (v0.37.0):** one-lane belts (no lanes, undergrounds or long-handed inserters yet); a sorter always sends its item to its right (rotate it to choose); chests have no slot limit ("bar"); belts carry the player but not the workers.

- **Homes (v0.36.0):** a block's front door and each flat's door are separate locks (break both). The Sumps camp stays a camp (owner). There is no pawnshop yet — stolen valuables are marked for one. Interiors are bigger than the shacks outside them.

- **Getting out of a car by the Kettle & Crumb (reported 2026-10-16):** explained by v0.35.2 — the car had been driven into the buildings (see the changelog). Fixed.

- **Living World (v0.35.0):** NPCs don't drive yet — characters whose occupation says `drive` walk (and take no bus); the patrol cruiser has no named officer; bus trips don't transfer between lines. Two people can share a spot (a bench, a booth) and overlap on screen. Errands only go to outdoor places and the café/diner (no shop-browsing spots yet).

- **Signature cars (v0.34.0):** their owners don't drive them yet — they stay parked (NPC driving is planned). You can't get out of the Landlubber on open water; drive it ashore first. Collisions use each car's rectangle, so the Hypotenuse and the Big Cheese bump like boxes.

- **Living World (v0.33.0):** NPCs take the bus only between regions (inside a region they walk); two residents commute this way so far. A loop line can't be taken backwards: passengers wait for a bus going the quicker way. Buses stop for anyone standing in the road, including you. Officers live in Precinct 1's duty quarters (staff quarters), the Sumps residents in the camp, and several shopkeepers in rooms at their shops; that's their housing, by type. The patrol cruiser is traffic, not a particular officer, and doesn't respond to calls. Occupations' transport preferences are recorded and validated but only walking is simulated for now.

## Not yet implemented (planned)

- **Farming (v0.30.0):** a field is worked as a whole (one job at a time, the clock skips while you work); there are no seasons, weather or soil quality yet; tractors are driven like cars and don't tow implements; Calloway Ag Repair stays closed (tractors don't break down yet). Livestock (v0.31.0): animals are a count per pasture (a dozen are drawn); there's no breeding, illness or weather; produce waits at the pasture until collected; market demand is shared by everyone's sales but only the player sells.
- **Lariat (v0.29.0):** The ordinary herd is simulated as numbers (240 cows) and drawn as grazing props; the lead cows are the only cows that walk. A roped cow following you picks a path every 0.4 s, so she can lag a tile or two round corners; she follows through gates and map edges only (never into a building or a vehicle). Lariat has its own traffic and lights (v0.29.1) but the No. 1 bus doesn't run there. Fields are drawn into the ground layer, so a crop stage change (0.30.0) will redraw that map's ground.
- **Geography (v0.28.0):** the land grid is computed on first use (about 0.8 s); ships route on 3° sea cells, so very narrow straits drawn on the chart may be too narrow to sail; a ship at sea in a save from before 0.28.0 follows the new route from where its voyage started (its position may jump); country borders are nearest-capital lines on the land, not authored.
- **Walking aboard (v0.27.0):** only at the Mill Road Yards berths, two ships per berth (the rest are listed on the name board); the rooms below follow one layout scaled to the ship; there are no crew aboard (NPCs never board); a ship's hull and fittings are drawn as one moored picture, so a deck you can't reach (one-tile pockets between fittings) is simply not walkable.
- **Shipbuilder (v0.26.0):** attachment points take any part (the slot count is the rule; where a part sits is looks only), so an engine can sit at the bow; parts are drawn at their point and can overlap a neighbour's (a crane's boom, sails); ships already launched can't be refitted.
- **Fleet Command (v0.25.0):** ships on the chart are drawn top-down from their `look`; the chart is mouse-only (no touch pinch-zoom); skipping time from Fleet Command runs the whole world's clock, as sleeping does.
- **Shipping (v0.21.0):** own-ship arms exports only load at Mill Road Docks and deliver to each country's main port; pirates only strike your own ships (the shipping companies' losses are still their reliability rolls); missions are staged from your own ports and only the deterrence sweep and port protection change the world; a lost ship stays on the books as lost (no salvage); existing ships can't be refitted in the shipyard (only new builds), one build per yard at a time, and the slipway is drawn only at Mill Road Docks; port `upgrades` and vessel `components` are reserved. One contract per ship; contracts always start at a port you own. The arms terminal's globe doesn't show your fleet yet (the logistics chart does). Ships can't be sold. The Yards berths show at most two ships per berth (the board lists the rest). Playable naval combat is a long-term goal, not planned for these updates.
- **Streets (v0.20.0):** traffic lights only at the Halvermouth grid and Lamplighter Lane; there are no turn signals or filter lights, and traffic never turns at a junction except where its route does. People wait for the green man only at signalled junctions (elsewhere they cross at the nearest crossing, or the road if there's none close). Police cruisers ignore the lights. Older saves are moved with the streets; anything left standing on a newly widened road line ends up on the road. Maps are still authored with 2-tile roads and widened at load — edit them in the old coordinates.
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
