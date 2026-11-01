# Proposal: the Political System (the Presidency update)

Status: **proposal only. Nothing in the game has changed.** Written after reading the code at v0.91.0.
Mock-ups are in `docs/mockups/` (list at the end). They use the game's own tile colours and tablet styles, and the figures in them are samples.

Answers you have already given. Round 1: Sund runs down to the home island so Halvermouth is its capital; the government district is a **new "Crown Quarter" map** beside the city; the boy king stays and an **elected President** governs; missiles come from **both** Aerospace and the Arms works. Round 2: **a term is 120 game days**; **Politics is built first, then War**; **Sund's two bonds are merged into one**; **three free territories become small countries** (Westreach League, Sunmouth Isthmus Compact, Free Harbour of Dunmere).

## 1. What the code already has (and what that means)

| Need | What exists today | What the update does with it |
| --- | --- | --- |
| Countries | The eight in `src/content/arms.js` (`COUNTRIES`); the arms market, ports, generated companies and foreign bonds all read them. **Sund is one of the eight**: "a fishing monarchy whose king is eleven and very serious." | Sund becomes the home nation. With the three promoted free territories there are **eleven countries and ten embassies** (Sund needs none in its own capital). The three new countries need `COUNTRIES` records (budget, income, wants, aggression, rivals), so the arms market, ports, generated companies and the foreign bond list grow by three; this is in the Atlas release. |
| Wars and embargoes | `src/systems/geo.js` records them as persistent events and `src/corp/geo.js` turns them into costs, demand, share prices and bond premiums. **But the arms market's dice decide when they start and end** (`MARKET.warStartChance`, `world.market.wars`); geo only *reads* them. | Politics must not create a second war model. The new diplomacy system becomes the **one writer** of `world.market.wars` and embargoes; geo and the arms market keep reading them. This is the biggest integration change and it needs its own test. |
| Government debt | `src/systems/bonds.js` (Halvermouth government bonds at the central bank's policy rate), `src/systems/sovereign.js` (foreign bonds, **including Sund's**), `src/systems/centralBank.js`. | **Settled: merged.** Sund's foreign bond and the Halvermouth government bond are the same debt after the update; your existing holdings are kept and moved onto the one record. Deficits and defence spending move its yield through the existing `bondPremium`. |
| Police | `src/systems/police.js`: 3 wanted stars, Chief `npc_lawrence`, Precinct 1, patrol beats in `src/content/life.js`, incidents, bribery of officers. | Policy changes scalars (staffing, response delay, which offences are chased). It does not replace the police. |
| Mayor | The Hall of Justice has a Mayor's office; the Mayor's portrait frame is empty (a planted story seed). | The Mayor stays as Halvermouth's city mayor. The empty frame can be filled by a governance-lore line. No lore is deleted. |
| Farm, arms, aerospace, shipping | `farm.js`, `dairy.js`, `arms.js`, `market.js`, `aerospace.js` (tenders: `src/aero/tenders.js`), `logistics.js`, `piracy.js`, `missions.js`. | Policies reach them the way the v0.75 geopolitics does: **pure functions of saved records**, read where a price or cost is worked out, with bounds. |
| Public companies and prices | `src/corp/exchange.js`, `src/systems/exchange.js`: prices follow expected profit; geo already adds a bounded "sentiment". | Political news changes expected profit by sector through the same function. No fixed price jumps. |
| People | 80 characters; `src/content/life.js` (home, occupation, schedule, sleep block), the NPC brain, physical/abstract tiers, off-screen travel. v0.87 made HQ officers real NPCs (commute, desk, lunch, bed). | Presidents, staff, ambassadors, guards and journalists are NPCs on the same rules. The HQ-officer work is the template. |
| Relationships | `src/sim/relationships.js` (trust, affection, respect, suspicion), factions in `src/content/factions.js`. | Political relationships reuse them. Money, reputation, support and access stay separate numbers. |
| Quests and events | `src/systems/quests.js` (data-driven triggers), `src/systems/eventDirector.js` (templates, conditions, chains). | Political quests are event templates with world conditions. None is a chapter. |
| Tablet | OberPad groups in `src/ui/tabletGroups.js`; the pattern (hero, three tiles, big buttons, fold, "?" for help) from v0.83 to v0.90. | A new **Politics** group of apps in that pattern. Mock-ups below. |
| Money | `game.corp.pay(...)`, ledger categories in `src/corp/ledger.js` (`kindOf`). **There is no income tax or corporate tax in the game.** | See §6: the government's revenue is a model of the country; the player pays only specific, visible levies tied to policies. |
| Saves | `SAVE_SCHEMA_VERSION = 1`; every system migrates itself idempotently (`management.migrate`, `personnel.migrate`). | Same: `world.politics` appears with safe defaults; old saves load untouched. |
| Time | 1 real second = 1 game minute; a day is 24 real minutes; weeks are 7 days; the corp ledger uses **30-day months** (`MONTH_DAYS`); there is no calendar year. | The term length is a design decision (below). |
| Land | Halvermouth is **204 × 128 tiles and full**. Yards, Lariat and Starling are separate regions entered by gates (`src/content/world.js`). | A new region map (the Crown Quarter) entered by a new gate. |

