# The arms trade (v0.13.0)

Source: `src/systems/arms.js` (extends the factory engine in `src/systems/factory.js`), `src/content/arms.js` (items, stations, recipes, research, works, quirks, countries), `src/content/maps/yards.js`, `src/ui/terminal.js` (terminal and globe), `src/content/characters/lucas.js`, `src/content/dialogue/lucas.js`.

## Getting in

1. Buy any gun from **Lucas Eastrise** at **Pipecreek Armory** (Iron Row, Halvermouth). This sets `bought_gun_lucas`.
2. Talk to him: he pitches the business. Accept (`arms_pitch_accepted`).
3. He sells an **arms licence** for 500 obols (`arms_licence`). Grey market: making and exporting is licensed; selling to embargoed countries is a crime (v0.14).
4. **Mill Road Yards**: through the gate at the west end of Mill Road. Three works for sale at their signs:

| Works | Price | Power | Bunks |
| --- | --- | --- | --- |
| Yard 1 Works | 2,500 | 3 | 4 |
| Yard 2 Works | 6,000 | 4 | 6 |
| Foundry Hall | 12,000 | 6 | 10 |

## Inside a works

- **Terminal** (the rotating globe):
  - **Parts and Equipment**: orders arrive on the **loading dock** in 60 minutes.
  - **Staff**: hire, assign, bonus, fire. Applicants are refreshed daily.
  - **Research.**
  - **Market**: values, Lucas's prices, the countries.
- **Workstations** (placed with B, 2×2, one recipe each, chosen with E): CNC Lathe, Assembly Bench, Electronics Bay, Explosives Bay, Rocket Bay, Drone Bay, Research Lab. Belts, inserter arms and generators work exactly as in the calculator factory. v0.37.0, more Factorio: inserters, sorters and belts are walked over (belts carry you); **storage chests** (Wooden 100 / Iron 300 items) buffer parts and products between lines; a **Filter Inserter** moves only its item; a **Belt Sorter** sends its item off to the right and the rest straight on (unfiltered: a splitter). Set filters with E.
- **A station only works while an employee is assigned to it and standing at it on shift.** Speed = (0.4 + 0.2 × skill) × (0.5 + morale/100) × quirk × research.
- **Export cage**: put finished weapons here by belt or by hand.

## Chain

Parts: steel, polymer, springs, optics, electronics, Li-ion pack, propellant, high explosive, rocket motor, guidance chip, airframe.

| Station | Recipes |
| --- | --- |
| Lathe | barrel, receiver, stock & grip |
| Explosives Bay | warhead |
| Electronics Bay | seeker head (Inertial Guidance), flight controller (Avionics) |
| Assembly Bench | crates of pistols; of SMGs, shotguns, assault rifles, sniper rifles, LMGs, RPG launchers (each behind research) |
| Rocket Bay | crates of RPG rockets, Skylance guided missiles, Longbow cruise missiles |
| Drone Bay | crates of Hornet attack drones, Kestrel strike drones |
| Research Lab | research points (0.05 × rate per minute) |

### Crates (v0.19.0)

Since v0.19.0 every weapon recipe makes a **crate**: one standard lot, worth `CRATE.units` (5) weapons, made from 5× a weapon's inputs in 3× its time. You only count crates. Single weapons for yourself come from the **armourer's workbench** by the loading dock: one weapon, or a box of its ammunition (9mm ×20, shells ×8, rifle ×10, an RPG rocket), straight from raw parts on the dock, taking 15–150 minutes of your time; research locks apply, and "Order missing" sends for what you're short.

## Research

Five branches, 21 nodes (`ARMS_RESEARCH`):

- **Manufacturing**: speed, +10% price on everything, parts −15%.
- **Small Arms**: unlocks, plus +15% / +20% price.
- **Heavy Weapons**: RPG, plus +20% price.
- **Guidance & Electronics**: seekers, avionics, missiles, +20% price.
- **Drones**: two drones, plus +25% price.

One project at a time, fed by every staffed lab.

## Staff

Procedurally generated: name, look, four skills (one speciality 3–5), an optional quirk (perfectionist, speed demon, workaholic, chatty, butterfingers, ex-military, tinkerer, penny-pincher, prodigy, night owl) and a wage.

