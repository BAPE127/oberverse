// The Phonograph Grand (v0.52.0): the people of the casino resort on Market Street.
//
// Morganius Spade — IMPORTED (the owner's photo, stored with permission; interview 2026-10-18,
// see docs/characters/npc_morganius.md). A floating, theatrical wizard who hosts the tables: he
// flies to you when you sit down, deals with a flourish and makes cards do things cards shouldn't.
// Protected; his Wrath is a storm of cards.
//
// Octavius Thomas Phonograph — IMPORTED (from the owner's brief; interview 2026-10-18, see
// docs/characters/npc_octavius.md). Owns the resort, is about as rich as Sir Moneybucks (which of
// them is richer is a matter of furious, unspoken dispute), and is always on his phone. Protected;
// his Wrath is his private security and a call to his lawyers.
// ⚠ TEMPORARY LOOK: the owner is sending a picture of Octavius. Until then he wears the stand-in
// below (a dark suit, gold, the phone), flagged `appearance.temporary` — replace it from the
// picture when it arrives.
//
// Vera Lusk (the cage) and Brock Hadley (security) are the resort's staff — ordinary, generated
// characters (not protected).
import { PORTRAITS } from '../portraits.js';

export const morganius = {
  id: 'npc_morganius',
  name: 'Morganius Spade',
  shortName: 'Morganius',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_morganius_reference.jpg',
    interviewDate: '2026-10-18',
    notes: 'docs/characters/npc_morganius.md',
  },
  role: 'The Phonograph Grand\'s resident magician and host of its tables. He floats. He deals. He never, ever cheats — he says he has never needed to.',
  faction: null,
  dialogue: 'dlg_morganius',
  motif: 'motif_morganius',
  noSnitch: true, // what happens at the tables stays at the tables
  float: true, // he drifts a hand's breadth off the floor, and glides rather than walks (src/engine/cardMagic.js)
  voice: { wave: 'triangle', pitch: 112, variance: 30, rate: 1.0 },
  appearance: {
    skin: '#e2b294', hair: '#3a2a22', hairStyle: 'wizard', hatColor: '#3a3a42', hatBand: '#a8a8a0',
    outfit: '#2c2c34', robe: true, undershirt: '#1e2436', legs: '#22222a', shoes: '#141418',
    accessories: ['amulet'], accent: '#a04ae0', build: 'average', height: 1.02,
    sprite: null,
    portrait: PORTRAITS.npc_morganius,
  },
  personality: {
    traits: ['theatrical', 'sly', 'charming', 'scrupulously fair', 'a little sinister'],
    sociability: 0.95, conscientiousness: 0.7, impulsiveness: 0.45, curiosity: 0.8, discretion: 0.85,
    honesty: 0.75, competitiveness: 0.6, empathy: 0.55, confidence: 1, riskTolerance: 0.8, patience: 0.6, humor: 0.85,
    values: ['a good show', 'a fair game', 'an audience', 'the odds, told honestly'],
    likes: ['an audience', 'a fresh deck', 'people who lose gracefully', 'people who win loudly', 'a dramatic entrance'],
    dislikes: ['card counters (he admires them, but)', 'slot machines', 'being rushed', 'people who say "it\'s just a trick"'],
  },
  speech: {
    formality: 0.65, verbosity: 0.8,
    habits: ['calls you "my friend" and "my dear"', 'talks in threes', 'card metaphors for everything', 'announces his own entrances', 'tells you the odds — exactly — and smiles'],
    rumorPrefix: 'The cards tell me — and they gossip terribly —', factPrefix: 'Cards on the table, my friend:', refuse: 'Ah-ah. Some cards stay face down.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'cards', // a storm of cards (src/engine/wrath.js)
    color: '#b05af0',
    banner: 'THE HOUSE ALWAYS WINS',
    subtitle: 'Morganius Spade has a card for every occasion. This one is yours.',
    line: 'Ah-ah-ah. Nobody lays a finger on the dealer, my friend. Not in this house. Not in any house. …Pick a card. Any card. That one is you.',
  },
  combat: { never: true, maxHealth: 140 },
  punctuality: 0, // he arrives exactly when he means to
  walkSpeed: 0.95,
  schedule: [
    { from: '03:00', to: '10:00', activity: 'sleep', spot: 'phonograph_spade:bed' },
    { from: '10:00', to: '11:00', activity: 'eat', spot: 'phonograph_spade:ball', label: 'tea, and a look in the crystal ball' },
    { from: '11:00', to: '13:00', activity: 'practice', spot: 'phonograph_spade:chamber', label: 'rehearsing in his rooms' },
    { from: '13:00', to: '14:00', activity: 'eat', spot: 'phonograph_lobby:lounge_table', label: 'lunch in the Lucky Star Lounge' },
    { from: '14:00', to: '03:00', activity: 'perform', spot: 'phonograph_casino:m_stage', label: 'working the casino floor' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 10, affection: 20, respect: 5, suspicion: 5 },
    npc_octavius: { trust: 40, affection: 30, respect: 45, suspicion: 15 },
    npc_vera: { trust: 55, affection: 50, respect: 40, suspicion: 0 },
    npc_brock: { trust: 50, affection: 35, respect: 30, suspicion: 0 },
    npc_moneybucks: { trust: -5, affection: 10, respect: 25, suspicion: 30 },
  },
  knowledge: [],
  giftPrefs: { item_coffee: 4, item_cigar: 3, tags: { luxury: 6, junk: -3 } },
  reactions: {},
  notices: [],
  opinions: {
    npc_octavius: { warm: 'Octavius? A man of vision. Mostly the vision of a very small screen. He built me a stage forty floors under his bed. I adore him. Don\'t tell him.', cool: 'Octavius pays me to make his casino magical. Then he looks at his phone through the whole show. One day I shall turn it into a dove.' },
    npc_vera: { warm: 'Vera is the only honest cage in the city. She counts the chips twice and smiles once. I prize both.', cool: 'Vera thinks my card tricks are "a liability". She is not wrong. She is merely unfun.' },
    npc_brock: { warm: 'Brock is a wall with a heart in it. He catches what I drop. Usually aces.', cool: 'Brock once tackled one of my doves. We have since reconciled. The dove has not.' },
    npc_moneybucks: { warm: 'Sir Moneybucks plays cards beautifully and loses with dignity. He does not lose often. I find that delicious.', cool: 'Moneybucks asked me to "fix" a game once. I told him the only thing I fix is my hat. He has never forgiven the hat.' },
  },
};

