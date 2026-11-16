# Special Operations — design

**Status (2026-11-16):** design for the owner's approval, plus the first built pieces (Neumina's levels in 3D, v0.107.0 in progress: the Sump and the Crown built as the first slice of the five-level city; the middle three still the first cut). Nothing in sections 3 to 7 is built yet.

The owner's brief (2026-11-16): scratch the roadmap and develop **Special Operations**: spy missions the player plays in person, in sandbox levels where a target can be reached many ways (the feel of the stealth-assassination games), with **cyber hacking** of the city's devices (the feel of the hacker-in-a-surveillance-city games), starting with **Neumina**, a dystopian megacity of stacked levels with bridges from which you see the levels below (the feel of the neon megacity of cyberpunk fiction and of a planet-wide city of towers). Those works are **tone references only**: every name, faction, mechanic name, interface and piece of art here is the Oberverse's own.

Until 2026-11-15 "Special Operations" meant the war company's tactical battles; those keep the name **battles**.

**Owner's decisions of 2026-11-16 (second round):** every Special Operation takes place in the **Free Territories** (`ATLAS.countries.free`: Neumina stands in the Windfen Plains, `fr_windfen`; later cities for contracts are also to be Free Territories, never Sund or a named country). The city has **five levels with a class difference**: the lowest a slum, the fifth the richest, a city above the clouds; each level has **its own landmarks and points of interest** and a **clear way up and down** (a place, not a bare door). Levels need not be drawn from one another.

Decisions already on record that hold here (`POST_WAR_EXPANSION_PLAN.md`, answered 2026-11-03): Neumina is in the **Windfen League** (the Windfen Plains, a Free Territory); a city's levels are **separate maps joined by stairs and lifts**; **abandoning a mission costs nothing**; the **template / instance rule** (section 3).

---

## 1. Neumina, the city

**The Windfen League's capital: a megacity in levels.** Chartered firms govern; the higher you live, the more of the sky you own.

| Level | Map | What it is | Landmarks | Way up / down | Built |
| --- | --- | --- | --- | --- | --- |
| 5 | `neumina_crown` | **The Crown**: white stone platforms over a sea of cloud; always sunlit; the chartered families' own sky | The Spire (the gala), the Mirror Pools, the Sky Garden, the Yacht Pads, the Halo Observatory | the Crown lift (gold doors, a doorman) to the Terraces | ✅ slice |
| 4 | `neumina_terrace` | **The Terraces**: gardens and clubs round the towers' upper floors; the comfortable rich | the Halcyne Garden, the Aurum Club | the Crown lift up; a glass lift down | first cut |
| 3 | `neumina_skyway` | **The Skyway**: steel decks and bridges between the towers; the working city, transit, corporate lobbies | the Transit Hall, Static Noodles | lift up, stair tower down | first cut |
| 2 | `neumina_street` | **The Gutterline**: avenues in the towers' shadow, arcades, night market, clinic, traffic | the Night Market, Chrome Alley, the Underpass Clinic | stair tower up; the Chain Lift down | first cut |
| 1 | `neumina_sump` | **The Sump**: the bottom; the towers' foundations in the wet and a town of sheet metal between them; never daylight | the Drain Cathedral, the Scrap Bazaar, the Pit, Mother Kettle's | the Chain Lift (a freight cage) up | ✅ slice |

