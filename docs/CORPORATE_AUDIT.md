# Corporate Empire — Stage 1 audit (v0.59.0 baseline)

This is the audit that starts the **Corporate Empire** programme (companies, parent groups, managers, markets, central bank, geopolitics, robbery). It records what the project has *today*, what the owner decided, and the staged plan. It is checked against the working tree at v0.59.0, not against earlier descriptions.

## Baseline

| Item | Value |
| --- | --- |
| Version | 0.59.0 ("The Sky's the Limit"), save schema from `src/core/version.js` |
| Tests | `npm run check` → **579 / 579** pass (content validation: 0 errors, 2 known warnings: `door_b_vane_house` and `door_b_collective` lock keys that are not items) |
| Smoke | `npm run smoke` → 26 / 26 |
| Build | `node tools/build.mjs` makes the single-file `index.html` (circular imports are rejected) |
| Clock | `clock.total` is game minutes, 1 minute per real second; `clock.day = floor(total/1440)+1` |
| Currency | obols; the one wallet is `game.player.money` |
| Save | `SaveManager` envelope + `validateSave`; `MIGRATIONS` is **empty** — the code base migrates lazily (`??=` in getters, `afterLoad`) |

## What exists

| Area | Where | State |
| --- | --- | --- |
| **Arms Manufacturing** | `src/systems/arms.js` (+`factory.js`), `src/content/arms.js` | Real. Warehouses ("Yard 1/2 Works") bought at a FOR SALE sign after Lucas's licence. A hand-built grid factory (belts, inserters, stations) run by generated staff (`world.arms.staff`, candidates, wages at 19:00). No company entity, no name, no period books (`earned`, `lastPayDay` only). |
| **Arms market / geopolitics** | `src/systems/market.js`, `COUNTRIES` in `src/content/arms.js` | Real. 8 fictional countries with budgets, wars that start and end, embargoes, shippers, purchase orders, news. The base to extend for wars/embargoes. |
| **Shipping Logistics** | `src/systems/logistics.js`, `shipyard.js`, `docks.js` | Real. "Ober & Sons Maritime" is bought from Captain Ober (fixed name; ships are renamable). Money passes `spend()`/`earn()` (single chokepoint) with a day ledger and capex tally. |
| **Aerospace Engineering** | `src/systems/aerospace.js`, `src/aero/*` | Real and deep. The Roost firm is bought from Billie. Full books (`books.months`, cash-flow accounts, segments, balance sheet). Money passes `pay()`/`receive()`/`cash()`/`canAfford()` (single chokepoint). The player's firm spends from `player.money`; the rival **Meridian** has its own `co.cash`, credit line and interest — the template for a competitor. |
| **Farming** | `src/systems/farm.js`, `dairy.js`, `src/content/farming.js` | Real. Plots owned by deed; crops, livestock, market. No company entity; the ledger keeps 14 days. |
| **Stock market** | `oilCompany.js` (OBRO), `dairy.js` (CHZ), `aerospace.js` (MRDN) | Three **separate** models with different prices, caps (CHZ, MRDN), broker fees and dividends. Shown by `stocksScreen` in `src/ui/panels.js` (the exchange panel, Sir Moneybucks's desk and the tablet). No shared ledger. (The panel says OBRO; the tablet header says OBER.) |
| **Banks / credit** | `halvermouth.js` `b_bank` "First Bank of Halvermouth", `lariat.js` `b_bank` "Lariat State Bank" | Both **closed** (door message only). No loans, bonds, bank accounts, interest, or credit anywhere in the game (apart from Meridian's credit line). |
| **Exchange** | `halvermouth.js` `t_exchange` "Copperfield Exchange" | A closed 20-storey tower with no interior. |
| **Tablet** | `src/systems/tablet.js`, `src/ui/tablet.js` | Apps: Home, journal tabs, Business (arms), Ships, Farm, Aerospace, Stocks. `game.tablet.post(app, text, kind)` feed. |
| **Crime** | `police.js`, `Game.takeFromContainer`, `reportCrime` | Wanted 0–3, witness calls → incidents, containers with owners and `theftFact`, `vault` prop type exists (Moneybucks's manor). No gold item (only rings/watches). |
| **People** | `src/sim/*`, `npcSystem.js`, `homes.js` | Scheduled NPCs with memory/relationships. Arms and Aerospace each generate staff/candidates. No corporate AI. |

## Gaps (must be created)

1. A **company** entity: name, id, owner, founding day, status — for all four businesses.
2. **Company cash accounts** separate from the wallet.
3. A **registry** of companies (player, public, generated) and an economic model for generated ones.
4. **Consistent period books** for Arms and Farming (30-day months, like `aero books.months`).
5. Everything in Stages 5–15: parent groups, personnel pool, managers/budgets, unified equities, central bank, bonds, loans, geopolitics beyond arms, robbery.

## Money touch-points (the payment-layer inventory)

`player.money` is touched in these business modules (counts from the audit): arms 13, factory 6, logistics 19, shipyard 4, farm 14, dairy 7 (personal CHZ shares), market 8, aerospace 16; UI affordability checks in fleetCommand 7, shipBuilder 5, ui/farm 2, ui/aerospace 2, terminal 1; construction 2. Investments (OBRO, CHZ, MRDN buy/sell/dividend) are **personal** money and stay on the wallet.

## Owner decisions (recorded)

1. **Money model — real company accounts, opt-in.** A company has its own cash account. In existing saves every company starts **unfunded** (0 cash); an unfunded company keeps drawing on the owner's wallet (tagged to it in its ledger). Once the owner funds it with a recorded capital contribution, it pays **only** from its own cash. Nothing moves automatically.
2. **Bank sites.** The **central bank is the First Bank of Halvermouth** (vault, bond desk, policy office). Loans come from **Lariat State Bank** (farm and business loans). The Copperfield Exchange tower stays a closed landmark for now.
3. **Identity.** A company record is created on first ownership of any asset: a naming prompt in new play, a default name in existing saves ("Ober & Sons Maritime" and so on). Free, renameable. Existing names, assets and history are kept.
4. **World size.** About 45 generated international companies (bounded, persistent), roughly 15–18 public.
5. **Manager scope (Stage 7, not yet built).** Managers may act through existing services **and** may build or buy new stations, plots and berths from **pre-approved plans**. Each asset type will need an explicit placement rule and a budget; to be designed with the owner when Stage 7 begins.
6. **Roadmap — foundation first.** v0.60 = company accounts + identity + registry + generated competitors + finance/rankings (Stages 2–4). Then parent/subsidiaries (5) → personnel (6) → autonomous management & treasury (7–8) → unified stocks (9) → central bank, bonds, loans (10–12) → geopolitics (13) → robbery (14) → integration & regression (15–17).

## v0.60 plan (parts, each committed when green)

- **A. Payment layer.** One service, `game.corp`: `cashOf`, `canAfford`, `pay`, `receive` with a category and an actor. All companies unfunded ⇒ **zero behaviour change**; all 579 existing tests pass unedited.
- **B. Funding.** Capital contributions / distributions with a log; acquisitions are owner equity.
- **C. Registry and identity.** Names, rename validation, company records for all four businesses, legacy defaults.
- **D. Generated competitors** with a bounded off-screen model drawing on shared sector demand.
- **E. Metrics, valuation, rankings** and the **Corporate Intelligence** tablet app.

## Rules held throughout

No money, shares, loans, employees or businesses are created by migration; no business is auto-consolidated; generated entities are stored once from a saved seed and never regenerated; investments stay personal; valuations never create cash.
