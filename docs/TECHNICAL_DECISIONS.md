# Technical Decisions

The single record of architectural decisions and why they were made. Add an entry when a choice constrains future work; never delete one, supersede it. Design decisions (what the game does) belong in `ROADMAP.md` section 4.

| # | Date | Decision | Why | Status |
| --- | --- | --- | --- | --- |
| TD-1 | 2026-10-13 | Plain JavaScript ES modules, no dependencies, no framework | Readable source, nothing to install or license; the simulation runs in Node for tests | In force |
| TD-2 | 2026-10-13 | Players get one generated, self-contained `index.html` (`tools/build.mjs`, an in-repo bundler); it is committed | Opens by double-click and on GitHub Pages with no server; a test fails when it is stale | In force |
| TD-3 | 2026-10-13 | Canvas 2D with procedural art; DOM overlay for UI; Web Audio synthesis for all sound | No asset pipeline or licences; accessible text and forms for free | In force |
| TD-4 | 2026-10-13 | Simulation is DOM-free and separate from `ui/`, `engine/`, `audio/` | The whole game can be tested headlessly | In force |
| TD-5 | 2026-10-13 | All state on one `Game` object; systems communicate over an event bus | One thing to save; systems do not import each other's internals | In force |
| TD-6 | 2026-10-13 | Content is declarative conditions and effects with two interpreters | Content cannot bypass systems; the validator can check every reference | In force |
| TD-7 | 2026-10-13 | `localStorage` saves with a versioned schema, migrations, backups, JSON export/import; IDs permanent | Offline, inspectable, old saves keep loading | In force (schema 1) |
| TD-8 | 2026-10-13 | Tests on Node's built-in runner; smoke test on Playwright against the real `index.html` over `file://` | No test dependencies; the smoke test sees what players see | In force |
| TD-9 | 2026-10-13 | NPCs simulated in tiers: physical near the player, abstract elsewhere | A populated world without paying for everyone every frame | In force |
| TD-10 | 2026-10-17 | Pixel pipeline: low-resolution world pass, full-resolution text and lighting; ground painted in cached chunks | The approved look at a steady frame rate | In force |
| TD-11 | 2026-10-18 | Interiors are laid over their buildings in the street map (seamless), joined by portals | No loading between street and room | In force |
| TD-12 | before 2026-11 | Money moves only through the company ledger and payment layer; the mercenary company's funds work like every other company's | One place to audit; nothing is paid twice or minted | In force |
| TD-13 | 2026-11-05 | Wars and embargoes have a single writer (politics diplomacy); other systems read | Arms market, shipping and the war company cannot disagree about who is at war | In force |
| TD-14 | 2026-11-03 | Smaller roadmap stages are batched into full releases; each stage is still tested inside the batch | Fewer full-suite runs and release rounds | In force |
| TD-15 | 2026-11-12 | Development is run as a Fable-led organisation: Sonnet implements, Haiku supports, Opus reviews selectively. Definitions in `.claude/agents/`, rules in `.claude/rules/`, instructions in `CLAUDE.md` | The owner's operating brief; more finished work per unit of subscription usage | In force |
| TD-16 | 2026-11-12 | Existing documents are reused under their existing names: `docs/ROADMAP.md` is the project roadmap, root `CHANGELOG.md` is the changelog. No `docs/PROJECT_ROADMAP.md` or `docs/CHANGELOG.md` duplicates | One authoritative home per fact; links in 40-odd documents keep working | In force |
| TD-17 | 2026-11-12 | The flat `tests/` directory and the existing `src/` layout stay as they are | 163 test files and the build depend on the paths; reorganising buys nothing | In force |
| TD-18 | 2026-11-12 | The world is drawn in a 2:1 isometric view built in Canvas 2D on the existing renderer (owner's decision; replaces the top-down view). No rendering library: the three.js study on `claude/kind-rubin-3nafrm` is reference only. Depth order is a topological sort on ground boxes, not a single key (Opus review). Design: `RENDERING.md` | Zomboid-style volume and occlusion while keeping TD-1 (no dependencies), the pixel art and the single-file build | In force; in progress |

Dates before 2026-11-12 are taken from the changelog and workflow notes during the repository audit; TD-12's exact date was not traced.
