# Audio Guide

All audio in 0.1.0 is **original and synthesised at runtime** with the Web Audio API. There are no audio files, so nothing can fail to download; if Web Audio is unavailable the game runs silently and records the reason in `audio.failures` (shown in Settings and the debug overlay).

## Architecture

- `src/audio/audioEngine.js` — creates the `AudioContext` on the first click/key press (browser autoplay rules), master gain → compressor → output, with **music, sfx, ambience, voice** buses. Applies settings (master, music, SFX, ambience, voice volumes; mute). Picks music/ambience from the player's map and time of day every frame; crossfades.
- `src/audio/synth.js` — instruments: flute, clarinet, reed, brass, rhodes, rhodesPad, pluck, bell, pad, organ, bass, tuba, drone; drums: kick, snare, hat, shaker, brush, tick. Note/chord parsing.
- `src/audio/music.js` — `compileSong()` (pure, unit-tested) turns note data into a loop of events; `SongPlayer` schedules it with a 300 ms look-ahead; `playMotif()` plays character motifs.
- `src/audio/sfx.js` — procedural SFX and dialogue voice blips.
- `src/audio/ambience.js` — looping ambience beds with random details (gulls, cup clinks, workshop clanks).

## Composition format (`src/content/audio.js`)

```js
mus_example: {
  title: 'Name', bpm: 92, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.1,
  chords: ['Fmaj7', 'Dm7', ...],                  // one per bar
  melody: 'A4:2 C5:2 E5:3 D5:1 | F5:4 ...',       // NOTE:steps, '-' = rest, '|' = bar line
  lead: 'flute', pad: 'pad', bass: 'bass', bassPattern: 'R..5R.5.',  // R root, 3 third, 5 fifth, 8 octave, '-' hold
  drums: { kick: 'x...x...', hat: '..x...x.' },
}
```

The validator and tests check that every melody fills exactly `chords.length` bars.

## Registry

Status meanings: *planned* (not built), *placeholder* (temporary), *implemented* (in game), *tested* (covered by automated checks beyond "compiles").

