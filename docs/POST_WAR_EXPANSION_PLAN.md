# Plan: the Post-War Expansion (Atlas, living Sund, quests and events, intelligence missions, Neumina, the noir mob city)

Status: **plan only. Nothing in `src/` has changed**; the code is still v0.91.5. You asked for simple mock-ups, the prompt saved and this plan, and not to implement. The prompt is saved word for word as `docs/prompt-bank/21-post-war-expansion.md` (number 06 was already taken by the quest and mini-game prompt).

Rules for every release below are the standing ones: ask before guessing, accuracy over speed, `node tools/build.mjs`, `npm run check` and `npm run smoke` before each code release, every edited existing test listed, existing saves load and **migrations grant nothing**, no money from nothing, commits end with the attribution lines, push only to `claude/funny-mayer-52dll8`, and the paused casino tasks stay paused.

## 1. The pictures (drawn by the game's own engine)

An earlier set of pictures was drawn in my own style and did not look like the game; they have been **deleted**. These are made by running the **real game** (the dev build, headless) with two **mock-only map files** loaded into it in the game's own map format, so the tiles, buildings, lamps, night lighting, cars, people and HUD are exactly the game's art. Nothing in `src/` was changed.

| Picture (all in `mockups/`) | What it shows |
| --- | --- |
| `proposal-postwar-game-noir-street.png` | Saint Halloran in the rain outside the Gilded Ace Casino |
| `proposal-postwar-game-noir-docks.png` | the docks at night: Pier 3 warehouse, cranes, fire barrel, piers, harbour |
| `proposal-postwar-game-noir-map.png` | the whole Saint Halloran map: harbour with piers, a river with bridges, Founders Square, the three mobs' districts |
| `proposal-postwar-atlas-and-instances.png` | the four Atlas zoom levels and the mission lifecycle (a diagram, not a game view) |

**Neumina as a class-divided mega-city (newest set): `proposal-postwar-class-neumina-*.png`.** Each level has its own architecture, ground, people and light, all drawn with the game's own painters: `-terrace` (**level +4, Skyline Terraces**: cream towers with gold trim and arched windows, pale stone paving, fountain court, trees, white-clad residents and guards, limousines and gold flying cars, a glass balustrade, and the lit glass-mile level far below, hazed), `-street` (**level 0, Glass Mile**: glass and neon towers of mixed heights and set-backs, steel deck-plate paving instead of cobblestone, a market notch with stalls and a hologram wall, hanging cables and a billboard, a sky bridge overhead, mixed traffic, crowds), `-under` (**level -2, the Under-Levels**: tin-roofed plank stacks, rusted grating floor, thick pipes with steam, barrel fires, stalls, laundry lines, sodium and green fluorescent light, shafts of cold light from the levels above) and `-stack` (**the divide in one view**: terrace, glass mile and under-levels as stacked bands, separated by retaining walls and railings, each darker and murkier than the last, with a sky bridge and flying cars between them). Cobblestone is gone: each level has its own paving. The older `proposal-postwar-levels-neumina-*` set (floor cutaways, bridge, roof) is kept for the in-building views. Sources: `mockups/postwar-src/levels/` (`city.js` styles, grounds and building rows; `scenes2.js` the four scenes; `run.mjs`). Building styles, paving and flying cars here are mock-only data on the war update's painters.

**Neumina pictures (the current set): `proposal-postwar-levels-neumina-*.png`.** The pixel-filter pictures were dropped: filtering never looked like the game. These are drawn with the game's **own painters** (the roofed multi-floor building and one-floor cutaway painters from the war-update mock-ups, the game's own people, cars, lamps, helipad, night lighting and HUD), using the same logic as housing soldiers: **outside, a building is many storeys** (a roof, and a facade with one row of windows per floor, windows lit in neon colours); **go in or up and the roof and the floors above lift away so you see only your floor**, with **the levels below still visible, dimmed**. `-street` (level 0: five and six storey towers, a sky bridge overhead, lit windows), `-bridge` (level +1: standing on the glazed sky bridge, floor 4 of each tower either side, the street below), `-inside` (inside floor 4 of 6 with neon pools, the street below), `-roof` (level +6: the roof and helipad, a flying car, the street far below). Sources: `mockups/postwar-src/levels/` (`run.mjs` with the dev server up). Neon pools, the sky bridge and flying cars are proposed engine additions.

