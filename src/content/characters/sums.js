// The Sums of Anarchy: Arthur Anderson's calculator gang in the Sumps, and the
// Sumps residents who buy from them. Arthur is an IMPORTED character
// (player-supplied image and interview, 2026-10-13; see
// docs/characters/npc_arthur.md). His crew (6) and the customers (12) were
// generated at the player's request ("about 5-8 gang members", "fill the slum
// with npc customers").
import { PORTRAITS } from '../portraits.js';

export const arthur = {
  id: 'npc_arthur',
  name: 'Arthur Anderson',
  shortName: 'Arthur',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_arthur_reference.jpg',
    interviewDate: '2026-10-13',
    notes: 'docs/characters/npc_arthur.md',
  },
  role: 'Leader of the Sums of Anarchy. Always angry. Runs the Sumps\' calculator trade like a spreadsheet, and protects the Sumps like family.',
  faction: 'fac_sums',
  dialogue: 'dlg_arthur',
  motif: 'motif_arthur',
  noSnitch: true,
  voice: { wave: 'sawtooth', pitch: 135, variance: 30, rate: 1.15 },
  appearance: {
    // red-faced with anger (owner's answer): a permanent flush, brows slammed down, steam
    skin: '#e8a890', hair: '#4a2a1a', hairStyle: 'short', beard: '#8a4a2a', accessory: 'glasses',
    outfit: '#8a1e1e', legs: '#2a2224', shoes: '#1a1416', accent: '#f2efe8', build: 'broad', height: 1.02, angry: true,
    sprite: null,
    portrait: PORTRAITS.npc_arthur,
  },
  personality: {
    traits: ['always angry', 'maths-obsessed', 'fiercely protective', 'petty', 'vengeful'],
    sociability: 0.4, conscientiousness: 0.85, impulsiveness: 0.7, curiosity: 0.5, discretion: 0.5,
    honesty: 0.6, competitiveness: 0.95, empathy: 0.35, confidence: 0.9, riskTolerance: 0.7, patience: 0.05, humor: 0.1,
    values: ['the Sumps', 'his crew', 'numbers that add up', 'getting even'],
    likes: ['exact change', 'long division', 'loyalty', 'the Sumps'], dislikes: ['cops', 'rounding errors', 'Halvermouth\'s regeneration plans', 'anyone who touches his customers', 'everything else'],
  },
  speech: {
    formality: 0.3, verbosity: 0.6,
    habits: ['shouts', 'quotes margins and percentages', 'keeps a grudge ledger', 'says "do the maths"'],
    rumorPrefix: 'I HEARD — and I wrote it down —', factPrefix: 'Do the maths:', refuse: 'NO. Zero. Nought. Nil.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'maths', // equations, calculator keys, ERROR readouts, falling digits, division by zero (src/engine/wrath.js)
    color: '#ff3a2a',
    banner: 'YOU DON\'T ADD UP',
    subtitle: 'Arthur Anderson has done the maths. You are the remainder.',
    line: 'You put your hands on me? ME? In MY Sumps? …Write that down, Percy. In red. Underline it.',
  },
  combat: { never: true, maxHealth: 160 },
  punctuality: 15,
  walkSpeed: 1.05,
  schedule: [
    { from: '08:00', to: '08:30', activity: 'eat', spot: 'abacus:arthur_desk', label: 'breakfast over the books' },
    { from: '08:30', to: '12:00', activity: 'work', spot: 'abacus:arthur_desk', label: 'doing the books, furiously' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'abacus:table_a', label: 'lunch (angrily)' },
    { from: '13:00', to: '16:00', activity: 'work', spot: 'abacus:arthur_desk', label: 'doing the books, furiously' },
    { from: '16:00', to: '18:00', activity: 'patrol', spot: 'halvermouth:sumps_corner', label: 'walking his Sumps' },
    { from: '18:00', to: '19:00', activity: 'patrol', spot: 'halvermouth:sumps_fire_n', label: 'checking on the fire barrels' },
    { from: '19:00', to: '23:30', activity: 'leisure', spot: 'abacus:table_b', label: 'glaring at the bar' },
    { from: '23:30', to: '08:00', activity: 'sleep', spot: 'shack_arthur:bed' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 0, affection: -5, respect: 0, suspicion: 20 },
    npc_al: { trust: 60, affection: 30, respect: 40, suspicion: 0 },
    npc_percy: { trust: 70, affection: 20, respect: 50, suspicion: 5 },
    npc_minnie: { trust: 50, affection: 30, respect: 30, suspicion: 0 },
    npc_dee_nom: { trust: 50, affection: 25, respect: 35, suspicion: 0 },
    npc_tony: { trust: 40, affection: 35, respect: 5, suspicion: 0 },
    npc_max: { trust: 30, affection: 40, respect: 10, suspicion: 15 },
    npc_lawrence: { trust: -60, affection: -70, respect: -30, suspicion: 80 },
  },
  knowledge: ['fact_sums_of_anarchy'],
  giftPrefs: { item_coffee: 4, item_cigar: 8, tags: { food: 2 } },
  reactions: {
    fact_player_stole_customer: { rel: { trust: -15, affection: -15, suspicion: 20 }, bark: 'ANOTHER ONE? That\'s going in the ledger.' },
    fact_player_murder: { bark: 'Bodies in the Sumps bring cops to the Sumps. I hate that.' },
  },
  notices: [{ map: 'abacus', tag: 'saw_player_abacus', text: 'The newcomer walked into the Abacus. Into MY Abacus.', importance: 3 }],
  opinions: {
    npc_lawrence: { warm: 'Order? He\'s lazy. Lazy\'s fine. Lazy stays out of the Sumps.', cool: 'Lawrence Order is a rounding error in a hat.' },
    npc_moneybucks: { warm: 'Moneybucks? Rich. Doesn\'t come down here. Good.', cool: 'Moneybucks wants to "regenerate" the Sumps. Over my dead — over HIS dead —' },
    npc_al: { warm: 'Al\'s my right hand. Solves for X. X is usually someone\'s face.', cool: 'Al needs to stop solving things with his fists. That\'s MY job.' },
    npc_percy: { warm: 'Percy\'s books balance to the penny. I love Percy. Don\'t tell Percy.', cool: 'Percy takes a cut of everything. Including me. I respect it.' },
  },
};

