// The ten employees of Ober's Oil. Generated for the Moneybucks import at the
// player's request ("about 10 employees that you will need to generate").
// Lighter residents: look, job, routine, personality, relationships, opinions.

const picket = (id, spot) => ({
  id: `picket_${id}`, activity: 'picket', spot: `ober_fields:${spot}`, label: 'on the picket line',
  trait: 'empathy', weight: 4, duringActivity: ['work'], duration: 60, cooldown: 0, when: { oil: { strike: true } },
});

const staff = (o) => ({ tier: 'minor', origin: 'imported-generated', faction: 'fac_oil', walkSpeed: 1, punctuality: 5, impulses: [], notices: [], ...o });

export const crisp = staff({
  id: 'npc_crisp', name: 'Bartholomew Crisp', shortName: 'Crisp',
  combat: { never: true, maxHealth: 80 },
  role: 'Butler of Moneybucks Manor for thirty years. Decides who gets through the front door.',
  dialogue: 'dlg_crisp',
  voice: { wave: 'triangle', pitch: 210, variance: 8, rate: 1.3 },
  appearance: { skin: '#f0d2b8', hair: '#c9c6c0', hairStyle: 'parted', outfit: '#1d1d22', tie: '#f2efe8', legs: '#16161a', build: 'thin', height: 1.08, accent: '#c9c6c0' },
  personality: { traits: ['impeccable', 'loyal', 'quietly keeping score'], sociability: 0.35, conscientiousness: 1, impulsiveness: 0.05, discretion: 0.85, honesty: 0.7, empathy: 0.5 },
  speech: { rumorPrefix: 'It is not my place to repeat it, but', factPrefix: 'I can confirm that', refuse: 'The household does not discuss such matters.' },
  punctuality: 10,
  schedule: [
    { from: '06:00', to: '22:30', activity: 'work', spot: 'manor:butler_post' },
    { from: '22:30', to: '06:00', activity: 'sleep', spot: 'manor:staff_bed1' },
  ],
  impulses: [{ id: 'polish_silver', activity: 'polish', spot: 'manor:dining_b', label: 'polishing the silver', trait: 'conscientiousness', weight: 1.5, duringActivity: ['work'], duration: 30, cooldown: 240 }],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 5 }, npc_moneybucks: { trust: 20, affection: -10, respect: 30, suspicion: 0 }, npc_mabel: { trust: 30, affection: 25, respect: 20, suspicion: 0 }, npc_agnes: { trust: 25, affection: 20, respect: 25, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_crisp_insult_ledger'],
  giftPrefs: { item_coffee: 4, item_wildflowers: 6, tags: { food: 2 } },
  notices: [],
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks is a most… consistent employer.', cool: 'Sir Moneybucks has called me "the hat stand" since Tideday. I have made a note.' },
    npc_agnes: { warm: 'Miss Thornbury is the only person in this house who says thank you.', cool: 'Miss Thornbury works too late.' },
  },
});

