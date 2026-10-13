# Properties (groundwork, v0.4.0)

The player can pay **Mason's Os** to build on surveyed plots. The systems are in place and tested; **no real plots exist yet** — the project owner will say where and when to create them.

## Flow

1. **Contract** — at Mason's contracts board (office prop `mo_board`, or ask Mason "I'd like to have something built"). The player picks a blueprint for a plot and pays land + build cost. Crew goodwill gives up to 25% off the build cost.
2. **Permit** — state `permit`. The player gets Form 22-B from Osric at the Civic Office (topic `t_osric_permit`, fee 10 obols, effect `{ permit: true }`).
3. **Construction** — state `building`. Counts down one day each evening at 18:00. Days = blueprint days − goodwill speed-up (1 day at 15 goodwill, 2 at 30), minimum 1. The crew's `build_*` impulse sends them out to the lots while anything is building. A scaffold frame stands on the plot.
4. **Built** — state `built`. `Game.rebuildMaps()` adds the building (with its door) to the plot's map. The interior map `<plotId>_inside` shows the furniture of the chosen blueprint. Rentals pay `rent` and businesses pay `income` every evening at 18:00.

State: `world.properties.owned[plotId] = { blueprint, state, paid, days, daysLeft, commissionedDay, startedDay, builtDay }` (saved; schema 1, additive).

## Blueprints (`src/content/properties.js`)

| Id | Name | Cost | Days | Pays |
| --- | --- | --- | --- | --- |
| `home` | Cottage (personal home) | 120 | 3 | — (bed to sleep in, private storage chest) |
| `rental` | Rental flats | 200 | 4 | 8 rent / day |
| `business` | Shopfront | 250 | 5 | 10 income / day (placeholder until businesses are simulated) |

## Adding a plot

Add an entry to `PLOTS` in `src/content/properties.js`:

```js
plot_westbrook_1: {
  name: 'Lot 1, Westbrook', map: 'westbrook',
  x: 6, y: 28, w: 6, h: 5,                  // footprint in tiles (must be clear ground)
  door: { x: 8, y: 32 },                    // on the footprint's bottom row
  outside: { x: 8, y: 33, facing: 'up' },   // walkable tile below the door
  landPrice: 40,
  allowed: ['home', 'rental', 'business'],
},
```

`src/world/plots.js` (`withPlots`) expands each plot at load: survey stakes and a "for sale" board (while unowned), a scaffold frame (permit/building), the interior map, the storage container `cont_<plotId>` and the spots `<plotId>_out` / `<plotId>_crew`. Run `npm run validate`: it checks the footprint is clear ground, the door is on the bottom row, the outside tile is walkable and the blueprints exist. Westbrook's lots south of the canal (stakes at x 6–16 / 26–36, y 28–38) were laid out with plots in mind.

## Conditions and effects

- Condition `property`: `{ plot, state }` (state may be a list; `'none'` = unowned), `{ plot, blueprint }` (true once built), `{ state }` (any plot), `{ surveyed: bool }` (any plots exist).
- Condition `site`: compares crew state, e.g. `{ site: { goodwill: '>=15' } }`.
- Effects: `{ permit: true }` (issue all pending permits), `{ site: { goodwill: n } }`.

## Not yet

Real plots; tenants as characters; real businesses (stock, staff, customers); selling property; locks/keys for player homes; upgrades.