export const octavius = {
  id: 'npc_octavius',
  name: 'Octavius Thomas Phonograph',
  shortName: 'Octavius',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: null, // the owner is sending a picture — until then, a temporary look (below)
    interviewDate: '2026-10-18',
    notes: 'docs/characters/npc_octavius.md',
  },
  role: 'Owner of the Phonograph Grand, and of a fortune that rivals Sir Moneybucks\'s. Always on his phone; rarely in the room he is standing in.',
  faction: null,
  dialogue: 'dlg_octavius',
  motif: 'motif_octavius',
  voice: { wave: 'sine', pitch: 128, variance: 10, rate: 1.45 },
  appearance: {
    temporary: true, // ⚠ a stand-in until the owner's picture arrives
    skin: '#d8a882', hair: '#1e1a1a', hairStyle: 'parted', outfit: '#1a1a22', pattern: 'pinstripe',
    undershirt: '#f4f2ee', tie: '#c9a24a', legs: '#1a1a22', shoes: '#0e0e12',
    accessories: ['watchchain'], accent: '#e8c35a', holding: 'phone', build: 'thin', height: 1.05,
    sprite: null,
  },
  personality: {
    traits: ['distracted', 'brilliant', 'impatient', 'polite in passing', 'ruthless in business'],
    sociability: 0.35, conscientiousness: 0.8, impulsiveness: 0.3, curiosity: 0.3, discretion: 0.95,
    honesty: 0.5, competitiveness: 0.9, empathy: 0.25, confidence: 0.95, riskTolerance: 0.85, patience: 0.15, humor: 0.3,
    values: ['the deal', 'the margin', 'his time', 'the Phonograph Grand'],
    likes: ['a good quarter', 'a full casino', 'brevity', 'a fully charged battery'],
    dislikes: ['being interrupted (by you)', 'low battery', 'Sir Moneybucks\'s name in the papers', 'small talk'],
  },
  speech: {
    formality: 0.5, verbosity: 0.15,
    habits: ['answers in a word or two', 'talks to the phone and you at once', 'never quite looks up', 'says "mm" a lot'],
    rumorPrefix: 'Mm. Heard', factPrefix: 'Fact:', refuse: 'Not now.',
  },
  wrath: {
    theme: 'security', // his security detail arrives, and so do his lawyers (src/engine/wrath.js)
    color: '#e8c35a',
    banner: 'SEE YOU IN COURT',
    subtitle: 'Octavius Thomas Phonograph\'s security and his lawyers have been notified. Simultaneously.',
    line: 'Hm? Oh. Yeah. Handle it. …Sorry — who was that? No, not you. Sell.',
  },
  combat: { never: true, maxHealth: 90 },
  punctuality: 5,
  walkSpeed: 1.1,
  schedule: [
    { from: '01:00', to: '06:30', activity: 'sleep', spot: 'phonograph_octavius:bed' },
    { from: '06:30', to: '07:30', activity: 'eat', spot: 'phonograph_octavius:bar', label: 'black coffee and the markets' },
    { from: '07:30', to: '12:00', activity: 'work', spot: 'phonograph_octavius:desk', label: 'on three calls at once' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'phonograph_lobby:lobby_seat', label: 'lunch in the lobby (on the phone)' },
    { from: '13:00', to: '16:00', activity: 'work', spot: 'phonograph_octavius:desk', label: 'in the penthouse, on the phone' },
    { from: '16:00', to: '20:00', activity: 'cashier', spot: 'phonograph_casino:cage_owner', label: 'at the cage, changing chips (and on the phone)' },
    { from: '20:00', to: '23:00', activity: 'leisure', spot: 'phonograph_casino:floor_watch_b', label: 'walking the floor' },
    { from: '23:00', to: '01:00', activity: 'work', spot: 'phonograph_octavius:desk', label: 'the overseas markets open' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 0, affection: 0, respect: 0, suspicion: 5 },
    npc_morganius: { trust: 35, affection: 20, respect: 40, suspicion: 20 },
    npc_vera: { trust: 60, affection: 10, respect: 45, suspicion: 0 },
    npc_brock: { trust: 50, affection: 5, respect: 25, suspicion: 0 },
    npc_moneybucks: { trust: -20, affection: -10, respect: 40, suspicion: 35 },
  },
  knowledge: [],
  giftPrefs: { item_coffee: 3, item_cigar: 2, tags: { luxury: 4, money: 6, junk: -6, food: -1 } },
  reactions: {},
  notices: [],
  opinions: {
    npc_morganius: { warm: 'Morganius? Best investment I ever made. Don\'t tell him. Mm.', cool: 'Spade turned my accountant into a pigeon. Temporarily. The pigeon was faster.' },
    npc_vera: { warm: 'Vera runs the cage. Hasn\'t been a chip out in six years.', cool: 'Vera wants a raise. Mm. Noted. Unnoted.' },
    npc_brock: { warm: 'Brock. Good on the door.', cool: 'Brock is large. That\'s the review.' },
    npc_moneybucks: { warm: 'Moneybucks? Old money. Oil. Respect. Sort of.', cool: 'Moneybucks. Mm. He\'s richer on paper. I\'m richer on everything else. — Don\'t quote me.' },
  },
};

