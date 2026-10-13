# Lucas Eastrise — `npc_lucas`

**Imported character** · added in v0.13.0 · interview 2026-10-13

## Source material

- **Image:** supplied by the player; stored with permission at `assets/portraits/reference/npc_lucas_reference.jpg`. A 224 px crop (`assets/portraits/npc_lucas.jpg`) is embedded in `src/content/portraits.js` and used as his dialogue portrait.
- **Visual reading (appearance only):** tall; curly dark hair; half-rim glasses; brown pinstripe jacket over a black shirt; red patterned tie; jeans; tan shoes; a wristwatch. In game: `pattern: 'pinstripe'`, black undershirt, red tie, blue jeans, tan shoes, height 1.1. Personality was **not** inferred from the image.
- The player also supplied a picture of a globe covered in glowing trade routes as the look for the arms-works terminal. It was **not** stored; the terminal draws its own rotating globe in that style (`src/ui/terminal.js`).

## Interview summary

| Question | Player's answer | Implementation |
| --- | --- | --- |
| Who is this? | Lucas Eastrise, owner of **Pipecreek Armory** (the gun shop's new name). | `npc_lucas`; `shop_rook` renamed and staffed by him 09:00–19:00; back room where he sleeps. |
| Personality? | Sleazy and creepy, with wild takes about the political landscape of the world. | Too close, compliments your "trigger hands", knows your address. 14 rotating rants. |
| Which world? | Mix in real-world-style takes. | Rants about the fictional nations plus generic real-world-flavoured conspiracies, with no real people, parties or countries. |
| The pitch? | After buying a gun from him, he talks about starting an arms manufacturing business. | Buying any gun at Pipecreek sets `bought_gun_lucas`, which unlocks the pitch; accepting it unlocks the licence. |
| Killable? | Protected, with a guns-themed Wrath. | Theme `arms`. |
| Image storage? | Store Lucas; draw the globe. | Done. |

The design preview was approved ("Yes have it"), split into v0.13.0 (this) and v0.14.0 (the global market, shipping, heavy weapons in use).

## Supplied vs. invented

- **Supplied:** name, shop and its new name, sleazy/creepy personality, political takes (fictional plus real-world-style), the pitch after a gun purchase, specialized larger arms warehouses, weapon types (pistols, rifles, RPGs, missiles, drones), different sale prices, a research tree raising prices, the globe terminal (parts, research, hiring, selling), parts on a loading dock, procedurally generated employees who stay in the warehouse, fictional countries at fictional wars (v0.14), unreliable paid shipping (v0.14), a grey-market licence, every weapon usable (v0.14), production with both employees and the belt factory, wages/skills/morale/research staff.
- **Invented (approved in preview):** Mill Road Yards and its three works; the licence via Lucas's "guy"; workstation types; parts and components; weapon names and values; the research tree; employee quirks; wholesale to Lucas as the stopgap; the eight countries; the Wrath; his clarinet motif.

## Routine

| Time | Where | Doing |
| --- | --- | --- |
| 08:30–09:00 | Back-room desk | Breakfast and the forums |
| 09:00–19:00 | Counter (lunch at his desk 13:00–13:45) | Selling |
| 19:00–23:30 | Back-room desk | Connecting red string |
| 23:30–08:30 | Back-room cot | Sleep |

## The Wrath — "EVERYTHING IS FOR SALE"

A showroom spotlight under Lucas; orbiting pistols, bullets and price tags (SALE, NO REFUNDS, AS IS); a red reticle under the player; four crates stencilled NOT GUNS fall and burst into flying guns; a missile streaks in and explodes; a drone swarm closes in; a giant SOLD price tag swings down on its string. You wake at home.
