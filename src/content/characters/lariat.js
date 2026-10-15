// Lariat (v0.29.0): Farmer Chuckie, the townsfolk, and Chuckie's five lead cows.
//
// Farmer Chuckie is an IMPORTED character (player-supplied photo and interview,
// 2026-10-15; see docs/characters/npc_chuckie.md). Interview: cheerful and
// folksy — warm, chatty, endlessly proud of his cheese and his cows, a born
// salesman; he/him; an old friend of Captain Ober; Wrath: a stampede and a
// giant rolling wheel of Chuckie's Cheese. The townsfolk and the cows were
// generated for the update (the owner's brief: a small Texas farming town and
// "special English-speaking cows").
import { PORTRAITS } from '../portraits.js';

export const chuckie = {
  id: 'npc_chuckie', motif: 'motif_chuckie',
  name: 'Farmer Chuckie',
  shortName: 'Chuckie',
  tier: 'major',
  origin: 'imported',
  importedFrom: {
    reference: 'assets/portraits/reference/npc_chuckie_reference.jpg',
    interviewDate: '2026-10-15',
    notes: 'docs/characters/npc_chuckie.md',
  },
  role: 'Owner of Chuckie\'s Cheese, Lariat\'s big dairy and cheese company (CHZ on the exchange). Cheerful, folksy, and missing five very important cows.',
  faction: null,
  dialogue: 'dlg_chuckie',
  noSnitch: true, // a friend of Captain Ober's, and he doesn't ask what's in other folks' trucks
  voice: { wave: 'triangle', pitch: 140, variance: 30, rate: 1.0 },
  appearance: {
    skin: '#f0c4a4', hair: '#6a4426', hairStyle: 'cap', hatColor: '#5a5640', beard: '#8a4a26', accessory: 'glasses',
    outfit: '#6a3a28', pattern: 'check', patternColor: 'rgba(240,220,190,0.4)', overalls: '#3e5f8e', shoes: '#3a2a1e', accent: '#e8c04a', build: 'broad', height: 1.02,
    sprite: null,
    portrait: PORTRAITS.npc_chuckie,
  },
  personality: {
    traits: ['cheerful', 'folksy', 'proud of his cheese', 'a born salesman', 'soft on his cows'],
    sociability: 0.95, conscientiousness: 0.7, impulsiveness: 0.45, curiosity: 0.6, discretion: 0.4,
    honesty: 0.8, competitiveness: 0.4, empathy: 0.85, confidence: 0.8, riskTolerance: 0.5, patience: 0.75, humor: 0.85,
    values: ['his cows', 'good cheese', 'a handshake deal', 'his town', 'old friends'],
    likes: ['a sharp cheddar', 'sweet tea', 'sunrise over the pasture', 'a cow that knows her own mind', 'Captain Ober\'s stories'],
    dislikes: ['processed cheese slices', 'folks in a hurry', 'gates left open', 'the word "dairy-free"'],
  },
  speech: {
    formality: 0.2, verbosity: 0.8,
    habits: ['calls everyone "friend" or "partner"', 'compares everything to cheese', 'sells you something mid-sentence', 'names every cow', 'says "well, I\'ll be"'],
    rumorPrefix: 'Now, I heard it down at the diner:', factPrefix: 'Sure as cheese is cheese,', refuse: 'Now, partner, that\'s one I\'ll keep in the cellar.',
  },
  // Protected: imported characters cannot be harmed (src/systems/combat.js isProtected).
  wrath: {
    theme: 'stampede', // he whistles: the herd thunders through, and a giant wheel of Chuckie's Cheese rolls you flat (src/engine/wrath.js)
    color: '#e8c04a',
    banner: 'THE HERD COMES HOME',
    subtitle: 'Farmer Chuckie whistles. Everything with hooves answers.',
    line: 'Well, I\'ll be. Partner, you don\'t raise a hand on a dairyman in his own county. The girls take it personal. …There\'s a wheel of cheese for you at the Mercantile, no hard feelings. Mind how you go.',
  },
  combat: { never: true, maxHealth: 150 },
  punctuality: 8,
  walkSpeed: 1,
  schedule: [
    { from: '04:45', to: '05:30', activity: 'eat', spot: 'chuckie_house:kitchen', label: 'coffee and a slice of cheddar' },
    { from: '05:30', to: '09:00', activity: 'work', spot: 'milking_parlour:station', label: 'the morning milking' },
    { from: '09:00', to: '12:00', activity: 'work', spot: 'cheese_plant:office', label: 'at the cheese plant' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:booth', label: 'lunch at the Mesquite Diner' },
    { from: '13:00', to: '16:30', activity: 'work', spot: 'lariat:chuckie_lookout', label: 'watching the paddock gate, hoping' },
    { from: '16:30', to: '18:30', activity: 'work', spot: 'cheese_plant:office', label: 'the day\'s books' },
    { from: '18:30', to: '21:30', activity: 'leisure', spot: 'lariat:chuckie_porch', label: 'on the porch with sweet tea' },
    { from: '21:30', to: '04:45', activity: 'sleep', spot: 'chuckie_house:bed' },
  ],
  impulses: [],
  relationships: {
    player: { trust: 15, affection: 25, respect: 5, suspicion: 0 },
    npc_ober: { trust: 80, affection: 75, respect: 60, suspicion: 0 },
    npc_opal: { trust: 35, affection: 30, respect: 25, suspicion: 0 },
    npc_lupe: { trust: 30, affection: 35, respect: 25, suspicion: 0 },
    npc_wade: { trust: 25, affection: 25, respect: 15, suspicion: 0 },
    npc_rosa: { trust: 40, affection: 30, respect: 40, suspicion: 0 },
    npc_earl: { trust: 30, affection: 25, respect: 30, suspicion: 0 },
    npc_moneybucks: { trust: 5, affection: 5, respect: 15, suspicion: 15 },
  },
  knowledge: ['fact_lead_cows_escaped'],
  giftPrefs: { item_sweet_tea: 6, item_pecan_pie: 8, item_coffee: 4, tags: { food: 4 } },
  reactions: {},
  notices: [],
  opinions: {
    npc_ober: { warm: 'The Captain? Shipped my very first wheel of cheese down the coast in that old tug of his, forty years back. Best friend a cheesemaker ever had. Tell him Chuckie says howdy!', cool: 'Ober still owes me for a crate of Gouda that "fell overboard". In ninety-one. Smelled like rum when it came back up, too.' },
    npc_opal: { warm: 'Opal Haskins runs the Mercantile like a ship\'s captain. Anything you need, she\'s got, and a story about it besides.', cool: 'Opal charges me full price for rope. Full price! After everything.' },
    npc_lupe: { warm: 'Lupe\'s pecan pie could make a grown man cry. Has. Me. Twice a week.', cool: 'Lupe put "cheese-free" on the menu once. As a joke. We don\'t joke about that.' },
    npc_wade: { warm: 'Wade\'s a good hand. Talks to the girls nicer than he talks to people.', cool: 'Wade left the paddock gate open. I\'m not saying that\'s how they got out. I\'m not NOT saying it.' },
    npc_rosa: { warm: 'Rosa\'s the finest cheesemaker in the state. I just own the building; she makes the magic.', cool: 'Rosa wants a bigger cave for the aged cheddar. Can\'t afford it with the girls gone.' },
    npc_earl: { warm: 'Earl Hollister grows cotton and complains about the weather, which is the whole of farming, really.', cool: 'Earl reckons cows are "just cotton that moos". We agree to disagree.' },
    npc_moneybucks: { warm: 'Sir Moneybucks bought some of my stock. Asked if the cows could be "optimised". I said they already are, partner.', cool: 'Moneybucks wanted to buy the whole company once. Offered me oil shares. I don\'t drink oil.' },
  },
};

const local = (o) => ({ tier: 'minor', origin: 'generated', faction: null, walkSpeed: 1, punctuality: 5, impulses: [], notices: [], reactions: {}, knowledge: [], ...o });

export const opal = local({
  id: 'npc_opal', name: 'Opal Haskins', shortName: 'Opal',
  combat: { never: true, maxHealth: 80 },
  role: 'Runs the Lariat Mercantile: groceries, hardware, rope, hats, and every bit of news in the county.',
  dialogue: 'dlg_opal', shop: 'shop_mercantile',
  voice: { wave: 'triangle', pitch: 330, variance: 30, rate: 1.1 },
  appearance: { skin: '#f0d0b0', hair: '#d8d4cc', hairStyle: 'bun', outfit: '#5a7a9a', apron: '#f2ead8', accessory: 'glasses', build: 'thin', height: 0.95, accent: '#c8402a' },
  personality: { traits: ['nosy', 'kind', 'shrewd shopkeeper'], sociability: 0.9, conscientiousness: 0.8, impulsiveness: 0.3, discretion: 0.2, honesty: 0.85, empathy: 0.7, humor: 0.6 },
  speech: { rumorPrefix: 'Well, you didn\'t hear it from me, but', factPrefix: 'I have it on good authority:', refuse: 'Hon, even I don\'t know that one.' },
  schedule: [
    { from: '06:00', to: '07:00', activity: 'eat', spot: 'boarding_house:bed_opal', label: 'breakfast at the boarding house' },
    { from: '07:00', to: '12:30', activity: 'work', spot: 'mercantile:counter', label: 'behind the Mercantile counter', onArrive: [{ restock: 'shop_mercantile' }] },
    { from: '12:30', to: '13:00', activity: 'eat', spot: 'lariat:main_bench', label: 'lunch on the bench out front' },
    { from: '13:00', to: '20:00', activity: 'work', spot: 'mercantile:counter', label: 'behind the Mercantile counter' },
    { from: '20:00', to: '22:00', activity: 'leisure', spot: 'diner:stool', label: 'pie and gossip at the diner' },
    { from: '22:00', to: '06:00', activity: 'sleep', spot: 'boarding_house:bed_opal' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 5 }, npc_chuckie: { trust: 35, affection: 30, respect: 25, suspicion: 0 }, npc_lupe: { trust: 40, affection: 40, respect: 30, suspicion: 0 } },
  giftPrefs: { item_pecan_pie: 6, item_wildflowers: 8, item_coffee: 4, tags: { sweet: 4 } },
  opinions: {
    npc_chuckie: { warm: 'Chuckie\'s a sweetheart. Overpays for everything except rope. Never overpays for rope.', cool: 'Chuckie\'s been in here six times this week asking if anybody\'s seen his cows. Nobody has, Chuck.' },
    npc_lupe: { warm: 'Lupe and me go back to grade school. She still owes me a nickel.', cool: 'Lupe\'s pie is fine. Fine. I don\'t see what the fuss is.' },
  },
});

export const lupe = local({
  id: 'npc_lupe', name: 'Lupe Garza', shortName: 'Lupe',
  combat: { never: true, maxHealth: 80 },
  role: 'Owner and cook of the Mesquite Diner. Chicken-fried steak, pecan pie, and the coffee that runs Lariat.',
  dialogue: 'dlg_lupe', shop: 'shop_diner',
  voice: { wave: 'triangle', pitch: 300, variance: 35, rate: 1.05 },
  appearance: { skin: '#c8906a', hair: '#2a1e1a', hairStyle: 'ponytail', outfit: '#c8402a', apron: '#f4efe6', build: 'average', height: 0.98, accent: '#e8c04a' },
  personality: { traits: ['warm', 'no-nonsense', 'feeds everybody'], sociability: 0.8, conscientiousness: 0.85, impulsiveness: 0.25, discretion: 0.6, honesty: 0.9, empathy: 0.85, humor: 0.7 },
  speech: { rumorPrefix: 'Folks at the counter say', factPrefix: 'I know for a fact', refuse: 'Not at my counter, mijo.' },
  schedule: [
    { from: '05:00', to: '06:00', activity: 'eat', spot: 'boarding_house:bed_lupe', label: 'up before the sun' },
    { from: '06:00', to: '21:00', activity: 'work', spot: 'diner:counter', label: 'running the Mesquite Diner', onArrive: [{ restock: 'shop_diner' }] },
    { from: '21:00', to: '22:00', activity: 'leisure', spot: 'lariat:diner_bench', label: 'feet up after close' },
    { from: '22:00', to: '05:00', activity: 'sleep', spot: 'boarding_house:bed_lupe' },
  ],
  relationships: { player: { trust: 5, affection: 10, respect: 0, suspicion: 0 }, npc_chuckie: { trust: 30, affection: 35, respect: 25, suspicion: 0 }, npc_opal: { trust: 40, affection: 35, respect: 30, suspicion: 0 } },
  giftPrefs: { item_wildflowers: 6, item_coffee: 2, tags: { sweet: 2 } },
  opinions: {
    npc_chuckie: { warm: 'Chuckie eats here every day at noon. Same booth, same steak, same story about the big cheese of \'86.', cool: 'Chuckie tried to pay me in cheese. Twice.' },
    npc_opal: { warm: 'Opal knows everybody\'s business. Saves me asking.', cool: 'Opal says my pie\'s "fine". FINE.' },
  },
});

export const wade = local({
  id: 'npc_wade', name: 'Wade Tillman', shortName: 'Wade',
  combat: { fights: true, maxHealth: 110 },
  role: 'Dairy hand at Chuckie\'s Cheese: milking, feeding, mucking out. Talks to the cows nicer than to people.',
  dialogue: 'dlg_wade',
  voice: { wave: 'sawtooth', pitch: 150, variance: 20, rate: 0.9 },
  appearance: { skin: '#e0b090', hair: '#c89a5a', hairStyle: 'cap', hatColor: '#7a2a24', outfit: '#8a8478', overalls: '#4a4a3e', shoes: '#2a2018', build: 'wiry', height: 1.04, accent: '#7a2a24' },
  personality: { traits: ['quiet', 'gentle with animals', 'awkward with people'], sociability: 0.3, conscientiousness: 0.75, impulsiveness: 0.3, discretion: 0.6, honesty: 0.8, empathy: 0.7 },
  speech: { rumorPrefix: 'Heard tell', factPrefix: 'Seen it myself:', refuse: '…Dunno.' },
  schedule: [
    { from: '04:30', to: '05:15', activity: 'eat', spot: 'boarding_house:bed_wade' },
    { from: '05:15', to: '10:00', activity: 'work', spot: 'milking_parlour:station_2', label: 'milking' },
    { from: '10:00', to: '12:00', activity: 'work', spot: 'lariat:dairy_yard', label: 'feeding out' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:stool', label: 'lunch at the diner' },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'lariat:dairy_gate', label: 'fixing fence' },
    { from: '17:00', to: '19:30', activity: 'work', spot: 'milking_parlour:station_2', label: 'the evening milking' },
    { from: '19:30', to: '22:00', activity: 'leisure', spot: 'lariat:paddock_gate', label: 'leaning on the paddock gate' },
    { from: '22:00', to: '04:30', activity: 'sleep', spot: 'boarding_house:bed_wade' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 0, suspicion: 5 }, npc_chuckie: { trust: 25, affection: 25, respect: 30, suspicion: 0 }, npc_rosa: { trust: 25, affection: 20, respect: 30, suspicion: 0 } },
  giftPrefs: { item_jerky: 6, item_coffee: 5, tags: { food: 3 } },
  opinions: {
    npc_chuckie: { warm: 'Boss is good people. Pays fair. Knows every cow by name. Every one.', cool: 'Boss thinks I left the gate open. …I might\'ve.' },
    npc_rosa: { warm: 'Rosa makes cheese like it\'s church.', cool: 'Rosa yells at the vats. They deserve it, mostly.' },
  },
});

export const rosa = local({
  id: 'npc_rosa', name: 'Rosa Delgado', shortName: 'Rosa',
  combat: { never: true, maxHealth: 90 },
  role: 'Head cheesemaker at Chuckie\'s Cheese. The finest cheddar in the state, and she\'ll tell you so.',
  dialogue: 'dlg_rosa',
  voice: { wave: 'triangle', pitch: 280, variance: 25, rate: 1.0 },
  appearance: { skin: '#b8805a', hair: '#1e1a18', hairStyle: 'bun', outfit: '#f2f0ea', apron: '#d8dee6', accessory: 'goggles', build: 'average', height: 1.0, accent: '#e8c04a' },
  personality: { traits: ['exacting', 'proud', 'secretly sentimental'], sociability: 0.5, conscientiousness: 0.95, impulsiveness: 0.15, discretion: 0.6, honesty: 0.85, empathy: 0.55, humor: 0.5 },
  speech: { rumorPrefix: 'They\'re saying', factPrefix: 'Measured, weighed and recorded:', refuse: 'That\'s a trade secret.' },
  schedule: [
    { from: '05:30', to: '06:30', activity: 'eat', spot: 'boarding_house:bed_rosa' },
    { from: '06:30', to: '12:00', activity: 'work', spot: 'cheese_plant:vat', label: 'at the cheese vats' },
    { from: '12:00', to: '12:45', activity: 'eat', spot: 'cheese_plant:press', label: 'lunch by the press (she doesn\'t leave the cheese)' },
    { from: '12:45', to: '18:00', activity: 'work', spot: 'cheese_plant:press', label: 'pressing and turning wheels' },
    { from: '18:00', to: '21:00', activity: 'leisure', spot: 'diner:booth', label: 'supper at the diner' },
    { from: '21:00', to: '05:30', activity: 'sleep', spot: 'boarding_house:bed_rosa' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 0 }, npc_chuckie: { trust: 40, affection: 30, respect: 35, suspicion: 0 }, npc_wade: { trust: 20, affection: 20, respect: 15, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_wildflowers: 4, tags: { sweet: 2 } },
  opinions: {
    npc_chuckie: { warm: 'Chuckie gave me the plant and said "make it sing". So I do.', cool: 'Chuckie sells the cheese before it\'s aged. I have words about that.' },
    npc_wade: { warm: 'Wade brings me the milk warm and on time. That\'s love, in a dairy.', cool: 'Wade tracks mud in. Every. Day.' },
  },
});

export const earl = local({
  id: 'npc_earl', name: 'Earl Hollister', shortName: 'Earl',
  combat: { fights: true, maxHealth: 120 },
  role: 'Cotton farmer on the Hollister place north of town. Fourth generation; first to say it might not need a fifth.',
  dialogue: 'dlg_earl',
  voice: { wave: 'sawtooth', pitch: 120, variance: 18, rate: 0.85 },
  appearance: { skin: '#d0946a', hair: '#bab4aa', hairStyle: 'hat', hatColor: '#d8c8a0', moustacheColor: '#bab4aa', outfit: '#8aa0b4', legs: '#3a4a6a', build: 'wiry', height: 1.05, accent: '#d8c8a0' },
  personality: { traits: ['dry', 'stubborn', 'weather-obsessed'], sociability: 0.45, conscientiousness: 0.8, impulsiveness: 0.2, discretion: 0.6, honesty: 0.85, empathy: 0.5, humor: 0.55 },
  speech: { rumorPrefix: 'Word at the Co-op is', factPrefix: 'Fact is,', refuse: 'Ain\'t your business, friend. Nor mine, come to think.' },
  schedule: [
    { from: '05:00', to: '06:00', activity: 'eat', spot: 'hollister_house:table' },
    { from: '06:00', to: '12:00', activity: 'work', spot: 'lariat:cotton_field', label: 'in the cotton' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:stool', label: 'dinner at the diner' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'lariat:cotton_field', label: 'in the cotton' },
    { from: '18:00', to: '21:00', activity: 'leisure', spot: 'lariat:hollister_porch', label: 'on the porch, judging the sky' },
    { from: '21:00', to: '05:00', activity: 'sleep', spot: 'hollister_house:bed' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_chuckie: { trust: 30, affection: 25, respect: 30, suspicion: 0 }, npc_lupe: { trust: 25, affection: 20, respect: 20, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_jerky: 6, tags: { food: 3 } },
  opinions: {
    npc_chuckie: { warm: 'Chuckie\'s all right. Talks too much. Makes good cheese. Fair trade.', cool: 'Chuckie\'s cows ate a row of my cotton. One of \'em apologised. That\'s worse, somehow.' },
    npc_lupe: { warm: 'Lupe feeds half the county on credit. Somebody ought to give that woman a medal.', cool: 'Lupe charges two dollars for coffee now. Obols. Whatever. Too much.' },
  },
});

// ---------------------------------------------------------------- the five lead cows
// They talk (it's not explained; it doesn't need to be). The dairy system
// (src/systems/dairy.js) decides where each one is: loose at her hideout,
// roped and following you, or home in the paddock.
const cow = (o) => ({
  tier: 'minor', origin: 'generated', faction: null, livestock: true, walkSpeed: 1.5, punctuality: 0, impulses: [], notices: [], reactions: {}, knowledge: [],
  combat: { never: true, maxHealth: 200 }, giftPrefs: { tags: { food: 3 } }, relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 10 }, npc_chuckie: { trust: 40, affection: 40, respect: 20, suspicion: 0 } }, opinions: {},
  ...o,
  personality: { conscientiousness: 0.4, impulsiveness: 0.6, ...o.personality },
  appearance: { species: 'cow', height: 1, ...o.appearance },
  schedule: [
    { from: '05:00', to: '21:00', activity: 'graze', spot: `lariat:${o.pen}`, label: 'grazing in the paddock' },
    { from: '21:00', to: '05:00', activity: 'sleep', spot: `lariat:${o.pen}` },
  ],
});

export const bessie = cow({
  id: 'cow_bessie', name: 'Bessie Mae', shortName: 'Bessie Mae', pen: 'pen_bessie', dialogue: 'dlg_bessie',
  role: 'A lead cow of Chuckie\'s Cheese. A Southern belle with expensive tastes in pie.',
  voice: { wave: 'triangle', pitch: 230, variance: 40, rate: 0.85 },
  appearance: { coat: '#f2ece0', patches: '#2a2420', seed: 3, ribbon: '#e05a8a', bell: true },
  personality: { traits: ['dramatic', 'genteel', 'pie-motivated'], sociability: 0.9, honesty: 0.6, humor: 0.7 },
  speech: { rumorPrefix: 'Darlin\', the girls say', factPrefix: 'I declare,', refuse: 'A lady never tells, sugar.' },
});
export const clementine = cow({
  id: 'cow_clementine', name: 'Dr. Clementine', shortName: 'Clementine', pen: 'pen_clementine', dialogue: 'dlg_clementine',
  role: 'A lead cow of Chuckie\'s Cheese. Holds strong views on philosophy, grass and the nature of the fence.',
  voice: { wave: 'sine', pitch: 190, variance: 15, rate: 0.8 },
  appearance: { coat: '#8a5a3a', patches: '#f2ece0', seed: 9, blaze: true, hat: '#2a2a2e' },
  personality: { traits: ['philosophical', 'long-winded', 'gently superior'], sociability: 0.6, honesty: 0.9, humor: 0.5 },
  speech: { rumorPrefix: 'It has been posited that', factPrefix: 'Empirically,', refuse: 'That question is beyond the fence of my knowing.' },
});
export const duchess = cow({
  id: 'cow_duchess', name: 'Duchess', shortName: 'Duchess', pen: 'pen_duchess', dialogue: 'dlg_duchess',
  role: 'A lead cow of Chuckie\'s Cheese. Convinced the cheese plant is a conspiracy. Partly right.',
  voice: { wave: 'square', pitch: 210, variance: 30, rate: 1.1 },
  appearance: { coat: '#2a2420', patches: '#f2ece0', seed: 17, bell: true },
  personality: { traits: ['suspicious', 'conspiratorial', 'loyal underneath'], sociability: 0.4, honesty: 0.7, humor: 0.4 },
  speech: { rumorPrefix: 'Wake up, sheeple — cow-ple —', factPrefix: 'They don\'t want you to know this, but', refuse: 'That\'s exactly what THEY\'d ask.' },
});
export const patsy = cow({
  id: 'cow_patsy', name: 'Patsy', shortName: 'Patsy', pen: 'pen_patsy', dialogue: 'dlg_patsy',
  role: 'A lead cow of Chuckie\'s Cheese. A country singer. Not a good one. A loud one.',
  voice: { wave: 'triangle', pitch: 260, variance: 60, rate: 1.0 },
  appearance: { coat: '#f2ece0', patches: '#8a5a3a', seed: 23, hat: '#c8a060', ribbon: '#3a6ab0' },
  personality: { traits: ['showbiz', 'romantic', 'tone-deaf'], sociability: 0.95, honesty: 0.7, humor: 0.8 },
  speech: { rumorPrefix: 'Honey, there\'s a song about it:', factPrefix: 'True as a three-chord truth,', refuse: 'Some things you only say in a ballad.' },
});
export const daisy = cow({
  id: 'cow_daisy', name: 'Little Daisy', shortName: 'Daisy', pen: 'pen_daisy', dialogue: 'dlg_daisy',
  role: 'The youngest lead cow of Chuckie\'s Cheese. Wants an adventure. Is having one.',
  voice: { wave: 'sine', pitch: 320, variance: 50, rate: 1.2 },
  appearance: { coat: '#f2ece0', patches: '#2a2420', seed: 31, height: 0.82 },
  personality: { traits: ['curious', 'brave', 'easily distracted'], sociability: 0.9, honesty: 0.95, humor: 0.6, impulsiveness: 0.9 },
  speech: { rumorPrefix: 'Guess what!', factPrefix: 'Did you know', refuse: 'I dunno! Isn\'t that EXCITING?' },
});


// v0.30.0: the tractor dealer and the Feed & Seed / land agent
export const dale = local({
  id: 'npc_dale', name: 'Dale Pruett', shortName: 'Dale',
  combat: { never: true, maxHealth: 90 },
  role: 'Sells tractors on the Red Dirt Tractor & Implement lot. Talks horsepower like other men talk weather.',
  dialogue: 'dlg_dale',
  voice: { wave: 'sawtooth', pitch: 140, variance: 20, rate: 1.05 },
  appearance: { skin: '#e0b088', hair: '#5a4030', hairStyle: 'short', hat: '#c8402a', outfit: '#e8e2d4', legs: '#3a4a6a', build: 'broad', height: 1.05, accent: '#c8402a' },
  personality: { traits: ['salesman', 'easygoing', 'tractor-mad'], sociability: 0.85, conscientiousness: 0.6, impulsiveness: 0.4, discretion: 0.4, honesty: 0.7, empathy: 0.6, humor: 0.75 },
  speech: { rumorPrefix: 'Word on the lot is', factPrefix: 'Fact:', refuse: 'Couldn\'t tell you, friend. Ask me about tractors.' },
  schedule: [
    { from: '06:30', to: '07:00', activity: 'eat', spot: 'diner:stool', label: 'coffee at the diner' },
    { from: '07:00', to: '12:00', activity: 'work', spot: 'lariat:reddirt_lot', label: 'on the Red Dirt lot' },
    { from: '12:00', to: '12:45', activity: 'eat', spot: 'diner:booth', label: 'lunch at the diner' },
    { from: '12:45', to: '19:00', activity: 'work', spot: 'lariat:reddirt_lot', label: 'on the Red Dirt lot' },
    { from: '19:00', to: '22:00', activity: 'leisure', spot: 'lariat:main_bench', label: 'watching the traffic lights change' },
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'boarding_house:bed_dale' },
  ],
  relationships: { player: { trust: 10, affection: 10, respect: 0, suspicion: 0 }, npc_earl: { trust: 30, affection: 20, respect: 40, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_jerky: 5, tags: { food: 2 } },
  opinions: { npc_earl: { warm: 'Earl\'s had the same Workhorse thirty years. Best advert I\'ve got.', cool: 'Earl won\'t trade up. Thirty years! The man\'s a menace to commerce.' } },
});

export const lorna = local({
  id: 'npc_lorna', name: 'Lorna Calloway', shortName: 'Lorna',
  combat: { never: true, maxHealth: 80 },
  role: 'Runs Lone Star Feed & Seed, and in the afternoons sits at the Land Office as the county\'s land agent.',
  dialogue: 'dlg_lorna', shop: 'shop_feedseed',
  voice: { wave: 'triangle', pitch: 300, variance: 25, rate: 1 },
  appearance: { skin: '#c89070', hair: '#2a2420', hairStyle: 'ponytail', outfit: '#3a7a4a', apron: '#d8c8a0', legs: '#3a3a4a', build: 'average', height: 1, accent: '#e8c04a' },
  personality: { traits: ['practical', 'precise', 'quietly funny'], sociability: 0.6, conscientiousness: 0.9, impulsiveness: 0.2, discretion: 0.7, honesty: 0.9, empathy: 0.6, humor: 0.6 },
  speech: { rumorPrefix: 'For what it\'s worth,', factPrefix: 'On the record:', refuse: 'That\'s not in my ledger.' },
  schedule: [
    { from: '06:00', to: '07:00', activity: 'eat', spot: 'boarding_house:bed_lorna', label: 'breakfast' },
    { from: '07:00', to: '12:00', activity: 'work', spot: 'feed_seed:counter', label: 'behind the Feed & Seed counter', onArrive: [{ restock: 'shop_feedseed' }] },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:booth', label: 'lunch at the diner' },
    { from: '13:00', to: '15:30', activity: 'work', spot: 'land_office:desk', label: 'at the Land Office desk' },
    { from: '15:30', to: '19:00', activity: 'work', spot: 'feed_seed:counter', label: 'behind the Feed & Seed counter' },
    { from: '19:00', to: '21:30', activity: 'leisure', spot: 'lariat:town_square', label: 'reading in Lariat Square' },
    { from: '21:30', to: '06:00', activity: 'sleep', spot: 'boarding_house:bed_lorna' },
  ],
  relationships: { player: { trust: 5, affection: 5, respect: 5, suspicion: 0 }, npc_opal: { trust: 40, affection: 35, respect: 30, suspicion: 0 } },
  giftPrefs: { item_sweet_tea: 6, item_wildflowers: 7, tags: { sweet: 3 } },
  opinions: { npc_opal: { warm: 'Opal knows everything in this county a day before it happens.', cool: 'Opal told the whole town my maiden name before I\'d unpacked.' } },
});


// v0.31.0: Hoof & Horn's livestock man
export const wes = local({
  id: 'npc_wes', name: 'Wes Tolliver', shortName: 'Wes',
  combat: { never: true, maxHealth: 90 },
  role: 'Runs Hoof & Horn Livestock Supply and the Saturday sale barn. Can guess a steer\'s weight to the pound.',
  dialogue: 'dlg_wes',
  voice: { wave: 'sawtooth', pitch: 120, variance: 15, rate: 0.9 },
  appearance: { skin: '#d8a880', hair: '#c8c4bc', hairStyle: 'short', hat: '#d8c8a0', beard: true, outfit: '#7a5a3a', legs: '#3a4a6a', build: 'broad', height: 1, accent: '#c8402a' },
  personality: { traits: ['laconic', 'fair', 'animal whisperer'], sociability: 0.5, conscientiousness: 0.8, impulsiveness: 0.2, discretion: 0.7, honesty: 0.9, empathy: 0.8, humor: 0.5 },
  speech: { rumorPrefix: 'Heard at the sale barn:', factPrefix: 'Fact is,', refuse: 'Can\'t say.' },
  schedule: [
    { from: '05:30', to: '06:30', activity: 'eat', spot: 'diner:stool', label: 'coffee at the diner' },
    { from: '06:30', to: '12:00', activity: 'work', spot: 'hoof_horn:counter', label: 'behind the Hoof & Horn counter' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'diner:booth', label: 'lunch at the diner' },
    { from: '13:00', to: '18:00', activity: 'work', spot: 'hoof_horn:counter', label: 'behind the Hoof & Horn counter' },
    { from: '18:00', to: '21:00', activity: 'leisure', spot: 'lariat:paddock_gate', label: 'leaning on Chuckie\'s fence, talking cows' },
    { from: '21:00', to: '05:30', activity: 'sleep', spot: 'hoof_horn:bed' },
  ],
  relationships: { player: { trust: 5, affection: 5, respect: 5, suspicion: 0 }, npc_chuckie: { trust: 50, affection: 40, respect: 50, suspicion: 0 } },
  giftPrefs: { item_coffee: 6, item_jerky: 6, tags: { food: 2 } },
  opinions: { npc_chuckie: { warm: 'Chuckie\'s the best stockman in the county. Talks to his cows. They talk back, which helps.', cool: 'Chuckie lets his gates swing. Bad habit.' } },
});

export default [chuckie, opal, dale, lorna, wes, lupe, wade, rosa, earl, bessie, clementine, duchess, patsy, daisy];
