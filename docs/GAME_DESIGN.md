# Game Design — the established vision

This is the index of what the game is meant to be. It records direction the owner has set; change it only on the owner's word. Detail lives in the linked documents, which stay authoritative for their subject.

## What Oberverse is

An open-world sandbox RPG, inspired at a high level by the freedom and systemic interactions of *Streets of Rogue 2* (no content, assets or distinctive mechanics copied). The player lives in a world that keeps going without them, and may become a neighbour, a thief, a tycoon, a president or a mercenary general, or none of these.

Priorities and pillars: `PROJECT_OVERVIEW.md`. Setting, tone and places: `WORLD_BIBLE.md`, `GEOGRAPHY.md`, `ATLAS.md`. Characters: `CHARACTER_REGISTRY.md`, `characters/`.

## What it must support

| Pillar | Direction | Detail |
| --- | --- | --- |
| Open world | Exploration without chapters or gates; the world is open and reactive | `WORLD_BIBLE.md`, `ATLAS.md` |
| Player choice | Several ways through every problem, from shared systems (keys, ownership, witnesses, relationships, reputation, items, time) | `PROJECT_OVERVIEW.md`, `CONTENT_FORMAT.md` |
| Combat and non-violence | Combat is one system among many, never the only way through ordinary content | `ARCHITECTURE.md` (Combat), `ARMS.md` |
| Living NPCs | Homes, schedules, jobs, relationships, social life, personal errands, a part in the economy, reactions to events and to the player's businesses; simulated in tiers by distance and relevance | `WORLD_SIMULATION.md`, `ARCHITECTURE.md` |
| Economy and business | Connected industries: manufacturing, shipping and logistics, aerospace, agriculture, oil, banking, public companies, groups and subsidiaries, managers, supply chains, reports, an exchange, competitors. Real operational and financial consequences; no isolated screens | `CORPORATE.md`, `LOGISTICS.md`, `AEROSPACE.md`, `FACTORY.md`, `FARMING.md`, `SHIPS.md`, `SHIPBUILDING.md`, `PORTS.md`, `CASINO.md`, `PROPERTIES.md` |
| Politics | Participation, institutions, elections, influence, wars and embargoes. Optional | `POLITICS.md` |
| Military | A company the player may found: organisation, tactical battles, strategic command, permanent losses, modern to futuristic technology. Optional | `WAR.md` |
| Transport | Cars, buses, ships, aircraft | `VEHICLES.md`, `FLEET_COMMAND.md` |
| Progression | Long-term, through what the player builds and who they know, not levels behind gates | `ROADMAP.md` |
| Emergence | Events arise from the systems meeting, not from scripts | `ARCHITECTURE.md` (Quests and events) |

## Standing constraints

- One self-contained `index.html`; offline; no server, paid API or AI service in play.
- Authored, local dialogue and NPC logic.
- Imported characters are built from the owner's interview (`CHARACTER_IMPORT.md`) and cannot be harmed (the Wrath).
- Saves are never disposable.

## Decisions and plans

The owner's dated design decisions are recorded in `ROADMAP.md` (sections 0, 4 and 6). Proposals (`PROPOSAL_*.md`, `WORLD_ATLAS_PROPOSAL.md`, `POST_WAR_EXPANSION_PLAN.md`) are the history of how each update was agreed; where a proposal and the roadmap disagree, the roadmap wins.
