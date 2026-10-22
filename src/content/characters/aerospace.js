// The people of Starling Flats Aerospace Park (v0.55.0). Original characters
// (not imported): each has a house of their own on Mesa Road in Starling.
//
//   Billie Roost  — founder of Roost Aeroworks, an old air racer selling her failing firm
//   Imogen Hale   — chief executive of Meridian Aerospace Corporation (MRDN)
//   Ailie Ronn    — Meridian's chief test pilot, Billie's old racing rival
//   Rudy Durr     — Meridian's head of production, keeper of the line board
//   Tina Minus    — Meridian's launch director
//   Wrenna Torq   — Roost's chief mechanic (she stays on when the firm is sold)

export const billie = {
  id: 'npc_billie',
  name: 'Wilhelmina "Billie" Roost',
  shortName: 'Billie',
  tier: 'major',
  origin: 'generated',
  role: 'Founder of Roost Aeroworks, the little aircraft firm beside Meridian at Starling Flats. A retired air racer, seventy-four, selling up — to someone she likes.',
  faction: null,
  dialogue: 'dlg_billie',
  motif: 'motif_billie',
  voice: { wave: 'triangle', pitch: 190, variance: 26, rate: 1.15 },
  combat: { maxHealth: 70 },
  appearance: {
    skin: '#e8c4a8', hair: '#e8e4dc', hairStyle: 'bun', outfit: '#6a4a2a', undershirt: '#f2ead8', tie: '#c8402a',
    legs: '#4a3a2a', shoes: '#2a1e14', accessory: 'glasses', accent: '#c8402a', build: 'thin', height: 0.94,
  },
  personality: {
    traits: ['spirited', 'blunt', 'proud', 'sentimental about aircraft, never about money'],
    sociability: 0.8, conscientiousness: 0.55, impulsiveness: 0.6, curiosity: 0.7, discretion: 0.4,
    honesty: 0.9, competitiveness: 0.85, empathy: 0.65, confidence: 0.9, riskTolerance: 0.8, patience: 0.35, humor: 0.85,
    values: ['a well-rigged aircraft', 'winning', 'the people who work for her'],
    likes: ['propellers', 'strong tea', 'beating Ailie Ronn', 'the smell of dope and varnish'],
    dislikes: ['accountants', 'committees', 'Meridian\'s press releases', 'being helped down steps'],
  },
  speech: { formality: 0.2, verbosity: 0.7, habits: ['calls everyone "flyer"', 'measures distances in runway lengths', 'old racing slang'], rumorPrefix: 'Word on the flight line,', factPrefix: 'Mark my words, flyer:', refuse: 'That\'s between me and my logbook.' },
  walkSpeed: 0.9, punctuality: -10, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '06:30', to: '07:30', activity: 'eat', spot: 'starling_roost:chair', label: 'tea, toast and the weather' },
    { from: '07:30', to: '12:00', activity: 'work', spot: 'roost_office:desk', label: 'in the Roost office' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'starling_flats:cafe_bench', label: 'a sandwich outside the Contrail Café' },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'roost_hangar:bench', label: 'in the hangar, "helping"' },
    { from: '17:00', to: '20:30', activity: 'leisure', spot: 'starling_flats:runway_view', label: 'watching the evening traffic' },
    { from: '20:30', to: '22:00', activity: 'relax', spot: 'starling_roost:chair', label: 'at home with the race films' },
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'starling_roost:bed' },
  ],
  relationships: {
    player: { trust: 15, affection: 20, respect: 5, suspicion: 0 },
    npc_wrenna: { trust: 90, affection: 80, respect: 75, suspicion: 0 },
    npc_ailie: { trust: 55, affection: 50, respect: 70, suspicion: 10 },
    npc_imogen: { trust: 20, affection: 10, respect: 45, suspicion: 30 },
    npc_rudy: { trust: 40, affection: 35, respect: 55, suspicion: 5 },
  },
  giftPrefs: { item_coffee: 4, item_honey_bun: 7, tags: { food: 3 } },
  opinions: {
    npc_imogen: { warm: 'Imogen Hale built Meridian into a giant. I\'ll give her that. I won\'t give her my hangar.', cool: 'Imogen Hale has never once flown anything she built. Never. Not once. Think about that.' },
    npc_ailie: { warm: 'Ailie Ronn is the best pilot on the Flats. Second best. After me. On a good day she\'s nearly as good.', cool: 'Ailie Ronn beat me in the Escarpment Dash in \'98 by cheating. She says by "a tailwind". Same thing.' },
    npc_wrenna: { warm: 'Wrenna Torq can fix anything with a wrench and a stare. She comes with the hangar. She is the hangar.', cool: 'Wrenna hides my tools. She says I "tune" engines. I do tune engines.' },
  },
};

