// Halvermouth Police, Precinct 1. Chief Lawrence Order is an IMPORTED character
// (player-supplied image and interview, 2026-10-13; see
// docs/characters/npc_lawrence.md). His five officers and the prisoner in the
// next cell were generated at the player's request ("5 other officers… all
// officers should carry weapons… names should be justice based").
import { PORTRAITS } from '../portraits.js';

const UNIFORM = { hairStyle: 'cap', hatColor: '#1e2a44', outfit: '#1e2a44', legs: '#1a2236', shoes: '#14141a', accent: '#c9ced4', accessories: ['vest'], vestColor: '#5a3a24' };

export const lawrence = {
  id: 'npc_lawrence',
  name: 'Lawrence Order',
  shortName: 'Chief Order',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_lawrence_reference.jpg',
    interviewDate: '2026-10-13',
    notes: 'docs/characters/npc_lawrence.md',
  },
  role: 'Chief of Police, Halvermouth Precinct 1. Careless, comfortable, and very much for sale.',
  faction: 'fac_police',
  dialogue: 'dlg_lawrence',
  motif: 'motif_lawrence',
  voice: { wave: 'triangle', pitch: 120, variance: 10, rate: 0.85 },
  appearance: {
    skin: '#f0c8a8', hair: '#3a2a20', ...UNIFORM, beard: '#7a4a2a', accessory: 'glasses', build: 'broad', height: 1.03,
    sprite: null,
    portrait: PORTRAITS.npc_lawrence,
  },
  personality: {
    traits: ['careless', 'comfortable', 'corruptible', 'not unkind', 'allergic to paperwork'],
    sociability: 0.55, conscientiousness: 0.12, impulsiveness: 0.45, curiosity: 0.2, discretion: 0.4,
    honesty: 0.3, competitiveness: 0.2, empathy: 0.45, confidence: 0.65, riskTolerance: 0.3, patience: 0.85, humor: 0.6,
    values: ['a quiet life', 'lunch', 'a little extra on the side'],
    likes: ['doughnuts', 'naps', 'cash', 'nothing happening'], dislikes: ['paperwork', 'urgency', 'the word "emergency"', 'being made to stand up'],
  },
  speech: {
    formality: 0.25, verbosity: 0.45,
    habits: ['"not my department"', 'files everything under "later"', 'yawns mid-sentence', 'treats crime as an inconvenience to him personally'],
    rumorPrefix: 'Somebody filed a complaint saying', factPrefix: 'Officially — and I hate officially —', refuse: 'That\'s an open investigation. Meaning I haven\'t opened it.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'law', // sirens, badges, handcuffs, ramming squad cars, the gavel, a paperwork avalanche (src/engine/wrath.js)
    color: '#4a7aff',
    banner: 'YOU HAVE THE RIGHT TO REMAIN SILENT',
    subtitle: 'Chief Lawrence Order is above the law. He IS the law. Mostly.',
    line: 'Assaulting the Chief of Police? On my lunch break? …Ugh. Do you know how much paperwork this is? Don\'t worry — you\'ll be doing all of it. From a cell.',
    after: 'jail',
  },
  mechanics: {
    lax: true, // ignores petty crime until the player's record makes them a known criminal (src/systems/police.js)
    bribable: true, // pay him and the police ignore or delay calls for 3 days
    fines: true, // pay off a warrant
  },
  combat: { never: true, maxHealth: 140 },
  punctuality: -15,
  walkSpeed: 0.8,
  schedule: [
    { from: '07:30', to: '08:15', activity: 'eat', spot: 'police_station:chief_desk', label: 'breakfast (doughnuts)' },
    { from: '08:15', to: '12:00', activity: 'work', spot: 'police_station:chief_desk', label: '"working"' },
    { from: '12:00', to: '13:30', activity: 'eat', spot: 'police_station:chief_visitor', label: 'a long lunch, delivered' },
    { from: '13:30', to: '15:00', activity: 'work', spot: 'police_station:chief_desk', label: '"working"' },
    { from: '15:00', to: '16:00', activity: 'relax', spot: 'police_station:chief_couch', label: 'a "strategic review" (a nap)' },
    { from: '16:00', to: '18:30', activity: 'work', spot: 'police_station:chief_desk', label: '"working"' },
    { from: '18:30', to: '20:30', activity: 'leisure', spot: 'police_station:lobby_wait', label: 'a lap of the lobby he logs as a patrol' },
    { from: '20:30', to: '22:30', activity: 'leisure', spot: 'harbourline_1:chair', label: 'the crossword, at home' },
    { from: '22:30', to: '07:30', activity: 'sleep', spot: 'harbourline_1:bed' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 5, affection: 5, respect: 0, suspicion: 5 },
    npc_justin: { trust: 30, affection: 15, respect: 20, suspicion: 0 },
    npc_warren: { trust: 20, affection: -5, respect: 25, suspicion: 10 },
    npc_bailey: { trust: 35, affection: 30, respect: 15, suspicion: 5 },
    npc_miranda: { trust: 25, affection: 20, respect: 10, suspicion: 0 },
    npc_hugh: { trust: 40, affection: 35, respect: 30, suspicion: 0 },
    npc_moneybucks: { trust: 30, affection: 10, respect: 40, suspicion: 5 },
  },
  knowledge: ['fact_moneybucks_owns_oil'],
  giftPrefs: { item_honey_bun: 14, item_scone: 8, item_coffee: 8, item_cigar: 6, tags: { food: 6, sweet: 6 } },
  reactions: {
    fact_player_murder: { rel: { trust: -10, suspicion: 20 }, bark: 'A murder? In MY city? …Somebody write that down. Not me.' },
    fact_player_assault: { bark: 'Another fight. I\'ll add it to the pile. The pile is a fire hazard.' },
  },
  notices: [{ map: 'police_station', tag: 'saw_player_precinct', text: 'The newcomer came into the precinct. Voluntarily. Suspicious.', importance: 2 }],
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks funds the Policemen\'s Ball. We have a ball every week now. Lovely man. Lovely wallet.', cool: 'Sir Moneybucks pays for a lot of things around here. I try not to look at which.' },
    npc_justin: { warm: 'Case is a good sergeant. Brings a spare everything. Just in case.', cool: 'Case wanted a riot shield for the bake sale.' },
    npc_warren: { warm: 'Tee does everything by the book. Somebody has to. Not me.', cool: 'Tee keeps asking me to sign things. I\'m the Chief. I delegate signing.' },
    npc_bailey: { warm: 'Bond\'s my favourite. Smooth. Understands that the law is… flexible.', cool: 'Bond runs a bail business on the side. I take ten percent. Of the side.' },
    npc_miranda: { warm: 'Wright\'s the rookie. Keeps reading people their rights. Even the gulls.', cool: 'Wright asked me what our procedures are. I said "lunch".' },
    npc_hugh: { warm: 'Jury\'s been on nights since before I joined. Best guard we\'ve got. Sleeps like a baby, though.', cool: 'Jury dozed off during a jailbreak once. Officially it didn\'t happen.' },
  },
};