## 2. The constitution, in one paragraph

Sund is a **constitutional monarchy**. The king (eleven) is head of state: he opens the Assembly, signs laws, reviews the fishing fleet on Mondays and stays in Kingsfjord castle. The **President** is the elected head of government and sits in Halver House in the capital. A single **Assembly** gives a simple yes/no on bills; it is a vote tally (the governing party's seats against the opposition's), not a parliament simulator. The Mayor runs Halvermouth's city services. Old lore (the regent whispers, the king's seriousness) becomes ambient dialogue. Nobody is deleted.

## 3. How it plays: one loop

```
 conditions (prices, jobs, crime, wars, scandals)
        │ move                                    ▲ cost, demand, risk
        ▼                                         │
 PUBLIC OPINION ──► POLLS ──► ELECTIONS ──► WHO GOVERNS ──► POLICIES ──► THE ECONOMY, POLICE, DEFENCE, TRADE
        ▲                                                       ▲
        └────────── scandals, demonstrations ◄── you (optional): donate, lobby, bribe, campaign, found a party
```

Everything on the left runs with or without you. You can read it (the tablet), visit it (the Crown Quarter), pay to move it, or build a party of your own much later. Nothing needs you.

## 4. The authoritative state

One saved record, `world.politics`, and nothing else keeps a copy of anything in it. Interfaces read it and call actions. (Pure modules in `src/politics/`, services on `game.politics`, content in `src/content/politics*.js`, the same split as `src/corp` / `src/systems` / `src/content`.)

```
world.politics = {
  v,                         // schema, for migrations
  constitution: { kingId, termDays, assemblySeats: { order, liberty, other } },
  government: { presidentId, partyId, termStart, termEnd, cabinet: { role → personId }, promises: [...], crises: [...] },
  parties:  { order, liberty, (player) } each: { name, leaderId, platform: { issue → stance }, funds, staff: [ids], support },
  people:   { personId → { npcId, role, party, skills, loyalty } }   // the NPC itself lives in the NPC system
  policies: [ { id, kind, state, since, cost, effects, owner, history } ],  // states below
  budget:   { day, revenue, spending: { police, defence, admin, infrastructure, subsidies, services, debt }, deficit, debtStock },
  opinion:  { blocs × regions, issues, drivers[], trust },          // aggregate, never per voter
  polls:    [ { id, day, pollster, sample, margin, results, regional } ],   // kept, capped
  elections:{ calendar: { next, phase }, history: [ { id, day, results, turnout, winner } ], current: { candidates, campaigns } },
  campaigns:{ funds, spent, contributions: [ { day, who, to, amount } ], activities, promises },
  influence:{ relationships, access, obligations: [...], ledger: [...], heat },           // bribes and favours, persistent
  diplomacy:{ relations: { country → { score, flags } }, disputes, agreements },
  unrest:   { demonstrations: [...], tension },
  events:   [ { id, day, kind, truth: 'verified|alleged|forecast|opinion', refs } ],        // the news and the audit trail
  hooks:    { legitimacy, stability, factions, emergencyPowers }                           // read-only for the future coup
}
```

Rules: no random draw on a read; every result is a function of the saved record and the day; anything that pays or counts once is keyed (`elections.history[id]`, `policies[id].paidThrough`) so a reload cannot repeat it.

## 5. The systems