- **Each level its own sky** (`def.atmos`): `dark: [min, max]` clamps the darkness the eye sees (the Sump is always night, the Crown always day; the clock and the rules keep the real time: `src/engine/atmos.js`); `bg` the background; `clouds` the Crown's cloud sea (`src/engine3d/skyline3d.js`); `skyline` the city beyond the Gutterline. `def.edges` gives a level's drops their lit lip without a level drawn below.
- **Seeing down** (the first cut; optional since 2026-11-16, kept between the Gutterline, the Skyway and the Terraces). From those levels the levels below show through the drops: the deck's edge has a lit lip, a haze lies between levels, and the towers rise from the street through every level. Levels above you are not drawn. (Built: `src/engine3d/world3d.js` `def.below`, `src/engine3d/levels3d.js`; the drop tile `O`; a pixel check in the smoke test.)
- **The towers** (data in `src/content/maps/neumina.js`): Halcyne Spire, Orrel Data Exchange, Vantor Biotic, Kessin Arcology, Lumen Freight Stack, the Meridian Lattice, Synth Court, Dace & Morrow Holdings. Each is a chartered firm and a mission venue.
- **Getting between levels.** Public stair towers and lifts (free, watched); service lifts and maintenance ladders (restricted, need a disguise, a keycard or a hack); jumping down is not possible (the drops are solid).
- **Still to do for the city:** the middle three levels redone in the same spirit (each its own layout and class: the Gutterline's market, the Skyway's offices, the Terraces' gardens); the old 'Underworks' idea is now the Sump; interiors for the towers' mission floors (lobby, offices, a server floor, a penthouse); traffic and air-cars; neon signage and holographic billboards as props; crowds with schedules.

## 2. How a mission is reached and ended

- **The contract.** Missions are offered by a handler (proposal: the **Lantern Desk**, a private intelligence broker with a back office in Halvermouth; the agency of the old plan, smaller). The contract screen gives a briefing that is deliberately incomplete, the pay, and the optional objectives.
- **Travel.** Accepting starts a **mission run**: you arrive in Neumina at a chosen insertion point (transit hall, a freight lift, a rooftop drop if you have bought it). Neumina is reached only through a mission for now (no free travel), so its world cannot leak into Sund's.
- **Leaving.** Through an extraction point (each mission has two or three). Complete or not, the run ends and you are home. Abandon from the pause menu at any time: nothing paid, no cost.
- **Rating.** Each run is scored on what the contract asked (target, item, no witnesses, no bodies found, no alarms, no hacking traced) and pays a bonus for each optional objective. No single "correct" way.

## 3. The rule that keeps missions from leaking: templates and instances

Exactly as in `POST_WAR_EXPANSION_PLAN.md` section 5, with what v0.106.0 added:

- **The city is a frozen template**; a run holds only **overlays** (people's health and place, clothes, doors, devices, alarms). Neumina's people are **not** world characters (they never enter Sund's simulation, gossip, knowledge or schedules): they are made per run, like the Army's soldiers (`profile.transient`).
- **A run has its own clock and its own random stream**, seeded from the run id; the main game's random stream does not move.
- **What a run must not touch:** Sund's police record and wanted level, the Army, `world.breaches` (a hole blown in Neumina is the run's), reputation, gossip and knowledge, containers and props state, the daily ticks of the businesses (the main clock is paused while a run lasts; proposal: a run takes no Sund time).
- **What comes out, once:** done or not, pay, the handler's standing, intelligence files, unlocked contracts, kept equipment. Paid once per run id.
- **Saving mid-run** saves the run's overlay; loading offers resume or abandon.
- **The test that guards it:** a run in which the player does everything allowed (kills, steals clothes, hacks every device, blows a wall, sets off every alarm) leaves the world's hash and the main random state exactly as before, and pays only the whitelisted results.

## 4. Being someone else: disguise and suspicion

A table, never a roll. Each Neumina person checks, when you are in sight:

| Factor | Adds suspicion |
| --- | --- |
| They know your face (the target's guards, someone you spoke to as yourself) | a lot |
| Your clothes do not belong where you are (a courier on a server floor) | a lot |
| Your clothes belong, but they know everyone who wears them (a guard among guards) | some |
| You carry something that shows (a rifle, a body, a stolen case) | a lot |
| You behave wrong (running, crouching, in a restricted room, near a body, picking a lock) | some to a lot |
| An alert is on | doubles |

Thresholds: **nothing**, **a look**, **follow you**, **challenge you** (talk your way out with a skill check that is a rule, or comply), **raise the alarm**. A disguise is taken from a person you have put down (or from a locker, a laundry, a delivery). It never makes you invisible: people of the same uniform see through it faster. Restricted areas (a server floor, a penthouse) run a stricter check.

## 5. Hacking: the Splice

The player's own deck, the **Splice**, worn on the wrist (bought and upgraded at home). The city's devices sit on **grids** (one per building or district); a device is reached by **proximity** (in sight, within range) or through a **port** (a physical jack on the grid, often in a restricted place) that opens the whole grid.

Every action is a rule with:

| Part | What it means |
| --- | --- |
| **Tool** | the Splice's module it needs (Loop, Spoof, Lock, Burn, Ghost, Puppet…) |
| **Access** | in sight, or on the grid through a port |
| **Skill** | the Splice's tier against the device's protection |
| **Detection** | each action adds **Trace** to the grid; at full trace the grid's security knows where you are |
| **Countermeasure** | a grid's ICE: a cooldown before the next action, a lockout, or a counter-trace that marks you |
| **Cost** | every action spends **Charge** (recharges slowly, or with a cell) and most have a cooldown: nothing is free or repeatable at will |

The actions (effects are plain and explainable):

| Action | Target | Effect |
| --- | --- | --- |
| **Loop** | camera | it shows the last 20 seconds; you are not seen by it for that time |
| **Spoof** | door, gate, turnstile, lift | opens it once as if a keycard had been shown; a lift to a floor you have no right to |
| **Lock** | door | seals it for 60 seconds (behind you, or on a guard) |
| **Ping** | phone, comms | a person's phone rings: they step aside to take it (out of a crowd, away from a post) |
| **Burn** | light, sign, vending machine, power box | it sparks and goes dark: people come to look, the dark hides you |
| **Mute** | a guard's radio | they cannot call for help for 40 seconds; they go to find a colleague |
| **Puppet** | a drone, a turret, a cleaning bot | for 20 seconds it does what you say (move, look away, fire at a marked target) |
| **Ghost** | yourself | the grid stops counting you for 30 seconds (needs a top-tier Splice) |
| **Pull** | a terminal, a server | copies data: the intelligence a mission asks for, or a file that opens another way in |
| **Short** | an implant (see 6) | disrupts it: a guard's targeting eye blinks, a courier's neural link drops |

**Grid view:** pressing the Splice key slows time and shows the grid's devices in range as outlined icons with their protection and the trace they would add; you pick one and an action.

## 6. Implants

People in Neumina carry implants, and they are rules: **targeting eyes** (guards see further at night; Short blinds them for a few seconds), **neural links** (a courier or an executive can be Pinged at any distance on the grid; Short drops them unconscious for a moment), **biometric locks** (a door opens to one person's face: their body, or a Spoof with a sample from their terminal), **alarm channels** (a security implant calls the grid when its wearer goes down unless it is Muted first). The player can buy implants too (proposal): a **jack** that lets the Splice open a port without a cable, a **dermal mask** that holds one face for a disguise, an **ear** that hears radio chatter through walls.

## 7. The missions (first set)

Each has at least three approaches, opportunities you find by listening, reading and hacking, and optional objectives. All are in Neumina.

### 7.1 The Spire Gala (elimination) — the Terraces and Halcyne Spire
**Target:** Ilse Varrow, Halcyne's chief of security, who sold the Lantern Desk's agent to a rival. A charity gala in the Garden Pavilion and the Spire's upper floors.
- **Approaches:** pose as a caterer (uniform from the staff lift) and serve her the drink she always takes at 22:00; Loop the pavilion's cameras and use the maintenance walkway over the drop where she takes her calls (a railing that a Burn on the power box weakens: an "accident"); Puppet the Spire's cleaning drone onto her balcony; take a security uniform, reach her office through the server floor (Pull her schedule first), and wait.
- **Opportunities:** her assistant's neural link (Ping him to get her schedule), the florist's delivery (a way up), the sommelier's argument with the caterer (overhear it).
- **Optional:** no one else harmed; no camera ever records you; leave by the same lift you came.

### 7.2 Glass Ledger (data theft) — the Skyway and the Orrel Data Exchange
**Objective:** copy the Exchange's settlement ledger from a server two floors under the trading floor.
- **Approaches:** through the transit hall's freight lift with a courier's uniform; through the Exchange's port on the Skyway (a maintenance kiosk) and a Ghost run across its grid; through the Underworks' cable vault (later level) into the server floor from below; social: get an analyst's badge by returning her lost phone.
- **Complication:** the server room's grid has a counter-trace: Pull too fast and it marks you; the building locks down and you leave by another route.
- **Optional:** leave a false trail (Pull a decoy file that points at Vantor Biotic); never set off the lockdown.

### 7.3 The Quiet Asset (find and extract) — Street Level and the night market
**Objective:** find the Desk's missing agent, "Wren Sable", who has gone dark somewhere in the street level, and bring her out alive.
- **How:** she is not on any map marker. Clues: a noodle seller who knows her face, a clinic's records (Pull), a pawnbroker holding her Splice, her neural link's last ping. She is held in the back of the Underpass Clinic, or moved if you are noticed.
- **Approaches:** buy the information; hack it; follow the man who collects the pawnbroker's takings; burn the clinic's power and carry her out in the dark.
- **Optional:** recover her Splice; nobody at the clinic knows you were there.

### 7.4 Blackout (sabotage) — all three levels
**Objective:** take down Kessin Arcology's surveillance net for one hour, so the city's dissidents can move.
- **How:** three relay nodes on three levels (a Skyway transit pylon, a Street Level junction box, a Terraces rooftop dish), each guarded differently; or one master port inside Kessin's tower that does it all at once but is the hardest place in the city.
- **Optional:** do it with no one killed; leave Kessin's own cameras running so they see nothing.

### 7.5 A Courier's Last Run (intercept) — moving target across the levels
**Target:** a Lumen Freight courier carrying a case from the Terraces to a buyer on Street Level by lift, bridge and stair.
- **Approaches:** take the case in a crowd on the Skyway (pickpocket, a rule with a chance only when the courier is distracted by a Ping); stop the lift between levels (Spoof, then Lock); swap the case for a fake at the kiosk where he buys noodles; or simply follow him to the buyer and take both.
- **Optional:** the courier never knows; the buyer is identified (Pull his phone).

## 8. Releases (proposal)

| Release | Contents |
| --- | --- |
| **v0.107.0 Neumina: the City** (in progress) | The three levels in 3D with bridges and the view down (done), Neumina's look (deck plating, lit edges, signage, more density), tower lobbies, crowds; how a mission run starts and ends with the template/instance rule and its contamination test |
| **v0.108.0 The Splice and the First Contract** | Hacking (the grid, the Splice, the actions above with their limits), disguise and suspicion, Neumina's people as run-local characters, the Lantern Desk's contract screen, **mission 7.2 Glass Ledger** end to end |
| **v0.109.0 More Contracts** | 7.1, 7.3, 7.4, 7.5 on the same systems; implants; the Underworks |

## 9. Questions for the owner

1. **Who hands out the missions?** The Lantern Desk (a small private broker, proposed above), the old plan's larger government agency, or your own company's intelligence arm?
2. **Does a mission take time in Sund?** Proposal: no (the world waits while you are away), which also keeps businesses and politics from moving underneath you.
3. **Lethal or not:** may every mission be done without killing anyone (proposal: yes, always one way), and should killing lower the pay?
4. **The first contract to build:** Glass Ledger (data theft, the best showcase for hacking) as proposed, or the Spire Gala (the elimination, the best showcase for disguises)?
