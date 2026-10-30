// The banks' staff (v0.78.0). Seven people, generated for the update (the owner's request: every bank building is physical, with a
// counter and staff). They follow docs/WORLD_SIMULATION.md: a home with a bed (a flat in Crown Court for the First Bank's staff, a room in the
// Bluebonnet Boarding House for the State Bank's), an occupation, a schedule whose sleep block is in that home.
//
//   First Bank of Halvermouth: Augustus Prime (Governor), Prudence Tally (chief teller), Cyrus Coupon (bond clerk), Bertram Locke (vault guard)
//   Lariat State Bank:         Hollis Marsh (manager and loan officer), Dottie Cain (teller), Clint Brazos (guard)
//
// None is a major character: no interview, no Wrath. Nobody here knows anything about anyone's credit but their own bank's rules, and
// nothing a clerk says changes a rate: the rate is the economy's (see docs/CORPORATE.md).
const local = (o) => ({ tier: 'minor', origin: 'generated', faction: null, walkSpeed: 1, punctuality: 2, impulses: [], notices: [], reactions: {}, knowledge: [], noSnitch: false, ...o });

// ------------------------------------------------------------- the First Bank of Halvermouth
export const augustus = local({
  id: 'npc_augustus', name: 'Augustus Prime', shortName: 'Augustus',
  combat: { never: true, maxHealth: 80 },
  role: 'Governor of the First Bank of Halvermouth. Meets the economy once a month, writes down what it said, and sets the rate accordingly. Insists the rate is not his.',
  dialogue: 'dlg_augustus',
  voice: { wave: 'sine', pitch: 120, variance: 8, rate: 0.85 },
  appearance: { skin: '#d8b090', hair: '#c8c4bc', hairStyle: 'parted', outfit: '#2a3040', undershirt: '#f4f2ee', tie: '#7a2a34', legs: '#222633', shoes: '#141418', accessories: ['watchchain'], accent: '#c9a24a', build: 'average', height: 1.03 },
  personality: { traits: ['measured', 'dry', 'incorruptible', 'allergic to being quoted'], sociability: 0.4, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.95, honesty: 0.95, empathy: 0.5, confidence: 0.85, humor: 0.35 },
  speech: { rumorPrefix: 'It is not the Bank\'s view, but', factPrefix: 'The record shows', refuse: 'The Bank does not comment on that.' },
  schedule: [
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'crown_court_2:bed' },
    { from: '06:30', to: '08:30', activity: 'eat', spot: 'crown_court_2:chair', label: 'breakfast and the overnight figures' },
    { from: '08:30', to: '12:30', activity: 'work', spot: 'first_bank_office:desk', label: 'at the Governor\'s desk' },
    { from: '12:30', to: '13:30', activity: 'eat', spot: 'halvermouth:b_bank_out', label: 'lunch on the bank steps' },
    { from: '13:30', to: '17:30', activity: 'work', spot: 'first_bank_office:desk', label: 'at the Governor\'s desk' },
    { from: '17:30', to: '22:00', activity: 'relax', spot: 'crown_court_2:chair', label: 'reading the economy\'s minutes' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 5 }, npc_prudence: { trust: 60, affection: 30, respect: 45, suspicion: 0 }, npc_cyrus: { trust: 40, affection: 15, respect: 35, suspicion: 5 }, npc_bertram: { trust: 55, affection: 25, respect: 40, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_cigar: 3, tags: { food: 1 } },
  opinions: {
    npc_prudence: { warm: 'Miss Tally has never once been wrong about a column of figures. I have tested this.', cool: 'Miss Tally corrects my sums in pencil. Where I can see them.' },
    npc_cyrus: { warm: 'Mr Coupon is sound on the bond desk. His enthusiasm is the only unsound thing about him.', cool: 'Mr Coupon would sell a bond to a lamp-post. It would be a good bond.' },
    npc_bertram: { warm: 'Mr Locke has guarded that door for nineteen years and has never asked what is behind it. A professional.', cool: 'Mr Locke hums. At the vault. It is a mild irritation.' },
  },
});

