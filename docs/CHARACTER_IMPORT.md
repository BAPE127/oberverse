# Character Import Pipeline

How a player-supplied character (an uploaded image plus a description) becomes a working resident of the Oberverse. **Never implement a character before the interview.** Never run this procedure at project start-up — only when the player actually supplies a character.

## 1. Receive the material

- Look at the image for **visual facts only**: colours, hair, clothing, accessories, build, notable silhouette features.
- Do **not** infer personality, beliefs, history, gender identity, pronouns or behaviour from appearance. Ask.
- Ask whether the player is happy for the image itself to be stored in the project (`assets/portraits/`). If not, keep only the derived appearance data.

## 2. Adaptive interview

Ask a few targeted questions at a time (3–5 per round, 1–3 rounds). Offer: *skip*, *write a description instead*, or *invent something reasonable*. Follow up only when an answer is unclear or opens a design opportunity.

Round 1 — who they are:
1. Who is this, in a sentence or two? (Name; existing character or original?)
2. How do they talk — vocabulary, tone, accent, catchphrases?
3. What do they want, and what are they afraid of?
4. How do they treat the player at first — and what would win them over or turn them against the player?

Round 2 — how they fit (adapt to round 1):
5. What would they do for a living or a pastime in Lanternside? (Offer 2–3 concrete fits from `docs/WORLD_BIBLE.md`.)
6. How should they relate to Mags, Osric and Tibbs (and any other residents)?
7. How important should they be — a major resident with storylines, or a recurring minor face?
8. Anything specific you want: activities, a quest, jokes, references, mechanics?

Round 3 — boundaries and depth:
9. Anything to avoid — topics, behaviours, interpretations?
10. Moral lines: what would they never do? What would they do that others wouldn't?
11. How deep should conversations go (a handful of topics vs. extensive)?

For an existing fictional character, preserve recognisable qualities but write original lines in the Oberverse's tone; do not reproduce copyrighted dialogue or scripts.

## 3. Design preview (show before building)

```
NAME (npc_<id>) — tier
Look: <how the image becomes the procedural sprite: hair style, colours, accessory, build>
Personality: <3–5 traits> · numbers that drive systems: sociability x, conscientiousness y, impulsiveness z, discretion d …
Voice: <speech habits> · sample lines: "…", "…"
Role & routine: <job/pastime, home, workplace, daily schedule in 4–6 blocks>
Mechanics: <1–3 character-specific mechanics built from shared systems>
Relationships: <with each existing resident and the player>
Hooks: <activities/quest ideas>
Audio: <motif idea and voice blip settings>
Avoid: <boundaries>
```

Ask the player to correct misunderstandings. Then implement — the goal is the character in the game, not a biography.

## 4. Implementation checklist

1. Choose a permanent id `npc_<name>`; add a row to `docs/CHARACTER_REGISTRY.md`.
2. Copy `docs/templates/character.template.js` → `src/content/characters/<name>.js`; set `origin: 'imported'`.
3. Copy `docs/templates/dialogue.template.js` → `src/content/dialogue/<name>.js`; write greetings (first meeting, moods, friendship, default variants), farewells, 6+ topics, ask-about entries, unknown lines, gifts, barks.
4. Appearance: map the image to `appearance` fields (see `docs/CONTENT_FORMAT.md#appearance` — top hats, beards, monocles etc. exist). If the player allows storing the image: keep the original in `assets/portraits/reference/`, save a ~224 px square crop to `assets/portraits/<id>.jpg`, run `node tools/embed-portraits.mjs`, and set `portrait: PORTRAITS.<id>` (data URIs keep the single-file `index.html` self-contained). Images fall back to procedural art if they fail to load.
   - Worked example: Sir Moneybucks (`docs/characters/npc_moneybucks.md`).
5. Schedule covering 24 h with spots on existing maps (add spots/interiors if needed — see the World Expansion prompt). Personality-driven impulses.
6. Mechanics: build from shared systems first (conditions/effects, knowledge, relationships, shops, containers, events). Add new condition/effect types only if truly needed (and test them).
7. Relationships both ways (edit existing characters' `relationships`/`opinions` too), initial knowledge, gift prefs, reactions, notices.
8. Audio: add `motif_<name>` to `MOTIFS` + `AUDIO_REGISTRY` + `docs/AUDIO_GUIDE.md`; set `voice`.
9. Optional quest/events in `quests.js`/`events.js`.
10. Register in `src/content/index.js`. Update `oberverse-manifest.json` `importedCharacters`.
11. `npm run check`; add a test file `tests/character_<name>.test.mjs` covering greeting, a mechanic, schedule placement and save/load.
12. `npm run build`, play it in the browser (open `index.html`), `npm run smoke`.
13. Write `docs/characters/<id>.md` (interview summary, design decisions, what was invented vs. supplied).
14. MINOR version bump; changelog.

## Save compatibility

Adding a character never breaks saves: `Game.loadState` creates characters that are missing from a save from their content profile. Never rename or remove an imported character's id; to retire one, give them a schedule elsewhere or mark them absent via a flag.
