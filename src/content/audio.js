// Audio registry and original compositions for the Oberverse.
// All audio is synthesised at runtime with the Web Audio API from the note
// data below (src/audio/). No external recordings are used.
// Melody syntax: "NOTE:steps" separated by spaces, bars separated by "|",
// "-" is a rest. Chords: one symbol per bar.

export const SONGS = {
  mus_lanternside_day: {
    title: 'Lanternside Morning', bpm: 92, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.1,
    chords: ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Am7', 'Bbmaj7', 'C7', 'Fmaj7', 'Dm7', 'Gm7', 'C7', 'Bbmaj7', 'Am7', 'Gm7', 'C7'],
    melody: 'A4:2 C5:2 E5:3 D5:1 | F5:4 E5:1 D5:1 C5:2 | D5:2 Bb4:2 G4:2 A4:1 Bb4:1 | C5:3 Bb4:1 G4:2 E4:2 | ' +
      'A4:2 C5:2 F5:3 E5:1 | E5:2 C5:2 A4:2 G4:2 | F4:2 A4:2 D5:2 C5:1 Bb4:1 | G4:4 -:2 C5:1 E5:1 | ' +
      'C5:2 A4:1 C5:1 F5:2 E5:2 | D5:3 C5:1 A4:4 | Bb4:2 D5:2 F5:2 E5:1 D5:1 | E5:4 D5:2 C5:2 | ' +
      'D5:2 F5:2 A5:3 G5:1 | E5:2 C5:2 A4:2 C5:2 | D5:2 Bb4:2 A4:2 G4:2 | E4:2 G4:2 C5:4',
    lead: 'flute', pad: 'pad', bass: 'bass', bassPattern: 'R..5R.5.', drums: { kick: 'x...x...', hat: '..x...x.', shaker: 'xxxxxxxx' },
  },
  mus_lanternside_night: {
    title: 'Lamplight on the Canal', bpm: 68, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.05,
    chords: ['Dm9', 'Bbmaj7', 'Gm9', 'A7sus4', 'Dm9', 'Fmaj7', 'Gm7', 'A7'],
    melody: 'A4:4 F4:2 E4:2 | D4:6 -:2 | Bb4:3 A4:1 G4:4 | E4:4 -:4 | A4:2 C5:2 D5:4 | C5:3 A4:1 F4:4 | G4:2 Bb4:2 D5:2 C5:2 | C#5:4 A4:4',
    lead: 'rhodes', pad: 'pad', bass: 'bass', bassPattern: 'R...5...', drums: { shaker: '..x...x.' },
  },
  mus_cafe: {
    title: 'Kettle & Crumb Waltz', bpm: 132, beatsPerBar: 3, stepsPerBeat: 2, swing: 0.08,
    chords: ['Gmaj7', 'Em7', 'Am7', 'D7', 'Bm7', 'E7', 'Am7', 'D7'],
    melody: 'D5:2 B4:2 G4:2 | E5:4 D5:2 | C5:2 E5:2 G5:2 | F#5:4 -:2 | F#5:2 D5:2 B4:2 | G#4:4 B4:2 | A4:2 C5:2 E5:2 | D5:4 -:2',
    lead: 'clarinet', pad: 'rhodesPad', bass: 'bass', bassPattern: 'R.5.5.', drums: { brush: 'x.x.x.' },
  },
  mus_civic: {
    title: 'Form 12-C', bpm: 100, beatsPerBar: 4, stepsPerBeat: 2, swing: 0,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Dm7', 'G7', 'C'],
    melody: 'E4:1 -:1 G4:1 -:1 C5:2 G4:2 | A4:2 C5:2 E5:4 | F4:1 -:1 A4:1 -:1 C5:2 A4:2 | G4:2 B4:2 D5:4 | ' +
      'E5:2 D5:2 C5:2 G4:2 | F4:2 A4:2 D5:4 | B4:2 D5:2 F5:2 D5:2 | C5:4 -:4',
    lead: 'reed', pad: 'organ', bass: 'tuba', bassPattern: 'R.5.R.5.', drums: { tick: 'x.x.x.x.' },
  },
  mus_workshop: {
    title: 'Duchess Will Run', bpm: 110, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.15,
    chords: ['Am7', 'D7', 'Am7', 'E7', 'Am7', 'D7', 'Am7', 'E7'],
    melody: 'A4:1 C5:1 E5:1 -:1 G5:1 E5:1 -:2 | F#5:2 D5:1 -:1 A4:2 C5:2 | E5:1 -:1 E5:1 D5:1 C5:2 A4:2 | G#4:2 B4:2 E5:4 | ' +
      'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2 | F#5:1 A5:1 F#5:1 D5:1 C5:2 A4:2 | C5:2 E5:2 D5:2 C5:2 | B4:2 G#4:2 A4:4',
    lead: 'pluck', pad: 'organ', bass: 'bass', bassPattern: 'R.R5.R8.', drums: { kick: 'x..x..x.', snare: '....x...', hat: 'x.x.x.x.' },
  },
  mus_lighthouse: {
    title: 'The Empty Cradle', bpm: 56, beatsPerBar: 4, stepsPerBeat: 2, swing: 0,
    chords: ['Am9', 'Fmaj7', 'Cmaj7', 'Em7'],
    melody: 'E5:4 -:4 | C5:4 A4:4 | G5:4 -:4 | B4:6 -:2',
    lead: 'bell', pad: 'pad', bass: 'drone', bassPattern: 'R-------',
  },
  mus_home: {
    title: 'Number 9', bpm: 76, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.08,
    chords: ['Ebmaj7', 'Cm7', 'Abmaj7', 'Bb7', 'Ebmaj7', 'Cm7', 'Abmaj7', 'Bb7'],
    melody: 'G4:2 Bb4:2 D5:4 | Eb5:3 D5:1 C5:4 | C5:2 Eb5:2 G5:3 F5:1 | D5:4 Bb4:4 | G4:2 Bb4:2 Eb5:4 | G5:2 F5:2 Eb5:4 | Ab4:2 C5:2 Eb5:2 C5:2 | D5:4 F5:4',
    lead: 'rhodes', pad: 'rhodesPad', bass: 'bass', bassPattern: 'R...5.R.', drums: { shaker: '..x...x.' },
  },
  mus_manor: {
    title: 'The Moneybucks Waltz', bpm: 108, beatsPerBar: 3, stepsPerBeat: 2, swing: 0,
    chords: ['Bbmaj7', 'Gm7', 'Cm7', 'F7', 'Dm7', 'Gm7', 'Cm7', 'F7'],
    melody: 'F5:2 D5:2 Bb4:2 | G5:3 F5:1 D5:2 | Eb5:2 C5:2 G4:2 | A4:4 C5:2 | F5:2 A5:2 F5:2 | D5:4 Bb4:2 | C5:2 Eb5:2 G5:2 | F5:4 -:2',
    lead: 'pluck', pad: 'organ', bass: 'tuba', bassPattern: 'R.5.5.', drums: { tick: 'x.....' },
  },
  mus_refinery: {
    title: 'Refinery No. 1', bpm: 96, beatsPerBar: 4, stepsPerBeat: 2, swing: 0,
    chords: ['Dm', 'Dm', 'Bb', 'A7', 'Dm', 'Dm', 'Gm', 'A7'],
    melody: 'D4:1 -:1 D4:1 F4:1 A4:2 -:2 | D4:1 -:1 D4:1 F4:1 G4:2 F4:2 | Bb3:2 D4:2 F4:2 D4:2 | A3:2 C#4:2 E4:2 G4:2 | ' +
      'D5:2 C5:1 A4:1 F4:2 D4:2 | F4:1 -:1 A4:1 -:1 D5:4 | G4:2 Bb4:2 D5:2 Bb4:2 | A4:4 C#5:2 E5:2',
    lead: 'brass', pad: 'organ', bass: 'tuba', bassPattern: 'R.R.R5R.', drums: { kick: 'x...x...', snare: '....x...', tick: 'x.x.x.x.' },
  },
  mus_fields: {
    title: 'Derricks at Dusk', bpm: 72, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.05,
    chords: ['Em7', 'Cmaj7', 'G', 'D', 'Em7', 'Cmaj7', 'Am7', 'B7'],
    melody: 'B4:4 E5:2 D5:2 | E5:6 -:2 | D5:2 B4:2 G4:4 | A4:6 -:2 | G4:2 B4:2 E5:4 | G5:4 E5:4 | C5:2 E5:2 A4:4 | D#5:4 B4:4',
    lead: 'flute', pad: 'pad', bass: 'bass', bassPattern: 'R...5...', drums: { kick: 'x.......' },
  },
  mus_halvermouth: {
    title: 'City of a Thousand Windows', bpm: 96, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.18,
    chords: ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7'],
    melody: 'A4:2 C5:2 F5:3 E5:1 | D5:4 B4:4 | E5:2 G5:2 B5:3 A5:1 | G5:4 E5:4 | F5:2 A5:2 C6:3 B5:1 | A5:2 G5:2 F5:4 | G5:2 E5:2 B4:2 D5:2 | C#5:6 -:2',
    lead: 'clarinet', pad: 'rhodes', bass: 'bass', bassPattern: 'R.5.8.5.', drums: { kick: 'x...x...', hat: 'x.x.x.x.', snare: '....x...' },
  },
  mus_westbrook: {
    title: 'Measure Twice', bpm: 118, beatsPerBar: 4, stepsPerBeat: 2, swing: 0.12,
    chords: ['C', 'F', 'G', 'C', 'Am7', 'Dm7', 'G7', 'C'],
    melody: 'E5:2 G5:2 C5:2 E5:2 | F5:3 E5:1 D5:4 | D5:2 G5:2 B4:2 D5:2 | E5:6 -:2 | C5:2 E5:2 A4:2 C5:2 | D5:2 F5:2 A5:4 | G5:2 F5:2 D5:2 B4:2 | C5:6 -:2',
    lead: 'flute', pad: 'pad', bass: 'bass', bassPattern: 'R.5.R.5.', drums: { kick: 'x...x...', hat: '..x...x.' },
  },
};

