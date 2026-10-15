# Ports (v0.21.0)

34 ports (`PORTS` in `src/content/logistics.js`; permanent ids), on the globe's coasts — every one is reachable by sea from every other (tested). You own up to **30** (`LOGISTICS.maxPorts`, enforced in `Logistics.buyPort`); the company comes with three.

| Type | Berths | Largest ship | Price | Upkeep/day | Fee per call (if not yours) | Services |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Basic harbour | 3 | size 2 | 9,000 | 40 | 120 | berths |
| Commercial port | 5 | size 3 | 26,000 | 110 | 320 | + repairs, reefer power |
| Heavy cargo terminal | 6 | size 4 | 60,000 | 260 | 700 | + heavy cranes |
| Naval base | 5 | size 3 | 52,000 | 230 | 600 | repairs, armoury (warships, v0.23) |
| Advanced port | 8 | size 4 | 150,000 | 520 | 1,200 | everything + advanced dock |

- **Berths** count ships in port *and* ships on their way there; a full port refuses new arrivals (foreign ports never fill).
- **Contracts** start at your ports, so each port you buy brings two more offers a day from there.
- **The Yards berths** — the Mill Road Yards quay has three berths that show the ships in port at three of your ports (Ports page; default: your first three). This is display only.
- Ports have `upgrades` and `shipyard` fields reserved for the shipyard update (v0.24).

Home waters: Mill Road Docks (commercial, yours), Lanternside Quay and Gullwing Point (harbours). Abroad, every country of the arms market has two or three ports, and a dozen free ports fill the rest of the world.