### 5.1 Parties, leaders, staff
- **Josiah Vegas** leads **the Order Party** and **Susan** leads **the Liberty League** (working names: you may rename them; the leaders' names stay exactly as you gave them). Both are persistent NPCs for the whole game, in or out of office.
- **Staff** (each a persistent NPC with an office, a desk, a schedule and one job): chief of staff, campaign manager, policy adviser, communications director, press secretary, fundraising director, polling adviser, legal adviser, security coordinator, organiser. A role's effect is **bounded and explainable**: the campaign manager scales how well campaign money turns into votes (diminishing returns), the policy adviser lowers the failure risk of proposals, the press secretary shortens how long a scandal lasts, and so on. A vacant role is a visible weakness, not a hidden number.
- **Defeated leaders keep playing**: they criticise the government, rebuild staff and funds, and can be met at their party offices and mansions.
- **Mansions**: Vegas's *Ironcrest Hall* (stone, gatehouse, war room, range) and Susan's *Willowmere* (lakeside, glass, an open study). Mock-up: `proposal-pol-mansions.png`. Access is by invitation, reputation or an introduction by staff. Never by money alone.

### 5.2 Government and policies
- A **policy** moves through: proposed → under review → approved → implementing → active → suspended → repealed or expired. (Seven states; the Assembly vote sits between *review* and *approved*; *implementing* needs staff days and money.)
- The **administration AI** is a scored decision, not a dice roll: it meets at **fixed windows** (Thornday cabinet each week, the monthly budget, and event triggers like a riot or a war). Each window it scores a short list of candidate policies by *party platform fit*, *approval*, *finances*, *election timing*, *promises*, *lobbying*, *staff capacity*, *crises* and *what is already in force*, picks at most what its capacity allows, and records why. Each policy has a cooldown. (Same shape as the NPC brain and as the v0.89 manager planners.)
- **Launch catalogue** (about two dozen, each tied to a named variable; Order and Liberty lean for or against each, none is automatically good): police funding up/down; patrol intensity; penalty severity; surveillance powers; petty-offence leniency; defence budget; a procurement programme; military commitments abroad; farm inspection regime; farm licensing fees; farm subsidies; price supports; arms export licensing; port security and cargo inspections; tariffs; trade restriction on a named country; embargo on a named country; infrastructure programme; hospital and school funding; civil-liberties oversight board; tax rate (government revenue only, see §6).
- **Budget**: revenue is a function of the country's output (see §6); spending is the sum of active policies and standing departments; the gap is borrowed on the existing government bond market. An administration with more programmes than money must cut, raise revenue or borrow, and the yield, then approval, then policy options respond. No unlimited money.

### 5.3 Public opinion and polls
- **Blocs × regions, never voters.** Nine blocs (workers and tradespeople, farmers and rural voters, business owners, port and shipping workers, defence and arms workers, public servants, urban middle class, civil-liberties voters, coastal and fishing communities) across **Sund's nine states from the atlas** (Crown District, Lariat Downs, Gullwing Coast, Hald Reach, Thornmonth Isle, Sundholm, Middle Fjords, Skarn Highlands, Kingsfjord). Each bloc-region cell carries issue concern and a lean; totals are weighted sums.
- **Distinct numbers**: presidential approval, disapproval, party support (Order, Liberty, others, undecided), trust in government, crime concern, economic confidence, price concern, war support, employment satisfaction, regulation support, service satisfaction, scandal reaction.
- **Drivers are measured, not invented**: prices from the markets (food, fuel, arms), jobs from company activity and insolvencies (`src/corp/metrics.js`), crime from the police record and incidents, the Exchange index, the government deficit, geo wars and embargoes, policies in force and their promises, scandals, demonstrations and **your own actions**. Each driver has a cap, a half-life and a visible entry in "why it moved".
- **Polls** are generated from the cell model with a stated method: sampling error from the sample size, a house effect per pollster, a reporting delay. The player always sees the date, the pollster and the margin; the true value is never shown. History is kept (capped at about 60), saved and comparable. Mock-up: `proposal-pol-oberpad-overview.png`.

### 5.4 Elections and campaigns
- The calendar is saved and visible. A cycle: announcements → campaigning (fundraising, staff, appearances, a debate, polls, promises, scandals, endorsements) → vote → count → transition → reaction. It never takes over the screen; election night is a news event and a plaza crowd.
- **Result model**: base party support (opinion) + candidate approval + economy + **campaign effect with sharply diminishing returns** (the effect of money is a saturating curve, scaled by staff quality) + visibility + promises kept or broken + scandals (severity × credibility × attention) + regional weights + turnout + a seeded uncertainty term fixed by the election id (so it cannot be re-rolled by reloading). Money cannot buy a win.
- **Both parties can win**: the acceptance test runs hundreds of seeded elections and requires each side to win a healthy share, and no side to hold the presidency for ever.
- **Transition** swaps the president, cabinet, active-policy owners and mansion/office schedules; the loser stays in the world.

### 5.5 Influence, donations and bribes (fictional game mechanics)
- **Standing is four separate numbers**: money you hold, your reputation (the existing factions), your relationships (the NPC system), and your political support (what you have given and done). Meetings need the right mix; none converts into another.
- **Legitimate**: donations within the rules (capped, recorded, public), lobbying (ask for a change in timing or design of a policy; it costs favours, not just money), endorsements, community projects, evidence to investigators, coalitions with industries. **Illicit**: bribes, hiding a donation, leaks, secretly funding unrest.
- **A bribe** is a request with a price, shown plainly before money moves (mock-up `proposal-pol-oberpad-influence.png`). The outcome is one of: accepted, refused, counter-offer, delayed, half done, reported. Odds depend on the recipient (and their price), the amount against what the request is worth, relationship, political pressure (approval, an election near, scandal heat), the policy already in force, and whether the chief of staff or a press secretary stands in the way. **Repeats cost more, and the favour budget of an official is finite**, so money cannot buy the state.
- **Consequences persist**: a ledger of every offer (success or not), a *heat* number that investigators and journalists can find, and exposure leading to scandal, investigation and fines. That record also feeds opinion and your standing. Nothing in this proposal is a guide to real wrongdoing; it is fictional systems with costs.
- **Promises**: a donation creates an expectation, never a guarantee. The candidate can honour, delay, reinterpret or break it, which costs them standing with you and with voters.

### 5.6 Diplomacy, wars and embargoes
- Each of the seven other countries has: a relation score (−100 to +100), flags (embassy, trade agreement, sanctions, embargo, military cooperation, dispute, war), and a short history. Embassies are the physical place for these.
- **Wars come from chains, not dice**: a dispute (resource, incident, failed talks) → tension → sanctions → escalation → conflict → ceasefire. The arms market's rival list (`rivals`) and aggression values are the *input*; the President's stance is a modifier and the state of the world is the other. War is not guaranteed under Vegas and peace is not guaranteed under Susan.
- **The one writer rule**: the diplomacy system writes `world.market.wars` and the embargo flags; geo, the arms market, shipping, bonds and the exchange keep reading them. The arms market keeps its demand and pricing logic; it simply stops being the thing that flips the switch.

### 5.7 Demonstrations and unrest
- A demonstration is a **record** (cause, place, size, anger, organisers) with a small visible crowd of NPCs near it (a few real NPCs plus an aggregate figure). It peacefully ends, disperses or escalates according to anger, size, the police response (set by policy and what the police can staff) and your actions. It never means every protest is a riot.
- **Hooks left for a coup, not a coup**: `hooks.legitimacy`, `stability`, `factions`, `emergencyPowers`, succession. These are read-only state that later systems can use.

### 5.8 News and quests
- Every event gets a record with a timestamp and a **truth label** (verified, alleged, forecast, opinion) and is shown in the existing feed. Thresholds and cooldowns keep it to a few items a week.
- **Political quests are event templates** triggered by world state (a farmer asks for help against a rule; a contractor wants a meeting; a journalist offers a lead). If a politician loses, the quest adapts or ends with a stated reason.

### 5.9 The player's own party (late, optional)
- Data model first: name, colours, platform, funds, staff, support, registration, an **office in a tower using the existing HQ office system** (v0.86 to v0.88: the same purchase, furnishing and officer seats). Eligibility is money, reputation, an office and a registered platform; names are validated and one party per player. Full candidacy is later in the sequence. See the release plan for what is promised when.

## 6. Money and the economy (the honest part)

- **The player pays no new general tax.** There is no tax system today, and the last few releases were about making the economy easier. I propose that **only policies that name a cost reach you**: inspection fees, licence fees, export licence costs, tariffs on goods you move, higher port security costs, war-risk premiums. Each shows up as a line you can see.
- **Government revenue** is modelled from the country's activity (the generated companies' profits and wages, the Exchange, trade volume) with a fixed rate, **not** from the player's wallet. It is used to decide *what the government can afford*. Money that reaches you from the government (contracts, subsidies) is created by a policy and capped by the budget, so the economy cannot be inflated by a loop.
- **Hooks** (every one a bounded multiplier or flag, read where a price or cost is already worked out): farm running costs and compliance days (`farm.js`); police staffing and response delay (`police.js`); Sund as a **buyer** in the arms market and a **procurement customer** for Aerospace tenders (`arms.js`, `tenders.js`); export-licensing friction and cargo inspection delay (`logistics.js`); war-risk premium (already in `geo.js`); company expected profit by sector (`exchange.js`); government bond yield (`bonds.js`).
- **Calibration**: I will not invent numbers. Stage 9 begins with a measurement run (income sources, costs, mid-game purchasing power at v0.91) and sets the figures from it, then a 20-election simulation checks stability. Every figure goes in one content file like `income.js`, so it can be tuned in one place.

