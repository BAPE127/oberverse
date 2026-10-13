# 08 — Audio Design

**Purpose:** Create and integrate original music, motifs, SFX and ambience.

**Required input:** what is needed (a location theme, a motif for a character, a sound for an interaction).

**Read first:** `docs/AUDIO_GUIDE.md`, `src/content/audio.js`, `src/audio/*.js`.

## Scope & constraints

- Original work only. No copyrighted melodies or recordings.
- Music: write real progressions and melodies; make the melody fill whole bars; give each location a distinct character within the shared warm palette.
- Motifs: 4–8 notes that express the character; assign an instrument that suits their voice.
- Mix: respect bus levels; avoid harsh highs and clipping; ambience stays under music.
- Everything must fail silently (wrap new code paths like existing ones).
- File-based assets (if ever added) need attribution and licence notes in the registry.

## Deliverables

Note data / synthesis code, `AUDIO_REGISTRY` entries, `docs/AUDIO_GUIDE.md` rows, references from content (maps/characters/effects).

## Testing

`npm run check` (compiles every song, checks registry coverage); `npm run smoke` (no page errors); **state plainly that you could not listen** if you only ran headless.

## Must not change without justification

Existing audio ids; bus structure; autoplay-safe initialisation.

## Report

Standard completion report, plus the musical description of each piece (key, tempo, instrumentation, mood).
