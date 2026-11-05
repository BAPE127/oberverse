# Politics in Sund (v0.93.0 – v0.97.0)

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
| Effects on the economy: the bounded hooks, the named lines | `src/content/effects.js`, `src/politics/effects.js`, `src/systems/politicsEconomy.js` |
| Diplomacy: relations, quarrels, the one writer of wars and embargoes | `src/content/diplomacy.js`, `src/politics/diplomacy.js`, `src/systems/politicsDiplomacy.js` |
| Unrest: demonstrations, the police response, what you may do, the hooks | `src/content/unrest.js`, `src/politics/unrest.js`, `src/systems/politicsUnrest.js` |
| Your own party | `src/content/party.js`, `src/politics/party.js`, `src/systems/politicsParty.js`, `src/ui/politicsParty.js` |
| Emergence: optional offers, truth-labelled news | `src/content/emergence.js`, `src/systems/politicsEmergence.js` |
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

## The economy (v0.96.0)

Each active policy can carry a bounded effect, read where a price or cost is already worked out: **farm inspection** (farm_up: a 4% fee on farm sales), **port and licensing fees** (reg_up +15%, reg_down −10%), **Sund's arms budget** (defence_up +50% refill, defence_down −40%), **Sund's public tender customers** (spend_up +40%, spend_down −30%), **sector sentiment** (a point or two, bounded at 5%), and **the state's bond** (debt over a year's revenue and the month's deficit add up to 1.5 points to what it pays). A fee you pay is the state's revenue (its debt falls by it, in thousands): no money from nowhere, and nothing pays you. Everything is listed on Government → "What the policies mean for you". `EFFECTS.enabled` (env `OBERVERSE_POLITICS=off` under Node) switches the economy and police effects off for parity; it does not undo diplomacy or the bond merge, which are not effects. **Sund has one bond:** the First Bank's government bond; the old foreign Sund issue's holdings were moved onto it.

## Diplomacy (v0.96.0)

The arms market's daily tick calls `diplomacyDay()`, the **one writer** of `world.market.wars` and the embargo flags. Each pair of rivals (from the arms market's rival lists, with the countries' aggression as the input) moves peace → dispute → tension → sanctions (the aggressor is embargoed) → war → ceasefire; at each step before war talks may settle it (28% / 20% / 10%, better with good relations when Sund is party); a country has one quarrel at a time; ten days' cooling-off. A hash of the day and the pair decides every chance, so no random number is drawn and a reload cannot change a quarrel. The President's stance is a modifier: more commitments abroad make disputes that Sund is party to 60% likelier (fewer: 50% rarer). Relations with Sund (−100 … +100) move a point a day toward a baseline plus what the quarrels, embargoes and the stance make of them. Measured over 3,000 days (6 worlds): wars on 59% of days (was 86%), 0.8 at once (was 1.4), a new war every 14 days (was 9), embargoes 1.1 at a time.

## Unrest (v0.97.0)

A demonstration is a record in Sovereign Square. A hash chance each day (a base plus 9% per point of tension over 0.2, at most 9%, a pause of six days, two at once at most) starts one; the cause is a bloc against a policy in force (weighted by how much it dislikes it), the war or the cuts. Each day: anger drifts with the country's tension and a heavy police hand; a riot is a hash chance (0.6% + 20% per point of anger over 0.55 + a heavy-handed response on an angry crowd + size, less with surveillance; at most 30%); the police clear a modest crowd on a heavy response (30% a day); otherwise it ends peacefully when its time is up or its anger is spent. Measured over 5,700 days (8 worlds): about one a month, 75% peaceful, 9% cleared, 16% riots. The police response is light below 0.35, heavy from 0.65: 0.45 + police funding ±0.2 + enforcement ±0.2 + officers on duty ±0.1. The visible crowd comes only while you are on the Crown Quarter 10:00–18:00; no call is placed and Wanted is never raised on you. You may speak for talks, support the organisers openly (capped 20,000), or pay in secret (30,000, an illicit offer). Heat from demonstrations and riots weighs on approval by at most 5 points. **Police effects:** police_up/down change how long a call takes to be answered (−25% / +30%); enforce_strict/light change fines (+25% / −20%) and sentences (+25% / −25%); surveil_up/down change the heat illicit offers leave (+25% / −20%). **Hooks** (read-only, for a coup): legitimacy, stability, factions, emergency powers (none), succession.

## Your party (v0.97.0)

Five founding needs: an office (the Corporate Centre or the Tower, bought by your company), the 50,000 obol registration fee (paid to the state), a reputation of 10 with the Civic Office, a platform of at least three priorities (at most four; each shows which voters it pleases and costs), and three staff (of five roles: records with a name and a wage of 120 a day out of the party's funds; hiring costs 5,000; they leave if it cannot pay). The party's funds are only what you put in (they come back if you wind it up). It is kept out of the election and opinion models entirely: candidacy is a later release. "Would consider it" is a reading of how many voters' views suit the platform; it enters no election.

## Emergence (v0.97.0)

On day % 7 == 3 the world may offer you something, at most two open, each kind at most every 40 days (hash 60%), open for 12 days: the farmers (a farm fee and a farm of yours), a contractor (an aerospace firm), a journalist's lead (a live scandal), trade talks (a warm country; success raises its regard by 10 and it fades by a quarter a day), the organisers' invitation (a demonstration on). Each ends with a stated reason; rewards are reputation, trust or regard, never cash. Weekly (day % 7 == 5) at most one forecast (the deficit, the campaign's polls) or opinion piece (a columnist on a policy in force). Every politics news item carries a truth label.

## Known limits

Staff of your own party are records, not people on the map. The crowd in the square is a few real people plus a number. Unrest's effect on opinion is small. The steward's invitations are permanent once granted, and the estates' guards rely on the door locks. Standing for election as your own party, and the News page of the original mock-up, are not built.

## Not yet

Everything in the Politics plan is built. The War update follows (v0.107.0 onward in `docs/ROADMAP.md`); the Post-War update after it.