# Prompt Bank — Index

Reusable prompts for Claude sessions or other AI agents working on the Oberverse. Paste the chosen prompt (plus your specific request) into a new session working in this repository.

## Read first — every task

1. `README.md`
2. `docs/PROJECT_OVERVIEW.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_WORKFLOW.md`
3. `VERSION`, `oberverse-manifest.json`, the top of `CHANGELOG.md`, `docs/KNOWN_ISSUES.md`
4. The prompt below for your task, and every file it lists.

Then run `npm run check` before changing anything.

## Which prompt?

| # | Prompt | Use when |
| --- | --- | --- |
| 01 | [Master Project Context](01-master-context.md) | Prepend to any task; gives identity, constraints, priorities. |
| 02 | [Project Onboarding](02-project-onboarding.md) | First session on a copy of the project, or after a long gap. |
| 03 | [Character Import](03-character-import.md) | The player supplies an image/description of a character to add. |
| 04 | [Character Expansion](04-character-expansion.md) | Deepen an existing character's dialogue, activities, mechanics. |
| 05 | [World Expansion](05-world-expansion.md) | New districts, interiors, props, environmental interactions. |
| 06 | [Quest & Minigame Development](06-quest-and-minigame.md) | New quests, jobs, activities built from existing systems. |
| 07 | [NPC Simulation](07-npc-simulation.md) | Schedules, brain, memory, relationships, knowledge, events. |
| 08 | [Audio Design](08-audio-design.md) | New music, motifs, SFX, ambience. |
| 09 | [Bug Investigation](09-bug-investigation.md) | A specific defect to reproduce and fix. |
| 10 | [Refactoring](10-refactoring.md) | Improve structure without changing behaviour. |
| 11 | [Save Migration](11-save-migration.md) | Any change to the save format. |
| 12 | [Release Preparation](12-release-preparation.md) | Cutting a version. |
| 13 | [Version Merge](13-version-merge.md) | Combining two copies/branches of the project. |
| 14 | [Emergency Recovery](14-emergency-recovery.md) | The project or saves are broken or half-changed. |
| 15 | [Independent Technical Audit](15-technical-audit.md) | Reviewing quality, accuracy and consistency. |
| 16 | [Prompt Bank Maintenance](16-prompt-bank-maintenance.md) | Procedures changed; prompts must follow. |
| 17 | [Add a Property Plot](17-property-plot.md) | The project owner asks for a building plot (home, rental or shop) somewhere on the map. |
| 18 | [Extend the Shipping Business](18-shipping-extension.md) | Ships, ports, contracts, or the later shipping stages (own-fleet exports, piracy, warships, missions, the shipyard). |
| 20 | [Extend the Corporate Empire](20-corporate-empire.md) | Companies and their accounts, groups, managers, markets, the central bank, bonds, loans, wars — anything that moves a business's money or compares companies. |
| 19 | [Extend the Living World](19-world-simulation.md) | Residents, homes, jobs, police beats and incidents, bus lines, errands and meet-ups, signature cars — or NPC driving. |

## Universal rules (apply to every prompt)

- Inspect the actual code before editing. Distinguish **verified** from **planned** functionality.
- Keep simulation code DOM-free; content declarative; IDs permanent.
- No external AI or network dependency in gameplay.
- Never claim a test, launch or check you did not run.
- Update docs in the same change as the code.

## Standard completion report

Every prompt ends with a report in this shape:

```
## Completion report
Task: …
Version: before → after
Changed files: …
Implemented: …
Tested and passed: … (commands + results)
Tested and failed: …
Partially implemented: …
Planned / not implemented: …
Unable to verify: …
Docs updated: …
Known issues added: …
Next steps: …
```