export const vera = {
  id: 'npc_vera',
  name: 'Vera Lusk',
  shortName: 'Vera',
  tier: 'minor',
  origin: 'generated',
  faction: null,
  combat: { maxHealth: 80 },
  role: 'Head cashier of the Phonograph Grand. Runs the cage: obols in, chips out, and the other way round, to the last chip.',
  dialogue: 'dlg_vera',
  voice: { wave: 'sine', pitch: 205, variance: 12, rate: 1.1 },
  appearance: {
    skin: '#c48a62', hair: '#2a1e1a', hairStyle: 'bun', outfit: '#5a1a2a', undershirt: '#f4f2ee', tie: '#1e1a24',
    legs: '#1e1a24', shoes: '#141418', accessory: 'glasses', accent: '#c9a24a', build: 'thin', height: 0.97,
  },
  personality: {
    traits: ['precise', 'unflappable', 'dry', 'honest'],
    sociability: 0.5, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.9, honesty: 0.95, empathy: 0.55, confidence: 0.8,
  },
  speech: { rumorPrefix: 'Off the books —', factPrefix: 'For the record,', refuse: 'That\'s not a cage matter.' },
  walkSpeed: 1.0, punctuality: 0, impulses: [], notices: [], knowledge: [],
  noSnitch: true,
  schedule: [
    { from: '02:30', to: '09:30', activity: 'sleep', spot: 'phonograph_staff:bed_1' },
    { from: '09:30', to: '10:00', activity: 'eat', spot: 'phonograph_staff:table', label: 'toast, and the float counted' },
    { from: '10:00', to: '16:00', activity: 'cashier', spot: 'phonograph_casino:cage_cashier', label: 'running the cage' },
    { from: '16:00', to: '17:00', activity: 'eat', spot: 'phonograph_lobby:lounge_a', label: 'a break in the Lucky Star Lounge' },
    { from: '17:00', to: '20:00', activity: 'relax', spot: 'phonograph_staff:table', label: 'feet up in the staff quarters' },
    { from: '20:00', to: '02:00', activity: 'cashier', spot: 'phonograph_casino:cage_cashier', label: 'running the cage' },
    { from: '02:00', to: '02:30', activity: 'relax', spot: 'phonograph_staff:table', label: 'balancing the night\'s books' },
  ],
  relationships: {
    player: { trust: 0, affection: 5, respect: 0, suspicion: 5 },
    npc_octavius: { trust: 40, affection: 10, respect: 40, suspicion: 5 },
    npc_morganius: { trust: 30, affection: 45, respect: 25, suspicion: 15 },
    npc_brock: { trust: 60, affection: 40, respect: 30, suspicion: 0 },
  },
  giftPrefs: { item_coffee: 8, item_cigar: -2, tags: { food: 4 } },
  opinions: {
    npc_octavius: { warm: 'Mr Phonograph signs my pay on time. On his phone, but on time.', cool: 'Mr Phonograph has never once looked at the cage. He looks at the cage\'s numbers.' },
    npc_morganius: { warm: 'Mr Spade is lovely. And a liability. Lovely liability.', cool: 'Mr Spade made my float vanish once. It came back. With interest. That is NOT how a float works.' },
    npc_brock: { warm: 'Brock walks me to the lift after the night shift. Every night. Doesn\'t say a word. Good man.', cool: 'Brock eats my biscuits.' },
  },
};

