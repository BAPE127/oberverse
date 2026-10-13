// TEMPLATE — copy to src/content/characters/<name>.js, fill in, and register in
// src/content/index.js. Every numeric personality field below is read by a
// system; delete fields you don't need rather than leaving decorative values.
export default {
  id: 'npc_example',                 // permanent; never rename after release
  name: 'Full Display Name',
  shortName: 'Short',
  tier: 'major',                     // major | minor
  origin: 'imported',                // original | imported
  importedFrom: {                    // imported characters only
    reference: 'assets/portraits/npc_example_reference.png', // the player's image, if they consent to storing it
    interviewDate: 'YYYY-MM-DD',
    notes: 'docs/characters/npc_example.md',
  },
  role: 'One sentence: who they are in Lanternside.',
  faction: 'fac_merchants',
  dialogue: 'dlg_example',
  shop: null,
  motif: 'motif_example',            // add to src/content/audio.js MOTIFS + AUDIO_REGISTRY
  voice: { wave: 'triangle', pitch: 300, variance: 40, rate: 1 }, // dialogue blips
  appearance: {
    skin: '#d9a77c', hair: '#2f2a35', hairStyle: 'short', outfit: '#3f7f8f', accent: '#f2c14e',
    accessory: 'none', build: 'average', height: 1,
    sprite: null,                    // e.g. 'assets/sprites/npc_example.png' (transparent, feet at bottom)
    portrait: null,                  // e.g. 'assets/portraits/npc_example.png' (square)
  },
  personality: {
    traits: ['…'],
    sociability: 0.5,       // chat frequency, gossip willingness
    conscientiousness: 0.5, // sticks to schedule, avoids chatting at work
    impulsiveness: 0.5,     // used by impulses with trait: 'impulsiveness'
    curiosity: 0.5,
    discretion: 0.3,        // suppresses gossip; protects secrets
    honesty: 0.5,
    values: [], likes: [], dislikes: [],
  },
  speech: {
    formality: 0.5, verbosity: 0.5, habits: ['…'],
    rumorPrefix: 'I heard', factPrefix: 'I know for a fact', refuse: 'That\'s not mine to tell.',
  },
  mechanics: {},           // e.g. { gossipBroker: true }
  punctuality: 0,          // minutes early (+) or late (-)
  walkSpeed: 1,
  schedule: [              // must cover all 24 hours; spots must exist on maps
    { from: '07:00', to: '22:00', activity: 'work', spot: 'lanternside:square_bench' },
    { from: '22:00', to: '07:00', activity: 'sleep', spot: 'lanternside:park_bench' },
  ],
  impulses: [
    // { id, activity, spot, label, trait, weight, duringActivity: ['work'], duration, cooldown, when, moods: { grumpy: 0.2 } }
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 0 } },
  knowledge: [],           // fact ids known from the start
  giftPrefs: { tags: {} },
  reactions: {},           // fact id -> { rel, relOverride, mood: {id, minutes}, bark }
  notices: [],             // { map, tag, text, importance }
  opinions: {},            // npc id -> { warm, cool }
};
