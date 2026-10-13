# Character Registry

Stable IDs never change once a character exists in a released build (saves reference them).

| ID | Name | Origin | Tier | Role | Files | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `npc_mags` | Marguerite "Mags" Pell | Original | Major | Café owner, gossip broker | `src/content/characters/mags.js`, `src/content/dialogue/mags.js` | Implemented & tested |
| `npc_osric` | Osric Vane | Original | Major | Civic Office clerk, key holder | `src/content/characters/osric.js`, `src/content/dialogue/osric.js` | Implemented & tested |
| `npc_tibbs` | Tibbs Hollow | Original | Major | Mechanic, inventor, junk buyer | `src/content/characters/tibbs.js`, `src/content/dialogue/tibbs.js` | Implemented & tested |

Imported (player-supplied) characters: **none yet.** Use `docs/CHARACTER_IMPORT.md`.

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
