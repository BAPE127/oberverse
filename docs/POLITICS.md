# Politics in Sund (v0.93.0 – v0.95.0)

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
| The Politics app (Overview, Government, Polls, Vote, Influence) | `src/ui/politicsApp.js`, `src/ui/politicsInfluence.js` |
| Elections: the campaign, the debate, scandals, the result and the change of term | `src/content/elections.js`, `src/politics/election.js`, `src/systems/politicsElections.js` |
| Influence: access, donations, lobbying, offers, the record, heat | `src/content/influence.js`, `src/politics/influence.js`, `src/systems/politicsInfluence.js` |

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

## Elections (v0.95.0)

Every 120th day is polling day; the 30 days before are the campaign. Each day each party raises funds; in the campaign it spends 4.5% of what it holds a day, 40% on advertising, 30% on rallies, 30% on organisers. A channel's effect is `cap × (1 − e^(−spent ÷ scale))`, times the strength of its staff (a vacant role works at 60%): the first obols count most and no channel passes its cap (together about 5 points of swing), so **money cannot buy a win**. One debate, six days before. Scandals: a hash of the day and the party (0.6% a day each), with a severity, credibility and attention, fading by half every 16 days (shorter with a press secretary).

The **result** takes, for each of the nine states, opinion (each party's support and the undecided who vote), then moves votes between the two parties by: campaign + debate, scandals (up to 6 points), the manifesto kept (±2), the government's time in office (1.1 points a term, more after the second) and a seeded national and per-state swing; turnout from the campaign's intensity and how close the race is. Seats: 100 by D'Hondt over Order, Liberty and the independents. The result is **sealed until 22:00** on polling day (election night: leaders and staff gather in Sovereign Square from 19:30) and the winner takes office on the first day of the next term. Every random-looking number is a hash of the election's number, so a reload cannot repeat or re-roll anything. Every figure is in `src/content/elections.js`; the simulation test sets what "healthy" means (each side wins over 30% of 200 elections; nobody holds office more than six terms running; the government changes hands in over 15%). Measured: Order about 40%, Liberty 60%, a third of elections change the government.

## Influence (v0.95.0)

Money, reputation, relationships and support are four numbers that never convert. **Standing** reads Unknown / Known / Trusted / Inner circle. A door (eight contacts: the President, the chief of staff, five ministers, the opposition leader and chief) opens on a friendship, or on support together with a reputation. **Donations**: public, recorded, 50,000 per donor per party per term, a transfer; they earn support, favours and a little trust; the donor's expectation comes due at 30 days (honoured, delayed, reinterpreted, broken). **Lobbying** costs favours. **Offers** show the price and the odds before any money moves, are charged first, recorded whatever happens, cost 35% more each time they are repeated, and draw on an official's finite favours for the term. **Heat** from illicit offers fades by 0.35 a day; above 5 investigators may find the oldest; exposure costs a scandal for the recipient's party, a fine of twice the sum (paid to the state's debt), 8 reputation and 10 trust.

## Not yet

Diplomacy and the single writer for wars and embargoes, unrest, the player's own party, and every effect of a policy on the world.