export const prudence = local({
  id: 'npc_prudence', name: 'Prudence Tally', shortName: 'Prudence',
  combat: { never: true, maxHealth: 80 },
  role: 'Chief teller of the First Bank of Halvermouth. Runs the counter, knows every account holder by hand-writing, and corrects the Governor in pencil.',
  dialogue: 'dlg_prudence',
  voice: { wave: 'triangle', pitch: 260, variance: 14, rate: 1.1 },
  appearance: { skin: '#e8c4a0', hair: '#4a3a30', hairStyle: 'bun', outfit: '#3a4a5a', undershirt: '#f4f2ee', tie: '#c9a24a', legs: '#2a3040', shoes: '#141418', accessory: 'glasses', accent: '#c9a24a', build: 'thin', height: 0.97 },
  personality: { traits: ['precise', 'warm underneath', 'miserly with errors', 'remembers handwriting'], sociability: 0.6, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.85, honesty: 0.95, empathy: 0.65, confidence: 0.8, humor: 0.5 },
  speech: { rumorPrefix: 'Between the grille and me,', factPrefix: 'To the obol:', refuse: 'That\'s not a counter matter, dear.' },
  schedule: [
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'crown_court_1:bed' },
    { from: '06:30', to: '08:20', activity: 'eat', spot: 'crown_court_1:chair', label: 'tea and toast' },
    { from: '08:20', to: '12:30', activity: 'work', spot: 'first_bank:teller', label: 'behind the tellers\' grille' },
    { from: '12:30', to: '13:15', activity: 'eat', spot: 'halvermouth:b_bank_out', label: 'lunch on the bank steps' },
    { from: '13:15', to: '17:20', activity: 'work', spot: 'first_bank:teller', label: 'behind the tellers\' grille' },
    { from: '17:20', to: '22:00', activity: 'relax', spot: 'crown_court_1:chair', label: 'knitting, and balancing the day in her head' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 5 }, npc_augustus: { trust: 60, affection: 30, respect: 40, suspicion: 0 }, npc_cyrus: { trust: 45, affection: 40, respect: 30, suspicion: 0 }, npc_bertram: { trust: 60, affection: 45, respect: 35, suspicion: 0 } },
  giftPrefs: { item_coffee: 8, item_wildflowers: 6, tags: { sweet: 4 } },
  opinions: {
    npc_augustus: { warm: 'The Governor is the only man I would trust with the rate. He doesn\'t want it. That is the qualification.', cool: 'The Governor writes his figures in ink. Ink! As if he were sure.' },
    npc_cyrus: { warm: 'Cyrus is a love. A bond-crazed love.', cool: 'Cyrus told a customer a bond was "exciting". In my bank.' },
    npc_bertram: { warm: 'Bertram walks me to the tram every evening and never says a word. Bless him.', cool: 'Bertram eats at the counter. Crumbs.' },
  },
});