- They live in the works (bunks) and never leave it: 07:00–19:00 shift, night owls the reverse.
- **Payroll at 19:00:**
  - unpaid: morale −25
  - unpaid twice, or morale under 15: they quit
  - working: morale −2 a day; idle: +3
  - a bonus (a day's wage): +15

## Selling (v0.13)

Lucas buys any arms item — crates or single weapons — at **65% of its value** (half before v0.82.0; `INCOME.business.wholesaleShare`), raised by research, up to **15,000 obols a day** (2,500 before v0.19).

# The global market and heavy weapons (v0.14.0)

Source: `src/systems/market.js`, `src/systems/heavy.js`, the Market tab in `src/ui/terminal.js`; data in `src/content/arms.js` (`COUNTRIES`, `SHIPPERS`, `MARKET`, `HQ`).

## Countries and wars

There are eight fictional countries, each with:
- a budget, daily income (×1.5 at war, capped at 3× base) and wants (a price multiplier per family: small, heavy, missile, drone)
- an aggression score and rivals

**Daily tick (06:00):**
- Budgets grow.
- Saturation fades 30%.
- Hostility fades 5.
- A war older than 5 days ends with a 15% chance.
- An idle country starts a war with an idle rival with a chance of 5% × aggression. With a 40% chance the aggressor is embargoed for the war.
- Standing sanctions lift with a 2% chance a day.
- Every change makes a news line on the terminal.

The game starts with Varnistan and Caldera at war, and Pallas under sanctions.

**Price** = arms value (with research) × wants × war boost (small 1.5, heavy 2, missile 2.5, drone 2.2) × (1 − saturation) × (1 − hostility/200).
- Saturation rises by 0.02 per unit delivered, up to 0.6.
- At hostility 60 or more, a country refuses to buy.

## Shipping

**Orders (v0.19.0).** Every day each country posts purchase orders — 1–2 at peace, 3 at war — of **5–50 crates** of one weapon at a locked price per crate (today's price plus up to 15%), within its budget, weighted by what it wants and what you can make. They expire after 3–7 days. On the terminal's Market tab, FILL an order: pick a shipper and insurance and ship the whole order from the works' export cage. Click a country on the globe to see only its orders.
- The fee (and insurance) is paid up front.
- The buyer reserves the price from its budget.
- Selling to one side of a war raises the other side's hostility by 5.

| Shipper | Fee | Reliability | Days | Embargo runs |
| --- | --- | --- | --- | --- |
| Halver Freight & Sons | 6% | 72% | 3 | no |
| Morrow Blue Line | 10% | 88% | 2 | no |
| Stork Air Charter | 22% | 96% | 1 | no |
| Pipecreek Logistics | 15% | 82% (−25% if embargoed) | 4 | yes |
| Ghost Fleet | 30% | 86% (−12% if embargoed) | 3 | yes |

**On arrival:** delivered (paid), or lost. A lost shipment is sunk, hijacked or seized (embargo runs: mostly seized).
- **Insurance** (+8%) pays 60% of value, except on seized smuggling.
- **Heat:** a seized embargo run is traced to you: record +8 and Wanted ★★.
- A shipment seized by the buyer's enemy raises that enemy's hostility by 30.

## Heavy weapons in the field

- **RPG launcher**: fires rockets (one per load, 2.5 s reload). They explode on the first person or obstacle, or at 16 tiles: 2.5-tile blast, 110 damage.
- **Skylance guided missile** (use from inventory): locks on to the nearest person within 16 tiles and homes in. 3.5-tile blast, 140 damage.
- **Longbow cruise missile** (use): strikes the point you're aiming at 2.5 s later, with a reticle and countdown. 5-tile blast, 250 damage.
- **Hornet attack drone** (use, 60 s): dives at whoever is fighting you, or whoever you last hit. 2-tile blast, 90 damage.
- **Kestrel strike drone** (use, 90 s): fires four small missiles (2-tile blasts) at the same targets.

Blast damage falls off to 40% at the edge and also hurts you if you're inside. Bystanders near a blast flee.

**Owner's rules:**
- Blasts never harm imported characters.
- Missiles and drones never target them.
- Only a rocket that directly hits one triggers their Wrath.
- Any explosion is a major crime: record +10; witnesses call it in.

Projectiles, drones and scorch marks are runtime-only and dropped when you change map.

### Your own ships (v0.22.0)

Once you own Ober & Sons Maritime, the FILL form lists your cargo ships beside the shipping companies. A ship docked at Mill Road Docks carries the crates to the buyer's main port: no freight fee, no insurance, running costs and port fees only. Embargo runs risk seizure by customs (22%, decided at departure). See `docs/LOGISTICS.md`.