const officer = (o) => ({
  tier: 'minor', origin: 'imported-generated', faction: 'fac_police', walkSpeed: 1.05, punctuality: 10, impulses: [], notices: [],
  ...o,
  appearance: { ...UNIFORM, ...o.appearance },
});

export const justin = officer({
  id: 'npc_justin', name: 'Sergeant Justin Case', shortName: 'Sgt. Case',
  combat: { fights: true, defends: true, weapon: 'item_revolver', maxHealth: 130 },
  role: 'Sergeant. Over-prepared for everything, just in case. Walks the Civic Plaza and the East End.',
  dialogue: 'dlg_justin',
  voice: { wave: 'square', pitch: 170, variance: 15, rate: 1.1 },
  appearance: { skin: '#e2b896', hair: '#5a4030', moustache: 'plain', build: 'average', height: 1.0 },
  personality: { traits: ['over-prepared', 'anxious', 'thorough'], sociability: 0.5, conscientiousness: 0.9, impulsiveness: 0.1, discretion: 0.6, honesty: 0.8, empathy: 0.5, confidence: 0.45 },
  speech: { rumorPrefix: 'Just so you know —', factPrefix: 'For the record,', refuse: 'I\'d better not. Just in case.' },
  schedule: [
    { from: '06:00', to: '06:45', activity: 'eat', spot: 'police_station:desk_a' },
    { from: '06:45', to: '10:00', activity: 'patrol', patrol: 'beat_civic', label: 'patrolling Civic Plaza' },
    { from: '10:00', to: '12:00', activity: 'patrol', patrol: 'beat_civic', label: 'patrolling Bank Row' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'police_station:desk_a' },
    { from: '13:00', to: '16:00', activity: 'patrol', patrol: 'beat_eastend', label: 'watching the East Gate' },
    { from: '16:00', to: '19:00', activity: 'patrol', patrol: 'beat_park', label: 'patrolling Founders Park' },
    { from: '19:00', to: '21:30', activity: 'work', spot: 'police_station:front_desk', label: 'on the front desk' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'harbourline_2:bed' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_lawrence: { trust: 25, affection: 15, respect: 10, suspicion: 5 }, npc_miranda: { trust: 30, affection: 25, respect: 15, suspicion: 0 } },
  knowledge: [],
  giftPrefs: { item_bandage: 8, item_coffee: 5, tags: { medical: 6 } },
  opinions: { npc_lawrence: { warm: 'The Chief is… relaxed. Somebody has to worry. I worry for both of us.', cool: 'The Chief napped through the bank alarm. It was a drill. Probably.' } },
});

export const warren = officer({
  id: 'npc_warren', name: 'Officer Warren Tee', shortName: 'Officer Tee',
  combat: { fights: true, defends: true, weapon: 'item_pistol', maxHealth: 120 },
  role: 'Beat officer. By the book, obsessed with warrants. Walks the Sumps and the Docks.',
  dialogue: 'dlg_warren',
  voice: { wave: 'square', pitch: 190, variance: 8, rate: 1.2 },
  appearance: { skin: '#8a5a3a', hair: '#1a1410', build: 'thin', height: 1.04 },
  personality: { traits: ['by the book', 'humourless', 'incorruptible (mostly)'], sociability: 0.3, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.7, honesty: 0.95, empathy: 0.35, confidence: 0.7 },
  speech: { rumorPrefix: 'Unverified report:', factPrefix: 'Per the record,', refuse: 'Not without a warrant.' },
  schedule: [
    { from: '06:30', to: '07:00', activity: 'eat', spot: 'police_station:desk_b' },
    { from: '07:00', to: '11:00', activity: 'patrol', patrol: 'beat_sumps', label: 'patrolling the Sumps' },
    { from: '11:00', to: '13:00', activity: 'patrol', patrol: 'beat_sumps', label: 'watching the Mission' },
    { from: '13:00', to: '14:00', activity: 'eat', spot: 'police_station:desk_b' },
    { from: '14:00', to: '18:00', activity: 'patrol', patrol: 'beat_docks', label: 'patrolling the Docks' },
    { from: '18:00', to: '21:00', activity: 'patrol', patrol: 'beat_sumps', label: 'patrolling the Sumps' },
    { from: '21:00', to: '22:00', activity: 'work', spot: 'police_station:lobby_wait', label: 'filing reports' },
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'harbourline_3:bed' },
  ],
  relationships: { player: { trust: -5, affection: 0, respect: 0, suspicion: 15 }, npc_lawrence: { trust: 0, affection: -10, respect: 0, suspicion: 25 }, npc_bailey: { trust: -10, affection: -5, respect: 5, suspicion: 30 } },
  knowledge: [],
  giftPrefs: { item_coffee: 4, tags: {} },
  opinions: { npc_bailey: { warm: 'Bond closes cases.', cool: 'Bond closes cases and opens envelopes. I can\'t prove it. Yet.' } },
});