export const cyrus = local({
  id: 'npc_cyrus', name: 'Cyrus Coupon', shortName: 'Cyrus',
  combat: { never: true, maxHealth: 80 },
  role: 'Bond clerk at the First Bank of Halvermouth. Sells government bonds at par, explains yields to anyone who stands still, and is thrilled by all of it.',
  dialogue: 'dlg_cyrus',
  voice: { wave: 'triangle', pitch: 190, variance: 28, rate: 1.2 },
  appearance: { skin: '#c8906a', hair: '#2a1e1a', hairStyle: 'curly', outfit: '#6a3a28', undershirt: '#f4f2ee', tie: '#2a6a4a', legs: '#2a2a32', shoes: '#241a14', accessory: 'glasses', accent: '#e8c04a', build: 'round', height: 0.98 },
  personality: { traits: ['enthusiastic', 'earnest', 'bond-obsessed', 'talks with his hands'], sociability: 0.9, conscientiousness: 0.8, impulsiveness: 0.35, discretion: 0.6, honesty: 0.9, empathy: 0.7, confidence: 0.7, humor: 0.65 },
  speech: { rumorPrefix: 'Now between you and the yield curve,', factPrefix: 'As a matter of arithmetic,', refuse: 'Oh, I couldn\'t say. Ask the Governor — he won\'t say either.' },
  schedule: [
    { from: '23:00', to: '07:00', activity: 'sleep', spot: 'crown_court_3:bed' },
    { from: '07:00', to: '08:30', activity: 'eat', spot: 'crown_court_3:chair', label: 'breakfast, and the yields in the paper' },
    { from: '08:30', to: '12:45', activity: 'work', spot: 'first_bank:bond_clerk', label: 'at the bond desk' },
    { from: '12:45', to: '13:30', activity: 'eat', spot: 'halvermouth:b_bank_out', label: 'a sandwich on the steps' },
    { from: '13:30', to: '17:15', activity: 'work', spot: 'first_bank:bond_clerk', label: 'at the bond desk' },
    { from: '17:15', to: '23:00', activity: 'leisure', spot: 'crown_court_3:chair', label: 'working out what a bond would have paid' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_augustus: { trust: 45, affection: 25, respect: 50, suspicion: 0 }, npc_prudence: { trust: 50, affection: 45, respect: 35, suspicion: 0 }, npc_bertram: { trust: 40, affection: 30, respect: 20, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_honey_bun: 8, tags: { sweet: 4 } },
  opinions: {
    npc_augustus: { warm: 'The Governor can say "unchanged" in nine ways. I have counted. It is the most beautiful word in finance.', cool: 'The Governor has never smiled at a yield. Not once.' },
    npc_prudence: { warm: 'Miss Tally checks my arithmetic. I check hers. We have never disagreed. We are wary of each other.', cool: 'Miss Tally says "exciting" is not a financial term. I say it should be.' },
    npc_bertram: { warm: 'Bertram listens to my bond lectures. Bertram is a saint.', cool: 'Bertram yawns at the five-year. The FIVE-YEAR.' },
  },
});

export const bertram = local({
  id: 'npc_bertram', name: 'Bertram Locke', shortName: 'Bertram',
  combat: { fights: true, defends: true, weapon: 'item_baton', maxHealth: 160 },
  role: 'Guard at the First Bank of Halvermouth. Stands by the vault door nine to five, as he has for nineteen years, and has never once looked behind it.',
  dialogue: 'dlg_bertram',
  voice: { wave: 'square', pitch: 85, variance: 6, rate: 0.75 },
  appearance: { skin: '#a8744c', hair: '#6a6a6a', hairStyle: 'short', outfit: '#1e2a3a', undershirt: '#f4f2ee', tie: '#1e2a3a', legs: '#1e2a3a', shoes: '#0e0e12', accessory: null, accent: '#c9a24a', build: 'broad', height: 1.1 },
  personality: { traits: ['stolid', 'loyal', 'hums to himself', 'unflappable'], sociability: 0.3, conscientiousness: 1, impulsiveness: 0.1, discretion: 0.95, honesty: 0.9, empathy: 0.5, confidence: 0.85, humor: 0.3 },
  speech: { rumorPrefix: 'Heard it said,', factPrefix: 'Plain fact:', refuse: 'Not my door to talk about.' },
  schedule: [
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'crown_court_3:bed_b' },
    { from: '06:00', to: '08:00', activity: 'eat', spot: 'crown_court_3:chair', label: 'porridge, strictly' },
    { from: '08:00', to: '12:30', activity: 'guard', spot: 'first_bank:guard_post', label: 'by the vault door' },
    { from: '12:30', to: '13:00', activity: 'eat', spot: 'halvermouth:b_bank_out', label: 'lunch on the steps' },
    { from: '13:00', to: '17:30', activity: 'guard', spot: 'first_bank:guard_post', label: 'by the vault door' },
    { from: '17:30', to: '22:00', activity: 'relax', spot: 'crown_court_3:chair', label: 'poetry, and a mug of tea' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_augustus: { trust: 55, affection: 25, respect: 45, suspicion: 0 }, npc_prudence: { trust: 60, affection: 45, respect: 35, suspicion: 0 }, npc_cyrus: { trust: 40, affection: 35, respect: 20, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_cigar: 3, tags: { food: 3 } },
  opinions: {
    npc_augustus: { warm: 'The Governor is fair. Doesn\'t ask me my views. I appreciate that.', cool: 'The Governor stood in front of the vault door once. I made him step back. He thanked me.' },
    npc_prudence: { warm: 'Miss Tally. Good lady. I walk her to the tram.', cool: 'Miss Tally reads my poetry over my shoulder.' },
    npc_cyrus: { warm: 'Mr Coupon talks. I listen. It works.', cool: 'Mr Coupon has explained the five-year to me forty times. It is still a bond.' },
  },
});

// ------------------------------------------------------------- Lariat State Bank
export const hollis = local({
  id: 'npc_hollis', name: 'Hollis Marsh', shortName: 'Hollis',
  combat: { never: true, maxHealth: 80 },
  role: 'Manager and loan officer of the Lariat State Bank, est. 1911. Lends to farmers, ranchers and anyone with shares worth the paper, and knows which is which.',
  dialogue: 'dlg_hollis',
  voice: { wave: 'triangle', pitch: 150, variance: 20, rate: 0.95 },
  appearance: { skin: '#e0b894', hair: '#8a8a82', hairStyle: 'hat', hatColor: '#5a4a3a', outfit: '#5a4a3a', undershirt: '#f2ead8', tie: '#7a2a24', legs: '#3a3228', shoes: '#2a1e14', accessory: 'glasses', accent: '#c9a24a', build: 'round', height: 1.0 },
  personality: { traits: ['fair', 'slow to say yes', 'slower to say no', 'knows everybody\'s fences'], sociability: 0.7, conscientiousness: 0.9, impulsiveness: 0.1, discretion: 0.8, honesty: 0.9, empathy: 0.7, confidence: 0.7, humor: 0.5 },
  speech: { rumorPrefix: 'Folks at the window say', factPrefix: 'The ledger says', refuse: 'That\'s between the bank and the borrower, friend.' },
  schedule: [
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'boarding_house:bed_hollis' },
    { from: '06:30', to: '08:30', activity: 'eat', spot: 'boarding_house:bed_hollis', label: 'breakfast and the cotton prices' },
    { from: '08:30', to: '12:00', activity: 'work', spot: 'lariat_bank:manager', label: 'at the manager\'s desk' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:stool', label: 'lunch at the diner' },
    { from: '13:00', to: '16:30', activity: 'work', spot: 'lariat_bank:manager', label: 'at the manager\'s desk' },
    { from: '16:30', to: '22:00', activity: 'leisure', spot: 'boarding_house:bed_hollis', label: 'going over the day\'s loans' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 5 }, npc_dottie: { trust: 55, affection: 40, respect: 40, suspicion: 0 }, npc_clint: { trust: 50, affection: 35, respect: 30, suspicion: 0 }, npc_chuckie: { trust: 40, affection: 30, respect: 30, suspicion: 0 } },
  giftPrefs: { item_pecan_pie: 8, item_coffee: 4, tags: { sweet: 4 } },
  opinions: {
    npc_dottie: { warm: 'Dottie counts faster than the adding machine and says it\'s a gift. It is.', cool: 'Dottie hums hymns at the window. Flat.' },
    npc_clint: { warm: 'Clint stands by that door like it was his own. Fifty-one years with no robbery. He takes it personally.', cool: 'Clint drinks my coffee. All of it.' },
    npc_chuckie: { warm: 'Chuckie pays his notes on the day and tips the teller in cheese. A good customer.', cool: 'Chuckie tried to pledge a cow. A talking one. She had opinions about the interest.' },
  },
});

export const dottie = local({
  id: 'npc_dottie', name: 'Dottie Cain', shortName: 'Dottie',
  combat: { never: true, maxHealth: 80 },
  role: 'Teller at the Lariat State Bank. Counts the cotton money twice, knows every farmer\'s deposit by the dirt on the envelope, and hums hymns at the window.',
  dialogue: 'dlg_dottie',
  voice: { wave: 'triangle', pitch: 290, variance: 26, rate: 1.1 },
  appearance: { skin: '#f0d0b0', hair: '#9a5a2a', hairStyle: 'ponytail', outfit: '#5a7a9a', undershirt: '#f4f2ee', tie: '#c8402a', legs: '#3a3a4a', shoes: '#2a1e14', accessory: null, accent: '#c9a24a', build: 'thin', height: 0.96 },
  personality: { traits: ['quick', 'cheerful', 'hums hymns', 'discreet about money, not about weather'], sociability: 0.85, conscientiousness: 0.9, impulsiveness: 0.2, discretion: 0.85, honesty: 0.95, empathy: 0.8, confidence: 0.7, humor: 0.7 },
  speech: { rumorPrefix: 'Well, I can\'t say a word about money, but I can say', factPrefix: 'The cotton people say', refuse: 'Hon, a teller never tells.' },
  schedule: [
    { from: '22:00', to: '07:00', activity: 'sleep', spot: 'boarding_house:bed_dottie' },
    { from: '07:00', to: '08:30', activity: 'eat', spot: 'boarding_house:bed_dottie', label: 'eggs and hymns' },
    { from: '08:30', to: '12:00', activity: 'work', spot: 'lariat_bank:teller', label: 'at the teller\'s window' },
    { from: '12:00', to: '12:45', activity: 'eat', spot: 'lariat:main_bench', label: 'lunch on the bench out front' },
    { from: '12:45', to: '16:30', activity: 'work', spot: 'lariat_bank:teller', label: 'at the teller\'s window' },
    { from: '16:30', to: '22:00', activity: 'leisure', spot: 'diner:stool', label: 'pie and gossip at the diner', errand: 'lariat_evening', errandChance: 0.3 },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_hollis: { trust: 55, affection: 40, respect: 40, suspicion: 0 }, npc_clint: { trust: 50, affection: 45, respect: 25, suspicion: 0 }, npc_opal: { trust: 40, affection: 35, respect: 25, suspicion: 0 } },
  giftPrefs: { item_pecan_pie: 8, item_wildflowers: 8, item_coffee: 3, tags: { sweet: 4 } },
  opinions: {
    npc_hollis: { warm: 'Mr Marsh is the fairest man in the county. And the slowest to sign anything.', cool: 'Mr Marsh says "let me think on it". The thinking takes a week.' },
    npc_clint: { warm: 'Clint sees me to my door every evening. Never says why.', cool: 'Clint stands in front of the safe-deposit boxes. All day. They are boxes.' },
    npc_opal: { warm: 'Opal and I have the same news by noon. Hers has more adjectives.', cool: 'Opal pays in nickels. Out of spite.' },
  },
});

export const clint = local({
  id: 'npc_clint', name: 'Clint Brazos', shortName: 'Clint',
  combat: { fights: true, defends: true, weapon: 'item_revolver', maxHealth: 140 },
  role: 'Guard at the Lariat State Bank, and a deputy in a past life. Has stood by that door for fifty-one years without a robbery, and takes it personally.',
  dialogue: 'dlg_clint',
  voice: { wave: 'square', pitch: 100, variance: 10, rate: 0.8 },
  appearance: { skin: '#c89a74', hair: '#cfcfc8', hairStyle: 'hat', hatColor: '#4a3a2a', outfit: '#6a5a3a', undershirt: '#f2ead8', tie: '#4a3a2a', legs: '#3a3228', shoes: '#2a1e14', accessories: ['vest'], accent: '#c9a24a', build: 'wiry', height: 1.04 },
  personality: { traits: ['laconic', 'watchful', 'old-fashioned', 'loves the coffee'], sociability: 0.4, conscientiousness: 1, impulsiveness: 0.1, discretion: 0.9, honesty: 0.9, empathy: 0.6, confidence: 0.9, humor: 0.4 },
  speech: { rumorPrefix: 'Heard tell', factPrefix: 'Know for a fact', refuse: 'Not a thing I\'ll say, son.' },
  schedule: [
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'boarding_house:bed_clint' },
    { from: '06:00', to: '08:30', activity: 'eat', spot: 'boarding_house:bed_clint', label: 'coffee, black, a lot of it' },
    { from: '08:30', to: '12:00', activity: 'guard', spot: 'lariat_bank:guard_post', label: 'by the door' },
    { from: '12:00', to: '12:45', activity: 'eat', spot: 'lariat:diner_bench', label: 'lunch outside the diner' },
    { from: '12:45', to: '16:30', activity: 'guard', spot: 'lariat_bank:guard_post', label: 'by the door' },
    { from: '16:30', to: '22:00', activity: 'relax', spot: 'boarding_house:bed_clint', label: 'cleaning a revolver he has never fired in anger' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_hollis: { trust: 50, affection: 35, respect: 40, suspicion: 0 }, npc_dottie: { trust: 55, affection: 45, respect: 35, suspicion: 0 } },
  giftPrefs: { item_coffee: 10, item_cigar: 4, tags: { food: 3 } },
  opinions: {
    npc_hollis: { warm: 'Mr Marsh signs for every loan himself. Reads it twice. That is a banker.', cool: 'Mr Marsh moves the coffee pot. Every week. I find it.' },
    npc_dottie: { warm: 'Dottie\'s a good girl. Safe home, every night. That\'s my one rule.', cool: 'Dottie hums. Through the whole day. Through a whole hymnal.' },
  },
});

export default [augustus, prudence, cyrus, bertram, hollis, dottie, clint];