## 7. The world

- **Crown Quarter** (`proposal-pol-crown-quarter.png`): a new region of about 200 × 140 tiles through a new gate off Grand Avenue. Halver House (the Presidency), the Assembly, the Royal Pavilion, six ministries, Sovereign Square, ten embassies and a Free Ports Mission, two party headquarters, the press hall, a hotel, a café, a restaurant and a club, staff flats, a park, checkpoints. Nothing in Halvermouth is demolished.
- **Halver House** (`proposal-pol-presidency.png`): public lobby, security screening, public records hall, press briefing room, waiting gallery, chief of staff, cabinet room, president's office, two private negotiation rooms, security control. Three zones: public, by appointment, restricted. Guards enforce them. The President is at the desk in working hours, in the cabinet room on Thornday, in the briefing room for press events, and at home or party HQ otherwise.
- **Embassies** (`proposal-pol-embassies.png`): Ostmark (large), Varnistan, Teshvar (ornate), Caldera, Pallas, Morrow, Lirre (neutral), and the three newly promoted: Westreach League, Sunmouth Isthmus Compact and Dunmere (small), plus a **Free Ports Mission** for the free territories that stay unclaimed. Each has a flag, a reception, an ambassador, staff, a guard, hours, dialogue, and one reason to visit.
- **NPC budget**: about 60 new people (two leaders, ten staff per party, president's household, ten ambassadors, 20 embassy staff, guards, ministers, press, hotel staff). The world has 80 characters today, so this roughly doubles it. Plan: aggregate the far-off ones as the HQ officers are (they only become physical near you) and profile in stage 4 before committing.

## 8. The OberPad
A **Politics** group (Overview, Polls, Government, Diplomacy, News, Campaigns, Influence) in the existing pattern: one hero, three tiles, one or two big buttons, a fold for everything else. Mock-ups: `proposal-pol-oberpad-overview.png`, `-diplomacy.png`, `-influence.png`. They are information and administration; the Crown Quarter is where you meet people.

## 9. Saves and anti-exploit
- `world.politics` is created lazily with defaults; old saves load with no change. Every action is keyed so a reload cannot repeat it (an election result, a donation, a bribe attempt, a policy payment). A bribe is charged before it resolves and recorded whatever the outcome.
- Existing tests that I will have to touch: those that assert the arms market's war list as the only writer, the foreign-bond tests that count eight countries' bonds, the NPC count in the life/world tests, and the tablet-group lists. I will list every edit.

## 10. Release plan (stage by stage; each is tested, pushed and playable)

The spec's 14 stages map one-to-one onto releases from v0.93.0. v0.92.0 is the **World Atlas** (shared with the war update; see `docs/WORLD_ATLAS_PROPOSAL.md`).

| Release | Stage | What exists after it (and what you can do) | Main new tests |
| --- | --- | --- | --- |
| **v0.92.0** | Atlas | Sund redrawn down to the home island; states, cities, biomes as data; an Atlas page on the world globe and Fleet Command; home-island ports become Sund's; **three new small countries** (Westreach, Sunmouth, Dunmere) with market, port and bond records. Nothing political yet. | atlas content validation; ports on land; every state reachable; the eleven countries in every list that counts countries; old saves load |
| v0.93.0 | 1 Baseline | Audit result recorded, baseline of all tests and warnings, dependency map in `docs/`. No gameplay. | the baseline itself |
| v0.94.0 | 2 Data model | `world.politics` with the two parties, Vegas and Susan as persistent NPCs (temporary homes in existing flats), staff records, a term and an election date, migrations. A read-only Politics overview app. | persistence; both leaders persist; defaults; no RNG on read |
| v0.95.0 | 3 Capital | The Crown Quarter, Halver House, gate, checkpoints, interiors, public/appointment/restricted zones. You can walk in and look. | map validation; paths; doors; guard rules; surrounding maps unchanged |
| v0.96.0 | 4 People | Ten embassies and the Free Ports Mission, ambassadors, staff, two mansions, party offices; schedules and homes. | every country has an embassy; leaders keep homes and schedules; no blocked paths |
| v0.97.0 | 5 Government | Policies with the seven states, the Assembly vote, a budget, the administration AI on its windows, a decisions history. | state transitions; budget limits; decisions recorded; transitions keep unrelated state |
| v0.98.0 | 6 Opinion | The bloc × region model, drivers, polls with margins, the Polls app, history. | bounds; distinct approval and party support; drivers identified; poll persistence |
| v0.99.0 | 7 Elections | The calendar, campaigns and funding, the results model, transitions, election night. | both parties win in simulation; spending has diminishing returns; reload cannot re-roll |
| v0.100.0 | 8 Influence | Relationships and access, donations, lobbying, the offer screen, outcomes, the ledger and heat, promises. | outcomes all reachable; charged once; repeats cost more; persistence |
| v0.101.0 | 9 Economy | Policies reach farms, arms, aerospace tenders, shipping, the exchange and bonds through bounded hooks; the single deficit and bond. | per-system effect tests; no duplicated money; sensible bounds; parity with politics "off" |
| v0.102.0 | 10 Diplomacy | Relations, disputes, the one writer for wars and embargoes, embassy quests and trade talks. | embargo effects; events persist; geo and arms market still behave |
| v0.103.0 | 11 Unrest | Demonstrations, the police response, your involvement and consequences. | not every protest is a riot; police response reflects policy and staffing |
| v0.104.0 | 12 Your party | The party record, office in a tower, staff, platform; candidacy foundations (full candidacy later, documented). | name validation; one party; office uses the HQ system |
| v0.105.0 | 13 Emergence | Optional quests and ambient events; a check that nothing in the update is mandatory. | a 200-day run with politics never visited; quests expire gracefully |
| v0.106.0 | 14 Release | Balance run over many election cycles, migrations, regression, docs, version records. | the full suite; parity |

I will keep to your standing rules: tests, `npm run check` and `npm run smoke` before every release, every edited existing test listed, no money from nothing, honest reporting.

## 11. What I will not do
- No fixed storyline, no flag that gates any system.
- No tax on you beyond named, visible levies.
- No guarantee for any party: no permanent winner, no automatic good policies.
- No second war model, no second bond market.
- No claim that a building is finished if it is only a menu.

## 12. Settled, and what I will take unless you object

Settled by you: a **120-day term** (election in the last 30); **Politics first, then War**; **one bond for Sund**; **three free territories become countries**.

Also settled: **party names** ("the Order Party" for Vegas, "the Liberty League" for Susan; the leaders keep exactly the names you gave), **Sund's shape**, and **the three promoted countries**.

I will take these unless you object:
1. (Party names: settled.)
2. **The free territories that stay free** share one **Free Ports Mission** in the Crown Quarter.
3. **No general tax on you**, only named levies.
4. **Politics can be switched off** in a debug setting for parity checks (the same trick as the other knobs).
5. **The three new countries are small**: low budget and income, so they matter as trade partners and small embassies, not as great powers. Which three (or how many) is easy to change before the Atlas release.

## Mock-ups
- `proposal-pol-crown-quarter.png` (the district), `proposal-pol-presidency.png` (Halver House), `proposal-pol-mansions.png`, `proposal-pol-embassies.png`
- `proposal-pol-oberpad-overview.png` (overview, polls, government), `proposal-pol-oberpad-diplomacy.png` (diplomacy, news, campaigns), `proposal-pol-oberpad-influence.png` (access, an offer, your party)
- Atlas: `proposal-war-atlas-sund.png` (Sund redrawn, with its nine states and the capital).
