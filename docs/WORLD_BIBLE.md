# World Bible

Established facts about the Oberverse. Treat everything here as canon; extend it, don't contradict it. When code and this document disagree, fix one of them in the same change.

## The setting

The **Oberverse** is an original, semi-modern world: trams, telephones, paper forms, rowing boats and engines, but no smartphones or internet culture. Bureaucracy is thick, communities are small, and odd things are treated as local colour. Gulls are a recurring nuisance and, some say, a conspiracy.

**Obermere** is the big city up the river — towers, trams and a City Council that sends the same memorandum every quarter. **Lanternside** is a seaside borough at its edge, "the bit they forgot to finish".

Currency: **obols**. Calendar: seven-day weeks — Moonday, Tideday, Wickday, Thornday, Fairday, Sunsday, Restday. Months mentioned so far: *Thornmonth*.

## Lanternside geography (map `lanternside`, 64×48 tiles)

| District | Area id | Contents |
| --- | --- | --- |
| Brindle Heights | `area_brindle` | Terraced houses on Gullwing Row: No. 9 (player's flat), the Vane residence, No. 11 (to let). A red post box. |
| Gullwing Park | `area_park` | Trees, pines on the east side, a pond, benches, wildflower beds. Where Tibbs lost his spanner. |
| Canal Row | `area_canal_row` | The Kettle & Crumb café and patio, benches along the Lantern Canal, the old wooden footbridge. |
| Civic Square | `area_civic` | Lanternside Civic Office, the Lamplighter Fountain (a bronze lamplighter whose wick has been dry for years), the notice board. |
| The Quay | `area_quay` | Hollow Fixings workshop, the Quay Collective Hall (members only), crates, the harbour basin, the pier, the beach. |
| Lighthouse Point | `area_point` | A pine-scattered headland. The decommissioned Old Lighthouse (locked; maintenance hatch on its east side). A civic "No public access" sign. |

Roads: **Gullwing Road** runs east–west; **Lamplighter Lane** runs north–south, crossing the **Lantern Canal** by a road bridge and continuing to the Quay.

## Westbrook Lots (map `westbrook`, 44×48 tiles)

Directly west of Lanternside: Gullwing Road runs straight on into Westbrook (the Lots' east edge is Lanternside's west edge), and the Lantern Canal's western reach ends in a turning basin. Mostly open land that the borough has started selling for building.

| Area | Area id | Contents |
| --- | --- | --- |
| Mason's Os Yard | `area_mason_yard` | The fenced construction site (foundation slab, scaffolding, the excavator "Shovel-ina", lumber, bricks, mixer, trench, a portable toilet stencilled MASON'S LOO-S) and the Mason's Os site office. The site never visibly progresses — Mason says they're "building the anticipation". |
| Westbrook Row | `area_westbrook_row` | Gullwing Road west, the Plumb Line Apartments (Mason is landlord; his crew are the tenants), the canal basin where Barnaby watches gulls. |
| The Lots | `area_the_lots` | Open land south of the canal marked out with Quinn's survey stakes; a sign invites enquiries. Future property plots (docs/PROPERTIES.md). |

## Halvermouth (map `halvermouth`, 112×80 tiles)

