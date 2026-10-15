# Ober & Sons Maritime — the logistics business (v0.21.0)

The shipping company you buy from **Captain Ober** (`npc_ober`) at the Mill Road Yards docks. Code: `src/systems/logistics.js` (simulation, DOM-free), `src/ui/logistics.js` (terminal), content `src/content/logistics.js` (every tunable number), routes `src/world/seaRoutes.js` over the globe geography in `src/world/globe.js`. See also [SHIPS.md](SHIPS.md) and [PORTS.md](PORTS.md).

## How you get it

Talk to Captain Ober ("I hear the company's for sale") or use the harbour-office terminal: the sale sheet shows the price (**40,000 obols**, `LOGISTICS.price`) and everything included before you pay. `Logistics.buyCompany()` is all-or-nothing and can't be repeated:

- Ober & Sons Maritime, with **three ports**: Mill Road Docks (Halvermouth), Sund Harbour, Port Lirre;
- the **Gullwing Lass**, a low-end Gullwing Cutter (20 units), docked at Mill Road;
- the logistics terminal (harbour office) and the **Ships** app on the tablet — the same screens and the same data;
- the ship brokerage and commercial contracts (offers appear immediately).

The sale is a system, not a dialogue: it works whether or not Captain Ober is around.

## The loop

1. **Contracts** — each owned port posts 2 offers a day (06:00; max 14 open). An offer names a client, cargo, units, origin (one of your ports), destination (any port), pay and a deadline. The first offer at each port is always one your fleet can carry. Lifecycle: `available → accepted → loading → transit → delivered | failed` (offers that lapse become `expired`).
2. **Assign a ship** — it must be docked at the origin, free, big enough, have any needed tag (reefer, heavy, advanced…), have the range, fit the destination port, be in sailing condition (≥25%), and your upkeep must be paid. The quote shows arrival, on-time or late, costs and profit. Running costs (`opex × days at sea`) and foreign port fees are paid **when you assign** — once.
3. **Loading** (2 h + 0.04 h per unit), then the ship **sails** along its sea route. Its position is derived from the clock (`Logistics.position`). Delays (gales, fog, engine trouble…) are rolled once at departure and stored with the voyage, so saving and reloading can't change them.
4. **Arrival** — the ship docks at the destination (now it's there; send it on, or take a contract from there if you own that port). The client pays once: in full on time (urgent work pays a bonus if early), less 15% per day late, nothing after 2 days late (and a 10% penalty).
5. **Upkeep** — every morning at 06:00 your ports and ships cost their daily upkeep. If you can't pay, the rest becomes **arrears**: harbourmasters hold every sailing until it's paid (Pay now on the terminal).

Sending a ship somewhere empty (Fleet → Send to another port) costs running costs and fees too. Repairs (at ports with a repair yard; foreign yards charge 50% more) restore condition; each 1,000 km sailed wears 1.6% × the class's wear.

## Money, exactly once

Every obol moves inside `Logistics` through `spend()`/`earn()`, which also keep the ledger (all-time totals and the last 30 days) shown on the Finances page. A contract pays only on the `transit → delivered` transition; a contract that isn't `transit` when its ship arrives pays nothing.

## The Yards docks

Quay Road runs along the south of Mill Road Yards with the **Ober & Sons Maritime** harbour office (terminal inside), cranes, bollards, the **Salty Ober** (Captain Ober's tug and home) and **three berths**. Each berth shows one of your ports' ships in port (pick which on the terminal's Ports page; it only changes what you see). Hide an individual ship from the berths on its Fleet page. Ships are drawn top-down from their `look` (`src/engine/drawShips.js`).

## State

`game.world.logistics` — `{ owned, boughtDay, ports: {id: {id, since, upgrades, shipyard}}, vessels: {id: vessel}, nextVessel, contracts: [], nextContract, lastContractDay, lastUpkeepDay, arrears, ledger: {revenue, expenses, days}, reports: [], display: {berths: [portId ×3]} }`. A vessel: `{ id, name, model, kind, cls, status, port, voyage, contract, cargo, condition, sailedKm, components, appearance, visible, bought, log }`; a voyage: `{ from, to, km, depart, base, arrive, purpose, contract, events: [{kind, at, hours, why, done}] }`. Created on first use; saves from before 0.21.0 load with it unowned.

## Planned (later updates)

- **v0.22** — your own ships carrying arms-export orders (no freight fee; running costs still apply); the globe on the arms terminal showing your fleet; richer voyage history.
- **v0.23** — piracy and route risk from the arms market's wars and embargoes; the warship dealership; escorts and naval missions.
- **v0.24** — the shipyard (built by Mason's Os) and the custom shipbuilder.
- Later still: playable naval encounters. Ship stats, components and condition live in the shared vessel record so an encounter can read and write them without a separate fleet database.
