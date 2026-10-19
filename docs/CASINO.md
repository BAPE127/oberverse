# The Phonograph Grand — design and architecture (v0.52.0)

The casino resort on Market Street, Halvermouth, built where the Lucky Star bar stood (its bar is the lobby's lounge). Owner: Octavius Thomas Phonograph. Host: Morganius Spade.

## Places (`src/content/casino.js`)
- **Exterior:** a 42-storey tower (`b_phonograph`, `tower: 42`) with a black-and-gold marquee canopy of chasing bulbs over the door, the name lit in gold, a marquee pylon and a valet stand; a private forecourt behind it where the owners' cars are parked.
- **G — the Grand Lobby** (`phonograph_lobby`): laid into the street like every building (made from the building's grown footprint, `phonographLobby`); marble, a red carpet from the door to the grand staircase, reception, the Lucky Star Lounge, the lift.
- **2 — the Casino Floor** (`phonograph_casino`, up the grand staircase): two roulette tables, three blackjack tables, two Hold'em tables, Morganius's stage and table, the cashier's cage, the Spade Bar and lounge, slot machines (disenchanted), the security office (staff only).
- **3 — staff quarters**, **41 — Morganius's rooms**, **42 — Octavius's penthouse**: private floors. The lift won't stop there without the floor's flag (`phonograph_key_*`). Residents and staff use NPC-only lift doors (`npcOnly`, locked to their owners) in front of the lifts.

## Money
- One currency: obols. Chips are bought and cashed at the cage, **1 obol = 1 chip, both ways, no fee** (`CASINO.chipRate`), minimum purchase 5. The cage is open when someone is behind it: Vera 10:00–16:00 and 20:00–02:00, Octavius 16:00–20:00.
- **Integrity** (`src/systems/casino.js`): every chip change goes through `Casino` — `exchange`, `debit` (a bet; refused unless you have the chips; whole numbers only) and `credit` (a round's return, **paid once per round id** — `paid[ref]`). Every movement is a ledger entry with its own id. You can't cash out while seated. Leaving a table refunds an unspun layout and stands (and settles) a hand in play. **After a load** nobody is seated: hands in play stand and settle once, chips on a layout come back — loading the same save twice gives the same chips.
- Table limits come from config (`CASINO.tables`).

## Rules (pure, `src/casino/`, tested in `tests/casino_rules.test.mjs`)
- **Cards** (`cards.js`): 52 cards as ints, Fisher–Yates with the game's seeded RNG, a poker evaluator for 5–7 cards (best five, the wheel, kickers, ties) and for 1–5 cards (for Morganius's table).
- **Roulette** (`roulette.js`): European single zero, the real wheel order. Straight 35:1; red/black, odd/even, 1–18/19–36 1:1; dozens and columns 2:1. Zero loses every outside bet.
- **Blackjack** (`blackjack.js`): six decks reshuffled at three quarters dealt; the dealer stands on all 17s; blackjack pays 3:2 (an odd bet rounds the half chip down); the dealer peeks under an ace or a ten; double on any first two cards; split once (split aces take one card each; 21 after a split is not a blackjack); no insurance or surrender.

## The tables (`src/ui/casino.js`)
A first-person scene: you sit at the felt; the table is projected with a pinhole camera (`proj`, inverted by `unproj` for clicks), Morganius floats on the far side. The scene only shows what the system has decided — the wheel is turned so the ball stops in the pocket already drawn; the cards are the round's, dealt in the round's order. Controls: mouse/touch on the layout and buttons; keys 1–7 (chip), Space (spin / deal), C (clear), H S D P (hit, stand, double, split), +/− (bet), Esc (leave, refused mid-hand). The world is paused while you sit.

## The host
`summonHost` takes Morganius from whatever he's doing (`intent.source = 'casino'`, a held intent) and flies him along a curve to the table's host place; `hostReady` tells the UI when to open the scene; any key skips. His world animation states (idle, perform, approach, arrive, flourish, leave) and scene states (roulette, blackjack, win, big_win, lose, push) are lists of card effects (`HOST_FX`, `EFFECTS` in `src/engine/cardMagic.js`).

## Roadmap
- v0.53.0 Texas Hold'em (blinds, four betting rounds, side pots, AI opponents with distinct styles, Morganius dealing).
- v0.54.0 Morganius's table: an original poker roguelike.
- v0.55.0 Nightlife: visitors through the night, croupiers and cleaners, table occupancy, ambience.
