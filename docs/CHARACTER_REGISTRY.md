# Character Registry

Stable IDs never change once a character exists in a released build (saves reference them).

| ID | Name | Origin | Tier | Role | Files | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `npc_mags` | Marguerite "Mags" Pell | Original | Major | Café owner, gossip broker | `src/content/characters/mags.js`, `src/content/dialogue/mags.js` | Implemented & tested |
| `npc_osric` | Osric Vane | Original | Major | Civic Office clerk, key holder | `src/content/characters/osric.js`, `src/content/dialogue/osric.js` | Implemented & tested |
| `npc_tibbs` | Tibbs Hollow | Original | Major | Mechanic, inventor, junk buyer | `src/content/characters/tibbs.js`, `src/content/dialogue/tibbs.js` | Implemented & tested |
| `npc_moneybucks` | Sir Richard E. Moneybucks, Esq. | **Imported** (player image + interview) | Major | Owner of Ober's Oil; antagonist | `characters/moneybucks.js`, `dialogue/moneybucks.js`, `docs/characters/npc_moneybucks.md` | Implemented & tested |
| `npc_crisp` | Bartholomew Crisp | Generated for the import | Minor | Butler; grants manor invitations | `characters/oberStaff.js`, `dialogue/oberStaff.js` | Implemented & tested |
| `npc_agnes` | Agnes Thornbury | Generated for the import | Minor | Bookkeeper; share register; whistleblower | 〃 | Implemented & tested |
| `npc_gideon` | Gideon Slate | Generated for the import | Minor | Refinery foreman; shifts; company store | 〃 | Implemented & tested |
| `npc_ruby` | Ruby Calder | Generated for the import | Minor | Refinery engineer; safety | 〃 | Implemented |
| `npc_hank` | Hank Dorsey | Generated for the import | Minor | Derrick rigger; tall tales (night tankers) | 〃 | Implemented |
| `npc_pip` | Pip Wexley | Generated for the import | Minor | Apprentice and runner | 〃 | Implemented |
| `npc_delphine` | Delphine Moreau | Generated for the import | Minor | Chemist; analyses the lens shard | 〃 | Implemented |
| `npc_silas` | Silas Grimmer | Generated for the import | Minor | Security; strikebreaker | 〃 | Implemented |
| `npc_mabel` | Mabel Quince | Generated for the import | Minor | Manor cook; feud with Mags | 〃 | Implemented |
| `npc_otto` | Otto Brandt | Generated for the import | Minor | Pipe fitter; organiser; strike leader | 〃 | Implemented & tested |
| `npc_mason` | Mason Nails | **Imported** (2026-10-13) | Major | Owner of Mason's Os construction; pun machine; builds properties | `motif_mason` | Implemented & tested |
| `npc_lawrence` | Lawrence Order | **Imported** (2026-10-13) | Major | Chief of Police, Precinct 1; careless, bribable; never leaves the station; protected (LAW & ORDER Wrath) | `motif_lawrence` | Implemented & tested |
| `npc_justin` | Sgt. Justin Case | Generated for the Lawrence import | Minor | Over-prepared sergeant; revolver; Plaza, Bank Row, East Gate, Founders Park | — | Implemented & tested |
| `npc_warren` | Officer Warren Tee | Generated for the Lawrence import | Minor | By-the-book; pistol; Sumps, Mission, Docks | — | Implemented & tested |
| `npc_bailey` | Officer Bailey Bond | Generated for the Lawrence import | Minor | Smooth, bail business on the side; pistol; Lanternside | — | Implemented & tested |
| `npc_miranda` | Officer Miranda Wright | Generated for the Lawrence import | Minor | Earnest rookie; baton; Westbrook, Gullwing Park, Canal Row | — | Implemented & tested |
| `npc_hugh` | Officer Hugh Jury | Generated for the Lawrence import | Minor | Grumpy veteran; shotgun; Ober Fields, then night guard of the cells | — | Implemented & tested |
| `npc_petty` | Petty Larson | Generated for the Lawrence import | Minor | Pickpocket in the next cell; sells the vent secret | — | Implemented & tested |
| `npc_arthur` | Arthur Anderson | **Imported** (2026-10-13) | Major | Leader of the Sums of Anarchy; always angry, maths-obsessed, protective, vengeful; protected (maths Wrath) | `motif_arthur` | Implemented & tested |
| `npc_al` | Al Gebra | Generated for the Arthur import | Minor | Enforcer; delivers warnings; knuckles | — | Implemented & tested |
| `npc_percy` | Percy Ntage | Generated for the Arthur import | Minor | Bookkeeper; never fights | — | Implemented & tested |
| `npc_minnie` | Minnie Mus | Generated for the Arthur import | Minor | Runs the Abacus counter (`shop_sums`) | — | Implemented & tested |
| `npc_dee_nom` | Dee Nominator | Generated for the Arthur import | Minor | Bouncer; bat | — | Implemented & tested |
| `npc_tony` | Tony Tangent | Generated for the Arthur import | Minor | Lookout at the Sumps gate | — | Implemented & tested |
| `npc_max` | Max Imum | Generated for the Arthur import | Minor | Reckless; machete | — | Implemented & tested |
| 12 customers | Ray, Mo, Dot, Bill, Lena, Gus, Fern, Nico, Hattie, Bram, Pearl, Sol | Generated for the Arthur import | Minor | Sumps residents who buy calculators (`profile.customer`) | — | Implemented & tested |
| `npc_dee` | Dolores "Dee" Rivera | Generated for the Mason import | Minor | Site foreman; hires and pays | — | Implemented & tested |
| `npc_barnaby` | Barnaby Cole | 〃 | Minor | Labourer; birdwatcher; gull defender | — | Implemented & tested |
| `npc_quinn` | Quinn Abernathy | 〃 | Minor | Apprentice surveyor and draftsperson | — | Implemented & tested |

