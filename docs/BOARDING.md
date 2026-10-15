# Walking aboard (v0.27.0)

Your ships at the Mill Road Yards berths are drawn **life-size** — about 3.6 tiles per unit of hull length, so a coaster is 11 tiles long and a megaship 29 — and you can walk up the gangway onto their decks and go below.

Code: `src/world/shipDeck.js` (the deck plan and the rooms below, pure), `src/systems/docks.js` (mooring ships at the berths, owned by `Logistics`), `src/engine/drawDeck.js` (the hull, deck and fittings in the world's 3/4 view), `src/ui/logbook.js` (the logbook). The Yards map (`src/content/maps/yards.js`) has a deeper harbour (84 rows) and three long piers at x = 12, 30, 48 (`berths: { piers, row }`).

## At the berths

Each berth shows one of your ports (pick it on the port's card in Fleet Command). Its first two ships in port (that you haven't hidden from the berths) are moored either side of the pier, stern to the quay, bow out to sea, with mooring lines to the pier and a gangway across. A sign on the quay names the port, and each ship's name is on a board off her bow.

## The deck

The deck is generated from the ship's design (`deckPlan`): its outline from the hull, its width from the hull's beam (4–6 tiles), and **every part where you placed it** in the shipbuilder — stock ships get their standard fit. Wide parts (hatches, containers, reefers, cabins) fill the deck inboard; engines, cranes, turrets and domes take a 2 × 2 block; masts, radars and antennas a single tile; a broadside's guns stand along the starboard rail; sonar, armour, plating and stealth coating (which live in the hull) show as an access plate. A walkway runs down the port side of every deck, so the way below and every fitting can always be reached from the gangway (tested for every stock ship and every hull fully fitted).

Powered ships have a **bridge** (aft on cargo ships, its door facing forward; amidships on warships; forward on futuristic hulls, doors facing aft). Sailing ships and the patrol skiff have the **wheel** on deck aft and a **companionway** down.

Fittings are solid props you walk around; examine one for what it is. Tall things stand up in 3/4 view (funnels with smoke, masts with their sails set, cranes, radar that turns).

## Below decks

Through the bridge door (or down the companionway) is the ship's interior (`belowDecks`), hull-shaped, with a corridor and rooms either side:

- **the wheelhouse** (the captain's cabin on a sailing ship): the **ship's wheel** — take it for her status, speed and range and her last voyage — the **logbook**, the chart table, the radio or a sea chest;
- **cabins** with bunks for her crew (more on bigger ships) and a locker;
- **the mess and galley**: a stove, the mess table;
- **the engine room**: one engine for each propulsion part (diesel, eco engine, gas turbine, fusion drive) and her generators or fusion core;
- **the hold**: crates and barrels — as much as she's carrying, or dunnage if she's empty; a warship's magazine.

The **logbook** lists her particulars (home port, in service since, sea miles, hull, speed and range, hold, abilities) and every voyage and mission in her log, in the master's hand.

## When she sails

The berths are kept up to date every game minute. If a ship you're on casts off (or you hide her from the berths, or change which port a berth shows), you hop back onto the pier.

## Saves

Nothing new is saved: the decks and the rooms below are rebuilt from the fleet whenever the maps are built (new game, load). If you saved below decks you load there, as long as she's still at her berth; otherwise you're moved ashore.
