// Mason Nails — IMPORTED character (player-supplied image and description,
// 2026-10-13) — and his crew at Mason's Os, invented at the player's request
// ("about 3 employees… they all live in a nearby apartment building").
// See docs/characters/npc_mason.md for the interview and what was invented.
import { PORTRAITS } from '../portraits.js';

const crewHome = ['npc_mason', 'npc_dee', 'npc_barnaby', 'npc_quinn'];

// When the player has a property under construction, the crew go and build it.
const buildIt = (id) => ({
  id: `build_${id}`, activity: 'build', spot: 'westbrook:survey', label: 'building your property out on the lots',
  trait: 'conscientiousness', weight: 4, duringActivity: ['work'], duration: 90, cooldown: 60, when: { property: { state: 'building' } },
});

export const mason = {
  id: 'npc_mason',
  combat: { never: true, maxHealth: 120 }, // fight-or-flight temperament (src/systems/combat.js)
  name: 'Mason Nails',
  shortName: 'Mason',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_mason_reference.jpg',
    interviewDate: '2026-10-13',
    notes: 'docs/characters/npc_mason.md',
  },
  role: 'Owner of Mason\'s Os construction ("That\'s O plural!"). Cheerful, endlessly punning, and the man you hire to build your future.',
  faction: 'fac_builders',
  dialogue: 'dlg_mason',
  motif: 'motif_mason',
  voice: { wave: 'triangle', pitch: 150, variance: 30, rate: 1.15 },
  appearance: {
    skin: '#f0c8a8', hair: '#7a4a2a', hairStyle: 'short', beard: '#8a5232', outfit: '#7a2a32', legs: '#3a3f4a', shoes: '#4a3a2a',
    accent: '#f2c14e', accessory: 'glasses', build: 'broad', height: 1.02,
    sprite: null,
    portrait: PORTRAITS.npc_mason,
  },
  personality: {
    traits: ['cheerful', 'pun machine', 'friendly to everyone', 'neutral', 'honest builder'],
    sociability: 0.95, conscientiousness: 0.75, impulsiveness: 0.4, curiosity: 0.6, discretion: 0.5,
    honesty: 0.9, competitiveness: 0.2, empathy: 0.85, confidence: 0.8, riskTolerance: 0.4, patience: 0.9, humor: 1,
    values: ['good work', 'a fair price', 'a good laugh', 'his crew'],
    likes: ['puns', 'dad jokes', 'coffee', 'honey buns', 'his excavator', 'square corners'], dislikes: ['taking sides', 'shoddy work', 'people who don\'t groan'],
  },
  speech: {
    formality: 0.2, verbosity: 0.6,
    habits: ['a pun in nearly every line', 'calls the player "buddy" or "pal"', 'laughs at his own jokes', 'never says a harsh word'],
    rumorPrefix: 'Now I don\'t like to hammer on about it, but', factPrefix: 'Level with you, pal:', refuse: 'Ah, I\'d better not. I\'m a builder, not a blabber. That one stays under my hard hat!',
  },
  wrath: {
    theme: 'construction', // blueprints, hazard tape, I-beams, a wrecking ball, a brick wall (src/engine/wrath.js)
    color: '#ff9a3d',
    banner: 'DEMOLITION ORDER APPROVED',
    subtitle: 'Mason Nails is load-bearing.',
    line: 'Whoa — easy there, buddy! Looks like you just got… nailed. Don\'t worry, pal — I\'ll have you back up to code in no time. No hard feelings!',
  },
  mechanics: {
    alwaysFriendly: true, // relationship with the player never drops below friendly (see reactions)
    punOfTheDay: true, // a different pun every day (Game.dailyPun)
    properties: true, // the contracts board: pay Mason's Os to build on surveyed plots
  },
  punctuality: 5,
  schedule: [
    { from: '06:30', to: '07:30', activity: 'eat', spot: 'cafe:table_window', label: 'breakfast and pun-trading with Mags' },
    { from: '07:30', to: '10:00', activity: 'work', spot: 'westbrook:site_center' },
    { from: '10:00', to: '12:00', activity: 'excavate', spot: 'westbrook:excavator_seat', label: 'digging in the excavator' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'westbrook:lunch_bench' },
    { from: '13:00', to: '15:30', activity: 'work', spot: 'mason_office:desk' },
    { from: '15:30', to: '16:30', activity: 'business', spot: 'civic_office:counter_front', label: 'filing permits with Osric' },
    { from: '16:30', to: '18:30', activity: 'work', spot: 'westbrook:site_center' },
    { from: '18:30', to: '21:00', activity: 'leisure', spot: 'apartments:common' },
    { from: '21:00', to: '06:30', activity: 'sleep', spot: 'plumb_unit_1:bed' },
  ],
  impulses: [
    {
      id: 'pun_rounds', activity: 'work', spot: 'westbrook:foreman_post', label: 'doing the rounds (with puns)',
      trait: 'sociability', weight: 2, duringActivity: ['work'], duration: 20, cooldown: 180,
    },
    buildIt('mason'),
  ],
  relationships: {
    player: { trust: 15, affection: 20, respect: 10, suspicion: 0 },
    npc_dee: { trust: 60, affection: 45, respect: 55, suspicion: 0 },
    npc_ober: { trust: 35, affection: 35, respect: 30, suspicion: 0 },
    npc_barnaby: { trust: 55, affection: 50, respect: 35, suspicion: 0 },
    npc_quinn: { trust: 45, affection: 45, respect: 35, suspicion: 0 },
    npc_mags: { trust: 40, affection: 40, respect: 30, suspicion: 0 },
    npc_osric: { trust: 30, affection: 20, respect: 35, suspicion: 0 },
    npc_tibbs: { trust: 25, affection: 25, respect: 30, suspicion: 0 },
    npc_moneybucks: { trust: 5, affection: 5, respect: 15, suspicion: 10 },
  },
  knowledge: ['fact_masons_os', 'fact_moneybucks_wants_mason'],
  giftPrefs: { item_honey_bun: 10, item_coffee: 8, item_scone: 6, item_bolts: 5, item_gull_feather: 3, tags: { food: 4, sweet: 4, junk: 1 } },
  reactions: {
    fact_player_rushed_site: { bark: 'Hey, no harm done, pal — Rome wasn\'t built in a day. Mostly because they took their time!' },
    fact_player_invested: { bark: 'Shares in oil, eh? Just don\'t let it go to your well!' },
  },
  notices: [{ map: 'mason_office', tag: 'saw_player_office', text: 'The newcomer dropped by the office.', importance: 1 }],
  opinions: {
    npc_ober: { warm: 'Captain Ober! We built his harbour office. He wanted portholes. In an office. We compromised: round windows. He still calls them portholes. Lovely fella — a real WATERED-DOWN version of trouble.', cool: 'The Captain says a building is just a ship that gave up. I say a ship is just a building that\'s lost its foundations.' },
    npc_mags: { warm: 'Mags! Best breakfast on the coast. I tell her a pun, she tells me to pay. It\'s a fair trade.', cool: 'Mags has her moods. Then I bring a pun and she has… worse moods.' },
    npc_osric: { warm: 'Osric\'s a stand-up guy. Stands up very straight. Files very straight. I respect a man who knows his forms.', cool: 'Osric says I\'m exhausting. I said, "Have you tried a nap? You\'ll be well-rested — I\'ll be well-REST-ored!"' },
    npc_tibbs: { warm: 'Tibbs fixes engines, I fix foundations. We\'re basically colleagues. He doesn\'t agree. He doesn\'t a-gear!', cool: 'Tibbs and Barnaby are at it about the gulls again.' },
    npc_moneybucks: { warm: 'Sir Moneybucks pays on time. I\'ll build for anybody who pays on time and doesn\'t ask me to cut corners. He\'s working on the second part.', cool: 'He wants me building only for him. I told him I don\'t take sides — I take measurements!' },
    npc_dee: { warm: 'Dee runs the site tighter than a fresh-torqued bolt. Couldn\'t do it without her. Wouldn\'t want to try!', cool: 'Dee says I need new material. I told her I\'m already using brick.' },
    npc_barnaby: { warm: 'Barnaby could lift the excavator. Wouldn\'t hurt a fly. Or a gull. ESPECIALLY a gull.', cool: 'Barnaby mixed a batch with too much water. Concrete evidence!' },
    npc_quinn: { warm: 'Quinn! Sharpest pencil in the toolbox. Bit nervous, but the lines are perfect.', cool: 'Quinn measured my coffee mug twice yesterday. Measure twice, sip once!' },
  },
};