Imported characters: **Sir Moneybucks** (see `docs/characters/npc_moneybucks.md`), **Mason Nails** (see `docs/characters/npc_mason.md`) **Chief Lawrence Order** (see `docs/characters/npc_lawrence.md`) and **Arthur Anderson** (see `docs/characters/npc_arthur.md`). Their employees were generated at the player's request; minor characters have no individual motif.

## Combat temperaments (`profile.combat`)

| Fight back and defend others | Fight back | Never fight (always flee) |
| --- | --- | --- |
| Silas (defends anyone; revolver, 130 hp), Barnaby (defends anyone; 160 hp — but won't hit back for himself), Hank, Otto, Mabel, Dee, Mags, Tibbs (each defends particular friends) | Gideon (120 hp), Ruby (crowbar) | Mason, Osric, Sir Moneybucks, Crisp, Agnes, Pip, Delphine, Quinn |

Everyone else decides by personality (confidence and competitiveness). Anyone below 25% health stops fighting and runs.

**Protected (imported) characters:** Sir Moneybucks, Mason Nails, Chief Lawrence Order and Arthur Anderson cannot be harmed at all — attacking them calls down the Wrath. Their `combat` entries only matter if the owner ever marks them `killable: true`.

## Sir Moneybucks — `npc_moneybucks`

See `docs/characters/npc_moneybucks.md` for the full record (interview, tiers, mechanics, routine, audio).

## The Ober's Oil staff (`src/content/characters/oberStaff.js`)

| Character | Home / sleep | Routine highlights | Personality drivers | Hooks |
| --- | --- | --- | --- | --- |
| Crisp | Manor staff bed | Butler post 06:00–22:30; polishes silver (impulse) | conscientiousness 1.0, discretion .85 | Invitation by standing or a 10-obol tip; secret insult ledger at trust 20+ |
| Agnes | Manor staff bed | Study desk 08:30–17:30; walks in Gullwing Park 17:30 | honesty .8, discretion .7 | Share register; Lot 14 ledger page (Charm check); vault key copy at trust 25+; private ledger catches snoops |
| Gideon | Bunkhouse | Foreman 06:00–18:00 (restocks the company store) | conscientiousness .9, empathy .2 | Hires day labour; pays wages; overpriced company store |
| Ruby | Bunkhouse | Distillation column; pumpjack maintenance 14:00 | honesty .9, empathy .75 | Warns about risk; notices cut corners; pickets |
| Hank | Bunkhouse | Derricks; fishes off the pier 18:00 near Tibbs | sociability .9, discretion .1 | Tall tales incl. the night tankers; pickets |
| Pip | Bunkhouse | Barrel line; runs messages; dreams at the overlook | gullible, kind | Tells you the vault hums; pickets |
| Delphine | Refinery lab cot | Lab 08:00–20:00; dry fountain at 20:00 | curiosity .95 | Analyses the lens shard → points to the manor |
| Silas | Manor staff bed | Gate 06:00–18:00; tank yard patrol | empathy .1, loyal | Watches the gate; breaks strikes on command |
| Mabel | Manor staff bed | Kitchen; stands outside the Kettle & Crumb 14:00 | competitiveness .9 | Nine-year feud with Mags (their chats become arguments); manor gossip |
| Otto | Bunkhouse | Pipeline/valves; organises at 18:00; Quay Collective at 20:00 | empathy .85, discretion .75 | Starts the strike at low morale; strike fund; union thread |

## Mason Nails — `npc_mason`

See `docs/characters/npc_mason.md` for the full record (interview, Pun of the Day, routine, crew).

## The Mason's Os crew (`src/content/characters/mason.js`)

| Character | Home / sleep | Routine highlights | Personality drivers | Hooks |
| --- | --- | --- | --- | --- |
| Dee | Plumb Line Apartments | Foreman post 06:45–17:30 (lunch on the site bench) | conscientiousness .95, honesty .85 | Hires 07:00–13:00; pays 6 obols; tells you your crew goodwill; secret pun tally at trust 20+ |
| Barnaby | Plumb Line Apartments | Mixer mornings, bricks afternoons; gulls at the basin at noon and on the pier 17:00–19:00 | empathy .95, patience .9 | Gull feud with Tibbs; loves gull feathers |
| Quinn | Plumb Line Apartments | Coffee at the café 07:00; drafting; surveys the lots 12:45–16:00 | conscientiousness 1.0, confidence .2 | Explains plots and blueprints; encouragement (Charm) raises goodwill |

All four (Mason included) join the `build_*` impulse when the player has a property under construction.

## Mags — `npc_mags`

- **Personality:** sociability .92, curiosity .85, empathy .8, discretion .1, conscientiousness .7. Warm, nosy, generous, keeps score.
- **Speech:** endearments (petal, duck, love), rhetorical questions, tangents. Rumour prefix "Well, I heard…".
- **Routine:** bakes 05:30 (restocks the café) → counter 07:00–15:00 → bench in Civic Square 15:00–16:30 → counter until 21:00 → tidies → sleeps 22:00. Impulse: pops out to the patio for a natter (sociability).
- **Mechanics:** *gossip broker* — trades rumours with the player in both directions; runs the café shop; gives the daily delivery job; starts *The Dark Lamp*; resolves it as the "tell the borough" outcome.
- **Relationships:** old friend of Osric (affection 25), fond of Tibbs (30).
- **Audio:** motif "Kettle's On" (clarinet, rising F-major arpeggio); voice: warm triangle ~330 Hz.

## Osric — `npc_osric`

- **Personality:** conscientiousness .95, honesty .95, discretion .8, sociability .3, impulsiveness .1. Punctilious, principled, secretly sentimental.
- **Speech:** formal, precise, form numbers, dry understatement. Rumour prefix "It has been reported — unofficially — that…".
- **Routine:** home 06:30 → Civic Office 08:30–12:00 → lunch at the café 12:00–13:00 (eats a honey bun if any are left; irritable if not) → office 13:00–17:00 → inspects the Point 17:00–18:30 → home → bed 22:00. Leaves 15 minutes early for everything. Impulses: overtime; searches the Point when the key is missing and he's flustered.
- **Mechanics:** *formal requests* — lighthouse access by trust ≥ 25 or Civic reputation ≥ 8 (locked option explains why), or a Wits check; bribery backfires; notices visitors to his office and connects them to a missing key; issues noise citations when he hears about bangs.
- **Gifts:** honey bun is loved (+14).
- **Audio:** motif "In Triplicate" (reed, staccato C march); voice: clipped square ~190 Hz.

## Tibbs — `npc_tibbs`

- **Personality:** impulsiveness .9, curiosity .95, riskTolerance .9, discretion .05, patience .2, conscientiousness .3.
- **Speech:** short bursts, exclamations, invented words ("splonk"), subject changes. Rumour prefix "Okay so apparently…".
- **Routine:** breakfast at the café 07:30 (coffee — grumpy if sold out) → workshop 09:00 → wanders the Quay 13:00 → workshop 14:00 → fishes off the pier 18:00 → tinkers with Duchess 21:00 → sleeps 01:00. Runs 10 minutes late. Impulses: struck by an idea (tinker), gull-watching.
- **Mechanics:** buys junk; sells the crowbar; *The Lucky Spanner* quest; knows (and overshares, once trusted) the lighthouse hatch; his tinkering causes bangs that feed the citation event chain.
- **Audio:** motif "Splonk" (pluck, bouncy E minor figure); voice: bright square ~420 Hz, fast.
