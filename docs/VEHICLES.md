# Cars and transport (v0.16.0)

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
