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

## Places and access

| Place | Map id | Owner/keys | Hours |
| --- | --- | --- | --- |
| No. 9, Gullwing Row | `player_flat` | Player (`item_flat_key`) | — |
| The Kettle & Crumb | `cafe` | Mags | 07:00–21:00 |
| Lanternside Civic Office | `civic_office` | Osric | 08:30–17:00 |
| Hollow Fixings | `workshop` | Tibbs | 07:00–23:00 |
| The Old Lighthouse | `lighthouse` | Civic property; key in the Clerk's desk, top drawer | Closed. Entry without permission is trespass. |
| Vane residence | `osric_house` | Osric | Private |
| No. 11 / Collective Hall | — | No interiors yet | Locked |

## Institutions and factions

| Id | Name | Values | Notes |
| --- | --- | --- | --- |
| `lanternside` | The borough at large | — | General reputation. |
| `fac_civic` | Lanternside Civic Office | Order, procedure, the public record | One employee: Osric, who is also its union rep and currently in dispute with himself. |
| `fac_merchants` | Canal Row Traders | Reliability, custom, good gossip | Mags is the de-facto voice. |
| `fac_quay` | Quay Workers' Collective | Loyalty, practical help | Tibbs is a member; the Hall is members-only. |

## Residents

See `docs/CHARACTER_REGISTRY.md` for implementation details.

- **Marguerite "Mags" Pell** — runs the Kettle & Crumb (22 years; her mother before her; her grandfather ran it as a chandlery). Lives behind a screen in the café. Knows everyone. Calls people petal, duck, love.
- **Osric Vane** — Clerk of the Lanternside Civic Office. Punctilious, honest, secretly sentimental, helpless before a honey bun. Lunches at the café 12:00–13:00 daily; inspects the Point around 17:00.
- **Tibbs Hollow** — mechanic at Hollow Fixings on the Quay. Building a boat engine called **Duchess**. Impulsive; frequently causes bangs. Has received several noise citations (Form 7-B).

## History and mysteries

- **Eleven years ago** the lighthouse went dark. Officially "decommissioned" by city instruction; the Civic Office paperwork is incomplete.
- The **keeper's log** (on the lectern inside) records: 14th Thornmonth, light steady, gulls restless; 15th, a night letter signed only **"M."** under "the old seal" ordered the great lens removed "for safekeeping"; 16th, lens removed, the Point dark; the keeper oiled the clockwork so it could turn again "the moment the lens returns". The rest is blank.
- The **lamp mechanism** has been oiled recently — someone still maintains it.
- A **lens shard** in the keeper's chest hums faintly in light.
- Osric (if told): the "old seal" was the **Harbourmaster's**, an office abolished **twelve** years ago — a year *before* the letter.
- Open questions (do not resolve casually): Who is M? Where is the lens? Who oils the clockwork? Why does the shard hum? Are the gulls organised?

## Running jokes and tone

Warm, dry, slightly absurd. Paperwork (Form 12-C Temporary Access, Supervised (Unsupervised); Form 7-B Excessive Bang; Form 0: Request for a Form). Mags's patio permit (fifth application). Gulls. Duchess. Nobody is cruel for its own sake.

## Established mechanical facts

- 1 real second = 1 game minute at default rate. A day is 24 real minutes.
- A new game starts on Day 1 (Moonday) at 08:00 in the player's flat with 12 obols and the flat key; 8 more obols and a bandage are in the wardrobe.
- The café bakes at 05:30 and restocks to 5 honey buns, 4 scones, 8 coffees.