const crew = (o) => ({
  tier: 'minor', origin: 'imported-generated', faction: 'fac_sums', noSnitch: true, walkSpeed: 1.05, punctuality: 5, impulses: [], notices: [], knowledge: ['fact_sums_of_anarchy'],
  ...o,
  appearance: { accent: '#c9302a', ...o.appearance },
});

export const al = crew({
  id: 'npc_al', name: 'Al Gebra', shortName: 'Al',
  combat: { fights: true, defends: true, weapon: 'item_knuckles', maxHealth: 140 },
  role: 'Arthur\'s right hand and enforcer. Solves for X. Delivers the gang\'s warnings in person.',
  dialogue: 'dlg_al',
  voice: { wave: 'square', pitch: 120, variance: 10, rate: 0.95 },
  appearance: { skin: '#a8714e', hair: '#1a1410', hairStyle: 'short', beard: '#1a1410', outfit: '#3a1a1a', legs: '#1e1e22', build: 'broad', height: 1.06 },
  personality: { traits: ['calm', 'menacing', 'loyal'], sociability: 0.3, conscientiousness: 0.7, impulsiveness: 0.3, discretion: 0.8, honesty: 0.6, empathy: 0.3, confidence: 0.9 },
  speech: { rumorPrefix: 'Word is', factPrefix: 'Known quantity:', refuse: 'No.' },
  schedule: [
    { from: '09:00', to: '13:00', activity: 'patrol', spot: 'halvermouth:sumps_corner', label: 'watching the corners' },
    { from: '13:00', to: '14:00', activity: 'eat', spot: 'abacus:table_a' },
    { from: '14:00', to: '18:00', activity: 'patrol', spot: 'halvermouth:sumps_wreck', label: 'watching the corners' },
    { from: '18:00', to: '23:00', activity: 'patrol', spot: 'halvermouth:sumps_mill_road', label: 'walking Mill Road' },
    { from: '23:00', to: '01:00', activity: 'leisure', spot: 'abacus:pool' },
    { from: '01:00', to: '09:00', activity: 'sleep', spot: 'shack_crew_a:bed' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 20 }, npc_arthur: { trust: 70, affection: 40, respect: 60, suspicion: 0 } },
  giftPrefs: { item_cigar: 6, tags: {} },
  opinions: { npc_arthur: { warm: 'Arthur shouts. Arthur\'s always right. Those are related.', cool: 'Arthur shouts at the books. The books don\'t care. I care.' } },
});

