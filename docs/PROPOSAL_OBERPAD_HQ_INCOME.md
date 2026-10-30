# Proposal: supply ordering, early-game income, the OberPad and a headquarters

Status: **proposal with the owner's first answers recorded below; nothing built yet** (apart from the Morganius fix, which shipped as v0.80.1). Mockups are in `docs/mockups/proposal-*.png`; every figure below was read from the running game, not estimated. Mockup screens use sample values where a screen needs a number the game does not have yet; they say so.

## 1. Aerospace → Supply

### What is wrong now (measured)
- One page holds five things at once: a stores table, an auto-buy switch, a shipping panel, a 20-row purchase-order table and an order form with a card per supplier. A freshly bought Roost firm showed **12 shortfalls** at once.
- The link to the shipping company exists (v0.56: orders can travel in your own ships, charged at 1–5% of freight) but it is buried: you only find it by reading the supplier cards' small print.
- The one ship you start with, the *Gullwing Lass*, holds **20 units**. A 120-lot order of Aluminium alloy therefore answers "the Gullwing Lass holds 20 units (this is 120)", and the order form has no maximum, so nothing tells you that in advance.
- Supplier stock (92 lots of Aluminium alloy at Sund Alloys) disables the order buttons without saying how many you can buy.

### Proposed (mockup: `proposal-aerospace-supply.png`)
- A strip at the top for the fleet: which ship, what it holds, whether it is free.
- **One card per thing that is short** (default quantity = the shortage). A slider whose marks mean something: what the work needs, one full load for your ship, what the supplier has. A − / + stepper.
- **Two routes, the better one pre-selected**: your own ship (cheap, goes through the Shipping company and appears there as a consignment) or a carrier (fast). One **Order** button. The cost breakdown (goods, duty, freight, handling) sits behind "Details".
- Orders bigger than one load are split into loads for your ships automatically, and say so ("2 loads").
- Purchase orders in transit become one line ("On the way: 2 orders ›") that opens the list.
- **The "max 500" rule — needs your decision** (see questions). Today's rule is "a load never exceeds the largest hull you own".

## 2. Early-game income

### What the game pays and charges now (read from the game)
| Thing | Figure |
| --- | --- |
| Money at the start | **12 obols** |
| Odd jobs and early quests | 6, 12, 12, 20 obols (one Lariat quest pays 2,500) |
| Arms licence (Lucas) | 500 |
| Arms works (three for sale) | 2,500 · 6,000 · 12,000 |
| Lucas buys your output at | half its value, up to 15,000 obols a day |
| Farm plots | 6,000 · 6,000 · 11,000 (crops sell at 30–58 per unit; hens cost 12) |
| Cheapest ships | 6,000 · 7,000 · 8,500 (a ship holds 14–28 units at that price) |
| Roost Aeroworks (the firm) | 85,000 |
| The Spade's Gambit | 25 chips in; back 30 / 75 / 200 for 1 / 2 / 3 acts |
| Bank loan for a company | 40% of what it is worth after debts, plus six months of profit |

**The gap:** there is nothing between 12 obols and the first 500. Everything that pays well starts after a five-figure purchase, and a loan needs shares or a company that already exists.

### Brainstorm (nothing is chosen)
Principle for all of it: **no money from nothing.** Everything below is more sales at better prices, a cheaper way in, or work the player does; nothing is granted.