const crew = (o) => ({ tier: 'minor', origin: 'imported-generated', faction: 'fac_builders', walkSpeed: 1, punctuality: 5, impulses: [], notices: [], ...o });

export const dee = crew({
  id: 'npc_dee', name: 'Dolores "Dee" Rivera', shortName: 'Dee',
  combat: { fights: true, defends: ['npc_mason', 'npc_quinn', 'npc_barnaby'] },
  role: 'Site foreman at Mason\'s Os. Hires day labour, pays fairly, checks every course with a level.',
  dialogue: 'dlg_dee',
  voice: { wave: 'square', pitch: 300, variance: 25, rate: 1.1 },
  appearance: { skin: '#c48a62', hair: '#2a1e1a', hairStyle: 'hardhat', hatColor: '#f2c14e', outfit: '#3f5a7a', accessories: ['vest'], vestColor: '#e07a3a', holding: 'clipboard', build: 'average', height: 0.98, accent: '#e07a3a' },
  personality: { traits: ['no-nonsense', 'fair', 'secretly delighted by puns'], sociability: 0.6, conscientiousness: 0.95, impulsiveness: 0.15, discretion: 0.6, honesty: 0.85, empathy: 0.6, humor: 0.7 },
  speech: { rumorPrefix: 'Site talk says', factPrefix: 'For the record,', refuse: 'Not on my site, not on my watch, not in my notebook.' },
  punctuality: 12,
  schedule: [
    { from: '06:00', to: '06:45', activity: 'eat', spot: 'apartments:common' },
    { from: '06:45', to: '13:00', activity: 'work', spot: 'westbrook:foreman_post' },
    { from: '13:00', to: '13:45', activity: 'eat', spot: 'westbrook:lunch_bench' },
    { from: '13:45', to: '17:30', activity: 'work', spot: 'westbrook:foreman_post' },
    { from: '17:30', to: '21:30', activity: 'leisure', spot: 'apartments:common_b' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'plumb_unit_2:bed' },
  ],
  impulses: [buildIt('dee')],
  relationships: { player: { trust: 5, affection: 5, respect: 0, suspicion: 0 }, npc_mason: { trust: 60, affection: 40, respect: 45, suspicion: 0 }, npc_barnaby: { trust: 50, affection: 40, respect: 35, suspicion: 0 }, npc_quinn: { trust: 40, affection: 45, respect: 40, suspicion: 0 } },
  knowledge: ['fact_masons_os', 'fact_dee_pun_tally'],
  giftPrefs: { item_coffee: 8, item_scone: 5, tags: { food: 3 } },
  reactions: { fact_player_rushed_site: { rel: { respect: -2 } } },
  opinions: {
    npc_mason: { warm: 'Best boss I\'ve had. Don\'t tell him. He\'ll make a pun about it.', cool: 'If he says "concrete evidence" one more time I am pouring him into a footing.' },
    npc_barnaby: { warm: 'Barnaby carries two hods at once and apologises to the bricks.', cool: 'Barnaby, the gulls do not need your lunch.' },
    npc_quinn: { warm: 'Quinn\'s plans are perfect. Quinn just needs to believe it.', cool: 'Quinn re-checked the string line six times. It was right all six.' },
  },
});