export const MOTIFS = {
  motif_mags: { title: 'Mags — "Kettle\'s On"', bpm: 140, notes: 'F4:1 A4:1 C5:1 F5:3', inst: 'clarinet', character: 'npc_mags' },
  motif_osric: { title: 'Osric — "In Triplicate"', bpm: 150, notes: 'C4:1 -:1 C4:1 -:1 G4:1 -:1 C5:2', inst: 'reed', character: 'npc_osric' },
  motif_moneybucks: { title: 'Sir Moneybucks — "Dividends"', bpm: 112, notes: 'Bb2:2 F3:1 Bb3:1 D4:2 F4:3 -:1 F4:1 Bb4:3', inst: 'brass', character: 'npc_moneybucks' },
  motif_mason: { title: 'Mason — "Measure Twice" (whistled)', bpm: 160, notes: 'G5:1 E5:1 G5:1 C6:3 -:1 B5:1 C6:2', inst: 'flute', character: 'npc_mason' },
  motif_tibbs: { title: 'Tibbs — "Splonk"', bpm: 170, notes: 'E5:1 G5:1 E5:1 B5:1 A5:1 -:1 F#5:2', inst: 'pluck', character: 'npc_tibbs' },
};

// Metadata registry (mirrored in docs/AUDIO_GUIDE.md). status: planned | placeholder | implemented | tested
const music = (id, location, trigger) => ({ id, category: 'music', method: 'procedural: note data in SONGS + src/audio/music.js', location, trigger, status: 'implemented', source: 'Original composition (Oberverse project)' });
const sfx = (id, trigger) => ({ id, category: 'sfx', method: 'procedural: src/audio/sfx.js', trigger, status: 'implemented', source: 'Original synthesis' });
const amb = (id, location) => ({ id, category: 'ambience', method: 'procedural: src/audio/ambience.js', location, trigger: 'player is on a map using this ambience', status: 'implemented', source: 'Original synthesis' });

