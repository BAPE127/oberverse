# Ships (v0.21.0)

Cargo ships sold by **Halver Marine Brokers** (the terminal's Brokerage page). Every stat lives in `CARGO_SHIPS` / `CARGO_CLASSES` in `src/content/logistics.js`; a vessel's effective stats come from `Logistics.stats(vessel)` (the shipyard's components will modify them later).

| Class | Size | Wear | Upgrade slots | Notes |
| --- | --- | --- | --- | --- |
| Low End | 1 | ×1.2 | 1 | fits any port |
| Medium End | 2 | ×1.0 | 2 | |
| High End | 3 | ×0.8 | 3 | needs a commercial port or bigger |
| Super High End | 4 | ×0.7 | 4 | needs a heavy cargo terminal or advanced port |
| Futuristic | 3 | ×0.4 | 5 | berths **only** at advanced ports |

| Ship | Class | Price | Units | Knots | Range km | Reliability | At sea /day | In port /day | Tags |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Gullwing Cutter | Low | 6,000 | 20 | 13 | 10,000 | 90% | 70 | 15 | — |
| Tide Runner | Low | 8,500 | 14 | 22 | 7,000 | 86% | 95 | 18 | express |
| Lantern Coaster | Low | 9,500 | 28 | 12 | 12,000 | 97% | 80 | 18 | — |
| Westbrook Freighter | Medium | 22,000 | 60 | 15 | 17,000 | 92% | 180 | 40 | heavy |
| Bluecap Container Ship | Medium | 27,000 | 75 | 17 | 18,000 | 90% | 210 | 45 | container |
| Morrow Reefer | Medium | 30,000 | 45 | 18 | 17,000 | 91% | 230 | 55 | reefer |
| Iron Quay Carrier | High | 68,000 | 140 | 16 | 24,000 | 93% | 420 | 90 | heavy, container |
| Longshore Bulk Carrier | High | 61,000 | 180 | 13 | 26,000 | 94% | 380 | 85 | bulk |
| Grand Meridian Superfreighter | Super High | 165,000 | 420 | 18 | 40,000 | 95% | 980 | 220 | heavy, container, bulk |
| Starwake Advanced Freighter | Futuristic | 340,000 | 220 | 34 | 80,000 | 99% | 520 | 160 | express, reefer, container, advanced |

Time at sea: hours = km ÷ (knots × 1.852) ÷ 6 (`LOGISTICS.seaTime` compresses the oceans). The Gullwing Cutter reaches Port Lirre (7,000 km) in about two days.

**Tags** unlock contract types: reefer → refrigerated goods; heavy → machinery; advanced → specialised cargo. Bulk loads start at 60 units.

**Delays**: each ~1,000 km leg has a (1 − reliability) × 35% chance of a 6–18 hour delay (×1.6 below 50% condition).

**Balance intent**: a busy Gullwing Cutter clears about 1,500 obols a day on general cargo, against about 275 a day of upkeep for the starting company. Bigger ships earn more per trip but cost more idle; the Starwake is fast, reliable and cheap to run but needs an advanced port (150,000) at both ends of its work. Warships: see below.

## Warships (v0.23.0)

Sold by **Kestrel Naval Surplus & Sons** (the Warships page). `WARSHIPS` in `src/content/logistics.js`. Combat numbers (0–100) feed piracy defence, escort strength and mission fitness — and are what a future playable encounter would use.

| Ship | Family | Price | Hold | Knots | Range km | At sea /day | Size | Attack | Defence | Detection | Stealth | Mounts | Roles / bonus |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Schooner | Sail | 12,000 | — | 14 | 8,000 | 60 | 1 | 15 | 15 | 25 | 30 | 2 | coastal, escort |
| Brig | Sail | 30,000 | 8 | 12 | 14,000 | 110 | 2 | 25 | 30 | 25 | 15 | 6 | escort, patrol |
| Galleon | Sail | 90,000 | 40 | 9 | 20,000 | 260 | 3 | 30 | 40 | 20 | 5 | 16 | escort, patrol, transport |
| Man-o'-war | Sail | 180,000 | 15 | 10 | 20,000 | 480 | 3 | 55 | 60 | 30 | 5 | 40 | escort, patrol |
| Patrol Skiff | Modern | 7,000 | — | 30 | 3,000 | 50 | 1 | 10 | 8 | 20 | 40 | 1 | coastal, recon |
| Corvette | Modern | 38,000 | — | 26 | 9,000 | 160 | 2 | 35 | 30 | 45 | 30 | 3 | escort, patrol, recon |
| Frigate | Modern | 72,000 | — | 25 | 16,000 | 260 | 2 | 45 | 45 | 55 | 20 | 4 | escort, patrol · ★ Fleet communications |
| Destroyer | Modern | 150,000 | — | 32 | 14,000 | 520 | 3 | 70 | 60 | 60 | 20 | 6 | escort, patrol |
| Cruiser | Modern | 230,000 | — | 26 | 30,000 | 700 | 3 | 70 | 70 | 75 | 10 | 8 | escort, patrol, recon · ★ Fleet support |
| Battleship | Historic | 320,000 | — | 18 | 15,000 | 1,200 | 4 | 95 | 90 | 40 | 0 | 12 | escort |
| Starwatch Sentinel | Futuristic | 450,000 | — | 40 | 60,000 | 600 | 3 | 70 | 75 | 90 | 85 | 4 | escort, recon, patrol · ★ Hazard sensors · advanced port or naval base |
| Aegis Bastion | Futuristic | 600,000 | — | 30 | 60,000 | 800 | 4 | 60 | 95 | 95 | 30 | 6 | escort, patrol · ★ Aegis network · advanced port or naval base |

A warship with a hold (brig, galleon, man-o'-war) can carry contract cargo up to its hold; the rest carry none. Cargo ships have modest defensive numbers by class (low 5 … futuristic 30 defence; the Starwake's stealth 40).