The big city, west of Westbrook along the old coast road: "the City of a Thousand Windows". Founded by Aldous Halver ("He Built A City Where There Was Only Mud" — the Sumps would say he didn't finish). A separate region: the road leaves Westbrook's west edge and arrives at the city's East Gate. The street grid: Crown Street, Grand Avenue and Mill Road run east–west; Tanner Street, Justice Way, Court Street and Harbor Street run north–south.

| District | Area id | Contents |
| --- | --- | --- |
| The Financial District | `area_hv_financial` | A wall of skyscrapers along Crown Street: Halvermouth Mutual, the Ledgerline Building, Crown Insurance, Meridian Trust (helipad), the Halvermouth Herald, Copperfield Exchange, the Atlas Rooms, Vantage Point (helipad), the Telephone Co. |
| Bank Row | `area_hv_bank_row` | **Ober's Oil Tower** (30 storeys, gold glass; appointments only), the First Bank of Halvermouth, Harbourline Apartments and its car park. |
| Civic Plaza | `area_hv_civic` | The domed **Hall of Justice** (courthouse + Office of the Mayor), the statue of Aldous Halver, flags, benches, the city notice board. |
| Precinct Row | `area_hv_precinct` | **Police Precinct 1** (open day and night) with its cruiser car park; Ironclad Securities. |
| The East End | `area_hv_east_end` | The Grand Hotel; the East Gate (gateposts, welcome sign) where the coast road enters. |
| Market Street | `area_hv_market` | The Rialto cinema, Market Hall and stalls, Dinah's Diner, Golden Hock Pawn & Loan, the Lucky Star bar. |
| Iron Row | `area_hv_iron_row` | **Rook & Rifle Firearms** (licensed dealer), Tumbler & Sons Locksmiths, Bail Bonds 24/7, Iron Row Garage. |
| Founders Park | `area_hv_park` | Trees, paths, a pond. "No pigeons." |
| The Docks | `area_hv_docks` | Warehouses 7, 9 and 12, the Port Authority, Northbank Cold Storage, two piers. |
| The Sumps | `area_hv_sumps` | The slums (officially the "Mill District Regeneration Zone", Phase 1 "beginning soon" for eleven years): mud, patched shacks, tents, burning oil drums (marked OBER'S OIL), washing lines, wrecked cars behind razor wire, and St. Brennan's Mission ("Soup · Beds · No Questions"). |

Story seeds planted in the map (not yet used): unsolved warehouse fires on Mill Road; the deferred Mill District regeneration file in the Mayor's cabinet; the empty frame where the current Mayor's portrait should hang; Ober's Oil Tower looming over Bank Row.

## The Ober Fields (map `ober_fields`, 52×40 tiles)

Directly east of Lanternside: Gullwing Road simply becomes the county road (the two maps are one continuous stretch of coast; the Fields' west edge is Lanternside's east edge). The Lantern Canal ends in a culvert pool just past the boundary, and the harbour's eastern shore runs along the Fields' south-west corner. Sir Moneybucks bought a cabbage farm here twenty years ago and struck oil.

| Area | Area id | Contents |
| --- | --- | --- |
| County Road | `area_county_road` | The road from Lanternside; the workers' bunkhouse outside the company fence; the gate and gatehouse booth (Silas). Sign: "Trespassers will be invoiced." |
| Moneybucks Estate | `area_estate` | Moneybucks Manor, a marble fountain topped with a gilded derrick, hedges. |
| Ober's Oil Refinery | `area_refinery` | Refinery No. 1, storage tanks, pipes, the yard. |
| The Oil Fields | `area_oilfields` | Derricks No. 1–3, pumpjacks (one named Gerald), pipes; new derricks appear as investors fund them. |

## Places and access

| Place | Map id | Owner/keys | Hours |
| --- | --- | --- | --- |
| No. 9, Gullwing Row | `player_flat` | Player (`item_flat_key`) | — |
| The Kettle & Crumb | `cafe` | Mags | 07:00–21:00 |
| Lanternside Civic Office | `civic_office` | Osric | 08:30–17:00 |
| Hollow Fixings | `workshop` | Tibbs | 07:00–23:00 |
| The Old Lighthouse | `lighthouse` | Civic property; key in the Clerk's desk, top drawer | Closed. Entry without permission is trespass. |
| Vane residence | `osric_house` | Osric | Private |
| Moneybucks Manor | `manor` | Sir Moneybucks and household staff | Callers by invitation (Crisp), 08:00–21:00 |
| Ober's Oil Refinery No. 1 | `refinery` | Refinery staff | 06:00–20:00 |
| Workers' Bunkhouse | `bunkhouse` | The five refinery/field hands | 06:00–22:00 |
| Mason's Os Site Office | `mason_office` | Mason and crew | 07:00–18:30 |
| Plumb Line Apartments | `apartments` | Mason (landlord) and crew | 07:00–22:00 |
| Hall of Justice (Mayor's office, Courtroom One) | `hall_of_justice` | City of Halvermouth | 08:00–18:00 |
| Police Precinct 1 | `police_station` | Halvermouth Police | Always open |
| Rook & Rifle Firearms | `gun_shop` | (owner not yet introduced) | 09:00–19:00 |
| Other Halvermouth buildings | — | No interiors yet | Closed, each with a reason |
| No. 11 / Collective Hall | — | No interiors yet | Locked |

## Institutions and factions

| Id | Name | Values | Notes |
| --- | --- | --- | --- |
| `lanternside` | The borough at large | — | General reputation. |
| `fac_civic` | Lanternside Civic Office | Order, procedure, the public record | One employee: Osric, who is also its union rep and currently in dispute with himself. |
| `fac_merchants` | Canal Row Traders | Reliability, custom, good gossip | Mags is the de-facto voice. |
| `fac_oil` | Ober's Oil | Profit, deference | Sir Moneybucks's company. Pays partly in company scrip. |
| `fac_builders` | Mason's Os | Good work, fair pay, a decent pun | Mason Nails's construction crew. Pays in coin, never scrip. Neutral in the oil feud. |
| `fac_quay` | Quay Workers' Collective | Loyalty, practical help | Tibbs is a member; the Hall is members-only. |

## Residents

See `docs/CHARACTER_REGISTRY.md` for implementation details.

- **Marguerite "Mags" Pell** — runs the Kettle & Crumb (22 years; her mother before her; her grandfather ran it as a chandlery). Lives behind a screen in the café. Knows everyone. Calls people petal, duck, love.
- **Osric Vane** — Clerk of the Lanternside Civic Office. Punctilious, honest, secretly sentimental, helpless before a honey bun. Lunches at the café 12:00–13:00 daily; inspects the Point around 17:00.
- **Tibbs Hollow** — mechanic at Hollow Fixings on the Quay. Building a boat engine called **Duchess**. Impulsive; frequently causes bangs. Has received several noise citations (Form 7-B).

- **Sir Richard E. Moneybucks, Esq.** — founder and owner of Ober's Oil. Everyone calls him Sir Moneybucks (Mags says he bought the title from a bankrupt baronet). Ruthless, grandiose, contemptuous of the poor. See `docs/characters/npc_moneybucks.md`.
- **Mason Nails** — owner of Mason's Os ("That's O plural!"). Cheerful, endlessly punning, friendly to everyone, neutral; refused to work exclusively for Sir Moneybucks. Breakfasts at the Kettle & Crumb, files permits with Osric every afternoon. See `docs/characters/npc_mason.md`.
- **The Mason's Os crew** — Dolores "Dee" Rivera (foreman, secret pun tallier), Barnaby Cole (gentle giant; defends the gulls, especially Margaret, who stole Tibbs's sandwich), Quinn Abernathy (nervous apprentice surveyor). All live at the Plumb Line Apartments.
- **The Ober's Oil household and crew** — Crisp (butler, 30 years), Agnes Thornbury (bookkeeper), Mabel Quince (cook; runner-up at the Harbour Fair bake-off nine years ago, beaten by Mags — "the judges were bribed with buns"), Silas Grimmer (security), Gideon Slate (foreman), Ruby Calder (engineer), Hank Dorsey (rigger), Pip Wexley (apprentice), Delphine Moreau (chemist), Otto Brandt (pipe fitter, wears the union's blue thread).

## History and mysteries

- **Eleven years ago** the lighthouse went dark. Officially "decommissioned" by city instruction; the Civic Office paperwork is incomplete.
- The **keeper's log** (on the lectern inside) records: 14th Thornmonth, light steady, gulls restless; 15th, a night letter signed only **"M."** under "the old seal" ordered the great lens removed "for safekeeping"; 16th, lens removed, the Point dark; the keeper oiled the clockwork so it could turn again "the moment the lens returns". The rest is blank.
- The **lamp mechanism** has been oiled recently — someone still maintains it.
- A **lens shard** in the keeper's chest hums faintly in light.
- Osric (if told): the "old seal" was the **Harbourmaster's**, an office abolished **twelve** years ago — a year *before* the letter.
- **Resolved in v0.2.0 — M. is Sir Moneybucks.** Twelve years ago Ober's Oil bought "Lot 14: Harbourmaster's seal & effects" at the Obermere Harbour Board's dissolution auction (authorised R.E.M.). With the seal he ordered the great lens removed; the dark bay let Ober's Oil tankers cross at night, lamps out, untaxed. The lens sits in the vault in his study and hums. Depending on the player it may be returned (exposed or restored), or stay buried (blackmail or partnership).
- The shard hums in sympathy with the great lens.
- Still open: Who oils the clockwork? Why does the glass hum at all? What lies up the blocked lighthouse stair? Are the gulls organised?

## Running jokes and tone

Warm, dry, slightly absurd. Paperwork (Form 12-C Temporary Access, Supervised (Unsupervised); Form 7-B Excessive Bang; Form 0: Request for a Form). Mags's patio permit (fifth application). Gulls. Duchess. Nobody is cruel for its own sake.

## Established mechanical facts

- 1 real second = 1 game minute at default rate. A day is 24 real minutes.
- A new game starts on Day 1 (Moonday) at 08:00 in the player's flat with 12 obols and the flat key; 8 more obols and a bandage are in the wardrobe.
- The café bakes at 05:30 and restocks to 5 honey buns, 4 scones, 8 coffees.
- Ober's Oil pumps 100 barrels a day at baseline; share price starts at 30 obols; dividends are paid at 18:00.
- Company store prices: coffee 4 (café: 3), bandage 7 (list: 5), Ober Imperial cigar 12.
