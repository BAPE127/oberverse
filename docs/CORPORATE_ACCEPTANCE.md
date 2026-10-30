# The Corporate Empire update: acceptance against the brief (v0.80.0)

The brief's section 20 ("Mandatory Acceptance Tests"), item by item, with where it is tested. **✔** = implemented and tested here; **◐** = partly, with what is missing said; **✘** = not built. Nothing is marked ✔ for a screen alone: every ✔ is checked against the game's own records by a test that runs in `npm run check`. See also `docs/KNOWN_ISSUES.md` and `docs/CORPORATE_AUDIT.md` (the owner's decisions).

## 20.1 Company ownership
| Item | | Tests |
|---|---|---|
| Name and manage all four businesses | ✔ | `corporate_identity`, `corporate_funding` |
| All four stay private; none can be bought on the exchange | ✔ | `corporate_identity` (the registry), `exchange` (the board has no player business and no central bank) |
| Existing records survive migration | ✔ | `corporate_identity` (v0.59 save), `save_migration_corporate` |

## 20.2 Corporate groups and subsidiaries
| Item | | Tests |
|---|---|---|
| Establish and name a parent; consolidate eligible businesses keeping identities, contracts, assets, staff, history | ✔ | `corporate_group`, `corporate_integration` |
| Keep businesses independent or as subsidiaries | ✔ | `corporate_group` |
| Ownership consistent after save/load | ✔ | `corporate_group`, `corporate_integration` (12) |
| Consolidated reports do not double count; parent cash distinct; distributions once, from real funds, respecting liquidity; valuations create no cash | ✔ | `corporate_consolidation`, `corporate_loans`, `corporate_integration` (5–7), `transaction_integrity` |
| Circular and duplicate ownership rejected | ✔ | `corporate_group` |
| Restructuring preserves contracts, liabilities, history | ◐ | `corporate_group` (joining and leaving). **Selling or closing a subsidiary and part-owned subsidiaries were not built.** |

## 20.3 Procedural personnel
| Item | | Tests |
|---|---|---|
| Persistent candidates with distinct skills, salary expectations, specialisations; not regenerated on reopening or load | ✔ | `personnel` |
| Measurable, bounded effects of managers; skills cannot beat missing resources | ✔ | `personnel_effects`, `corporate_integration` (11) |
| Hiring and dismissal update records and expenses; no duplicate full-time positions; payroll once per period | ✔ | `personnel`, `transaction_integrity` |
| Different specialisations perform differently | ✔ | `personnel_effects` |
| Performance evaluated against objectives **and external conditions** | ◐ | monthly reviews use a person's results; wars and other external conditions are not factored into the review |

## 20.4 Budgets and autonomous operations
| Item | | Tests |
|---|---|---|
| Allocate budgets; allocated/committed/spent/remaining consistent; budgets create no cash | ✔ | `management`, `corporate_integration` (3) |
| Authorised routine operations without intervention; not beyond authority or funding | ✔ | `management`, `management_plans`, `management_treasury` |
| No repeated purchases from repeated ticks or save/load | ✔ | `transaction_integrity` (a day is run once), `corporate_integration` |
| Contracts only within capacity | ✔ | `management_plans` (bids), `geo_effects` (embargoes) |
| Splitting a purchase or an unauthorised transfer does not get round a limit | ✔ | `transaction_integrity` (what they have committed today counts, v0.80.0) |
| Autonomous policies change real decisions; treasury moves hit the right ledgers | ✔ | `management_treasury`, `management_plans` |
| Budget reports show actual spending and **meaningful variances** | ◐ | the Management app shows spent against the cap; there is no variance report |
| Underspending not rewarded when it causes failure; a manager's performance reflects outcomes and conditions | ◐ | no performance report that weighs these |
| **Emergency spending** under explicit permissions | ✘ | not built |
| Decisions and expenditure consistent after save/load | ✔ | `corporate_integration` (12) |

## 20.5 Integrated corporate-group test — ✔ `corporate_integration`
All four businesses under one parent, a manager at each, separate budgets, autonomy on, 62 game days run on the real systems, and each of the twelve points checked against ledgers, logs and saved state: (1) each business did its own kind of thing, (2) every revenue and expense category is one a game mechanic posts, (3) managers procured only eligible parts within budget and once a day, (4) wages, purchases and arrears reached the right ledgers, (5) every member has a report, (6) the parent holds only what was recorded as sent to it, (7) the consolidated statement reconciles, (8) wars and embargoes reach decisions, (9) budgets and distress meet real refusals, (10) a recorded capital transfer moves exactly that sum, (11) skill makes a bounded measurable difference, (12) the group's records are identical after a save and load and three days on.

## 20.6 Public stock market
Buy and sell eligible companies ✔ (`exchange`); the central bank has no listing ✔; trades update holdings and balances once ✔ (`exchange`, `transaction_integrity`); price histories persist ✔; wars and embargoes by exposure ✔ (`geo`). Added in v0.80.0: a record of your trades and a watchlist (`milestones`). **The three older shares' own Stocks screen does not write to the trade record**; trades made through the Exchange app do.

## 20.7 Government bonds
Consistent pricing, yields, terms, payment schedules ✔ (`bonds`); prices respond to yield changes ✔; purchases and sales once ✔; coupons and maturities cannot be duplicated ✔ (`bonds`, `transaction_integrity`); default and restructuring consistent ✔ (`credit`, `sovereign`); **the tablet and the physical bank show the same records** ✔ (the bond desk and rate board open the tablet apps; `first_bank`, `banks_physical`).

## 20.8 Monetary policy and loans
Policy-rate changes reach bond yields ✔ (`bank`, `bonds`); loan rates follow the model ✔ (`lending`, `business_loans`); borrowing is not revenue ✔; repayments reduce principal and recognise interest ✔; loan records survive save/load ✔ (`transaction_integrity`); intercompany balances consistent ✔ (`corporate_loans`). v0.80.0 fixed a flaw found by `transaction_integrity`: a company's limit counted the cash from its own loans, so loans could stack to about 1.7 times the books' allowance.

## 20.9 Geopolitical events
Persistent records with explicit parties ✔; operational and financial effects by exposure ✔; unexposed companies not arbitrarily penalised ✔; stock-price changes bounded ✔; government bond risk responds ✔ (`geo`, `geo_effects`, `sovereign`); initial effects not re-applied each tick ✔. **Embargoes do not change material availability or delivery times; managers do not change routes or suppliers.**

## 20.10 Bank robbery — ✔ `robbery`, `robbery_separation`
The physical central bank is accessible and interactive ✔ (`first_bank`, `banks_physical`); bounded, non-duplicable loot ✔; police and security through the existing systems ✔; the bank recovers and reopens ✔; **no effect on creditworthiness, loan eligibility, rates, business ratings, valuations or rankings** ✔ (control-game proof and source scans, mutation-checked).

## 20.11 Regression
Existing holdings and identities preserved ✔ (`save_migration_corporate`); existing business, farming, shipping and aerospace systems work ✔ (the suite, unedited except for the tests the changelogs name); migrations succeed ✔; the game plays ✔ (`npm run smoke`, browser checks).