export const barnaby = crew({
  id: 'npc_barnaby', name: 'Barnaby Cole', shortName: 'Barnaby',
  combat: { defends: true, maxHealth: 160 },
  role: 'Labourer at Mason\'s Os. A gentle giant who mixes the cement, lays the bricks and defends every gull in Lanternside.',
  dialogue: 'dlg_barnaby',
  voice: { wave: 'sine', pitch: 105, variance: 10, rate: 0.85 },
  appearance: { skin: '#a06a46', hair: '#2a1c14', hairStyle: 'cap', hatColor: '#4a7a4a', beard: '#4a3226', outfit: '#6a7a5a', legs: '#3a3a3a', build: 'broad', height: 1.12, accent: '#e8e2d4' },
  personality: { traits: ['gentle', 'enormous', 'birdwatcher', 'soft-spoken'], sociability: 0.5, conscientiousness: 0.7, impulsiveness: 0.3, discretion: 0.6, honesty: 0.9, empathy: 0.95, patience: 0.9, curiosity: 0.6 },
  speech: { rumorPrefix: 'I heard — and I hope it isn\'t true —', factPrefix: 'Well, it\'s true that', refuse: 'I\'d rather not say. Sorry.' },
  schedule: [
    { from: '06:30', to: '07:00', activity: 'eat', spot: 'apartments:common' },
    { from: '07:00', to: '12:00', activity: 'work', spot: 'westbrook:mixer_spot', label: 'mixing cement' },
    { from: '12:00', to: '13:00', activity: 'leisure', spot: 'westbrook:birdwatch', label: 'watching the gulls on the canal basin' },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'westbrook:bricks_spot', label: 'laying bricks' },
    { from: '17:00', to: '19:00', activity: 'leisure', spot: 'lanternside:pier_mid', label: 'feeding the gulls on the pier' },
    { from: '19:00', to: '22:00', activity: 'leisure', spot: 'apartments:armchair' },
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'plumb_unit_3:bed' },
  ],
  impulses: [buildIt('barnaby')],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_mason: { trust: 55, affection: 55, respect: 40, suspicion: 0 }, npc_dee: { trust: 50, affection: 40, respect: 50, suspicion: 0 }, npc_quinn: { trust: 45, affection: 50, respect: 30, suspicion: 0 }, npc_tibbs: { trust: 0, affection: -15, respect: 15, suspicion: 15 } },
  knowledge: ['fact_masons_os', 'fact_gull_feud'],
  giftPrefs: { item_gull_feather: 14, item_honey_bun: 6, item_scone: 6, item_wildflowers: 5, tags: { food: 4 } },
  opinions: {
    npc_tibbs: { warm: 'Tibbs is clever. I just wish he\'d stop throwing spanners at the gulls.', cool: 'Tibbs called a gull "a rat with a pension". I have not forgiven him.' },
    npc_mason: { warm: 'Mason gave me a job when nobody else would. Also a lot of puns. I keep the job and the puns.', cool: 'Mason. Please. Not before coffee.' },
  },
});

