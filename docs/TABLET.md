# The OberPad (v0.15.0)

The journal became a tablet. Open it with **J** (or Q, or Pause → Tablet, or the 📱 badge on the HUD).

| App | What it does |
| --- | --- |
| Home | Business notifications (newest first, unread ones marked) and summary cards for your business and shares. Opening Home marks everything read. |
| Quests · People · Customers · Notes · Standing | The old journal pages. |
| Business | Appears once you own an arms works. A remote link to the works terminal: Overview, Parts, Equipment, Staff, Research, Market. Several works → a switcher. |
| Stocks | The Ober's Oil share register (as at Sir Moneybucks's desk) with a closing-price chart. |

## Notifications

`game.tablet.post(app, text, kind)` (`src/systems/tablet.js`) toasts the text with 📱 and keeps it in `world.tablet.feed` (60 max) with an unread count. Apps: `arms`, `market`, `news`, `stocks` (`TABLET_APPS`).

| Source | When |
| --- | --- |
| Arms works (`src/systems/arms.js`) | parts delivered; research complete; 18:00 warning if payroll can't be covered; 19:00 payroll and staff quitting; 19:00 daily report per works; hourly (:30) stall check — a staffed station out of parts, full, without a recipe or power, or a lab with no project (once per stall; cleared when it makes something) |
| Market (`src/systems/market.js`) | shipment delivered or lost; world news (wars, truces, embargoes) |
| Ober's Oil (`src/systems/oilCompany.js`) | dividend or no dividend at 18:00; share price moves of 3+ obols |

A future business plugs in by posting with its own app id and adding an entry to `TABLET_APPS`, plus an app in `src/ui/tablet.js`.
