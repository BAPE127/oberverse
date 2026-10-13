# Arthur Anderson — `npc_arthur`

**Imported character** · added in v0.11.0 · interview 2026-10-13

## Source material

- **Image:** supplied by the player; stored with permission at `assets/portraits/reference/npc_arthur_reference.jpg`. A 224 px crop (`assets/portraits/npc_arthur.jpg`) is embedded in `src/content/portraits.js` and used as his dialogue portrait.
- **Visual reading (appearance only):** broad build, short dark-brown hair, full ginger-brown beard, dark rectangular glasses, red V-neck sweater over a white T-shirt. Personality was **not** inferred from the image; it comes from the interview.

## Interview summary

| Question | Player's answer | Implementation |
| --- | --- | --- |
| Who is this? | Arthur Anderson, leader of the gang **Sums of Anarchy**. | `npc_arthur`, faction `fac_sums`, HQ: The Abacus in the Sumps. |
| Personality? | Always angry. Maths-obsessed, fiercely protective, petty and vengeful. | Every line shouts; percentages and margins; protective of the Sumps and his crew; a grudge ledger. |
| "He should be red"? | Red-faced with anger. | `appearance.angry`: permanent flush, slammed-down brows, steam; red sweater and ginger beard as in the photo. |
| Gang? | 5–8 members working with him; hostile to the police; works in the slums. | Six crew; they insult officers on sight; the Sumps never calls the police. |
| The drug? | Four-function calculators; each stat has its own; consuming improves stats. | Six calculators (Charm, Wits, Grit, Finesse, Health, Energy). Temporary boost (owner's choice), comedown, tolerance. |
| Buy from the gang? | Yes. | Minnie at the Abacus counter (`shop_sums`); refuses once the gang is hostile. |
| Customers? | Fill the slum with NPC customers; the gang gets angrier as you steal them (like Schedule I). | 12 customers; free samples; orders with time and place; referrals. Gang anger 0–100. |
| Gang anger effects? | Threats and ambushes; a truce option. | 25 warning (Al Gebra), 50 ambushes in the Sumps, 75 hunted across Halvermouth; tribute or a territory split. |
| Police? | Arrest you if they see you dealing. Bribes cover it like other crimes. | Dealing is a crime (severity 2) reported to officers who see it; Finesse shrinks the witness range. |
| Killable? | Arthur protected; the gang killable. | Arthur's Wrath theme `maths`. |
| Image storage? | Allowed. | Stored and embedded as portrait. |
| Warehouses? | Halvermouth docks; supplier with deliveries; grid with machines and belts. | **Next release (v0.12.0).** |

The design preview was approved ("yes looks good let's do it"), with the update split into two releases.

## Supplied vs. invented

- **Supplied:** name, gang name, leader role, always angry, red, maths-obsessed, protective, petty and vengeful; calculators as the drug with one per stat; 5–8 members; slum turf; hostility to police; buying from the gang; customers stolen from the gang raise their anger (Schedule I); arrests for dealing; threats, ambushes and a truce.
- **Invented (approved in preview):** the crew (Al Gebra, Percy Ntage, Minnie Mus, Dee Nominator, Tony Tangent, Max Imum), The Abacus, the 12 customers, calculator names and effects, prices, the anger numbers, the truce terms, the maths Wrath, his brass motif.

## Routine

| Time | Where | Doing |
| --- | --- | --- |
| 08:00–12:00 | Office desk | The books, furiously |
| 12:00–13:00 | Bar table | Lunch (angrily) |
| 13:00–16:00 | Office desk | The books |
| 16:00–19:00 | The Sumps | Walking his streets, checking the fire barrels |
| 19:00–23:30 | Bar | Glaring at the jukebox |
| 23:30–08:00 | Office cot | Sleep ("carry the one…") |

## The Wrath — "YOU DON'T ADD UP"

Graph paper spreads from his feet with y = 1/x plotted in red; steam jets; calculator keys and bad sums (2+2=5, x÷0, NaN) orbit; a ÷0 target under the player; four giant digits slam down, then a giant calculator reading ERROR; the player comes apart into pixels and numbers; the readout says UNDEFINED. You wake at home.
