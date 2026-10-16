// Marguerite "Mags" Pell — original Oberverse resident (not an imported character).
export default {
  id: 'npc_mags',
  combat: { fights: true, defends: ['npc_osric', 'npc_tibbs'] }, // fight-or-flight temperament (src/systems/combat.js)
  name: 'Marguerite "Mags" Pell',
  shortName: 'Mags',
  tier: 'major',
  origin: 'original',
  role: 'Owner of the Kettle & Crumb café; Canal Row\'s unofficial news service.',
  faction: 'fac_merchants',
  dialogue: 'dlg_mags',
  shop: 'shop_kettle',
  motif: 'motif_mags',
  voice: { wave: 'triangle', pitch: 330, variance: 50, rate: 0.9 },
  appearance: {
    skin: '#e8b894', hair: '#b5532a', hairStyle: 'bun', outfit: '#6a8f6b', apron: '#f4efe6',
    accent: '#d9826a', accessory: 'apron', build: 'round', height: 0.96,
    sprite: null, portrait: null,
  },
  personality: {
    traits: ['warm', 'nosy', 'generous', 'scorekeeping'],
    sociability: 0.92, patience: 0.6, confidence: 0.7, impulsiveness: 0.4, honesty: 0.75,
    curiosity: 0.85, competitiveness: 0.3, humor: 0.75, empathy: 0.8, riskTolerance: 0.35,
    conscientiousness: 0.7, discretion: 0.1,
    values: ['community', 'hospitality', 'knowing things first'],
    likes: ['gossip', 'flowers', 'being thanked'], dislikes: ['rudeness', 'waste', 'secrets kept from her'],
  },
  speech: {
    formality: 0.2, verbosity: 0.8,
    habits: ['endearments (petal, duck, love)', 'rhetorical questions', 'trails into tangents'],
    rumorPrefix: 'Well, I heard', factPrefix: 'I know for a fact', refuse: 'Ooh, no. That one\'s not mine to tell, petal.',
  },
  mechanics: {
    gossipBroker: true, // trades rumours with the player (dialogue "gossip" topic)
  },
  punctuality: 5,
  walkSpeed: 0.9,
  schedule: [
    { from: '05:30', to: '07:00', activity: 'bake', spot: 'cafe:oven', onArrive: [{ restock: 'shop_kettle' }] },
    { from: '07:00', to: '15:00', activity: 'work', spot: 'cafe:counter' },
    { from: '15:00', to: '16:30', activity: 'socialize', spot: 'lanternside:square_bench' },
    { from: '16:30', to: '21:00', activity: 'work', spot: 'cafe:counter' },
    { from: '21:00', to: '22:00', activity: 'leisure', spot: 'gullwing11_1:chair', label: 'feet up at home' },
    { from: '22:00', to: '05:30', activity: 'sleep', spot: 'gullwing11_1:bed' },
  ],
  impulses: [
    {
      id: 'patio_natter', activity: 'socialize', spot: 'lanternside:patio', label: 'popping out for a natter',
      trait: 'sociability', weight: 1.45, duringActivity: ['work'], duration: 20,
      when: { time: { from: '09:30', to: '14:00' } },
    },
  ],
  relationships: {
    player: { trust: 5, affection: 10, respect: 0, suspicion: 0 },
    npc_osric: { trust: 30, affection: 25, respect: 20, suspicion: 0 },
    npc_tibbs: { trust: 15, affection: 30, respect: 5, suspicion: 0 },
    npc_moneybucks: { trust: -20, affection: -30, respect: -5, suspicion: 20 },
    npc_mason: { trust: 40, affection: 35, respect: 30, suspicion: 0 },
    npc_mabel: { trust: -10, affection: -25, respect: 10, suspicion: 5 },
    npc_hank: { trust: 10, affection: 15, respect: 5, suspicion: 0 },
  },
  knowledge: ['fact_lighthouse_dark', 'fact_osric_sweet_tooth', 'fact_gulls_organised', 'fact_moneybucks_owns_oil', 'fact_mabel_mags_feud'],
  giftPrefs: { item_wildflowers: 10, item_gull_feather: -4, tags: { sweet: -1, flowers: 8 } },
  reactions: {
    fact_player_helped_tibbs: { rel: { affection: 4 }, bark: 'Finding Tibbs\'s spanner! Aren\'t you a treasure.' },
    fact_player_trespassed_lighthouse: { relOverride: { trust: -1, respect: 2 }, bark: 'Up the Point, were you? Ooh. Tell me EVERYTHING.' },
    fact_player_invested: { rel: { affection: -4 }, bark: 'Shares in Ober\'s Oil? Oh, petal.' },
    fact_player_backed_strike: { rel: { affection: 5, trust: 3 } },
    fact_player_broke_strike: { rel: { affection: -6, trust: -4 } },
    fact_player_exposed_moneybucks: { rel: { affection: 10, trust: 6 }, bark: 'You got HIM? Oh, come here, you marvellous duck!' },
    fact_buyout_offer: { mood: { id: 'grumpy', minutes: 360 }, bark: 'Sell my café? To HIM? I\'d sooner sell my grandmother. She\'d go for more, too.' },
  },
  notices: [],
  opinions: {
    npc_osric: {
      warm: 'Osric? Oh, he\'s a sweetheart wrapped in red tape. I\'ve known him since he was a tiny clerk. Well — a smaller clerk.',
      cool: 'Osric\'s been impossible lately. Forms for this, forms for that. I\'ll win him round. I always do.',
    },
    npc_mason: {
      warm: 'Mason\'s in every morning at half six. Pays for his coffee in puns. I charge him double. He pays that in puns too.',
      cool: 'If Mason tells me one more joke about "brew-tal honesty" I am banning him. For a day. I couldn\'t do longer. Don\'t tell him.',
    },
    npc_moneybucks: {
      warm: 'Sir Moneybucks tips well. In cigars. Nobody here smokes. That\'s the joke, I suppose.',
      cool: 'Sir Moneybucks. "Sir." He bought the title off a bankrupt baronet. He\'d buy my café too if I let him — and the gulls with it.',
    },
    npc_mabel: {
      warm: 'Mabel Quince? A fine cook. Never said otherwise. Never will, either.',
      cool: 'Mabel Quince stands outside my window every afternoon NOT speaking to me. Very loudly. Nine years over one bake-off. The judges were not bribed. Much.',
    },
    npc_tibbs: {
      warm: 'Tibbs is a dear. Eats like a gull, works like a gale, and sets things on fire at least once a week.',
      cool: 'Tibbs needs to learn that "nearly didn\'t explode" isn\'t a safety standard.',
    },
  },
};
