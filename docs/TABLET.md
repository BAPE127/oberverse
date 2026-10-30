# The OberPad (v0.15.0)

The journal became a tablet. Open it with **J** (or Q, or Pause → Tablet, or the 📱 badge on the HUD).

| App | What it does |
| --- | --- |
| Home | Business notifications (newest first, unread ones marked) and summary cards for your business and shares. Opening Home marks everything read. |
| Quests · People · Customers · Notes · Standing | The old journal pages. |
| Business | Appears once you own an arms works. A remote link to the works terminal: Overview, Parts, Equipment, Staff, Research, Market. Several works → a switcher. |
| Stocks | The Ober's Oil share register (as at Sir Moneybucks's desk) with a closing-price chart. |
| Companies | (v0.60.0) Your businesses as companies: name, sector, headquarters, last month's figures and place, and the company's own account — pay in, take out, close. A naming panel opens when a business is founded. |
| Group | (v0.61.0) The parent company and its subsidiaries: found it, name it, pay in and take dividends; bring a business under it (with a preview of what it will need), capitalise, lend, send up, set policies, repay, leave; separate and consolidated statements, cash, group value, who contributes, the parent's ledger, transfers. See `docs/CORPORATE.md`. |
| Personnel | (v0.62.0) The people who run your businesses: Openings (what a business has a case for, with what a hire would be worth), Candidates (about two dozen, filters, side-by-side comparison, an offer form), Staff (raise, promote, move, authority, dismiss), Payroll (each employer's daily wages, the arms floor and aerospace crews for information). See `docs/CORPORATE.md`. |
| Management | (v0.63.0; v0.64.0 adds the margin, contract-bid and expansion budgets, and plans; v0.65.0 the treasury policy and budget)  What managers may do on their own: requests waiting for your word (approve / decline), a monthly budget per business and kind of spending with what has been used, who decides it and plain notes where nothing is happening (no budget, no account of its own, auto-buy on, nobody at work), the log of what they did, and alerts. See `docs/CORPORATE.md`. |
| Exchange | (v0.66.0) Every listed company on one board: price, day change, a run of prices, what you hold; a company panel to buy or sell 1, 10 or 100 (the wider world's listed companies under the exchange's rules — fee, cap, books-driven price, real dividends — and the three older shares under their own); portfolio and dividends. Stocks keeps the older companies' projects. |
| Intelligence | (v0.60.0) Every company of a sector ranked (revenue, net income, margin, growth, value, share; last month, this month, 12 months), a profile of each, a comparison with your own business, and business news. See `docs/CORPORATE.md`. |

## Notifications

`game.tablet.post(app, text, kind)` (`src/systems/tablet.js`) toasts the text with 📱 and keeps it in `world.tablet.feed` (60 max) with an unread count. Apps: `arms`, `market`, `news`, `stocks` (`TABLET_APPS`).

| Source | When |
| --- | --- |
| Arms works (`src/systems/arms.js`) | parts delivered; research complete; 18:00 warning if payroll can't be covered; 19:00 payroll and staff quitting; 19:00 daily report per works; hourly (:30) stall check — a staffed station out of parts, full, without a recipe or power, or a lab with no project (once per stall; cleared when it makes something) |
| Market (`src/systems/market.js`) | shipment delivered or lost; world news (wars, truces, embargoes) |
| Ober's Oil (`src/systems/oilCompany.js`) | dividend or no dividend at 18:00; share price moves of 3+ obols |

A future business plugs in by posting with its own app id and adding an entry to `TABLET_APPS`, plus an app in `src/ui/tablet.js`.