export const bailey = officer({
  id: 'npc_bailey', name: 'Officer Bailey Bond', shortName: 'Officer Bond',
  combat: { fights: true, defends: true, weapon: 'item_pistol', maxHealth: 120 },
  role: 'Beat officer. Smooth, friendly, with a bail-bond business on the side. Walks Lanternside.',
  dialogue: 'dlg_bailey',
  voice: { wave: 'triangle', pitch: 230, variance: 20, rate: 1.05 },
  appearance: { skin: '#c48a62', hair: '#2a1e1a', build: 'average', height: 0.98 },
  personality: { traits: ['smooth', 'entrepreneurial', 'friendly'], sociability: 0.85, conscientiousness: 0.45, impulsiveness: 0.3, discretion: 0.6, honesty: 0.45, empathy: 0.55, confidence: 0.8 },
  speech: { rumorPrefix: 'Between friends,', factPrefix: 'Word is,', refuse: 'That\'d cost you. Kidding. Mostly.' },
  schedule: [
    { from: '06:00', to: '07:00', activity: 'patrol', spot: 'halvermouth:east_gate', label: 'heading out to Lanternside' },
    { from: '07:00', to: '08:00', activity: 'eat', spot: 'cafe:table_center', label: 'coffee at the Kettle & Crumb' },
    { from: '08:00', to: '12:00', activity: 'patrol', patrol: 'beat_lanternside', label: 'patrolling Civic Square' },
    { from: '12:00', to: '15:00', activity: 'patrol', patrol: 'beat_lanternside', label: 'patrolling the Quay' },
    { from: '15:00', to: '18:00', activity: 'patrol', patrol: 'beat_lanternside', label: 'patrolling Civic Square' },
    { from: '18:00', to: '20:00', activity: 'patrol', spot: 'westbrook:lots_sign', label: 'heading back through Westbrook' },
    { from: '20:00', to: '21:00', activity: 'eat', spot: 'police_station:desk_b' },
    { from: '21:00', to: '06:00', activity: 'sleep', spot: 'harbourline_4:bed' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 5 }, npc_lawrence: { trust: 40, affection: 25, respect: 15, suspicion: 0 }, npc_mags: { trust: 20, affection: 25, respect: 10, suspicion: 0 } },
  knowledge: [],
  giftPrefs: { item_cigar: 10, item_coffee: 6, tags: { luxury: 6 } },
  opinions: { npc_mags: { warm: 'Mags makes the best coffee on my beat. I pay. Usually.', cool: 'Mags asked me for my badge number. Twice.' } },
});

