# Lariat and Chuckie's Cheese (v0.29.0)

Lariat is a farm town in the north-Texas style, north of Halvermouth through the **North Gate** (Farm-to-Market Road 38). It is the first of three agricultural releases:

| Release | Contents | Status |
|---|---|---|
| **0.29.0** | Lariat, Farmer Chuckie and the townsfolk, Chuckie's Cheese (the dairy and CHZ on the exchange), the five talking lead cows and *The Lost Herd* | **Implemented & tested** |
| 0.30.0 | Farms for sale (Land Office, through the property system), fields and crops on the world clock, equipment and the Red Dirt tractor dealership (through the vehicle system), Feed & Seed, Ag Repair | Planned |
| 0.31.0 | Livestock (Hoof & Horn), the agricultural market and the Co-op, farm management | Planned |

## The town (`src/content/maps/lariat.js`)

150 × 110 tiles. FM 38 runs north from the gate to Main Street; Cotton Street and Dairy Road cross it; dirt tracks lead to the windmill, the Hollister farm (over a plank bridge across Caddo Creek), the Co-op elevator and the east fields.

- **Open:** Lariat Mercantile (Opal; `shop_mercantile` — the lasso, always at least one on the peg), the Mesquite Diner (Lupe; `shop_diner`), the Bluebonnet Boarding House, the milking parlour, the Chuckie's Cheese plant (with the company board), Chuckie's ranch house, the Hollister farmhouse.
- **Closed until 0.30–0.31** (the doors say why): the Land Office, Lone Star Feed & Seed, Calloway Ag Repair, Hoof & Horn, Red Dirt Tractor & Implement, the Co-op elevator office.
- Chuckie's Cheese occupies the south-west: two freestall barns, the parlour, the plant, silos, a milk tank, pasture with 22 grazing cows (props) and the **lead cows' paddock** (`paddock` on the map: x 25–34, y 82–90).

## The lead cows and *The Lost Herd* (`q_lost_herd`)

Five cows talk: **Bessie Mae** (behind the diner), **Dr. Clementine** (the windmill), **Duchess** (a sandbar in Caddo Creek), **Patsy** (the Co-op elevator) and **Little Daisy** (the east fields). They lead the herd; with them gone the parlour gives barely half its milk.

1. Chuckie explains (topic *"You said you're missing some cows?"*) — or you meet a cow first; roping one starts the quest either way.
2. Buy a **lasso** at the Mercantile (45 obols). Owning one moves the quest to the round-up.
3. Find a cow — map markers show every cow still out once you know; Chuckie, Lupe and Earl say where — and **throw the lasso** in conversation.
4. **Walk her home.** She follows on foot (a walk when close, a trot to catch up — never faster than your sprint). She waits outside if you go into a building, stands still if you drive off or get more than 30 tiles ahead, and comes through a gate or over a map edge with you only if she's within 7 tiles. A rope survives saving and loading. Several cows can follow at once, or bring them one trip at a time.
5. In the paddock she's **home**: back on her grazing schedule, and the dairy's capacity rises 9%.
6. All five home completes the quest **once**: 2,500 obols, two wheels of Chuckie's Aged Cheddar, +10 Lariat reputation.

Edge cases: no lasso → the cow tells you where to get one; a cow can't be roped twice, nor once home; losing the lasso later doesn't free a roped cow; the reward is guarded by `world.dairy.rewarded` and by the quest completing only once; older saves start with every cow loose.

## Chuckie's Cheese (`src/systems/dairy.js`, numbers in `src/content/dairy.js`)

Each day: litres = 240 cows × 28 L × capacity (1 − 0.09 per lead cow not home); cheese = litres ÷ 10; revenue = cheese × 14 obols × the milk-price index (0.8–1.2, drifts ±3% a day); costs = 4,200 + 0.25 per litre.

| | Capacity | Milk | Cheese | Profit/day |
|---|---|---|---|---|
| All five out | 55% | 3,696 L | 370 kg | ≈ 56 |
| All five home | 100% | 6,720 L | 672 kg | ≈ 3,528 |

At **18:00** half the profit is paid out as dividends (per share = profit × 0.5 ÷ 150,000), and the share price moves 15% of the way toward **fair value** = 40 (book) + 12 × 365 × (0.1 × today's profit + 0.9 × normal profit) ÷ 150,000, ± up to 3% market mood. That is ≈ 132 with every cow out and ≈ 143 with all home; CHZ opens at 132.

**Trading** (tablet → Stocks → CHZ, Sir Moneybucks's desk, or the cheese plant's company board): a 1% broker's fee each way; one investor may hold at most 1,500 shares (1%). Chuckie owns and runs the company — your shares are just shares.

**Why the quest isn't a stock exploit:** the market already prices in 90% of the herd's recovery, so finishing the round-up lifts fair value by under 10%, reached over days, not at once; a round trip costs 2% in fees; and holdings are capped.

## Reuse, not duplication

The town is a region on the existing world (`src/content/world.js`; the world map now joins regions north–south). Cows are ordinary NPCs held by the existing intent mechanism; the quest uses `QuestSystem`; shops, items, facts, dialogue, map markers, the share register and saves are the existing systems. The one new clock hook is the dairy's 18:00 tick in `minuteTick`.
