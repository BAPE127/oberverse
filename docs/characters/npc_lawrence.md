# Lawrence Order — `npc_lawrence`

**Imported character** · added in v0.10.0 · interview 2026-10-13

## Source material

- **Image:** supplied by the player; stored with permission at `assets/portraits/reference/npc_lawrence_reference.jpg`. A 224 px crop (`assets/portraits/npc_lawrence.jpg`) is embedded in `src/content/portraits.js` and used as his dialogue portrait.
- **Visual reading (appearance only):** a police officer in a navy uniform and peaked cap, beard, glasses, broad build. Personality was **not** inferred from the image; it comes from the interview.

## Interview summary

| Question | Player's answer | Implementation |
| --- | --- | --- |
| Who is this? | Police chief **Lawrence Order**. | `npc_lawrence`, faction `fac_police`, Chief of Halvermouth Precinct 1. |
| Personality? | "Comes across as a careless cop." Lax unless the player builds a criminal reputation. | Low conscientiousness, naps, long lunches; ignores petty crime below record 8 (`KNOWN_CRIMINAL`). |
| Bribes? | Yes; police then ignore or delay other NPCs' calls. A set number of days. | 3 days (`BRIBE_DAYS`); price 40 + 8 × record. Calls ignored, officers look away; a killing is still reported, 4 h late. |
| Where? | Stays in the police station. | Every schedule block is in `police_station`. |
| Officers? | 5 more, generate them, all armed, justice-based names, roam all four areas and future ones. Killable; killing one is a serious crime. | Justin Case, Warren Tee, Bailey Bond, Miranda Wright, Hugh Jury. Murdering an officer: record +20, ★★★, no bribes. |
| Jail? | Killed or arrested → jail; skip time to serve it, or break out (design it). | Cell block below the precinct; four breakouts (see below). |
| Wanted system? | "You will have to create a wanted system." | Record + 0–3 stars, calls, dispatch, pursuit, cuffing, surrender (G), fines. |
| Killable? | No; needs an animation if attacked. | Protected; Wrath theme `law`, ending in jail. |
| Image storage? | Allowed. | Stored and embedded as portrait. |

The design preview (wanted system, jail breakouts, LAW & ORDER Wrath) was approved: "Everything else looks good".

## Supplied vs. invented

- **Supplied:** name, role, careless personality, laxness until a criminal reputation, bribery and its effect on calls, staying in the station, five armed roaming officers, killable officers, jail on death/arrest with serving or breaking out, protection with an animation, justice-based names.
- **Invented (approved in preview):** officer names and personalities and their beats; Petty Larson; the precinct layout (lobby, Chief's office, bunk room) and the cell block; severities, prices, sentence lengths; the four breakouts; fines; the LAW & ORDER Wrath; his tuba motif.

## Routine

| Time | Where | Doing |
| --- | --- | --- |
| 07:30–08:15 | Desk | Doughnuts |
| 08:15–12:00 | Desk | "Working" |
| 12:00–13:30 | Visitor chair | A long lunch, delivered |
| 13:30–15:00 | Desk | "Working" |
| 15:00–16:00 | Couch | A "strategic review" (nap) |
| 16:00–18:30 | Desk | "Working" |
| 18:30–20:30 | Lobby | A lap he logs as a patrol |
| 20:30–22:30 | Desk | The crossword |
| 22:30–07:30 | Couch | Sleep |

## The Wrath — LAW & ORDER

Banner **"YOU HAVE THE RIGHT TO REMAIN SILENT"**. Red/blue siren wash and sweeping searchlights; police tape around him; rings of badges, handcuffs and CASE CLOSED / DENIED stamps; a chalk outline under the player; four squad cars ram in; a giant gavel comes down; a paperwork blizzard buries the player, stamped GUILTY; cell bars drop. The player wakes in a cell (`after: 'jail'`).

## Jail breakouts

1. **Spoon** — keep the spoon from the meal tray; dig at the loose brick at night (best while Jury dozes 01:00–04:00), 4 hours of digging → tunnel to the Sumps.
2. **Keys** — while Jury sleeps, reach through the bars (30% + 8% per Finesse); fail and +12 h.
3. **Bribe the guard** — 60 + 2 × record obols while he's awake; door and stairs left open, no warrant, but no gear back. Refused if you killed an officer.
4. **The vent** — Petty Larson sells the secret and his bent fork for 25 obols or an Ober Imperial cigar; the vent comes out on the docks.

Escapes 1, 2 and 4 are jailbreaks: record +8, ★★.
