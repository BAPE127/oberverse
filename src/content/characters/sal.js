// Sal Vage of Sal's Surplus Electronics, the docks. Generated for the gang
// update (owner's answer: "a shady parts supplier; carry parts yourself at
// first, delivery contracts later").
export const sal = {
  id: 'npc_sal', name: 'Sal Vage', shortName: 'Sal', tier: 'minor', origin: 'imported-generated', faction: null, noSnitch: true,
  combat: { never: true, maxHealth: 90 },
  role: 'Runs Sal\'s Surplus Electronics at the docks. Sells calculator parts, machinery and delivery contracts. Asks no questions.',
  dialogue: 'dlg_sal',
  voice: { wave: 'triangle', pitch: 180, variance: 25, rate: 1.2 },
  appearance: { skin: '#d9a77c', hair: '#8a8a8a', hairStyle: 'cap', hatColor: '#4a5a3a', outfit: '#6a7a4a', legs: '#3a3a2e', build: 'round', height: 0.97, accessory: 'glasses', accent: '#c9a24a' },
  personality: { traits: ['shifty', 'cheerful', 'discreet'], sociability: 0.7, conscientiousness: 0.5, impulsiveness: 0.4, discretion: 0.95, honesty: 0.45, empathy: 0.4, confidence: 0.7 },
  speech: { rumorPrefix: 'Not that I heard it from anyone, but', factPrefix: 'Hypothetically,', refuse: 'No questions asked. No answers given.' },
  walkSpeed: 0.95, punctuality: 10, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '07:45', to: '20:00', activity: 'work', spot: 'surplus:counter_back', label: 'behind the counter' },
    { from: '20:00', to: '07:45', activity: 'sleep', spot: 'atlas_3:bed' },
  ],
  relationships: { player: { trust: 5, affection: 5, respect: 0, suspicion: 5 }, npc_arthur: { trust: 10, affection: 0, respect: 20, suspicion: 20 } },
  giftPrefs: { item_coffee: 6, item_cigar: 8, tags: {} },
  opinions: { npc_arthur: { warm: 'Arthur buys his parts elsewhere. Says my margins are "an insult to arithmetic". Lovely man.', cool: 'Arthur threw a calculator at me once. Bought it first, mind.' } },
};

export default [sal];