export const imogen = {
  id: 'npc_imogen',
  name: 'Dr. Imogen Hale',
  shortName: 'Dr. Hale',
  tier: 'major',
  origin: 'generated',
  role: 'Chief executive of Meridian Aerospace Corporation (MRDN), the incumbent at Starling Flats. Brilliant, polite, relentless; regards competition as a scheduling problem.',
  faction: null,
  dialogue: 'dlg_imogen',
  motif: 'motif_imogen',
  voice: { wave: 'sine', pitch: 175, variance: 8, rate: 1.0 },
  combat: { maxHealth: 80 },
  appearance: {
    skin: '#c48a62', hair: '#1e1a1a', hairStyle: 'parted', outfit: '#2e3a4e', undershirt: '#f4f4f0', tie: '#c8a040',
    legs: '#1e2430', shoes: '#14141a', accessory: 'glasses', accent: '#c8a040', build: 'average', height: 1.0,
  },
  personality: {
    traits: ['strategic', 'gracious', 'relentless', 'numerate'],
    sociability: 0.55, conscientiousness: 0.95, impulsiveness: 0.1, curiosity: 0.8, discretion: 0.9,
    honesty: 0.75, competitiveness: 0.95, empathy: 0.45, confidence: 0.95, riskTolerance: 0.45, patience: 0.85, humor: 0.4,
    values: ['growth', 'reliability', 'the share price', 'being right'],
    likes: ['a full order book', 'on-time deliveries', 'quiet launches', 'well-made slide rules'],
    dislikes: ['surprises', 'late suppliers', 'Billie Roost\'s anecdotes about her'],
  },
  speech: { formality: 0.75, verbosity: 0.55, habits: ['talks in quarters and milestones', 'says "noted"', 'never raises her voice'], rumorPrefix: 'Between us,', factPrefix: 'For the record:', refuse: 'That\'s commercially sensitive.' },
  walkSpeed: 1.05, punctuality: 0, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '06:00', to: '07:00', activity: 'eat', spot: 'starling_hale:chair', label: 'black coffee and the overnight numbers' },
    { from: '07:00', to: '12:30', activity: 'work', spot: 'meridian_lobby:ceo', label: 'in the corner office' },
    { from: '12:30', to: '13:30', activity: 'work', spot: 'starling_flats:meridian_forecourt', label: 'a walking meeting round the forecourt' },
    { from: '13:30', to: '19:00', activity: 'work', spot: 'meridian_lobby:ceo', label: 'in the corner office' },
    { from: '19:00', to: '21:30', activity: 'relax', spot: 'starling_hale:chair', label: 'at home, still on the phone to the board' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'starling_hale:bed' },
  ],
  relationships: {
    player: { trust: 0, affection: 5, respect: 0, suspicion: 15 },
    npc_billie: { trust: 25, affection: 20, respect: 60, suspicion: 20 },
    npc_rudy: { trust: 80, affection: 40, respect: 75, suspicion: 0 },
    npc_tina: { trust: 75, affection: 45, respect: 80, suspicion: 0 },
    npc_ailie: { trust: 60, affection: 35, respect: 70, suspicion: 10 },
  },
  giftPrefs: { item_coffee: 9, item_cigar: -4, tags: { food: 1 } },
  opinions: {
    npc_billie: { warm: 'Billie Roost taught half the Flats to fly. I simply taught the other half to invoice.', cool: 'Billie Roost runs a museum with a runway. A very charming museum.' },
    npc_rudy: { warm: 'Rudy is why Meridian delivers on time. I tell the board so every quarter.', cool: 'Rudy believes a schedule is a moral document. It is a commercial one.' },
    npc_tina: { warm: 'Tina has never launched a minute late. Early, once. We don\'t discuss it.', cool: 'Tina scrubs a launch if a seagull looks at the pad wrongly.' },
  },
};

