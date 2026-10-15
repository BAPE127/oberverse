# Fleet Command (v0.25.0)

Ober & Sons Maritime's operations room: a full-screen, dark "ops room" sea chart that replaces the old tabbed logistics terminal. Code: `src/ui/fleetCommand.js` (drawing and input only); every number and every action is `game.logistics` (`src/systems/logistics.js`, `src/systems/missions.js`, `src/systems/shipyard.js`). Registered as `PANELS.logistics` and `PANELS.fleet`, so the harbour-office terminal, Captain Ober, Mason ("Could your crew build me a shipyard?" opens the Shipyard sheet) and the tablet's **Ships** app all open it.

The owner's brief: *"It should feel like a proper program, control the entire screen … feel like the fleet terminal in Black Flag … easier to use."* Chosen in interview: **the map is the game**; simplify **all of it** from the player's side; a **modern ops room** look.

## The screen

| Area | What it does |
| --- | --- |
| **Chart** (the whole background) | Drag to pan, wheel to zoom (1×–9×), wraps east–west. Glowing coastlines; pulsing danger zones (pirate waters red, war zones orange, blockades violet; faded while a deterrence sweep holds); your ports as cyan diamonds with a gold badge counting today's work; other ports as dots; your ships drawn as ships (warships pink glow, cargo cyan), pointing along their course, with animated routes. Hover anything for a tooltip. |
| **Top bar** | Company, game date and time, **⏩ 1 h**, **⏩ 6 h** and **⏭ Next event (in …)** — time really passes (the game's own `skipTime`, in chunks over a second or two, so you watch the fleet sail; **⏸ Stop** halts it). Money and today's net. ✕ closes (Esc too). |
| **Left rail** | Map · Fleet · Buy · Shipyard · Ledger. |
| **Right drawer** (map mode) | What you've selected — nothing, a port, or a ship. |
| **Log** (bottom) | The three latest reports; "All reports" opens the Ledger. |

## The flow

- **Nothing selected:** alerts (arrears with a Pay button; ships waiting for orders; ships needing repairs), **Best jobs right now** (`Logistics.opportunities`: every contract a free ship can take, best profit first), and who's at sea with progress bars.
- **Click a port:** its type, country and blurb; ships in port; if it's yours, its **contracts** and **missions**, and its shipyard status (or "Commission Mason's Os"); if not, **Buy this port**.
- **A contract card** has *one* button: **Send the {ship} ▸ arrives …**. The ship is already chosen (`Logistics.bestShipFor`: on time first, then profit less expected losses). The card shows pay, route, deadline, the route's risk and whether it'll be on time; hover it to see the route on the chart. "Protect it · choose another ship ▾" folds out guards, insurance, the suggested escort (`Logistics.suggestEscort`) and every other ship that could go. Accepting and assigning happen together.
- **A mission card** shows the chance with the best team already picked (`Missions.bestTeam`: adds up to three free ships at that port while each one adds at least 3 points of chance) and one button.
- **Click a ship:** a large picture, status, voyage progress, hull and hold bars, speed/range/defence, incidents, **⛵ Send to…** (then click any port — the route, hours and cost preview as you hover; Esc cancels), Repair, work for that ship at its port, rename, show at the Yards berths, its voyage log.
- **Fleet:** every ship as a tile; click one to find it on the chart.
- **Buy:** cargo ships, warships (stats as bars, pick the port to deliver to) and ports (with Show on the chart).
- **Shipyard:** the side-profile shipbuilder (v0.26.0; see [SHIPBUILDING.md](SHIPBUILDING.md#the-builder-v0260)), Slips & yards, and the parts store.
- **Ledger:** earned / spent / net / upkeep, a two-week chart, all reports, recent contracts.

## Simulation helpers (v0.25.0)

All pure reads over the state; none changes anything.

- `Logistics.bestShipFor(cid, { guards, insure, escorts })` → `{ vessel, quote, score } | null`
- `Logistics.suggestEscort(cid, exclude)` → the strongest free escort-tagged warship docked at the contract's port, or `null`
- `Logistics.idle()` — docked ships with no contract and no cargo
- `Logistics.opportunities(limit)` → `[{ contract, vessel, quote }]`, best profit first
- `Logistics.nextEvent()` → the clock minute of the next arrival, departure, mission end, build or yard completion, or `null`
- `Missions.bestTeam(mid)` → `{ ships, quote } | null`

Tests: `tests/fleetcommand.test.mjs`.

## Opening it with a selection

`ui.openPanel('logistics', { port: 'port_sund' })` or `{ ship: 'v2' }` opens on that port or ship; `{ mode: 'fleet' | 'buy' | 'shipyard' | 'ledger' }` or the older `{ tab: 'Shipyard' }` opens that sheet.

## Next

- **v0.27** — life-size ships at the Yards berths that you can walk aboard: see [BOARDING.md](BOARDING.md).
