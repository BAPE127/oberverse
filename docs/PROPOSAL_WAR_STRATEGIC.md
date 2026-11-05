# Proposal: the strategic war (battalions, provinces, supply) in detail

Status: **proposal; nothing in the game has changed.** This replaces the earlier, much smaller strategic sketch in `PROPOSAL_WAR.md`. All numbers below are **starting figures to calibrate**, not tuned values; the pictures are **target art** on the real atlas and the game's own sprites.

Pictures (`docs/mockups/`): `proposal-war-strategic-map.png` (the Halden Front), `proposal-war-supply.png` (supply map mode), `proposal-war-designer.png` (battalion template designer), `proposal-war-combat.png` (a combat overview), `proposal-war-oob.png` (order of battle with a soldier's record), `proposal-war-flow.png` (the whole loop), and the atlas pictures. Sources: `docs/mockups/src/war/` (`strategic.html`, `panels.html`) and `docs/mockups/atlas-src/` (`render.mjs` `provinces` mode).

## 1. The map: provinces on the atlas

- **Provinces** cut each atlas state into pieces by a jittered lattice about 1.7° apart: about **4,100 provinces on land worldwide** (corrected in v0.103.0: the 1,300 first written here did not match the lattice), about 100 in the Halden window shown. Each province has an id that never changes, a state, a controller, neighbours, and a terrain.
- **Terrain types**: plains, farmland, forest, hills, mountains, marsh, urban, desert, jungle, coast. They come from the atlas biomes and relief (the same functions as the pictures). Terrain scatter (trees, peaks, hills, farm squares) is drawn from the biome so the map reads as land.
- **Province data**: infrastructure (0 to 5; sets how fast supply moves and how fast you repair), rail (a line between provinces), port, airfield, fort level (0 to 5), victory points (a town or port), resistance, occupation, weather (rain, mud, snow, heat), and supply.
- **Zones**: sea zones for fleets and convoys (the Halden Gulf, the Ostmark Sea, ...), air zones for wings. They are coarser than provinces.
- **Rivers and roads** come from the atlas (generated and editable). Rivers give a crossing penalty to an attacker; bridges are structures that can be destroyed (the tactical layer writes this).

## 2. Units: a template is a recipe, a battalion is real

- **Battalion template** (`proposal-war-designer.png`): a grid of line slots (up to 5 columns by 5 rows, about 6 to 25 pieces) plus **support companies** (recon, engineers, medical, signals, logistics, anti-air) and **attachments** (an SP-gun battery, a helicopter). A slot takes only what the company may field: infantry sections from squads; tanks from your own works; APCs, AA vehicles, trucks bought or transferred; helicopters from your works; aircraft and missiles from Aerospace; artillery from suppliers or the Arms works; ships from the shipping company.
- **Raising a battalion** binds the template to **real items and people**: named squads, named tanks, a named commander. It fails if anything is short, and says what ("anti-air vehicle: none owned. Order or transfer"). No item is in two battalions. A battalion's strength is the sum of its parts, so a lost tank or a wounded soldier lowers it at once.
- **Order of battle** (`proposal-war-oob.png`) shows company → battalion → squad → soldier, and a soldier's record (training, experience, wounds, kit). It is the same saved record the base uses.

## 3. The stats and the combat rules

Per battalion (from its parts): **strength** (hit points: people and vehicle hull), **organisation** (cohesion), **soft attack** (vs people), **hard attack** (vs armour), **defence**, **breakthrough** (how well it exploits a gap), **armour**, **piercing** (against armour), **hardness** (share of armoured parts), **speed**, **combat width**, **reliability**, **supply use** and **fuel use** per day, **recovery rate**, **entrenchment**.

- **Combat width**: a front is wide enough for a number of battalions (the sum of widths up to the province's width plus a flank bonus); the rest wait as **reserve** and rotate in when a front unit's organisation falls. This is the screen in `proposal-war-combat.png`.
- **Hourly exchange** (inside a battle): each front battalion picks targets and deals `attack = soft × (1 − target.hardness) + hard × target.hardness`, reduced by the target's `defence`, terrain, river crossing, fort, entrenchment, weather, air superiority, and supply; **piercing** below the target's `armour` halves the damage, equal is normal, above gives a bonus. Damage lowers **organisation** first, then **strength**. A battalion with no organisation breaks and retreats.
- **Advance** is decided by `breakthrough` against `defence` over the battle's length; a won battle moves the front into the province and starts occupation.
- **Planning**: a plan drawn as arrows (attack or defence) takes time; once it is ready the order carries a planning bonus (up to about +20%) that decays if the order waits. Defence plans give entrenchment faster.
- **Intel**: a province is **unseen**, **spotted** (type and size of units) or **known** (equipment). Recon units, aircraft, **satellites from Aerospace's network** (a Watchtower or Cartographer improves it) and signals raise it. The battle window shows **estimates** ("about 900?") whose error shrinks with intel.

## 4. Supply and logistics (the map mode in `proposal-war-supply.png`)

- Supply flows from **hubs** (a base, a port, a rail head) along **roads and rail**, and by **ship**. Each province has a **supply** level; a battalion's **supply** equals the province's. Capacity per link depends on infrastructure; a destroyed bridge or a cut rail lowers it (the map shows a red mark).
- **Below about 70%** a battalion's attack and organisation recovery suffer; **below 25%** it starves (organisation falls, equipment wears). **Fuel** is separate and stops tanks and helicopters. **Ammunition** is spent in battle and by guns.
- **Convoys** are real trucks (and ships) moving real stock. A **resupply** order tops up a battalion from the nearest hub; it takes time and uses trucks.
- **Attrition** (winter, desert heat, mud) wears people and kit even without a battle. **Manpower** replacements come from the base's recruits, not from nowhere.

## 5. Orders, air, sea

- **Orders**: move, advance, defend, hold, withdraw, reinforce, resupply, recon, prepare an assault, garrison. They take time by `speed`, terrain, infrastructure and weather; zone of control stops a unit from walking through an enemy.
- **Air missions** (wings from Aerospace's aircraft; each aircraft is one real entity): air superiority, close air support, interdiction (cuts rail), strategic bombing (a bomber with real ordnance), recon, naval strike. A wing's range is measured from its airfield; losses are permanent.
- **Naval**: fleets (ships from the shipping company), convoy escort, blockade, shore bombardment, **landings** (infantry carried by real transports onto a coast province, with a combat penalty).
- **Helicopters** move troops between provinces within a short range.
- **Missiles** (Aerospace's Sentinel and Bastion; the Arms works' Longbow) strike a province's structure (a depot, a bridge, an airfield) and consume stock.

## 6. How wars run

- **Starts** (from the politics update): disputes become tension, sanctions, escalation, war (a chain, not a dice roll).
- **AI nations** fight with **force pools** from their budget and income, in coarse **weekly** battles on border provinces. The result changes controllers, the map and the geo-event severity, so the arms market, shipping, bonds and the exchange see it. AI wars are neither required nor predetermined.
- **War goals and ending**: a province or victory-point goal; ceasefire when exhausted; occupation, **resistance** and garrisons. Your contract may end it.
- **Contracts** (from an embassy or client): "hold the crossing for 21 days", "escort the convoy", "take the port". They check what you own; they pay, may penalise, and move reputation.

## 7. The two ways to play an engagement

When forces meet, an **engagement** opens with a clock and one choice (play it yourself, let a general fight it, or withdraw). Play it: the overhead battle (see `PROPOSAL_WAR_TACTICAL.md`). General: the same combat function at aggregate. Either way the result is written **once**; the engagement moves `open → tactical|delegated → resolved`.

## 8. User interface (what the target screens have)

Resources bar (manpower, fuel, ammo, supplies, tanks ready, helicopters, aircraft, missiles); left **order of battle**; right **selected battalion** (stats, what it is made of, orders, Play battle); **province tooltip** (terrain mods, controller, supply, garrison estimate); **map modes** (terrain, control, supply, weather, air, naval, intel, contracts); **plans** bar; combat markers on borders with the odds; figurines with a flag, a number, and strength and organisation bars; air zones; ships. The OberPad keeps the administration (transfers, production, generals, contracts); the map is where you command.

## 9. Data, performance and saves

`world.military.war` holds provinces' controller and garrison, battalions, orders, engagements and a capped log. Active theatres tick **hourly**; everything else **daily**; AI wars **weekly**. About 300 provinces are active at once. The province raster is one image and a lookup table (the pictures use exactly that), figurines are cached sprites, and banners are drawn from data. Save size is small (province state is a few numbers each).

## 10. Release plan additions

| Release | Adds |
| --- | --- |
| v0.117.0 (11a) (built as v0.103.0, v0.103.1 and v0.103.2) | provinces, controllers, terrain and the map screen with modes; the template designer and raising a battalion from real items; orders and movement; supply and hubs; the engagement window; AI nations' weekly battles; the order of battle |
| v0.117.1 (11b) | air wings, naval fleets and convoys, landings, helicopters moving troops, intel levels and satellites, international contracts |
