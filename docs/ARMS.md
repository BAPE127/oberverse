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
- **Workstations** (placed with B, 2×2, one recipe each, chosen with E): CNC Lathe, Assembly Bench, Electronics Bay, Explosives Bay, Rocket Bay, Drone Bay, Research Lab. Belts, inserter arms and generators work exactly as in the calculator factory.
- **A station only works while an employee is assigned to it and standing at it on shift.** Speed = (0.4 + 0.2 × skill) × (0.5 + morale/100) × quirk × research.
- **Export cage**: put finished weapons here by belt or by hand.

## Chain

Parts: steel, polymer, springs, optics, electronics, Li-ion pack, propellant, high explosive, rocket motor, guidance chip, airframe.

| Station | Recipes |
| --- | --- |
| Lathe | barrel, receiver, stock & grip |
| Explosives Bay | warhead |
| Electronics Bay | seeker head (Inertial Guidance), flight controller (Avionics) |
| Assembly Bench | pistol; SMG, shotgun, assault rifle, sniper rifle, LMG, RPG launcher (each behind research) |
| Rocket Bay | RPG rocket, Skylance guided missile, Longbow cruise missile |
| Drone Bay | Hornet attack drone, Kestrel strike drone |
| Research Lab | research points (0.05 × rate per minute) |

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

Lucas buys any arms item at **half its value**, raised by research, up to **2,500 obols a day**. The global market, shipping companies, insurance and heat arrive in v0.14.
