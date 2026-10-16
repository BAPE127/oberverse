// Lucas Eastrise, owner of Pipecreek Armory. IMPORTED character (player-
// supplied image and interview, 2026-10-13; see docs/characters/npc_lucas.md).
// Owner's brief: "generally a sleezy and creepy guy who has wild takes about
// the political landscape of the world"; after you buy a gun he pitches an
// arms manufacturing business.
import { PORTRAITS } from '../portraits.js';

export const lucas = {
  id: 'npc_lucas',
  name: 'Lucas Eastrise',
  shortName: 'Lucas',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_lucas_reference.jpg',
    interviewDate: '2026-10-13',
    notes: 'docs/characters/npc_lucas.md',
  },
  role: 'Owner of Pipecreek Armory. Sleazy, creepy, full of wild takes on world politics — and the man who will sell you an arms empire.',
  faction: null,
  dialogue: 'dlg_lucas',
  motif: 'motif_lucas',
  noSnitch: true,
  voice: { wave: 'triangle', pitch: 165, variance: 30, rate: 1.15 },
  appearance: {
    skin: '#ecc6a6', hair: '#3a281e', hairStyle: 'curly', accessory: 'glasses',
    outfit: '#8a5a3a', pattern: 'pinstripe', undershirt: '#1e1e22', tie: '#8a1e2a', legs: '#2a3a62', shoes: '#a8683a', accent: '#c9ced4', build: 'average', height: 1.1,
    sprite: null,
    portrait: PORTRAITS.npc_lucas,
  },
  personality: {
    traits: ['sleazy', 'creepy', 'conspiratorial', 'salesman', 'opportunist'],
    sociability: 0.8, conscientiousness: 0.45, impulsiveness: 0.6, curiosity: 0.85, discretion: 0.15,
    honesty: 0.2, competitiveness: 0.7, empathy: 0.15, confidence: 0.95, riskTolerance: 0.9, patience: 0.5, humor: 0.5,
    values: ['a sale', 'leverage', '"the truth"', 'other people\'s wars'],
    likes: ['customers who don\'t ask questions', 'red string', 'his own theories', 'standing slightly too close'],
    dislikes: ['regulators', '"mainstream" anything', 'personal space', 'refunds'],
  },
  speech: {
    formality: 0.35, verbosity: 0.8,
    habits: ['stands too close', 'compliments your hands', 'winks after facts', 'every topic becomes a conspiracy', 'knows things about you he shouldn\'t'],
    rumorPrefix: 'They don\'t want you to know this, but', factPrefix: 'Wake up:', refuse: 'That\'s classified. By me.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'arms', // crates of guns, a missile volley, a drone swarm, a SOLD tag (src/engine/wrath.js)
    color: '#d8a83a',
    banner: 'EVERYTHING IS FOR SALE',
    subtitle: 'Lucas Eastrise has your measurements. And your address.',
    line: 'Whoa. Whoa. You don\'t shoot the guy who SELLS the guns. That\'s biting the hand that arms you. …I\'ll put it on your account. I know where to send the bill.',
  },
  combat: { never: true, maxHealth: 140 },
  punctuality: 5,
  walkSpeed: 1,
  schedule: [
    { from: '08:30', to: '09:00', activity: 'eat', spot: 'gun_shop:lucas_desk', label: 'breakfast and the forums' },
    { from: '09:00', to: '13:00', activity: 'work', spot: 'gun_shop:counter_back', label: 'behind the counter' },
    { from: '13:00', to: '13:45', activity: 'eat', spot: 'gun_shop:lucas_desk', label: 'lunch at his desk' },
    { from: '13:45', to: '19:00', activity: 'work', spot: 'gun_shop:counter_back', label: 'behind the counter' },
    { from: '19:00', to: '23:30', activity: 'leisure', spot: 'atlas_1:desk', label: 'connecting red string (at home)' },
    { from: '23:30', to: '08:30', activity: 'sleep', spot: 'atlas_1:bed' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 10, affection: 15, respect: 5, suspicion: 0 },
    npc_lawrence: { trust: 20, affection: 10, respect: -10, suspicion: 10 },
    npc_moneybucks: { trust: 10, affection: 5, respect: 40, suspicion: 30 },
    npc_arthur: { trust: 0, affection: -5, respect: 20, suspicion: 20 },
    npc_ober: { trust: 35, affection: 30, respect: 25, suspicion: 5 },
  },
  knowledge: [],
  giftPrefs: { item_cigar: 10, item_coffee: 5, tags: { luxury: 6 } },
  reactions: {
    fact_player_murder: { rel: { respect: 5 }, bark: 'Somebody\'s been using their purchase. Love that for you.' },
  },
  notices: [{ map: 'gun_shop', tag: 'saw_player_armory', text: 'The newcomer came into the shop again. Lovely posture. Lovely hands.', importance: 2 }],
  opinions: {
    npc_lawrence: { warm: 'Chief Order? Great guy. Doesn\'t read the paperwork. My favourite kind of regulator.', cool: 'Order\'s a puppet. Whose? Exactly. Exactly.' },
    npc_moneybucks: { warm: 'Moneybucks gets it. Oil, guns — it\'s all the same pipe, different creek.', cool: 'Moneybucks owns the weather. I can\'t prove it. Yet.' },
    npc_ober: { warm: 'The Captain? We moved "tractor parts" together, back in the day. Very pointy tractors. Best smuggler I ever met — he can lie to a customs officer with his whole face.', cool: 'Ober says I owe him for a crate that went over the side in \'ninety-one. I say the sea owes HIM. Follow the tides, man.' },
    npc_arthur: { warm: 'Arthur Anderson? Small-time. Calculators. Cute.', cool: 'Arthur called me "a rounding error with a tie". I have a folder on him now.' },
  },
};

export default [lucas];
