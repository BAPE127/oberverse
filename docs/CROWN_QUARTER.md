# The Crown Quarter and Halver House (v0.93.1)

Sund's capital district, a region of its own (`crown`, map `crown_quarter`, 180 × 120 tiles), entered by the **Crown Gate** at the east end of Crown Street's turning circle in Halvermouth (`door_hv_crown_*`, arriving at the quarter's `west_gate`; back at Halvermouth's `crown_gate`). Authored in `src/content/maps/crownQuarter.js`; Halver House in `src/content/maps/halverHouse.js`. Preview: `npm run map -- crown_quarter`.

## Layout

| Place | Where |
| --- | --- |
| Crown Park, the Royal Pavilion, Halver House, the Assembly | north of **Palace Road** (y 36–39), with a palace checkpoint |
| Sovereign Square (fountain, flagpoles, demonstration ground, press line) | y 41–74 |
| Staff flats, civil service residences | west of the square |
| Six ministries (Treasury, Defence & Security, Interior & Police, Agriculture & Trade, Foreign Affairs, Public Records) | east of the square |
| **Sovereign Way** (x 92–95) | south from the square to Embassy Row and the Gate Road |
| **Embassy Row** (y 89–92): ten embassies and the Free Ports Mission (west), the two party HQs, the press hall, the hotel, Café Concord and the Diplomats' Club (east) | |
| **Crown Gate Road** (y 107–110) | the checkpoint and the gate at the west edge |

## Halver House

The main hall is laid over the building's footprint (40 × 32). Ten rooms open off its north wall, each its own small map, in three zones:

- **Public** (08:00–18:00, no flag): the press briefing room and the public records hall (its terminal opens the Politics page).
- **By appointment** (the `halver_appointment` flag, 08:00–18:00): the waiting gallery, the chief of staff, the cabinet room, the staff offices.
- **Restricted** (the `halver_pass` flag, any hour): the President's office, negotiation rooms A and B, security control.

The doors enforce the zones; the front door follows the public hours. Nothing grants the two flags yet: the People release adds the President, the staff, the guards and ambassadors, and the ways to be let in (an appointment, a pass, a persuaded aide).

## Other buildings

Every other building has a locked door with a sign and a plain room generated on its footprint (`trade: 'office'`, `'hotel'`, `'diner'`, `'house'` or `'shop'`), the way Starling's buildings were first made. They open as their people arrive.