export const percy = crew({
  id: 'npc_percy', name: 'Percy Ntage', shortName: 'Percy',
  combat: { never: true, maxHealth: 80 },
  role: 'The gang\'s bookkeeper. Takes a cut of everything. Keeps the grudge ledger up to date for Arthur.',
  dialogue: 'dlg_percy',
  voice: { wave: 'triangle', pitch: 240, variance: 12, rate: 1.3 },
  appearance: { skin: '#f0d2b8', hair: '#8a7a6a', hairStyle: 'parted', outfit: '#5a4a3a', legs: '#2a2420', build: 'thin', height: 0.97, accessory: 'glasses', tie: '#c9302a' },
  personality: { traits: ['precise', 'greedy', 'nervous'], sociability: 0.4, conscientiousness: 1, impulsiveness: 0.1, discretion: 0.6, honesty: 0.5, empathy: 0.3, confidence: 0.4 },
  speech: { rumorPrefix: 'The figures suggest', factPrefix: 'Per the ledger,', refuse: 'That information carries a fee.' },
  schedule: [
    { from: '08:00', to: '12:00', activity: 'work', spot: 'abacus:table_a', label: 'balancing the books' },
    { from: '12:00', to: '14:00', activity: 'patrol', spot: 'halvermouth:sumps_fire_e', label: 'collecting from the corners' },
    { from: '14:00', to: '21:00', activity: 'work', spot: 'abacus:table_a', label: 'balancing the books' },
    { from: '21:00', to: '22:00', activity: 'eat', spot: 'abacus:table_b' },
    { from: '22:00', to: '08:00', activity: 'sleep', spot: 'shack_crew_a:bed_b' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 15 }, npc_arthur: { trust: 60, affection: 20, respect: 60, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, tags: {} },
  opinions: { npc_arthur: { warm: 'Arthur is an excellent manager. Volatile, but excellent. Margins up 14% year on year.', cool: 'Arthur threw a stapler at me on Tideday. I have invoiced him.' } },
});

export const minnie = crew({
  id: 'npc_minnie', name: 'Minnie Mus', shortName: 'Minnie',
  combat: { fights: true, defends: true, weapon: 'item_knuckles', maxHealth: 100 },
  role: 'Runs the counter at the Abacus. Sells the gang\'s calculators — to customers, and to you, if Arthur allows it.',
  dialogue: 'dlg_minnie',
  voice: { wave: 'triangle', pitch: 300, variance: 25, rate: 1.25 },
  appearance: { skin: '#d9a77c', hair: '#2a1a14', hairStyle: 'bun', outfit: '#c9302a', legs: '#2a2224', build: 'thin', height: 0.95 },
  personality: { traits: ['quick', 'sharp-tongued', 'loyal'], sociability: 0.8, conscientiousness: 0.6, impulsiveness: 0.4, discretion: 0.5, honesty: 0.55, empathy: 0.5, confidence: 0.8 },
  speech: { rumorPrefix: 'Over the counter I hear', factPrefix: 'Fact:', refuse: 'Minus that.' },
  schedule: [
    { from: '11:00', to: '15:00', activity: 'work', spot: 'abacus:bar_back', label: 'behind the counter' },
    { from: '15:00', to: '16:00', activity: 'eat', spot: 'abacus:table_b' },
    { from: '16:00', to: '02:00', activity: 'work', spot: 'abacus:bar_back', label: 'behind the counter' },
    { from: '02:00', to: '11:00', activity: 'sleep', spot: 'shack_crew_b:bed' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 10 }, npc_arthur: { trust: 50, affection: 40, respect: 40, suspicion: 0 } },
  giftPrefs: { item_honey_bun: 8, tags: { sweet: 4 } },
  opinions: { npc_arthur: { warm: 'Arthur took me in when nobody else would. He shouted the whole time. Still counts.', cool: 'Arthur made me recount the till four times. It was right all four times.' } },
});

export const deeNom = crew({
  id: 'npc_dee_nom', name: 'Dee Nominator', shortName: 'Dee Nom',
  combat: { fights: true, defends: true, weapon: 'item_bat', maxHealth: 170 },
  role: 'The muscle. Bouncer at the Abacus door. "Everything comes down to the bottom line. I am the bottom line."',
  dialogue: 'dlg_dee_nom',
  voice: { wave: 'sawtooth', pitch: 95, variance: 6, rate: 0.8 },
  appearance: { skin: '#6a4430', hair: '#0e0a08', hairStyle: 'short', outfit: '#2a2a2e', legs: '#1a1a1e', build: 'broad', height: 1.1 },
  personality: { traits: ['huge', 'quiet', 'literal'], sociability: 0.2, conscientiousness: 0.6, impulsiveness: 0.2, discretion: 0.9, honesty: 0.8, empathy: 0.4, confidence: 0.9 },
  speech: { rumorPrefix: 'Heard', factPrefix: 'Bottom line:', refuse: 'No.' },
  schedule: [
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'abacus:table_b' },
    { from: '13:00', to: '19:00', activity: 'work', spot: 'halvermouth:abacus_bouncer', label: 'on the door' },
    { from: '19:00', to: '20:00', activity: 'eat', spot: 'abacus:table_b' },
    { from: '20:00', to: '03:00', activity: 'work', spot: 'halvermouth:abacus_bouncer', label: 'on the door' },
    { from: '03:00', to: '12:00', activity: 'sleep', spot: 'shack_crew_b:bed_b' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_arthur: { trust: 50, affection: 30, respect: 50, suspicion: 0 } },
  giftPrefs: { item_scone: 6, tags: { food: 4 } },
  opinions: { npc_arthur: { warm: 'Boss is fair.', cool: 'Boss is loud.' } },
});

export const tony = crew({
  id: 'npc_tony', name: 'Tony Tangent', shortName: 'Tony',
  combat: { fights: true, defends: true, weapon: null, maxHealth: 100 },
  role: 'Lookout at the Sumps gate. Watches for cops. Never finishes a — oh, look, a pigeon.',
  dialogue: 'dlg_tony',
  voice: { wave: 'square', pitch: 260, variance: 40, rate: 1.5 },
  appearance: { skin: '#f2d6c0', hair: '#c9813a', hairStyle: 'messy', outfit: '#4a6a3a', legs: '#2a2a2e', build: 'wiry', height: 0.98 },
  personality: { traits: ['scatterbrained', 'chatty', 'sharp-eyed'], sociability: 0.9, conscientiousness: 0.2, impulsiveness: 0.8, discretion: 0.2, honesty: 0.7, empathy: 0.6, curiosity: 0.95 },
  speech: { rumorPrefix: 'So — right — so', factPrefix: 'Funny thing is,', refuse: 'Can\'t say. Wait, what were we —' },
  schedule: [
    { from: '08:00', to: '12:00', activity: 'patrol', spot: 'halvermouth:sumps_gate', label: 'watching for cops' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'halvermouth:sumps_tents' },
    { from: '13:00', to: '20:00', activity: 'patrol', spot: 'halvermouth:sumps_gate', label: 'watching for cops' },
    { from: '20:00', to: '23:00', activity: 'leisure', spot: 'abacus:pool' },
    { from: '23:00', to: '08:00', activity: 'sleep', spot: 'shack_crew_c:bed' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 5 }, npc_arthur: { trust: 40, affection: 40, respect: 30, suspicion: 0 } },
  giftPrefs: { item_honey_bun: 6, tags: { food: 3 } },
  opinions: { npc_arthur: { warm: 'Arthur\'s like a dad. A dad who\'s — you know when a kettle — yeah. That.', cool: 'Arthur shouted at me for watching a pigeon instead of a cop. It was a REALLY good pigeon.' } },
});

export const max = crew({
  id: 'npc_max', name: 'Max Imum', shortName: 'Max',
  combat: { fights: true, defends: true, weapon: 'item_machete', maxHealth: 120 },
  role: 'The reckless one. Always pushes it to the limit. Wanders the fire barrels starting arguments.',
  dialogue: 'dlg_max',
  voice: { wave: 'sawtooth', pitch: 200, variance: 35, rate: 1.35 },
  appearance: { skin: '#c48a62', hair: '#c9302a', hairStyle: 'messy', outfit: '#1e1e22', legs: '#3a1a1a', build: 'wiry', height: 1.0, accessories: ['vest'], vestColor: '#c9302a' },
  personality: { traits: ['reckless', 'loud', 'loyal to a fault'], sociability: 0.7, conscientiousness: 0.15, impulsiveness: 0.95, discretion: 0.1, honesty: 0.6, empathy: 0.3, confidence: 1 },
  speech: { rumorPrefix: 'MAXIMUM GOSSIP:', factPrefix: 'Listen —', refuse: 'Make me.' },
  schedule: [
    { from: '10:00', to: '13:00', activity: 'patrol', spot: 'halvermouth:sumps_fire_w', label: 'starting arguments at the fires' },
    { from: '13:00', to: '14:00', activity: 'eat', spot: 'halvermouth:sumps_fire_s' },
    { from: '14:00', to: '19:00', activity: 'patrol', spot: 'halvermouth:sumps_fire_mill', label: 'starting arguments at the fires' },
    { from: '19:00', to: '02:00', activity: 'leisure', spot: 'halvermouth:sumps_fire_n', label: 'drinking by the fire' },
    { from: '02:00', to: '10:00', activity: 'sleep', spot: 'shack_crew_c:bed_b' },
  ],
  relationships: { player: { trust: -5, affection: 0, respect: 0, suspicion: 20 }, npc_arthur: { trust: 40, affection: 50, respect: 30, suspicion: 0 } },
  giftPrefs: { item_cigar: 10, tags: {} },
  opinions: { npc_arthur: { warm: 'Arthur\'s the angriest man alive. Respect.', cool: 'Arthur says I "overflow". I don\'t know what that means but I\'m PROUD.' } },
});

// ------------------------------------------------------------------ customers
// Each has a favourite calculator, a budget (most they'll pay for one) and who
// they'll refer once they're happy with you. `startsKnown`: approachable from
// day one; the rest only talk to you once a friend vouches for you.
const customer = (o) => ({
  tier: 'minor', origin: 'imported-generated', faction: null, noSnitch: true, walkSpeed: 0.9, punctuality: -5, impulses: [], notices: [], knowledge: [],
  combat: { never: true, maxHealth: 80 },
  dialogue: 'dlg_customer',
  giftPrefs: { item_honey_bun: 6, item_scone: 5, tags: { food: 4 } },
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_minnie: { trust: 30, affection: 20, respect: 10, suspicion: 0 } },
  ...o,
});
const day = (sleep, a, b, label = 'hanging around') => [
  { from: '07:30', to: '12:00', activity: 'leisure', spot: `halvermouth:${a}`, label },
  { from: '12:00', to: '13:00', activity: 'eat', spot: 'halvermouth:mission_front', label: 'queueing for soup' },
  { from: '13:00', to: '22:30', activity: 'leisure', spot: `halvermouth:${b}`, label },
  { from: '22:30', to: '07:30', activity: 'sleep', spot: `halvermouth:${sleep}` },
];

