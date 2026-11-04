# Politics in Sund (v0.93.0 – v0.94.0)

Plan: `docs/PROPOSAL_POLITICS.md`. Audit: `docs/POLITICS_AUDIT.md`. The capital: `docs/CROWN_QUARTER.md`. Nothing in the political system changes a price, a cost, the police or any war you play with yet; the Economy release (v0.96.0) wires policies in. You never have to take part.

## What exists

| Piece | Where |
| --- | --- |
| Constitution, two parties (the Order Party, Josiah Vegas; the Liberty League, Susan), issues and platforms, ten staff roles each | `src/content/politics.js` |
| The record `world.politics` (made with the world; an older save gains each part when first used) | `src/systems/politics.js` (`game.politics`) |
| The calendar: a 120-day term, the vote in its last 30 | `src/politics/calendar.js` |
| 43 people of the capital: 11 ambassadors, both parties' staff, Halver House's household (receptionist, press secretary, chief of staff, two guards, records clerk), six ministers; generated from one table | `src/content/capital.js`; homes in `homes.js`, `life.js` |
| Sixteen policies (eight opposed pairs), each on one issue, with a monthly cost or saving, the variable it will move and the blocs it affects | `src/content/policies.js` |
| The Assembly's vote: a tally of 100 seats | `src/politics/assembly.js` |
| The state's monthly budget (thousands of obols: the state's money, never the player's) | `src/politics/budget.js`, `GOVERNMENT.budget` |
| Policy scoring and the administration's proposals | `src/politics/policy.js` |
| Public opinion: nine blocs × Sund's nine states; polls | `src/content/opinion.js`, `src/politics/opinion.js` |
| The Politics app (Overview, Government, Polls) | `src/ui/politicsApp.js` |

## How a government runs

- **A policy** moves proposed → review (committee) → the Assembly's vote → approved → implementing → active (and suspended or ended); waits are fixed (`GOVERNMENT.days`). A new policy repeals its opposite; a government may hold at most seven. A government starts with the three policies that best fit its platform already in force.
- **The cabinet** meets every seventh day and proposes the one policy it most believes in: **score = platform fit + affordability + election timing + approval** (approval is the latest *poll's*, never the truth). A government proposes only what it believes in and reverses an existing policy only if the new one is clearly better.
- **The vote** is a tally: each party's seats vote yes in proportion to how far the policy fits its stance on the issue; the governing party's discipline adds to its own; independents follow the average. More than half of all seats passes it.
- **The budget** closes every thirtieth day: revenue (a fixed base reduced by wars and embargoes) minus standing departments, the active policies and interest on the debt; a deficit joins the debt, and a deficit above a quarter of revenue puts the Treasury on notice. The debt is tracked in the record; merging it with Sund's government bond is the Economy release.
- **Opinion** is worked out for each (state, bloc) cell from the blocs' leanings on the issues, the policies in force (bounded), the deficit, wars and embargoes. **Polls** ask a sample: sampling error from the sample size, a pollster's house effect, a stated margin and a reporting delay; the noise is a hash of the poll's number (no randomness, so a reload cannot change a poll). The player sees polls only: the true series is kept internally for the systems that follow.

## The people

Each of the 43 is a minor, generated character (never a villain or a saint) with a flat in Staff Flats A or B, the Civil Service Residences or the Diplomatic Residences, a schedule (home, work, lunch by the fountain, a walk, home) and a dialogue. Embassies, the party headquarters, the café and the hotel are open to visitors in their hours; their own people may enter at any hour; ministries are for their ministers; Halver House's rooms for its household and the two leaders. The leader in office works at Halver House (`Politics.syncLeaders`); the other works the capital from party headquarters.

## The estates (v0.94.1)

**Ironcrest Hall** (Josiah Vegas) lies through the east gate of Palace Road: a walled compound with a gatehouse, the guards' cottages, a range and armoury, and the Hall (a great hall; private quarters, study and war room; security and kitchen). **Willowmere** (Susan) lies through the east gate of the Gate Road: an open garden by a lake, the house (a great hall and long library; private quarters; the open study where she holds her surgeries; security and kitchen), a glass conservatory for fundraising dinners and a garden pavilion for meetings. Each has a household of three living in its own cottages. **Access is by invitation**: each front door opens 09:00–21:00 once the house has invited you (`ironcrest_invited` / `willowmere_invited`), which the steward grants to someone known to the house (trust) or with an appointment (`halver_appointment`); the private rooms need `…_trusted`; the staff rooms are the household's. The leaders sleep in their private quarters and commute on foot. The two **party headquarters** are real offices with a desk for each of the ten staff roles, the leader's office and a war room.

## Not yet

Elections and campaigns (v0.95.0), influence and donations, diplomacy and the single writer for wars and embargoes, unrest, the player's own party, and every effect of a policy on the world.