export const ailie = {
  id: 'npc_ailie',
  name: 'Ailie Ronn',
  shortName: 'Ailie',
  tier: 'minor',
  origin: 'generated',
  role: 'Meridian\'s chief test pilot. Has flown every aircraft built on the Flats, most of them before they were finished.',
  faction: null,
  dialogue: 'dlg_ailie',
  voice: { wave: 'triangle', pitch: 210, variance: 18, rate: 1.2 },
  combat: { maxHealth: 110 },
  appearance: {
    skin: '#f0d0b8', hair: '#c86a2a', hairStyle: 'ponytail', outfit: '#c86a2a', undershirt: '#f4f2ee', tie: '#2e3a4e',
    legs: '#3a3e46', shoes: '#1a1a1e', accessories: ['shades'], accent: '#e8c04a', build: 'wiry', height: 1.0,
  },
  personality: {
    traits: ['fearless', 'cheerful', 'competitive', 'precise in the air, chaotic on the ground'],
    sociability: 0.85, conscientiousness: 0.6, impulsiveness: 0.6, curiosity: 0.8, discretion: 0.5, honesty: 0.8, competitiveness: 0.9, empathy: 0.6, confidence: 0.95, humor: 0.85,
  },
  speech: { rumorPrefix: 'Heard on the radio,', factPrefix: 'Copy that:', refuse: 'Negative, can\'t say.' },
  walkSpeed: 1.15, punctuality: 5, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '05:30', to: '06:30', activity: 'eat', spot: 'starling_ronn:chair', label: 'breakfast, standing up' },
    { from: '06:30', to: '12:00', activity: 'work', spot: 'starling_flats:meridian_apron', label: 'pre-flight checks on the test Kestrel' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'starling_flats:cafe_bench', label: 'lunch at the Contrail Café' },
    { from: '13:00', to: '17:30', activity: 'work', spot: 'starling_flats:tower_base', label: 'flight-test briefings at the tower' },
    { from: '17:30', to: '21:00', activity: 'leisure', spot: 'starling_flats:runway_view', label: 'watching the sunset traffic' },
    { from: '21:00', to: '05:30', activity: 'sleep', spot: 'starling_ronn:bed' },
  ],
  relationships: {
    player: { trust: 10, affection: 15, respect: 5, suspicion: 0 },
    npc_billie: { trust: 60, affection: 60, respect: 80, suspicion: 5 },
    npc_imogen: { trust: 60, affection: 30, respect: 60, suspicion: 5 },
  },
  giftPrefs: { item_coffee: 7, item_honey_bun: 6, tags: { food: 4 } },
  opinions: {
    npc_billie: { warm: 'Billie Roost is the reason I fly. Don\'t tell her. She already knows.', cool: 'Billie still says I cheated in the Escarpment Dash. It was a tailwind. A legal tailwind.' },
    npc_imogen: { warm: 'Dr. Hale signs off my test plans in eleven minutes flat. I time it.', cool: 'Dr. Hale has never been up with me. I keep offering.' },
  },
};