export const quinn = crew({
  id: 'npc_quinn', name: 'Quinn Abernathy', shortName: 'Quinn',
  combat: { never: true, maxHealth: 80 },
  role: 'Apprentice surveyor and draftsperson at Mason\'s Os. Nervous, meticulous — and the one who will draw your future house.',
  dialogue: 'dlg_quinn',
  voice: { wave: 'triangle', pitch: 330, variance: 40, rate: 1.3 },
  appearance: { skin: '#f2d6c0', hair: '#c9813a', hairStyle: 'messy', outfit: '#5a6a7a', accessory: 'glasses', legs: '#3a3a4a', build: 'thin', height: 0.95, accent: '#f2c14e', holding: 'clipboard' },
  personality: { traits: ['nervous', 'meticulous', 'secretly brilliant'], sociability: 0.3, conscientiousness: 1, impulsiveness: 0.1, discretion: 0.7, honesty: 0.95, empathy: 0.6, confidence: 0.2, curiosity: 0.8 },
  speech: { rumorPrefix: 'I-I might have heard — don\'t quote me —', factPrefix: 'Measured and confirmed:', refuse: 'Um. I\'d need to double-check that. Several times.' },
  punctuality: 15,
  schedule: [
    { from: '07:00', to: '07:45', activity: 'eat', spot: 'cafe:table_corner', label: 'a nervous coffee' },
    { from: '07:45', to: '12:00', activity: 'work', spot: 'mason_office:drafting', label: 'drafting plans' },
    { from: '12:00', to: '12:45', activity: 'eat', spot: 'apartments:common_b' },
    { from: '12:45', to: '15:30', activity: 'work', spot: 'halvermouth:hall_door_out', label: 'filing survey papers at the Hall of Justice (on the No. 1)' },
    { from: '15:30', to: '16:00', activity: 'work', spot: 'westbrook:survey', label: 'surveying the lots' },
    { from: '16:00', to: '18:00', activity: 'work', spot: 'mason_office:drafting', label: 'drafting plans' },
    { from: '18:00', to: '20:00', activity: 'leisure', spot: 'lanternside:square_bench' },
    { from: '20:00', to: '22:30', activity: 'leisure', spot: 'apartments:window_seat' },
    { from: '22:30', to: '07:00', activity: 'sleep', spot: 'plumb_unit_4:bed' },
  ],
  impulses: [buildIt('quinn')],
  relationships: { player: { trust: 0, affection: 5, respect: 5, suspicion: 5 }, npc_mason: { trust: 50, affection: 45, respect: 50, suspicion: 0 }, npc_dee: { trust: 45, affection: 40, respect: 60, suspicion: 0 }, npc_barnaby: { trust: 50, affection: 50, respect: 30, suspicion: 0 }, npc_osric: { trust: 30, affection: 10, respect: 40, suspicion: 0 } },
  knowledge: ['fact_masons_os'],
  giftPrefs: { item_coffee: 9, item_honey_bun: 6, tags: { sweet: 4, food: 2 } },
  opinions: {
    npc_osric: { warm: 'Mr. Vane\'s filing system is… beautiful. I\'ve never said that out loud.', cool: 'Mr. Vane sent my permit back for a smudge. He was right.' },
    npc_mason: { warm: 'Mason says my plans are "drawn to perfection". Then he waits for me to laugh. I always do. Eventually.', cool: 'Mason, please stop calling the theodolite "the odd o\' light".' },
  },
});

export const CREW_HOME = crewHome;
export default [mason, dee, barnaby, quinn];
