// Sir Richard E. Moneybucks, Esq. — IMPORTED character (player-supplied image
// and description, 2026-10-13). See docs/characters/npc_moneybucks.md for the
// interview summary and what was supplied vs. invented.
import { PORTRAITS } from '../portraits.js';

export default {
  id: 'npc_moneybucks',
  name: 'Sir Richard E. Moneybucks, Esq.',
  shortName: 'Sir Moneybucks',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_moneybucks_reference.jpg',
    interviewDate: '2026-10-13',
    notes: 'docs/characters/npc_moneybucks.md',
  },
  role: 'Founder and owner of Ober\'s Oil. A genuinely ruthless robber baron — and a man you can do business with.',
  faction: 'fac_oil',
  dialogue: 'dlg_moneybucks',
  motif: 'motif_moneybucks',
  voice: { wave: 'square', pitch: 135, variance: 14, rate: 1.35 },
  appearance: {
    skin: '#e9c1a0', hair: '#5a3a22', hairStyle: 'tophat', hatColor: '#141418', hatBand: '#0a0a0d',
    beard: '#5a3a22', moustache: 'handlebar', outfit: '#1f2029', pattern: 'pinstripe', tie: '#0f0f14',
    legs: '#1a1b22', shoes: '#0d0d10', accent: '#d9b24a', accessories: ['monocle', 'watchchain'], holding: 'cigar',
    build: 'broad', height: 1.04,
    sprite: null,
    portrait: PORTRAITS.npc_moneybucks,
  },
  personality: {
    traits: ['ruthless', 'grandiose', 'contemptuous of the poor', 'calculating', 'competitive'],
    sociability: 0.55, conscientiousness: 0.85, impulsiveness: 0.15, curiosity: 0.3, discretion: 0.9,
    honesty: 0.15, competitiveness: 0.95, empathy: 0.05, confidence: 1, riskTolerance: 0.7, patience: 0.35, humor: 0.4,
    values: ['profit', 'status', 'winning', 'deference'],
    likes: ['cigars', 'deference', 'money', 'winning at cards'], dislikes: ['the poor', 'unions', 'taxes', 'lighthouses', 'being called Moneybags'],
  },
  speech: {
    formality: 0.9, verbosity: 0.7,
    habits: ['"my good fellow"', 'speaks of himself as Sir Moneybucks', 'everything is a transaction', 'withering contempt for the poor'],
    rumorPrefix: 'One hears, from the lower orders, that', factPrefix: 'It is simply a fact, my good fellow, that', refuse: 'That is a matter for my solicitors, and they are expensive.',
  },
  mechanics: {
    statusContempt: true, // treatment depends on the player's wealth & standing (dialogue tiers)
    ledgerChallenge: true, // "The Ledger" card wager in his study
    investments: true, // shares and expansion projects in Ober's Oil
  },
  punctuality: -5, // others wait for Sir Moneybucks
  walkSpeed: 0.85,
  schedule: [
    { from: '07:00', to: '08:00', activity: 'eat', spot: 'manor:dining', label: 'breakfast (caviar)' },
    { from: '08:00', to: '10:00', activity: 'work', spot: 'manor:study_desk' },
    { from: '10:00', to: '11:30', activity: 'patrol', spot: 'ober_fields:inspection_point', label: 'inspecting the fields' },
    { from: '11:30', to: '12:45', activity: 'work', spot: 'manor:study_desk' },
    { from: '12:45', to: '13:30', activity: 'eat', spot: 'manor:dining' },
    { from: '13:30', to: '15:30', activity: 'business', spot: 'lanternside:quay_edge', label: 'surveying the harbour he means to own' },
    { from: '15:30', to: '19:00', activity: 'work', spot: 'manor:study_desk' },
    { from: '19:00', to: '21:00', activity: 'leisure', spot: 'manor:card_table', label: 'cards and cigars' },
    { from: '21:00', to: '07:00', activity: 'sleep', spot: 'manor:master_bed' },
  ],
  impulses: [
    {
      id: 'lean_on_refinery', activity: 'patrol', spot: 'refinery:foreman', label: 'leaning on the refinery',
      trait: 'competitiveness', weight: 1.5, duringActivity: ['work'], duration: 30, cooldown: 300,
    },
    {
      id: 'confront_pickets', activity: 'patrol', spot: 'ober_fields:gate_post', label: 'glaring at the pickets',
      trait: 'competitiveness', weight: 2, duringActivity: ['work', 'leisure'], duration: 40, cooldown: 240,
      when: { oil: { strike: true } },
    },
  ],
  relationships: {
    player: { trust: -5, affection: -10, respect: -15, suspicion: 10 },
    npc_crisp: { trust: 40, affection: 0, respect: 10, suspicion: 0 },
    npc_agnes: { trust: 30, affection: 0, respect: 20, suspicion: 5 },
    npc_gideon: { trust: 30, affection: 0, respect: 30, suspicion: 0 },
    npc_silas: { trust: 50, affection: 5, respect: 30, suspicion: 0 },
    npc_otto: { trust: -20, affection: -20, respect: -10, suspicion: 30 },
    npc_mags: { trust: -10, affection: -10, respect: -5, suspicion: 10 },
    npc_osric: { trust: -10, affection: -15, respect: -20, suspicion: 10 },
    npc_tibbs: { trust: 0, affection: 0, respect: 10, suspicion: 0 },
  },
  knowledge: ['fact_lighthouse_dark', 'fact_moneybucks_owns_oil', 'fact_moneybucks_bought_seal', 'fact_lens_in_vault', 'fact_night_tankers', 'fact_harbourmaster_seal'],
  giftPrefs: { item_cigar: 14, item_honey_bun: -3, item_scone: -3, item_wildflowers: -4, item_gull_feather: -8, item_coffee: 1, tags: { luxury: 10, food: -2, junk: -6 } },
  reactions: {
    fact_player_invested: { rel: { respect: 5, trust: 3 } },
    fact_player_backed_strike: { rel: { trust: -15, respect: -5 }, mood: { id: 'affronted', minutes: 300 } },
    fact_player_broke_strike: { rel: { trust: 10, respect: 8 } },
    fact_player_won_ledger: { rel: { respect: 5 } },
    fact_player_exposed_moneybucks: { rel: { trust: -60, affection: -40, respect: 10 }, mood: { id: 'affronted', minutes: 1440 } },
    fact_player_stole_lens: { rel: { trust: -40, suspicion: 50 }, mood: { id: 'affronted', minutes: 600 } },
    fact_refinery_strike: { mood: { id: 'affronted', minutes: 240 }, bark: 'A STRIKE? On MY derricks?' },
  },
  notices: [{ map: 'manor', tag: 'saw_player_manor', text: 'The newcomer was in my house.', importance: 3 }],
  opinions: {
    npc_mags: { warm: 'The café woman? Shrewd. I shall enjoy buying her.', cool: 'Mrs. Pell sits on the best corner in Lanternside and sells buns on it. Buns. It is practically a crime against real estate.' },
    npc_osric: { warm: 'The clerk is useful. Paperwork keeps the poor busy.', cool: 'Vane sends me forms. I have a man who burns them. It is his whole job.' },
    npc_tibbs: { warm: 'The mechanic has talent. Wasted on boats. I could use him.', cool: 'Hollow makes things explode for free. I pay professionals to do that.' },
    npc_crisp: { warm: 'Crisp has buttled for me for thirty years. He is part of the furniture. Very good furniture.', cool: 'Crisp is getting slow. Like all antiques.' },
    npc_agnes: { warm: 'Miss Thornbury keeps immaculate books. Possibly too immaculate.', cool: 'Miss Thornbury asks questions. Bookkeepers should only answer them.' },
    npc_gideon: { warm: 'Slate gets the work out of them. That is all I ask of a man.', cool: 'Slate has gone soft. He let them have a lunch break.' },
    npc_ruby: { warm: 'Calder is a fine engineer. Expensive opinions, though.', cool: 'Calder wants "safety". Safety is a luxury good.' },
    npc_hank: { warm: 'Dorsey is loud and useful. Like a foghorn.', cool: 'Dorsey talks too much in taverns.' },
    npc_pip: { warm: 'Wexley! The boy will go far. In my employ.', cool: 'Wexley breaks things. Enthusiastically.' },
    npc_delphine: { warm: 'Moreau is brilliant. I have her under contract until she dies.', cool: 'Moreau looks at me as if I were a chemical. An inert one.' },
    npc_silas: { warm: 'Grimmer is loyal. I value loyalty. I have bought a great deal of it.', cool: 'Grimmer should smile less. He has been smiling.' },
    npc_mabel: { warm: 'Mrs. Quince makes the finest beef Wellington in the county. I own the county\'s finest of most things.', cool: 'Mrs. Quince feuds with the café woman. Excellent. Let them weaken each other.' },
    npc_otto: { warm: 'Brandt fits pipes adequately.', cool: 'Brandt has a blue thread on his cuff. I know what it means. I know everything that happens on my land.' },
  },
};
