// Tibbs Hollow — original Oberverse resident (not an imported character).
export default {
  id: 'npc_tibbs',
  name: 'Tibbs Hollow',
  shortName: 'Tibbs',
  tier: 'major',
  origin: 'original',
  role: 'Mechanic at Hollow Fixings on the Quay; inventor of things that should not exist.',
  faction: 'fac_quay',
  dialogue: 'dlg_tibbs',
  shop: 'shop_hollow',
  motif: 'motif_tibbs',
  voice: { wave: 'square', pitch: 420, variance: 90, rate: 0.75 },
  appearance: {
    skin: '#8d5a3b', hair: '#1f1a17', hairStyle: 'messy', outfit: '#c78d2a', undershirt: '#e9e2d0',
    accent: '#5b7f9a', accessory: 'goggles', build: 'wiry', height: 0.98,
    sprite: null, portrait: null,
  },
  personality: {
    traits: ['impulsive', 'enthusiastic', 'oversharer', 'loyal'],
    sociability: 0.75, patience: 0.2, confidence: 0.8, impulsiveness: 0.9, honesty: 0.8,
    curiosity: 0.95, competitiveness: 0.55, humor: 0.85, empathy: 0.65, riskTolerance: 0.9,
    conscientiousness: 0.3, discretion: 0.05,
    values: ['making things', 'loyalty', 'freedom from forms'],
    likes: ['junk', 'engines', 'coffee', 'people who listen'], dislikes: ['citations', 'gulls', 'being told to wait'],
  },
  speech: {
    formality: 0.05, verbosity: 0.6,
    habits: ['short exclamations', 'invents words', 'changes subject mid-sentence'],
    rumorPrefix: 'Okay so apparently', factPrefix: 'Saw it myself —', refuse: 'Ooh. Nope. Even I know not to blab that one.',
  },
  mechanics: {
    buysJunk: true,
  },
  punctuality: -10,
  walkSpeed: 1.15,
  schedule: [
    {
      from: '07:30', to: '09:00', activity: 'eat', spot: 'cafe:table_center', label: 'breakfast',
      onArrive: [{ consume: { shop: 'shop_kettle', item: 'item_coffee', then: [{ mood: { id: 'cheerful', minutes: 120 } }], else: [{ mood: { id: 'grumpy', minutes: 90 } }] } }],
    },
    { from: '09:00', to: '13:00', activity: 'work', spot: 'workshop:bench' },
    { from: '13:00', to: '14:00', activity: 'wander', spot: 'lanternside:quay_edge' },
    { from: '14:00', to: '18:00', activity: 'work', spot: 'workshop:bench' },
    { from: '18:00', to: '21:00', activity: 'fish', spot: 'lanternside:pier_end' },
    { from: '21:00', to: '01:00', activity: 'tinker', spot: 'workshop:engine' },
    { from: '01:00', to: '07:30', activity: 'sleep', spot: 'workshop:cot' },
  ],
  impulses: [
    {
      id: 'tinker_itch', activity: 'tinker', spot: 'workshop:engine', label: 'struck by an idea',
      trait: 'impulsiveness', weight: 1.2, duringActivity: ['work', 'wander'], duration: 50, moods: { grumpy: 0.25, cheerful: 0.1 },
    },
    {
      id: 'gull_watch', activity: 'wander', spot: 'lanternside:park_pond', label: 'keeping an eye on the gulls',
      trait: 'curiosity', weight: 1.15, duringActivity: ['wander', 'fish'], duration: 40,
    },
  ],
  relationships: {
    player: { trust: 0, affection: 5, respect: 0, suspicion: 0 },
    npc_mags: { trust: 30, affection: 35, respect: 20, suspicion: 0 },
    npc_osric: { trust: 0, affection: -10, respect: 5, suspicion: 5 },
    npc_moneybucks: { trust: -5, affection: -5, respect: 15, suspicion: 10 },
    npc_mason: { trust: 25, affection: 20, respect: 30, suspicion: 0 },
    npc_barnaby: { trust: 5, affection: -15, respect: 20, suspicion: 10 },
    npc_hank: { trust: 20, affection: 25, respect: 10, suspicion: 0 },
    npc_otto: { trust: 10, affection: 15, respect: 10, suspicion: 0 },
  },
  knowledge: ['fact_lighthouse_dark', 'fact_hatch_exists', 'fact_tibbs_lost_spanner', 'fact_gulls_organised'],
  giftPrefs: { item_coffee: 8, item_brass_cog: 10, item_bolts: 4, item_gull_feather: 6, tags: { mechanical: 5, food: 3 } },
  reactions: {
    fact_osric_citation: { bark: 'Form 7-B. SEVEN. B.' },
  },
  notices: [],
  opinions: {
    npc_mags: {
      warm: 'Mags! Best human. Feeds me. Doesn\'t ask what the smell is.',
      cool: 'Mags told everyone about the toaster incident. EVERYONE.',
    },
    npc_mason: {
      warm: 'Mason let me tune up his excavator. Best afternoon of my life. He made eleven "gear" puns. Worst afternoon of my life.',
      cool: 'Mason keeps calling me a "nuts-and-bolts kind of guy". I AM. That\'s not a joke, Mason!',
    },
    npc_barnaby: {
      warm: 'Barnaby\'s alright. Big lad. Wrong about gulls.',
      cool: 'Barnaby\'s "Margaret" stole my sandwich. A whole sandwich. And he TOOK HER SIDE.',
    },
    npc_moneybucks: {
      warm: 'Sir Moneybucks? He\'s a villain. But have you SEEN his pumpjacks? Gorgeous. I\'d die for one of those gearboxes. Not literally. Probably.',
      cool: 'Moneybucks offered me a job. "Mechanic, third class." THIRD. I\'m at least second.',
    },
    npc_hank: {
      warm: 'Hank! Fishing buddy! We\'ve caught zero fish together. It\'s a record.',
      cool: 'Hank still owes me a bait bucket.',
    },
    npc_osric: {
      warm: 'Osric\'s alright. Under the forms. Way under. Like, geologically.',
      cool: 'Osric thinks noise is a crime. Noise is just music that hasn\'t found its audience!',
    },
  },
};