export const miranda = officer({
  id: 'npc_miranda', name: 'Officer Miranda Wright', shortName: 'Officer Wright',
  combat: { fights: true, defends: true, weapon: 'item_baton', maxHealth: 110 },
  role: 'Rookie. Earnest, nervous, recites people\'s rights at every opportunity. Walks Westbrook and Gullwing Park.',
  dialogue: 'dlg_miranda',
  voice: { wave: 'triangle', pitch: 320, variance: 30, rate: 1.25 },
  appearance: { skin: '#f2d6c0', hair: '#c9813a', build: 'thin', height: 0.95 },
  personality: { traits: ['earnest', 'by-the-rights', 'eager to please'], sociability: 0.6, conscientiousness: 0.85, impulsiveness: 0.35, discretion: 0.4, honesty: 0.95, empathy: 0.75, confidence: 0.35 },
  speech: { rumorPrefix: 'I heard — allegedly —', factPrefix: 'It\'s on the record that', refuse: 'You have the right to remain silent, and so do I.' },
  schedule: [
    { from: '06:00', to: '06:30', activity: 'eat', spot: 'police_station:desk_b' },
    { from: '06:30', to: '09:00', activity: 'patrol', patrol: 'beat_westbrook', label: 'patrolling the Lots' },
    { from: '09:00', to: '12:00', activity: 'patrol', patrol: 'beat_lanternside', label: 'patrolling Gullwing Park' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'lanternside:patio', label: 'lunch on the café patio' },
    { from: '13:00', to: '16:00', activity: 'patrol', patrol: 'beat_lanternside', label: 'patrolling Canal Row' },
    { from: '16:00', to: '19:00', activity: 'patrol', patrol: 'beat_westbrook', label: 'patrolling Westbrook' },
    { from: '19:00', to: '20:00', activity: 'patrol', spot: 'halvermouth:east_gate', label: 'heading back to the precinct' },
    { from: '20:00', to: '21:30', activity: 'leisure', spot: 'harbourline_5:chair', label: 'studying procedure at home' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'harbourline_5:bed' },
  ],
  relationships: { player: { trust: 5, affection: 5, respect: 0, suspicion: 5 }, npc_justin: { trust: 30, affection: 25, respect: 35, suspicion: 0 }, npc_lawrence: { trust: 20, affection: 10, respect: 15, suspicion: 10 } },
  knowledge: [],
  giftPrefs: { item_honey_bun: 8, item_wildflowers: 6, tags: { sweet: 4 } },
  opinions: { npc_justin: { warm: 'Sergeant Case is teaching me everything. Mostly what could go wrong.', cool: 'Sergeant Case made me carry a spare spare baton.' } },
});

