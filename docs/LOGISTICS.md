# Ober & Sons Maritime — the logistics business (v0.21.0)

The shipping company you buy from **Captain Ober** (`npc_ober`) at the Mill Road Yards docks. Code: `src/systems/logistics.js` (simulation, DOM-free), `src/ui/fleetCommand.js` (Fleet Command, the full-screen terminal — see [FLEET_COMMAND.md](FLEET_COMMAND.md)), content `src/content/logistics.js` (every tunable number), routes `src/world/seaRoutes.js` over the globe geography in `src/world/globe.js`. See also [SHIPS.md](SHIPS.md) and [PORTS.md](PORTS.md).

## How you get it

Talk to Captain Ober ("I hear the company's for sale") or use the harbour-office terminal: the sale sheet shows the price (**40,000 obols**, `LOGISTICS.price`) and everything included before you pay. `Logistics.buyCompany()` is all-or-nothing and can't be repeated:

- Ober & Sons Maritime, with **three ports**: Mill Road Docks (Halvermouth), Sund Harbour, Port Lirre;
- the **Gullwing Lass**, a low-end Gullwing Cutter (20 units), docked at Mill Road;
- **Fleet Command** (the harbour-office terminal; the tablet's **Ships** app opens it too) — see [FLEET_COMMAND.md](FLEET_COMMAND.md);
- the ship brokerage and commercial contracts (offers appear immediately).

The sale is a system, not a dialogue: it works whether or not Captain Ober is around.

## The loop

1. **Contracts** — each owned port posts 2 offers a day (06:00; max 14 open). An offer names a client, cargo, units, origin (one of your ports), destination (any port), pay and a deadline. The first offer at each port is always one your fleet can carry. Lifecycle: `available → accepted → loading → transit → delivered | failed` (offers that lapse become `expired`).
2. **Assign a ship** — it must be docked at the origin, free, big enough, have any needed tag (reefer, heavy, advanced…), have the range, fit the destination port, be in sailing condition (≥25%), and your upkeep must be paid. The quote shows arrival, on-time or late, costs and profit. Running costs (`opex × days at sea`) and foreign port fees are paid **when you assign** — once.
3. **Loading** (2 h + 0.04 h per unit), then the ship **sails** along its sea route. Its position is derived from the clock (`Logistics.position`). Delays (gales, fog, engine trouble…) are rolled once at departure and stored with the voyage, so saving and reloading can't change them.
4. **Arrival** — the ship docks at the destination (now it's there; send it on, or take a contract from there if you own that port). The client pays once: in full on time (urgent work pays a bonus if early), less 15% per day late, nothing after 2 days late (and a 10% penalty).
5. **Upkeep** — every morning at 06:00 your ports and ships cost their daily upkeep. If you can't pay, the rest becomes **arrears**: harbourmasters hold every sailing until it's paid (Pay now on the terminal).

Sending a ship somewhere empty (Fleet → Send to another port) costs running costs and fees too. Repairs (at ports with a repair yard; foreign yards charge 50% more) restore condition; each 1,000 km sailed wears 1.6% × the class's wear.

## Arms exports in your own ships (v0.22.0)

On an arms works terminal's Market tab, FILL an order and pick **⚓ one of your ships** instead of a shipping company:

- the ship must be **docked at Mill Road Docks** (the export cages are at the Yards), free, big enough (**one crate = one unit**), with the range to the buyer's main port (`Logistics.portFor(country)`), and able to berth there;
- **no freight fee** and **no insurance** (insurance is something shipping companies sell): you pay the voyage's running costs and any port fee, like any other voyage;
- loading takes 2 h + 15 min per crate; the voyage follows the sea lanes with the usual delays; your ship is slower than air freight but never "lost in a storm" (piracy arrives in v0.23);
- an **embargo run** is allowed (it's your ship) but customs seize the cargo with a 22% chance (`ownEmbargoSeizure`), decided at departure and kept with the voyage — they trace it to you exactly as with a smuggler's ship; your ship is released;
- **who owns what**: the market keeps the order, the country's budget, the payment, saturation, war hostility and every consequence; logistics only sails the ship. `Market.shipOwn()` validates everything (cage, licence, hostility, budget, then `Logistics.armsQuote`) before changing anything, then commits and calls `Logistics.carryArms`; on arrival logistics calls `Market.settleOwn(shipmentId, fate)` once — the shipment is removed as it settles, so it can't pay twice. The market's shipment record carries `vessel` and its `arrives` is kept in step with delays.

The arms terminal shows your ships too: the contact list (⚓ name, ETA), the shipment on the globe along its real sea lane, and your other Ober & Sons voyages in cyan.

## Piracy and dangerous routes (v0.23.0)

`src/systems/piracy.js` (pure) + `Logistics.voyageRisk`. Danger comes from the world as it is, not a second geopolitics:

- **Pirate waters** (`PIRATE_WATERS`): the Pallas Reach, the Kestrel Narrows, Marrow Strait, the Morrow Shoals, the Sunmouth Approaches, the Meridian Gap — each with a radius and a danger 0–1;
- **war zones** round the main port of every country at war in the arms market (danger 0.6), and **blockades** round embargoed countries (0.4) — so a new war makes its waters dangerous, and a ceasefire makes them safe again.

**Chance of trouble** on a voyage = 0.8% + 9% per 1,000 danger-weighted km, × cargo (arms ×1.3, high-value ×1.4, specialised ×1.2, an empty hull ×0.6), × √(15 ÷ speed), × (1 − stealth/200), × (1 − escort strength), × bonuses (fleet support −15%, Aegis −10%, a protected port −30%) — capped at 85%. Categories: low (<3%), moderate (<10%), high (<25%), extreme. The quote shows the chance, the category, the worst case and the waters crossed.

**The worst case is limited by the most dangerous water on the route**: below danger 0.2 (all home and most commercial water) nothing worse than a delay can happen; below 0.5, nothing worse than losing the cargo; only in the worst water can a ship be **captured**, and **never** while escorted. The first offer at each port each day always keeps to safe water.

**If pirates strike** (rolled once, at departure, stored as a voyage event): pirate strength 30 + danger × 80 + up to 30, against your defence (the ship's, + escorts' attack × 0.6 + defence × 0.4, + guards 25, + bonuses). Margin > 20: **repelled**; > 0: **chased** (6–24 h delay, light damage); > −20: **ransom** (5% of the cargo's value, at least 1,500; unpaid ransom becomes arrears); > −40: **cargo seized** (the ship sails on); worse: **captured** (the ship is lost). A lost contract cargo fails (penalty) unless you **insured** it (6% of the pay; pays 60%); a lost arms cargo settles as *hijacked* through the market, once.

**Protection you can buy per voyage**: **guards** (+25 defence; 3% of the cargo value, at least 200), **cargo insurance** (contracts only), and **escorts** — warships docked at the same port that sail with the convoy at its slowest ship's speed, share its delays and fight beside it (their running costs are part of the quote).

## Warships, missions and fleet bonuses (v0.23.0)

Warships come from **Kestrel Naval Surplus** (the Warships page; see [SHIPS.md](SHIPS.md)). They escort convoys and take **missions** (`src/systems/missions.js`), offered one a day at each of your ports: coastal patrol, piracy deterrence, convoy escort for hire, distress response, port protection, reconnaissance, special transport. Pick up to three ships docked at that port; the terminal shows an **estimate** (very likely … very risky) from a fitness score on the mission's own weighted stats (a battleship is a poor scout, a skiff a poor bodyguard) against its difficulty. Running costs are paid on departure; the outcome is rolled then and stored; the ships go **on station** (status `mission`) for the mission's hours and come back to the same port: success pays the reward, a partial success half, failure nothing and heavier damage. A successful **deterrence** sweep halves its pirate water's danger for 5 days (`suppressed`); **port protection** cuts trouble for voyages leaving that port by 30% for 4 days (`protected`).

**Fleet bonuses** (`BONUSES`) come from ships' abilities, each applied once however many ships carry it: *Fleet communications* (frigate; fleet-wide: +15% escort strength), *Fleet support* (cruiser; voyages leaving the port where it's docked: −15% trouble), *Aegis network* (Aegis Bastion; fleet-wide: −10%), *Hazard sensors* (Starwatch Sentinel; the convoy it escorts: +15 defence).

## Towards playable naval combat (future)

Not in these updates. What's in place for it: one fleet (vessel records are the only ship state), one set of combat numbers per ship (`stats(v).combat`: attack, defence, detection, stealth, weapon mounts; plus condition), and encounters that are already discrete, stored voyage events (`{ kind: 'pirates', at, outcome, … }`) resolved at a known time. A future encounter screen would: offer the player the encounter when such an event comes due; build the scene from the participating vessels' saved stats and condition (and the convoy's escorts); return an outcome in the same vocabulary (`repelled | delay | ransom | cargo | captured`) plus damage; and hand it to the same handler (`Logistics.pirates`) that settles cargo, contracts and arms shipments exactly once. Declining, or a setting that turns encounters off, keeps today's abstract resolution. No separate combat database; no stats duplicated.

## The shipyard (v0.24.0)

Mason's Os build a shipyard at a port of yours; there you design and build your own cargo ships and warships from hulls and parts. See [SHIPBUILDING.md](SHIPBUILDING.md).

## Money, exactly once

Every obol moves inside `Logistics` through `spend()`/`earn()`, which also keep the ledger (all-time totals and the last 30 days) shown on the Finances page. A contract pays only on the `transit → delivered` transition; a contract that isn't `transit` when its ship arrives pays nothing.

## The Yards docks

Quay Road runs along the south of Mill Road Yards with the **Ober & Sons Maritime** harbour office (terminal inside), cranes, bollards, the **Salty Ober** (Captain Ober's tug and home) and **three berths**. Each berth shows one of your ports' ships in port (pick which on the port's card in Fleet Command; it only changes what you see). Hide an individual ship from the berths on its ship card. Since v0.27.0 the ships are life-size and you can walk aboard — see [BOARDING.md](BOARDING.md).

## State

`game.world.logistics` — `{ owned, boughtDay, ports: {id: {id, since, upgrades, shipyard}}, vessels: {id: vessel}, nextVessel, contracts: [], nextContract, lastContractDay, lastUpkeepDay, arrears, ledger: {revenue, expenses, days}, reports: [], display: {berths: [portId ×3]} }`. A vessel: `{ id, name, model, kind, cls, status, port, voyage, contract, cargo, condition, sailedKm, components, appearance, visible, bought, log }`; a voyage: `{ from, to, km, depart, base, arrive, purpose, contract, events: [{kind, at, hours, why, done}] }`. Created on first use; saves from before 0.21.0 load with it unowned.

## Planned (later updates)

- Later still: playable naval encounters. Ship stats, components and condition live in the shared vessel record so an encounter can read and write them without a separate fleet database.