export const AUDIO_REGISTRY = [
  music('mus_lanternside_day', 'lanternside', 'outdoors, daytime'),
  music('mus_lanternside_night', 'lanternside', 'outdoors, night'),
  music('mus_cafe', 'cafe', 'inside the Kettle & Crumb'),
  music('mus_civic', 'civic_office', 'inside the Civic Office'),
  music('mus_workshop', 'workshop', 'inside Hollow Fixings'),
  music('mus_lighthouse', 'lighthouse', 'inside the lighthouse'),
  music('mus_home', 'player_flat, osric_house, bunkhouse', 'inside homes'),
  music('mus_manor', 'manor', 'inside Moneybucks Manor'),
  music('mus_refinery', 'refinery', 'inside the refinery'),
  music('mus_fields', 'ober_fields', 'outdoors on the Ober Fields estate'),
  music('mus_halvermouth', 'halvermouth', 'outdoors in Halvermouth, day and night'),
  music('mus_westbrook', 'westbrook', 'Westbrook Lots by day and inside Mason\'s Os site office'),
  { id: 'motif_mason', category: 'motif', method: 'procedural: MOTIFS', character: 'npc_mason', trigger: 'conversation opens with Mason Nails', status: 'implemented', source: 'Original composition' },
  { id: 'motif_moneybucks', category: 'motif', method: 'procedural: MOTIFS', character: 'npc_moneybucks', trigger: 'conversation opens with Sir Moneybucks', status: 'implemented', source: 'Original composition' },
  { id: 'motif_mags', category: 'motif', method: 'procedural: MOTIFS', character: 'npc_mags', trigger: 'conversation opens with Mags', status: 'implemented', source: 'Original composition' },
  { id: 'motif_osric', category: 'motif', method: 'procedural: MOTIFS', character: 'npc_osric', trigger: 'conversation opens with Osric', status: 'implemented', source: 'Original composition' },
  { id: 'motif_tibbs', category: 'motif', method: 'procedural: MOTIFS', character: 'npc_tibbs', trigger: 'conversation opens with Tibbs', status: 'implemented', source: 'Original composition' },
  { id: 'voice_blips', category: 'voice', method: 'procedural: per-character voice params (characters/*.voice)', trigger: 'dialogue text typing', status: 'implemented', source: 'Original synthesis' },
  sfx('sfx_step', 'player footsteps (surface-dependent pitch)'),
  sfx('sfx_door', 'entering/leaving a building'),
  sfx('sfx_locked', 'trying a locked door'),
  sfx('sfx_pickup', 'item acquired'),
  sfx('sfx_coin', 'money gained or spent'),
  sfx('sfx_ui_click', 'menu button press'),
  sfx('sfx_ui_open', 'panel opened'),
  sfx('sfx_ui_close', 'panel closed'),
  sfx('sfx_notify', 'notification toast'),
  sfx('sfx_quest', 'quest started/advanced/completed'),
  sfx('sfx_fail', 'failed check / quest failed'),
  sfx('sfx_success', 'successful check'),
  sfx('sfx_bang', 'workshop explosion event'),
  sfx('sfx_gull', 'gull calls (ambience, gull heist)'),
  sfx('sfx_pry', 'prying the lighthouse hatch'),
  sfx('sfx_page', 'reading a document'),
  sfx('sfx_eat', 'eating or drinking'),
  sfx('sfx_sleep', 'sleeping'),
  sfx('sfx_swing', 'a melee attack whooshes'),
  sfx('sfx_punch', 'a punch or blunt blow lands'),
  sfx('sfx_whack', 'a club (bat, baton, crowbar) lands'),
  sfx('sfx_slash', 'a blade (machete, axe) lands'),
  sfx('sfx_gunshot', 'revolver or pistol shot'),
  sfx('sfx_gunshot_heavy', 'shotgun or rifle shot'),
  sfx('sfx_gunshot_smg', 'submachine gun shot'),
  sfx('sfx_reload', 'reloading a gun'),
  sfx('sfx_dryfire', 'firing an empty gun'),
  sfx('sfx_hurt', 'the player is hit'),
  sfx('sfx_wrath', '"The Oberverse Protects Its Own" — 8-second cutscene score when an imported character is attacked'),
  sfx('sfx_thunder', 'each lightning strike of the Wrath (arcane theme)'),
  sfx('sfx_gusher', 'each oil geyser in Sir Moneybucks\'s Wrath (ignites from the third)'),
  sfx('sfx_beam', 'each falling I-beam in Mason\'s Wrath; the fifth is the wrecking ball'),
  amb('amb_harbour', 'lanternside'),
  amb('amb_indoor', 'player_flat, civic_office, osric_house'),
  amb('amb_cafe', 'cafe'),
  amb('amb_workshop', 'workshop'),
  amb('amb_lighthouse', 'lighthouse'),
  amb('amb_fields', 'ober_fields'),
  amb('amb_refinery', 'refinery'),
  amb('amb_site', 'westbrook'),
  amb('amb_city', 'halvermouth'),
];
