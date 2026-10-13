# Calculator production — warehouses and the factory (v0.12.0)

Source: `src/systems/factory.js` (simulation), `src/content/warehouses.js` (warehouses, recipes, deliveries, unlocks), `src/engine/drawFactory.js` (drawing), build mode in `src/ui/ui.js` (`toggleBuild`, `buildAction`, `updateBuild`).

## The chain

| Step | Inputs | Output | Machine | By hand |
| --- | --- | --- | --- | --- |
| Solder | circuit board + button battery | calculator core | Soldering Station, 4 min | 10 min |
| Press | plastic casing + button pad + LCD screen | calculator shell | Case Press, 4 min | 10 min |
| Assemble | core + shell | blank calculator | Assembler, 6 min | 15 min |
| Tune | blank | Charm / Wits / Grit / Finesse / Health / Energy calculator | Tuning Bench (set with E), 3 min | 8 min |

Parts cost 11 obols per calculator at Sal's. Customers pay 14–32; Sal buys finished calculators back at 7.

## Progression

1. **Buy a warehouse** at its FOR SALE sign on the Halvermouth docks: Warehouse 7 (300, power 2), Pier 9 Shed (750, power 2), The Old Cannery (1,500, power 3). The flag `owns_<id>` unlocks the door.
2. **Hand-craft** at the workbench. It uses parts from your pockets and the warehouse's input bay, and takes game time.
3. **5 calculators made** → Sal sells machinery (`shop_machines`).
4. **10 made** → Sal signs a **delivery contract**: a small crate (5 of each part, 50 obols) or a large one (15 each, 140), into the biggest warehouse you own at 07:00, paid on delivery.

## Building (press B inside a warehouse you own)

- The toolbar lists the machinery in your inventory. Number keys or click select a tool. **R** rotates. **Click** places, **right-click** picks up (the machine and anything in it come back to your pockets). Picking up with R rotates a placed belt or arm. **B / Esc** exits.
- You can't build on walls, fixtures, the tile inside the door (`keepClear`) or where you're standing.
- **Belt**: one item per minute to the next tile; at the end of a line it feeds straight into a machine or crate that wants the item (no arm needed). A full line backs up; it never drops items.
- **Inserter arm**: one item per minute from the tile behind it (crate, belt, machine output) to the tile in front, only items the target wants.
- **Machines** buffer up to 4× each input and hold up to 10 outputs. **Power**: the wall socket runs the first `basePower` machines (in placement order); each generator adds 4. Unpowered machines show a red light.
- E on a machine: status, buffers, set the tuner, load from your pockets, collect output.

## Simulation

One step per game minute for every owned warehouse, on or off the map and while time is skipped (`Game.minuteTick → Factory.minuteTick`). Entities are saved in `world.factory.warehouses[id].entities` and reinstalled as runtime props (`GameMap.addProp`) on every map rebuild, so they draw, collide and take E like any prop.
