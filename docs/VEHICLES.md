# Cars, transport, streets and police chases (v0.16.0–v0.20.0)

Owner's answers (transportation interview): drive cars yourself; ride the bus for real (v0.17.0); new original dealer NPCs; extras: hitting people, car theft, NPC traffic (v0.17.0). Not chosen: fuel and repairs. Bus fare: 2 obols.

## Driving

| Key | |
| --- | --- |
| E by your car | Get in |
| W / ↑ | Accelerate (forward) |
| S / ↓ | Brake, then reverse |
| A / D | Steer (bites harder with speed; reverses when reversing) |
| Shift | Handbrake (sharper turns) |
| H | Horn |
| E | Get out (beside the car, wherever there's room) |

Cars keep their position, angle, owner and plate in `world.vehicles.cars`. They collide with walls, solid props, building doors and each other (oriented boxes), cross seamless map seams and drive through region gates (arriving facing away from the gate). Off-road (grass, sand, mud, dirt) caps speed at 60%.

**Handling (v0.20.0).** The wheel (`car.wheel`) turns in over ~0.15 s rather than snapping. The car travels along `car.travel`, which the tyres pull towards the heading quickly at low speed and less quickly at high speed; on the handbrake they barely hold, so the tail swings out. While sliding (`car.slip`) the car scrubs off speed and, above ~110 px/s, lays tyre marks (`Vehicles.skids`, runtime only, fading in 14 s). The front wheels are drawn steered.

## Models (`src/content/vehicles.js`)

| Model | Dealer | Price | Top | Accel | Grip |
| --- | --- | --- | --- | --- | --- |
| Halver Pipit (hatch) | Fender's | 420 | 250 | 190 | 2.7 |
| Morrow Dray Estate | Fender's | 680 | 270 | 175 | 2.4 |
| Ostley Mule Pickup | Fender's | 900 | 265 | 185 | 2.3 |
| Beaumont Aurelia (saloon) | Beaumont | 6,500 | 400 | 330 | 3.2 |
| Halcyon Tempest GT | Beaumont | 11,000 | 450 | 410 | 3.4 |
| Vantaggio Corsair (coupé) | Beaumont | 18,500 | 480 | 520 | 3.8 |
| Sterling Regent Limousine | Beaumont | 26,000 | 360 | 250 | 2.4 |
| Halvermouth Police Cruiser | — (steal only) | | 430 | 380 | 3.3 |

Speeds in px/s: walking is 128, sprinting 196. The HUD shows mph (× 0.105).

## Dealerships

- **Fender's Pre-Loved Motors** (Westbrook Row) — Marty Fender. Buys any car parked on the lot at 40% of list; stolen at 30%. "Fresh plates" (150) clear a stolen car's history.
- **Beaumont Motor Gallery** (Halvermouth, East End) — Julian Beaumont. Part-exchange at 55%; never stolen cars.

Bought cars are delivered to the forecourt. Talk to the dealer to open the panel (effect `{ dealer: 'fender' | 'beaumont' }`).

## People and the law

- Hitting someone above 70 px/s hurts them (0.26 damage per px/s, lethal above 330) — an assault with witnesses, as in `combat.hitNpc`. Slower, they're nudged.
- **Imported (protected) characters are never harmed**: the car stops. It isn't a direct attack, so there's no Wrath.
- Hotwiring anyone else's car takes 2.5 s (less with finesse; moving cancels it): `fact_player_car_theft`, severity 3. Officers who see you in a stolen car raise the Wanted level and chase. If you're jailed, stolen cars the police have flagged go back to their owners. Dealers restock stolen display cars the next morning.

## The No. 1 bus (v0.17.0)

Three buses on one loop (`src/content/transit.js`, world tiles): Mill Road Yards → Mill Road (the Sumps) → Civic Plaza → the East End → Westbrook Row → Gullwing Road → Ober's Oil Refinery, then back the same way. 230 px/s, 8 game minutes at each stop, about 216 game minutes for the loop — a bus every 70-odd minutes in each direction. Fare 2 obols (the owner left it to my judgement: cheap, but not nothing when you start with 12).

- E at a stop's sign: the next bus and its direction; **Wait for the bus** passes the time until it arrives.
- E near a waiting bus: board (pay the fare). You ride it for real — the bus drives, the camera and HUD follow, and you change map with it.
- E while it waits at a stop: get off beside that stop's sign.

## Traffic (v0.17.0; reworked in v0.20.0)

Seven cars, left-hand traffic, on rounded routes: two round Halvermouth's northern blocks, one round Market Street (closed rings that never leave the city), one each way through the city between the East Gate and Mill Road, and two on the coast road from the Halvermouth gate round Wellhead Circle and back. A car on an open route drives off the map at its far end and another drives in after the route's `gap` (game minutes) — nobody U-turns at an edge. Near you they stop for anything in their lane and for red lights; they honk only after 3 s stuck behind *you* (at most once per car per 15 s, once every 9 s overall). Your car collides with them. E beside a stopped one carjacks it (car theft); it rejoins the traffic two hours later.

## Streets (v0.20.0)

- **Four-tile roads.** Maps are authored with 2-tile roads; `src/world/widen.js` widens the roads listed in `ROADS` at load (duplicating each road's first line twice and moving everything beyond it). Author map content in the old coordinates; content that refers to map tiles from elsewhere (transit, parked cars, dealers) is shifted with `CONTENT.roadShifts`. Lanes: on a road whose authored first line is r, the north/west lane centre is `fy(r) + 1`, the south/east `fy(r) + 3`.
- **The network.** Every road joins up and only meets a map edge at a gate or seam (a test checks this); dead ends are turning circles ('m') with a statue, fountain or bollards.
- **Traffic lights** (`src/world/lights.js`). Junctions are listed in `src/content/transit.js` (`LIGHTS`). One 22 s program, offset per junction: east–west green 0–9, amber 9–11; north–south green 11–20, amber 20–22. Traffic and buses stop at red and at amber unless already within 26 px of the line. People on the kerb wait for WALK (the green half of the phase that runs with their direction, minus the last 3 s) — unless they're on a call, fighting or fleeing. Running a red is not a crime. Police cruisers ignore lights.
- **Pavements.** Solid props standing wholly on pavement (',') are walk-through for people and still solid for cars (`GameMap.carBlock`). Pathfinding charges ×6 for carriageway and ×1.1 for crossings (`GameMap.walkCost`).

## Police chases (v0.18.0)

`src/systems/pursuit.js`. While you're Wanted, outdoors, and the police have seen you in the last hour (game time):

| | |
| --- | --- |
| Cruisers | One per star, spawned out of view on a road 16–28 tiles away. Real cars on the shared physics; A* along roads, straight at you within 8 tiles. ★ drives carefully; ★★★ rams. |
| Caught | In a car: stopped or pinned beside a cruiser for 2 s (pulled over). On foot: a cruiser within 150 px for 1.6 s (cuffed). On the bus: at the next stop. |
| Escape | Out of every cruiser's sight for 12 s → they search your last position for 20 s → they leave. No new cruisers until someone sees you again. They never follow through region gates. |
| Rules | Police drivers brake for pedestrians and never hurt them; traffic pulls over for them; a chasing cruiser can't be stolen; chases aren't saved. |
