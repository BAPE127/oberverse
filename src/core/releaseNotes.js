// In-game release history (About screen). Keep in sync with CHANGELOG.md;
// tests/version.test.mjs checks the newest entry matches GAME_VERSION.
export const RELEASE_NOTES = [
  {
    version: '0.2.0',
    date: '2026-10-13',
    channel: 'development',
    title: 'Ober\'s Oil',
    notes: [
      'First imported character: Sir Richard E. Moneybucks, Esq., ruthless founder of Ober\'s Oil — with a portrait from the supplied image.',
      'A new district east of town, the Ober Fields: Moneybucks Manor, Refinery No. 1, the oil fields and the workers\' bunkhouse.',
      'Ten new residents: the Ober\'s Oil household and crew, each with a routine, personality and opinions of their boss.',
      'Work refinery shifts, buy shares and fund expansion, or challenge Sir Moneybucks to "The Ledger".',
      'New events: strikes, refinery accidents, a buyout bid for the Kettle & Crumb, and an oily canal.',
      'The lighthouse mystery continues in "The Seal of M." — with four endings, one of which lights the lamp.',
      'New music for the manor, refinery and fields; Sir Moneybucks\'s motif.',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-10-13',
    channel: 'development',
    title: 'Just Open It',
    notes: [
      'The game is now a single self-contained index.html: double-click it to play — no server, no installation, no internet.',
      'The same file works as a GitHub Pages link.',
      'Saves persist between sessions when the file is opened directly.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-13',
    channel: 'development',
    title: 'Foundations of Lanternside',
    notes: [
      'First playable build: explore Lanternside, five interiors, day/night cycle and world clock.',
      'Three original residents (Mags, Osric, Tibbs) with schedules, moods, memories, relationships and gossip.',
      'Quests with multiple solutions: The Dark Lamp, The Lucky Spanner, and a daily café delivery job.',
      'Inventory, money, shops, containers with ownership and witnessed theft, reputation with three factions.',
      'Emergent events: workshop explosions, noise citations, missing keys, sell-outs and gull heists.',
      'Original procedural soundtrack, ambience, sound effects, character motifs and voices.',
      'Versioned saves with validation, backups, migrations, import and export.',
    ],
  },
];