export const customers = [
  customer({ id: 'npc_ray', name: 'Ray Doyle', shortName: 'Ray', role: 'Dockhand on the early shift. Runs on Overclocks.', customer: { favourite: 'energy', budget: 26, refers: 'npc_gus', startsKnown: true },
    voice: { wave: 'square', pitch: 150, variance: 15, rate: 1.1 }, appearance: { skin: '#c48a62', hair: '#2a1e1a', hairStyle: 'cap', hatColor: '#4a5a3a', outfit: '#5a6a4a', build: 'broad' },
    personality: { traits: ['tired', 'friendly'], sociability: 0.6, conscientiousness: 0.5, impulsiveness: 0.5, empathy: 0.5 }, speech: { rumorPrefix: 'Down the docks they say', factPrefix: 'Honest,', refuse: 'Nah.' },
    schedule: day('sumps_tents', 'docks_quay', 'sumps_fire_s', 'between shifts') }),
  customer({ id: 'npc_mo', name: 'Mo Kettering', shortName: 'Mo', role: 'Busker. Needs to be charming for tips. Swears by Rose-Gold Sums.', customer: { favourite: 'charm', budget: 28, refers: 'npc_lena', startsKnown: true },
    voice: { wave: 'triangle', pitch: 210, variance: 30, rate: 1.2 }, appearance: { skin: '#e2b896', hair: '#6a3a2a', hairStyle: 'long', outfit: '#8a5aa0', build: 'thin' },
    personality: { traits: ['showy', 'hopeful'], sociability: 0.9, conscientiousness: 0.3, impulsiveness: 0.7, empathy: 0.6 }, speech: { rumorPrefix: 'Word on the street —', factPrefix: 'True story:', refuse: 'Not for free, darling.' },
    schedule: day('sumps_tents_w', 'plaza_center', 'sumps_corner', 'busking') }),
  customer({ id: 'npc_dot', name: 'Dot Pruitt', shortName: 'Dot', role: 'Dropped out of the university. Thinks a Big Brain 9000 is the only way to keep up.', customer: { favourite: 'wits', budget: 24, refers: 'npc_fern', startsKnown: true },
    voice: { wave: 'triangle', pitch: 290, variance: 25, rate: 1.3 }, appearance: { skin: '#f2d6c0', hair: '#1a1410', hairStyle: 'ponytail', outfit: '#4a6a8a', build: 'thin', accessory: 'glasses' },
    personality: { traits: ['anxious', 'clever'], sociability: 0.4, conscientiousness: 0.6, impulsiveness: 0.4, empathy: 0.6 }, speech: { rumorPrefix: 'Statistically,', factPrefix: 'Technically,', refuse: 'I\'d rather not.' },
    schedule: day('sumps_tents', 'sumps_lane', 'sumps_wreck', 'reading old textbooks') }),
  customer({ id: 'npc_bill', name: 'Bill Hobb', shortName: 'Bill', role: 'Bare-knuckle boxer past his prime. Takes a Brick before every fight.', customer: { favourite: 'grit', budget: 30, refers: 'npc_nico', startsKnown: true },
    voice: { wave: 'sawtooth', pitch: 110, variance: 10, rate: 0.9 }, appearance: { skin: '#e2b896', hair: '#5a4030', hairStyle: 'short', outfit: '#6a2a2a', build: 'broad', height: 1.04 },
    personality: { traits: ['tough', 'proud'], sociability: 0.5, conscientiousness: 0.4, impulsiveness: 0.6, empathy: 0.4 }, speech: { rumorPrefix: 'Heard in the ring:', factPrefix: 'Straight,', refuse: 'No chance.' },
    schedule: day('sumps_south', 'sumps_fire_w', 'sumps_fire_mill', 'shadow-boxing') }),
  customer({ id: 'npc_lena', name: 'Lena Szabo', shortName: 'Lena', role: 'Pickpocket. Featherkeys keep her fingers quick.', customer: { favourite: 'finesse', budget: 30, refers: 'npc_hattie' },
    voice: { wave: 'triangle', pitch: 260, variance: 20, rate: 1.3 }, appearance: { skin: '#d9a77c', hair: '#2a2a2e', hairStyle: 'short', outfit: '#2a3a4a', build: 'thin' },
    personality: { traits: ['quick', 'wary'], sociability: 0.4, conscientiousness: 0.5, impulsiveness: 0.5, empathy: 0.4 }, speech: { rumorPrefix: 'I lifted a rumour:', factPrefix: 'Truth:', refuse: 'Hands off.' },
    schedule: day('sumps_tents_w', 'plaza_center', 'sumps_fence', 'working the crowds') }),
  customer({ id: 'npc_gus', name: 'Gus Oakley', shortName: 'Gus', role: 'Old sailor with a bad leg. Plus Packs keep him walking.', customer: { favourite: 'health', budget: 22, refers: 'npc_bram' },
    voice: { wave: 'triangle', pitch: 130, variance: 15, rate: 0.85 }, appearance: { skin: '#e2b896', hair: '#e8e2d4', hairStyle: 'hat', hatColor: '#2a3a5a', beard: '#e8e2d4', outfit: '#2a3a5a', build: 'round' },
    personality: { traits: ['salty', 'kind'], sociability: 0.7, conscientiousness: 0.4, impulsiveness: 0.3, empathy: 0.7 }, speech: { rumorPrefix: 'Sailors say', factPrefix: 'Aye,', refuse: 'Belay that.' },
    schedule: day('sumps_shore', 'sumps_shore', 'sumps_fire_n', 'watching the water') }),
  customer({ id: 'npc_fern', name: 'Fern Abara', shortName: 'Fern', role: 'Volunteers at the Mission. Needs the charm to keep the donations coming.', customer: { favourite: 'charm', budget: 26, refers: 'npc_pearl' },
    voice: { wave: 'triangle', pitch: 280, variance: 20, rate: 1.15 }, appearance: { skin: '#8a5a3a', hair: '#1a1410', hairStyle: 'curly', outfit: '#c9a24a', build: 'average' },
    personality: { traits: ['warm', 'conflicted'], sociability: 0.8, conscientiousness: 0.7, impulsiveness: 0.3, empathy: 0.9 }, speech: { rumorPrefix: 'At the Mission they say', factPrefix: 'Truly,', refuse: 'I shouldn\'t.' },
    schedule: day('sumps_tents', 'mission_front', 'mission_front', 'helping at the Mission') }),
  customer({ id: 'npc_nico', name: 'Nico Varga', shortName: 'Nico', role: 'Works nights at Cold Storage. Lives on Overclocks and regret.', customer: { favourite: 'energy', budget: 28, refers: 'npc_sol' },
    voice: { wave: 'square', pitch: 170, variance: 20, rate: 1.2 }, appearance: { skin: '#f0c8a8', hair: '#3a2a20', hairStyle: 'messy', outfit: '#3a4a6a', build: 'thin' },
    personality: { traits: ['jittery', 'loyal'], sociability: 0.5, conscientiousness: 0.5, impulsiveness: 0.6, empathy: 0.5 }, speech: { rumorPrefix: 'On the night shift —', factPrefix: 'Look,', refuse: 'Can\'t.' },
    schedule: day('sumps_south', 'sumps_mill_road', 'sumps_east', 'killing time before the night shift') }),
  customer({ id: 'npc_hattie', name: 'Hattie Crane', shortName: 'Hattie', role: 'Runs card games behind the Mission. Big Brains help her count.', customer: { favourite: 'wits', budget: 32 },
    voice: { wave: 'triangle', pitch: 230, variance: 15, rate: 1.1 }, appearance: { skin: '#f0d2b8', hair: '#c9c6c0', hairStyle: 'bun', outfit: '#4a2a4a', build: 'average', accessory: 'glasses' },
    personality: { traits: ['shrewd', 'patient'], sociability: 0.6, conscientiousness: 0.7, impulsiveness: 0.2, empathy: 0.4 }, speech: { rumorPrefix: 'The cards say', factPrefix: 'Odds are,', refuse: 'Fold.' },
    schedule: day('sumps_tents_w', 'sumps_fire_e', 'sumps_tents', 'dealing cards') }),
  customer({ id: 'npc_bram', name: 'Bram Stokes', shortName: 'Bram', role: 'Scrap collector. Hauls metal all day on Bricks.', customer: { favourite: 'grit', budget: 24 },
    voice: { wave: 'sawtooth', pitch: 120, variance: 12, rate: 0.95 }, appearance: { skin: '#a8714e', hair: '#2a1e1a', hairStyle: 'short', beard: '#2a1e1a', outfit: '#6a5a3a', build: 'broad' },
    personality: { traits: ['quiet', 'hard-working'], sociability: 0.3, conscientiousness: 0.8, impulsiveness: 0.3, empathy: 0.5 }, speech: { rumorPrefix: 'In the scrap I heard', factPrefix: 'Fact is,', refuse: 'No.' },
    schedule: day('sumps_south', 'sumps_east', 'sumps_fire_mill', 'sorting scrap') }),
  customer({ id: 'npc_pearl', name: 'Pearl Quigley', shortName: 'Pearl', role: 'Seamstress with failing eyes. Featherkeys steady her hands.', customer: { favourite: 'finesse', budget: 26 },
    voice: { wave: 'triangle', pitch: 250, variance: 15, rate: 1.0 }, appearance: { skin: '#f2d6c0', hair: '#9a8a7a', hairStyle: 'bun', outfit: '#7a8a6a', build: 'thin' },
    personality: { traits: ['gentle', 'proud'], sociability: 0.5, conscientiousness: 0.8, impulsiveness: 0.2, empathy: 0.7 }, speech: { rumorPrefix: 'I overheard', factPrefix: 'Honestly,', refuse: 'Oh, no.' },
    schedule: day('sumps_tents_w', 'sumps_tents_w', 'sumps_lane', 'mending clothes') }),
  customer({ id: 'npc_sol', name: 'Sol Mendel', shortName: 'Sol', role: 'Former boxer\'s cornerman, now a wreck. Plus Packs for the hangovers.', customer: { favourite: 'health', budget: 22 },
    voice: { wave: 'triangle', pitch: 140, variance: 20, rate: 0.9 }, appearance: { skin: '#e2b896', hair: '#6a6a6a', hairStyle: 'messy', outfit: '#5a4a4a', build: 'round' },
    personality: { traits: ['rueful', 'funny'], sociability: 0.7, conscientiousness: 0.2, impulsiveness: 0.6, empathy: 0.6 }, speech: { rumorPrefix: 'Back in the day,', factPrefix: 'Kid,', refuse: 'Not today.' },
    schedule: day('sumps_tents', 'sumps_fire_n', 'sumps_corner', 'nursing a headache') }),
];

export default [arthur, al, percy, minnie, deeNom, tony, max, ...customers];