1. **A ladder of early work**: errands and deliveries that pay 25–150 obols (courier runs on foot, then by car), shifts at shops that need cover, a market stall (buy at the Co-op, sell in town). Each rung pays for the next purchase within about a day of play.
2. **Cheaper first steps**: the arms licence at 500 is fine; a *small* first works (a cheaper bench tier) would let the first machine arrive on day one or two instead of after 2,500.
3. **A starter loan from Lariat State Bank**: a small unsecured loan (about 1,000) for a first-time borrower, fixed rate, short term, clearly shown (the lending code already supports bounded loans; unsecured is the new part).
4. **Scale the three biggest sources, one knob each**: Lucas's wholesale share (0.5 today), shipping contract rates, crop and livestock prices, tender margins. A single `INCOME_SCALE` table per sector in content, applied where the sale happens.
5. **Make the first month quicker, not the tenth**: a multiplier that fades (for example ×1.6 on a company's first 30 days of trading).
6. **Sell things you already have**: a pawn or auction route for loot and surplus at fair prices (loot already exists; it just does not convert to cash well).
7. **Passive but real**: higher dividends only where the company actually earns more; interest on a savings deposit at the First Bank at the policy rate (paid from the bank's own books, bounded).
8. **Lower early running costs**: cheaper first wages and upkeep so a small business is not in the red on day three.

### Method (once you choose a pace)
1. Pick targets, for example "first works by day 3, first extra company by day 15, parent company by day 30, small HQ by day 40".
2. Run the game with a scripted player to measure the pace today, change the knobs, measure again. Report both.
3. Change figures only through the content tables; list every existing test whose literal figures move (several will, by design), and show the parity runs.

## 3. Morganius's arms — done (v0.80.1)
The elbow solver bent both elbows inward, folding the sleeves across his chest. Now each elbow takes whichever solution hangs lower and farther from his middle, with hysteresis so it never snaps. Four tests, mutation-checked; checked frame by frame in the live Spade's Gambit scene. Screens: `docs/mockups/v0801-morganius-arms.png`.

## 4. The OberPad

### What is wrong now (word counts read from a built-out game)
| App | Words | Controls |
| --- | --- | --- |
| Management | 1,282 | 49 |
| Bonds | 1,283 | 62 |
| Personnel | 619 | 16 |
| Group | 602 | 49 |
| Economy | 542 | 4 |
| Loans | 366 | 11 |
| Milestones | 357 | 4 |
| Exchange | 320 | 7 |

Home itself is 188 words and 25 controls, and it lists 19 apps in six groups.

### Principles (mockups: `proposal-oberpad-1-home.png`, `proposal-oberpad-2-app-pattern.png`)
- **Looks like a tablet**: a home screen of **eight big icons** with red-dot badges (Journal, Businesses, My Group, Markets, Bank, World News, People, Milestones), a dock of your four most-used apps, a "today" strip (cash, what needs you) and a search bar. Groups open as a small folder.
- **Every app opens the same way**: title bar with a back arrow, a segmented switch for its sections, **one headline figure**, three tiles, one or two big buttons, then a short list. Target: **at most 60 words and 8 controls per screen**.
- **Words go behind "?"**: the explanation of how a limit is worked out, the rules of a bond, the policy text. Nothing is deleted; it moves to where you ask for it.
- **Migration, app by app**: build the shell once (`src/ui/tabletKit.js`), then move one group at a time (Bank first, because it is the wordiest), keeping the old page behind "Details ›" until the new one is checked. Tests that look for texts or tabs on the old screens change; I list them.

## 5. The headquarters (mockups: `proposal-hq-tiers.png`, `proposal-hq-interior.png`)
- Three buildings you can buy for the parent company: **Small Office** (1 floor, 4 desks, 3 officer seats), **Corporate Centre** (6 floors, 16 desks, 8 seats, boardroom) and **The Ace Tower** (a skyscraper, 12 floors and roof, 40 desks, 12 seats, penthouse). Prices in the mockup are samples.
- **Effects are room and presence, not money**: seats, staff capacity, who attends the monthly review, a lift, a rooftop. They cost real money to buy and to run, and create none.
- **Officers go to work there**: they commute, sit at their desks in office hours, meet in the boardroom and go home, under the same schedule rules as every other person.
- **You furnish it**: desks, floor, walls, lights, art and plants per floor; cosmetic, paid for in obols, never giving income.
- Technical risks I would handle first: (1) hired officers are records, not content characters, so each needs a home and a schedule at hire time; (2) last time new buildings grew the streets and moved everything, so the HQ must reuse the footprint trick (`hallSize`/door override) or take a vacant plot; (3) the skyscraper can reuse the tower-floor map code.

## 6. Proposed order of work
1. Supply screen rebuild (smallest, self-contained; includes the cap rule).
2. Income pass (after you choose the pace), with the measured before/after.
3. OberPad shell and the Bank group, then the other groups.
4. HQ: buildings and purchase → officers at work → furniture.
Each is its own release with tests, parity, mockups and a report like the last ones.

## 7. Decisions so far (owner's answers, 2026-10-30)
- **Early-income pace: fast** — first works by day 3, a second company by day 15 (parent company around day 30).
- **HQ officers**: given flats in existing houses and scheduled (no new buildings, so the streets do not move).
- **HQ site**: three separate plots, one per tier; you can own more than one.
- **The "500" rule**: the answer was "500 dollar price". My reading, to be confirmed before building: *when you have a ship available, the delivery of an order costs at most 500 obols* (what the order pays your own shipping company for freight and handling), while a carrier is charged at its own rate. Today your own ship's charge is 2.5%–5% of the carrier freight (about 520 obols for 120 lots of Aluminium alloy from Kingsfjord), so the cap would bind only on large orders. If you meant something else (a cap on the price of the goods, or on the order size), say so and I change the design before any code.
- **Still open**: approval of the mockups (OberPad home, app pattern, Supply, HQ tiers, HQ interior), and the exact prices and perks of the three HQ tiers.
