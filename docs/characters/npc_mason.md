# Mason Nails — `npc_mason`

**Imported character** · added in v0.4.0 · interview 2026-10-13

## Source material

- **Image:** supplied by the player; stored with permission at `assets/portraits/reference/npc_mason_reference.jpg`. A 224 px crop (`assets/portraits/npc_mason.jpg`) is embedded in `src/content/portraits.js` and used as his dialogue portrait.
- **Visual reading (appearance only):** broad build, short reddish-brown hair, full ginger-brown beard, rectangular glasses, burgundy sweater, sitting in the cab of a small excavator. Personality was **not** inferred from the image; it comes from the interview.

## Interview summary

| Question | Player's answer | Implementation |
| --- | --- | --- |
| Who is this? | Mason Nails. Runs a construction company called **Mason's Os** — "That's O plural." | `npc_mason`, faction `fac_builders`; the signature line "Mason's Os — that's O plural! Because we never stop at one!" |
| What can the player do now? | Work at his construction site. | `job_construction_shift`: three stations, shifts like the refinery. |
| Future role? | The player pays him to build properties: business, rental or personal. New areas and plots come when the player says so. | Property groundwork (docs/PROPERTIES.md); **no plots yet**. |
| Employees? | About 3; all live in an apartment building next to the site. Invent them. | Dee, Barnaby, Quinn; Plumb Line Apartments next to the site. |
| Personality? | Very cheerful, a dad-joke machine, loves puns, neutral, always friendly to the player. | Puns in nearly every line; Pun of the Day; no dialogue lowers his regard (tested); refuses Sir Moneybucks's exclusive contract. |
| Where? | My choice (office and apartments). | New district **Westbrook Lots**, seamlessly west of Lanternside. |
| Site progress? | "Don't make the site progress." | The site is a fixed set-piece; it never changes visually. |
| Image storage? | Allowed. | Stored and embedded as portrait. |

The design preview was presented and approved ("Yes I like it and I did mean don't").

## Supplied vs. invented

- **Supplied:** name, company name and its "O plural" joke, construction work at the site, future property-building role (business / rental / personal), ~3 employees in a nearby apartment building, cheerful dad-joke personality, neutrality, friendliness to the player, shift work like the refinery, no visible site progress, groundwork for properties.
- **Invented (approved in preview):** Westbrook Lots and its layout; the Plumb Line Apartments; the crew (Dee Rivera, Barnaby Cole, Quinn Abernathy) and their personalities; his excavator "Shovel-ina"; the Pun of the Day; crew goodwill; permits via Osric (Form 22-B); blueprints, prices and timings; relationships with Mags, Osric, Tibbs and Sir Moneybucks; his whistled motif.

## Mechanics

- **Pun of the Day** — `Game.dailyPun()` picks from `PUNS` (`src/content/dialogue/mason.js`) by in-game day. Groan (+affection), laugh (+affection, +trust) or fire one back (Wits check; success = +respect and he remembers it). Once per day (`mason_pun_day`).
- **Always friendly** — his dialogue contains no negative relationship effects (enforced by a test); his reactions to the player rushing work or buying oil shares are good-natured barks.
- **Contracts board** — topic "I'd like to have something built" or the board in his office opens the contracts panel.
- **Neutral** — Sir Moneybucks tried to hire Mason's Os exclusively; Mason refused ("I don't take sides — I take measurements!").

## Routine

| Time | Where | Doing |
| --- | --- | --- |
| 06:30 | Kettle & Crumb, window table | breakfast, trading puns with Mags |
| 07:30 | the site | work |
| 10:00 | the excavator | digging (the excavator animates) |
| 12:00 | site bench | lunch |
| 13:00 | site office | paperwork |
| 15:30 | Civic Office | filing permits with Osric |
| 16:30 | the site | work |
| 18:30 | Plumb Line common room | leisure |
| 21:00 | Plumb Line | sleep |

Impulses: doing the rounds (with puns); building the player's property when one is under construction.

## The crew (generated)

- **Dolores "Dee" Rivera** — foreman. Hires 07:00–13:00 and pays six obols in coin. No-nonsense; secretly keeps a tally of Mason's puns that made her laugh (212).
- **Barnaby Cole** — gentle giant; cement and bricks; birdwatcher who feeds the gulls on the pier after work. Feuding with Tibbs over Margaret, a gull who stole Tibbs's sandwich.
- **Quinn Abernathy** — nervous apprentice surveyor and draftsperson; surveys the lots; will draw the player's buildings.
