# Prompt 20 — Extend the corporate empire

Use when working on the companies, groups, managers, markets, central bank, bonds, loans or geopolitics (the staged programme in `docs/CORPORATE_AUDIT.md`), or when any business needs to move money.

Read first: `docs/CORPORATE.md`, `docs/CORPORATE_AUDIT.md`, `src/systems/corporate.js`, `src/corp/*.js`, `src/content/corporate.js`, and the business you touch (`docs/ARMS.md`, `LOGISTICS.md`, `AEROSPACE.md`, `FARMING.md`).

Rules:
- **All company money goes through `game.corp`** (`pay`, `receive`, `canAfford`, `cashOf`, `found`). Never write `player.money` for a business again; share trades, dividends and other personal money stay on the wallet.
- A budget, a valuation, a ranking or a consolidated figure is **never cash**. Funding is an explicit, logged act; a funded company that cannot pay refuses (or owes, for a bill that must be met) — nothing is received for nothing.
- Generated entities (companies, later candidates and managers) are made **once** from a saved seed, stored in full, and never regenerated; randomness is a hash of the seed and the id, never the shared RNG.
- Figures come from the books each business keeps (`metricsOf`); a figure not kept is `null` and shown as "—". Never fabricate to fill a table.
- Migrations grant nothing: no money, shares, loans, businesses, employees; nothing is auto-consolidated. Test with `tests/fixtures/save-v0.59.0-four-businesses.json` (a real pre-v0.60 save).
- Keep each stage independently testable, commit each part green, and gate payment-layer changes on the existing suite passing **unedited**.
- Managers (stage 7) act only through validated services within budgets and permissions; the owner chose that they may also build or buy from **pre-approved plans** (each asset type needs an explicit placement rule).
- The group: money to a subsidiary only through the parent; transfers are never trading income and must keep the total cash unchanged; whatever is internal to the group is eliminated in consolidation (and a charge a buyer has capitalised stays deferred until it is used); monthly jobs are keyed by month and must run once under save/load.
- People (v0.62): a person is one job at one employer, paid from that employer's own account once a day, and does nothing while unpaid; an effect is a bounded change to money actually paid or output actually made, applied at the point of payment or production, and zero without the thing it acts on; nobody hired must change nothing (prove it by running the previous release beside the new one); skills grow from results only; authority is data until a stage enforces it.
- Deliver: tests (rules, persistence, old-save load), docs, a browser check of every screen touched, and an honest report of what is and is not done.