export const agnes = staff({
  id: 'npc_agnes', name: 'Agnes Thornbury', shortName: 'Agnes',
  combat: { never: true },
  role: 'Secretary and bookkeeper to Sir Moneybucks. Sells Ober\'s Oil shares — and knows exactly what the books hide.',
  dialogue: 'dlg_agnes',
  voice: { wave: 'triangle', pitch: 360, variance: 25, rate: 1 },
  appearance: { skin: '#e6b896', hair: '#7a4a2a', hairStyle: 'bun', outfit: '#4a5a6a', accessory: 'glasses', build: 'thin', height: 0.97, accent: '#c9a24a', holding: 'clipboard' },
  personality: { traits: ['meticulous', 'conflicted', 'quietly principled'], sociability: 0.4, conscientiousness: 0.9, impulsiveness: 0.15, discretion: 0.7, honesty: 0.8, empathy: 0.6, curiosity: 0.5 },
  speech: { rumorPrefix: 'Off the record,', factPrefix: 'According to the books,', refuse: 'That is confidential. I take confidentiality seriously. Usually.' },
  schedule: [
    { from: '07:00', to: '08:30', activity: 'eat', spot: 'manor:dining_b' },
    { from: '08:30', to: '17:30', activity: 'work', spot: 'manor:agnes_desk' },
    { from: '17:30', to: '19:00', activity: 'leisure', spot: 'lanternside:park_bench', label: 'an evening walk in Gullwing Park', errand: 'outing' },
    { from: '19:00', to: '22:00', activity: 'leisure', spot: 'manor:hall_center' },
    { from: '22:00', to: '07:00', activity: 'sleep', spot: 'manor:staff_bed4' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 0 }, npc_moneybucks: { trust: 10, affection: -10, respect: 20, suspicion: 10 }, npc_crisp: { trust: 30, affection: 25, respect: 20, suspicion: 0 }, npc_otto: { trust: 15, affection: 10, respect: 15, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_moneybucks_bought_seal', 'fact_night_tankers', 'fact_workers_grievances', 'fact_lens_in_vault'],
  giftPrefs: { item_wildflowers: 8, item_honey_bun: 5, item_coffee: 4, tags: { sweet: 4 } },
  notices: [{ map: 'manor', tag: 'saw_player_manor', text: 'The newcomer was in the study.', importance: 2 }],
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks pays on time. My wages, at least.', cool: 'I balance his books. I could not balance him.' },
    npc_otto: { warm: 'Mr. Brandt is the only one down there who reads the contracts.', cool: 'Mr. Brandt should be careful.' },
  },
});

export const gideon = staff({
  id: 'npc_gideon', name: 'Gideon Slate', shortName: 'Gideon',
  combat: { fights: true, maxHealth: 120 },
  role: 'Refinery foreman. Hires day labour, docks pay, runs the company store.',
  dialogue: 'dlg_gideon', shop: 'shop_company',
  voice: { wave: 'square', pitch: 165, variance: 20, rate: 1.05 },
  appearance: { skin: '#c48a62', hair: '#2a2420', hairStyle: 'hardhat', hatColor: '#f2c14e', outfit: '#5a4a3a', accessories: ['vest'], vestColor: '#e07a3a', holding: 'clipboard', build: 'broad', height: 1.03, accent: '#e07a3a' },
  personality: { traits: ['hard-driving', 'by the stopwatch', 'company man'], sociability: 0.4, conscientiousness: 0.9, impulsiveness: 0.2, discretion: 0.5, honesty: 0.6, empathy: 0.2, patience: 0.3 },
  speech: { rumorPrefix: 'Word on the floor is', factPrefix: 'Fact is,', refuse: 'Not your business. Back to work.' },
  punctuality: 15,
  schedule: [
    { from: '05:30', to: '06:00', activity: 'eat', spot: 'bunkhouse:table_a' },
    { from: '06:00', to: '12:00', activity: 'work', spot: 'refinery:foreman', onArrive: [{ restock: 'shop_company' }] },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'bunkhouse:table_a' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'refinery:foreman' },
    { from: '18:00', to: '22:00', activity: 'leisure', spot: 'bunkhouse:table_a' },
    { from: '22:00', to: '05:30', activity: 'sleep', spot: 'bunkhouse:bunk1' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 5 }, npc_moneybucks: { trust: 30, affection: 5, respect: 40, suspicion: 0 }, npc_otto: { trust: -10, affection: -15, respect: 10, suspicion: 25 }, npc_ruby: { trust: 20, affection: 5, respect: 30, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_workers_grievances'],
  giftPrefs: { item_coffee: 6, item_cigar: 8, tags: { food: 2 } },
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks built all this from one hole in the ground. Respect that.', cool: 'He wants more barrels and fewer workers. Can\'t have both forever.' },
    npc_otto: { warm: 'Brandt\'s a good fitter.', cool: 'Brandt\'s up to something. I can smell it over the crude.' },
  },
});

