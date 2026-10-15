// Captain Ober, of Ober & Sons Maritime. IMPORTED character (player-supplied
// photo and interview, 2026-10-15; see docs/characters/npc_ober.md).
// Owner's brief: "a very stereotypical sailor". Interview: an old salt (aye,
// port and starboard, weather lore — not a pirate); no relation to Ober's Oil
// (the name's a coincidence); retiring, so he sells you the company and looks
// for a worthy successor; jolly from the start, treats everyone as crew; an
// old smuggler who winks at your gun-running; Wrath: the kraken.
import { PORTRAITS } from '../portraits.js';

export const ober = {
  id: 'npc_ober',
  name: 'Captain Ober',
  shortName: 'Captain Ober',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_ober_reference.jpg',
    interviewDate: '2026-10-15',
    notes: 'docs/characters/npc_ober.md',
  },
  role: 'Founder of Ober & Sons Maritime at Mill Road Yards. A jolly old salt who is retiring and selling the company — and who treats everyone as crew.',
  faction: null,
  dialogue: 'dlg_ober',
  motif: 'motif_ober',
  noSnitch: true, // an old smuggler: what's in the crates is the crates' business
  voice: { wave: 'triangle', pitch: 120, variance: 22, rate: 0.95 },
  appearance: {
    skin: '#efc9ae', hair: '#8a4a2a', hairStyle: 'captain', hatColor: '#141c2c', hatBand: '#0c0f16',
    beard: '#8a4a2a', accessory: 'glasses',
    outfit: '#1a2236', undershirt: '#f4f2ee', tie: '#1a2a4a', legs: '#1a2236', shoes: '#14141a', accent: '#e0b84a', build: 'broad', height: 1.04,
    sprite: null,
    portrait: PORTRAITS.npc_ober,
  },
  personality: {
    traits: ['jolly', 'salty', 'superstitious', 'generous', 'old smuggler'],
    sociability: 0.9, conscientiousness: 0.6, impulsiveness: 0.4, curiosity: 0.55, discretion: 0.7,
    honesty: 0.6, competitiveness: 0.3, empathy: 0.8, confidence: 0.8, riskTolerance: 0.6, patience: 0.7, humor: 0.9,
    values: ['a good crew', 'the sea', 'a fair wage', 'a tall tale told well'],
    likes: ['tea with rum in it', 'weather', 'people who say "aye"', 'a well-coiled rope', 'his tug'],
    dislikes: ['whistling indoors', 'bananas on board', 'accountants (his sons)', 'flat calm'],
  },
  speech: {
    formality: 0.3, verbosity: 0.75,
    habits: ['calls everyone "shipmate"', 'reads the weather out loud', 'measures time in tides', 'every story is longer than the last telling', 'nautical words for everything ashore'],
    rumorPrefix: 'Word on the quay is,', factPrefix: 'Mark me, shipmate:', refuse: 'Ah, now — that\'s between me and the sea.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'kraken', // the cobbles split; tentacles rise and drag the attacker under (src/engine/wrath.js)
    color: '#3ab0c8',
    banner: 'THE DEEP REMEMBERS',
    subtitle: 'Captain Ober has friends below the waterline.',
    line: 'Ahh, shipmate. You don\'t raise a hand to the old man of the sea. She takes it personal. …Mind the puddles on your way home.',
  },
  combat: { never: true, maxHealth: 150 },
  punctuality: 10,
  walkSpeed: 0.95,
  schedule: [
    { from: '07:00', to: '08:00', activity: 'eat', spot: 'salty_ober:wheel', label: 'tea and the shipping forecast' },
    { from: '08:00', to: '12:30', activity: 'work', spot: 'ober_office:desk', label: 'at the harbour office' },
    { from: '12:30', to: '13:30', activity: 'eat', spot: 'yards:quay', label: 'lunch on the quay' },
    { from: '13:30', to: '17:30', activity: 'work', spot: 'ober_office:desk', label: 'at the harbour office' },
    { from: '17:30', to: '22:00', activity: 'leisure', spot: 'yards:ober_bollards', label: 'a pipe by the bollards, watching the harbour' },
    { from: '22:00', to: '07:00', activity: 'sleep', spot: 'salty_ober:bunk' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 20, affection: 25, respect: 5, suspicion: 0 },
    npc_lucas: { trust: 30, affection: 25, respect: 10, suspicion: 15 },
    npc_mason: { trust: 30, affection: 30, respect: 30, suspicion: 0 },
    npc_moneybucks: { trust: 10, affection: 10, respect: 15, suspicion: 10 },
    npc_chuckie: { trust: 80, affection: 75, respect: 55, suspicion: 0 }, // v0.29.0: forty years of friendship (and one crate of Gouda)
  },
  knowledge: [],
  giftPrefs: { item_coffee: 6, item_cigar: 8, tags: { food: 4 } },
  reactions: {},
  notices: [],
  opinions: {
    npc_lucas: { warm: 'Young Eastrise? Ran "agricultural machinery" with me back when he had hair. Good lad. Never trust his tide tables.', cool: 'Lucas still owes me for a crate of "tractor parts" that went over the side off Coup Cove. In \'ninety-one.' },
    npc_mason: { warm: 'Mason built my office. Square walls, straight roof, and a pun on every brick. Best builder on the coast.', cool: 'Mason tried to tell me a boat is "a building that floats". I\'ve not forgiven him.' },
    npc_moneybucks: { warm: 'Sir Moneybucks? No relation, before you ask. Everyone asks. I was Ober first — he only had oil.', cool: 'Moneybucks put his name on a refinery that was MY name first. I\'ve a lawyer. He\'s a seagull, but he\'s keen.' },
  },
};

export default [ober];