**How the two cities are made different from Halvermouth and from each other:** Halvermouth is a square grid. **Neumina** is a hub-and-spoke city: six avenues radiate from a central plaza, a wobbling ring road circles it, lanes branch off, a canal cuts across the south-west with bridges, the ground is grey concrete (not brick), buildings are purple and steel with neon sign colours, many towers (the game's own tower and helipad types) and small dense blocks. **Saint Halloran** is a curved harbour town: a wavy coastline with piers, a river with bridges, a diagonal boulevard running into a roundabout square, winding Old Town lanes, brick paving, red-brown and gold buildings with awnings, and rain. The roads are curves stamped onto the game's tile grid, so they step diagonally the way a pixel-art game does; the buildings are placed wherever a door can reach a street. **A limit I want to be honest about:** buildings are still axis-aligned rectangles and every door faces south (the game's building rule), so the blocks are not as free-form as the roads. Truly rotated buildings or real elevated streets would need engine work (a decision for you).

**What is the game's own and what is a proposed addition.** Everything is the real renderer **except** these mock-only extras, which would be new engine features: coloured neon light pools (the game only has warm lamp light today), the sky bridge, flying cars (drawn with the game's own car art plus a shadow and glow), and the rain streaks. Their look is in the game's stepped, dithered pixel style so they can be built on the same renderer.

Sources: `mockups/postwar-src/` (`organic.js` the city generator, `neumina2.js` and `halloran2.js` the two cities, `pwmaps.js` the building styles, `neumina.js` the underground level, `pwscene.js` the placement helpers, `dress.js` the extras, `screens.mjs` the screenshot run, `ingame.mjs` the browser driver; `maps.py` is the Atlas diagram). To rebuild: `PORT=8431 node server.js`, then `node docs/mockups/postwar-src/screens.mjs` (needs Playwright). **Neumina reference image:** it shows a top-down pixel street with a neon club sign, a METRO stair, pink palms and hover cars; the screenshots follow that mood with original names.

## 2. What already exists and gets reused (nothing is rebuilt)

| The brief needs | The game already has | Plan |
| --- | --- | --- |
| Several maps, doors, interiors | `src/content/maps/*` (ten maps), `src/world/gameMap.js`, `interiors.js`, `mapBuilder.js` | A foreign city is **a map definition in the same format**, not a new engine. |
| NPC identity, homes, schedules, relationships, memory | `src/sim/*` (`npcSystem`, `schedule`, `relationships`, `knowledge`, `memory`, `errands`), `content/life.js`, `content/homes.js`, `systems/homes.js` | The living-Sund NPC data is **new content on these**; only a thin "story" record is new. |
| Random events | `systems/eventDirector.js` and `content/events.js` (templates, conditions, cooldowns, follow-up chains) | Extended with the brief's **event instances** (id, location, state, resolution, honest news). |
| Quests, journal, jobs | `systems/quests.js`, `content/quests.js` (declarative stages, triggers, outcomes), `todo.js`, the tablet | Extended with **multi-approach stages, discovery methods and a hidden-until-found journal**. |
| Police, wanted level, gangs | `systems/police.js`, `pursuit.js`, `gang.js`, `robbery.js`, `content/factions.js` | Events and the noir mobs **use** these; the separation rule between crime and finance (brief 14.1) stays. |
| Atlas and geography | `world/geography.js`, `world/globe.js`, `world/regions.js`, `systems/geo.js`, `content/geo.js`, `docs/WORLD_ATLAS_PROPOSAL.md`, `mockups/atlas-src/` | The **v0.92.0 Atlas is the base**; see section 3. |
| Saves | `src/save/*`, `migrations.js` (empty list today), `docs/SAVE_FORMAT.md` | New state is added **with a migration that grants nothing**. |
| Missions with objectives | `systems/missions.js` | Mission instances sit **beside** it; the old missions are untouched. |
| Disguise, clothing | the character appearance and items system | Disguise is a new layer over **worn clothing items**, not a new wardrobe. |

## 3. How this fits the existing roadmap (needs your decision)

`docs/ROADMAP.md` is the single master release list: **Atlas v0.92.0, Politics v0.93 to v0.106, War v0.107 to v0.120.** This prompt is called "Post-War" and its Part II is the Atlas again. Proposed fit:

- **Part II (Atlas) is not a second atlas.** The v0.92.0 Atlas (11 countries, 76 states, about 130 places, rivers and roads as data) is the base. This prompt adds on top of it: **four zoom levels** (global, country, city, playable map), **a city layer** (a city has districts and an "enter" link to a playable map), **travel and mission availability fields**, and Sund as one connected country. Those additions are small enough to be **v0.92.1**, right after v0.92.0.
- **Sund must stay one connected landmass.** The v0.92.0 plan redraws Sund as the home island, one long chain of land; whether every playable district is joined by land on that map is **not yet checked**, so it is a first **test** at v0.92.0 (every playable district reachable over land), and a fix only if it fails.
- Parts III to VI (living Sund, quests, events, the agency, mission instances) need **nothing** from Politics or War. They could be built any time after the Atlas.

**Recommended order (a proposal, not a decision):** v0.92.0 Atlas, v0.92.1 city layer, then the Post-War stages, **interleaved ahead of Politics**, because the brief's own priority is that the world should be the main attraction and not the business side. The alternative is strictly after the War (v0.121 onward), which is what the name suggests. **Question 1** below.

## 4. The twelve stages, as releases

Numbers are provisional (labels PW-1 to PW-12 are fixed; the version numbers move with your answer to Question 1). **Each stage ships on its own, tested and pushed, and the game must be fully playable after each.**

| Stage | Label | Provisional release | After it exists | Main tests |
| --- | --- | --- | --- | --- |
| 1 | PW-1 Audit | no code; a document, `docs/POST_WAR_AUDIT.md` | the canonical version named; the list of **empty buildings** (counted from the maps: doors with no NPC, shop, quest or job); the integration points; the preservation rule | the baseline: all tests and the smoke run recorded before any change |
| 2 | PW-2 Atlas | **v0.92.0** (already planned) **+ v0.92.1** (city layer) | zoom through four levels; Sund is one country; a city record with districts, maps, population, government, relations, travel and mission availability, points of interest | every playable map reachable over land; a country and a city can be added **by data only**; old saves load; the list of edited tests (country count 8 to 11) kept |
| 3 | PW-3 Sund people | PW-3a to PW-3c | a **building-population** record (what a building is for, who is in it, what can be done there); **named persistent NPCs** with a story record on top of `src/sim`; the first 25 to 40 populated buildings | every populated door opens; every named NPC has a home, a schedule and a job that agree; **adding people changes no existing resident's routine** (compare before and after) |
| 4 | PW-4 Quests | PW-4a to PW-4c | quest stages with **several ways to finish**; discovery by conversation, clue, newspaper, text, call, overheard argument and place; the **journal that shows only what you found**; the first 20 or so Sund quests | a quest can be ignored; no stage is reachable without being discovered; the journal never shows an undiscovered name, place or clue (a test on every quest) |
| 5 | PW-5 Events | PW-5a to PW-5b | **event instances** (id, place, people, organisations, start, length, state, outcomes, cleanup) on the existing director; gang, police, robbery, civilian and economic types; cooldowns and weights; resolution when the player leaves; **news only for events that happened** | events end; two events never stack on one spot; a 200-day run with no player involvement is stable; every news line cites a real event id |
| 6 | PW-6 Agency | PW-6a to PW-6b | the agency's building in Sund (name, look, director, handlers, analysts, security, briefing rooms), its people on schedules, contacts and **contract screens** with briefings (incomplete on purpose), reputation, a travel gate | no contract is offered before contact; a briefing never states what the player has not learned; the **door works with the agency ignored** |
| 7 | PW-7 Instances | PW-7 (the foundation; no city yet) | the **template / instance split** (section 5), the lifecycle, results extraction, interrupted-mission recovery, duplicate-reward guard | the contamination suite (section 5); save and load inside and outside a mission |
| 8 | PW-8 Neumina | PW-8a (map and districts), PW-8b (people and implants), PW-8c (hacking), PW-8d (missions) | the city, its factions, **cybernetic implants as items and rules**, hacking with costs and limits, three or four full contracts | hacking limits (section 8); every route in the map is walkable; a mission resets completely |
| 9 | PW-9 Noir city | PW-9a (map and mobs), PW-9b (disguise and suspicion), PW-9c (war escalation), PW-9d (missions) | Saint Halloran, three mobs with their own ecosystems, **disguises with recognition**, the five escalation stages, three or four full contracts | recognition table; escalation is monotone unless calmed; a staged attack is believed only when the evidence says so |
| 10 | PW-10 Content | v-numbers as needed | more Sund stories, events, contracts and optional activities | no new system; content only; the earlier suites unedited |
| 11 | PW-11 Test and polish | one release | map navigation, quests, schedules, events, hacking, disguises, mob wars, resets, save and load, performance, existing-game parity | the full suite; **parity with the whole expansion switched off** |
| 12 | PW-12 Release | one release | version files, changelog, docs, the prompt bank updated with implementation notes | the doc checks |

Stage 3 to 5 are large; they are split as shown so that each piece is reviewable (about the size of one of the earlier OberPad or HQ releases).

## 5. The core rule: templates and instances (Part XII)

The brief wants the separation **enforced by the data architecture and not by developers remembering to reset things.** Proposal:

1. **A city template is frozen data.** Loaded once, then `Object.freeze`d deeply (and in tests, a hash of it is compared before and after every mission). Nothing in the game can hold a writable reference to it.
2. **A mission instance is a separate object**, made by `instantiate(template, missionConfig)`. It holds only **overlays**: a map of `id -> changes` for people, objects, doors, devices, clothing and factions. Reading an object means "template value, unless the instance overlay overrides it". There is nowhere to write a change except the overlay, so **a death, a stolen jacket or a hacked camera cannot reach the template.**
3. **The overlay is never saved into the city.** While a mission is running, the save stores the overlay under `world.mission` (see below). When the mission ends, the overlay is dropped.
4. **Results come out through one whitelist.** `extractResults(instance)` returns only: mission completion, payment, agency reputation, intelligence files, unlocked contracts, permanent equipment and the explicitly designed campaign consequences. Anything else is not copied. A test builds an instance, does everything allowed, and asserts the extractor returns **only those keys**.
5. **Exactly-once rewards:** each result carries `missionRunId`; the extractor records the id in a `settled` set before paying, and a second extraction of the same id pays nothing.
6. **One instance at a time**, keyed by mission run id; asking for a second returns the first.
7. **Interrupted missions** (a closed tab, a crash): the save holds the run id and the overlay. On load the player can **resume** or **abandon**; abandon drops the overlay, pays nothing, and may apply a **designed** reputation cost (decided in Question 6). The template is untouched either way.
8. **The mission's world uses its own clock and its own random stream**, seeded from the run id, so a mission is replayable and never advances the main game's random stream (several current tests are sensitive to that stream).

**Persistent versus mission-local, in one table** (also the answer to the brief's final-report item 8):

| Persistent (kept) | Mission-local (thrown away) |
| --- | --- |
| mission done, payment (once), agency reputation, intelligence files, unlocked contracts, permanent equipment, designed campaign consequences | NPC deaths and injuries, stolen clothing and disguises, destroyed objects, altered security, hacked devices, triggered events, local police and gang activity, temporary hostility, temporary damage, mission-only inventory |

Foreign-city NPCs have a **template identity** (persistent definition) and a **mission-local instance** (health, place, clothes, suspicion). A named foreign NPC is never a Sund NPC.

## 6. Parts II to V in more detail

**Atlas (PW-2).** Data record per country and city with the fields the brief lists (id, name, region, boundary, cities, city ids, maps, population, government, relations, economy, travel and mission availability, points of interest). The global and country views are drawn from the existing atlas data (`atlas-src` becomes the game's own data module). City view is a district diagram like the two city mock-ups; "Enter" moves to the playable map through the existing map-change code. Zoom is a continuous scale with a crossfade between levels (so it feels like one system even though the pictures are separate). **Question 3**: how large the view may be before it costs performance.

**Living Sund (PW-3).** Step one is the audit (PW-1): count doors with no purpose. A building gets a **purpose record** (kind, owner, staff, opening hours, what the player can do), and a lot of buildings only need an owner, a shop counter or a seat; **not every building needs a deep interior.** Named NPCs get a **story record**: motivation, problem, money, relationships, a list of **story beats** and what flips them (so the indebted shopkeeper, the corrupt officer, the missing neighbour, the musician, the former soldier and the small-time criminal are all data). Not every story is crime; the plan caps crime-themed stories at about a third.

**Quests (PW-4).** A quest stage lists **approaches** (talk, search, bribe, break in, follow, force, an alternative explanation), each with its own condition and outcome, and a **discovery source**. The journal holds `discovered` flags per fact, not per quest, and renders only discovered facts. Consequences use existing systems: reputation with the faction, relationships, shop availability, police interest, retaliation, an NPC moving away. Nothing is mandatory: no quest blocks a business or a story, and no quest is the "main line".

**Events (PW-5).** An event instance is created by the director, lives in `world.events.active` with a state machine (`seeded -> live -> resolved -> cleaned`), and is **simulated only near the player**; when the player leaves it is **resolved by a cheap outcome roll** from its participants and capabilities (not frame-by-frame). News, radio and phone items are **generated from the resolved record**; there is no generator that writes news without an event behind it. Police response uses the existing wanted-level and patrol rules, and civilians use the existing flee and call-police behaviour.

**Agency (PW-6).** A building plus five or six persistent NPCs with schedules. Contracts are data (type, country, city, briefing facts with discovery flags, optional objectives, pay, complications). Contact is a quest (the player must establish it; it is not offered at the start). **International travel for now means: travel to Neumina or Saint Halloran for a contract**; it opens the Atlas's travel field for those two cities only.

## 7. Neumina (PW-8)

- **Country:** **the Windfen League**, a technocratic corporate federation (draft profile; yours to change). Government by a council of chartered firms; economy built on neural hardware, logistics and finance; politically wary of the Ostmark Union; a high-tech but unequal society with a strong criminal underlayer. *Why the agency is there:* **corporate espionage and a missing agency asset**, which also gives the first two contracts. **Question 4** asks you to approve or replace the country.
- **Map:** the picture shows seven districts joined by avenues, **elevated walkways, rooftop routes and service tunnels** (vertical levels). The real map must follow the existing engine's limits on vertical levels (the game has multi-floor interiors and tower floors; **elevated streets are new** and need a decision: a second map layer joined by stairs and lifts, which the engine already does for towers; **Question 5**).
- **Cybernetics:** implants are items with **rules**, not cosmetics (examples: an eye that shows a target's route, a neural link that can be disrupted, a biometric lock that opens to a face, a security implant with an alarm channel). Each NPC role has a set of implants.
- **Hacking, with limits (the brief's requirement):** each action needs a **tool, access and skill**; each target has a **protection level**, a **detection chance** and a **countermeasure**; a failure **raises a security alert**; higher tiers need better equipment or earlier intelligence; **no action is repeatable without a cost** (a cooldown or a consumed tool). The effect of each action is a plain rule (for example "disrupt comms: the guard cannot call for help for 40 seconds and goes to find a colleague"), so outcomes are explainable.
- **Contracts (3 to 4, fully built):** retrieve classified data from a corporate tower; remove a protected target with implant-based security; find the silent asset; take down a surveillance network. Each with at least three approaches and optional objectives.

## 8. The noir city (PW-9)

- **City:** **Saint Halloran**, in **Westreach** (a rain-washed port republic, draft). **Three mobs** (drafts): the **Vantelli Family** (casinos and finance), the **Kestrel Dock Union** (smuggling and the docks), the **Black Lantern Society** (protection and political corruption). Each has a leader, lieutenants, members, businesses, territory, safehouses, money, dress, vehicles, reputation, police ties and rivalries; the **city template** holds all of it and the **mission instance** gets a copy.
- **Disguise and recognition** (a table, not a roll): an NPC checks **does it know the player**, **does it recognise the clothing**, **is the player in the right clothes**, **carrying anything suspicious**, **behaving right**, **is it a member of the impersonated group** and **has it a reason to doubt**; each factor adds suspicion; thresholds give *none, glance, follow, challenge, attack*. Disguises never give universal invisibility; restricted areas run their own stricter check.
- **Framing a rival:** an attack records **evidence tags** (clothing seen, vehicle, weapon, witnesses). A victim mob scores **who it blames** from the tags; weak evidence gives suspicion only, strong evidence gives retaliation.
- **Escalation, five stages exactly as in the brief:** Suspicion, Retaliation, Street Conflict, Open Mob War, Citywide Chaos; a number per pair of mobs, raised by incidents, **lowered over time and by deliberate calming acts** (a negotiation, a body found with the right evidence, a payoff). At stage 5 police pressure rises, civilians change behaviour and some businesses close.
- **Contracts (3 to 4, fully built):** a lieutenant at a private club; a ledger in a warehouse; a casino infiltration; a framing job; an extraction; evidence from a police room. Each open-ended.

## 9. Interface

Reuses the OberPad pattern from v0.83 to v0.90 (home icons, back arrow, minimal words): an **Atlas app** (map, zoom, details), the **Journal** inside the existing tablet (hidden until found), an **Agency app** (contracts, briefings, reports, reputation, completed operations), and a quiet **mission HUD** (objectives on demand, cues in the world). No screen is created that has no behaviour behind it.

## 10. Tests (all stages)

- **Preservation:** the existing suite **unedited** passes after every stage, except the single known edit (country count) at the Atlas, which is listed when made.
- **Parity:** with the expansion off (no agency contact, no quests started), a 200-day run matches the previous release's books.
- **Contamination:** after a mission with every allowed action, the template hash is unchanged, the extractor returns only the whitelisted keys, and the main random stream's state is unchanged.
- **Save and load** inside a mission, outside a mission, after an interrupted mission, and after a double extraction.
- **Quests:** no undiscovered fact in the journal; every approach reaches an end state; ignoring a quest breaks nothing.
- **Events:** every event reaches `cleaned`; no event outlives its participants; every news line has an event id.
- **Hacking:** every limit has a test that applies the action until it is refused (the `transaction_integrity` lesson).
- **Recognition and escalation:** the recognition table, monotone escalation, calming, and the framing rule.
- **Performance:** a budget (frames, memory, save size) set at PW-1 and checked at PW-11.

## 11. Risks

1. **Scope.** This is bigger than Politics and War combined. The plan therefore ships **small, complete releases**, and the brief itself prefers "fewer fully functional missions and a detailed city" to many shallow ones; I would build **three** contracts per city first, not eight.
2. **Elevated streets** in a 2D tile engine (Question 5).
3. **Art volume**: two dense cities with interiors, signs, implants and clothing sets. Art needs the reference image for Neumina and a reference for the noir look. The existing pixel pipeline is the target.
4. **Overlap with the Atlas release** (section 3).
5. **The random stream:** several tests are sensitive to the shared stream; every new random use gets its own seeded stream.
6. **Saves:** a stable-ID scheme for every new record, an empty-grant migration, and a size check; the quest and event state could grow, so both are bounded.
7. **Crime and finance stay separate:** a mission payment is **earned money** through the normal channels; agency reputation never feeds a lender, a rating or a valuation (brief 14.1).
8. **Content quality**: placeholder dialogue and generic contracts are the failure the brief names; each story and mission gets a short written design (who, what they want, three ways to resolve it, what changes) **before** it is built.

## 12. Questions that need your answer before any code

1. **Where does this sit in the roadmap?** (a) interleaved right after the Atlas, **ahead of Politics** (my recommendation, because the brief puts the world first) or (b) strictly after the War (v0.121 onward)?
2. **Atlas:** may v0.92.0 stay as planned and this expansion add a v0.92.1 city layer on top, so there is one atlas and not two?
3. **Atlas scale:** are four levels with a crossfade acceptable, or do you want a true continuous zoom (more work, more memory)?
4. **Neumina's country:** is the **Windfen League** (a technocratic corporate federation) right, or do you have a country in mind? And what does the reference image show (please describe it, or list what must be copied in spirit)?
5. **Vertical levels:** may elevated walkways and rooftops be **separate map layers joined by stairs and lifts** (as the towers already are), and not true overlapping 2.5D?
6. **A mission you abandon or lose:** nothing paid and a small designed reputation cost, or nothing paid and no cost?
7. **The noir city:** is **Saint Halloran** in **Westreach** with the three mobs named above acceptable (all names are mine and can change)?
8. **First batch:** build Stage PW-1 (the audit document, no code) first? It is the cheapest step and sets the baseline, the empty-building count and the performance budget that every later stage is tested against.

**Answered (2026-11-03):** Q1 after the War update; Q4 Neumina in a country of my choosing (Windfen League stays); Q5 separate map layers are fine; Q6 abandoning a mission costs nothing; Q3 four levels with crossfade; Q7 Saint Halloran and the three mobs accepted. Q2 (v0.92.1 on top of v0.92.0) and Q8 (audit first) are still open. So the release numbers become **after v0.120.0**, from v0.121.0.

Until you say "go" for a named stage, nothing here is built.
