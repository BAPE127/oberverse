# Farming (v0.30.0 "Sowing Season", v0.31.0 "Home on the Range")

The second agricultural release at Lariat (see docs/LARIAT.md). Simulation: `src/systems/farm.js`; numbers: `src/content/farming.js`; panels: `src/ui/farm.js`.

## The loop
1. **Buy land** — the Land Office on Main Street (Lorna Calloway, afternoons; the deeds desk works any time it's open) or the plot's own sign. Three plots east of FM 38: Plot 1 (Mesquite Lane, 324 tiles, 6,000), Plot 2 (by Caddo Creek, 324 tiles, 6,000), Plot 3 (the south forty, 627 tiles, 11,000).
2. **Buy seed and fertiliser** — Lone Star Feed & Seed (Lorna, mornings and late afternoons). A bag of seed plants 50–60 tiles; a bag of fertiliser covers 80 (+25% yield).
3. **Work the field** at its sign: till → plant → (fertilise) → wait → harvest.
   - *By hand:* 24 tiles an hour — a 324-tile plot is about 13½ hours, and you finish exhausted (you need some energy to start).
   - *With a tractor of yours parked within 10 tiles of the field:* Shortrow 110 tiles/h, Workhorse 260, Longhorn 600 (Plot 1: about 3 h, 75 min, 33 min).
4. **Growth** — each morning at 06:00: wheat 4 days, sorghum 5, corn 6, cotton 8. Ready crops wait 3 days, then spoil to half. The field shows the crop and its stage (redrawn into the ground layer only when it changes).
5. **Sell** at the Co-op scale by the elevator. Base prices per unit: wheat 30, sorghum 36, corn 40, cotton 58, times the day's index (0.85–1.15).

## Balance (Plot 1, 324 tiles)

| Crop | Seed cost | Harvest | Value at index 1.0 | Days | Per day |
|---|---|---|---|---|---|
| Wheat | 6 × 18 = 108 | 36 (45 fertilised) | 1,080 (1,350) | 4 | ≈ 240 |
| Corn | 7 × 30 = 210 | 40 (50) | 1,600 (2,000) | 6 | ≈ 230 |
| Cotton | 7 × 40 = 280 | 40 (50) | 2,320 (2,900) | 8 | ≈ 255 |

A plot pays for itself in about a month of steady farming, faster with fertiliser and a bigger tractor; by hand, each job costs a day of your time.

## Equipment
Tractors are vehicles (`src/content/vehicles.js`, dealer `reddirt`, `body: 'tractor'`, `farm: { tier, rate }`, `offRoad: 1`): bought, delivered, driven, parked and part-exchanged like any car. Dale Pruett sells them on the Red Dirt lot.

## State and saves
`world.farm` (created on first use): each plot's ownership, state (`fallow`/`tilled`/`planted`), crop, planting day, stage, fertiliser and ready day; the Co-op's index; the last morning tick. Older saves start with no land.

## Livestock (v0.31.0)
Fence a fallow plot as pasture at its sign (400 obols; take the fences down again when it's empty). Buy stock at Hoof & Horn (Wes Tolliver), one kind to a pasture:

| Stock | Price | Room (Plot 1) | Feed / head / day | Gives | Sells for |
|---|---|---|---|---|---|
| Laying hens | 12 | 162 | 0.05 bag | 0.8 dozen eggs (Co-op 3) | 8 |
| Dairy goats | 140 | 40 | 0.25 bag | 1 gallon milk (Co-op 9) | 110 |
| Beef calves | 450 | 16 | 0.6 bag | — | 450 + 30/day for 25 days (1,200 grown) |

Feed is 9 obols a bag at Feed & Seed; fill the feeder at the pasture sign and collect the eggs or milk there. Each morning the herd eats; if the feeder can't cover the day they go hungry, and after three hungry days a fifth of them are lost. A full plot earns roughly 250–350 obols a day, in line with crops, before demand.

## The market (v0.31.0)
Every unit sold today lowers the next unit's price: price = day's price × (floor + (1 − floor) × D / (D + sold today)), with floor 0.55 and D the day's demand (wheat 90, sorghum and corn 80, cotton 60, eggs 240, goat milk 120; hens 120, goats 16, cattle 8). Each morning 40% of the day's sales are forgotten. Spread big harvests and herds over several days.

## Farm management (v0.31.0)
The tablet's **Farm** app (once you own land): each plot's state, herds and days of feed, produce waiting, today's Co-op and auction prices, and the books — every fencing, purchase and sale for the last 7 days with daily and weekly totals.