export const brock = {
  id: 'npc_brock',
  name: 'Brock Hadley',
  shortName: 'Brock',
  tier: 'minor',
  origin: 'generated',
  faction: null,
  combat: { fights: true, defends: true, weapon: 'item_baton', maxHealth: 160 },
  role: 'Head of security at the Phonograph Grand. On the door by day, on the floor by night, and on the monitors in between.',
  dialogue: 'dlg_brock',
  voice: { wave: 'square', pitch: 90, variance: 8, rate: 0.8 },
  appearance: {
    skin: '#8a5a3a', hair: '#141210', hairStyle: 'bald', outfit: '#141418', undershirt: '#f4f2ee', tie: '#141418',
    legs: '#141418', shoes: '#0e0e12', accessories: ['shades'], accent: '#c9a24a', build: 'broad', height: 1.1,
  },
  personality: {
    traits: ['stoic', 'watchful', 'gentle off duty', 'literal'],
    sociability: 0.3, conscientiousness: 0.9, impulsiveness: 0.15, discretion: 0.95, honesty: 0.85, empathy: 0.6, confidence: 0.9,
  },
  speech: { rumorPrefix: 'Saw on the monitors:', factPrefix: 'Noted:', refuse: 'Can\'t say.' },
  walkSpeed: 0.95, punctuality: -5, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '04:30', to: '12:00', activity: 'sleep', spot: 'phonograph_staff:bed_2' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'phonograph_staff:table', label: 'six eggs' },
    { from: '13:00', to: '16:00', activity: 'work', spot: 'phonograph_lobby:doorman', label: 'on the front door' },
    { from: '16:00', to: '22:00', activity: 'work', spot: 'phonograph_casino:floor_watch', label: 'watching the floor' },
    { from: '22:00', to: '23:00', activity: 'eat', spot: 'phonograph_security:coffee', label: 'coffee in the security office' },
    { from: '23:00', to: '04:30', activity: 'work', spot: 'phonograph_security:desk', label: 'on the monitors' },
  ],
  relationships: {
    player: { trust: 0, affection: 0, respect: 0, suspicion: 10 },
    npc_octavius: { trust: 50, affection: 5, respect: 40, suspicion: 0 },
    npc_morganius: { trust: 40, affection: 30, respect: 35, suspicion: 10 },
    npc_vera: { trust: 70, affection: 55, respect: 50, suspicion: 0 },
  },
  giftPrefs: { item_coffee: 10, tags: { food: 6 } },
  opinions: {
    npc_octavius: { warm: 'Boss.', cool: 'Boss. Hasn\'t looked up since \'09.' },
    npc_morganius: { warm: 'Mr Spade is all right. Floats. You get used to it.', cool: 'Mr Spade\'s doves aren\'t on the guest list.' },
    npc_vera: { warm: 'Vera\'s good people.', cool: 'Vera says I eat her biscuits. I do.' },
  },
};

export default [morganius, octavius, vera, brock];