export const rudy = {
  id: 'npc_rudy',
  name: 'Rudy Durr',
  shortName: 'Rudy',
  tier: 'minor',
  origin: 'generated',
  role: 'Meridian\'s head of production. Owns the line board, every torque wrench on the Flats, and the phrase "not on my floor".',
  faction: null,
  dialogue: 'dlg_rudy',
  voice: { wave: 'square', pitch: 105, variance: 10, rate: 0.9 },
  combat: { maxHealth: 130 },
  appearance: {
    skin: '#a8724e', hair: '#3a3a3a', hairStyle: 'hardhat', outfit: '#3a4a5a', undershirt: '#f2ead8', tie: '#e8a040',
    legs: '#2a3440', shoes: '#1a1a1a', beard: '#3a3a3a', accent: '#e8a040', build: 'broad', height: 1.03,
  },
  personality: {
    traits: ['meticulous', 'gruff', 'fair', 'allergic to lateness'],
    sociability: 0.4, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.7, honesty: 0.9, empathy: 0.5, confidence: 0.8, humor: 0.3,
  },
  speech: { rumorPrefix: 'Floor talk says', factPrefix: 'On the board:', refuse: 'Not my department.' },
  walkSpeed: 1.0, punctuality: -15, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '05:00', to: '05:30', activity: 'eat', spot: 'starling_durr:chair', label: 'porridge, by the clock' },
    { from: '05:30', to: '12:00', activity: 'work', spot: 'meridian_assembly:floor', label: 'walking the final-assembly line' },
    { from: '12:00', to: '12:30', activity: 'eat', spot: 'meridian_assembly:office', label: 'lunch at the line office' },
    { from: '12:30', to: '15:30', activity: 'work', spot: 'meridian_flightline:floor', label: 'on the flight-line hall floor' },
    { from: '15:30', to: '18:00', activity: 'work', spot: 'meridian_space:floor', label: 'checking the clean rooms' },
    { from: '18:00', to: '20:30', activity: 'leisure', spot: 'starling_flats:cafe_bench', label: 'a pint of tea outside the café' },
    { from: '20:30', to: '05:00', activity: 'sleep', spot: 'starling_durr:bed' },
  ],
  relationships: {
    player: { trust: 0, affection: 0, respect: 0, suspicion: 10 },
    npc_imogen: { trust: 80, affection: 35, respect: 80, suspicion: 0 },
    npc_wrenna: { trust: 50, affection: 40, respect: 70, suspicion: 0 },
  },
  giftPrefs: { item_coffee: 6, item_bolts: 4, tags: { food: 3 } },
  opinions: {
    npc_imogen: { warm: 'Dr. Hale backs the floor. Every time.', cool: 'Dr. Hale signs contracts the floor hears about afterwards.' },
    npc_wrenna: { warm: 'Wrenna Torq is the only mechanic on the Flats I\'d let near my jigs.', cool: 'Wrenna borrowed my torque wrench in 2019. It\'s 2019 for that wrench still.' },
  },
};

export const tina = {
  id: 'npc_tina',
  name: 'Tina Minus',
  shortName: 'Tina',
  tier: 'minor',
  origin: 'generated',
  role: 'Meridian\'s launch director. Runs every countdown on the Flats from launch control, to the hundredth of a second.',
  faction: null,
  dialogue: 'dlg_tina',
  voice: { wave: 'sine', pitch: 225, variance: 6, rate: 1.25 },
  combat: { maxHealth: 80 },
  appearance: {
    skin: '#5a3a2a', hair: '#141210', hairStyle: 'curly', outfit: '#3a3a4a', undershirt: '#f4f2ee', tie: '#c84a2a',
    legs: '#2a2a34', shoes: '#141418', accessory: 'glasses', accent: '#c84a2a', build: 'thin', height: 0.98,
  },
  personality: {
    traits: ['exact', 'calm under pressure', 'superstitious about countdowns', 'quietly funny'],
    sociability: 0.5, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.8, honesty: 0.9, empathy: 0.6, confidence: 0.85, humor: 0.6,
  },
  speech: { rumorPrefix: 'On the range net,', factPrefix: 'Confirmed:', refuse: 'Hold. Can\'t say.' },
  walkSpeed: 1.05, punctuality: -5, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '06:00', to: '07:00', activity: 'eat', spot: 'starling_minus:chair', label: 'breakfast, timed' },
    { from: '07:00', to: '13:00', activity: 'work', spot: 'launch_control:director', label: 'in launch control' },
    { from: '13:00', to: '14:00', activity: 'eat', spot: 'starling_flats:pad_view', label: 'lunch with a view of the pad' },
    { from: '14:00', to: '18:00', activity: 'work', spot: 'meridian_vib:floor', label: 'in the vertical integration building' },
    { from: '18:00', to: '21:30', activity: 'leisure', spot: 'starling_flats:ground_station', label: 'watching the dishes track the evening passes' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'starling_minus:bed' },
  ],
  relationships: {
    player: { trust: 5, affection: 5, respect: 0, suspicion: 5 },
    npc_imogen: { trust: 75, affection: 40, respect: 75, suspicion: 0 },
    npc_ailie: { trust: 60, affection: 55, respect: 60, suspicion: 0 },
  },
  giftPrefs: { item_coffee: 8, tags: { food: 3 } },
  opinions: {
    npc_imogen: { warm: 'Dr. Hale never overrules a scrub. That\'s rarer than you\'d think.', cool: 'Dr. Hale asks for launch dates the way other people ask the time.' },
    npc_ailie: { warm: 'Ailie flies chase for every launch. She\'s the only one who keeps up.', cool: 'Ailie whistles in launch control. WHISTLES.' },
  },
};

