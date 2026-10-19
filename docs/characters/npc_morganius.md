# Morganius Spade (`npc_morganius`) — imported 2026-10-18

**Supplied:** a photo (stored with permission: `assets/portraits/reference/npc_morganius_reference.jpg`; portrait crop `assets/portraits/npc_morganius.jpg`) and the casino expansion brief: a floating, theatrical wizard who hosts the tables, with the energy of a showman sorcerer (the brief named Dr. Facilier as a mood — everything here is original), card magic, a dramatic arrival whenever you sit down, and a poker roguelike of his own.

**Interview answers (owner):** the resort goes where the Lucky Star bar stood (Halvermouth); store the photo; protect him (Wrath: a storm of cards) and give him a signature car (a black, hearse-like coach that trails cards).

**From the image (visual facts only):** a tall charcoal pointed hat with silver embroidery and its tip bent over; a dark high-collared robe with rune-stitched trim; a gold amulet with a faceted purple gem; dark short hair, clean-shaven; purple magic circles at his hands; cards in the air all round him. Mapped to the new `hairStyle: 'wizard'`, `robe: true` and the `amulet` accessory (src/engine/drawPeople.js), and `float: true`.

**Invented (in the spirit of the brief):** he is scrupulously fair — he tells you the odds exactly and says he has never needed to cheat; he was a card sharp, a stage magician, a riverboat dealer and (briefly) a hat; Octavius found him working a corner in the rain; he talked Octavius out of tearing down the Lucky Star's bar; he once refused Sir Moneybucks's request to fix a game ("the only thing I fix is my hat"); the motif "Sleight of Hand" (clarinet).

**Routine:** asleep in his rooms on 41 (03:00–10:00), tea and the crystal ball, rehearsing (11:00–13:00), lunch in the Lucky Star Lounge, then the casino floor from 14:00 to 03:00 — roaming between his favourite places (the stage, the centre, the tables, the lounge, the overlook) on weighted random choices with cooldowns (`Casino.minuteTick`).

**Mechanics:** hosts every table: when you sit, he drops what he is doing and flies to your table along a curve (from wherever he is — out of the air if he isn't on the floor); the first visit is the full show, later ones shorter, and E skips it. At the table (the first-person scene) his card magic answers what happens: cards orbit his fingers while he waits, spiral when the wheel spins, fan open when you win (a spiral storm on a big win), run up one arm and down the other when you lose; he deals blackjack from his hand. Effects are data (`HOST_FX` in src/engine/cardMagic.js) built from one reusable effect set (orbit, fan, spiral, path, scatter, trail, circle). Protected; Wrath `cards`. Signature car: **The Last Trick**. Signature weapon: **The Dead Man's Hand** (a fan of five steel-edged cards), in his trunk.

**Next:** his own table — the poker roguelike — in v0.54.0; dealing Hold'em in v0.53.0.