| ID | Category | Method | Character / location | Trigger | Usage | Source | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mus_lanternside_day | music | note data, 16 bars F major, flute/pad/bass/light drums | lanternside | outdoors, daylight | "Lanternside Morning" — easygoing borough theme | Original | implemented (compile-tested) |
| mus_lanternside_night | music | 8 bars D dorian, rhodes | lanternside | outdoors, darkness > 0.5 | "Lamplight on the Canal" | Original | implemented (compile-tested) |
| mus_cafe | music | 3/4 waltz G major, clarinet/rhodes | cafe | inside the café | "Kettle & Crumb Waltz" | Original | implemented (compile-tested) |
| mus_civic | music | C major, reed/organ/tuba, ticking | civic_office | inside the Civic Office | "Form 12-C" | Original | implemented (compile-tested) |
| mus_workshop | music | A minor shuffle, pluck/organ/drums | workshop | inside Hollow Fixings | "Duchess Will Run" | Original | implemented (compile-tested) |
| mus_lighthouse | music | A minor ambient, bell/pad/drone | lighthouse | inside the lighthouse | "The Empty Cradle" | Original | implemented (compile-tested) |
| mus_home | music | Eb major, rhodes | player_flat, osric_house, bunkhouse | inside homes | "Number 9" | Original | implemented (compile-tested) |
| mus_manor | music | 3/4 waltz B♭ major, pluck/organ/tuba | manor | inside Moneybucks Manor | "The Moneybucks Waltz" — stately, a little smug | Original | implemented (compile-tested) |
| mus_refinery | music | D minor, brass/organ/tuba, kick/snare/tick clank | refinery | inside the refinery | "Refinery No. 1" — industrial march | Original | implemented (compile-tested) |
| mus_fields | music | E minor, flute/pad, slow kick | ober_fields | outdoors on the estate | "Derricks at Dusk" — wind-swept | Original | implemented (compile-tested) |
| mus_halvermouth | music | D dorian ii–V jazz, swung, clarinet/rhodes/bass, kick-hat-snare | halvermouth | outdoors in Halvermouth | "City of a Thousand Windows" | Original | implemented (compile-tested) |
| mus_westbrook | music | C major, swung, flute/pad/bass, kick+hat | westbrook, mason_office | outdoors in Westbrook by day; the site office | "Measure Twice" — bouncy, whistle-able | Original | implemented (compile-tested) |
| motif_mason | motif | G5 E5 G5 C6 · B5 C6 (flute) | npc_mason | dialogue opens | "Measure Twice" whistled — cheerful | Original | implemented |
| motif_moneybucks | motif | B♭2 F3 B♭3 D4 F4 · F4 B♭4 (brass) | npc_moneybucks | dialogue opens | "Dividends" — pompous low brass | Original | implemented |
| motif_mags | motif | F4 A4 C5 F5 (clarinet) | npc_mags | dialogue opens | "Kettle's On" — warm, rising | Original | implemented |
| motif_osric | motif | C4 · C4 · G4 · C5 (reed, staccato) | npc_osric | dialogue opens | "In Triplicate" — stiff march | Original | implemented |
| motif_tibbs | motif | E5 G5 E5 B5 A5 · F#5 (pluck) | npc_tibbs | dialogue opens | "Splonk" — bouncy, lopsided | Original | implemented |
| voice_blips | voice | per-character `voice` {wave, pitch, variance, rate} | all characters | dialogue typing | speech texture | Original | implemented |
| sfx_step | sfx | filtered noise, pitch by surface | player | walking | footsteps | Original | implemented |
| sfx_door | sfx | noise + low tone | — | map transitions | doors | Original | implemented |
| sfx_locked | sfx | rattles | — | locked door | feedback | Original | implemented |
| sfx_pickup | sfx | two-note blip | — | item acquired | feedback | Original | implemented |
| sfx_coin | sfx | two high tones | — | money changes | feedback | Original | implemented |
| sfx_ui_click / _open / _close | sfx | short tones | — | UI | feedback | Original | implemented |
| sfx_notify | sfx | bell pair | — | info toasts | feedback | Original | implemented |
| sfx_quest | sfx | rising arpeggio | — | quest start/stage/complete | feedback | Original | implemented |
| sfx_success / sfx_fail | sfx | tones | — | skill checks, failures | feedback | Original | implemented |
| sfx_bang | sfx | noise burst + boom | workshop | ev_workshop_bang (if heard) | event | Original | implemented |
| sfx_gull | sfx | three falling chirps | outdoors | ev_gull_heist, ambience | event | Original | implemented |
| sfx_pry | sfx | screech + thud | lighthouse hatch | prying the hatch | interaction | Original | implemented |
| sfx_swing / sfx_punch / sfx_whack / sfx_slash | sfx | filtered noise + falling sine | — | melee swings and hits (by weapon) | combat | Original | implemented |
| sfx_gunshot / sfx_gunshot_heavy / sfx_gunshot_smg | sfx | low-passed noise burst + square thump | — | gunfire (pistols; shotgun/rifle; SMG) | combat | Original | implemented |
| sfx_reload / sfx_dryfire / sfx_hurt | sfx | clicks; sawtooth yelp | — | reloading, empty gun, player hit | combat | Original | implemented |
| sfx_page / sfx_eat / sfx_sleep | sfx | noise/tones | — | reading, eating, sleeping | feedback | Original | implemented |
| amb_harbour | ambience | low-passed surf with swell LFO + gull calls | lanternside | outdoors | bed | Original | implemented |
| amb_indoor | ambience | quiet room tone | flat, office, house | indoors | bed | Original | implemented |
| amb_cafe | ambience | murmur band + cup clinks | cafe | café | bed | Original | implemented |
| amb_workshop | ambience | mains hum + clanks | workshop | workshop | bed | Original | implemented |
| amb_fields | ambience | wind band + pumpjack thump every ~2.4 s | ober_fields | outdoors on the estate | bed | Original | implemented |
| amb_city | ambience | low-passed traffic roar, 55 Hz hum, distant two-tone car horns | halvermouth | outdoors in the city | bed | Original | implemented |
| amb_site | ambience | soft wind bed, 38 Hz idling hum, random 2–3-tap hammering | westbrook | outdoors in Westbrook | bed | Original | implemented |
| amb_refinery | ambience | 50/100 Hz hum, steam hiss, clanks | refinery | refinery | bed | Original | implemented |
| amb_lighthouse | ambience | resonant wind | lighthouse | lighthouse | bed | Original | implemented |

The machine-readable registry is `AUDIO_REGISTRY` in `src/content/audio.js`; the validator fails if a song, motif, SFX or ambience lacks a registry entry or vice-versa.

## Honest quality note

These pieces are composed (chord progressions, written melodies, arranged parts) but performed by simple synthesis. They are coherent and intentional, not equivalent to a produced soundtrack. Recorded or professionally produced assets can replace them later: add a file-based player path in `AudioEngine.setMusic` and keep the same IDs.

Minor characters (the Ober's Oil staff) have voices but no individual motif, by design.

## Adding audio

1. Add data to `SONGS`/`MOTIFS` or a function to `SFX`/ambience `BEDS`.
2. Add a registry entry (and a row above).
3. Reference the ID from content (map `music`/`ambience`, character `motif`, effect `sfx`).
4. `npm run check`.