export const wrenna = {
  id: 'npc_wrenna',
  name: 'Wrenna Torq',
  shortName: 'Wrenna',
  tier: 'minor',
  origin: 'generated',
  role: 'Chief mechanic at Roost Aeroworks — and, by now, most of Roost Aeroworks. Stays on with the hangar when the firm is sold.',
  faction: null,
  dialogue: 'dlg_wrenna',
  voice: { wave: 'triangle', pitch: 170, variance: 14, rate: 1.05 },
  combat: { maxHealth: 120 },
  appearance: {
    skin: '#d8a888', hair: '#4a2a1a', hairStyle: 'messy', outfit: '#5a6a4a', undershirt: '#c8bca4', tie: '#c8402a',
    legs: '#3a4a3a', shoes: '#2a1e14', accent: '#e8c04a', build: 'average', height: 0.98,
  },
  personality: {
    traits: ['practical', 'loyal', 'few words', 'secretly sentimental'],
    sociability: 0.4, conscientiousness: 0.85, impulsiveness: 0.2, discretion: 0.7, honesty: 0.9, empathy: 0.7, confidence: 0.75, humor: 0.55,
  },
  speech: { rumorPrefix: 'Heard in the hangar,', factPrefix: 'Fact:', refuse: 'Dunno. Ask the engine.' },
  walkSpeed: 1.0, punctuality: -5, impulses: [], notices: [], knowledge: [],
  schedule: [
    { from: '05:30', to: '06:00', activity: 'eat', spot: 'starling_torq:chair', label: 'coffee, black, two sugars' },
    { from: '06:00', to: '12:00', activity: 'work', spot: 'roost_hangar:wrenna', label: 'on the bay in Hangar 1' },
    { from: '12:00', to: '12:30', activity: 'eat', spot: 'roost_hangar:bench', label: 'lunch at the workbench' },
    { from: '12:30', to: '18:00', activity: 'work', spot: 'roost_hangar:bay', label: 'on the bay in Hangar 1' },
    { from: '18:00', to: '21:00', activity: 'leisure', spot: 'starling_flats:roost_apron', label: 'tinkering with Billie\'s old Skylark on the apron' },
    { from: '21:00', to: '05:30', activity: 'sleep', spot: 'starling_torq:bed' },
  ],
  relationships: {
    player: { trust: 10, affection: 10, respect: 0, suspicion: 5 },
    npc_billie: { trust: 90, affection: 85, respect: 85, suspicion: 0 },
    npc_rudy: { trust: 50, affection: 40, respect: 65, suspicion: 0 },
  },
  giftPrefs: { item_coffee: 8, item_bolts: 6, tags: { food: 3 } },
  opinions: {
    npc_billie: { warm: 'Billie took me on at sixteen with no tools and a bad attitude. I\'ve got tools now.', cool: 'Billie "tunes" engines. I untune them.' },
    npc_rudy: { warm: 'Rudy runs a straight floor. Respect.', cool: 'Rudy wants his torque wrench back. It\'s not his any more. Possession.' },
  },
};

export default [billie, imogen, ailie, rudy, tina, wrenna];
