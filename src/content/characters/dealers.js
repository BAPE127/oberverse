// The car dealers (v0.16.0 "On the Road"). Original characters written for the
// transportation update (owner's answer: new original NPCs; ordinary,
// killable characters). Marty Fender runs a sleazy used-car lot on Westbrook
// Row; Julian Beaumont runs a high-end showroom in Halvermouth's East End.
export const marty = {
  id: 'npc_marty', name: 'Marty Fender', shortName: 'Marty', tier: 'minor', origin: 'generated', faction: null,
  combat: { maxHealth: 90 },
  role: 'Owner, salesman and sole employee of Fender\'s Pre-Loved Motors, Westbrook Row. Sells three tired cars and buys anything with wheels, no questions asked.',
  dialogue: 'dlg_marty',
  voice: { wave: 'square', pitch: 190, variance: 40, rate: 1.35 },
  appearance: {
    skin: '#e8b48c', hair: '#1e1a1a', hairStyle: 'parted', outfit: '#8a6a2a', pattern: 'check', patternColor: 'rgba(240,200,90,0.5)',
    undershirt: '#f0e6c8', legs: '#4a3a2a', shoes: '#f2f0ea', accessories: ['shades', 'chain'], accent: '#e8c04a', build: 'round', height: 0.96,
  },
  personality: { traits: ['sleazy', 'relentless', 'charming', 'evasive'], sociability: 0.95, conscientiousness: 0.25, impulsiveness: 0.7, discretion: 0.85, honesty: 0.2, empathy: 0.35, confidence: 0.95 },
  speech: { rumorPrefix: 'Between you, me and the bonnet,', factPrefix: 'Hand on heart —', refuse: 'Can\'t talk about that. Legal reasons. Legal-ish reasons.' },
  walkSpeed: 1.0, punctuality: 25, impulses: [], notices: [], knowledge: [],
  noSnitch: true,
  schedule: [
    { from: '08:30', to: '19:00', activity: 'work', spot: 'westbrook:fender_pitch', label: 'working the lot' },
    { from: '19:00', to: '23:30', activity: 'relax', spot: 'fender_office:desk', label: 'counting the day\'s takings' },
    { from: '23:30', to: '08:30', activity: 'sleep', spot: 'fender_office:cot' },
  ],
  relationships: { player: { trust: 0, affection: 10, respect: 0, suspicion: 0 }, npc_julian: { trust: -10, affection: -20, respect: 15, suspicion: 20 }, npc_mason: { trust: 10, affection: 20, respect: 10, suspicion: 0 } },
  giftPrefs: { item_coffee: 4, item_cigar: 9, tags: { money: 8 } },
  opinions: {
    npc_julian: { warm: 'Julian Beaumont? Lovely suits. Terrible personality. Sells the same thing I sell — four wheels and a dream — at forty times the price.', cool: 'Beaumont once called my lot "a skip with bunting". The bunting is IMPORTED.' },
    npc_mason: { warm: 'Mason\'s my best customer. Bought the Mule twice. Same Mule. Long story.', cool: 'Mason keeps asking for his money back. On a SOLD AS SEEN vehicle. Tsk.' },
  },
};

export const julian = {
  id: 'npc_julian', name: 'Julian Beaumont', shortName: 'Julian', tier: 'minor', origin: 'generated', faction: null,
  combat: { maxHealth: 80 },
  role: 'Proprietor of the Beaumont Motor Gallery in Halvermouth\'s East End. Sells cars the way other people sell paintings: slowly, and only to the right sort of person.',
  dialogue: 'dlg_julian',
  voice: { wave: 'sine', pitch: 150, variance: 15, rate: 0.95 },
  appearance: {
    skin: '#f0d2b8', hair: '#c9c4bc', hairStyle: 'short', outfit: '#1e2230', undershirt: '#f4f2ee', tie: '#2a5a6a', legs: '#1e2230', shoes: '#2a1e18',
    accessories: ['watchchain'], accent: '#d9c08a', build: 'thin', height: 1.08,
  },
  personality: { traits: ['snobbish', 'polished', 'patient', 'precise'], sociability: 0.6, conscientiousness: 0.95, impulsiveness: 0.1, discretion: 0.9, honesty: 0.7, empathy: 0.4, confidence: 0.9 },
  speech: { rumorPrefix: 'One hears, in certain circles, that', factPrefix: 'I am reliably informed that', refuse: 'I\'m afraid that falls outside the remit of the Gallery.' },
  walkSpeed: 0.9, punctuality: 2, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '09:30', to: '18:30', activity: 'work', spot: 'beaumont_showroom:desk', label: 'at the showroom desk' },
    { from: '18:30', to: '23:00', activity: 'relax', spot: 'beaumont_showroom:lounge', label: 'with a small sherry' },
    { from: '23:00', to: '09:30', activity: 'sleep', spot: 'beaumont_showroom:chaise' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: -5, suspicion: 5 }, npc_marty: { trust: -30, affection: -10, respect: -30, suspicion: 40 }, npc_moneybucks: { trust: 30, affection: 20, respect: 40, suspicion: 0 } },
  giftPrefs: { item_coffee: 2, item_cigar: 6, tags: { luxury: 10 } },
  opinions: {
    npc_marty: { warm: 'Mr Fender is… enthusiastic. One admires enthusiasm, at a distance.', cool: 'Fender\'s "Pre-Loved Motors". Loved by whom, one wonders. And how roughly.' },
    npc_moneybucks: { warm: 'Sir Moneybucks is the Gallery\'s most valued patron. He has never once asked the price of anything. A true gentleman.', cool: 'Sir Moneybucks still owes for the second Regent. One does not mention it. I have just mentioned it. Forget I mentioned it.' },
  },
};

export default [marty, julian];
