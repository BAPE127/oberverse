# Sir Richard E. Moneybucks, Esq. — `npc_moneybucks`

**Imported character** · added in v0.2.0 · interview 2026-10-13

## Source material

- **Image:** supplied by the player; stored with permission at `assets/portraits/reference/npc_moneybucks_reference.jpg`. A 224 px crop (`assets/portraits/npc_moneybucks.jpg`) is embedded in `src/content/portraits.js` and used as his dialogue portrait.
- **Visual reading (appearance only):** stocky/broad build, black pinstripe three-piece suit, wing collar, black silk cravat, tall black silk top hat, gold monocle on a chain, brown hair, full brown beard, large curled handlebar moustache, diamond lapel pin, gold watch chain, cigar.

## Interview summary

| Question | Player's answer | Implementation |
| --- | --- | --- |
| Who is this? | Richard E. Moneybucks Esquire, rich oil tycoon, owner and founder of **Ober's Oil**; a stereotypical Rockefeller type; ~10 employees (generate them); lives in a huge mansion; generate his refinery and oil fields. | New district map *The Ober Fields* (manor, refinery, oil fields, bunkhouse) and ten generated employees. |
| Tone? | A genuinely ruthless robber baron; definitely an antagonist you can work with to invest and expand his oil empire. | Antagonist with three cooperation paths (shifts, investing, the Ledger) and morally loaded consequences. |
| Speech? | Old money; "my good fellow"; refers to himself as **Sir Moneybucks**, as does everyone else. | `shortName: 'Sir Moneybucks'`; all dialogue uses the title. |
| Attitude to the player? | Little respect for people he sees as lower or poor. | Status-tier greetings and gated topics (see below). |
| Link to the mystery? | Up to me. | He is "M." (approved in the design preview). |
| Activities? | Work at the refinery, invest, gentlemen's challenge. | Refinery shift job, share register + expansion projects, "The Ledger" card wager. |
| Image storage? | Allowed. | Stored and embedded as portrait. |

The design preview (presented and approved: "this is perfect") is reproduced in the session history; this document records what was built.

## Supplied vs. invented

- **Supplied:** name, company name, occupation, ruthless robber-baron tone, antagonist-you-can-work-with framing, old-money speech, "my good fellow", "Sir Moneybucks", contempt for the poor, mansion/refinery/oil fields, ten employees, the three activities.
- **Invented (approved in preview):** the employees' names, jobs and personalities; the estate's layout; status tiers; the Ledger rules; shares/dividends/projects economy; the strike, accident, buyout and canal-slick events; his role as "M." (bought the Harbourmaster's seal at auction, darkened the bay to run untaxed night tankers, keeps the great lens in his vault); his motif.

## Status tiers (`src/content/dialogue/moneybucks.js`)

| Tier | Condition | Treatment |
| --- | --- | --- |
| Beneath notice | otherwise | Dismissive greetings; no business, investing or cards. |
| Useful | wealth ≥ 40, a refinery job, or any shares | Curt business talk; investing (wealth ≥ 30); the Ledger. |
| Person of means | wealth ≥ 150, 10+ shares, or beat him at the Ledger | Warm(ish) greetings, flattery, strike negotiations. |

*Wealth* = obols + value of Ober's Oil shares (condition key `wealth`).

## Mechanics

- **Refinery shift** (`job_refinery_shift`, hired by Gideon 06:00–14:00): three work stations; *proper* (30 min) or *cut corners* (10 min, +2 obols each, +1 accident risk; Ruby notices). Wages 5 × wage level.
- **Investing** (`src/systems/oilCompany.js`): shares bought/sold at a price set daily from output; dividends at 18:00 = shares × output/100 (×0.8 after a wage rise). Projects: derrick (+20% output, risk, morale), pipeline (+30%, leads to the canal slick), safety refit (risk down, morale up). Each grants bonus shares and changes his respect for you.
- **The Ledger** (`src/systems/ledgerGame.js`): 3 rounds; you hold 3 cards, he holds 4; he declares Raise/Steady and bluffs; Wits gives readable tells; ties go to the house; stake 20. Must be accepted with proper etiquette ("Moneybags" forfeits for the day).
- **Strike**: morale < 30 → Otto calls a strike; workers picket the gate (impulses); output 0. Resolve by persuading him to raise wages (needs standing), breaking it with Silas, backing the strike fund, or urging the workers back.
- **The Seal of M.** (`q_seal_of_m`): clues via Osric (the seal), Agnes's ledger, Hank's tanker stories, Delphine's shard analysis, Pip's humming vault. Endings: *exposed* (Osric; lens requisitioned; scandal), *restored* (steal the lens and set it in the cradle), *blackmailed* (+150 obols, a lasting enemy), *bargained* (15 shares and the run of the manor).

## Routine

07:00 breakfast · 08:00 study · 10:00 inspects the fields · 11:30 study · 12:45 lunch · 13:30 the Quay (eyeing the harbour; on day 2+ he tries to buy the Kettle & Crumb) · 15:30 study · 19:00 cards and cigars · 21:00 bed. Impulses: leans on the refinery; glares at pickets during a strike.

## Audio

Motif `motif_moneybucks` — "Dividends", a pompous low brass figure in B♭. Voice: deep clipped square wave (135 Hz).

## Tests

`tests/character_moneybucks.test.mjs` — tiers, investing gate, schedule, 14-resident day, invitation, shifts, dividends/projects/slick, the Ledger and etiquette, strike (both resolutions), all four mystery endings, buyout, save/load and old-save compatibility.
