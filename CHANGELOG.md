# Changelog

All notable changes to the Oberverse. Versions follow `MAJOR.MINOR.PATCH` (see docs/DEVELOPMENT_WORKFLOW.md).

## [0.87.0] — 2026-10-31 — The Headquarters, Stage 2: Officers at Work (development build)

- **Officers work in the office.** Every executive and manager you employ at the **parent company** now has a body once the parent owns an office: they sit at **their own desk** from 09:00 to 12:30 and 13:30 to 17:30, take lunch in the **boardroom** (the reception, in the small office), then go home to the **staff quarters** and sleep in **their own cot** from 23:00 to 07:00. They leave ten minutes early, like everyone, and really walk (a test runs the simulation from the quarters to the desks). They pass the office's doors and nobody else does; you pass them all.
- **Staff quarters:** a room behind each hall (a door at the top right, for staff and for you) with a cot for each seat, a table and a stove. It is not a street building, so nothing outside moved. (The world's rule is that beds are only in homes, so the quarters are marked as a dwelling.)
- **The office has only so many seats** — 3, 8 and 12. With an office, a hire at the parent that would exceed the seats of the biggest office you own is refused, with the reason ("buy a bigger office first"). **With no office there is still no limit** (nothing changes for a game that never buys one). Buying a bigger office moves the officers into it. Anyone with no seat would simply have no body; they are still paid.
- **Who they are:** a face, a suit and a voice from a hash of their id (no random number is drawn, so the world's dice are untouched), and a short, generic conversation (their hours, where they sleep).
- **The Group app** shows how many seats are taken. A resignation or dismissal takes the body away; nothing in the books changes because of the bodies.
- **Tests:** `tests/hq_officers.test.mjs` (9): no office means no limit and no bodies; the seat limit and its reason; a bigger office; desks, lunch, quarters and sleep at the right times in the right places with their own desk and cot; **walking from the quarters to the desks**; who may pass the doors; leaving takes the body away; the minute tick draws no random numbers; save and load; the quarters' cots and doors. The smoke gained two checks. No existing test edited.
- **Still to come:** restyling the furniture (stage 3), the upper floors of the tower, selling an office. Officers have no tasks of their own yet beyond their routine.

## [0.86.0] — 2026-10-31 — The Headquarters, Stage 1 (development build)

Stage 1 of the headquarters (mockups `docs/mockups/proposal-hq-*.png`; the real screens `docs/mockups/v086-*.png`).

- **Three offices stand in Halvermouth from the first day**, on empty paving, shut and "FOR SALE": **The Ledger Row Office** (9×7, behind the First Bank), **The Corporate Centre** (12×9, east of the Grand Hotel's forecourt) and **The Tower** (14×13, beside the precinct). Each is a real building with a seamless door, and its hall is **exactly the size of the building**, so no street, no road and no other building moved. Each has windows, a reception, a rug, plants, desks with chairs and a place to stand at each, and (the centre and the tower) a boardroom table.
- **The parent company buys one** — from the Group app's new *Headquarters* list, with its terms shown first (price, upkeep, desks, seats) and a Buy and a Cancel. It pays **from its own account only**, never your wallet, and it must be funded and hold the price. **25,000** (small), **600,000** (centre), **6,000,000** (tower); you may own several. Owning one opens its door, swaps the FOR SALE board for a brass plate, and starts a **daily upkeep paid by the parent** (60, 900, 9,000 obols; a day it cannot pay becomes arrears, as for any company). Nothing is ever paid *to* anyone: the system creates no money, and a control-game test shows the rest of the group is untouched.
- **Locked until bought:** a stranger can't walk in either way; an owned office is for its officers, who arrive in the next stage.
- A new condition, `hq`, and a lock, `lock.hq`; map icons for the three buildings.
- **What it is not yet (stated plainly):** it is a place, not yet a perk. **Officers do not work there yet** (stage 2: they commute, sit at the desks, meet in the boardroom and go home), **nothing limits how many officers you have** until they do, **you cannot restyle the furniture** (stage 3), **the tower is one floor** (its upper floors are not built), and there is no selling an office.
- The desks and seats are smaller than the mockup's samples (12 and 24 desks, not 16 and 40), because the halls had to fit the free paving; seats are 3, 8 and 12.
- **Tests:** `tests/hq.test.mjs` (9): the buildings' placement and hall sizes, the purchase from the parent's account only, refusals that change nothing, upkeep once a day and arrears, the control game, the door lock, the board and plate, save and load, and a scan that the system never pays anyone. The smoke gained two checks. No existing test edited.

## [0.85.0] — 2026-10-31 — The OberPad, Finished (development build)

The last stage of the overhaul.

- **Business** (the arms trade) opens on a summary — works, staff, shipments at sea, what exports have earned, the research under way — with the console (parts, equipment, staff, research, market) one tap down. If something sends you to a page of the console, the fold opens on it. *248 → 62 words.*
- **Standing** (the journal) opens on how many factions know you, the best and the worst of them, and the four strongest feelings; every faction is one tap down. *155 → 54 words.*
- **Stocks:** the price chart is folded away; buying and selling are as they were. (189 words, 15 controls: it is the trading screen for three companies and is left as one.)
- **The Aerospace launcher** lists the three latest reports, not eight.
- **Touch and small screens:** bigger things to press where the device has a coarse pointer, three icons a row and a one-column "today" strip on a narrow screen (`docs/mockups/v085-narrow.png`). **Not tried on a real touch device.**
- **Every app now follows the tablet's pattern:** the 22 tabs were opened one after another at two screen widths with no page errors. Journal's Quests, People and Notes, Farm, Ships and the Aerospace launcher were already short (31–94 words) and are unchanged.
- **Tests:** the browser smoke gained three checks (Business opens on a summary, its fold opens the console, Standing opens on a summary). **A flaw in my v0.83.0 smoke check, found by this run:** it clicked a "5,000" loan amount, which only exists when your borrowing room is at least 5,000, and that depends on the share price; it now takes the first amount on offer. 36/36 on three runs in a row. No existing test edited.

## [0.84.0] — 2026-10-30 — The OberPad, Stage 2: Summaries (development build)

The rest of the OberPad, in the same pattern as the Bank (v0.83.0): each heavy app opens on **a summary — one figure, three tiles, and what is waiting for you —** and **the whole page it always was is one tap down** (a fold, drawn only when opened, its open or closed state kept for the app). Nothing was removed.

| App | Words before → after | What the summary shows |
| --- | --- | --- |
| Management | 1,286 → 53 | requests waiting for your word, with **Approve** and **Decline** on the line; alerts; the last decisions. Budgets, treasury and plans are in the fold. |
| Group | 606 → 169 | the parent's cash, your wallet, subsidiaries; **Pay in** and **Take out** (1,000 / 10,000 / 100,000); a business **Bring in ›** that shows its blockers and warnings and asks before it happens. Statements, lending and policies are in the fold. |
| Personnel | 623 → 131 | people, pay a day, openings with **See candidates** (opens the fold on that role); your staff. |
| World News (Economy) | 545 → 113 | wars and embargoes with what they do to each sector; the latest headlines. |
| Milestones | 361 → 105 | a ring of what is earned; the last three earned and the next three. |
| Exchange | 320 → 52 | what your shares are worth and what they gained; your holdings; the biggest movers. The board is in the fold. |
| Companies | 314 → 93 | your four businesses and whether each has its own account. |
| Intelligence | 213 → 56 | how many companies are tracked and how yours compare. |
| Customers | 370 → 62 | the gang's mood and the orders waiting. |

- **Not changed:** Stocks (206 words, 15 controls), Business (the arms terminal, 248/15), Farm, Ships, Aerospace (a launcher), Standing (155) and the other journal pages are in the new frame with their old pages; they are short enough or are tools rather than reports. Logged in docs/KNOWN_ISSUES.md.
- Measured in the same built-out game as v0.83.0 (arms, shipping, aerospace, a group, 30 shares).
- **Tests:** `tablet_home.test.mjs` gained one (the tablet imports none of the old pages directly; each is drawn inside a fold); the browser smoke gained three checks (Management opens on a short summary, the fold opens the full page, Exchange opens on your holdings). No existing test edited.
- A bug caught by the click-through (not shipped): the first "See candidates" created the Personnel state without its compare list; fixed before release.

## [0.83.0] — 2026-10-30 — The OberPad, Stage 1: the Tablet and the Bank (development build)

The first stage of the OberPad overhaul (mockups: `docs/mockups/proposal-oberpad-*.png`; the real screens: `docs/mockups/v083-*.png`).

- **A tablet.** The OberPad now opens on a **home screen**: a greeting, your cash and what needs you (approvals waiting, a loan that is behind, materials short), a search, **eight big icons with red dots** (Journal, Businesses, My Group, Markets, Bank, World News, People, Milestones — only those your game has) and a dock. The notifications are behind the 🔔. **Every app** has a status bar, a back arrow and *one switch* for the other apps of its group, in place of the row of group tabs and the row of app buttons. The same apps, none removed; all 19 are still there, and `tests/tablet_home.test.mjs` proves every one has a way in. The home screen went from 188 words and 25 controls to **50 words and 14 controls**.
- **A dark screen.** The tablet's colours come from variables, so the apps not yet rebuilt are readable on it.
- **The Bank group, rebuilt** (same functions, a different shape: one headline figure, three tiles, one or two big buttons, a short list; every explanation behind a "?"):
  - **Rates** (the Bank app): the policy rate, with neutral, held-since and next meeting; the last three decisions. *73 words (was 225).*
  - **Loans**: how much you may borrow, with a ring for how much of it you use; what you owe, your record and the next payment; **Borrow** (how long, how much — then the full terms and Accept/Cancel, as before) and **Repay** (everything, or one loan at a time). A switch to *Your companies* has the company-loan flow (guarantee, purpose, terms). *81 and 92 words (was 366).*
  - **Bonds**: what your bonds are worth and pay, then *Government / Companies / Foreign*; each offer is one line with a **Buy ›** that opens the amounts; the first five issuers with *Show all*. *109, 132 and 134 words (was 1,283 on one page, 62 controls).*
- The counts are from the same built-out game, empty portfolios both times. The apps outside the Bank group still show their old pages inside the new frame (Management, for example, is still about 900 words) — they are the next stages.
- **Tests:** `tablet_home.test.mjs` (3); the browser smoke now opens the home screen, goes Bank → Loans → Borrow, checks the terms appear before any money moves, Accept, and the back arrow. The panel's title is kept for the frame and the tests (the tablet's own screen shows none). No existing test was edited.

## [0.82.0] — 2026-10-30 — First Steps (development build)

The first pass at the early game's money. The owner's target: a first arms works by day 3 and a second company by day 15. A new player had 12 obols, and everything early paid 5–20 (a construction or refinery shift 5–6, the first quests 12 and 20); the licence alone is 500 and a works 2,500.

- **`src/content/income.js` is now the one place for these figures.** The game, the journal texts, the characters' dialogue and the tests read it; change a number there and they follow.
- **Shifts pay about 50 times what they did:** a construction shift 300 (was 6), the coffee run 300 (was 6), a refinery shift 250 for each wage level and 100 for each corner cut (was 5 and 2). **First quests:** The Dark Lamp 600 (was 12), The Seal of M. (exposed) 1,000 (was 20). The Lost Herd (2,500) and Tibbs's 8 obols (he says it is all he has) are unchanged. The people who name the wage (Mason, Dee, Gideon, Mags, Osric, the journal) now say the right figure.
- **The three daily shifts pay 850 a day, so three days of them and the two quests pay the licence (500), the cheapest works (2,500) and 500 for parts, with change — and a week of shifts alone does.** A test computes this from the real systems.
- **The first businesses pay more:** Lucas buys arms at **65%** of value (was 50%), the Co-op pays **1.5×** for crops, and shipping clients pay **1.5×** for a delivery (the offers show the real figure).
- **What this does not do (stated plainly):** the day-3 target is shown by the shift-and-quest arithmetic above, not by a scripted full playthrough; the second-company-by-day-15 target is not measured at all yet, and the businesses' daily profit has not been tuned end to end (see docs/KNOWN_ISSUES.md). Dairy, the oil dividend, property rent, aerospace and the casino are unchanged.
- **Existing tests edited:** `character_mason` (the shift pays the INCOME wage), `character_moneybucks` (the refinery wage and the corner bonus), `arms` (Lucas's share), each now reading `INCOME` instead of a literal. New: `tests/income.test.mjs` (5 tests).

## [0.81.0] — 2026-10-30 — Supply, Rebuilt (development build)

The aerospace Supply page, rebuilt around your ships, as in `docs/mockups/proposal-aerospace-supply.png` (the real screen is `docs/mockups/v081-supply.png`).

- **One card per shortage** instead of five blocks on one page. The first shortage is open: how many (a slider with tappable marks — what the work needs, a full load for your biggest ship, all the supplier has — and a stepper), from which supplier (the cheapest landed one is chosen; the others are in Details), and **how it travels**: *your ship* or *carrier* (or truck, for a local supplier), each with its price, what it saves and when it lands. The better route is marked BEST. One **Order** button. The rest of the shortages are one line each (**Order N ›**). *Order something else…* picks any material. The stores table, purchase orders, consignments and the shipping settings are still there, in two collapsed sections. A fleet strip says which ships you have and what the limit is.
- **One order of any size, in loads.** An order is split into loads no bigger than your biggest hull (60 lots on a 20-unit ship is three loads); before this an order bigger than a hull simply waited for a ship that could never take it, then went by carrier after a day. All the loads are one order: they are checked together (stock, money, clearance) and nothing is placed unless all can be. A material whose single lot is bigger than your biggest hull goes by carrier, and says so. Automatic purchasing and the managers' orders go through the same splitter.
- **The cap (the owner's rule):** the freight and handling an order pays your own shipping line is **at most 500 obols for the whole order**, however many loads and consignments it takes (`INTERNAL.maxChargePerOrder`). Until now it was 1–5% of what a carrier would charge, uncapped; when the cap does not bind the charge is exactly the same as before. A carrier, or a load that falls back to one after the wait, pays the carrier's own rate. **The shipping line therefore earns less internal revenue on very large orders: its voyage costs are unchanged while the charge is capped.** The price on the card is the price that will be charged.
- **A dispatcher bug found by the loads** (older than this release): a consignment that had already sailed or landed was reset to "waiting" whenever its ship was given another job, which corrupted it and, with several consignments on one ship, stopped the dispatcher with an error. Only a consignment still waiting for its ship can now be reset. A test runs three loads on one ship to delivery.
- The rail's Supply badge counts *materials short*, as the page does (it counted unit shortages).
- `tests/aerospace_supply.test.mjs` (10 tests: splitting, the cap per order and not per load, an unbound cap leaves the old charge exactly, all loads delivered with the books reconciling and the line paid exactly what it earned, carrier and local orders unsplit, all-or-nothing placement, save and load mid-order, every caller through the splitter, a lot too big for the hull). Mutation-checked: removing the cap and reverting the dispatcher guard each fail a test.

## [0.80.1] — 2026-10-30 — Morganius's Arms (development build)

A patch. No rule or figure changed.

- **Morganius Spade's arms.** His elbows bent the wrong way: with his hands resting on the felt the sleeves folded inward across his chest and the hands floated apart from them, and the cuffs stood detached. The two-bone arm solver now takes whichever of its two elbow solutions hangs lower and farther from the middle of his body, as a real arm does, and only changes sides when the other is clearly better, so an elbow never snaps across mid-motion. Checked frame by frame in the live Spade's Gambit scene — a card mid-throw, the cascade, win and lose — and in all eleven poses.
- **`tests/morganius_arms.test.mjs`** (4 tests): the chosen elbow is the natural one in every pose; the rest poses keep their elbows outside the shoulders; the bones keep their length; through a whole dealt hand the elbows never cross the body's middle. Mutation-checked against an inverted solver (two fail).
- The wording and test corrections to the 0.73–0.80 releases (see docs/TESTING.md "follow-up corrections"): the robbery's separation is stated as "no financial rule reads it", the civic-standing effect is documented, the reload divergence is recorded as present at 0.59.0 too, and a few test titles and assertions were made honest.

## [0.80.0] — 2026-10-30 — The Whole Group (development build)

Stages 15–17: economic integration, save migration and regression, and the release. It adds milestones, the last tablet features, and the tests that the brief's acceptance section asks for — which found and fixed two flaws.

### Added
- **Milestones from the records** (`src/corp/milestones.js`, `src/systems/milestones.js`, `src/systems/milestonesRecords.js`; a **Milestones** app in the Group tab): seventeen, awarded once each, each from something in the game's own books — four businesses owned, a parent formed, all four as subsidiaries, a staffed headquarters with a CFO, a CFO of skill 80, **delegation** (every subsidiary with a manager, a budget *and* a decision made), a top-five place, leading shipping or arms, a top-three farm, a 500,000 aerospace contract, three months in the black, three months of profitable *autonomous* operation, a diversified portfolio, a gain after two months, a large loan repaid without a miss, an expansion through a war. Hiring, opening a screen or pressing a button earns none of them, and a war promises nothing.
- **Your trades and a watchlist** in the Exchange app (a record of each buy and sell through the exchange, with what left or entered your wallet; a ★ per company and a ★ Watchlist filter), saved with the game; and in the Bonds app each bond shows its **next coupon day, the day its face is repaid, and how far ahead or behind its price is on paper**.
- **A document**: `docs/CORPORATE_ACCEPTANCE.md` — the brief's section 20, item by item, with ✔ ◐ ✘ and the tests.

### Fixed (both found by the new tests)
- **Loans to a company could stack past its limit.** The limit counted the cash from the company's own loans as assets, so each loan raised the ceiling it was lent under (about 1.7 times what the books allowed, in the limit). It now rests on what the company is worth after everything it owes, which a loan does not change.
- **A manager could get round a limit by splitting a purchase.** Their spending limit and ask-above limit were per decision; they are now counted with what the same person has already committed that day.

### Tests
- New: `corporate_integration` (8; **the brief's 20.5**: the full group on the real systems for 62 days, twelve claims checked against records, a save and load in the middle); `transaction_integrity` (6: unique identities; a day is run once; a loan is bounded; split purchases; a save after every kind of transaction gives back exactly what was saved, consistently; eighteen refusals that change nothing); `save_migration_corporate` (3: a v0.59.0 save keeps every balance, share and business and is granted nothing; ten weeks of play from it; save, load, and the oldest schema); `milestones` (3). `tablet_groups` lists the new app. All other tests pass unedited. The integrated test takes about 90 seconds of the suite.

### Known limits
- See docs/KNOWN_ISSUES.md and docs/CORPORATE_ACCEPTANCE.md. A save and load re-rolls the arms market's dice and the townspeople (it also happens at v0.59.0, before this update; the cause is not pinned down), so the world's wars and competitors do not replay identically after a reload; the group's own records do.

## [0.79.0] — 2026-10-30 — The Vault (development build)

Stage 14: bank robbery, with the brief's absolute rule — a robbery has no effect whatsoever on anyone's financial standing — proved by tests, not asserted.

### Added (`src/content/robbery.js`, `src/corp/robbery.js`, `src/systems/robbery.js` — `game.robbery`)
- **The First Bank of Halvermouth and the Lariat State Bank can both be robbed**, two ways (the owner's answers): a **hold-up in opening hours** (a gun drawn in the hall puts the guard on alert; at the counter or the vault it becomes a hold-up: the staff fight or run, someone hits the alarm, and under the gun the vault opens in three minutes) and a **night break-in** (the front door can be forced or picked like a home's; inside a closed bank a silent alarm starts at once and reaches the police in ten minutes; the time-lock takes twelve).
- **A defined, bounded haul of physical valuables from the vault's stock** — never a balance sheet: **250,000 obols in notes and 25 gold bars** at the First Bank (its vault holds 400,000 and 40), **40,000 and 4 bars** at Lariat (90,000 and 8), never more than the vault holds. Bars are a new item (`item_gold_bar`, worth 2,000, pawnable).
- **One explicit state machine for each bank** (`normal → alert → robbery → police → recovery → reopening → normal`; every other move is refused): a gun drawn or a closed bank entered is an *alert* (put the gun away or leave and it stands down); the hold-up or the time-lock is the *robbery*; the alarm brings the *police* (a call at severity 12 — three stars — and witnesses' reports); after thirty minutes on the scene the bank is *sealed* for four days (Lariat three) while its vault is refilled a day's worth a day; then it *reopens* in its hours and is normal again.
- **The loot is paid once.** It is paid by one function that marks the robbery as looted before paying; pressing the vault again, calling it twice, reloading the save in the middle, or an interrupted transition pays nothing more. To be paid again the bank must have come all the way round and been restocked.
- **Public consequences**: news ("First Bank of Halvermouth was robbed…", its closure and its reopening) in the tablet's feed and the Economy app's new **Banks and security** section (state, vault stock, last robbery); a **bounded market reaction** — a premium of up to 0.15% on Halvermouth's government bond yields, fading over ten days, **for the central bank only** (a robbery of the Lariat bank has none).
- **Police and the wanted level** use the existing system (`fact_player_bank_robbery`, severity 12); the player is an ordinary suspect — witnesses, the call, the officers, the stars, arrest. The *criminal reputation* is the police record and the civic reputation that already existed; no new number was added (the owner did not ask for one).

### The creditworthiness rule (brief 14.1), and how it is enforced
- **Nothing a robbery does is read by any financial decision**: your borrowing record, loan limits, rates and offers, loans and schedules, company records and ratings, valuations, rankings, group value, business reputations and the exchange and sovereign bonds are not changed by it: no financial rule, figure or record reads the robbery (a source scan, in both directions), and the tests build two identical games with the rest of the world held still, rob a bank in one and not the other, and require every one of those answers to be identical just after the robbery, while the bank is sealed, and after it reopens — for the First Bank and for the Lariat State Bank (the lender itself). (What *is* shared is the world's random sequence: a police call or a combat bark draws from it like anything else you do, so later dice in the wider world differ from a game where you did something else, as after any action.)
- **The one visible effect is on the screen, not on standing**: while the market premium lasts, a government bond you already hold shows a little less value (a few basis points of yield). **What it secures does not move** — lending values bonds without the robbery's premium (`Bonds.collateral()`), so your limit, your rates and your right to sell are untouched.
- **A source scan** requires that the money code (lending, business loans, ratings, valuations, groups, the exchange, bonds' collateral, management) never mention robbery, the police or the wanted level, and that the robbery code never mentions credit, loans, ratings, valuations, rankings or standing; the only file in the money system that reads the robbery is the bond yield's premium. The tests were checked by deliberately breaking the rule (a robbery lowering the record; lending counting the premium): each break fails them.

### Tests
- New: `robbery` (9): the pure machine (every legal move, every refused one), loot and restock bounds, the premium; the configured hauls; a hold-up end to end with the loot paid once through presses, repeats and a reload; the sealing, the four days, restocking, reopening and a second robbery for no more than the haul; a night raid; an alert that comes to nothing; the Lariat bank; the front door at night; the market reaction. `robbery_separation` (5): the control-game proof (three stages, two banks), what *does* change, and the source scans. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md.

## [0.78.0] — 2026-10-30 — Staffed Banks (development build)

Every bank is a physical building with a counter and staff (the owner's request), made under the repository's rules for adding people.

### Added
- **The Lariat State Bank has a building** (`src/content/maps/lariatBank.js`): open 09:00–16:00, with a teller's window, a loan desk that opens the Loans app, a rate card that opens the Bank app, a small round vault, forty safe-deposit boxes and a bench. Like the First Bank's hall it is made after the street has grown, at exactly the size of its building (11×9), so nothing in Lariat moves.
- **The First Bank of Halvermouth is staffed**, and gains **the Governor's office** (`first_bank_office`): a staff-only door in the hall (the sign is polite, the oak is solid), a desk that opens the Bank app, the bound "Minutes of the Economy".
- **Seven new people** (`src/content/characters/banks.js`, `dialogue/banks.js`; minor, generated; listed in `docs/CHARACTER_REGISTRY.md`):
  - *First Bank*: **Augustus Prime**, Governor (the office; explains the rate and says it is not his); **Prudence Tally**, chief teller (the grille); **Cyrus Coupon**, bond clerk (the bond desk; thrilled by yields); **Bertram Locke**, vault guard (baton; says little; writes poems about doors).
  - *Lariat State Bank*: **Hollis Marsh**, manager and loan officer (slow to say yes; explains personal and company loans and opens the Loans app); **Dottie Cain**, teller (hums hymns); **Clint Brazos**, guard and former deputy (revolver, laconic).
  - They keep to the **world-simulation rules**: every one has a home with a bed (a three-flat Crown Court in the old Crown Insurance tower on Crown Street for the First Bank's four — Cyrus and Bertram as flatmates — and rooms at the Bluebonnet Boarding House for Lariat's three), a `LIFE` entry and occupation, and a schedule whose sleep block is in that bed; staff work at spots inside the bank in its hours and eat lunch on the steps or at the diner; the doors carry a staff list so they can open up before the public and the player cannot follow them into the office. `tools/validate-content.mjs` passes (0 errors).
- **Nothing moved.** The two new homes were made so no street changed size or position (Crown Court's hall is the old tower's own footprint, 15×9, with its door in the same place; a first attempt that made the hall a different shape shifted the whole financial district, and was thrown away). Every street map and building position is identical to v0.77.1.

### Fixed / changed
- The Crown Insurance tower on Crown Street is now Crown Court, flats for bank staff (the insurers moved out; `docs/WORLD_BIBLE.md`).
- `homes.js` can make a stairwell hall a stated size and door (`hallSize`), so a home that replaces a façade can keep the building's footprint.

### Tests
- New: `banks_physical` (7): seven people with homes, beds and sleep blocks and registry rows; streets and halls exactly their old sizes; both banks staffed in their hours with each person at their spot, and at home at night; the doors (hours for you, any hour for staff, the Governor's office for staff only); the counters opening the right tablet apps; dialogue never claiming a clerk moves a rate or a record, and the guards fighting while the clerks do not. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Staff do not yet react to a robbery (stage 14), and no clerk can be hired, promoted or replaced.

## [0.77.1] — 2026-10-30 — Honest Terms (development build)

A patch after a review of v0.74–v0.77. Nothing here adds a feature; it removes something the owner never chose, states a cost before it is agreed, and closes three holes.

### Fixed
- **A company in arrears no longer has its cash swept.** Since v0.74.0 the bank took, every morning, all of a company's cash up to what it was behind — which was never in the owner's answer (arrears, a penalty rate, and managers stopping non-essential spending) and was documented as if it were. It also starved wages: payroll is at 19:05 and the sweep at 06:07, so staff were paid only from what arrived that day. **A company's arrears are now cleared only by the company repaying them** (the *Repay* button, as for your own loans); until then its managers stay frozen. The v0.74.0 entry and known-issues text that described the sweep were wrong and are corrected.
- **The total repayment is shown before you agree** (the brief asks for it). Choosing an amount and a term in the Loans app, for you or for a company, now shows the terms — rate, first and last instalment, interest in all, **total repaid**, what a missed instalment costs, the purpose and the guarantee's consequence — with *Accept* and *Cancel*; nothing is signed by the first click. Each button also shows the total.
- **A delayed foreign bond could not be sold by someone with a loan near their limit** although it was never counted as collateral; the sale lock now applies only to bonds that are.
- **Meridian could still bid on a tender whose buyer was embargoed after it was posted** (v0.76.0 closed this for you and your managers only). It now reads the embargo as it stands.

### Tests
- `business_loans` (the arrears test now proves nothing is swept and that repaying frees the managers), `sovereign` (+1: a delayed bond sells while a collateral one does not) and `geo_effects` (+1: Meridian and the late embargo); the last two fail on the v0.77.0 code. No earlier test was otherwise changed.

### Not done (said plainly)
- **Stage 12's lender has no building.** Lariat State Bank is a name on the Loans app and a closed façade in Lariat; there is no interior, counter or staff. Say if you want it built (the First Bank of Halvermouth is the pattern). "Monetary policy" in stage 12 is met by the policy rate of v0.68.0: every loan's rate, the group's intercompany rate and the bonds' yields are built on it.

## [0.77.0] — 2026-10-30 — Sovereign Debt (development build)

Stage 13, last part: foreign government bonds — the other half of the owner's answer on bonds (Halvermouth's own bonds feel the wars since v0.76.0).

### Added (`src/content/geo.js › SOVEREIGN`, `src/corp/sovereign.js`, `src/systems/sovereign.js` — `game.corp.sovereign`; a section of the Bonds app; rows in the Economy app)
- **A three-year bond from each of the eight countries** (Varnistan, the Ostmark Union, Caldera, Sund, Pallas, Teshvar, Morrow, Lirre), issued once the arms market is running (an issue is 500 days of the country's income, to the nearest million), at par for its rating with a fixed coupon of the policy rate + the 3-year term premium + a credit spread for its rating, to the quarter-point. Monthly coupons and the face at the end, as for every bond here; at most a twentieth of an issue each; selling costs a 1.5% spread.
- **A rating from the country's own finances and quarrels — never a die.** Its *strain* is a floor of 0.15, plus up to 0.35 × its **debt load** (a fixed trait of the country: a hash of its name, lighter for a rich one), plus 0.25 × the severity and phase of each **war** it is in (capped at 0.35), plus 0.3 × an **embargo** on it (capped), plus up to 0.3 for a **treasury** that has fallen below what it began with. Bands give AA…CCC. At the start Teshvar is AA; Lirre, Morrow, Ostmark A; Pallas and Sund BBB; Varnistan and Caldera (at war) BB. The war premium on a country's bond comes through this rating, not on top of it. **A bond's price follows its country's rating every day**; a downgrade or upgrade is logged, and told to you if you hold the bond.
- **Distress and restructuring only after weeks at the top of the strain.** A strain of 0.85 or more counts a day (and eases by two a day below it). After **ten days in a row** the country **delays its payments**: no new bonds are sold, the coupons and face that fall due are *owed to you, not lost*, and are paid when it recovers; after **forty** its debt is **restructured**: you recover 35–60% of the face (less the worse the strain), once, the lot is settled, and a new issue appears only ninety days later, and only once it is not at the top of the strain again. No country defaults or restructures by chance: a test drives one to each step and back.
- **They are collateral** for your loans at the same rates as corporate bonds by rating (not while delayed), and cannot be sold out from under a loan.
- **Economy app**: each country's rating and yield, and bond news (issues, downgrades, delays, restructurings). The Bonds app shows each country's causes — at war, under embargo, treasury level, debt load — beside its price.

### Tests
- New: `sovereign` (6): the pure rules (trait, strain by each cause and its caps, bands, the day counter, recovery, issue size); nothing before the arms market runs and the service not starting it; eight issues, ratings by cause, deterministic; buying, the cap, coupons, selling, refusals changing nothing; a war's downgrade and a holder told, recovery in peace; the whole distress path (delay, owed and paid on recovery, restructuring once, a new issue after the pause); collateral, the sale lock and the saved state's round trip. All earlier tests pass unedited.
- Parity: identical to v0.76.0 line for line (the issues are market data: nothing moves until you buy).

### Known limits
- See docs/KNOWN_ISSUES.md. Stages 14–17 (the bank robbery, integration, migration and the release report) remain.

## [0.76.0] — 2026-10-30 — What the Wars Cost (development build)

Stage 13, second part: the wars reach your own purchases and the government bond market, and managers answer them.

### Added
- **Your arms works' parts and your aerospace firm's materials and freight cost what the wars make them cost** (`game.corp.geo.costFactor(sector)`, the same bounded index the wider world pays: arms +2%, aerospace +3%, shipping +8% at full severity; up to +12% in all). It is a pure function of the events and the day, so it is exactly 1 with none and no price is "changed once".
- **A war and embargo premium on Halvermouth's government bond yields** (`src/corp/geo.js › bondPremium`): +0.4% at full severity per war and +0.05% per embargo, ramping in over ten days, bounded at +1%, to the basis point. New bonds are issued at the policy rate + the term premium + this, a bond already held loses value when it rises (its own coupon stays as bought) and gains when it fades. **The policy rate is the central bank's alone and is not touched.** The Bonds and Economy apps show the premium when there is one.
- **Managers answer cost pressure with legitimate decisions** (`src/systems/management.js`). When what a business buys is dearer by 1% or more and a manager who buys its materials has used 70% of the month's materials budget, **they ask you to raise that budget** in proportion (a request in the *Waiting for you* list with the reason, at most one at a time and one in fifteen days; it changes nothing until you approve, and approving raises the permission, not money). When costs are 2% or more up, **managers hold back expansion** to keep cash, with that reason in the log (reorders, hires and treasury moves go on).
- **The Economy app** shows the premium.

### Fixed
- **A manager (or you) could bid on a tender whose buyer's country was embargoed *after* the tender was posted**: a tender stored the embargo flag it had when posted. Bidding now looks at the embargo as it stands (`liveTender`); a manager plans no bid for such a buyer, and `placeBid` refuses it. (A bid placed *before* the embargo is a bid already made, and is not recalled.)

### Changed
- Parity against v0.75.0: your money, cash and staff are the same line for line; what differs is what the wars now change — the managers' reorder quotes (about 4% dearer on day 16 of the run) and Meridian's share price. No earlier test was edited.

### Tests
- New: `geo_effects` (6): the pure premium (basis points, bounded, wars over embargoes, ramps in); your own part prices against the index, exactly 1 with none; bond coupons, yields and the value of a bond held, the policy rate unchanged; a manager's request, one at a time, nothing changed until approval, declining changing nothing, and the expansion hold through the real judgement; the pure hold rule; and the embargo-after-posting case end to end. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Foreign government bonds, the other half of the owner's bond answer, are the next release.

## [0.75.0] — 2026-10-30 — The World's Quarrels (development build)

Stage 13, first part: wars and embargoes as persistent events with real economic effects, and an Economy app.

### Added (`src/content/geo.js`, `src/corp/geo.js`, `src/systems/geo.js` — `game.corp.geo`; `src/ui/corpEconomy.js`)
- **Persistent events layered on the arms market.** The arms market still decides when a war or an embargo begins and ends (so the arms trade plays as it always did, and the dice are not touched). Each morning, once the market is running, the service records each as an event: a **permanent id** (`ev_1`…), kind, parties (or target, imposer, restricted goods and the war that caused it), start, end, **status** (active/resolved), **severity** (from the countries' incomes), and a **timeline** (begins, milestones at 30/60/120 days, ceasefire or lifting). A war 60 days old counts as escalated (+15%). Resolved events are kept (newest 40). Nothing exists until the market has started; an old save gets its records the first morning, ramping in from that day.
- **Effects are a function of the record and the day — never applied once.** An event ramps in over **10 days** from the day it is first seen and **fades over 30** after it ends, so a reload, a repeated morning or a long sleep cannot repeat or lose a shock (a test proves it).
- **Costs and demand reach the wider world's companies.** The sim's per-sector **cost index** (shipping, agriculture, industrial, transport, aerospace… up to +12%) and **customers' demand** (satellites and aerospace up with war, an oil state at war moves energy much more, agriculture and transport down; each bounded 0.75×–1.3×) enter the companies' own days. **An embargo removes the target's share of the world's arms income from the lawful arms trade** (the arms pool's demand falls by that share). The made-up history before the game began is untouched.
- **A bounded price response, by exposure.** What the market expects a company to earn changes with the sector's demand and cost against its margin, times **the company's own exposure** (a stable hash: two shipping companies are not hit alike), worse for a company from a country at war or under embargo, and an arms company **with no room to sell more gains nothing** from a surge. It moves the company's **fair price** (bounded at ±12%) for every exchange listing and for **OBRO, CHZ and MRDN**; the price still steps toward it a little each day.
- **The Economy app** (Markets group): active wars and embargoes (id, severity, effects now, timeline), ceasefires and lifted restrictions with how much of their effect is left, a sector table of demand and cost changes, who is exposed (lifted and pressed, with the expected change), the policy rate, bond yields and the bank's recent meetings, the day's biggest movers, and the headlines. The arms market's world news now counts under it. It states what is happening and costs now — never a forecast.

### Changed
- **Listed prices and the wider world now move with events from the first morning.** A new game has a war (Varnistan–Caldera) and an embargo (Pallas) on day one, so exchange prices, the three older shares and the generated companies' books differ from v0.74.0. **Your own businesses' money is identical**: the parity runs agree to the obol on every line except Meridian's share price.
- One earlier test was edited: the twin game in `exchange` ("the three older shares…") is now made to the same day as the other (before, a twin a day behind had the same MRDN price only because it never moved in a day). `tablet_groups` now expects world news under Economy and four apps in Markets.

### Tests
- New: `geo` (7): the pure phase/severity/indices/sentiment rules (bounds, ramp, recovery, exposure, capacity, embargo share); nothing before the market runs and the service not starting it; one record per war and embargo with stable ids, no duplicates on repeat ticks; a war's milestones, ceasefire and recovery, an embargo lifted, a reload and repeated mornings not stacking the shock; costs and demand reaching the companies and the exchange's fair prices; the overview. 

### Known limits
- See docs/KNOWN_ISSUES.md. Bonds, managers' responses and foreign government bonds come in the next releases.

## [0.74.0] — 2026-10-30 — Lending to Your Companies (development build)

Stage 12, second part: business loans.

### Added (`src/systems/businessLoans.js`, `game.corp.business`; a section of the Loans app)
- **Lariat State Bank lends to a company of yours that holds its own cash** (a funded account; an unfunded one spends your wallet, so there would be nothing separate to lend to). **On its own books alone**: it may owe in all 40% of what it owns (before this debt) plus six months of its estimated monthly profit, scaled by **its own borrowing record** (0.8×–1.2×; 60 at the start). No collateral is pledged — the owner's answer was that the company stands alone — so there is no asset to pledge twice.
- **The rate is fixed for the loan's life**: the policy rate at signing + 3% + up to 2% for the share of the company's limit used + a record adjustment − a guarantee discount, to the quarter-point. Terms of 6/12/24/36 months, equal parts of principal plus the month's interest, as for your own loans. A loan has a **stated purpose** (working capital, materials, expansion, fleet, farm, research, acquisition) which is a label kept with it — it does not restrict what the company spends on.
- **Cash, debt and expense are the company's**: the proceeds go into its account as a *loan* (never revenue; the cash-flow statement files it under other inflows), each instalment comes out of that account — **interest as a cost** (it lowers the company's profit, valuation and rank) and **principal as a repayment (not a cost)**. What it owes the bank is taken off its net assets and appears as its debt in the figures; the group's consolidated statement shows it as **debt to the bank** (it is not intercompany, so nothing is eliminated), and a distribution or a treasury sweep leaves what the next instalment needs.
- **A missed instalment is arrears at the loan's rate + 5%, and nothing is seized.** Its record falls (−8 per miss, −1 a month while behind, +0.5 per instalment paid), it cannot borrow again until clear, and **its managers refuse hiring, bids and expansion** with the reason "behind on a bank loan" (buying materials to keep running, and treasury moves, are not frozen). While the loan is in arrears, **the bank collects what the company's account takes in** (after the company's own bills to others) — the whole of its consequence.
- **Guarantees, each stated before you sign**: *you* may guarantee a company's loan for 1% off the rate — a missed instalment then lowers **your own** borrowing record by 4 (nothing is taken from you); a *parent* may guarantee a subsidiary's loan for 0.75% off — a missed instalment **calls the parent**, which pays it from its own cash if it can, and the subsidiary then owes the parent that sum as an **intercompany loan** at the group rate (recorded on both sides, eliminated in consolidation as any other). If the parent has no cash the instalment simply stays arrears. No other cross-default exists: the bank's claim never reaches another company.
- **Nothing exists until a company borrows** (loans share `world.corp.lending` with yours, marked by `borrower`); loading an old save gives no company a loan, and with no company loan the new code changes nothing — the parity runs with and without it are identical.

### Tests
- New: `business_loans` (6): the pure limit and rate; funded companies only, nothing before a loan, refusals changing nothing; a loan is cash but never revenue, interest a cost and principal not, net assets unchanged by borrowing, accounts reconcile, and none of it is yours; arrears with nothing seized, the managers' freeze (hire, bid, expand — not materials), borrowing closed, the bank collecting as cash comes in; a personal guarantee; a parent guarantee making an intercompany loan and the consolidated bank debt. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Companies only borrow on their own books (no collateral or acquisition-specific lending rules), and the Lariat State Bank building is still a façade.

## [0.73.0] — 2026-10-30 — Lariat State Bank (development build)

Stage 12, first part: loans for you, from Lariat State Bank, secured on the shares and bonds you hold.

### Added (`src/corp/lending.js`, `src/systems/lending.js`, `src/ui/corpLoans.js`; `game.corp.lending`)
- **A Loans app in the Bank group.** It lists what you hold that the bank will lend against, what that secures, what you owe and may still borrow, your borrowing record, the loans on offer (four terms × a few amounts, each button showing its fixed rate and first instalment), your loans (open, in arrears, repaid) with early repayment, and a short log.
- **What you can borrow**: half the value of shares (OBRO, CHZ, MRDN and every exchange listing), nine tenths of government bonds, and corporate bonds by rating (AA/A 70%, BBB 60%, BB/B 40%, CCC 20%), all at today's value, scaled by your **borrowing record** (0.8× to 1.2×). Loans are **to you personally** — no company's account is touched, and nothing is borrowed on a company's behalf.
- **The rate is fixed for the life of the loan**: the policy rate on the day you sign, plus 2.5%, plus up to 2% more the more of your limit the loan uses, plus or minus up to 2%/0.5% for a poor/good record, to the quarter-point. A later change of the policy rate does not change a loan you already have (it changes the next one).
- **Repayment**: terms of 6, 12, 24 or 36 months of thirty days; each instalment is an equal part of the principal plus the month's interest on what is left, taken from your wallet on its day. Repay any amount early (arrears first, then principal; later instalments shrink to fit).
- **Arrears and the penalty rate only**: if your wallet cannot cover an instalment, its principal is still counted as paid down but the whole instalment becomes arrears that grow every month at the loan's rate **+ 5%**. **Nothing is taken from you** — no seizure of shares or bonds, no margin call. The consequences are all in the record: you cannot take a new loan while in arrears, a miss costs 8 points of record (and 1 a month while arrears stand), on-time payments add half a point, and a record under 20 shuts borrowing altogether until it recovers.
- **Pledged holdings cannot be sold out from under a loan**: every route that sells shares (the Exchange app, the Stocks app and the three companies' own screens) or a bond refuses a sale if what you would still hold would secure less than you owe, and says so. Repaying frees them. Shares and bonds that leave your hands on their own (a takeover, a company's failure, a bond maturing) are not blocked; if that leaves you owing more than you hold secures, nothing is taken — you simply cannot sell what is left or borrow more.
- **Nothing exists until your first loan** (`world.corp.lending` is created by `borrow`); loading an old save gives nobody a loan, and without a loan the new code changes nothing: a parity run with and without it is identical.

### Tests
- New: `lending` (6): the pure rules, nothing-before-first-loan and refusals, a loan from signing to the last instalment (rate fixed when the policy rate moves, repaid to the obol, record built), arrears (no seizure, penalty growth, borrowing closed, cleared by repaying), the sale lock across bond/oil/exchange routes and its release, record effects and the round trip of the saved state. `tablet_groups` lists the new app. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. The Lariat State Bank building (`b_bank` in Lariat) is still a closed façade: the loans are made through the tablet. Company loans, the rest of stage 12 and the later stages are not done.

## [0.72.0] — 2026-10-30 — A Tidier Tablet (development build)

Stage 11 of the Corporate Empire brief: the tablet's apps, organised. No app was added, removed or changed.

### Changed (`src/ui/tabletGroups.js`, `src/ui/tablet.js`)
- **Six groups instead of a row of up to twenty tabs**: **Home**; **Journal** (Quests, People, Customers, Notes, Standing); **Businesses** (Business, Ships, Farm, Aerospace, Companies — those you own); **Group** (Group, Personnel, Management — once you own a company); **Markets** (Exchange, Stocks, Intelligence); **Bank** (Bank, Bonds). A group with nothing in it is not shown. The group's **apps are one tap below the bar**, and tapping a group returns to the app you last used in it.
- **The Home screen is a launcher**: every group with its apps, a **badge** on each app with what is new (the notifications that have arrived since you last looked at Home, counted by the app they belong to; the group bar shows the total), and a **search box** that finds an app by its name or its group.
- Every `openPanel('tablet', { tab })` call in the game still works (the apps have the same names); an unknown tab falls back to Home.

### Fixed
- A stray "null" printed at the top of Home while the apps bar was being built.

### Tests
- New: `tablet_groups` (3): which groups and apps a game has as it grows, each app in exactly one group and every app the tablet had still present; the badges (by app, only what is new, cleared by reading); the search. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. The layout has no automated test, only a browser check.

## [0.71.0] — 2026-10-30 — Lending to Business (development build)

Stage 10, last of four parts: corporate bonds.

### Added (`src/corp/credit.js`, `src/systems/creditBonds.js`, a section of the Bonds app)
- **An issue for each listed company** of the wider world, once the exchange has priced it (and again a month after a bond is repaid): a **three-year bond**, a twentieth of the company's worth (to the nearest hundred thousand, at least 100,000), at par, with a coupon fixed at issue of **the policy rate + the 3-year term premium + a credit spread for its rating**, to the quarter-point. Monthly coupons and the face at the end, exactly as for government bonds.
- **Ratings from the company's own books**, every day: what it owes against what it owns (under 10% AA, 25% A, 45% BBB, 70% BB, above that B), a notch worse for losing money and another for a negative cash balance, CCC in distress. Spreads widen with each notch (0.75% AA, 1.25%, 2%, 3.5%, 5.5%, 10% CCC). **A bond's price follows the rating**: the cash it still pays discounted at the policy rate, the term premium and the *current* spread — so a company that borrows more, or starts to lose money, is cheaper to lend to the next morning.
- **Default only when the world closes the company** — no random defaults. Holders then get the world's own recovery (its plant sold at 40% of book against its debt, never under 5% nor over 90%), **once**, and the issue ends; **a takeover repays at par**.
- **Limits**: at least 1,000, in hundreds; at most a twentieth of one issue in your hands; sell back at any time at the value at today's rating less a **1% spread**. Your own investment from your wallet, like shares and government bonds.
- In the **Bonds** app below the government bonds: each issue with its rating, coupon, size, price and yield; your lots with their rating, monthly coupon, value and what selling gets; recent events.

### A simplification, said plainly
- The bond market runs **beside** the company's books: the cash an issue raises is not added to the company's cash or debt, and its coupons are not subtracted from its profit, so a company's records, valuation and exchange price are the same whether or not it has bonds outstanding. (The company's real debt does set its rating.)

### Not included
- Bond values are not in the net worth that quests read nor in the exchange portfolio; issues by your own businesses; companies buying bonds; floating-rate or callable bonds.

### Save
- `world.corp.credit` (`issues` by ticker: `face`, `coupon`, `rating`, `status` open / matured / defaulted / repaid, `issued`, `end`, last debt and plant; `lots`; `earned`; `log`; `lastDay`) is created the first morning after the exchange has priced the listed; nobody is given a bond. No schema change (still 1).

### Tests
- New: `credit` (6): the rating, spread, recovery and issue-size rules; one issue per priced listed company, once, with the coupon the rule gives and nothing before the exchange; buying (par, the twentieth, refusals changing nothing), coupons once a month and thirty-six and the face at the end; the rating following the books and the price the rating (and selling at its spread); default once at the recovery rate and a takeover at par, neither paying again; a repaid issue replaced a month later, and saves. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md.

## [0.70.0] — 2026-10-30 — Open for Business (development build)

Stage 10, third of four parts: the physical First Bank of Halvermouth.

### Added
- **The building is open** (it was a closed façade with a message): **09:00–17:00**, locked outside those hours with the hours in the message. You walk in from the street through the seamless doorway like every other building and see straight in from the pavement.
- **The banking hall** (`first_bank`, 11 × 7 tiles — exactly the footprint of the bank's building after the street's growth, like the Phonograph Grand's lobby, so no street, road, car or signature car moved): a **vault door** (a locked fixture: it says it is shut and never opens — the bank robbery stage will use it), a **tellers' counter**, a **bond desk** and a **rate board**, with a rug, plants, a bench and windows.
- **The bond desk** opens the tablet at **Bonds**; **the rate board** opens it at **Bank**. A new interaction kind (`bank`) does this; the content validator knows it.

### Not included
- **No staff.** There are no tellers, no governor and no bank guard yet: the counter says so ("please use the bond desk or the rate board"). Characters need their own schedules, homes, portraits and dialogue, which are a release of their own.
- **No separate policy office or vault room**: the footprint is small, so the policy office is the rate board in the hall and the vault is a door in the wall. Nothing can be taken from it; nothing is stored in it.

### Changed
- (No existing behaviour.) A first attempt, with a larger interior, made the street grow to fit it and moved the signature cars into walls (four existing tests failed); the hall now matches the building instead.

### Tests
- New: `first_bank` (4): the door leads to a hall exactly the building's size with its way back to the street and a place to stand, the hours (open at ten, shut at 18:30 and 08:59, the hours in the message), the bond desk and the rate board opening Bonds and Bank, the vault and the counter giving messages, and the street around the bank not having moved. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md.

## [0.69.0] — 2026-10-30 — Government Paper (development build)

Stage 10, second of four parts: government bonds. The physical bank and corporate bonds follow.

### Added (`src/corp/bonds.js`, `src/systems/bonds.js`, the Bonds app)
- **Three terms on offer** (1, 3 and 5 years of 360 days), always, at par. The **coupon** is fixed when you buy: the policy rate plus a **term premium** (0.25% at 1 year, 0.75% at 3, 1.25% at 5, in a straight line between) to the quarter-point.
- **A month's coupon (face × coupon ÷ 12) every thirty days**, and the face with the last one. Paid once each whatever is saved or slept through (a gap pays each missed coupon once).
- **Market value**: the cash a bond still pays, discounted at today's yield for the time it has left — par at issue, less when the bank raises its rate, more when it cuts. **Sell back at any time** for that value less a **0.5% spread**; the app shows the gain or loss on what you paid, not counting coupons.
- **Limits**: at least 1,000 and in hundreds; at most 2,000,000 of each term in one pair of hands. Refusals change nothing.
- **Your own investment**: bought from and paid to your wallet like shares. The interest and the face are the government's, not any company's, so no company account is touched and nothing is consolidated.

### Not included
- Bond values are **not** in the net-worth figure that quests and achievements read (shares of Ober's Oil and Chuckie's Cheese are); the Bonds app shows them. Bonds in the exchange's portfolio are not shown there. Corporate bonds and bonds held by companies come later.

### Save
- `world.corp.bonds` (`lots`: `id`, `years`, `face`, `coupon`, `issued`, `due`, `end`, `cost`, `coupons`; `earned`, `log`, `lastDay`, `nextId`) is created at the first purchase. No schema change (still 1).

### Tests
- New: `bonds` (6): the curve, the coupon, the cash flows and the value (par at issue, falling and rising with the rate, never wild); nothing made before a purchase and the offers at the old 5%; the bounds and refusals; coupons once a month, none early, twelve and the face and no more; value and sale with the spread and a round trip costing only the spread; saves and an old save; a coupon fixed at issue while the offers follow the rate. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. There is one issuer and no default; the premium curve is fixed; no inflation-linked or floating bonds; a coupon is not recalculated when the bank changes its rate.

## [0.68.0] — 2026-10-30 — The Policy Rate (development build)

Stage 10, first of four parts, of the Corporate Empire brief (docs/CORPORATE.md): the First Bank of Halvermouth's policy rate. Government bonds, the physical bank and corporate bonds are the next three releases.

### Added — the rate (`src/corp/bank.js`, `src/systems/centralBank.js`)
- **One policy rate**, starting at the benchmark the game has always had (5%). It is **nobody's to set**: on the first day of each month from the **fourth month (day 91)** the bank looks at the wider world — capacity in use (weighted by capacity, neutral 75%), last month's sales against the month before (counted up to ±10%), the share of companies in distress — and works out a target (neutral + 6 points per point of busyness above 75% + 0.3 × growth − 0.1 × the share in distress, to the quarter-point, 1%–12%). It then **holds if within a quarter-point, moves a quarter-point, or a half-point if a point or more away**. Decided once a month on the world as it stands that day, whatever is saved or slept through; the new rate applies from the next day.
- **Every decision is written down** with the figures and the words ("The First Bank of Halvermouth lowered the policy rate from 3.00% to 2.75%: capacity in use 82% (neutral 75%); sales +6.7% on the month before; 0% of companies in distress."), kept for 36 months, with a line in the tablet feed.
- **What the rate does**, each within fixed limits and **exactly nothing at the neutral rate**: the parent's loans to its subsidiaries are at the rate plus a point (was a fixed 6%); the interest the world's companies pay is the rate plus a point and their risk (was fixed); a year's profit counts for 3% less of its multiple for each point above neutral, ±15% — every estimated value, so the exchange's prices (a valuation never creates money); a company builds when it is half a point of utilisation busier for each point above neutral, ±3 points; new companies appear 4% less often for each point above neutral, 0.7–1.3 times.
- **The Bank app** (tablet): the rate and the neutral one, since when, the next meeting, the rate over the meetings, what the bank is looking at now, what the rate does today, and the record.

### Unchanged
- Before the first meeting nothing is made and the rate is the old constant, so every existing game and test behaves as before until day 91. At the neutral rate (5%) every effect is exactly one or zero. A game that stays at 5% behaves as it did.

### Save
- `world.corp.bank` (`rate`, `since`, `decisions`, `lastMeeting`) is created at the first meeting. A save from v0.67 or earlier has none and the rate is 5%. No schema change (still 1).

### Tests
- New: `bank` (7): the rule (target, step sizes, holds, limits, the words), the effects exactly nothing at neutral and bounded, nothing made before the first meeting and the old 6% loan rate, the first meeting on day 91 once a month and once after a long sleep and a reload, a distressed world lowering it and a busy one raising it and a long run staying in bounds by quarter-points, the rate reaching loans, interest and valuations, and no way to set it. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. The rate follows only the wider world (not your own businesses); there are no bank loans, bonds or building yet; no inflation measure (the bank has none to read).

## [0.67.0] — 2026-10-30 — One Set of Rules (development build)

Stage 9, second part, of the Corporate Empire brief (docs/CORPORATE.md): the two older shares that were not under the exchange's rules.

### Correction to 0.66.0
- 0.66.0's changelog, release notes, known issues and board said **Chuckie's Cheese had no broker's fee and no cap**. That was wrong: CHZ has always had a **1% fee each way** and a **cap of 1,500 shares (1% of the company)**, and a price that moves a part of the way to fair value each day. The board showed it as having neither. It now shows what CHZ really has. (Nothing about CHZ's trading was wrong in the game; only what the new screen and the notes said.)

### Changed — Ober's Oil (OBRO) under the exchange's rules
- **A 1% broker's fee each way** and a **cap of 5%** of its 100,000 shares (5,000 for one investor). A purchase over the cap is refused with what you may still buy; a holding above the cap (from project shares) stays as it is. Shares from an expansion project still arrive free.
- **One price step**: the old formula (20 + output ÷ 8, less 6 in a strike, floor 5) is now what a share is *worth*; the price moves 12% of the way there each evening with the exchange's ±2% mood (a hash of the day and the world's seed, **no game RNG**). It starts from today's price, so nothing jumps on the day you load. A strike or an accident now takes the price down over days, not at once. Prices have pennies.
- **What you paid is kept** for shares bought from now on; shares you held before, or got from a project, have no cost on record, so the Exchange shows no gain for them rather than guess. Dividends are unchanged: still paid every evening from real output.

### Changed — Chuckie's Cheese (CHZ)
- Its own rules are unchanged (fee, cap, price step, daily dividends). It now **keeps what you pay** for shares bought from now on; shares held before have no cost on record.
- Its price noise still uses the game's random numbers, as it always did: taking that out would shift the numbers every other part of the game draws.

### Save
- `world.oil` gains `costBasis` (while every share held was bought) and `fair`; `world.dairy` gains `costBasis`. History entries for OBRO carry `fair`. Old saves keep their price, shares and cash; nobody is charged or given anything by loading. No schema change (still 1).

### Tests
- New and changed in `exchange` (now 12): OBRO's fee each way and cap, cost kept and lost to a project's bonus shares, the price a step toward the refinery's figure with no RNG and the same in two games, a strike pulling the price down over days; CHZ's cost kept and the pre-existing holding left without one; an old save with OBRO shares loading at the same price and holding; the board showing CHZ's real fee and cap. **Two assertions of the previous release's tests were changed on purpose** (OBRO's fee on the board, and which holdings have a known cost). Every other test passes unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. The exchange's rules now apply to every listed company; CHZ keeps a 1% cap (Chuckie keeps control) and its own noise source.

## [0.66.0] — 2026-10-30 — Open Board (development build)

Stage 9, first part, of the Corporate Empire brief (docs/CORPORATE.md): one exchange for every listed company. The listed companies of the wider world are tradable for the first time, under one set of rules; the three shares the game already had are on the same board **but keep their own rules for now** (the second part).

### Added
- **The Exchange app** (tablet): a board of every listed company (price, the day's change, thirty days as blocks, what you hold) with a sector filter and sort, a portfolio summary (what you hold at today's prices, the gain on holdings whose cost is kept, dividends received), a company panel (sixty days of price, low and high, what the company's books say a share is worth, the shares, the cap, the fee, your holding and its cost) and buttons to buy or sell 1, 10 or 100.
- **The wider world's listed companies** (about seventeen) are listed once their books can value them, each with a share count made to fit its worth at a first price of 20–120 obols, so a company is priced from its first morning. Under `CORP.exchange`: **price** moves 12% of the way each day to the company's own estimated value over its listed shares, with a ±2% daily mood that is a hash of the world's seed, the ticker and the day (no game RNG, so two games from one save agree); **a 1% broker's fee** each way; **a 5% cap** on one investor; **dividends** are what the company really paid out of a closed month's profit (the world already pays them), once a month, per share; a company that **fails** leaves its shares worth nothing, and one that is **taken over** buys them out at its last price. Nothing ever follows your trades.
- Buying and selling goes through the exchange for these; for Ober's Oil, Chuckie's Cheese and Meridian it goes through their own services, so their rules are exactly what they were. (*Corrected in 0.67.0: this line said the first two had no fee or cap; Chuckie's Cheese always had both.*)

### Not changed
- OBRO, CHZ and MRDN keep their own prices, dividends and rules, and their tests pass unedited. (Ober's Oil, the only one of them without a fee, a cap or a smoothed price, came under the exchange's rules in 0.67.0.)

### Save
- `world.corp.exchange` (`listings` per ticker: `shares`, `price`, `fair`, `status`, sixty days of `history`; `holdings`: `n`, `cost`, `divs`; `log`; `lastDay`; `divMonth`) is created on the first morning after the wider world is made. A save from v0.65 or earlier gains empty holdings: no one is given a share. No schema change (still 1).

### Tests
- New: `exchange` (9): the pure rules, listings made once at a price that fits their worth, prices following the books within the mood and the same in two games, the fee each way and the cap and refusals that change nothing, dividends once a month and none for shares not held, failure and takeover settled once, the three older shares read and traded through their own rules, the portfolio saying plainly when a cost is not kept, and saves. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Ober's Oil and Chuckie's Cheese have never kept what you paid, so the app cannot show a gain on them. The exchange's history begins on the first morning of the wider world, and a company's price history is sixty days.

## [0.65.0] — 2026-10-30 — Counting House (development build)

Stage 8 of the Corporate Empire brief (docs/CORPORATE.md): treasury — a policy that moves cash within the group, decided by a chief financial officer through the same judgement, budget and approvals as every other manager decision.

### Added
- **Treasury policy** (Management tab): for each subsidiary, a **floor** and a **ceiling** of cash (the ceiling at least 1,000 above the floor and never below its protected minimum), and a **reserve the parent keeps** that top-ups never go below. Cash, not profit.
- **A treasury decision** (`transfer`), made once a day at most per subsidiary by a **chief financial officer** at the parent who has the **permission to move cash** (executives have it by default; it is set per person): **below the floor**, a top-up from the parent to the floor — only what the parent has free above its reserve (so it may be partial) — as a capital contribution through the group's own transfer; **above the ceiling**, the surplus repays what the subsidiary owes the parent (loans in order), then returns capital the parent put in (never more than it put in), and **nothing while the subsidiary owes anyone else** or below its protected minimum. Nothing under 1,000 is moved.
- It uses the one judgement: a monthly **Treasury** budget per subsidiary (the cash moved, both ways added together, counts), the person's spending limit and ask-above limit (above it the move waits for you; approving judges it again from today's figures and moves what is needed *now*), and the funded-companies-only rule. Planning changes nothing.
- The Management tab shows each subsidiary's cash, policy and what the next move would be, and alerts and plain notes where nothing is happening (no policy, no budget, no officer or permission, not in the group).

### Unchanged by design
- Moves are the group's own **transfers**: they are numbered and logged, they change which account holds the money and never how much exists, and they appear in no company's sales or costs. The v0.61 monthly distribution policies are separate and keep running as before.

### Save
- `world.corp.management.treasury` (`{ [subsidiary]: { floor, ceiling }, parent: { reserve } }`) is created when a policy or reserve is first set. A save from v0.64 or earlier has none; nothing is moved by loading. No schema change (still 1).

### Tests
- New: `management_treasury` (8): the pure move rule (top-up, partial under the reserve, nothing below the least worth moving, sweep order loans-then-capital, never while owing others, never below the protected minimum), policy bounds, a top-up through the real transfer with cash conserved and the subsidiary's months untouched, the reserve, the budget as a hard stop, the ask-above queue and re-judging at approval, nothing happening without a policy, budget, officer or group, saves, and a run of repeated sweeps and top-ups in which every obol that moved existed. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Treasury is one policy per subsidiary, moves between the parent and a subsidiary only (never directly between two subsidiaries), and has no forecasts, interest on cash or debt monitoring yet (not chosen for this release).

## [0.64.0] — 2026-10-29 — By the Plan (development build)

Stage 7 (second half) of the Corporate Empire brief (docs/CORPORATE.md): managers bidding on contracts and expanding from pre-approved plans, by the same judgement and limits as before.

### Added — contract bids (aerospace)
- **The owner's minimum margin** (Management tab): a percentage over cost, per business. **Without one managers bid on nothing.**
- A sales manager, general manager or aerospace operations manager **with the permission to sign contracts** picks the open tender with the best profit that the firm can build, and **bids at cost plus the margin** (rounded up to 100), through `aerospace.placeBid` — so every rule of the tender (quality, clearance, reputation, delivery days, the five-aircraft rule) still holds. Where the customer's ceiling is **below** the margin the bid is **queued for you** and, when approved, is placed at the ceiling; where the ceiling is below cost it is never bid or asked. Bids are sealed and final, one each.
- A bid costs no money; what it **commits** (the cost of the work if it wins) counts against a monthly **Contract bids** budget and the person's limits. At most three contracts and open bids at a time. The quote is pure: planning moves no RNG and no supplier stock.

### Added — plans and expansion
- **Plans you approve** (Management tab): a type, how many (1–10), the most to pay for each, and the cash that must be left in the account afterwards. Twelve at most; withdrawable. Types and their fixed rules: **arms station** (ordered through the works's own order, so the price and delivery are the arms system's; when it reaches the dock it is placed at the first free cell of the works floor, row by row, with a clear ring around it and power for it; an optional recipe is set; **no worker is assigned: that stays yours**); **farm plot** (the cheapest plot for sale up to eight tiles — a lane — from one you already own; never your first); **port** (the cheapest port for sale, up to the port limit); **aerospace bay** (the first free slot in a hall you have built; never builds a hall); **aerospace facility** (a named one, if not built or under construction).
- A manager **with the permission to expand** (general manager; manufacturing, farm, logistics or aerospace operations manager for their own business) buys the next item of a plan once a day at most, one at a time, from the business's own account, inside a monthly **Expansion** budget, the price limit, the reserve and their own limits; a purchase above their ask-above limit waits for you.

### Changed
- The judgement has two more permissions (sign contracts, expand) and a reason to ask even within the limits (a bid below the margin); `owner: true` lifts it. Decisions now carry an item (a tender, a plan), so a request is per tender or plan and is judged again at approval.
- Arms `place` and the factory's accept a container to take the item from (the works's dock) instead of your pockets; with none, they act as before.
- Authority text in the Personnel app now says what the permissions do.

### Save
- `world.corp.management` gains `margins`, `plans` (`type`, `params`, `limit`, `maxEach`, `reserve`, `bought`, `placed`) and `nextPlan`; a v0.63 save gains them when first used. Nothing is bid or bought by loading. No schema change (still 1).

### Tests
- New: `management_plans` (13): the pure rules (bid price and floor, plot, port and free-cell rules, the two permissions and the owner lifting a queued bid), bids (margin, budget, permission, one at a time, open limit, queue and approval at the ceiling, never below cost, nothing drawn and nothing moved by planning), plan validation, a farm plot (cheapest next to yours, from the farm's account, limit, reserve, budget, permission, never the first), a port, an aerospace facility and bay, an arms station (ordered, delivered, placed from the dock, the recipe set, no worker, one at a time, power and no-free-place logged once), saves, and nothing happening when nothing is authorised. All earlier tests pass unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Bids are aerospace only; shipping contracts and arms purchase orders are not decided by managers; no expansion of a hall, a ship, or a farm's fences, crops or animals; no selling or closing anything.

## [0.63.0] — 2026-10-29 — Within Limits (development build)

Stage 7 (first half) of the Corporate Empire brief (docs/CORPORATE.md): managers deciding for themselves, inside limits the owner sets. Contract bids and expansion from pre-approved plans are the second half (next release).

### Added — decisions, budgets and approvals (`src/systems/management.js`, `src/corp/management.js`, `src/content/management.js`)
- **One judgement for every decision** (`judge`): a person must be at work and paid, their job must make that kind of decision, a hire needs the permission to hire, the business must have **an account of its own** (managers never spend your personal wallet), a **monthly budget** for the category must be set and not exceeded, the cost must be within their **spending limit**, and the account must cover it. Then: at or below their **ask-above limit** it is done; above it, it **waits for you**. The first failure is the stated reason.
- **Budgets** are monthly caps per business and category (**materials and parts**, **hiring**). None set means none allowed. Only spending by managers' decisions counts against a budget; your own purchases never do. A budget is permission, never money.
- **Approvals queue**: a decision above the ask-above limit waits on the Management tab (up to 30; one per kind and business at a time; lapses unanswered after 7 days with nothing done). **Approving judges it again from scratch** — the need, the price, the budget, the account and the person are all checked at that moment; only the ask-above limit is lifted. Declining records it.
- **A log** of everything managers did, asked, could not do (a refusal is written once, not daily), and what you approved or declined (200 kept), and **alerts**: requests waiting, refusals in the last days, a budget with no one to use it or no account, a budget 80% used.

### Added — what managers decide
- **Reorders** (procurement manager, manufacturing manager, aerospace operations manager, general manager). *Arms*: each part a staffed station uses is held at the works's loading dock at a par of one shift (8 hours of the stations using it); when the dock plus what is on order falls below half of par, an order brings it back (at most 60 of a part at a time). Only bought parts, only for stations with a worker assigned. *Aerospace*: one order per material, for what open units are short of after free stock, from the cheapest supplier, **quoted first and then bought at that price**; **only while the firm's auto-buy is off** (auto-buy is your own standing order and is left exactly as it is). Shipping and farming buy nothing through their company accounts, so they have nothing to reorder yet.
- **Hiring** (general manager for staff jobs at their own business; the parent's HR director for staff and manager jobs at its subsidiaries): only into a job the business has a case for (the Openings list), the candidate of the job's own level with the best fit, offered the least they will accept, at most **two hires a month** per business. A hire counts its recruiting fee **and a month's wage** against the budget and the person's limits.
- At most one reorder and one hire decision a day for each business, at about 06:00, keyed by day in the save so loading does not decide twice.

### Added — the Management tablet app
Waiting requests (approve / decline), a budget per business and category with what has been used and who decides it, plain notes where nothing is happening and why (no budget, no account, auto-buy on, nobody at work), and the log.

### Changed
- **Authority defaults for new hires**: the ask-above limit is now 20,000 (executives), 3,000 (managers), 500 (staff) — so the queue can happen; spending limits are unchanged. **People hired in v0.62 keep their stored limits** (a manager's 10,000 / 10,000), so for them everything within 10,000 is done without asking until you lower it under Personnel → Staff → Manage.
- Openings now also list staff jobs a business has a case for (supervisor, procurement specialist, logistics coordinator, farm supervisor), so there is something for a manager to fill.
- Aerospace: `orderCost` (what an order would cost, nothing changes) and `reserveShortfalls` are separated out of `order` and `autoProcure`, which behave as before.

### Save
- `world.corp.management` (`budgets`, `spent`, `pending`, `log`, `last`, `hires`, `nextId`) is created the first time a budget is set. A save from v0.62 or earlier has none. Setting no budget changes nothing: with people hired and no budgets, a 25-day scripted game matches v0.62.0 exactly. No schema change (still 1).

### Tests
- New: `management` (19): every branch of the judgement in order, the arms par and order rules, a deterministic hire choice, nothing created and nothing spent with no budget, arms reorders paid from the works's account and attributed, no order for an empty station or a stocked dock, the monthly budget as a hard stop that resets with the month, the owner's purchases not counting, the queue (once, approve, decline, expiry), approval judged again (a changed need, budget, funds, person), unfunded businesses never touching the wallet, jobs that do not decide, aerospace planning moving no RNG or stock and paying exactly the quote, auto-buy left alone, hiring (budget, monthly cap, cost = fee and a month's wage, authority, ask-above queue, no managers hired by a manager), the HR director's reach, and the save. One existing assertion (`personnel`, the farm's list of openings) was updated for the new staff openings; every other test passes unedited.

### Known limits
- See docs/KNOWN_ISSUES.md. Contract bids and building or buying from pre-approved plans are not in this release; there is no per-business reorder policy beyond the budget and the person's limits; executives at the parent do not decide anything on their own yet.

## [0.62.0] — 2026-10-29 — Good Help (development build)

Stage 6 of the Corporate Empire brief (docs/CORPORATE.md): a market of people, hiring and paying them, and what a good one does.

### Added — people (`src/content/personnel.js`, `src/corp/people.js`, `src/systems/personnel.js`)
- **A market of about 24 candidates**, made once from a seed kept in the save (the same save always has the same people) and refreshed weekly: three to five take other jobs, new ones arrive. Each has 17 skills (0–100, with strengths and a weakness), six traits, an age, experience, education, a work history, a reputation, a style, the pay they ask and the least they will take, and a notice period.
- **26 jobs in three levels**: executives work for the parent company (CEO, CFO, COO, controller, strategy, procurement, HR); managers (general manager and one for manufacturing, logistics, aerospace, farm, sales, procurement, R&D, finance, maintenance) and staff work for a business. Each job has a pay band, the skills it needs, and a limit on how many an employer may have.
- **Hiring**: an offer is accepted at or above the person's floor (a good negotiator holds out a little longer); the recruiting fee (ten days' wage) is paid once from the employer; they start when their notice ends. One person, one job at a time. **Dismissal** pays five days' severance once and keeps the record.
- **Payroll every day at 19:05**, from each employer's own account, in the way its own books record it (aerospace's wages line, shipping's expenses under wages, the farm ledger, the parent's expenses). An employer that cannot pay leaves people unpaid and they lose heart; unpaid two days running, they resign. Someone unpaid does nothing for the business.
- **Skills grow from results, not from time**: each month a person's employer is compared with its average of the three before; a good month with the person paid in full builds experience, and every third good month adds a point to the weakest of the skills their job needs (at most six points in a career, never above 90). **Promotion** needs sixty days in the job, two good months and the skills for the higher one, and raises the pay.
- **Authority** (spending limit, ask-above limit, may hire / borrow / transfer / sign / expand) is set per person, bounded by their level, and **recorded now; nothing enforces it until managers act on their own (stage 7)**.
- **The arms works' station workers join the list as a view** — counted once, still hired, paid and let go at the works. Aerospace crews stay head-counts and are shown as one line.

### Added — what a good person does (and only that)
Each effect is applied at the moment the money is paid or the output made, is capped, scales with their skills, their reliability and being paid, and does nothing without what it acts on: **materials** price at aerospace suppliers (cap 8%), **parts** price for the arms works (10%), aerospace **overhead** (10%), **arms station speed** (10%, only for a station with a worker at it — every staffed station, so a lab researches faster too), shipping **upkeep** (12%), **farm sale prices** (8%). A parent's executive reaches each subsidiary at half strength; the sum is capped. With nobody hired the game is identical to v0.59.0 (checked by running both).

### Added — the Personnel app
Openings (what a business has a case for, the best candidate of the job's own level, and what the hire would be worth against what they cost — it says so when that is less), Candidates (filters, sort, side-by-side comparison of three, an offer form that shows the effect, the value and the fee), Staff (raise, promote, move, set authority, dismiss), Payroll (each employer's daily wages and whether its account covers them; the arms floor and aerospace crews for information).

### Changed
- Aerospace, arms, shipping and farming consult the personnel service at the point of paying (`supplierPrice`, `fixedCosts`, `speedMult`/`partsMult`, `daily()` upkeep, `unitPrice`). All return exactly what they did before when nobody is hired, and ask nothing of a market that has not been opened.

### Save
- `world.corp.people` (`salt`, `pool`, `staff`, `pay`, `log`, counters) is created the first time the Personnel app is opened or someone is hired. A save from v0.61 or earlier has none, and opening the market creates no money, people or businesses beyond the candidates themselves. No schema change (still 1).

### Tests
- New: `personnel` (23) and `personnel_effects` (11): the market made once and the same after save/load; weekly turnover bounded and numbers never reused; one person one job and the limits; wages paid once a day from the employer's account under funded and unfunded accounts and across a save; unpaid twice and they resign; severance once; skills growing from results only; promotion rules; authority bounds; the arms staff counted once; parent wages in the consolidated statement; every effect shown to move real money or output, within its ceiling and nothing without its resource; two managers with different strengths giving different results; nobody hired changing nothing.

### Known limits
- See docs/KNOWN_ISSUES.md. Passive effects are small next to wages in small businesses; managers' decisions (stage 7) are where they are meant to pay.

## [0.61.1] — 2026-10-29 — Under One Roof, checked (development build)

A patch to 0.61.0 after an independent review of the release.

### Fixed
- **Closing a company's account left its group transfer counters behind**, so a business that had left the group, closed its account and was funded or joined again would no longer reconcile with its own history. They are reset with the rest.
- **A business that left the group stayed in the parent's books** as an in-kind contribution (`inKind`), overstating the parent's ledger. It leaves them when the business does.
- **The Lend row in the Group app showed the loan rate as fixed text** though the release notes said it could be set. It is now a field (0–25% a year; it starts at the benchmark plus a point).

### Verified
- A 20-day run of all four businesses on the current code is identical, line for line, to v0.59.0's (the daily-bills refactor in aerospace and the group's monthly hook run for every player).

### Tests
- New in `corporate_group` (2): leaving → closing the account → funding or joining again stays reconciled and the parent's books let go of what left; a loan's rate can be set within bounds.

## [0.61.0] — 2026-10-29 — Under One Roof (development build)

Stage 5 of the Corporate Empire brief (docs/CORPORATE.md): a parent company, subsidiaries with their own books and cash, money that moves between them on the record, and statements that take the internal dealings out.

### Added — the parent company (`src/systems/group.js`, `src/corp/group.js`)
- **Found a parent company** from the new **Group** tablet app: free, and it makes nothing — it starts with no money, no business and no staff. Name it, rename it. You pay money into it (a logged contribution) and take dividends out.
- **Bring a business under it** as a subsidiary (always wholly owned; the record keeps a stake field for later). It is one step with a preview first: the business stops spending your wallet and uses its own account, so the app tells you what it spends a day and what happens with no money (aerospace and shipping fall into debt, arms staff go unpaid and quit, a farm's purchases are refused) — and offers opening capital from the parent in the same step. An arms business needs its first works before it can join. No circles, no second parent.
- **Money reaches a subsidiary only through the parent**: you → parent → subsidiary (capital, or an intercompany loan) and back by distributions, repayments and returned capital. Your wallet cannot pay, take from or fund a subsidiary, however it is asked. A subsidiary can **leave the group** (never while it owes or is owed): its cash stays in it and it is yours again.
- Every transfer is one step, numbered and logged, and moves cash between two accounts — **it is never sales, never a cost**, so it cannot squeeze the other companies in a sector or make a profit.

### Added — loans, distributions, policies
- **Intercompany loans**: the parent lends at the benchmark plus a point (you may change the rate and term); each month the borrower pays a month's interest and an equal instalment, or — if it owes others — misses it and the miss is recorded; early repayment; borrowing is never revenue.
- **Distribution policies** (a default for the group and one of its own per subsidiary): the cash it keeps, a protected minimum, an extra reserve while it owes the parent, the share of profit it keeps and sends up, loans first. Each month the plan is worked out from the month's actual trading result **and the cash it really holds above the reserve** — profit tied up in stock, plant or what customers owe is not sent — and runs once. You can send money up at any time; below the protected minimum it needs an explicit override, which is recorded, shows as an alert, and leaves the subsidiary with what is left.
- Monthly jobs are keyed by month in the save: a save in the middle of a month, or a long sleep, runs each closed month once (the last three after a very long gap).

### Added — statements
- **Separate statements** for the parent and each subsidiary; **consolidated** for last month, this month so far or twelve months, with the intercompany dealings taken out: the freight charge between the shipping and aerospace subsidiaries (the part aerospace has not yet used stays held back and is not counted as group profit; it is released as aerospace uses the materials), interest a subsidiary paid its parent, dividends the parent was sent. A check line shows the companies' results less dividends less what is held back equals the consolidated result.
- **Cash** shown as the parent's spendable cash, each subsidiary's, the group's, and what could be sent up next; **debt to outsiders**; **loans inside the group** (what the parent is owed and what the subsidiaries owe cancel); the parent's own ledger; recent transfers.
- **Group value** (an estimate, never cash): the parent's cash and what it is owed, plus its stake in each subsidiary at its value after what it owes the parent — nothing counted twice; capital moved or lent inside the group leaves it unchanged. **Who contributes**: each subsidiary's share of value and earnings, cash sent up, and its risks.
- **Alerts** for a subsidiary below its protected minimum, owing others, with under a week of cash, missing loan payments, or overridden.

### Changed
- The Companies app shows a subsidiary's money as the parent's business (its Pay in / Take out buttons are for independent businesses). The naming panel now also names the parent, and no longer lets an already-named company swallow a waiting prompt.
- Aerospace's daily fixed costs are available as one figure (`fixedCosts`) — the day's bills are unchanged.

### Save
- `world.corp.parent`, `.ownership`, `.transfers`, `.loans`, `.group` are created when the parent is founded; accounts gain `xferIn`/`xferOut`. A save from v0.60 or earlier has no parent, no group and nothing consolidated. No schema change (still 1).

### Tests
- New: `corporate_group` (17), `corporate_loans` (16), `corporate_consolidation` (10): ownership rules, free formation, atomic join, the wallet guards, conservation of cash at every step, transfers not being trading, loans and their monthly terms, distribution policy and protected liquidity, once-a-month under save/load, the deferred-freight pool (a charge unused changes nothing; used up, nothing was made), moving money never changing the group's result, value without double counting, and a group of all four businesses run for two months on the real systems.

### Known limits
- See docs/KNOWN_ISSUES.md. Selling or closing a subsidiary, part-owned subsidiaries, managers and budgets (stages 6–8) and a lender outside the group are later.

## [0.60.1] — 2026-10-29 — Own Account, checked (development build)

A patch to 0.60.0 after an independent review of the release against the code it shipped.

### Fixed
- **A funded shipping company's naval missions were checked against the owner's wallet** (the cost was paid from the company, the check was not). They are now checked against the company's cash. An audit of every `player.money` use found no other business path on the wallet; what remains is deliberately personal (shares and dividends, shops and supplies, cars and tractors from the dealers, homes, the calculator factory, fines and bribes, a day's labour, the casino).

### Changed
- **Saves are about 40% smaller for the wider world**: a company's cash, debt, capacity, plant and its month rows are kept in whole obols (its character to three decimals) — a new game's whole save is about 87 KB, 145 KB after a year of play. (No change to what the companies do.)

### Verified (and now written down)
- A 20-day run of all four businesses on the **shipped** 0.60.0 code is identical, line for line, to v0.59.0's (this had only been checked on the first part of the work).
- Each business founded through its real interface — Lucas's dialogue, Fleet Command, the aeroworks sale panel, the Land Office — raises the naming panel once its window closes.

### Tests
- New: `corporate_paths` (6): ports, ships, missions, land, fencing, animals, the co-op, a second works, parts, wholesale sales, the aerospace firm — each from a funded company's account with the owner's wallet untouched, and a poor company refused however rich its owner is.

## [0.60.0] — 2026-10-29 — Own Account (development build)

Stages 2–4 of the Corporate Empire brief (docs/CORPORATE_AUDIT.md, docs/CORPORATE.md), the foundation the rest stands on: each business is a company with a name and an account, there is a whole world of other companies to measure yourself against, and every company is read the same way.

### Added — company accounts (`src/corp/ledger.js`, `src/systems/corporate.js`)
- **One payment layer for the four businesses** (`game.corp`): arms, shipping, aerospace and farming all pay and are paid through it. A company you have not funded spends your money exactly as before (nothing about play changed — the whole existing suite passes unedited, and a 20-day run of all four businesses matches v0.59.0 obol for obol).
- **Fund a company** (the Companies app on the tablet): pay money in and it has its own cash and pays its own bills; take it out; close the account. A funded company that cannot afford something is refused, and a bill it must meet but cannot cover becomes **arrears**, paid first from its next income — never free goods, never a quiet overdraft.
- **Buying a business is your equity, not its spending**: the licence, the shipping line, the aeroworks, the first plot are paid from your wallet and recorded as assets brought in at cost; later works, ports and plots are the company's own capital spending.
- Shares and dividends (OBRO, CHZ, MRDN) stay personal money, untouched.

### Added — identity and the registry (`src/corp/identity.js`, `src/corp/registry.js`)
- **Name your businesses** (a panel opens when you found one) and rename them any time: trimmed, 3–40 characters, letters, numbers and `& ' . , -`, no clash with any other company; every name used is kept in its history. Existing games keep Ober & Sons Maritime and Roost Aeroworks; the arms and farming businesses get default names (Mill Road Arms Works, East Plot Farms) nobody is asked about.
- **One registry** of every company: your four (private, never listed), Ober's Oil, Chuckie's Cheese and Meridian (the listed three), the five freight carriers, and the generated companies.

### Added — the wider world (`src/content/corporate.js`, `src/corp/sim.js`, `src/corp/generate.js`)
- **About forty-five companies in ten sectors** (arms, shipping, aerospace, agriculture, energy, industrial, transport, communications, satellites, finance) from the eight countries and home, 17 of them listed with tickers. Made once, with a 120-day history, kept in the save, never regenerated.
- They **share real demand** with you — what your business sells comes off the top of its sector, so winning business leaves less for them — and each pays its costs and interest, borrows within limits, builds when busy, sheds when idle, pays its owners; a busy sector draws newcomers, a failing company is bought by a strong one, one that stays broke is wound up and its lenders take the loss. All bounded (60 alive, 90 records).
- The arms sector's demand follows the real arms market (its countries' incomes and wars).

### Added — figures, value and rankings (`src/corp/metrics.js`)
- **Intelligence** (tablet): every company of a sector ranked by revenue, net income, margin, growth, estimated value or share — last month, this month so far, or twelve months — with a profile for each and a figure-by-figure comparison with your own business. **Companies** shows each of yours with its figures and place.
- Figures come from the books each company keeps; what a company does not keep shows as "—". **Estimated value** (net assets plus a multiple of a year's profit, trusted only as far as the history shows) is an opinion and never cash.
- Each month's standing of your companies is recorded (24 months).

### Changed
- Terminal money readouts (arms funds, shipping, aerospace) show the company's own cash once it is funded. The Business app's later works and the shipping ports/ships/yards check the company's cash, not your wallet.
- The tablet gains **Companies** and **Intelligence** apps.

### Save
- `world.corp` is created on first use. A save from v0.59 loads with every company unfunded, nothing moved, default names for arms and farming, the wider world made at load. No schema change (still 1). See docs/SAVE_FORMAT.md.

### Tests
- New: `corporate_accounts` (11), `corporate_funding` (9), `corporate_identity` (8), `corporate_world` (15), `corporate_metrics` (13) — the payment layer and its invariants, funding and arrears, a funded aerospace firm reconciling with its own account, names and the registry, a real v0.59 save loading with nothing moved, the world's make-once and determinism, demand sharing, failure and merger, caps, rankings, valuation never making money.

### Known limits
- See docs/KNOWN_ISSUES.md: parent groups, managers, markets, banks and wars are later stages.

## [0.59.0] — 2026-10-28 — The Sky's the Limit (development build)

Stage V of the aerospace brief (docs/AEROSPACE.md), at the owner's word: "let's push 59." The satellites you build now go on working, the research tree is a tree, and the books say where the money comes from.

### Added — satellite services (`src/aero/orbit.js`, `src/aero/fleet.js`, `SERVICES` in `src/content/aerospace.js`)
- **A satellite you built for a customer pays you every day to keep it working** (a support fee against what it cost the customer, less its running cost), and when it is nearly spent the customer puts out a **tender for its replacement**. Lose one inside its first quarter of life and the customer remembers it.
- **Satellites of your own.** Order any satellite you can build and launch for yourself: it goes through the floor, the stores, the pad and commissioning like a customer's, and then it **sells what its role makes** — bandwidth, imagery, weather, navigation, research grants, government leases, servicing, beamed power — into a market with its own demand and its own rivals. A network earns more than its parts (**coverage**: four navigation satellites cover the sky, two leave gaps nobody pays for) and nothing past what the market buys. Its cost is a fleet asset that wears away over its life.
- **Lifecycles.** Satellites age (capability falls to three quarters), can be lost (a daily hazard from the hash of the satellite and the day — hardened buses and a servicing platform halve it), and end their lives. **Insurance** pays 70% of book value on a loss; **automatic replacement** puts a successor on the floor twelve days before the end.
- **The sky's events**: solar storms (unshielded satellites lose a share of their strength for days; the hardened are untouched), hurricane seasons and price wars that move prices, debris on a collision course (decide on the Standing page: burn clear, or leave it to the hash), discoveries from a science network.
- **The Orbit page** (new, key 7): the Earth turning under every satellite and its orbit, your satellites ringed and named, the ground station's beams; a card for each market (what you carry, what it wants, who else sells, what you take a day); an ordering sheet with what each satellite would add today, its life return and its payback; the fleet with health bars; the satellites you keep for customers; the policies.
- **The ground station's dishes on the map now follow the sky** — they lean together toward whichever satellite stands highest over the horizon, with a beam of light.

### Added — research
- **The Research page** (new): the whole tree laid out by branch and depth with the lines between what needs what, each project coloured by where you stand (researched, under way, queued, ready, locked); a card for the one you pick (what it does, what it opens, cost and time, the chance of a breakthrough); **a queue of three** so the laboratory never stands idle (the next project is paid for and starts when the last finishes).
- **Five operations projects with real effects**: *Ground network* (+6% of everything your networks carry, −10% running costs), *Radiation hardening* (−30% chance of losing a satellite), *Data products* (+15% weather and imagery prices), *Precision timing* (+15% navigation prices), *Autonomous operations* (−30% running costs). *Constellation networking* now really does what it said (+10% communications bandwidth).

### Added — achievements and reports
- **Twenty-eight achievements** (the Standing page): measured against what you have done, earned once, each paying a little reputation and a grant from the Park Authority — ten deliveries to a hundred million in revenue, ten on time in a row, every kind of aircraft, a whole five-aircraft contract, ten clean launches, a full network of your own, overtaking Meridian…
- **Financial reports** (the Books page, five tabs): the statement as before; **month by month** (thirty-day months, two years kept, a chart); **cash flow** (what came in from customers and what went out for materials, people, running costs, refunds and the halls — reconciled with your wallet); **balance sheet** (stores, work in progress, plant, satellite fleet, deposits owed; net assets and the capital put in); **by line of work** (units, revenue, direct cost, contribution and margin by line and by product). Each exports to CSV.

### Changed
- The terminal's rail has ten pages now (Floor, Tenders, Contracts, Supply, Hangar, Research, Orbit, Standing, Books, Meridian — keys 1–9 and 0); research left the Hangar page. A tablet notification and an overview alert tell you when a satellite is nearly spent.
- Billie's Skylarks, Meridian's order book and everything else are as they were; Meridian's own customers' satellites now pay it their support fees (a few thousand a day). Tina has a topic on what satellites earn.

### Tests
- New: `aerospace_orbit` (21), `aerospace_research` (9), `aerospace_achievements` (10), `aerospace_reports` (9) — markets, coverage, ageing, losses, orbits and ground passes, forecasts, support fees, warranty, replacement tenders, own satellites end to end, insurance, storms, debris, saves; the tree's shape and layout, the queue, the new projects' effects; every achievement's metric; months, cash flow reconciled with the wallet, the balance sheet, segments, CSV. The smoke test draws every page of the terminal.

## [0.58.0] — 2026-10-26 — Wheels Up (development build)

Stage IV of the aerospace brief (docs/AEROSPACE.md), at the owner's word: "let's go through with 58." Starling Field comes alive: what you build now leaves the ground, and the launch complex does what it is for.

### Added — aircraft on the field (`src/aero/flight.js`, `src/aero/field.js`)
- **Finished aircraft are on the apron**, parked on their stands. When the customer's crew collects one (you are paid and it changes hands, as before) it is **pushed back, taxies to the threshold of the runway in use, holds short, lines up, rolls and climbs away** off the map — its roll as long as its own take-off run, its shadow on the ground and its climb growing it against the sky; a VTOL lifts straight off its stand. One runway, one at a time: departures are cleared in turn. **09** on most days, **27** when the wind swings (a fixed function of the day; the windsocks follow it).
- **The aircraft state machine** for the flight update: `awaiting_delivery → taxiing → takeoff → airborne → departed`, with `landing`, `parked`, `maintenance`, `stored`, `retired` in place. Movements are *plans* rebuilt from saved facts, so a reload or a night's sleep puts everything where it belongs.
- **Meridian's own aircraft** (the company jet, the test Kestrel) are entities now: each morning the day decides who goes out and for how long, they depart, are away, and **land** (a final, a flare, braking, taxi in, nose-in on their stand) — sharing the runway with your deliveries. Their stands are empty while they're out.
- Navigation lights and landing lights at night; the roar of a roll or a climb by distance (`AudioEngine.setField`).

### Added — launches (`src/aero/launch.js`, `src/engine/drawLaunch.js`)
- A rocket now **rolls out standing on the crawler** from the integration building (half an hour; the pad is taken, the deck bare until it arrives).
- The launch step is a **sequence**: T-20 countdown on a board beside the pad, T-5 ignition (flame, a cloud of smoke across the deck, the ground shaking, the glare at night), lift-off, the climb with its trail and the spent stage falling away — or the moment a vehicle that was always going to be lost goes wrong (a flash, a fireball, burning pieces, ABORT). **What you watch is what is booked:** the outcome is fixed from the unit's own roll when the countdown begins, and booked when the sequence ends.
- **The secure convoy** (escort, transporter, escort) drives a strategic product out of its hall, along the service road, up Meridian Way and away down the Cut.

### Changed
- The terminal: the pad tile shows the crawler's minutes, the T-minus clock, the climb or the loss; an overview alert; the Apron page has a **Starling Field** section (runway in use, what each aircraft is doing); the pad page says where to stand. A countdown posts to the tablet.
- Tina, Ailie and the noticeboard know about all of it (a topic on where to watch a launch, one on sorties; runway 09).
- A rocket's launch now takes about an hour from the pad to the outcome (rollout 30 minutes, countdown and ascent 32), and a satellite's deployment is dated from lift-off.

### Tests
- New: `aerospace_flight` (16: every aircraft on every stand and runway, arrivals, stands, the queue, reload, old saves, Meridian's own, the convoy, sound, the terminal's field status) and `aerospace_launch` (14: sequence fixed at its start, phases, the clock, smoke as a function of time, shake, the crawler's way on the map, rollout, countdown, a loss, reload mid-countdown, cancelling).

## [0.57.0] — 2026-10-24 — Room to Grow (development build)

Stage III of the aerospace brief (docs/AEROSPACE.md), at the owner's word: "Let's move forward with .57." What you build at Roost Aeroworks now appears on the map; the people who work there matter; products can be configured; and your reputation has causes you can read.

### Added — halls on the map (`HALLS`, `src/content/maps/starling.js`, `src/engine/drawAero.js`)
- **Five halls to build**, each a real building with a walkable room: Hangar 2 (north of the office), the research laboratory (beside Hangar 1), and across Campus Drive the **West Works** — an assembly hall (2 heavy), a widebody & secure hall, and a space systems annex (rocket bay, two clean rooms). Until you build one it is a **building site** on the map (gravel, stakes, an excavator and a cabin); once paid for it rises through its build days — slab, frame, panels, roof, a crane — and then opens. Its door stays shut until then (for people too).
- **Bays go into slots.** A new bay needs a free slot that suits it in an open hall; the bay is drawn there — vacant plates, scaffolding while it's fitted, then the real thing. Meridian's halls are fixed; a Meridian bay beyond them goes up unseen, at half again the price. Engine test cell and inspection gantry stand at the apron's edge, drawn the same way. Old saves slot their existing bays into the first halls that suit them, at no charge.

### Added — people and quality
- **Technicians, engineers and inspectors**, for both companies. Too few engineers slow the drawing office and research; too few inspectors slow inspections and cost quality; extra inspectors raise it. **Experience** sets pace and quality and is diluted by new hires; **training** (standard, intensive) raises it at a daily cost. The Hangar page shows the people, the quality as a sum of its parts, the chance an inspection fails, and the last inspections.

### Added — product configuration
- Tenders ask for **configured** products — cabin layouts, VIP interiors, range, flight deck, sensors, endurance, heavy stores, spray gear, fairings, an upper stage, satellite payloads, life and hardening. A configuration changes the bill of materials (whole extra lots the line really uses), days, price (~1.4–1.7× its cost), required quality, research needs, flight spec and risk, and travels from tender to contract to unit to the finished aircraft (`config`, a configured `spec`). The tender board shows what each option costs and does; an option needing research says which.

### Added — reputation and events
- **Standing page** (key 6): reputation with a ledger that adds up (late streaks, failed inspections, on-time runs, flawless builds, lost launches, cancellations), decisions and offers, and the firsts. Events with causes, never random pop-ups: **government orders** (from reputation 50), **constellation contracts**, **research breakthroughs**, **expansion offers** when a bay has been the bottleneck, **regulator's audits** after repeated failures, and **milestones**. A lost bid's report says what the winner beat you on.
- Billie has things to say about growing and hiring (two new topics).

### Changed
- The terminal's rail now has eight pages (Floor, Tenders, Contracts, Supply, Hangar, Standing, Books, Meridian — keys 1–8). Meridian's quality is 72.8 (experience counts now). Tenders may require a minimum reputation.

### Tests
- New: `aerospace_halls` (8), `aerospace_staff` (8), `aerospace_config` (8), `aerospace_events` (13), and `unitLook` in `aerospace.test.mjs`.

## [0.56.1] — 2026-10-22 — Operations (development build)

The owner didn't like the aerospace terminal and asked for an interface like the arms console and Fleet Command. It's rebuilt from scratch as a full-screen operations room (`src/ui/aerospace.js`); the simulation is unchanged.

### Changed — Roost Aeroworks · Operations
- **Full screen**, with its own look (amber on night-blue blueprint): a top bar with the clock, ⏩ 1 h / 6 h and ⏭ next morning (watch the floor work in real time), your money and today's result; a rail on the left (Floor, Tenders, Contracts, Supply, Hangar, Books, Meridian — keys 1–7, with badges for tenders you can bid on, late contracts and shortages); a log ticker; Esc goes back to the floor.
- **The floor**: a live blueprint of your hangar — every bay draws the aircraft, rocket, satellite or (under a tarpaulin) strategic product being built in it, stage by stage, exactly as the bays in the world do (`Aerospace.unitLook`), with its lamp board, stage progress, time left, blocker and welders at work; idle bays say what's next for them, bays under construction are hatched. Below: the queue and drawing office, the apron with the aircraft waiting on their stands, the launch pad, the stores and the inbound road with its trucks. Click anything for its card on the right: a unit's picture and every stage of its build, a bay, the apron, the pad (build it from there), the stores, what's inbound.
- **The overview card**: profit, backlog, reputation, quality, alerts (late contracts, blocked units, shortages, too few workers) that take you to the fix, the tenders you could win with the margin you'd make, what's next out of the door, what your own ships have saved.
- **Tenders**: a board of cards with each product drawn, filters (I can bid, aircraft, launch, satellites, defence), the customer's priorities as bars, your cost and earliest delivery, and a **bid composer** — a price slider from below cost to the ceiling with the margin, contribution and deposit as you move it, and warnings before you bid something you can't deliver.
- **Contracts** with each unit's build as a stage strip (click one to see it on the floor); **Supply** with stores and one-click orders for what's short, your own ships (two-way switches for the mode and the policy, consignment cards with their voyage), purchase orders, and supplier cards with carrier vs own-ship landed cost; **Hangar** with the workforce, bays and facilities as tiles and build cards, research with the products it unlocks; **Books** with a day-by-day chart, the statement and the group table; **Meridian** with its numbers, its order book drawn, and MRDN.
- Meridian's share board opens the same screen, read-only, on the Meridian page.
- Fixed: durations of "23 d 24 h" now read "24 d".

### Tests
- `aerospace.test.mjs`: the terminal and the hangar bays draw the same unit (`unitLook`), and a later stage never shows less of the airframe.

## [0.56.0] — 2026-10-22 — In Our Own Hulls (development build)

Stage II of the aerospace brief (docs/AEROSPACE.md), at the owner's word: "Start the shipping integration." Own both Roost Aeroworks and Ober & Sons Maritime and your foreign materials come in your own ships, on the voyage system you already run.

### Added — materials in your own ships (`src/systems/aerospace.js`, `src/systems/logistics.js`, `INTERNAL` in `src/content/aerospace.js`)
- **Consignments**: each purchase order from an overseas supplier joins a consignment from that supplier's port to Mill Road Docks. A free cargo ship that can hold it is reserved, **sails empty** to fetch it if it must, **loads** once every order is ready, and **sails** a real voyage — with its running costs and port fees, its pre-rolled delays and its pirates. Nothing appears in stores until the ship docks and the trucks come up the Cut; nothing teleports.
- **The internal charge**: 1% of what the carrier would charge on a route your fleet sailed in the last 30 days, 2.5% on a new one, 5% when the ship sails there empty. The goods and duty are still paid in full; the voyage's real costs are paid once, by the shipping line.
- **Intercompany books**: the charge leaves your wallet and comes straight back (net zero); the shipping line books it as internal revenue, the aerospace books carry it with the materials into cost of sales, and the **group** table (Books tab) cancels it — no profit from moving money between your own companies. Buying ships and the line itself is counted as capital there, not operating cost.
- **Delays and losses**: a delay at sea moves the consignment's ETA, its purchase orders, and the production waiting on them (the report names the units). A cargo lost to pirates is lost: no materials, the loss booked, the shortfall re-ordered.
- **Choices**: own ships or carrier; when no ship is free, fall back to a carrier after a day (at the market rate) or wait; per consignment, *Make it urgent* or *Send by carrier instead*; manual orders show both landed costs with **Order (carrier)** and **Order (own ship)**. Automatic ordering compares suppliers on what your own ship would really cost and how long it would really take.
- **Savings view**: what a carrier would have charged, the internal charges paid, the saving on the aerospace books and the group's saving after the voyages' real costs, and what's expected on work in hand — on the dashboard and the Supply tab, with every consignment's manifest, ship, ETA, charges, the units waiting on it and its log.
- **Fleet Command** shows a reserved or laden ship's consignment; its voyage log marks an empty leg as "empty, to collect SJn".

### Tests
- `tests/aerospace_shipping.test.mjs` (8): own ships only with a shipping line; a consignment on the real voyage system, never in stores before it lands; the 0–5% charge with materials paid in full; no free money (wallet = goods + voyages + running costs, the charge cancels, capital excluded); delays move ETAs, orders and the units waiting; busy ships aren't taken, holds limit consignments, the carrier fallback at the market rate and the wait policy; save/load mid-voyage, delivered once; cargo lost to pirates.

## [0.55.0] — 2026-10-22 — Starling Flats (development build)

The owner paused the casino for "more important content" — the aerospace master brief (aircraft, defence contracts, rockets, satellites and integrated shipping, against an established, publicly traded competitor) — and: "Remember that each NPC needs their own house too." Asked before building: the campus in a **new region east** of the oil fields, the player **buys a failing firm**, delivered in **staged releases**, and everyone who shares a home gets **their own**. This is stage I of five (docs/AEROSPACE.md).

### Added — Starling Flats (`src/content/maps/starling.js`, region `starling`)
- **The Cut**: the county road runs on from Wellhead Circle through the escarpment to a new region on the high plain.
- **Starling**: eleven houses on Mesa Road (the first five are **Derrick Row**, the Ober's Oil crew's), the Contrail Café, a water tower, a bus shelter with no bus yet.
- **The Aerospace Park**: the freight depot, the security gate, **Roost Aeroworks** (office, Hangar 1 and its apron), **Meridian Aerospace** (HQ tower and share board, final assembly, the flight-line hall with its secure bay, space systems, engine test stand, paint shop, apron), **runway 09/27** with taxiway, hold bars, numbered stands, edge, threshold and approach lights (new tarmac tile and markings), flight operations, the control tower and radar, windsocks, **the launch complex** (vertical integration building, Meridian's pad with its service tower and flame trench, the propellant farm, pad 2 for you, launch control, the ground station), and the boneyard.
- New art (`src/engine/drawAero.js`): a top-down aircraft painter for every class (private, airliner, fighter, bomber, flying wing, futuristic) with liveries, primer, wrecks and every stage of a build; rockets standing or on cradles; satellites with panels stowed or out; windsocks streaming in the wind, a turning radar, beacons, runway lights at night, a gantry crane; and **assembly bays that draw whatever is being built in them**, stage by stage, straight from the simulation.

### Added — the people (`src/content/characters/aerospace.js`)
Billie Roost (founder of Roost Aeroworks, selling up), Dr. Imogen Hale (Meridian's chief executive), Ailie Ronn (test pilot), Rudy Durr (head of production), Tina Minus (launch director), Wrenna Torq (Roost's chief mechanic) — each with a house, a schedule, dialogue, opinions; theme tunes for Billie and Dr. Hale.

### Added — the aerospace industry, stage I (`src/aero/`, `src/systems/aerospace.js`, `src/content/aerospace.js`)
- **A catalogue** of 39 products: private aircraft, airliners, fighters and bombers (fictional defence products), six launch vehicles, two fictional strategic missile products, thirteen satellites — each with price, work days, bay, materials, research, quality, and (aircraft) a full flight spec for the future flyable-aircraft update.
- **Tenders and sealed bids**: customers post tenders from finite budgets; Meridian and you bid; the customer ranks by its own priorities. **No aircraft contract is ever for more than five aircraft** — enforced when tenders are made, when bids are placed and when contracts are signed.
- **Production pipelines** for aircraft (13 stages), launch vehicles (15), strategic products (9; a secure convoy, never the pad) and satellites (15), each unit persistent and tied to its contract: bays taken only when materials are in hand, materials reserved and consumed stage by stage, inspections rolled once and kept (rework when they fail), the apron, the pad, launches, commissioning, the satellite registry.
- **Materials and suppliers**: twenty materials, eleven suppliers with finite stock (Ober's Oil sells the fuel, propellant and chemicals), landed cost (goods, duty, freight by an independent carrier over the real sea lanes, handling, the truck up the Cut), delivery before use.
- **Books** for each company: revenue on delivery, deposits deferred, materials as stock until used, wages, upkeep, overhead, research, rework, launches, penalties.
- **Meridian Aerospace Corporation**, established and operating: its order book already on the floor, bidding, buying, building, launching, researching and hiring by the same rules as you. **MRDN** joins OBRO and CHZ on the exchange (the tablet's Stocks app): a price that follows its books and order book, a broker's fee, at most 5% for one investor, a dividend on Moondays.
- **Roost Aeroworks** for sale from Billie (85,000 obols): a light bay, thirty workers, an apron, two Skylarks on order. **The aerospace terminal** (Roost office, the tablet's Aerospace app): dashboard, tender board and bids, contracts, production, supply (with every supplier's landed cost), facilities (workforce, bays, test cell, inspection, a pad, research), the books, Meridian.

### Changed — a home of one's own
- The Ober's Oil crew (Gideon, Ruby, Hank, Pip, Otto) move out of the bunkhouse into their own houses on **Derrick Row** in Starling; the bunkhouse is now the **crew mess** (they still eat and play cards there).
- Moneybucks Manor's staff (Crisp, Agnes, Silas, Mabel) move from beds along the manor's back corridor into flats of their own in **the Estate Cottages** by the county road; the corridor is the servants' hall.
- The Sums of Anarchy's crew no longer bunk two to a shack: Percy, Dee Nominator and Max have shacks of their own.
- Vera and Brock of the Phonograph Grand move from the staff bunk room into flats of their own at **the Ledgerline Residences**; the bunk room is the staff lounge.
- (The Sumps camp stays a camp, as agreed.)

### Tests
- `aerospace.test.mjs` (14): Meridian on a new game; the five-aircraft rule everywhere (and no back door); every product's pipeline uses its whole bill of materials once; margins; buying the firm once and never free on an old save; materials before work, no double use; Billie's Skylarks built, parked, collected and paid once each, as persistent aircraft; save/load mid-production (rolls and the aerospace random stream kept); the rival within capacity, buying what it uses; bids ranked by priorities; MRDN trading and a price that follows fair value; satellites only operational after launch and commissioning, and decommissioned at end of life; everyone's own home; the Park, runway and launch complex.

## [0.54.0] — 2026-10-22 — Sleight of Hand (development build)

The owner: "I want him to feel a lot more magical in his card dealing and much more animated and larger. It should really feel like you are at a table with him. Also improve the roguelike to have special bonus cards and magical cards for the player."

### Changed
- **Morganius at the table** (`src/engine/drawMorganius.js`): a new, big Morganius sits across the felt from you in every table scene — nearly half the screen tall, drawn in the game's own pixels from the owner's photo (the tall charcoal hat with silver embroidery and its tip bent over, the high rune-trimmed collar, the gold amulet with its purple gem). He breathes and floats; blinks; follows what's happening with his eyes (the ball, the card he's dealing, the cards you're choosing, the card that's scoring); raises his brows; tilts his head; talks when he speaks; grins when you win and smirks when you lose. His arms are jointed — elbows solved every frame — and his hands go where his pose wants them: weaving over the felt, flicking each card to its place, holding a cascade of cards between his hands, raised to conjure with magic circles at his palms, flung wide in triumph, up for a big win, a shrug, a finger pointing as the hole card turns.
- **Magical dealing:** every card leaves his fingertips with a flick of his wrist and flies on an arc, spinning, glowing, trailing sparks, and lands in a burst of light (blackjack, and every card of the Spade's Gambit — your hand, your plays). New cards conjured by a spell appear in the air between his hands. A shuffle is a cascade arching from hand to hand. Sparks (`Sparks` in `src/engine/cardMagic.js`) are drawn additively and cleaned up as they fade.
- The Spade's Gambit's targets rise to 520 / 2100 / 4200 for the new magic (balance below).

### Added — the Spade's Gambit's magic (`src/casino/rogue.js`)
- **Marvel cards** that join your deck: **the Phantom** (wild — any rank, any suit; it becomes whatever makes your hand best, and the preview says what), **Crowned** (×1.5 Gasps), **Golden** (+10 Pips and +3 Sparks), **the Lucky Seven** (×3 Gasps when charged — it glows — then it rests until it scores again), **Mirrored** (the scoring card before it scores again) and **the Hourglass** (+1 Redraw when it comes into your hand). Each has its own look on the table.
- **Spells** — Morganius's grimoire, two at a time, cast mid-Trick on the cards you've chosen, for no Play (Q and W): Transmutation, Ascension, Doppelgänger, Vanishing Act, Gilding, Curtain Call, Sleight of Hand, Dress Rehearsal, Conjuring and Midas Touch. Every Gambit starts with one. Casting is a show: he raises his hands, circles open under the cards it touches, changed cards turn over to show their new faces, vanished ones go up in sparks.
- **Morganius's Gift:** win a Trick and he offers three magical cards — a Marvel, a Spell, and a Spell or Sparks — one free, before his Cabinet.
- The Cabinet sells a Spell and a Marvel card too.
- The scoring order gains the Marvels (after a card's Ink, before the card Curios); a Mirrored card's echo scores right after it.

### Balance
- With a greedy bot that takes Marvels, casts the simple spells and redraws when behind (400 runs): Act 1 cleared about half the time, Act 2 about 14%, all three about 1.5%; about 24 chips back per 25 staked.

### Tests
- The Phantom (trips, a straight flush), every Marvel, every Spell (and its card count), the Gift (and a full spellbook), the starting spell; the big Morganius's poses, elbows, the dealing flick and its return, his size at the table.

## [0.53.1] — 2026-10-19 — Legible Again (development build)

### Fixed
- **Dark grey, unreadable text in menus** (owner's report). A panel that dresses itself in its own look — Fender's Pre-Loved Motors is printed on "paper", with dark ink — left that look on the menu window after it closed, so every panel opened afterwards (the cage, the logbook, anything with plain text) showed dark grey text on the navy background. The window is now cleared before each panel is drawn (`UI.renderPanel`). The full-screen scenes (Fleet Command, the casino tables) could leak their layout the same way; fixed by the same change.
- The car showrooms' titles were gold on cream paper; now dark (Fender's brick red, Beaumont's navy). Fender's striped banner has an outline behind its white letters.
- "unexplored" on the world map and in a town map was cream at half strength on the dark; now full strength with a dark outline.
- The cage's gains and losses use the navy palette's green and red.

### Tests
- `npm run smoke` checks that a panel opened after Fender's lot has light text (it reads dark grey without the fix). A contrast scan of every panel and tablet app (WCAG ratio < 3.2 flagged) found nothing else.

## [0.53.0] — 2026-10-19 — The Spade's Gambit (development build)

The casino expansion, part 2 of 4: Morganius's own table, a poker roguelike of his invention. (Owner: "Do the poker roguelike first" — it comes before Texas Hold'em.)

### Added
- **The Spade's Gambit** at Morganius's table on the casino floor (`src/casino/rogue.js`, pure rules): buy in for 25 chips and play poker hands from your own 52-card deck — pairs, trips and quads count with fewer than five cards; straights and flushes need five. A hand scores **Pips × Gasps**. Three Acts of three Tricks (the Opener, the Feature, the Finale), each with a target to reach in four Plays, with three Redraws to change cards. Clear Acts to be paid back: 30, 75, or 200 chips for all three.
- **A fixed scoring order**, told step by step at the table: the hand's base (plus Rehearsals), then each scoring card in the order played (its pips, its Ink, the card Curios), then the cards still in your hand, then the hand Curios in the order you hold them, then the Twist.
- **17 Curios** (five at most; their order matters): the Velvet Glove, the Marked Deck, the Fortune-Teller's Card, the Thirteenth Spade, the Stagehand's Lantern, the Smoke Bomb, the Black Cat, the Dove in the Sleeve, the Sawn Lady, the Applause Machine, the Rabbit in the Hat, the Mirror Box, the Disappearing Coin, Encore!, the Escapologist's Chains, the Bottomless Top Hat and the Crystal Ball.
- **Six Inks** for cards: Gilt, Violet, Twin, Ghost, Steel and Ember (which burns away).
- **Five Twists** for the Finales: the Looking-Glass, Tight Sleeves, the Fog, the Echo and the Gilded Cage.
- **Morganius's Cabinet** between Tricks: three Curios, two Inks and a Rehearsal for Sparks; new stock (dearer each time); one Vanishing a visit; part with a Curio.
- **The scene** (`src/ui/spadeTable.js`): your hand fanned in front of you, cards flying out of Morganius's hand as they're dealt and sliding to the felt when played, each scoring step popping with its Pips or Gasps, Curios lighting up as they work, the running Pips × Gasps, the total bursting in cards, Embers burning away, the Applause meter climbing. Keys: 1–9 choose, Enter play, R redraw, S sort, Space hurries the show.
- **Books:** the buy-in is debited once and the payout credited once (by the Gambit's id). A Gambit runs on: leave the table, save, load, come back — it's just as you left it (no chips needed to sit down again). The run draws from its own seeded stream stored in the run.

### Changed
- Morganius's table is open ("NOT YET. SOON." is gone), and he'll explain it. The stage's floor circle no longer hides the table's prompt.
- The first-person table scenes share their room and host drawing (`drawRoom`, `drawHost` in `src/ui/casino.js`).

### Balance
- Measured with a greedy bot that always plays the best hand available and redraws when it won't keep pace (400 runs): Act 1 cleared about half the time, Act 2 about 15%, all three about 1%; about 23 chips back for every 25 staked. Targets 480 / 1800 / 3300 (×1, ×1.5, ×2 through each Act).

## [0.52.0] — 2026-10-19 — The Phonograph Grand (development build)

The casino expansion, part 1 of 4: the resort, its people, chips, roulette and blackjack. (Owner's brief: "THE OBERVERSE — MAJOR CASINO EXPANSION"; the resort stands where the Lucky Star bar was, by the owner's choice.)

### Added
- **The Phonograph Grand** (`src/content/casino.js`): a 42-storey tower on Market Street, Halvermouth — a black-and-gold marquee canopy of chasing bulbs over the door, the name lit in gold, a marquee pylon and a valet stand, a private forecourt behind. Inside: the **Grand Lobby** (marble, a red carpet to the grand staircase, reception, the **Lucky Star Lounge** — the old bar, kept), the **Casino Floor** up the stairs (two roulette and three blackjack tables, two Hold'em tables being dressed, Morganius's stage, the cashier's cage, the Spade Bar, slot machines, a security office), **staff quarters** (3), **Morganius's rooms** (41) and **Octavius's penthouse** (42). The lift won't stop at a private floor without its owner's leave; residents use their own lift doors.
- **Morganius Spade** (imported from the owner's photo): a floating wizard who hosts the tables — he glides and bobs a hand off the floor with cards circling his fingers, roams the floor between his favourite places, and when you sit at a table he flies to it along a curve (the full show the first time, shorter after; E skips). His **Wrath** is a storm of cards and a giant Ace of Spades; his car **The Last Trick** (a black glass coach that sheds cards); his weapon **The Dead Man's Hand**. Motif "Sleight of Hand".
- **Octavius Thomas Phonograph** (imported; a clearly marked stand-in look until the owner's picture arrives): the owner, as rich as Sir Moneybucks (which is richer is never settled), always on his phone, a word or two at a time. He works the cage 16:00–20:00. **Wrath:** his security and his eleven lawyers; car **Long Distance** (a gold-trimmed limousine with a gramophone horn on the roof); weapon **Please Hold**. Motif "Please Hold".
- **Vera Lusk** (the cage) and **Brock Hadley** (security), living in the staff quarters.
- **Chips and the cage:** one obol buys one chip and one chip buys one obol, no fee (minimum 5). Every exchange, bet and payout is a ledger entry; a bet only takes chips you have; a round is paid exactly once; you can't cash out while seated; leaving a table returns an unspun layout and stands a hand in play.
- **Roulette** (European single zero; straight 35:1, red/black, odd/even, high/low 1:1, dozens and columns 2:1) and **blackjack** (six decks, dealer stands on all 17s, 3:2, double, split once) as pure rules in `src/casino/`.
- **The tables as a first-person scene** (`src/ui/casino.js`): you sit at the felt, the table runs away from you in perspective to Morganius floating on the far side, big and in pixels, his cards about him. Click the layout to bet (right-click to take it back), spin, and watch the ball run, slow and drop into the pocket the wheel drew; deal, hit, stand, double, split — the cards fly from his hand. He reacts to every result with a different trick and a line. Keyboard, mouse and touch.
- **Card magic** (`src/engine/cardMagic.js`): one set of effects — orbit, fan, spiral, run along a path, scatter and reassemble, trail, a magic circle — used in the world, the scenes and the Wrath; the host's animation states are lists of them.
- New art: roulette, blackjack, poker and spade tables, the cage, slot machines, velvet ropes, marble pillars, the stage's magic circle, floating cards, a crystal ball, candelabra, a grand piano, a phone dock, a monitor wall, a luggage cart; walls in black lacquer and burgundy damask ("grand") and in midnight and silver stars ("arcane"); a wizard's hat, a robe and an amulet for people.
- Sounds: cards, chips, the wheel, magic, a win.

### Changed
- The Lucky Star building on Market Street is now the Phonograph Grand (its footprint extended north over the alley; the market stalls moved along). Older saves keep working (the town's growth is unchanged); the two new signature cars appear in older saves.
- Sir Moneybucks has opinions about Octavius and Morganius.

## [0.51.0] — 2026-10-18 — Night Falls (development build)

The art overhaul, phase 6 of 6: light, and the finishing touches. (Owner: "bright by day, moody at night".)

### Changed
- **Pixel-art light:** each pool of light is a sprite made once per size, its opacity falling off from the middle and stepped into a few levels with an ordered dither — crisp at the edges, no smooth gradients and no hard rings — and stamped where the light is, so the dither travels with it instead of crawling as the camera moves (`lightSprite`). The warm glows (lamps, fires, gunfire, a cruiser's red and blue) are drawn the same way. The darkness itself is a flat deep blue, not dithered.
- **One night for the whole scene:** with the rooms laid into the streets, a room you're standing in is lit and darkened as part of the street around it (the street outside no longer turns bright when you step indoors at night).
- **Lit rooms glow:** an open or occupied building lights its whole floor, the light spilling a little past its walls, and a warm spill falls out of its front onto the pavement.

### Added
- **Shop fronts** for the walk-in buildings (`drawShopFront`): the sign on its plate above the door (in crisp text) and the striped, scalloped awning where a building has one, throwing a shadow on the pavement.

### Performance
- Light at night costs about 1.3 ms a frame (measured in a headless browser; it was 4.5 ms with a per-frame dither pass, which this replaced).

## [0.50.0] — 2026-10-18 — Faces in the Crowd (development build)

The art overhaul, phase 5 of 6: people and cars.

### Changed
- **People** (`src/engine/drawPeople.js`): figures like the mock-ups' — a big head with a face (eyes with a white and a glint, brows that knit when angry, ears, a nose, a mouth, a blush), hair with three tones and a shine (short, parted, messy, curly, long, ponytail, bun), shaded hats (bowler, top hat, cap, captain's cap, hard hat), clothes shaded as cloth (lit left, shadowed right, a placket, a buckle), shoes with a toe-cap; a standing pose and a four-frame walk (arms swing, the body rises as the legs pass). Glasses and moustaches (in the content all along) are drawn at last. Height is drawn as a pixel or two of leg instead of scaling the figure (scaling blurred it). Each look, facing and frame is painted once into a body and a head sprite with a traced outline (and a white one for the hit flash); what they hold is drawn between the two.
- **Cars and the bus** (`src/engine/carSprites.js`): drawn pixel by pixel at their heading (64 headings) from a description in the car's own coordinates — a rounded, bevelled body, a raised cabin with the windscreen, rear and side glass and pillars, bumpers, head and tail lamps (lit at night, red when braking), mirrors, tyres, a pickup's ribbed bed, a coupé's stripes, a police car's dark doors and light bar (flashing in a chase), the bus's windows down both sides — and lit from the world's top left whichever way they point, with the glass glinting along the world's diagonal and a sheen across the paint. No more 2-pixel blocks turned at an angle (the "grainy" cars). The signature cars and the tractors keep their own art.

## [0.49.0] — 2026-10-18 — Things in Their Places (development build)

The art overhaul, phase 4 of 6: the props.

### Added
- **Prop sprites** (`src/engine/propSprites.js`): 50 kinds of prop redrawn at one world pixel to a pixel, shaded as solid things lit from the top left (shaded balls, cylinders and boxes from a small kit), each painted once into a sprite and copied from then on. The outline is traced round the finished silhouette automatically, and the shadow is the same silhouette, flat and dark, moved down and to the right; the renderer draws the shadows on the ground before anyone stands on them, fading at night. Variants by where a prop stands (no rows of clones): three kinds of tree (deep green, fresh, and golden birches like the mock-up's woods), chairs in three woods, cups, plates or candles on the tables, a lamp or a phone on the desks, books of every colour.
- Outdoors: trees, pines, bushes, boulders (mossy now and then), park benches, green iron lamp posts (lit at night), hydrants, pillar boxes, bins with bags, dumpsters, bollards, crates, barrels (wood or blue steel), traffic lights (pole and heads as a sprite; the lamps and the walk/wait box live), bus stops, noticeboards, signs, flagpoles (the flag waves live), barrel fires (live flames), tents, washing lines (the washing stirs live), the fountain (live ripples), the founder's statue, the gatehouse posts, pipes, vents, hay bales, troughs, Lariat's silo, water tower and windmill (the wheel turns live). Words on props (the bus number, LARIAT, a statue's plaque) are drawn live, so they stay crisp.
- **Fences join up:** picket fences, chain-link (razor wire on the prison's) and ranch rails look at their neighbours and run along them, turning corners.
- Indoors: chairs, tables, desks, counters (with a till), workbenches (with a vice and tools), lecterns, filing cabinets, wardrobes, bookshelves, shop displays, stoves and ovens (glowing at night), beds, camp beds, rugs, potted plants, flowerbeds, paintings (a landscape, a portrait or a ship), windows with curtains, chests, cell bars.

### Changed
- Puddles in the mud are rounded with the sky in them; boulders in the water are round, lit and ringed with foam.

## [0.48.0] — 2026-10-18 — Ground Truth (development build)

The art overhaul, phase 3 of 6 (the owner's mock-ups: "the game should feel smooth and highly detailed with pixels … do not sacrifice the game's details for quick delivery"): the ground and the walls.

### Changed
- **The ground is painted pixel by pixel** (`src/engine/drawPixelGround.js`, rewritten): every pixel is coloured from what lies under it through two tileable noise textures, in clean shades (no speckle): grass in big darker and lighter patches, dirt, sand rippled by the wind, mud, rocky banks, asphalt, grimy pavement. Where soft ground meets soft ground — grass and a path, sand and the sea, a bank and a pond — the edge is ragged, not the tile grid.
- **Water by its shore:** a distance field from the shore gives a beach white surf and turquoise shallows that deepen to the sea's blue (by the distance to the sand alone, so they curve round a headland), a pond a dark bank, a quay a stone lip; sand is damp where the sea reaches it. A river or a beach runs on across the seam between two parts of town (each map looks into its neighbours, and the noise is sampled where the map sits in the world).
- **Detail over it:** grass tufts, daisies and clover; pebbles, shells and litter; cracked asphalt with weeds in the cracks, repaired patches, oil, grit, manholes and storm drains, white edge lines and the yellow centre line; brick pavers in a running bond; kerbs with a lip, a face and a gutter's shadow; planked piers with grain and nails; boulders in the surf.
- **Thick walls**, made of what the building is (`WALLS`): brick (the café, diners, the gun shop, workshops), plank (shacks, barns, warehouses), plaster in cream or plum (houses, the hotel, the cinema), stone (the civic buildings, the police), navy (offices) and grey with teal trim (shops). A wall is a cap seen from above, outlined and lit, with a groove along it and pillars at the corners and every few tiles; where the floor or the street lies below it you see its face — brick courses, planks, wallpaper or wainscot inside, the front of the building outside, with a window every third tile and narrow windows down the side walls. Buildings cast a shadow on the street.
- **Floors:** big square tiles with grout and a bevel (cream, teal checker, olive, cool grey), planks with grain and staggered ends, woven carpet (plum, red, navy, green), concrete with joints and stains — each place its own, worn as it would be (filthy in a workshop or gun shop, spotless in the café). The walls shade the floor beside them.
- **The ground is built in chunks** of 8×8 tiles as you come to them (a few milliseconds each, one every other frame for the ring just outside the view; up to 160 kept), instead of one canvas per map — the grown towns would have needed over 100 MB for Halvermouth alone.

### Removed
- The old smooth ground (`buildStaticLayer` and its tile, edge and wall drawing).

## [0.47.0] — 2026-10-18 — Open Doors (development build)

Owner, with five mock-ups drawn in the style of Streets of Rogue: "I want the game to fundamentally look like these mock up images I drew. The game should feel smooth and highly detailed with pixels … Do not sacrifice the game's details for quick delivery." Asked how buildings should work: "Seamless, like SoR"; the old look: "drop it"; zoom: "medium" (about 24 tiles across); mood: "bright by day, moody at night". This release is the groundwork — the art passes follow.

### Added
- **Seamless buildings:** every building's interior is laid over its footprint in the world (`src/world/interiors.js`). The room stays its own map (shops, homes, the works, quests and schedules all keep working) but joins its street's region at the building's position, and the front door is a walk-through crossing: you walk in and out with no scene change, and from the street you see straight in — furniture, people and all. Locked doors still stop you from the street (and say so); from inside you can always leave. Cars stop at the door.
- **A room for every building:** buildings that never had an interior get one, the size of the building and furnished for what the place is — shop, office, diner, hotel, school, chapel, cinema, barn, storage, house or shack (`generatedInterior`). Houses and shacks may hold beds; the rest don't.

### Changed
- **The towns grew to fit their buildings** (`src/world/grow.js`): whole columns and rows are copied inside buildings — never through a road or a door — until each building is exactly the size of its room. Everything placed on the streets (spots, props, doors, quests, plots, fields, berths, schedules) moves with them; a farm field keeps its size. Lanternside is now 87×62, Westbrook 53×62, Ober Fields 62×54, Halvermouth 200×127, the Yards 112×111 and Lariat 179×125. A lamp or sign that ended up on a doorstep moves a step aside.
- **One look, one zoom:** the pixel style is the only style (the settings toggle is gone), at one medium zoom indoors and out.
- **People walk a little brisker** (66 → 88 px/s) to cover the bigger towns, and everyone you can see — on your map or in a building or street next to it — walks on screen rather than jumping between places. A long frame no longer slows them down (a step carries on round corners), and nobody walks frame by frame while you sleep.

### Saves
- Saves from before 0.47.0 load with you, the residents, the cars and any forced door moved to the same place in the grown streets; the buses start afresh.

## [0.46.0] — 2026-10-17 — Fine pixels (development build)

Owner: "the movement feels a little laggy and the lighting seems to be flashing subtly … it just feels very shaky. the characters and player cars feel too grainy. also there a weird wall that does not let the player drive past kettles and crumbs … Characters feel too big compared to the size of buildings. pixelation is fine but it needs to be fine pixelation with crisp clean details. Apply that logic to the map."

### Fixed
- **The invisible wall by the Kettle & Crumb:** driving west along Canal Row you hit Lanternside's edge and stopped — the car's nose poked past the seam before its centre reached it, and off the map counted as a wall. Off the map past a seam is now open road, and you drive on into Westbrook (`vehicles.inWalls`). The same applied at every seam.
- **Shaky movement:** the world was drawn on a grid of big art pixels and the camera jumped a whole one at a time. Now the low-resolution picture has one pixel per world pixel (half the old size), and the finished picture is slid by the camera's leftover fraction, so scrolling is smooth while every pixel stays crisp. The camera also follows a little tighter.
- **Flickering light:** the night light map is drawn on the same pixel grid as the world and slid with it, so its pools no longer swim against the ground; the hard light bands only appear once it's properly dark (in daylight indoors they showed as faint rings that moved).

### Changed
- **Finer pixels everywhere:** people are drawn at one world pixel per art pixel — about a tile tall, in proportion with doors and buildings (they were 1.6 tiles); held weapons to match; name tags and bubbles sit lower. The ground is built at world resolution with fine one-pixel detail — grass blades, grit, hairline slab seams with a bevel, cracks, grout, plank lines, carpet weave. Props and buildings get one-pixel outlines and hairline highlights. The signature cars are pixelised at world resolution, so their details (chalk proofs, gauges) read clearly.

## [0.45.0] — 2026-10-17 — Arsenal of the Absurd (development build)

Owner: "improve the models for guns and also add special unique weapons (as absurd and wild as you want) in some of the homes to be stolen … add a special weapon for each imported character and make sure their cars are also in this new format."

### Added
- **A pixel-art model for every weapon** (`src/engine/drawPixelWeapons.js`): revolver (cylinder, wooden grip), pistol (slide), pump shotgun, scoped hunting rifle, SMG, assault rifle (carry handle, curved magazine), sniper rifle (bipod), LMG (box magazine), RPG, crowbar, knuckles, baton, bat, machete, fire axe — outlined, shaded, held in a hand and pointed at the aim; anything else is held up, ready. The hotbar shows the same sprites, scaled up crisp. Items carry a `weapon.look`.
- **Thirteen one-of-a-kind weapons** (`src/content/specialWeapons.js`), each kept in somebody's home (take it and it's burglary), with a supply of their own ammunition (no shop sells it):
  - Grandma Pell's **Rolling Pin** (Mags) — sends people flying, kills nobody.
  - The **Pigeon Launcher** (Tibbs) — fires furious pigeons; whoever's hit forgets you and runs.
  - The **Confetti Cannon** (Delphine) — eight wads of confetti that knock people down.
  - The **Golden Plunger** (Sgt. Case) — grabs them, pulls them in, stuns them.
  - The **Mackerel Mk II** (Julian Beaumont) — frozen fish at alarming speed.
  - **The Resonator** (Sal) — a giant tuning fork; one tap and they stand humming for three seconds.
- **A signature weapon for every imported character**, kept at home:
  - **The Golden Handshake** (Sir Moneybucks, in his vault) — a gold revolver that fires sovereigns; every hit puts 2 obols in your pocket.
  - **The Plumb Line** (Mason, his toolbox) — an automatic nail gun; every nail pins them, level.
  - **The Gavel of Final Judgement** (Chief Order) — a 170° swing that stuns everyone in it; nobody dies (the Chief hates paperwork).
  - **The Pythagorean** (Arthur) — three barrels firing at 0° and ±36.87°. "It is not a spread. It is a proof."
  - **The Tinfoil Ray** (Lucas) — a green beam straight through everyone in a line.
  - **The Old Harpoon** (Captain Ober, his sea chest) — harpoons them and reels them in, stunned.
  - **The Cheddar Blaster** (Farmer Chuckie, his cheese safe) — cheese wheels that hit like bowling balls.
- **New weapon mechanics** (`src/systems/combat.js`): fixed-angle fans, piercing beams, stuns (stars circle their heads), pulling (negative knockback), sending them running, paying out per hit; bigger knockbacks travel step by step and stop at walls. Each one's ammunition flies as itself — pigeons flapping, fish, spinning cheese, coins, nails, chalk, a green ray, a harpoon on its line, confetti — and coins and confetti scatter on the ground.
- **The signature cars in pixel art:** each is drawn at art resolution with everything it animates (fountains, mixer drums, light bars, chalk), then given hard edges, a short palette, a one-pixel outline and a hard shadow, like the other cars.

## [0.44.0] — 2026-10-17 — Gun play, Streets of Rogue style (development build)

Owner: "Can you improve the gun play and combat to also feel like streets of rogue 2".

### Added
- **Bullets you can see** (`combat.bullets`): every shot is a hot slug with a short streak that flies from the muzzle to whatever it hits. Your hits still land at once (aiming is unchanged); the bullet is the picture of it.
- **NPCs' bullets really fly** (620 px/s) and hit whatever they meet: a wall stops them in a spray of sparks, and if you keep moving you can dodge them. Stand still in the open and they'll find you. (This replaces the old coin-toss hit chance.)
- **Feel:** the camera kicks with every shot (harder for shotguns and rifles), with every solid blow and when you're hurt; you rock back when you fire and step into a swing; a blow that lands freezes the world for a blink (hit-stop).
- **Blood and brass:** droplets fly from whoever is hit and spatter the ground; the dead leave a spreading pool; spent cases flick out of the gun, bounce and lie where they fall. All of it fades after a few minutes.
- **Guns point where you aim:** in the pixel look a pistol or long gun is held out from the chest toward the crosshair (or, for an NPC, toward you).
- **A chunky pixel crosshair** replaces the mouse pointer while you hold a gun; it opens up as you fire and turns gold while you reload. The old dashed aiming line is gone in the pixel look.
- **Hit flashes:** anyone hit goes white for a blink. Muzzle flashes are blocky four-point stars and light up the street at night; melee swings are a fat white smear.

## [0.43.0] — 2026-10-17 — Pixels: art revamp, stage 5 — light and menus (development build)

Owner: "Stage 5 please". The last stage of the revamp: lighting and the menus.

### Changed
- **Night lighting in pixel art** (`renderer.drawLighting`): the light map is drawn at art resolution and scaled up crisp, and every pool of light — street lamps, barrel fires, lit windows, headlights, the lighthouse, police lights — falls off in three hard bands instead of a smooth blur, the Streets of Rogue way. The warm glows are banded to match.
- **Menus, panels and dialogue** (`styles.css`, `body.pixel-ui`): the mock-up's navy panels with a chunky blue frame and a hard drop shadow, gold headings, square buttons with a pressed edge (red for the main action), dark item rows, stats, quest cards, tags and fields; the dialogue box and its portrait frame; the title screen's logo in heavy white and gold with a dark outline. Everything readable, nothing pixelated.
- Letters and documents stay on paper; the gun-running terminals, Fleet Command and the car showrooms keep their own looks, as the owner asked.
- The time-and-obols chip widens for a big fortune instead of cutting it off.
- Settings → Pixel-art look off restores the old lighting and the cream menus too.

## [0.42.0] — 2026-10-17 — Pixels: closer to the mock-up (development build)

Owner: "It still doesn't really look like the screen shots you provided." Compared side by side with `docs/mockups/mock-street.png`, the biggest gaps were the people, the camera, the HUD and empty buildings. This release closes them.

### Added
- **Pixel-art people** (`src/engine/drawPixelCharacters.js`): chibi figures like the mock-up — a big outlined head, a small body — built from each character's existing appearance (skin, every hair style, hats from caps to top hats and hard hats, outfit, pinstripes and checks, ties, scarves, vests, aprons, overalls, beards, shades, monocles, goggles, the angry flush and steam), walking, side-on and from behind, asleep. Held weapons still show. Portraits keep their painted look.
- **People inside the roofless buildings:** whoever is in a building's interior is drawn in the cutaway where they stand in the real room — Mags behind the Kettle & Crumb's counter, customers at the tables.
- **The hotbar** (`src/ui/hotbar.js`), bottom left: fists and every weapon you own, each with a pixel-art icon (fists, knuckles, clubs, blades, axes, revolvers and pistols, shotguns, rifles, submachine guns), the ammo you carry for a gun, the one in your hand outlined in gold. Keys 1–9 (as before) or a click ready a slot.

### Changed
- **The camera** shows more of the street in the pixel look (about 26 tiles across, as in the mock-up); the old look keeps its zoom.
- **The HUD:** a big health bar reading "Health 100 / 100" with a thin energy bar under it; captions and notifications are dark navy panels with a coloured edge instead of cream cards.
- **Wooden floors** are long planks in slightly varied shades (they read as brick before).
- **Street lamps** cast the mock-up's long diagonal shadow by day.

## [0.41.0] — 2026-10-17 — Pixels: art revamp, stage 4 — towers (development build)

Owner: "stage 4 this baby". Stage 4 of 5: tower floors and lifts.

### Added
- **Towers are roofless too:** on the street a skyscraper is its lobby — a room you see into, with lift doors in the back wall (`src/engine/drawPixelBuildings.js`). The tall painted towers return with Settings → Pixel-art look off.
- **Lifts** (`src/content/towers.js`, `Game.liftPanel` / `rideLift`): a new `lift` prop — brushed-steel doors, a brass dial — that offers every other floor of its tower. Each floor is its own map.
- **Floors high up** (`aloft`): drawn over the city far below — the street's own ground, small and hazy, sliding with the camera — with glass walls, or on a roof a low parapet and the drop beyond it. Darker below at night.
- **Vantage Point is open to the public** (08:00–20:00): a marble-tiled lobby with reception and two lifts; **floor 12** (offices to let); **floor 23, the Sky Lounge** (bar, tables, a coin telescope); **the roof** with its helipad.
- **The Atlas Rooms and the Harbourline Apartments** get a lift from their stairwells to the roof (a washing line and a deckchair; a bench facing the bay) — for residents and their guests.
- The content checker knows the `lift` interaction.

### Not changed
- Ober's Oil Tower and the other office towers are still closed ("Appointments only").

## [0.40.0] — 2026-10-17 — Pixels: art revamp, stage 3 (development build)

Owner: "go ahead with further stages". Stage 3 of 5: roofless buildings.

### Added
- **Roofless buildings** (`src/engine/drawPixelBuildings.js`): in the pixel look every ordinary building is drawn the Streets of Rogue way — no roof, thin walls with a top edge, a short front face with its windows, door, awning, pilasters and sign — and you see straight in.
- **A cutaway of the real interior:** the floor the interior map is laid with (wood, tile, carpet or concrete) and its furniture, placed in proportion inside the walls (biggest pieces first; nothing overlaps or pokes through a wall). The interiors are larger than the footprints, so this is a scaled plan of the room, not the room itself; you still go in through the door as before.
- Buildings with no interior get a room that fits what they are: diners and bars (counter, tables and chairs), shops (shelves, a display, the counter), offices, banks, churches and schools (cabinets, desks), warehouses and garages (crates, barrels, a workbench), houses (bed, wardrobe, stove, table) and the Sumps' shacks.
- At night an empty room is dark and an occupied one glows. Standing behind a building no longer hides you behind a roof — only its front face covers you.

### Changed
- Fewer puddles on the Sumps' mud.

### Not changed
- Towers and the lighthouse keep their look until stage 4 (tower floors). Settings → Pixel-art look off brings the roofs back.

## [0.39.0] — 2026-10-17 — Pixels: art revamp, stage 2 (development build)

Owner: "go with stage 2". Stage 2 of 5: the ground, streets, sidewalks, props and interior walls.

### Added
- **Pixel ground** (`src/engine/drawPixelGround.js`): each map's ground is drawn once at art resolution (16 art pixels a tile) and copied 1:1 into the low-resolution pass, so it is perfectly crisp. Grass with blades and the odd flower; grey slab pavements with seams and **kerbs** (a light lip and a dark face) where they meet the road; asphalt with grit, cracks and oil; a yellow dashed **centre line measured down the true middle of every road** (none in the junction boxes); plaza slabs, concrete, dirt, sand, mud with puddles, ploughed fields; planked bridges and piers; water with a stone lip; planked wood, chequered tile and carpet floors; interior back walls with a dado rail and wainscot, side walls seen from above, panelled doors.
- **Pixel props** (`src/engine/drawPixelProps.js`): trees, pines, bushes, flowerbeds, benches, street lamps, rocks, crates, barrels, hydrants, rubbish, dumpsters, beds, cots, wardrobes, shelves, cabinets, tool racks, display cases, desks, tables, counters, workbenches, lecterns, chairs, stoves and ovens, plants, rugs and windows — outlined, with a light top edge and a hard shadow. Everything else keeps its old drawing for now (the gun cabinet, the terminals, the ships and works as the owner asked).
- Both follow Settings → Pixel-art look (off: the old ground and props).

### Next
- Stage 3: roofless buildings. Stage 4: tower floors. Stage 5: lighting and the menus.

## [0.38.0] — 2026-10-17 — Pixels: art revamp, stage 1 (development build)

Owner: "Let's revamp it" — the Streets of Rogue 2–style look from the mock-up (`docs/mockups/`), in stages. Stage 1 of 5.

### Added
- **The pixel pipeline** (`src/engine/renderer.js`): the world pass draws into a low-resolution canvas (one art pixel = 2 world pixels) and is scaled up with no smoothing; the zoom snaps to whole device pixels per art pixel so every pixel is the same size, and the camera to whole art pixels so the picture doesn't shimmer. Lighting, names, speech bubbles, health bars and the Wrath stay full resolution on top.
- **Legible world text:** text the world draws (shop signs, labels, the bus's route number) is recorded during the pixel pass and replayed crisply at full resolution with the same transform and style.
- **New cars** (`src/engine/drawPixelCars.js`): pixel-art cars with chamfered bodies, outlines, lit and shaded flanks, bumpers, head- and tail-lamps (brighter when braking or at night), raked windscreens with a glint, roofs, side and rear glass with pillars, mirrors, door seams and front wheels that turn; styles per model (hatch, estate, pickup with an open bed, saloon, GT, coupé with stripes, limousine, police cruiser with a light bar that flashes on a chase) and a new bus. The signature cars and tractors keep their own art.
- **Settings → Pixel-art look** (on by default).

### Changed
- **The HUD** (`styles.css`): dark navy panels with a chunky blue frame; health and energy (thicker, banded bars) top left with the equipped weapon; the time, place and obols in a small chip by the minimap; the objective tracker and prompts restyled.

### Next
- Stage 2: the ground, streets, sidewalks, props and building walls redrawn as pixel art. Stage 3: roofless buildings. Stage 4: tower floors. Stage 5: lighting and the menus (the ships' and gun-running terminals stay as they are).

## [0.37.0] — 2026-10-16 — The Factory Must Grow (development build)

Owner's brief: improve the gunrunning automation — the player and workers walk through inserters; placeable storage for parts; sorters; "think as much like Factorio as you can". Applies to both kinds of works (arms and calculators), which share `src/systems/factory.js`.

### Added
- **Walk-through logistics:** inserters, sorters and belts don't block movement — for you and for the workers' pathfinding (older saves' inserters are made walkable on load). **Belts carry you** along them (56 px/s), as in Factorio.
- **Storage chests** (`build.type: 'storage'`): **Wooden Chest** (100 items, 12 obols) and **Iron Chest** (300, 40). Inserters and belts put into and take out of them like the fixed dock and cage (respecting their size); E opens one (your container); picking one up returns its contents. Each has a fill gauge.
- **Filter Inserter** (30): an inserter that moves only the item you set with E (choices: every placed machine's inputs and outputs, and whatever the chests and crates hold); with no filter it waits.
- **Belt Sorter** (25): sits in a belt line; an item matching its filter leaves to its right, everything else carries straight on; with no filter it alternates (a splitter). Drawn with a fork and its filter's colour.
- On sale at Sal's Surplus (machinery), which also buys them back.
- Tests: `tests/factorio.test.mjs` (5).

### Changed
- `Game.containerDef(id)`: containers can be content-defined or a chest placed in a works.

## [0.36.0] — 2026-10-16 — Home Sweet Home (development build)

Owner's brief: no beds in stores or shops — every NPC has a home they go to when not working; the player can break into homes and steal (for a later pawnshop); trusted NPCs invite the player in. Owner's decisions: Chief Order gets a house too (changing "never leaves the station" from his interview); the Sumps camp stays a camp.

### Added
- **Homes** (`src/content/homes.js`): a generator for apartment blocks (a stairwell hall with a door per flat) and single homes, applied after the roads are widened, reusing buildings that were facades or doorless: **11 Gullwing Row** (Mags, Tibbs, Delphine), **Harbourline Apartments** (Chief Order and five officers), **The Atlas Rooms** (Lucas, Julian, Sal), four **Sumps shacks** by the Abacus (Arthur; Al & Percy; Minnie & Dee; Tony & Max), **the Tolliver place** in Lariat (Wes), and **Flat 5 at the Plumb Line** (Marty). Each flat: bed, chair, stove, a dresser of valuables, and personal touches (Lucas's red-string wall moved home with him). 22 people moved; their evenings at work (Lucas's red string, Julian's sherry, Marty's takings, the Chief's crossword) moved home too.
- **The Yards Lodging House** (Halver Scrap Co.): 20 beds for your arms works' hired hands, who used to sleep on the factory floor; they now walk to their shifts (existing saves too — their schedules are rebuilt on load).
- **Break-ins** (`src/systems/homes.js`): at a locked home door, E → pick the lock (Lockpick Set, new, 35 obols at Sal's Surplus; ~4 s standing still; quiet — only someone who sees you; 22% chance the pick snaps; open for an hour) or force it with a crowbar (instant, heard 14 tiles away; broken for a day). A resident who comes home to a forced door calls the police (an incident). A resident who catches you inside — awake, or woken — shouts, and it's **burglary** (new crime, severity 3). Dressers belong to their residents: what you take is marked stolen from them (for a pawnshop). Works on every private home, old and new (30 doors).
- **Valuables:** Pocket Watch, Gold Ring, Gold Wristwatch, Silver Spoons (tagged `valuable`, `pawn`).
- **Invitations:** a new "Could I visit you at home some time?" option for anyone with a home: yes at trust ≥ 25 (or affection ≥ 30) — their doors open to you 08:00–22:00 (theirs only, not their neighbours'); saved. Optional per-character lines (`homeInvite: { yes, no }` in a dialogue).
- **Validation:** no bed or cot outside a home (the player's flat, the jail, the Lodging House and properties you build excepted); nobody works in someone's home (estates and farms excepted).
- Tests: `tests/homes.test.mjs` (6); four older tests updated to the new rules (workers commute; the Chief goes home; Mags and Tibbs sleep at home).

### Changed
- Workplace beds removed: the café, Hollow Fixings, the refinery lab, the police station bunks, the Abacus bunks, the gun shop, Sal's, Fender's office, the Hoof & Horn, and the arms works (cots became lockers). The Chief's office couch and Julian's chaise are benches now.
- Works doors let their own staff in for their shifts.

### Saves
- Older saves: everyone re-plans to their new home; new containers and the Lodging House appear; nothing is handed to you.

## [0.35.2] — 2026-10-16 — Fix (development build)

Owner's report: you can drive through buildings from the café to Ober Fields, and can't get out of the car.

### Fixed
- **Driving through buildings:** a car already overlapping anything was allowed to move freely "to work itself loose" — and once inside a building it stayed overlapping, so it could drive straight through every building in its way (and getting out inside one failed). The likely way in by the Kettle & Crumb: traffic on the coast road may ghost through a parked car after waiting 8 seconds, or side-swipe at a junction, leaving the cars overlapping. Now (`src/systems/vehicles.js`): a car in a wall is eased out to the nearest clear spot (`unstick`); overlapping another car only lets you move apart from cars — walls always stop you; and if a car can't be eased out, it may only move in ways that take it further out of the wall. This also covers the police cars that use the same physics.
- Tests: 1 regression test (fails on the old code). Two older tests had only been passing because of the bug — one started a car off the edge of the map, one parked you among Civic Plaza's lamp posts where a police car could only reach you through them; both now start on real roads.

## [0.35.1] — 2026-10-16 — Fixes (development build)

Owner's report: can't get out of cars around the Kettle & Crumb; can't get off the bus.

### Fixed
- **Stuck on the bus:** a bus easing into a stop could creep to within half a pixel of it without "arriving"; the stop then fell off its next-stop list and the bus drove on without stopping, so there was never a chance to get off. Mill Road (the Sumps) and Civic Plaza were skipped on most laps of the No. 1. A bus now arrives once within a pixel (`src/systems/transit.js`). Found by riding the No. 1 in the browser for 129 game minutes without a single stop.
- **Carried round all night:** out of hours a bus ran past every stop even with you (or a passenger) aboard; it now stops while anyone is on it.
- **Stuck in the car:** getting out now also searches all the way round the car, further out, if the usual door spots are blocked; moving traffic beside you no longer counts as a wall (it stops for you); you never step out into a doorway; afloat in the Landlubber, it tells you to make for the bank. A sweep of every drivable spot found real traps at the edges of Halvermouth and the Yards (now fixed). I couldn't reproduce a trap at the Kettle & Crumb itself — see Known Issues.
- Tests: 3 regression tests (both bus fixes fail without them).

## [0.35.0] — 2026-10-15 — "Living World" stage 3 (development build)

The final stage of the world-simulation overhaul (owner: "finish out the entire update"). See docs/WORLD_SIMULATION.md.

### Added
- **Errands** (`src/sim/errands.js`, `ERRANDS` in `src/content/life.js`): a schedule block with `errand: '<kind>'` sends the character to another place of that kind on some days (`errandChance`) — in the same region, open at that hour — deterministically per person, block and day, so it never changes with re-decisions, distance or saves. Kinds `outing` (10 places on the coast and in the city) and `lariat_evening` (5). Quinn, Barnaby, Agnes, Delphine and Opal now vary their evenings.
- **Meet-ups:** `meet: 'npc_x'` on two friends' blocks — on a meet day they choose the same place ("…, with Lorna"). Rosa & Lorna and Dale & Wes.
- **Police incidents** (`src/systems/police.js`): each witness call is a saved incident — reported → responding → investigating → closed. Arriving officers investigate for 20 minutes, question witnesses still at the scene (who tell only what they saw; the officer learns it), may recognise you if you're in plain sight, then close the incident and resume their beats. Incidents close cleanly however the officers' dispatch ends. Open incidents are marked on the world map with status and officers.
- **Validation:** errand places are real spots with labels; blocks name known kinds; meet-ups are two-sided, same kind and chance, and overlap in time.
- Tests: `tests/livingworld3.test.mjs` (4).

### Saves
- Older saves gain an empty incident log.

## [0.34.0] — 2026-10-15 — Signature Cars (development build)

Owner's brief: give each imported character their own unique car, true to their personality and position — "as insane and absurd as you want".

### Added
- **Seven signature cars** (`src/content/signatureCars.js`, drawn by `src/engine/drawSignatureCars.js`), each parked by where its owner works, clear of every bus and traffic lane:
  - **Moneybucks Bullion** (Sir Moneybucks, Moneybucks Estate): a six-wheeled solid-gold limousine with a twinkling chandelier, a champagne fountain and a bubbling hot tub; cash-register horn; sheds gold coins.
  - **Plumb Bob** (Mason Nails, Westbrook): a cement-mixer hot rod — the drum turns, a tower crane's brass plumb bob swings with the motion; reversing-beeper horn; kicks up dust; nearly full speed off-road.
  - **Gavel** (Chief Lawrence Order, by the station): an armoured interceptor with three light bars, a scales-of-justice bull bar and a doughnut spare; the horn slams the giant gavel down (ORDER!). Officers who see it salute instead of chasing it.
  - **Hypotenuse** (Arthur Anderson, by the Abacus): a right-angled triangle on three wheels in chalkboard black, a roof calculator reading out your speed, a protractor spoiler; the horn plays the digits of pi; leaves sums behind it.
  - **Paranoia** (Lucas Eastrise): a tinfoil half-track with scanning satellite dishes, an antenna forest and a periscope turret; theremin horn; the police never notice it, stolen or not.
  - **Landlubber** (Captain Ober, the Yards): a wooden launch on tractor wheels with a figurehead, a sail that fills with speed and a crow's nest; foghorn; **drives on water**, 30% faster at sea.
  - **Big Cheese** (Farmer Chuckie, by the cheese plant): a cheddar wedge on monster wheels with longhorns and a milk-churn exhaust; moo horn (people nearby wonder); full speed across fields; leaves crumbs.
- Each has its own plate, a lore note when you look at it, and a line its owner shouts when they see you in it. Stealing one hits their opinion of you harder; no dealer will buy one.
- Validator: signature cars must belong to an imported character, be parked once on a real map and have a known horn.
- Tests: `tests/signatureCars.test.mjs` (5).

### Saves
- Older saves gain the seven cars once (a car you've since lost isn't put back).

## [0.33.0] — 2026-10-15 — "Living World" stage 2 (development build)

The second stage of the world-simulation overhaul: public transport. See docs/WORLD_SIMULATION.md.

### Added
- **Bus lines** (`content.transit.lines`): the transit system now runs any number of lines, each with its route, stops, fare, buses, dwell and **operating hours** (out of hours a bus runs on without stopping and the stop says when the next one is). The No. 1 is unchanged.
- **The No. 2 Lariat Line** (`LINE_2` in `src/content/transit.js`): Justice Way (Halvermouth) → the North Gate → FM 38 → Main Street, Church Street, Cotton Street, FM 38 at Mesquite Lane → back, turning in the city by Grand Avenue, Tanner Street and Crown Street. Two buses, 3 obols, 06:00–23:00; five new stops. Through the same junction lights and traffic rules as everything else.
- **NPCs ride buses** (`src/sim/npcTransit.js`): a character whose occupation (or LIFE entry) prefers transit and who is going to another region plans a trip — the line and stops that save the most walking — walks to the stop, waits, boards only a bus going the quicker way round, rides aboard (hidden; moving with the bus on or off screen), gets off at their stop and walks on. No bus within two hours: they walk instead. The trip and the seat are saved; a passenger is never duplicated and can't be talked to through the bus wall. Quinn (No. 1, to the Hall of Justice in the afternoons) and Wade (No. 2, an evening in the city) commute this way.
- **Transit on the map:** every line's route is drawn on the world map in its colour; each stop lists its lines, hours and next bus; buses and stops show their line number.
- **Validation:** bus lines need unique ids, a fare, buses, a speed, valid hours and at least two stops; every stop must be on a real map with an unblocked place to wait; transport overrides must be known modes.
- Tests: 6 more in `tests/worldsim.test.mjs`.

### Saves
- Older saves' buses become the No. 1's (keeping their places); the No. 2's buses are added.

## [0.32.0] — 2026-10-15 — "Living World" stage 1 (development build)

The owner's master prompt for a world-simulation overhaul (persistent NPC lives, housing, public transport, police patrols), staged to keep usage in check. Stage 1: the rules, housing and patrols. Stage 2 (planned): the bus network and NPC transit use. See docs/WORLD_SIMULATION.md.

### Audit (what the world already had, and reuses)
Data-driven schedules; two simulation tiers (physical paths on the player's map, abstract timed travel elsewhere) sharing one decision model and the world clock; held intents and conversation pauses that resume; witnessed crimes, calls, dispatch, Wanted and pursuits; the No. 1 bus with player boarding; traffic with junction lights. Missing: any record or rule of where people live; police "patrols" that were hours standing at one spot; NPCs who never ride the bus; a single bus route that doesn't reach Lariat.

### Added
- **The world simulation rules** (`src/content/life.js`): every persistent character has a life configuration — a home (residence and unit), an occupation (transport, interruption and persistence profile), and their schedule — or a documented exception (`LIFE_EXCEPTIONS`: Petty in the cells; the five lead cows in their paddock). 16 occupations, 19 residences, 57 homes.
- **Validation** (`tools/validate-content.mjs`): a character with no home or exception, a home that doesn't exist, a sleep block outside the home, a bed that isn't a spot, an over-full unit, a private unit shared by two households, an unknown occupation or patrol, or a patrol beat that can't be walked end to end are all errors.
- **The Plumb Line Apartments** are a shared hall with four private flats (`plumb_unit_1`–`4`), each furnished for its tenant; Mason's crew sleep in their own.
- **Police beats** (`PATROLS`, `src/world/patrols.js`): nine beats; waypoints snapped to the pavement at load. Officers walk from waypoint to waypoint and stop a while at each, on and off screen (the abstract tier walks them too); a conversation or dispatch pauses the beat and it resumes; the position on the beat is saved. 15 schedule blocks converted from standing at one spot.
- **A patrol cruiser** on the city streets, as a loop in the existing traffic system (`loop.model`, `loop.police`).
- Tests: `tests/worldsim.test.mjs` (5).

### Changed
- `tests/character_mason.test.mjs`: the crew sleep in their flats. `tests/logistics.test.mjs`: the contract test sails until the ship docks (en-route delays).

## [0.31.0] — 2026-10-15 — "Home on the Range" (development build)

The third of the three agricultural releases chosen in interview: livestock, the agricultural market and farm management. See docs/FARMING.md.

### Added
- **Pastures and livestock** (`src/systems/farm.js`, `LIVESTOCK` in `src/content/farming.js`): fence a fallow plot as pasture (400 obols, at its sign); buy laying hens (12), dairy goats (140) or beef calves (450) at **Hoof & Horn** (now open, run by **Wes Tolliver**) — room by area, one kind to a pasture. The animals are drawn on the pasture (new `chicken` and `goat` props; cattle use the cow), up to a dozen per plot.
- **Feeding and produce:** at the pasture sign, fill the feeder with feed (new `item_feed`, Feed & Seed). Each morning the herd eats from it; fed hens lay (`item_eggs`), fed goats give milk (`item_goat_milk`) — collected at the sign. An empty feeder makes them hungry; after three hungry days a fifth of the herd is lost. Cattle gain 30 obols of value a day for 25 days; sell them back at the Hoof & Horn auction.
- **Market demand** (`FARM_MARKET`): every unit sold at the Co-op (crops, eggs, goat milk) or the auction lowers the next price, towards a floor of 55% of the day's price; 40% of the day's sales are forgotten each morning.
- **Farm management:** the tablet's **Farm** app (once you own land) — each plot's state, herds, days of feed left, produce waiting, the Co-op's and auction's prices, and the farm's books for the last 7 days (fencing, stock bought and sold, sales).
- Tests: 4 more in `tests/farming.test.mjs`.

### Changed
- The Co-op also buys eggs and goat milk; its sale message shows the next bid as the bins fill.

## [0.30.0] — 2026-10-15 — "Sowing Season" (development build)

The second of the three agricultural releases chosen in interview: farm purchase, crops and equipment. Livestock, the agricultural market and farm management follow in 0.31.0. See docs/FARMING.md.

### Added
- **Farmland** (`src/systems/farm.js`, `src/content/farming.js`): the three plots east of FM 38 (each one of the map's `fields`) are for sale at the Land Office (now open: a deeds desk) or at the plot's sign — 6,000, 6,000 and 11,000 obols.
- **Work on a plot**, at its sign: till, plant (wheat, sorghum, corn or cotton; seed bags by area), fertilise (+25% yield) and harvest. By hand a job takes most of a day and tires you out; with **your own tractor parked by the field** it takes minutes to an hour, by the tractor's tier.
- **Growth on the world clock:** each morning at 06:00 a planted crop advances (wheat 4 days, sorghum 5, corn 6, cotton 8); a ready crop left more than 3 days spoils to half. The field is redrawn in the ground layer as it grows.
- **The Co-op scale** by the elevator buys the harvest; its price index (0.85–1.15) moves each morning.
- **Red Dirt Tractor & Implement** is a dealership in the existing vehicle system: the Shortrow 25 (1,800), Workhorse 75 (4,200) and Longhorn 180 (8,500), drawn as tractors, at full speed off-road; part-exchange as at the other lots. Sold by **Dale Pruett** on the lot.
- **Lone Star Feed & Seed** is open (interior and `shop_feedseed`), run by **Lorna Calloway**, who is also the county land agent in the afternoons.
- Items: four seeds, fertiliser, four crops. Tests: `tests/farming.test.mjs` (5).

### Changed
- `tests/logistics.test.mjs`: the own-fleet export test now sails until the ship actually arrives (a random delay en route could push the ETA past its single fixed wait when the dice fell differently).

### Anti-exploit
- Each plot is bought once; seed and fertiliser are used up; a crop is harvested once per planting; yields follow area, crop and fertiliser only; the Co-op's daily price comes from the day, not from reloading. Older saves start with no land.

## [0.29.1] — 2026-10-15 — "Main Street" (development build)

The owner said Lariat's map "feels very cheap and poorly done", asked for it to match the other areas' quality and street design, said the transition to the area wasn't clear, and that the crops at the top of the map were "super laggy" and sat on the river. See docs/LARIAT.md.

### Changed
- **Lariat rebuilt** (`src/content/maps/lariat.js`) on a street grid like Halvermouth's: four-lane FM 38, Pecan Street, Main Street, Cotton Street, Dairy Road / Mesquite Lane, Church Street and East Street, with pavements both sides, every street connected (no dead ends into grass), front walks from doors to the pavement, and street furniture (lamps, benches, hydrants, bins, planters, flags, mailboxes). Every existing building, door, spot and quest place kept its id; the paddock and hideouts work as before.
- **Traffic lights and zebra crossings** at FM 38 & Main and FM 38 & Cotton, and three cars driving round Lariat's blocks (`src/content/transit.js`).
- New buildings and places: the First Baptist church, the post office, the State Bank, Rusty's Barber Shop, Lariat School, Lariat Square (fountain, benches, trees), the rodeo grounds, ten houses on Pecan Street and Mesquite Lane with yards and fences, a loading lot behind Feed & Seed. The new doors say why they're closed.
- **Caddo Creek** now runs down the east side of the county, clear of every field; Duchess's sandbar is in it.
- **Fields** (`map.fields`) are drawn once into the cached ground layer (new `k` field tile; `drawFields` in `src/engine/drawFarm.js`): the Hollister cotton and sorghum, Chuckie's silage corn, and the three fallow plots for sale. The old animated per-frame `crops` props (hundreds of stalks redrawn every frame) are gone from the map.
- **The way in:** a ranch arch with LARIAT in iron letters and a cattle guard over FM 38, a welcome sign and road signs on the Lariat side; gateposts and a green FM 38 NORTH sign at Halvermouth's North Gate. Lariat's sea-wall border (water and boulders round an inland town) is gone, replaced by a tree line; Halvermouth's northern edge is drawn as a grassy ridge (new `R` tile) instead of sea. World-map gate labels can point ▲/▼.

### Added
- Props: `ranchgate`, `ranchpost`, `roadsign`. Map icons for the new buildings.
- Test: Lariat's street grid, fields, furniture placement, lights, crossings and gates (`tests/lariat.test.mjs`); the transit test counts Lariat's traffic separately.

## [0.29.0] — 2026-10-15 — "Lariat" (development build)

The owner supplied a photo of Farmer Chuckie and a master prompt for a northern agricultural region, a farming simulation and Chuckie's Cheese. Interviewed first: store the photo; Chuckie is **cheerful and folksy** (he/him), a friend of Captain Ober; Wrath mixes **a stampede and a giant cheese wheel**; **five** talking cows; the town is **Lariat** (the owner let us pick); the work ships in **several releases** — this one is the town, Chuckie, Chuckie's Cheese, the cow quest and the stock. Farms, crops and equipment follow in 0.30.0; livestock, markets and farm management in 0.31.0. See docs/LARIAT.md and docs/characters/npc_chuckie.md.

### Added
- **Lariat** (`src/content/maps/lariat.js`): a north-Texas-style farm town through Halvermouth's new **North Gate** (FM 38). Main Street (Lariat Mercantile, the Land Office, Lone Star Feed & Seed, Calloway Ag Repair), Cotton Street (Hoof & Horn livestock supply, the Mesquite Diner, the Bluebonnet Boarding House, Red Dirt Tractor & Implement), the Co-op grain elevator, houses, the Hollister cotton farm across Caddo Creek, the old barn and windmill, and **Chuckie's Cheese**: two freestall barns, the milking parlour, the cheese plant, silos, pasture with grazing cows, the lead cows' paddock and Chuckie's ranch house. Seven interiors. The farm businesses not open yet say so on their doors (they open in 0.30–0.31); the east fields carry FOR SALE signs.
- **Farmer Chuckie** (`npc_chuckie`, imported, protected): portrait from the supplied photo; flannel, overalls, cap, beard and glasses; a daily round (the parlour at 05:30, the plant office, lunch at the diner, the lookout over the paddock, the porch at sunset); dialogue that follows the quest (the problem, the lasso, where the cows still loose were seen, progress, and afterwards — the intro never repeats); motif "Cheddar Two-Step"; **Wrath `stampede`**: dust and a spinning lasso, cheese wedges circling, the herd thundering through you from both sides, and a giant wheel of cheddar rolling you flat.
- Townsfolk: Opal Haskins (the Mercantile), Lupe (the diner), Wade (dairy hand), Rosa (cheesemaker), Earl Hollister (cotton) — with homes, schedules and shops.
- **The lead cows** (`cow_bessie`, `cow_clementine`, `cow_duchess`, `cow_patsy`, `cow_daisy`): five talking cows, each with her own voice, looks and dialogue; drawn by the new `src/engine/drawCow.js`. Ordinary cows are props and don't talk.
- **The Lost Herd** (`q_lost_herd`): buy a lasso (always one in stock at the Mercantile), find each cow (markers on the map; Chuckie, Lupe and Earl say where), rope her in conversation, and walk her back to the paddock — she follows on foot, trots to keep up, waits outside interiors, stays put if you drive off or get far ahead, and comes through a gate or over a map edge with you only when she's right behind you. Each cow home restores 9% of the dairy's capacity; all five completes the quest once (2,500 obols, two wheels of cheddar, Lariat reputation).
- **Chuckie's Cheese** (`src/systems/dairy.js`, `src/content/dairy.js`): daily milk, cheese, revenue, costs and profit from the herd and the lead cows; dividends at 18:00; the share price moves toward a fair value (book value plus a multiple of earnings) with a milk-price index and market mood. **CHZ** on the Halvermouth exchange: company tabs on the share register (tablet Stocks app, Sir Moneybucks's desk) and a company board in the cheese plant.
- Items (lasso, jerky, sweet tea, pecan pie, chicken-fried steak, cheddar wheel, cowboy hat), two shops, a Lariat faction, facts, map icons, farm props (`src/engine/drawFarm.js`: water tower, signs, silos, windmill, hay bales, tractors, troughs, crop rows, ranch fence, grazing cows, milk tank, milking stalls, cheese vats, press and racks).
- Captain Ober knows Chuckie (ask him).
- World map: regions can now join north–south (`src/world/layout.js`).
- Validator: duplicate ids across content files are an error (one was found: a Sumps customer was already called Dot Pruitt — the shopkeeper became Opal Haskins).
- Tests: `tests/lariat.test.mjs` (13).

### Anti-exploit
- The market prices most of the herd's recovery in already (90%), so knowing the quest is worth under 10% on CHZ; trades pay a 1% broker's fee each way; one investor may hold at most 1,500 shares (1%) — Chuckie keeps control. The quest reward is paid once (guarded in the save). Cows can't be roped twice or roped back out of the paddock.

### Saves
- Older saves gain the dairy on first use: every lead cow loose at her hideout, no shares, nothing paid.

## [0.28.0] — 2026-10-15 — "New World" (development build)

The owner asked for the world map in the terminals to "look more like a globe with true continents and islands instead of circular blobs". Chosen in interview: fictional but realistic geography; Fleet Command's chart stays flat. See docs/GEOGRAPHY.md.

### Added
- **Geography** (`src/world/geography.js`): continents from hand-laid skeletons around the countries and ports, domain-warped and roughened by fractal noise into real coasts; carved inland seas and straits; archipelagos (the Morrow Isles, the Spice Isles, the Lantern Keys, the Marrow reefs, the Ice Teeth) and lone ocean islands; polar ice. Sampled once onto a half-degree grid (`landGrid`, `elevationAt` in `src/world/globe.js`).
- **Surface drawing** (`src/engine/drawGlobeSurface.js`): a baked texture per palette (shelf-shaded sea, hill-shaded land, coastline, country borders); a per-pixel lit sphere for the arms terminal's globe (atmosphere glow, hovered country lit); a smoothed flat chart for Fleet Command.
- Tests: `tests/geography.test.mjs` (4).

### Changed
- The arms terminal's globe draws the land as true shapes instead of a 3° dot matrix; hovering any land picks its country from the texture.
- Every port moved onto the nearest coast of the new geography.

### Removed
- `buildLand` (the dot matrix) and the capitals' round "pull" onto land.

## [0.27.0] — 2026-10-15 — "All Aboard" (development build)

Release 3 of 3 from the owner's terminal and shipbuilder brief ("It would also be cool to be able to actually walk on the ship if possible"). Chosen in interview: board docked ships at the Yards berths — a walkable deck generated from the design, cabins below, a wheel and logbook. See docs/BOARDING.md.

### Added
- **Life-size ships at the berths** (`src/systems/docks.js`, `src/engine/drawDeck.js`): each berth's first two ships moored either side of a long pier, drawn full size in 3/4 view (hull, steel or planked deck, sheer stripe, rail, windlass, bollards, mooring lines, gangway, name board), kept in step with the fleet every minute and on map rebuilds.
- **Walkable decks** generated from the design (`src/world/shipDeck.js` `deckPlan`): the hull's outline and beam; every part where it was placed, as a solid fitting drawn in detail; a port-side walkway so the way below and every fitting are reachable; the bridge with its door, or (sailing ships, the skiff) the wheel on deck and a companionway.
- **Below decks** (`belowDecks`): a generated interior with the wheelhouse (wheel, logbook, chart table, radio or sea chest), cabins, mess and galley, the engine room (her engines and generators) and the hold (her cargo).
- **The logbook** panel (`src/ui/logbook.js`) and the wheel (status, speed, range, last voyage).
- `GameMap.setWalkable` / `removeDoor` for runtime decks; `shade()` accepts its own `rgb()` output (fixes warship bridges drawn black in side profiles).
- Tests: `tests/boarding.test.mjs` (4).

### Changed
- The Yards harbour is deeper (84 rows) and the three piers are longer and moved to x = 12, 30, 48.

## [0.26.0] — 2026-10-15 — "Drydock" (development build)

Release 2 of 3 from the owner's terminal and shipbuilder brief ("the ship builder should feel like the ship builder in No Man's Sky or Starfield … parts should be detailed and ships should be detailed and not be small pixels"). Chosen in interview: a big side profile, parts snapping onto glowing attachment points from a tray. See docs/SHIPBUILDING.md.

### Added
- **Detailed side profiles** (`src/engine/drawShipProfile.js`): every hull family (cargo with bulb bow, small craft, inflatable skiff, warship, sail with castles, gun-ports and bowsprit, futuristic hydrofoil with foils and glowing trim) with plating or planking, antifouling, boot-top, sheer stripe, propeller, rudder, bridge tiers with glass, lifeboat and lit mast; and a drawing for each of the 35 parts (`PROFILE_PART`), animated (smoke, fans, radar, sails, glow). Stock ships get a standard fit (`fitFor`) so they're drawn as fully as custom ones.
- **The shipbuilder** (`src/ui/shipBuilder.js`) in Fleet Command's Shipyard: hull cards; the profile on a blueprint stage with numbered glowing attachment points; a tray of part cards by family (fit reasons, limits, store counts); drag-and-drop onto points (snap), between points (swap), off the ship (remove), click to fit, double-click or Delete to remove; a side panel with points/weight/power/mounts meters, the class's requirements, performance bars, abilities, paint, name, yard, the bill, Buy missing parts and Lay the keel. Slips & yards page with the build drawn taking shape; a parts store with every part drawn.
- **Layouts**: a design's `layout` (the slot of each part; gaps allowed) is saved with builds and launched designs (`Shipyard.layoutOf`, `fitOf`, `look.fit`). It changes only the look — a broken or missing layout means "in order".
- Tests: `tests/shipbuilder.test.mjs` (4).

### Changed
- Fleet Command's ship pictures (fleet, buy, ship card, at sea, in port) are the detailed side profiles.

### Removed
- The old tabbed logistics terminal (`src/ui/logistics.js`) and its styles; Fleet Command replaced it in v0.25.0.

## [0.25.0] — 2026-10-15 — "Fleet Command" (development build)

Release 1 of 3 from the owner's terminal and shipbuilder brief ("feels too much like a spreadsheet … should control the entire screen … easier to use"). See docs/FLEET_COMMAND.md.

### Added
- **Fleet Command** (`src/ui/fleetCommand.js`): a full-screen, map-centred ops room replacing the tabbed logistics terminal. A live chart (drag, zoom, wrap; land sampled every half degree with glowing coasts; pulsing danger zones; animated routes; ships drawn as ships along their course; port work badges; tooltips); a top bar with ⏩ 1 h / 6 h / ⏭ next event that runs the real clock visibly; a left rail (Map, Fleet, Buy, Shipyard, Ledger); a drawer for the selection; a log ticker.
- One-click orders: contract cards with the best ship pre-chosen and protection folded away; mission cards with the best team pre-chosen; "Send to…" then click a port, with a live route/time/cost preview. Yards berth choice on each of your ports.
- Simulation helpers: `Logistics.bestShipFor`, `suggestEscort`, `idle`, `opportunities`, `nextEvent`; `Missions.bestTeam`.
- Tests: `tests/fleetcommand.test.mjs` (5).

### Changed
- `PANELS.logistics` (and the new `PANELS.fleet`) open Fleet Command; the tablet's Ships app launches it; the v0.24 designer and parts store are shown inside its Shipyard sheet for now.

## [0.24.0] — 2026-10-15 — "Build Your Own" (development build)

Stage 4 of the shipping expansion (the master brief's stages G and H). The expansion's planned features are complete; playable naval combat remains a future goal (see docs/LOGISTICS.md).

### Added
- **The shipyard** (`src/systems/shipyard.js`): Mason's Os build one at a commercial-or-bigger port (`SHIPYARD`): quoted with the crew's goodwill discount and speed-up, paid once, built over days with daily progress reports, persisted; Mason's topic "Could your crew build me a shipyard?"; at Mill Road Docks, scaffolding then a slipway (`slipway` prop) showing the ship on the slip.
- **The custom shipbuilder**: 12 hulls (`HULLS`) and 35 parts (`COMPONENTS`) with technology, kind, slots, weight, power, mounts, maximums, prerequisites and per-class requirements, all validated by `Shipyard.validate`; stats computed from parts (`compute`); a parts store (`buyComponent`, `buyMissing`); the advanced licence (`TECH`); `commission` reserves and consumes parts once and charges hull + labour once; `cancel` returns parts and refunds half; launch creates exactly one vessel (waiting for a berth if needed). Saved designs are inputs only; `Logistics.model()` recomputes custom ships from content.
- Custom ships drawn with their parts on deck in slot order, in your colours (`drawShips.js`).
- Terminal: Shipyard page (yards, builds on the slips, the designer with a live preview, slot order, paint, stats, problems and the bill) and Parts page (licences and the store). Tabs wrap.
- Validator: hulls and parts (families, tech, prerequisites, bonuses, and that every hull can be fitted out with its required parts).
- Tests: `tests/shipyard.test.mjs` (8).

## [0.23.0] — 2026-10-15 — "Here Be Pirates" (development build)

Stage 3 of the shipping expansion (the master brief's stage F).

### Added
- **Piracy** (`src/systems/piracy.js`, `Logistics.voyageRisk`): pirate waters (`PIRATE_WATERS`), war zones and blockades from the arms market; risk by danger-weighted distance, cargo value, speed, stealth, escorts, guards and fleet bonuses; worst case capped by the route's most dangerous water (safe water: delays only; escorted: never captured). Encounters rolled at departure and stored as voyage events; outcomes repelled / chased / ransom / cargo seized / captured, settled once (`Logistics.pirates`, `loseCargo`) — contracts fail or pay insurance, arms shipments settle as hijacked through the market.
- **Convoys and services**: escorts (`quote`/`assign`/`armsQuote`/`Market.ship` take `escorts`), guards and cargo insurance; escorts wait while the cargo loads, sail at the convoy's speed, share its events and take a share of any fight.
- **Warships** (`WARSHIPS`, Kestrel Naval Surplus): twelve ships in four families with combat numbers, holds only where real, port restrictions and fleet bonuses (`BONUSES`, scoped fleet/port/group, never stacking).
- **Missions** (`src/systems/missions.js`, `MISSION_TYPES`): seven types offered daily at your ports; fitness from weighted stats; an estimate shown, the outcome rolled at the start and stored; vessels `mission` status; rewards once; deterrence suppresses a pirate water, port protection safeguards a port.
- Logistics terminal: Missions and Warships pages; protection and escort choices with risk on every quote; route risk on every contract; danger zones on the chart; combat stats and bonuses on Fleet. Arms terminal: guards and escorts for own-ship exports, with the risk.
- Ships drawn for every warship hull (sails and yards, turrets, a skiff).
- `tools/validate-content.mjs` checks the logistics registries (ports, ships, classes, bonuses, contract and mission requirements).
- Tests: `tests/naval.test.mjs` (10).

### Changed
- Naval bases berth size-4 ships. Contract types no longer carry a fixed risk label; the route decides.

## [0.22.0] — 2026-10-15 — "Own Bottoms" (development build)

Stage 2 of the shipping expansion (the master brief's stage D and the rest of E).

### Added
- **Arms exports in your own ships**: `Market.ship({ …, vessel })` → `Market.shipOwn` validates the order, cage, licence, hostility, budget and `Logistics.armsQuote` (docked at Mill Road Docks, free, capacity, range, berth, arrears, money) before changing anything; then removes the crates, reserves the budget, records the shipment (`vessel`, no fee, uninsured) and calls `Logistics.carryArms` (pays running costs and fees, loads, rolls customs for embargo runs). On arrival `Market.settleOwn` settles once through the same `Market.settle` path the shippers use. The market no longer settles own-ship shipments on its own clock; their ETA follows the voyage's delays.
- Arms terminal: your ships in the FILL form (with quotes and reasons), in the contact list, and on the globe (export voyages on real sea lanes; other Ober & Sons voyages in cyan, hoverable).
- Richer voyage log (departure, duration, cargo, delays) on the logistics terminal's Fleet page; arms cargo shown on Fleet and Chart.
- Tests: 4 more in `tests/logistics.test.mjs` (own-fleet exports pay once and skip the freight fee; validation changes nothing; external shippers unchanged; an embargo run's customs fate survives a reload).

### Changed
- `Market.resolve` split into `resolve` (rolls an external shipper's fate, same RNG use as before) and `settle(shipment, fate)`.

## [0.21.0] — 2026-10-15 — "Ober & Sons" (development build)

Owner's request: a player-owned logistics and shipbuilding business bought from Captain Ober (a master brief in eight stages), with Captain Ober's photo ("a very stereotypical sailor"). Owner's answers: import Captain Ober now (store the photo); old-salt voice; no relation to Ober's Oil; retiring; based at new docks at the Yards; he/him; kraken Wrath; jolly from the start; an old smuggler about your arms business; company **Ober & Sons Maritime**, his ship the **Salty Ober**; ship the brief as several releases. This release is the brief's stages A–C plus the core of E (the terminal and tracking); stages D (own-fleet arms exports), F (piracy, warships, missions) and G (the shipyard) follow.

### Added
- **Captain Ober** (`npc_ober`, imported, protected): portrait, a new `captain` peaked-cap hair style, old-salt dialogue (selling the company, his sons, his smuggling past, superstitions, advice, the kraken), relationships with Lucas and Mason, motif "Hoist Away" (`motif_ober`), and a **kraken** Wrath theme (flooding cobbles, tentacles, a whirlpool, the kraken's eye; foghorn, shanty, waves). Routine: harbour office, the quay, a pipe by the bollards, asleep aboard the Salty Ober.
- **The Yards docks**: Mill Road Yards extended south (64×62 authored): Quay Road with turning circles, the quay apron, cranes, bollards, lamps, three berths (`shipberth` props that draw your ships), the Ober & Sons Maritime harbour office (interior with the logistics terminal) and the Salty Ober (moored tug with a cabin interior).
- **Logistics** (`src/systems/logistics.js`, content `src/content/logistics.js`): buying the company (all-or-nothing, once); 34 ports in five types, up to 30 owned; ten cargo ships in five classes from a brokerage; vessel records with a validated status machine; contracts (seven types, eleven clients) posted daily per owned port, with quotes (arrival, on time, costs, profit), loading, voyages, late pay and penalties; delays rolled at departure and stored; condition and repairs; daily upkeep with arrears that hold sailings; a ledger and reports; tablet notifications (`ships` app).
- **Sea routes** (`src/world/seaRoutes.js`): A* over the globe's 3° sea cells, smoothed and cached; ports sit on coasts; every port reachable.
- **The logistics terminal** (`src/ui/logistics.js`): Overview, Chart (a sea chart with ports, routes and ship positions from the clock; hover and click), Fleet (details, rename, show at berths, repair, send), Ports (berth display, owned ports, ports for sale), Contracts (offers, assign with quotes, cancel), Brokerage (by class, with previews), Finances, Reports — in the harbour office and as the tablet's **Ships** app.
- Ships drawn top-down from their look (`src/engine/drawShips.js`: coaster, runner, freighter, container, heavy-lift, bulk, starwake, tug).
- Generic `panel` effect/interaction result (`{ panel: { name, … } }`) for dialogue that opens a panel.
- Tests: `tests/logistics.test.mjs` (13), `tests/character_ober.test.mjs` (5).

### Changed
- Globe geography moved to `src/world/globe.js` (shared by the arms terminal, the logistics chart and sea routes).
- A dialogue that opens a panel hides itself while the panel is open and rebuilds its topic menu afterwards.

## [0.20.0] — 2026-10-15 — "Streets" (development build)

Owner's request: a general world update — NPCs should prefer pavements and crossings; pavement props should not be solid for the player; cars should feel like they turn; streets felt too small for cars; no U-turns at map edges; stop lights to make junctions feel alive (not illegal to run them); a weird beeping noise; fewer cars; roads that lead nowhere ruin the immersion — make the map feel more real. Owner's answers: roads 4 tiles wide (one wide lane each way); rework the existing maps (every road joins a network, roads only leave a map through gates, map edges are real boundaries; no new districts); traffic drives off at the edges and others drive in; cars and the bus obey the lights, people use the walk signal, running a red is not a crime.

### Changed
- **Four-tile roads** (`src/world/widen.js`): maps are still authored with 2-tile roads; at load `widenAll` duplicates the first line of every road listed in `ROADS` twice, so each is 4 wide, and shifts everything after it (`fx`/`fy`; buildings, areas, spots, props, doors — gates on a road are copied across it; crosswalks stretch). Content authored in old coordinates (transit, parked cars, dealers) goes through `shiftPoint` / the shifts. Halvermouth is now 120×90.
- **The road network** (maps): Halvermouth gains a ridge cliff and Ridge Road along the top, the sea wall to the west and cliffs to the east (gaps only at the gates), Quay Road along the bottom, turning circles with statues/fountain at the old dead ends, and Crown St / Grand Ave ending at the car-park entrances; Lanternside's Lamplighter Lane ends at Lamplighter Circle and the quay at a turning circle with bollards; the Ober Fields' county road ends at Wellhead Circle under the escarpment; the Yards' gate lines up with Mill Road.
- **Transit** (`src/content/transit.js`, `src/systems/transit.js`): built from authored lanes after widening (`buildTransit`); routes have rounded corners (`Route`, quadratic curves); traffic is 7 cars — two block rings, two through-the-city routes and the coast road — and open routes despawn at the far gate and respawn after their `gap`; no U-turns.
- **Honking**: only after 3 s blocked by you, at most once per car per 15 s and once every 9 s overall, and quieter (`sfx_horn` `{quiet}`).
- **Car handling** (`Vehicles.physics`): steering ramps in (`car.wheel`), travel direction lags the heading (`car.travel`, `car.slip`; looser on the handbrake) and a slide scrubs speed; front wheels drawn steered; skid marks (`Vehicles.skids`, drawn by the renderer, fade in 14 s).
- **Audio**: `amb_city` no longer plays synthetic horn beeps; the siren follows only cruisers that are chasing or searching.

### Added
- **Traffic lights** (`src/world/lights.js`: `lightState`, `walkSignal`; 22 s cycle, per-junction offset): 12 Halvermouth junctions and Lamplighter Lane × Gullwing Road, four `trafficlight` props each (heads, walk/wait boxes). Traffic and buses stop for red and late amber (`Transit.redAhead`); NPCs wait at the kerb for WALK (`NpcSystem.waitForSignal`; not when on a call, fighting or fleeing). No crime for running a red.
- **Pavements**: solid props standing entirely on pavement are walk-through for people (`GameMap.carBlock` — cars still collide); pathfinding cost ×6 on carriageway and ×1.1 on crossings (`GameMap.walkCost`), so people keep to pavements and cross at crossings.
- **Old saves**: `Game.widenSave` shifts the player, NPCs and cars on widened maps for saves older than 0.20.0 (`olderThan` in `src/core/version.js`) and resets the buses; `CONTENT.roadShifts`.
- Tests: `tests/streets.test.mjs` (11 tests: widening, four-tile roads, roads end at gates, walk-through props, pavement routing, lights, stopping at red, through traffic, waiting for the green man, car handling, old saves); transit, world and quest tests updated for the new coordinates.

## [0.19.0] — 2026-10-14 — "By the Crate" (development build)

Owner's request: production for export in crates rather than hundreds of single weapons; orders of 5–50 crates; single weapons and ammo for the player. Owner's answers: stations make whole crates; every crate is one standard lot; countries post orders of 5–50 crates; singles and ammo at a workbench you use yourself.

### Changed
- **Crates** (`CRATE`, `CRATE_ITEMS` in `src/content/arms.js`): twelve crate items (`item_crate_<recipe>`), one standard lot each — `CRATE.units` (5) weapons' worth of value. The weapon recipes (same ids, so placed stations carry on) now make crates from 5× the inputs in 3× the time. The production report, belts, the cage and Lucas all handle crates.
- **Orders** (`src/systems/market.js`): every day each country posts purchase orders (1–2 at peace, 3 at war) of **5–50 crates** of one weapon — weighted by its wants and towards what your works can make — at a locked price per crate (today's price + up to 15%), within its budget; they expire in 3–7 days. `Market.ship({ wh, order, shipper, insured })` fills an order whole from the export cage; delivery marks it delivered, losses mark it lost. Country budgets and income ×6 for crate-sized orders; saturation 0.012 per crate.
- **Terminal Market tab**: open orders (country, crates, price per crate, total, expiry, war/embargo, cage count) with FILL → shipper, insurance, fee and SHIP; the export cage; buyers with their order counts. The globe's country tooltip lists open orders; clicking a country shows only its orders.
- Lucas's wholesale budget 2,500 → 15,000 a day.

### Added
- **The armourer's workbench** (a prop in every arms works; `BENCH_RECIPES`, `Arms.benchCraft`, panel `armsbench`): hand-make one weapon (pistol to Kestrel drone) or a box of ammunition (9mm ×20, shells ×8, rifle ×10, an RPG rocket) from raw parts on the loading dock; game time passes (15–150 minutes); research locks as at the stations; "Order missing" orders what you're short.
- Debug command `crates [type] [n]`.
- Tests: crate content and order limits, filling orders, the workbench, `crates` (market and arms tests rewritten for crates).

## [0.18.0] — 2026-10-13 — "Hot Pursuit" (development build)

Owner's request: "Can you also add police chases too?"

### Added
- **Police chases** (`src/systems/pursuit.js`): while Wanted, outdoors, and seen in the last 60 game minutes, cruisers spawn out of view on a road 16–28 tiles away — up to one per star. They're real cars (`owner: 'police'`, `chase: {...}`, model `cruiser`) driven by the shared car physics, steering along an A* route over tiles a car fits through (roads cheapest; repathed every 0.6 s), straight at you within 8 tiles; they back up and repath when stuck, follow you across seams but not through region gates, brake for pedestrians (never hurting anyone), and drive through traffic (which "pulls over"). ★: no reckless speeds; ★★★: they ram (aiming ahead of your car; contact halves your speed and knocks you off line).
- **Getting caught**: in a car, stopped or pinned (judged by actual movement) beside a cruiser for 2 s → pulled over; on foot, a cruiser within 150 px for 1.6 s → cuffed; on the bus, at its next stop → arrested. The bar under you reads "PULLED OVER — drive!".
- **Getting away**: out of every cruiser's sight for 12 s → they search your last known position for 20 s, then leave; no new cruisers until someone sees you again. Cruisers left in another region search and give up. Wanted cleared or arrest → they drive off (or vanish).
- Cruisers' sightings keep the Wanted level fresh (`police.lastSeen`).
- Sirens (`AudioEngine.setSiren`: a two-tone wail, louder as they close in), flashing light bars, red and blue light at night, flashing "P" markers on the minimap, "🚓 ×N in pursuit" / "🔦 They're searching" on the HUD, shouted orders.
- Tests: `tests/pursuit.test.mjs` (7 tests).

### Changed
- Car physics is shared (`Vehicles.physics`, `Vehicles.crossings`): turning no longer swings a car into a wall, a wedged car can work itself loose, and cars report their real ground speed (`car.moved`).

## [0.17.0] — 2026-10-13 — "Route 1" (development build)

Second half of the Transportation update.

### Added
- **Transit** (`src/systems/transit.js`, content `src/content/transit.js`, state `world.transit`): vehicles that follow lanes in **world space** (`src/world/layout.js`, now shared by the world map), so they cross maps and region gates freely. Near you (same region) they move every frame and stop for anything ahead — you (they honk), people, other vehicles (mutual blocks resolve oldest-first; any jam clears after 8 s), parked cars — with a short hold so they don't lurch; elsewhere, or during time skips, they move once a game minute. Left-hand traffic.
- **The No. 1 bus**: three buses on one loop (≈216 game minutes) — Mill Road Yards, Mill Road (the Sumps), Civic Plaza, the East End, Westbrook Row, Gullwing Road, Ober's Oil Refinery, and back — stopping 8 minutes at each stop in both directions. **Fare 2 obols.** Board a waiting bus (E), ride it for real while it drives (the camera and HUD follow; you change map with it), get off (E) at any stop beside its sign. **Bus-stop signs** (prop `busstop`, interact kind `busstop`): the next bus's ETA and direction, and "Wait for the bus" (time passes until it arrives).
- **NPC traffic**: 11 cars on four loops — round Halvermouth's Financial District, Market Street and Iron Row blocks, and back and forth along the coast road. Your car collides with them. **Carjacking**: E beside a stopped traffic car takes it (a stolen car; `fact_player_car_theft`); it rejoins the traffic two hours later.
- Night: buses and traffic light the road ahead; the bus interior glows.
- World map: bus stops (hover: next bus) and the buses (hover: direction, next stop).
- Riding HUD: direction and the next stop; key hints.
- Debug command `bus [stop]`.
- Tests: `tests/transit.test.mjs` (7 tests).

### Changed
- Halvermouth's avenue cars (parked in the traffic lanes) were removed; the car parks, police cruisers, hotel limousines and named owners' cars remain.
- `MapRenderer.worldLayout` moved to `src/world/layout.js` (`worldLayout`, `worldToMap`, `mapToWorld`).

## [0.16.0] — 2026-10-13 — "On the Road" (development build)

First half of the Transportation update. Owner's answers: drive cars yourself; ride the bus for real (next release); original dealer NPCs; hitting people, car theft and NPC traffic (next release) as extras.

### Added
- **Cars** (`src/systems/vehicles.js`, content `src/content/vehicles.js`, state `world.vehicles`, `player.driving`): eight models with price, top speed, acceleration, grip, size and body style. Tank-style driving (W/↑ throttle, S/↓ brake and reverse, A/D steer — biting harder with speed, Shift handbrake, H horn), off-road slowdown, sub-stepped collision against walls, props, doors and other cars (oriented boxes), sliding along obstacles, crash sound and camera shake. Cars cross map seams and drive through region gates with you; they stay where you park them. Engine note follows speed (`AudioEngine.setEngine`); headlights light the road at night; brake lights.
- **Fender's Pre-Loved Motors** (Westbrook Row): a forecourt, a sales hut (`fender_office` interior) and **Marty Fender** (`npc_marty`), selling the Halver Pipit (420), Morrow Dray Estate (680) and Ostley Mule Pickup (900). Buys any car parked on the lot at 40% of list, stolen ones at 30%, and sells "fresh plates" (150) that make a stolen car legitimately yours.
- **Beaumont Motor Gallery** (Halvermouth, the East End): a glass-fronted showroom with a marble interior (`beaumont_showroom`), display cars, and **Julian Beaumont** (`npc_julian`), selling the Beaumont Aurelia (6,500), Halcyon Tempest GT (11,000), Vantaggio Corsair (18,500) and Sterling Regent Limousine (26,000). Part-exchange at 55%; refuses stolen cars.
- **The dealership panel** (`src/ui/dealer.js`): car previews, stats, colour choice, buy; sell or re-plate cars parked on the lot. Opened through dialogue (effect `{ dealer: id }`).
- **Hitting people**: above 70 px/s a car hurts whoever it hits (damage by speed; lethal above 330 px/s), with knockback and the usual assault crime and witnesses; slower, they're nudged and annoyed. **Imported characters are never harmed** — the car stops; no Wrath, since it isn't a direct attack.
- **Car theft**: E on anyone else's car → hotwire (2.5 s, less with finesse; moving cancels it). Fact `fact_player_car_theft` (severity 3, Wanted ★★); the owner holds a grudge; officers who see you driving a stolen car raise the Wanted level and give chase; stolen cars that police have flagged are impounded back to their owners if you're jailed. Dealers restock a stolen display car the next morning.
- **Every parked car is real**: Halvermouth's 'car' props (avenues, the Harbourline car park, the police cruisers, the Grand Hotel's limousines) become drivable, stealable cars, plus cars belonging to Sir Moneybucks, Mason, Lucas and Osric.
- Your cars on the world map (🚗, hover for model and place) and a garage card on the tablet's Home screen. Map icons for both dealerships.
- Driving HUD: car name, speed in mph, a stolen tag; driving key hints. Hotwire progress bar.
- Character art: `pattern: 'check'` blazers, `chain` and `shades` accessories.
- Sounds `sfx_car_start`, `sfx_crash`, `sfx_horn`; the engine loop.
- Debug command `car [model]`.
- Tests: `tests/vehicles.test.mjs` (12 tests).

## [0.15.1] — 2026-10-13 — "Overwatch" (development build)

### Changed
- **The arms-works terminal is an OSINT console** (`src/ui/terminal.js`): a CRT monitor frame (`className: 'monitor'`), scanlines, phosphor text, a header bar, STATUS / CONTACTS (live shipment progress) / INTERCEPTS (news) panels, F1–F6 command tabs and a shell prompt. The tablet's Business app shows the same console.
- **The globe is interactive**: drag to rotate, wheel or +/− to zoom, HQ and auto-rotate buttons; hover tooltips for countries (anywhere on their land: status, budget, wants, prices, stance, your inbound cargo), your shipments (operator, destination, cargo, value, progress, ETA, insurance, embargo) and Halvermouth. Your craft sit at their true progress with a sonar ping, a solid wake behind and a flowing dashed route ahead; air freight (Stork) is drawn as a plane on a higher arc. 22 ambient vessels sail the trade lanes continuously (hover: name, route, declared cargo; some run dark). Clicking a country opens the Market with it as the buyer.
- **The map (M) is a world map** (`MapRenderer.worldLayout` / `drawWorld` in `src/ui/maps.js`): every outdoor map in one space — regions joined by gateways are placed side by side with a road between the gates. Pan by dragging, zoom with the wheel or buttons (1–24 px per tile), Whole world / Me / per-region buttons, building icons (`src/content/mapIcons.js`, 52 buildings) with hover tooltips, names when zoomed in, district names, region names when zoomed out, fog over unexplored districts, gold rings on your home and owned property. Inside a building you're shown at its door; a second tab keeps the building's own floor plan.
- Panels can set any `className` on the modal (`monitor`, `tablet`, `wide`).
- Tests: `tests/worldmap.test.mjs` (3 tests).

## [0.15.0] — 2026-10-13 — "OberPad" (development build)

### Added
- **The tablet** (`src/ui/tablet.js`, panel `tablet`, title "OberPad") replaces the journal (J / Q). Apps: **Home** (notification feed + business and stock summary cards), the journal's Quests, People, Customers, Notes and Standing, **Business** (only once you own an arms works) and **Stocks**.
- **Business app**: a remote link to each arms works' terminal — the same globe and Overview / Parts / Equipment / Staff / Research / Market screens (`terminalScreen` in `src/ui/terminal.js`, shared with the works terminal), with a works switcher when you own several.
- **Stocks app**: the Ober's Oil share register (`stocksScreen` in `src/ui/panels.js`, shared with Sir Moneybucks's register) plus a closing-price chart with per-day hover.
- **Business notifications** (`src/systems/tablet.js`, state `world.tablet`): `tablet.post(app, text, kind)` toasts and keeps a feed of 60 with an unread count. Posted by: parts deliveries, payroll, a payroll-you-can't-cover warning at 18:00, staff quitting, a daily production report per works at 19:00, staffed stations stalling (out of parts, output full, no recipe, no power, lab with no project; once per stall), research complete, shipments delivered or lost, world news, Ober's Oil dividends and share moves of 3+ obols. HUD badge "📱 N new" (click to open).
- Tests: `tests/tablet.test.mjs` (7 tests).

### Changed
- The pause menu's Journal button is now Tablet; the HUD key hint reads "J tablet".
- The terminal's Overview no longer says the global market "opens soon".

## [0.14.0] — 2026-10-13 — "Gun Running" (development build)

Second half of the Guns and Gun Running update.

### Added
- **The global market** (`src/systems/market.js`, state `world.market`): eight fictional countries with budgets, income, wants per weapon family, aggression and rivals. Daily at 06:00: budgets grow, wars end (after 5+ days, 15%/day) or start (rivals, 5% × aggression), aggressors may be embargoed, sanctions occasionally lift, and news is posted. Prices = value × wants × war boost × (1 − saturation) × (1 − hostility/200); hostile countries (60+) refuse to buy. Starts with Varnistan and Caldera at war and Pallas sanctioned.
- **Shipping** from a works' export cage to a country: five shipping companies (fee, reliability, days; two run embargoes, at extra risk), optional insurance (+8%, pays 60% if lost — not for seized smuggling), payment on arrival; losses are sunk, hijacked or seized. **Heat**: a seized embargo run is traced to you (record +8, Wanted ★★); a seizure by the buyer's enemy makes them hostile (+30); arming one side of a war annoys the other (+5).
- **Terminal Market tab**: world news, shipments in transit, every buyer's status, budget and prices, and a shipping form (buyer, shipper, insurance, quantities, live quote). The globe draws wars as pulsing red lines and your shipments crossing from Halvermouth.
- **Heavy weapons in the field** (`src/systems/heavy.js`): the RPG launcher fires rockets (explode on impact, 2.5-tile blast); Skylance guided missiles home on the nearest person; Longbow cruise missiles strike the aimed point after a 2.5 s countdown (5-tile blast); Hornet drones dive at whoever you're fighting; Kestrel drones fire four missiles. Blasts hurt you too, scorch the ground, shake the camera and make bystanders flee. **Explosions never harm imported characters and drones/missiles never target them; only a direct rocket hit calls down their Wrath.** Explosions are a major crime (record +10).
- Sounds `sfx_rocket`, `sfx_explosion`, `sfx_drone`; fact `fact_player_explosion`.
- Debug commands `heavy`, `war <a> <b>`, `peace`, `arrive`, `nextday`.
- Tests: `tests/market.test.mjs` (12 tests).

### Changed
- Witnesses to one scene now make a single police call (the worst crime they saw) instead of one each.

## [0.13.0] — 2026-10-13 — "Pipecreek" (development build)

First half of the Guns and Gun Running update.

### Added
- **Lucas Eastrise** (`npc_lucas`): imported from a player-supplied photo (stored with permission; portrait embedded). Sleazy, creepy, conspiratorial; 14 rotating rants about the fictional countries and generic real-world-style conspiracies (no real names). Protected, with an `arms` Wrath ("EVERYTHING IS FOR SALE") and strike sound `sfx_crate`. See `docs/characters/npc_lucas.md`.
- **Pipecreek Armory**: the gun shop renamed, staffed by Lucas (counter 09:00–19:00), with a back room. Buying a gun unlocks his pitch; accepting it unlocks the **arms licence** (500 obols).
- **Mill Road Yards** (`yards`, a new region through a gateway at the west end of Mill Road), with three **arms works** for sale (Yard 1 Works 2,500, Yard 2 Works 6,000, Foundry Hall 12,000; licence required). Interiors `aw1`/`aw2`/`aw3`, all larger than the calculator warehouses: loading dock, export cage, terminal, staff bunks.
- **Arms production** (`src/systems/arms.js`), built on the factory engine: seven workstation types (`item_st_*`, domain `arms`) running one recipe each; 11 parts, 6 components, 18 recipes; new weapons: assault rifle, sniper rifle and LMG (usable now, rifle rounds), RPG launcher, RPG rocket, Skylance guided missile, Longbow cruise missile, Hornet and Kestrel drones (use in v0.14).
- **Employees**: procedurally generated (name, look, four skills, quirk, wage), hired from the terminal into bunks. They are NPCs who live in their works, walk to their assigned station on shift, and run it. Payroll at 19:00; morale, bonuses, quitting.
- **Research tree**: five branches, 21 nodes (unlocks, speed, price bonuses, cheaper parts), fed by staffed research labs.
- **The terminal**: a hand-drawn rotating globe with eight fictional countries, borders, glowing trade routes and traffic; tabs for Overview, Parts, Equipment, Staff, Research and Market.
- **Wholesale**: Lucas buys arms items at half value (with research), up to 2,500 obols a day; the shop shows his remaining budget.
- Factory engine generalized (`Factory` hooks: `recipeOf`, `rate`, `produced`, `stepMachine`, `settingOptions`, `statusExtra`, per-system state and warehouse registry); calculator machines and arms stations can't be mixed.
- Debug commands `licence`, `works <id>`, `armsparts [n]`, `stations`, `research <id|all>`, `hire [n] <works>`.
- `docs/ARMS.md`. Tests: `tests/arms.test.mjs` (14 tests).

### Changed
- The shop sell list uses `Game.priceFor` (so dynamic prices show).

## [0.12.0] — 2026-10-13 — "The Calculator Works" (development build)

Second half of the gang update: making your own calculators, Factorio-style.

### Added
- **Warehouses** for sale on the Halvermouth docks (`src/content/warehouses.js`): Warehouse 7 (300 obols), Pier 9 Shed (750), The Old Cannery (1,500), each with its own interior (`wh7`, `wh9`, `wh12`): concrete floor, an input bay, an output crate and a workbench. Bought at the FOR SALE sign; the door unlocks (`owns_<id>`).
- **Sal's Surplus Electronics** (`surplus` map) and **Sal Vage** (`npc_sal`, generated): parts (`shop_surplus`; also buys calculators back at 7 and blanks at 3), machinery (`shop_machines`, after 5 made), daily **delivery contracts** (small 50 / large 140 obols, after 10 made) into your biggest warehouse's input bay at 07:00, paid on delivery.
- **Production chain**: five parts (`item_part_*`) → core, shell → blank → tuned calculator. **Hand-crafting** at the workbench (10/10/15/8 game minutes, from pockets and the input bay).
- **Factory** (`src/systems/factory.js`): machines (soldering station, case press, assembler, tuning bench; 2×2, buffered), conveyor belts (one item a minute; the end of a line feeds machines and crates; lines back up, never drop), inserter arms (one item a minute, only what the target wants), generators (power: the wall socket runs the first 2–3 machines, each generator 4 more). Runs one step per game minute for every owned warehouse — on or off the map and through skipped time. Entities are saved and reinstalled as runtime props (`GameMap.addProp/removeProp`).
- **Build mode** (B in a warehouse you own): a toolbar of your machinery, number keys or click to choose, R to rotate, click to place, right-click to pick up (contents come back), a green/red placement ghost with direction arrows, power readout. E on a machine: status, set the tuner, load inputs, collect output.
- Containers you own have **All** buttons and **Store all parts**.
- Drawing for every fitting and machine (`src/engine/drawFactory.js`): crawling belt chevrons, items sliding along belts, swinging arms, glowing machine windows, progress bars, power lights, generator exhaust.
- Debug commands `warehouse <id>`, `parts [n]`, `machines`, `made <n>`.
- `docs/FACTORY.md`. Tests: `tests/factory.test.mjs` (13 tests, including a full parts-to-calculator production line).

## [0.11.0] — 2026-10-13 — "Sums of Anarchy" (development build)

First half of the gang update (the warehouse and factory builder follow in 0.12.0).

### Added
- **Arthur Anderson** (`npc_arthur`) — imported from a player-supplied image (stored with permission; portrait embedded) and interview. Leader of the Sums of Anarchy; always angry (a permanent flush, slammed brows and steam: new `appearance.angry`), maths-obsessed, protective, petty, vengeful. Protected, with a `maths` Wrath ("YOU DON'T ADD UP": graph paper, orbiting calculator keys and bad sums, falling digits, a giant calculator reading ERROR, division by zero → UNDEFINED) and strike sound `sfx_digit`. See `docs/characters/npc_arthur.md`.
- **The crew** (generated, killable, faction `fac_sums`): Al Gebra (enforcer), Percy Ntage (bookkeeper), Minnie Mus (the counter), Dee Nominator (bouncer), Tony Tangent (lookout), Max Imum (reckless).
- **The Abacus** — the gang's bar in the Sumps (`abacus` map): bar, pool hall, bunk room, Arthur's office. 17 new Sumps spots.
- **Calculators** (`src/systems/calculators.js`): six items (`item_calc_*`). Stat calculators give +1 for ~4 h then −1 for 1 h; Plus Pack heals 40; Overclock +45 energy then a crash 3 h later. Tolerance per type weakens and shortens each use (1 / (1 + 0.6 × uses)) and fades a point every 8 h. `Game.stat(name)` gives effective stats; dialogue checks and the jail key reach use it. Grit now reduces damage taken (8% per point above 2).
- **Customers and dealing** (`src/systems/gang.js`, state `world.gang`): 12 Sumps residents with a favourite calculator, budget and referral. Free samples win gang customers (chance from favourite, Charm and earlier attempts); won customers page daily orders (type, quantity, price, meeting spot, two-hour window) and walk to the spot; deliveries pay and build habit; three deliveries unlock a referral; missed orders sour them back to the gang.
- **Gang anger** 0–100: +12 per stolen customer, +2 per deal, +10 assault / +40 murder of a member, −4 per quiet day. 25 a warning, 50 the crew jump you in the Sumps and the Abacus, 75 war: they jump you anywhere in Halvermouth and send hunters every 3 hours. **Truce**: tribute (30 + 2 × anger) or hand back half your customers for 7 days (stealing during a truce: +40).
- **Police**: dealing is a crime (severity 2) — an officer who sees it makes you Wanted (bribes cover it); Finesse shrinks the witness range; gang members and customers never call the police; jail confiscates contraband (calculators). Gang members and officers trade insults when they meet.
- Minnie's counter (`shop_sums`) works across the bar while she's behind it, and refuses you once the gang is hostile (`interact.staffed`).
- HUD: calculator highs and comedowns, the gang's mood. Journal → **Customers** tab with every customer, orders and gang anger. Character panel shows boosted stats.
- Debug commands `calcs [n]`, `gang <n>`, `customers`, `customer <name> <status>`, `order <name>`.
- Tests: `tests/gang.test.mjs` (21 tests).

### Fixed
- Dialogue topic and choice labels weren't interpolated, so Chief Order's bribe choice showed a literal "{bribe}".

## [0.10.0] — 2026-10-13 — "Law & Order" (development build)

### Added
- **Chief Lawrence Order** (`npc_lawrence`) — imported from a player-supplied image (stored with permission; portrait embedded) and interview. Careless, comfortable, bribable; never leaves Precinct 1. Protected, with his own Wrath (theme `law`, `after: 'jail'`). See `docs/characters/npc_lawrence.md`.
- **Five generated officers** (justice-pun names, all armed, all killable): Sgt. Justin Case (revolver; Plaza, Bank Row, East Gate, Founders Park), Warren Tee (pistol; Sumps, Mission, Docks), Bailey Bond (pistol; Lanternside), Miranda Wright (baton; Westbrook, Gullwing Park, Canal Row), Hugh Jury (shotgun; Ober Fields, then the cell block at night — dozing 01:00–04:00). Plus **Petty Larson**, the prisoner in the next cell.
- **Police system** (`src/systems/police.js`, state `world.police`): criminal record (murder 10, an officer 20; assault 3/6; gunfire 2; jailbreak 8; trespass/theft 1), Wanted 0–3 stars, witness calls with a delay, dispatch of the nearest officers, pursuit, cuffing (1.4 s close contact), shoot-on-sight at ★★★, Wanted lapsing unseen, a point off the record per clean day. The Chief is lax below record 8.
- **Bribes** (3 days: calls ignored, officers look away; a killing is still reported 4 hours late) and **fines** via Chief Order's dialogue (`police` effect and condition).
- **Jail** (`jail` map, below the rebuilt precinct with the Chief's office and the officers' bunk room): weapons and contraband go to the evidence locker (`ct_evidence`); sentence 4 h + 2 h per record point; serve it on the cot (gear back, record halved). **Breakouts:** spoon digging (4 nights' hours), the guard's keys (Finesse; +12 h if caught), bribing the guard (no warrant, no gear), Petty's vent (25 obols or a cigar for the bent fork). Escaping is a jailbreak: ★★.
- **Death and knock-outs** now land you in jail instead of at home.
- **LAW & ORDER Wrath**: siren wash, sweeping searchlights, police tape, rings of badges, handcuffs and CASE CLOSED/DENIED stamps, a chalk outline, four squad cars ramming in, a giant gavel, a paperwork blizzard stamped GUILTY, and cell bars dropping. Audio: siren, the Chief's tuba motif, typewriter, cell-door clang; strike sound `sfx_ram` (fifth = gavel). Banner "YOU HAVE THE RIGHT TO REMAIN SILENT".
- HUD Wanted stars / bribe / time-left line; a cuffing bar over the player; **G** to surrender.
- Debug commands `wanted`, `record`, `jail [hours]`, `release`, `bribe`.
- Items `item_jail_keys`, `item_spoon`, `item_bent_fork`; props `loosebrick`, `vent`, `wallcrack`; motif `motif_lawrence`.
- Tests: `tests/police.test.mjs` (20 tests).

### Changed
- `combat.test.mjs`: being beaten unconscious now ends in a cell, not at home.

## [0.9.0] — 2026-10-13 — "Personal Wrath" (development build)

### Fixed
- **Attacking a protected character often did nothing.** Melee only hit within ~1.4 tiles, and Sir Moneybucks spends most of the day behind furniture (study desk, dining table, card table) where the player can't get that close, so the swing silently missed. Tests had always placed the player adjacent. Now any melee swing aimed at a protected character within 2.6 tiles (50° cone, line of sight) calls down the Wrath, and so does any shot whose path passes within 28 px of one (`Combat.raisedAgainst`, `Combat.protectedOnRay`). Regression tests reproduce the dining-table case.

### Added
- **Themed Wraths** (`profile.wrath.theme`; `THEMES` in `src/engine/wrath.js` — `arcane`, `oil`, `construction`), each restyling the same beats (aura → banner → convergence → five strikes → finale), with per-character `banner` and `subtitle`:
  - **Sir Moneybucks — oil**: "YOU CANNOT AFFORD THIS". Sepia-black sky; a milled-coin "$" sigil; six derricks burst up around him and spout crude; spinning gold coins and oil barrels orbit as he rides a gusher; the strikes are oil geysers under the player that ignite from the third; an oil slick burns; the finale is a pillar of burning oil and black smoke with coins raining down.
  - **Mason — construction**: "DEMOLITION ORDER APPROVED". A blueprint grid spreads over the ground; hazard-tape rings, orbiting hammers/wrenches/trowels/bricks and a ring of nails; a crane cable lifts him on an I-beam; orange "DEMOLISH" spray paint marks the player; four I-beams fall (dust, sparks) and a wrecking ball swings in; a brick wall builds itself over the player, is stamped CONDEMNED, and collapses into dust.
- **Themed audio**: `sfx_wrath` takes the theme — oil adds a ka-ching, Sir Moneybucks's motif on brass, a fire roar and coins; construction adds anvil strikes, Mason's whistled motif and clattering bricks. New strike sounds `sfx_gusher` (ignites from the fourth strike) and `sfx_beam` (the fifth is the wrecking ball). All themes rendered offline: peaks 0.88–0.89.
- Validator: `wrath.theme` must be a known theme.

### Changed
- Mason's last word is now construction-themed ("Looks like you just got… nailed.").

## [0.8.0] — 2026-10-13 — "Debug Menu" (development build)

### Added
- **Debug menu** (` key, or Pause → *Debug menu (testing)*): live status (obols, health/energy, position, time, weapon/ammo), quick buttons (+100/+1000 obols, heal, god mode, all weapons, ammo, revive all, jump to 08:00/22:00, skip an hour, overlay), a map teleporter, a searchable **item spawner** with quantity, and a **command console** with history (Up/Down).
- **Console commands** (`src/game/debugCommands.js`, DOM-free and tested): `help`, `give <item> [n]`, `take <item> [n]`, `items [filter]`, `money <n|+n|-n>`, `health <n>`, `energy <n>`, `heal`, `god`, `weapons`, `ammo [n]`, `time HH:MM`, `skip <min>`, `maps`, `spots <map>`, `tp <map> [spot]`, `revive <npc|all>`, `npcs`, `stat <stat> <1–5>`, `rep <faction> <n>`, `flag <name> [value]`, `overlay`, `clear`. Items resolve by id or part of the name.
- God mode (`player.god`) blocks all damage except the Wrath.
- Tests: `tests/debug.test.mjs` (5 tests).

### Changed
- The ` key opens the Debug menu instead of toggling the overlay directly (the overlay is a button and a command in the menu).
- Opening any menu hides the world caption box so it can't cover the menu.
- Any state-changing debug command sets the flag `debug_used` in the save.

## [0.7.0] — 2026-10-13 — "The Oberverse Protects Its Own" (development build)

### Added
- **Imported characters are protected** (`isProtected()` in `src/systems/combat.js`): any character with `origin: 'imported'` cannot be damaged, knocked out or killed — unless their profile sets `killable: true` (the project owner's decision).
- **The Wrath**: attacking a protected character with anything (fists, melee, guns) triggers a ~10-second cutscene (`src/engine/wrath.js`) that strikes the player down:
  - the world freezes (clock, NPCs, input), letterbox bars slide in, the camera pushes in and the sky darkens toward the character's colour;
  - three counter-rotating rings of procedurally drawn runes unfold around the levitating victim, whose eyes burn; a heptagram sigil glows beneath them; motes swirl inward;
  - the banner "THE OBERVERSE PROTECTS ITS OWN" drifts together letter by letter;
  - the runes converge on the player and a sigil opens under their feet; five forked lightning bolts strike with white-out flashes and screen shake;
  - a pillar of light rises, the player dissolves into embers, fade to black, and the victim has the last word (`profile.wrath.line`, coloured by `profile.wrath.color`).
- **Score**: `sfx_wrath`, an original 8-second procedural piece (impact, timpani roll, detuned "choir" through vowel formants, organ pedal, rune hum, brass stabs, a rising whoosh, final D-major crash), timed to the visuals; `sfx_thunder` on every strike; music and ambience duck for the scene. Rendered offline in Chromium to confirm output and headroom (peak 0.91).
- **Struck down** card: *Rise again* (wake at home at 08:00 the next day, full health, half your obols gone) or *Load last autosave*.
- Consequences: the victim remembers; witnesses and the victim learn `fact_player_smitten` (gossip); flag `smitten_by_<id>` counts attempts for future dialogue.
- Wrath lines and colours for Sir Moneybucks (gold) and Mason Nails (orange).
- Tests: `tests/wrath.test.mjs` (5 tests).

### Changed
- `docs/CHARACTER_IMPORT.md` and prompt 03: imported characters are protected by default; ask the owner before setting `killable`, and write a `wrath.line`.

### Compatibility
- Save schema unchanged (1). The cutscene is never saved (autosave is suspended while it plays).

## [0.6.0] — 2026-10-13 — "Hard Lessons" (development build)

### Added
- **Combat system** (`src/systems/combat.js`). The player can attack any NPC with melee weapons or guns.
  - Melee: an arc in front of the player (range, arc, cooldown, knockback per weapon). Guns: hitscan rays stopped by walls and buildings, with spread, pellets (shotgun), full auto (SMG), magazines, reloading and ammunition items.
  - Aiming: the mouse when it is in use; otherwise facing with a forgiving auto-aim cone. A dashed aim line shows for guns.
  - **NPC health bars** appear over anyone who is hurt or fighting (green → amber → red, white flash on hit), with floating damage numbers; "KNOCKED OUT" under the bar while they are down.
  - **Fight or flight**: victims and witnesses flee or fight back by temperament (`profile.combat`: `fights`, `defends` (true or a list of people), `never`, `weapon`, `maxHealth`) and personality. Fighters chase with collision and short A* re-plans; badly hurt fighters break and run.
  - **Non-lethal** weapons (fists, brass knuckles, police baton) knock people out for two game hours; they wake at 30% health, frightened. **Lethal** weapons kill: bodies stay where they fell, the dead never act again, can't be talked to, and quests they gave fail.
  - Consequences through existing systems: victims' relationships and memories, witnesses learn `fact_player_assault` / `fact_player_murder` (gossip, reputation), a new `frightened` mood, gunshots scare everyone within earshot (and wake sleepers).
  - The player can be beaten: at 0 health you black out and wake at home six hours later with 45 health, missing a quarter of your money. Health regenerates slowly out of combat.
- **Weapons** (items with a `weapon` block): brass knuckles, police baton, baseball bat, crowbar (now also a weapon), machete, fire axe; .38 revolver, 9mm pistol, pump shotgun, hunting rifle, submachine gun. **Ammo**: .38, 9mm, shotgun shells, rifle rounds (sold by the box; items take a `bundle` size).
- Where to get them: **Rook & Rifle** (Halvermouth) is now an unmanned shop (honesty box; restocks at 09:00); Tibbs sells a fire axe; a baton in the police station lockers (faction `fac_police`); a bat in a crate in the Sumps (unowned containers can be taken from freely).
- Controls: **F / left click** attack (hold for automatic weapons), **R** reload, **X** next weapon, **1–9** pick a weapon, **Z** put weapon away; Equip / Put away buttons in the inventory; HUD shows the weapon and ammo.
- Art: weapons held in hand, bodies lying down (dead ones over a dark pool), tracers, muzzle flashes, swing arcs, bullet sparks, a red vignette when hurt or low on health.
- Audio: swing, punch, whack, slash, three gunshots, reload, dry fire, hurt.
- Combat temperaments for 18 characters (e.g. Silas defends with a revolver; Barnaby protects anyone; Mason, Osric, Sir Moneybucks and others never fight).
- Validator: weapon definitions, ammo references, combat profiles; interact kind `shop`; shops and containers may have `owner: null`.
- Tests: `tests/combat.test.mjs` (10 tests).

### Compatibility
- Save schema unchanged (1). New optional fields: `player.equipped`, `player.mags`; per NPC `health`, `dead`, `downUntil`, `diedAt`. Older saves load with fists and everyone at full health.

## [0.5.0] — 2026-10-13 — "Halvermouth" (development build; map only)

### Added
- **Halvermouth** (`halvermouth`, 112×80 tiles — the largest map), a metropolis west of Westbrook. It is its own region (`city` in `src/content/world.js`) and is **loaded when the player enters** through gateway doors at Westbrook's west edge / the city's East Gate, rather than stitched seamlessly.
- Districts: the Financial District, Bank Row, Civic Plaza, Precinct Row, the East End, Market Street, Iron Row, Founders Park, the Docks and **the Sumps** (slums).
- **Skyscrapers** (new `tower` building style: tall glass facades, floor bands, lobbies, helipads, antenna beacons, offices lit at night, night glow): eleven towers including Ober's Oil Tower (30 storeys).
- **Hall of Justice** (courthouse + Mayor's office) with a dome and pediment at the centre of Civic Plaza; **Police Precinct 1** with a car park of cruisers; **Rook & Rifle Firearms** on Iron Row. Interiors: `hall_of_justice` (lobby, Mayor's office, Courtroom One), `police_station` (front desk, desks, holding cells), `gun_shop` (display counter, racks).
- Closed-for-now buildings with flavour text: the other towers, bank, hotel, cinema, diner, pawnbroker, bar, garage, locksmith, bail bonds, mission, warehouses.
- New tiles `m` (plaza stone) and `u` (mud); building styles `flatRoof`, `dome`, `pediment`, `shabby`; props `car` (incl. police and wrecked), `flagpole`, `statue`, `trash`, `barrelfire` (a light source), `tent`, `laundry`, `crosswalk`, `hydrant`, `dumpster`, `chainfence`, `gunrack`, `cellbars`, `gatepost`; a firearms variant of the display case.
- Audio: `mus_halvermouth` ("City of a Thousand Windows"), `amb_city` (traffic hum, distant horns).
- Map (M): a tab for every region, including regions not yet visited; gateway arrows at map edges ("◀ Halvermouth"); the full map now always stitches the whole region.
- Tests: `tests/world_halvermouth.test.mjs` (6 tests: region separation, walking through the gateway both ways, required buildings and districts, reachability of every open door and interior, opening hours, saves).

### Changed
- Doors may carry `gateway: '<name>'` (edge doors into another region); building `mapLabel: ''` hides a label on the map.

### Not included (by request — map first)
- No residents, shops, jobs, quests or events in Halvermouth yet.

### Compatibility
- Save schema unchanged (1). Older saves load; the city simply appears.

## [0.4.0] — 2026-10-13 — "Mason's Os" (development build)

### Added
- **Second imported character: Mason Nails** (`npc_mason`), from a player-supplied image and interview. Cheerful, neutral, always friendly, a dad-joke machine; owns Mason's Os ("That's O plural!"). His photo is his dialogue portrait.
- **Pun of the Day**: a different pun each in-game day (`Game.dailyPun()`, bank in `src/content/dialogue/mason.js`); groan, laugh, or fire one back (Wits check).
- **Westbrook Lots** (`westbrook`, 44×48), joined seamlessly to the west of Lanternside: Mason's Os yard and site office (`mason_office`), a construction site with a working excavator (animates while Mason digs), the Plumb Line Apartments (`apartments`), the canal's western basin and surveyed lots.
- **Three generated crew**: Dee Rivera (foreman), Barnaby Cole (labourer, birdwatcher, feuding with Tibbs over a gull), Quinn Abernathy (apprentice surveyor/draftsperson). All live at the Plumb Line.
- **Construction shifts** (`job_construction_shift`, `src/systems/construction.js`): trench, bricks, mixer; properly or rushed. Flat 6-obol wage; careful shifts earn crew goodwill (discounts up to 25%, builds up to 2 days faster).
- **Property groundwork** (`src/systems/properties.js`, `src/world/plots.js`, `src/content/properties.js`, docs/PROPERTIES.md): plots and blueprints (home, rental, business), contracts board, Form 22-B permits from Osric, multi-day builds, finished buildings added to the map at runtime with their own interior, rent/income at 18:00. **No plots exist yet** — added on request.
- New condition keys `site`, `property`; effect keys `site`, `permit`; `payWages: 'construction'`; interact kind `contracts`; workstations take a `company`.
- New faction `fac_builders`; facts about Mason's Os, the gull feud, Dee's secret pun tally.
- Audio: `mus_westbrook` ("Measure Twice"), `motif_mason` (whistled), `amb_site` (hammering, idling excavator).
- Docs: `docs/characters/npc_mason.md`, `docs/PROPERTIES.md`, prompt 17 (add a property plot); registry, world bible, content format, architecture, audio guide, known issues, testing record updated.
- Art: scaffold, excavator, lumber, bricks, cement mixer, trench, survey stake, contracts board.
- Tests: `tests/character_mason.test.mjs` (13 tests, incl. a full property lifecycle on a test-only plot).

### Changed
- Mags, Osric, Tibbs and Sir Moneybucks know Mason (relationships and opinions); Sir Moneybucks wants him exclusively and was refused.
- Region renamed "Lanternside & surrounds" (Westbrook · Lanternside · Ober Fields).
- Map rendering caches are keyed by map object so maps can be rebuilt at runtime.

### Compatibility
- Save schema unchanged (1). `world.construction`, `world.properties`, `fac_builders` and the four new residents are defaulted on load of older saves.

## [0.3.0] — 2026-10-13 — "One Coast" (development build)

### Changed
- **Lanternside and the Ober Fields are one continuous space.** Outdoor maps can be placed side by side in a *region* (`src/content/world.js`); the shared edge column becomes a seam the player and NPCs walk across with an exact, jump-free handover (no fade, no camera snap).
- The renderer draws neighbouring maps (ground, water, buildings, props, people, street lights, the lighthouse beam) beyond the current map's edge, and the camera pans across the seam.
- The minimap and the full map (M) draw the whole region stitched together as "Lanternside & the Ober Fields".
- The Ober Fields' west edge continues the Lantern Canal (ending in a culvert pool) and the harbour shore; a westward signpost was added.
- NPCs choose the seam crossing that best lines up with their route.

### Added
- `src/world/regions.js`: seam generation (walkable tiles only) and region offsets; `Game.neighbors()`, `Game.mapOffset()`.
- The welcome letter points new players east to the Ober Fields; loading a save from an older version shows a "what's new" note.
- Tests: walking across and back with no jump; seams only on walkable ground; an NPC crossing physically.

### Removed
- The two explicit "Road to …" edge doors (replaced by the generated seam).

### Compatibility
- Save schema unchanged (1). Saves made on either map load as before.

## [0.2.0] — 2026-10-13 — "Ober's Oil" (development build)

### Added
- **First imported character: Sir Richard E. Moneybucks, Esq.** (`npc_moneybucks`), from a player-supplied image and interview. Ruthless robber baron and antagonist you can work with; status-tiered treatment of the player; his photo as dialogue portrait (embedded data URI).
- **The Ober Fields** district (`ober_fields`) reached by the road east of Lanternside, with interiors: Moneybucks Manor (hall + study), Ober's Oil Refinery No. 1, Workers' Bunkhouse.
- **Ten generated employees**: Crisp, Agnes, Gideon, Ruby, Hank, Pip, Delphine, Silas, Mabel, Otto — routines, personalities, relationships, dialogue and system hooks.
- **Ober's Oil economy** (`src/systems/oilCompany.js`): shares, daily output and dividends, expansion projects (derricks, pipeline, safety refit) with visible and social consequences, wages, morale, accident risk, strikes.
- **Refinery shift job** with three work stations (do it properly or cut corners).
- **"The Ledger"** card wager (`src/systems/ledgerGame.js`), tuned by simulation so reading his tells (Wits) beats naive play.
- **Quest "The Seal of M."** continuing the lighthouse mystery, with four endings (expose, restore, blackmail, partnership); a relit lighthouse with a sweeping beam.
- Events: strike, refinery accident, the Kettle & Crumb buyout, canal slick, the empty vault, lens requisition. Notice-board posts for each.
- Manor invitations (door locks with flags), private documents that catch snoopers, keyed vault, company store with gouging prices, edge-of-map road exits.
- Art: top hats, hard hats, caps, beards, handlebar moustaches, monocles, pinstripes, watch chains, held cigars/clipboards/wrenches; derricks, pumpjacks, tanks, pipes, refinery machinery, vault, paintings.
- Audio: three new compositions, Sir Moneybucks's motif, brass instrument, two ambience beds.
- New faction `fac_oil`; new condition keys `wealth`, `oil`, `arrived`; new effect keys `oil`, `payWages`, `schedule`, `action`.
- `tests/character_moneybucks.test.mjs` (14 tests); validator checks for impossible impulses and event id mismatches.

### Fixed
- Event templates lacked ids, so all events shared one cooldown/once slot.
- Impulses that could never fire (Mags's patio natter, Osric's overtime, Tibbs's gull watching).
- Character portraits drawn before their image loaded fell back to procedural art.

### Compatibility
- Save schema unchanged (1). Older saves load and gain the new characters, Ober's Oil state and `fac_oil` reputation automatically (tested with the 0.1.0 fixture).

## [0.1.1] — 2026-10-13 — "Just Open It" (development build)

### Changed
- **The game is now a single, self-contained `index.html`.** Double-click it to play: no server, no installation, no internet. The same file is served as-is by GitHub Pages, so the game can be shared as a link.
- The multi-file module page moved to `dev.html` (development only, `npm run dev`).

### Added
- `tools/build.mjs` (`npm run build`): zero-dependency bundler that inlines the stylesheet and every module into `index.html`.
- `tests/build.test.mjs`: fails if `index.html` is out of date with the sources, or stops being self-contained.
- Smoke test now runs against `index.html` over `file://` (24 checks, including saves persisting across a reload); `--dev` tests `dev.html` through the dev server.
- `.nojekyll` so GitHub Pages serves files untouched.

## [0.1.0] — 2026-10-13 — "Foundations of Lanternside" (development build)

First playable foundation (roadmap stages 0–1, with early parts of stages 2–6).

### Added
- Project structure, zero-dependency static server, ES-module browser game with no build step.
- Version identifiers in `VERSION`, `package.json`, `oberverse-manifest.json` and `src/core/version.js`; version shown on the title screen, pause menu and About screen.
- World clock (1 real second = 1 game minute), weekdays, dawn/dusk lighting, lit windows and street lamps.
- Lanternside outdoor map (64×48 tiles) with six districts and six interiors (player flat, Kettle & Crumb café, Civic Office, Hollow Fixings workshop, the Old Lighthouse, Vane residence).
- Smooth player movement with acceleration, collision, corner sliding, sprinting and energy.
- Doors with keys, owners and opening hours; trespass detection for restricted places.
- Interaction framework: talk, examine, read, search containers, sit, sleep, forage, pry obstacles, notice board.
- NPC simulation in two tiers (physical on the player's map, abstract elsewhere) sharing one utility-based brain over schedules and personality-driven impulses.
- Knowledge system with witnessing, hearing, reading, gossip and rumours; NPC-to-NPC conversations that spread information.
- Relationships (trust, affection, respect, suspicion), moods, bounded importance-based memory, observation rules.
- Three original characters: Mags Pell, Osric Vane, Tibbs Hollow — with dialogue, opinions, gifts, reactions and distinctive mechanics (gossip trading, formal requests, junk trading).
- Dialogue engine: conditional greetings, topics, choices with skill checks, gifts, gossip trading, bounded "Ask about…" keyword box, anti-repetition.
- Inventory, money (obols), shops with friendship pricing and persistent stock, containers with ownership and witnessed theft.
- Quests: *The Dark Lamp* (three entry approaches, two resolutions), *The Lucky Spanner*, daily job *Coffee for the Clerk* with expiry.
- Reputation with Lanternside and three factions.
- Emergent event director with event chains: workshop bang → noise citation, missing key investigation, café sell-out, gull heists.
- Original procedural soundtrack (7 pieces), ambience beds, 18 sound effects, 3 character motifs, per-character voice blips; volume controls and mute.
- HUD, minimap, full map with fog of war and quest markers, journal (quests, people, notes, standing), inventory, shop, container, document reader, settings, save/load, About & release history, debug overlay.
- Saves: autosave + 3 slots, automatic backups, validation and repair, schema version 1 with migration framework, JSON export/import.
- 59 automated tests, content validator, 21-check browser smoke test, map preview tool, save-fixture generator.
- Documentation set and AI prompt bank.

### Known limitations
See docs/KNOWN_ISSUES.md. Notably: no combat yet, no equipment slots, a single outdoor map, no controller support.
