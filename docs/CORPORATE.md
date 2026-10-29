# The Corporate Empire (v0.60.0 onward)

The Oberverse is becoming one connected economy: the player's four private businesses, the companies of the other countries, parent groups, managers, markets, a central bank, wars. It is built in staged releases (see `docs/CORPORATE_AUDIT.md` for the audit, the owner's decisions and the roadmap). **v0.60.0 "Own Account"** is the foundation: stages 2–4 (company accounts, identity, the registry, generated competitors, finance and rankings).

## What exists now

| Piece | Where | What it does |
| --- | --- | --- |
| **Company accounts** | `src/corp/ledger.js`, `src/systems/corporate.js` (`game.corp`) | The one place the four businesses move money: `cashOf`, `canAfford`, `pay`, `receive`, `found`. |
| **Funding** | `contribute`, `distribute`, `unfund` | The owner puts money in (a logged capital contribution) and takes it out. |
| **Identity** | `src/corp/identity.js` | Names, validation, the player's four companies' defaults. |
| **Registry** | `src/corp/registry.js`, `game.corp.registry()` | Every company in one list: the owner's four, the listed (OBRO, CHZ, MRDN), the freight carriers, the generated. |
| **The wider world** | `src/content/corporate.js`, `src/corp/sim.js`, `src/corp/generate.js` | About 45 generated companies in ten sectors, made once and kept, run one day at a time. |
| **Figures, worth, rankings** | `src/corp/metrics.js`, `metricsOf`, `sectorTable`, `placeOf`, `compare` | The same figures for every company, read from the books each keeps. |
| **Tablet** | `src/ui/corpApp.js`, `src/ui/corpIntel.js` | **Companies** (names and accounts) and **Intelligence** (rankings) apps; a naming panel when a business is founded. |

## Company accounts

A company is `arms`, `shipping`, `aerospace` or `farming`. Its account is **unfunded** until the owner pays money in:

- **Unfunded** (every company in an old save, and every new one): the business spends the owner's wallet exactly as it always did. Its flows are only *counted* (by 30-day month, two years kept) so its books can be told apart.
- **Funded**: the business pays from its own cash alone. A discretionary purchase it cannot afford is refused (the buttons check `canAfford`). A bill that must be met (upkeep, the aerospace firm's costs) that it cannot cover becomes **arrears** — a debt, paid first out of what next comes in. Nothing is ever received for nothing, and nothing silently overdraws the account.
- **Founding** is the owner's act: buying the licence, the shipping company, the aeroworks or the first plot comes out of the wallet and is recorded as **equity in kind** (an asset brought in at cost), not as the company's spending. Later works, ports, plots are the company's capital spending.
- **Personal money never passes through**: shares (OBRO, CHZ, MRDN) and their dividends, a day's labouring and the casino stay on the wallet.
- Invariant (tested): a funded account's cash = contributed − distributed + inflows − outflows, and the owner's wallet + the company's cash is unchanged by funding.

## The wider world

- **Made once.** On first need (a new game, or loading a save without them) `ensureWorld` builds the companies from a salt kept in the save and `warmupDays` (120) of history, then saves the full records. Loading never makes them again; content changes never alter a company that exists.
- **Character is a hash** of the salt and the company's id: size, speciality, strategy, risk, management, standing, efficiency, price level. The numbers it starts with follow from those.
- **Demand is shared.** Each sector has a *pool* (what its customers buy a day, drifting up with a slow cycle; the arms pool reads the real arms market's incomes and wars). The player's own revenue and Meridian's come off the top; the rest is shared by capacity, standing and price (`allocate`). A player who wins business leaves less for everyone else.
- **Every company pays its way**: cost of goods, fixed costs, interest; borrows up to a limit, repays when flush, builds when busy and rich, sheds when idle, pays owners 30–40% of a month's profit if it can spare it.
- **Entry, mergers, failure**: a busy sector may draw a newcomer (cooldown, caps); a distressed company is bought by a strong one in its sector at a price the buyer pays and with its debt taken on; one short of cash for 45 days is wound up — its plant sold at 40% of book to its lenders, who take the loss. Caps: 60 alive, 90 records.
- **Catch-up is bounded**: at most 30 days are lived when time has passed unseen.

## Figures, worth and rankings

Every company is read into the same record (`metricsOf`): revenue, operating profit, net income, margin, growth, cash, debt, capex, estimated value. **A figure a company's books do not keep is `null` and shown as "—", never zero or a guess.** How each is counted is stated (`basis`): aerospace — its books; arms, shipping and farming — what actually moved through the company's account (cash basis; shipping's charges from its sister aerospace division are *internal* and left out); generated companies — their own books; Chuckie's Cheese — today's run-rate; Ober's Oil and the carriers — nothing kept.

**Estimated value** = net assets + a sector multiple of a year's profit (half weight for a loss, never below a third of net assets, and only as far trusted as the months shown: six months fully). It is an opinion and **never creates cash**; the screens say so. Rankings are by revenue, net income, margin, growth, value or share, for last month, this month so far or the last twelve months; each month's standing of the owner's companies is written down (24 kept). `compare` says figure by figure who leads.

## State (in the save)

`world.corp` (created on first use; see `docs/SAVE_FORMAT.md`): `accounts` (per company: `funded`, `cash`, `contributed`, `distributed`, `inKind`, `flowIn`, `flowOut`, `arrears`, `log`, `months`), `companies` (identity records), `generated` (the world's companies, with their `months` rows), `gen` (salt, id counter, last day, entry cooldowns, news), `rankHistory`.

## Rules every later stage keeps

No money, shares, loans, employees or businesses are created by migration; no business is auto-consolidated; generated entities are stored once and never regenerated; investments stay personal; valuations never create cash; managers (stage 7) will act only through `game.corp.pay` and the other validated services, within budgets that are authorisations, not money.

## Not yet (see the roadmap in `docs/CORPORATE_AUDIT.md`)

Parent companies and subsidiaries, intercompany transactions and consolidated statements (stage 5); hiring, managers and budgets (6–8); a unified stock market with the generated companies' prices (9); the central bank at the First Bank of Halvermouth, bonds, loans at Lariat State Bank, the policy rate (10–12; the sim reads `CORP.baseRate` until then); wars and embargoes beyond the arms pool (13; the sim already accepts a per-sector cost index); the bank robbery (14).