export const ruby = staff({
  id: 'npc_ruby', name: 'Ruby Calder', shortName: 'Ruby',
  combat: { fights: true, weapon: 'item_crowbar' },
  role: 'Refinery engineer. Keeps the column from exploding, mostly by shouting at people.',
  dialogue: 'dlg_ruby',
  voice: { wave: 'triangle', pitch: 300, variance: 40, rate: 0.95 },
  appearance: { skin: '#8a5a3c', hair: '#2a1e1a', hairStyle: 'ponytail', outfit: '#3f6f8f', undershirt: '#e9e2d0', accessory: 'goggles', accent: '#9ad1c4', build: 'average', height: 0.99 },
  personality: { traits: ['safety-minded', 'blunt', 'fiercely fair'], sociability: 0.5, conscientiousness: 0.85, impulsiveness: 0.2, discretion: 0.4, honesty: 0.9, empathy: 0.75 },
  speech: { rumorPrefix: 'Heard on the floor that', factPrefix: 'I measured it:', refuse: 'Not mine to say.' },
  schedule: [
    { from: '06:00', to: '14:00', activity: 'work', spot: 'refinery:column_spot' },
    { from: '14:00', to: '16:00', activity: 'work', spot: 'ober_fields:pumpjack_spot', label: 'pumpjack maintenance' },
    { from: '16:00', to: '18:00', activity: 'work', spot: 'refinery:column_spot' },
    { from: '18:00', to: '22:00', activity: 'leisure', spot: 'bunkhouse:table_b' },
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'bunkhouse:bunk2' },
  ],
  impulses: [picket('ruby', 'picket_1')],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 0 }, npc_moneybucks: { trust: -10, affection: -20, respect: 10, suspicion: 10 }, npc_otto: { trust: 30, affection: 30, respect: 25, suspicion: 0 }, npc_delphine: { trust: 15, affection: 10, respect: 30, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_workers_grievances'],
  giftPrefs: { item_coffee: 6, item_bandage: 6, item_brass_cog: 4, tags: { mechanical: 3 } },
  reactions: { fact_player_cut_corners: { rel: { trust: -6, respect: -4 } } },
  opinions: {
    npc_moneybucks: { warm: 'He pays for parts. Eventually.', cool: 'He calls safety "sentimental". I call it "having ten fingers".' },
    npc_otto: { warm: 'Otto\'s solid. Best fitter on the coast.', cool: 'Otto takes too many risks for other people.' },
  },
});