export const hugh = officer({
  id: 'npc_hugh', name: 'Officer Hugh Jury', shortName: 'Officer Jury',
  combat: { fights: true, defends: true, weapon: 'item_shotgun', maxHealth: 140 },
  role: 'Veteran. Grumpy, immovable. Rides out to the Ober Fields in the afternoon; guards the cells at night (and naps 01:00–04:00).',
  dialogue: 'dlg_hugh',
  voice: { wave: 'sawtooth', pitch: 100, variance: 8, rate: 0.85 },
  appearance: { skin: '#e2b896', hair: '#c9c6c0', beard: '#c9c6c0', build: 'broad', height: 1.06 },
  personality: { traits: ['grumpy', 'veteran', 'immovable', 'sleepy'], sociability: 0.25, conscientiousness: 0.6, impulsiveness: 0.15, discretion: 0.7, honesty: 0.55, empathy: 0.35, confidence: 0.85, patience: 0.9 },
  speech: { rumorPrefix: 'Thirty years I\'ve heard things like', factPrefix: 'Fact:', refuse: 'No.' },
  punctuality: 0,
  schedule: [
    { from: '07:00', to: '14:00', activity: 'sleep', spot: 'harbourline_6:bed' },
    { from: '14:00', to: '14:30', activity: 'eat', spot: 'police_station:desk_a' },
    { from: '14:30', to: '17:00', activity: 'patrol', spot: 'ober_fields:field_entrance', label: 'riding out to the Ober Fields' },
    { from: '17:00', to: '19:30', activity: 'patrol', spot: 'ober_fields:gate_post', label: 'watching the oil gate' },
    { from: '19:30', to: '21:00', activity: 'patrol', spot: 'lanternside:east_road', label: 'heading back along the coast road' },
    { from: '21:00', to: '22:00', activity: 'eat', spot: 'police_station:desk_b' },
    { from: '22:00', to: '01:00', activity: 'work', spot: 'jail:guard_desk', label: 'guarding the cells' },
    { from: '01:00', to: '04:00', activity: 'sleep', spot: 'jail:guard_desk', label: 'dozing at the guard desk' },
    { from: '04:00', to: '07:00', activity: 'work', spot: 'jail:guard_desk', label: 'guarding the cells' },
  ],
  relationships: { player: { trust: 0, affection: -5, respect: 0, suspicion: 10 }, npc_lawrence: { trust: 30, affection: 30, respect: 10, suspicion: 0 }, npc_petty: { trust: 10, affection: 20, respect: 0, suspicion: 30 } },
  knowledge: [],
  giftPrefs: { item_coffee: 12, item_cigar: 6, tags: {} },
  opinions: { npc_petty: { warm: 'Larson? Harmless. He\'s been in that cell so long he pays rent.', cool: 'Larson whistles. All night. I don\'t sleep. Much.' } },
});

export const petty = {
  id: 'npc_petty', name: 'Petty Larson', shortName: 'Petty', tier: 'minor', origin: 'imported-generated', faction: null,
  combat: { never: true, maxHealth: 70 },
  role: 'A pickpocket from the Sumps, permanently in the cell next to yours. Knows a way out. Wants something for it.',
  dialogue: 'dlg_petty',
  voice: { wave: 'triangle', pitch: 260, variance: 35, rate: 1.4 },
  appearance: { skin: '#d9a77c', hair: '#6a5a4a', hairStyle: 'messy', outfit: '#7a7a6a', legs: '#4a4a40', build: 'thin', height: 0.94, accent: '#c9a24a' },
  personality: { traits: ['chatty', 'shifty', 'loyal to his mum'], sociability: 0.9, conscientiousness: 0.2, impulsiveness: 0.7, discretion: 0.3, honesty: 0.4, empathy: 0.6, curiosity: 0.8 },
  speech: { rumorPrefix: 'Word through the wall is', factPrefix: 'Straight up,', refuse: 'What\'s it worth?' },
  walkSpeed: 1, punctuality: 0, impulses: [], notices: [],
  schedule: [
    { from: '07:00', to: '22:00', activity: 'leisure', spot: 'jail:cell_b', label: 'humming in his cell' },
    { from: '22:00', to: '07:00', activity: 'sleep', spot: 'jail:cell_b_bed' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_hugh: { trust: 15, affection: 25, respect: 10, suspicion: 0 } },
  knowledge: [],
  giftPrefs: { item_cigar: 12, item_honey_bun: 8, tags: { food: 4 } },
  opinions: { npc_hugh: { warm: 'Old Jury? Snores like a foghorn from one till four. Regular as a clock.', cool: 'Jury confiscated my harmonica. I had a second one.' } },
};

export default [lawrence, justin, warren, bailey, miranda, hugh, petty];