export const hank = staff({
  id: 'npc_hank', name: 'Hank Dorsey', shortName: 'Hank',
  combat: { fights: true, defends: ['npc_pip', 'npc_ruby', 'npc_otto', 'npc_tibbs'], maxHealth: 120 },
  role: 'Derrick rigger. Fearless, loud, and the source of at least half the tall tales in Lanternside.',
  dialogue: 'dlg_hank',
  voice: { wave: 'sawtooth', pitch: 150, variance: 35, rate: 0.9 },
  appearance: { skin: '#e0a882', hair: '#b4622a', hairStyle: 'cap', hatColor: '#c0614a', beard: '#a85a2a', outfit: '#6a4a3a', sleeves: '#8a3b2b', build: 'broad', height: 1.07, accent: '#c0614a' },
  personality: { traits: ['fearless', 'boisterous', 'tall-tale teller'], sociability: 0.9, conscientiousness: 0.5, impulsiveness: 0.7, discretion: 0.1, honesty: 0.5, empathy: 0.6, riskTolerance: 0.95 },
  speech: { rumorPrefix: 'Now I swear this is true —', factPrefix: 'Saw it with these two eyes:', refuse: 'Even Hank Dorsey\'s got one secret. This is it.' },
  punctuality: -5,
  schedule: [
    { from: '06:00', to: '12:00', activity: 'work', spot: 'ober_fields:derrick_a' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'ober_fields:field_entrance', label: 'lunch pail in the dirt' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'ober_fields:derrick_b' },
    { from: '18:00', to: '22:30', activity: 'fish', spot: 'lanternside:pier_mid', label: 'fishing off the pier' },
    { from: '22:30', to: '06:00', activity: 'sleep', spot: 'bunkhouse:bunk3' },
  ],
  impulses: [picket('hank', 'picket_2')],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_moneybucks: { trust: 10, affection: 0, respect: 20, suspicion: 0 }, npc_tibbs: { trust: 20, affection: 25, respect: 15, suspicion: 0 }, npc_pip: { trust: 25, affection: 30, respect: 5, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_night_tankers', 'fact_gulls_organised'],
  giftPrefs: { item_coffee: 4, item_honey_bun: 6, item_scone: 6, item_cigar: 8, tags: { food: 4 } },
  opinions: {
    npc_moneybucks: { warm: 'The boss? Tough as a drill bit. Pays like one too — rarely and with a lot of noise.', cool: 'Boss\'d sell his own moustache if the price was right.' },
    npc_tibbs: { warm: 'Tibbs! Best fishing buddy a man could have. Never catches anything. Neither do I. Perfect.', cool: 'Tibbs owes me a bait bucket.' },
  },
});

export const pip = staff({
  id: 'npc_pip', name: 'Pip Wexley', shortName: 'Pip',
  combat: { never: true },
  role: 'Apprentice and runner at Ober\'s Oil. Believes every word Sir Moneybucks says.',
  dialogue: 'dlg_pip',
  voice: { wave: 'triangle', pitch: 480, variance: 70, rate: 0.75 },
  appearance: { skin: '#f1c9a5', hair: '#e6c35a', hairStyle: 'cap', hatColor: '#3f6f8f', outfit: '#8a9a6a', build: 'thin', height: 0.92, accent: '#3f6f8f' },
  personality: { traits: ['eager', 'gullible', 'kind'], sociability: 0.8, conscientiousness: 0.6, impulsiveness: 0.6, curiosity: 0.8, discretion: 0.2, honesty: 0.9, empathy: 0.7, confidence: 0.3 },
  speech: { rumorPrefix: 'Ooh, ooh, I heard', factPrefix: 'It\'s true, I saw it:', refuse: 'I\'m not supposed to say! I think.' },
  schedule: [
    { from: '06:00', to: '10:00', activity: 'work', spot: 'refinery:barrels_spot' },
    { from: '10:00', to: '12:00', activity: 'work', spot: 'ober_fields:pipeline', label: 'running messages' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'ober_fields:tank_yard' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'refinery:barrels_spot' },
    { from: '18:00', to: '21:00', activity: 'leisure', spot: 'ober_fields:east_overlook', label: 'dreaming of being rich' },
    { from: '21:00', to: '06:00', activity: 'sleep', spot: 'bunkhouse:bunk4' },
  ],
  impulses: [picket('pip', 'picket_3')],
  relationships: { player: { trust: 10, affection: 15, respect: 5, suspicion: 0 }, npc_moneybucks: { trust: 50, affection: 40, respect: 60, suspicion: 0 }, npc_hank: { trust: 30, affection: 30, respect: 30, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil'],
  giftPrefs: { item_honey_bun: 8, item_scone: 6, item_gull_feather: 6, tags: { sweet: 6, food: 4 } },
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks is the greatest man alive! He told me so himself!', cool: 'Sir Moneybucks shouted at me. I probably deserved it. He said I did.' },
    npc_hank: { warm: 'Hank\'s like a big brother. A big loud brother who lies about sharks.', cool: 'Hank said there are sharks in the oil. There aren\'t. Are there?' },
  },
});

export const delphine = staff({
  id: 'npc_delphine', name: 'Delphine Moreau', shortName: 'Delphine',
  combat: { never: true },
  role: 'Refinery chemist. Cold, brilliant, and far more interested in the mystery than the money.',
  dialogue: 'dlg_delphine',
  voice: { wave: 'sine', pitch: 340, variance: 15, rate: 1.1 },
  appearance: { skin: '#f4d7c4', hair: '#1a1a1f', hairStyle: 'long', outfit: '#e8e8ee', sleeves: '#e8e8ee', legs: '#3a3a45', accessory: 'glasses', build: 'thin', height: 1.01, accent: '#6a4a8a' },
  personality: { traits: ['brilliant', 'detached', 'obsessively curious'], sociability: 0.2, conscientiousness: 0.8, impulsiveness: 0.3, curiosity: 0.95, discretion: 0.6, honesty: 0.7, empathy: 0.25 },
  speech: { rumorPrefix: 'Unverified, but', factPrefix: 'Empirically,', refuse: 'I do not speculate aloud.' },
  schedule: [
    { from: '08:00', to: '20:00', activity: 'work', spot: 'refinery:lab' },
    { from: '20:00', to: '21:00', activity: 'leisure', spot: 'lanternside:fountain_side', label: 'watching the dry fountain', errand: 'outing', errandChance: 0.3 },
    { from: '21:00', to: '08:00', activity: 'sleep', spot: 'refinery:lab_cot' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 0 }, npc_moneybucks: { trust: 5, affection: -5, respect: 20, suspicion: 5 }, npc_ruby: { trust: 20, affection: 10, respect: 35, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil'],
  giftPrefs: { item_lens_shard: 0, item_coffee: 8, item_brass_cog: 3, tags: { mystery: 6 } },
  opinions: {
    npc_moneybucks: { warm: 'He funds the lab. That is the entirety of my opinion.', cool: 'He is a reagent that turns everything it touches into money and smoke.' },
    npc_ruby: { warm: 'Calder is the only competent person on the floor.', cool: 'Calder is sentimental about fingers.' },
  },
});

export const silas = staff({
  id: 'npc_silas', name: 'Silas Grimmer', shortName: 'Silas',
  combat: { fights: true, defends: true, weapon: 'item_revolver', maxHealth: 130 },
  role: 'Head of security at Ober\'s Oil. Watches the gate; breaks strikes when told.',
  dialogue: 'dlg_silas',
  voice: { wave: 'sawtooth', pitch: 110, variance: 8, rate: 1.4 },
  appearance: { skin: '#9a6a4a', hair: '#1f1a17', hairStyle: 'hat', hatColor: '#26262c', outfit: '#2f2f38', legs: '#22222a', build: 'broad', height: 1.1, accent: '#8a2b2b' },
  personality: { traits: ['loyal', 'menacing', 'few words'], sociability: 0.2, conscientiousness: 0.8, impulsiveness: 0.2, discretion: 0.9, honesty: 0.4, empathy: 0.1, competitiveness: 0.7 },
  speech: { rumorPrefix: 'They say', factPrefix: 'I know', refuse: 'No.' },
  punctuality: 10,
  schedule: [
    { from: '06:00', to: '18:00', activity: 'work', spot: 'ober_fields:gate_post' },
    { from: '18:00', to: '22:00', activity: 'patrol', spot: 'ober_fields:tank_yard' },
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'manor:staff_bed3' },
  ],
  relationships: { player: { trust: -5, affection: 0, respect: 0, suspicion: 15 }, npc_moneybucks: { trust: 50, affection: 10, respect: 40, suspicion: 0 }, npc_otto: { trust: -20, affection: -20, respect: 5, suspicion: 30 } },
  knowledge: ['fact_moneybucks_owns_oil'],
  giftPrefs: { item_cigar: 6, tags: { food: 1 } },
  notices: [{ map: 'refinery', tag: 'saw_player_refinery', text: 'The newcomer was inside the refinery.', importance: 2 }],
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks. Good employer. Clear instructions.', cool: 'He forgets my name. I don\'t forget his.' },
    npc_otto: { warm: 'Brandt works.', cool: 'Brandt talks. I watch Brandt.' },
  },
});

export const mabel = staff({
  id: 'npc_mabel', name: 'Mabel Quince', shortName: 'Mabel',
  combat: { fights: true, defends: ['npc_crisp', 'npc_agnes'] },
  role: 'Cook at Moneybucks Manor. Champion baker, champion grudge-holder — chiefly against Mags Pell.',
  dialogue: 'dlg_mabel',
  voice: { wave: 'triangle', pitch: 280, variance: 60, rate: 0.9 },
  appearance: { skin: '#e8b894', hair: '#d8d0c0', hairStyle: 'curly', outfit: '#8a3b5a', apron: '#f4efe6', accessory: 'apron', build: 'round', height: 0.95, accent: '#8a3b5a' },
  personality: { traits: ['competitive', 'gossipy', 'warm to friends'], sociability: 0.85, conscientiousness: 0.7, impulsiveness: 0.45, discretion: 0.2, honesty: 0.6, empathy: 0.5, competitiveness: 0.9, humor: 0.6 },
  speech: { rumorPrefix: 'Well! I heard', factPrefix: 'I know for certain', refuse: 'My lips are sealed. Like a good pie crust.' },
  schedule: [
    { from: '05:30', to: '14:00', activity: 'work', spot: 'manor:kitchen' },
    { from: '14:00', to: '15:30', activity: 'socialize', spot: 'lanternside:patio', label: 'glaring at the Kettle & Crumb' },
    { from: '15:30', to: '21:00', activity: 'work', spot: 'manor:kitchen' },
    { from: '21:00', to: '05:30', activity: 'sleep', spot: 'manor:staff_bed2' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 0 }, npc_moneybucks: { trust: 15, affection: 10, respect: 20, suspicion: 0 }, npc_mags: { trust: -10, affection: -25, respect: 10, suspicion: 10 }, npc_crisp: { trust: 30, affection: 25, respect: 20, suspicion: 0 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_mabel_mags_feud'],
  giftPrefs: { item_wildflowers: 6, item_honey_bun: -2, item_scone: 3, tags: { flowers: 5 } },
  opinions: {
    npc_mags: { warm: 'Mags Pell? Fine. FINE. Her buns are adequate.', cool: 'Mags Pell won the Harbour Fair bake-off nine years ago with a bun that was CLEARLY shop-bought. I have the photographs. Somewhere.' },
    npc_moneybucks: { warm: 'Sir Moneybucks appreciates real cooking. He tips. Occasionally. In cigars.', cool: 'He sent back my soufflé. My SOUFFLÉ.' },
  },
});

export const otto = staff({
  id: 'npc_otto', name: 'Otto Brandt', shortName: 'Otto',
  combat: { fights: true, defends: ['npc_ruby', 'npc_pip', 'npc_hank'] },
  role: 'Pipe fitter at Ober\'s Oil, quietly organising the workers. Wears a blue thread on his cuff.',
  dialogue: 'dlg_otto',
  voice: { wave: 'triangle', pitch: 190, variance: 25, rate: 1.05 },
  appearance: { skin: '#d9a77c', hair: '#5b5f66', hairStyle: 'short', moustache: 'plain', outfit: '#4f6a8a', accent: '#3f6fbf', holding: 'wrench', build: 'average', height: 1.0 },
  personality: { traits: ['steady', 'principled', 'patient organiser'], sociability: 0.6, conscientiousness: 0.7, impulsiveness: 0.25, discretion: 0.75, honesty: 0.85, empathy: 0.85, riskTolerance: 0.6 },
  speech: { rumorPrefix: 'Between us,', factPrefix: 'Plain fact:', refuse: 'Can\'t tell you that. Not yet.' },
  schedule: [
    { from: '06:00', to: '12:00', activity: 'work', spot: 'ober_fields:pipeline' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'bunkhouse:table_b' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'refinery:valves_spot' },
    { from: '18:00', to: '20:00', activity: 'socialize', spot: 'bunkhouse:table_a', label: 'talking quietly with the crew' },
    { from: '20:00', to: '22:00', activity: 'leisure', spot: 'lanternside:quay_edge', label: 'meeting the Quay Collective' },
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'bunkhouse:bunk5' },
  ],
  impulses: [picket('otto', 'picket_2')],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 5 }, npc_moneybucks: { trust: -40, affection: -40, respect: 10, suspicion: 40 }, npc_ruby: { trust: 30, affection: 25, respect: 30, suspicion: 0 }, npc_tibbs: { trust: 15, affection: 15, respect: 10, suspicion: 0 }, npc_silas: { trust: -20, affection: -20, respect: 5, suspicion: 30 } },
  knowledge: ['fact_moneybucks_owns_oil', 'fact_workers_grievances', 'fact_otto_organizing'],
  giftPrefs: { item_coffee: 6, item_bandage: 4, item_company_scrip: -4, tags: { food: 3 } },
  reactions: {
    fact_player_backed_strike: { rel: { trust: 15, affection: 10 } },
    fact_player_broke_strike: { rel: { trust: -20, affection: -15 } },
    fact_player_invested: { rel: { trust: -2 } },
  },
  opinions: {
    npc_moneybucks: { warm: 'Sir Moneybucks built something. He just forgot who built it with him.', cool: 'Moneybucks owes forty families three months of wages. He can afford a gold monocle.' },
    npc_ruby: { warm: 'Ruby\'s the reason nobody\'s died this year.', cool: 'Ruby worries. Someone has to.' },
  },
});

export default [crisp, agnes, gideon, ruby, hank, pip, delphine, silas, mabel, otto];
