// Homes (v0.36.0). Owner's rule: no beds in stores or shops — every character
// has a home they go to when they aren't working. Twenty-two people who used
// to sleep at work (in the café, the gun shop, the station bunks, the Abacus…)
// now live in real homes, and the arms works' hired hands lodge at the Yards
// Lodging House instead of on the factory floor.
//
// Homes reuse buildings that were facades (a door that wouldn't open) or had
// no door at all: 11 Gullwing Row (To Let), the Harbourline Apartments, the
// Atlas Rooms, four Sumps shacks, a house in Lariat, Halver Scrap Co. — plus a
// fifth flat at the Plumb Line. Each home is generated: a stairwell hall with
// a door per flat (or a single home), a flat with a bed, a chair, a stove and
// a dresser of valuables (owned — taking from it is theft; see homes.js in
// systems for breaking in, and invitations).
//
// Applied after the roads are widened, in final tile coordinates.
import { roomTiles } from '../world/mapBuilder.js';

/**
 * A home: `building` on `map` (an existing building id) becomes its front
 * door. `flats`: one per household — `who` (the residents; the first is the
 * named tenant), the dresser's `loot`, and a couple of personal `props`.
 */
export const HOMES = [
  {
    id: 'gullwing11', map: 'lanternside', building: 'b_to_let', name: '11 Gullwing Row', mapLabel: 'No. 11', sign: null, type: 'apartment',
    flats: [
      { who: ['npc_mags'], name: 'Mags Pell', bed: '#c8806a', rug: '#e0b080', loot: { items: { item_silver_spoons: 1, item_honey_bun: 2 }, money: 18 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Cookbooks, every one annotated in the margins: "MORE BUTTER", "less butter (no)", "MORE BUTTER".' },
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'A watercolour of the Kettle & Crumb on its opening day. Mags is in the doorway, much younger, covered in flour.' },
      ] },
      { who: ['npc_tibbs'], name: 'Tibbs Hollow', bed: '#7a6a4a', rug: '#6a5a3a', loot: { items: { item_pocket_watch: 1, item_bolts: 3 }, money: 9 }, props: [
        { type: 'crate', x: 1, y: 4, examine: 'Junk. Lovely, lovely junk. Sorted by a system only Tibbs understands ("SHINY", "BENDY", "MAYBE").' },
        { type: 'shelf', x: 7, y: 4, examine: 'Half a carburettor, a stuffed gull, and a photograph of a boat Tibbs swears he will finish one day.' },
      ] },
      { who: ['npc_delphine'], name: 'Delphine Moreau', bed: '#5a6a8a', rug: '#7a8a9a', loot: { items: { item_gold_ring: 1, item_pocket_watch: 1 }, money: 30 }, props: [
        { type: 'desk', x: 1, y: 4, w: 2, examine: 'Chromatography printouts and a list headed "THINGS SIR M. MUST NOT KNOW", which is long.' },
        { type: 'plant', x: 7, y: 4 },
      ] },
    ],
  },
  {
    id: 'harbourline', map: 'halvermouth', building: 't_harbourline', name: 'Harbourline Apartments', mapLabel: 'Harbourline Apts', type: 'apartment',
    flats: [
      { who: ['npc_lawrence'], name: 'Chief Lawrence Order', bed: '#2a3a6a', rug: '#c8a040', loot: { items: { item_gold_watch: 1, item_cigar: 2 }, money: 75 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Eleven "World\'s Best Chief" mugs. All bought by Lawrence Order. A twelfth on order.' },
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'A portrait of Lawrence Order shaking hands with Lawrence Order. Nobody knows how.' },
      ] },
      { who: ['npc_justin'], name: 'Sgt. Justin Case', bed: '#3a4a5a', rug: '#5a6a7a', loot: { items: { item_pocket_watch: 1, item_bandage: 2 }, money: 14 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Two of everything. Two torches, two whistles, two spare spare batteries. Just in case.' },
      ] },
      { who: ['npc_warren'], name: 'Officer Warren Tee', bed: '#4a5a4a', rug: '#6a7a5a', loot: { items: { item_silver_spoons: 1 }, money: 11 }, props: [
        { type: 'desk', x: 1, y: 4, w: 2, examine: 'A half-written appeal against a parking ticket. Warren\'s own parking ticket. Issued by Warren.' },
      ] },
      { who: ['npc_bailey'], name: 'Officer Bailey Bond', bed: '#6a4a3a', rug: '#8a6a4a', loot: { items: { item_gold_ring: 1 }, money: 16 }, props: [
        { type: 'plant', x: 1, y: 4 }, { type: 'plant', x: 7, y: 4 },
      ] },
      { who: ['npc_miranda'], name: 'Officer Miranda Wright', bed: '#5a3a5a', rug: '#7a5a7a', loot: { items: { item_pocket_watch: 1 }, money: 12 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Police procedure manuals, colour-tabbed. Every tab is labelled "IMPORTANT".' },
      ] },
      { who: ['npc_hugh'], name: 'Officer Hugh Jury', bed: '#3a3a3a', rug: '#4a4a4a', loot: { items: { item_cigar: 1 }, money: 8 }, props: [
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'Blackout curtains, a sleep mask and a sign: "NIGHT SHIFT — DO NOT KNOCK. DO NOT EVEN THINK ABOUT KNOCKING."' },
      ] },
    ],
  },
  {
    id: 'atlas', map: 'halvermouth', building: 't_atlas', name: 'The Atlas Rooms', mapLabel: 'Atlas Rooms', type: 'apartment',
    flats: [
      { who: ['npc_lucas'], name: 'Lucas Eastrise', bed: '#3a3a2a', rug: '#5a4a2a', spots: { desk: { x: 3, y: 4, facing: 'left' } }, loot: { items: { item_ammo_9mm: 2, item_gold_watch: 1 }, money: 60 }, props: [
        { type: 'painting', x: 1, y: 0, w: 4, examine: 'A cork wall of red string: the moon landing, the Ober Oil board, the lighthouse, a recipe for scones. It all connects. Apparently.' },
        { type: 'desk', x: 1, y: 4, w: 2, examine: 'Three radios, all tuned to static, and a notebook titled "THEY KNOW (vol. 9)".' },
      ] },
      { who: ['npc_julian'], name: 'Julian Beaumont', bed: '#6a1f2a', rug: '#c8b080', loot: { items: { item_gold_ring: 1, item_silver_spoons: 1, item_cigar: 2 }, money: 90 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Driving gloves in eleven shades of tan, arranged by mood.' },
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'An oil painting of the Vantaggio Corsair. Signed by Julian. He commissioned himself.' },
      ] },
      { who: ['npc_sal'], name: 'Sal Vage', bed: '#5a5a4a', rug: '#7a7a6a', loot: { items: { item_part_board: 3, item_pocket_watch: 1 }, money: 25 }, props: [
        { type: 'crate', x: 1, y: 4, examine: 'Circuit boards. In the bath, too. Sal hasn\'t had a bath since 1987; the bath is storage.' },
      ] },
    ],
  },
  // The Sums of Anarchy live in four of the Sumps shacks, a stone's throw from the Abacus
  { id: 'shack_arthur', map: 'halvermouth', building: 'sh_9', name: 'Arthur\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_arthur'], name: 'Arthur Anderson', bed: '#4a2a2a', rug: '#6a3a2a', loot: { items: { item_calc_wits: 2 }, money: 120 }, props: [
      { type: 'painting', x: 1, y: 0, w: 4, examine: 'A blackboard covered in sums, every one of them furious. Bottom corner, small: "π is a liar."' },
      { type: 'shelf', x: 1, y: 4, examine: 'Ledgers going back thirty years. Every debt owed to Arthur, to the obol. Several are underlined until the paper tore.' },
    ] }] },
  // v0.55.0: a shack each (the crew used to bunk two to a shack)
  { id: 'shack_crew_a', map: 'halvermouth', building: 'sh_7', name: 'Al\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_al'], name: 'Al Gebra', bed: '#5a4a3a', rug: '#4a3a2a', loot: { items: { item_calc_grit: 1 }, money: 15 }, props: [
      { type: 'table', x: 1, y: 4, examine: 'A pool cue snapped in half and a scorecard: AL 7, PERCY 93%. Nobody knows what the units are.' },
    ] }] },
  { id: 'shack_percy', map: 'halvermouth', building: 'sh_1', name: 'Percy\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_percy'], name: 'Percy Ntage', bed: '#4a3a2a', rug: '#5a4a3a', loot: { items: { item_pocket_watch: 1 }, money: 12 }, props: [
      { type: 'painting', x: 1, y: 0, w: 3, examine: 'Pie charts, hand-drawn, of everything: Percy\'s week, Percy\'s wages, Percy\'s feelings (mostly "unaccounted for").' },
      { type: 'shelf', x: 7, y: 4, examine: 'A jar of coins labelled "TIPS (100%)" and another labelled "TIPS (AFTER AL)".' },
    ] }] },
  { id: 'shack_crew_b', map: 'halvermouth', building: 'sh_8', name: 'Minnie\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_minnie'], name: 'Minnie Mus', bed: '#6a3a5a', rug: '#4a2a4a', loot: { items: { item_calc_charm: 1, item_gold_ring: 1 }, money: 22 }, props: [
      { type: 'shelf', x: 1, y: 4, examine: 'Calculators, wrapped as presents. For whom? "For the right person." Minnie won\'t elaborate.' },
    ] }] },
  { id: 'shack_deenom', map: 'halvermouth', building: 'sh_3', name: 'Dee Nominator\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_dee_nom'], name: 'Dee Nominator', bed: '#3a2a4a', rug: '#5a3a5a', loot: { items: { item_calc_wits: 1 }, money: 18 }, props: [
      { type: 'desk', x: 1, y: 4, w: 2, examine: 'Fractions, everywhere: on the wall, on the desk, on a mug that says WORLD\'S BEST 1/2. Dee divides the rent with nobody now and is thrilled.' },
    ] }] },
  { id: 'shack_crew_c', map: 'halvermouth', building: 'sh_10', name: 'Tony\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_tony'], name: 'Tony Tangent', bed: '#3a4a3a', rug: '#2a3a2a', loot: { items: { item_calc_energy: 2 }, money: 10 }, props: [
      { type: 'painting', x: 1, y: 0, w: 2, examine: 'A circle with a line just touching it, framed. "My namesake," Tony tells nobody.' },
    ] }] },
  { id: 'shack_max', map: 'halvermouth', building: 'sh_5', name: 'Max\'s shack', mapLabel: 'Shack', type: 'house',
    flats: [{ who: ['npc_max'], name: 'Max Imum', bed: '#4a4a3a', rug: '#3a3a2a', loot: { items: { item_calc_grit: 1 }, money: 9 }, props: [
      { type: 'crate', x: 1, y: 4, examine: 'Empty bottles, labelled with the date each was emptied. Max is very organised about some things.' },
    ] }] },
  // v0.55.0: the Phonograph Grand's cage clerk and floor man each have a flat of their own (they used to bunk in the staff quarters)
  { id: 'ledgerline', map: 'halvermouth', building: 't_ledgerline', name: 'The Ledgerline Residences', mapLabel: 'Ledgerline Residences', type: 'apartment',
    flats: [
      { who: ['npc_vera'], name: 'Vera Lusk', bed: '#5a1a2a', rug: '#c9a24a', loot: { items: { item_gold_ring: 1 }, money: 60 }, props: [
        { type: 'desk', x: 1, y: 4, w: 2, examine: 'A ledger balanced to the obol, a green-shaded lamp, and a framed first chip: "MY FIRST NIGHT IN THE CAGE — V."' },
        { type: 'plant', x: 7, y: 4 },
      ] },
      { who: ['npc_brock'], name: 'Brock Hadley', bed: '#2a2a3a', rug: '#4a4a5a', loot: { items: { item_pocket_watch: 1 }, money: 35 }, props: [
        { type: 'crate', x: 1, y: 4, examine: 'Dumbbells, a skipping rope and a well-thumbed book of poetry, bookmarked with a bouncer\'s guest list.' },
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'A photograph of Brock\'s mum, framed in gold. She looks exactly as unimpressed as Brock does.' },
      ] },
    ] },
  // v0.55.0: Moneybucks Manor's staff, a flat each in the estate cottages (they used to sleep along the manor's back corridor)
  { id: 'estate_cottages', map: 'ober_fields', building: 'b_estate_cottages', name: 'The Estate Cottages', mapLabel: 'Estate Cottages', type: 'apartment',
    flats: [
      { who: ['npc_crisp'], name: 'Bartholomew Crisp', bed: '#2b2e38', rug: '#6d6a60', loot: { items: { item_silver_spoons: 2, item_pocket_watch: 1 }, money: 55 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Shoe polish in eleven shades of black, alphabetised. A single volume: "Correct Forms of Address for Every Occasion, Including Riots".' },
        { type: 'painting', x: 3, y: 0, w: 2, examine: 'A portrait of Crisp\'s father, also a butler, also called Crisp, also not smiling.' },
      ] },
      { who: ['npc_agnes'], name: 'Agnes Thornbury', bed: '#5a4a6a', rug: '#8a7a6a', loot: { items: { item_gold_ring: 1 }, money: 40 }, props: [
        { type: 'desk', x: 1, y: 4, w: 2, examine: 'The estate\'s ledgers, brought home "just to check". Every shareholder of Ober\'s Oil, listed, with a pencilled note on the newest one.' },
      ] },
      { who: ['npc_silas'], name: 'Silas Grimmer', bed: '#3a3a3a', rug: '#4a4a4a', loot: { items: { item_bandage: 2 }, money: 30 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'A radio scanner, a flask, and a notebook of every car that drove past the gate this year.' },
      ] },
      { who: ['npc_mabel'], name: 'Mabel Quince', bed: '#c8806a', rug: '#e0b080', loot: { items: { item_honey_bun: 3, item_silver_spoons: 1 }, money: 26 }, props: [
        { type: 'shelf', x: 1, y: 4, examine: 'Cookbooks, a sourdough starter called Reginald, and a framed menu from the night Sir Moneybucks cried at the soufflé.' },
        { type: 'plant', x: 7, y: 4 },
      ] },
    ] },
  // v0.55.0: Starling, up the Cut — Derrick Row (the Ober's Oil crew, a house each; they used to share the bunkhouse)
  ...[
    ['npc_gideon', 'Gideon Slate', '#7d5a3c', '#a07a4a', { item_pocket_watch: 1 }, 35, [
      { type: 'shelf', x: 1, y: 4, examine: 'Safety manuals, every one of them annotated in red. A framed certificate: "GIDEON SLATE — 20 YEARS, NO LOST-TIME INCIDENTS (AND ONE VERY CLOSE CALL)".' },
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A photograph of the refinery crew from twenty years ago: Gideon, a full head of hair, and a much smaller Hank.' },
    ]],
    ['npc_ruby', 'Ruby Calder', '#6a3a3a', '#8a5a4a', { item_bolts: 4, item_gold_ring: 1 }, 22, [
      { type: 'toolrack', x: 1, y: 4, examine: 'Ruby\'s own tools, better than the company\'s, which she will tell you about.' },
    ]],
    ['npc_hank', 'Hank Dorsey', '#5a5a3a', '#7a7a4a', { item_cigar: 1 }, 18, [
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A painting of a pumpjack at sunset, signed "H.D.". Titled: GERALD.' },
      { type: 'shelf', x: 1, y: 4, examine: 'Fishing flies in a tackle box, a radio for the ball game, and the kind of slippers that have opinions.' },
    ]],
    ['npc_pip', 'Pip Wexley', '#3a5a6a', '#5a7a8a', { item_honey_bun: 2 }, 11, [
      { type: 'desk', x: 1, y: 4, w: 2, examine: 'A correspondence course: "PETROLEUM ENGINEERING, PART 3". Part 4 is on order. Pip has a plan.' },
    ]],
    ['npc_otto', 'Otto Brandt', '#4a4a5a', '#6a6a7a', { item_pocket_watch: 1 }, 26, [
      { type: 'shelf', x: 1, y: 4, examine: 'Union pamphlets, neatly filed. A thank-you card from the crew: "For the safety refit. We owe you, Otto."' },
    ]],
  ].map(([who, name, bed, rug, items, money, props], i) => ({
    id: `derrick_${who.slice(4)}`, map: 'starling_flats', building: `sf_house_${i + 1}`, name: `${i + 1} Mesa Road (Derrick Row)`, mapLabel: `No. ${i + 1}`, type: 'house',
    flats: [{ who: [who], name, bed, rug, loot: { items, money }, props }],
  })),
  // …and the Park's people, along Mesa Road
  ...[
    ['npc_billie', 'Billie Roost', 'roost', '#c8402a', '#e0b080', { item_gold_watch: 1, item_pocket_watch: 1 }, 140, [
      { type: 'painting', x: 1, y: 0, w: 4, examine: 'A propeller, varnished and mounted, from the first aircraft Billie ever built. The brass plaque: "ROOST No. 1 — FLEW ONCE, BEAUTIFULLY, INTO A HEDGE."' },
      { type: 'shelf', x: 1, y: 4, examine: 'Leather flying helmets on a row of mannequin heads, oldest to newest. The newest is forty years old.' },
    ]],
    ['npc_imogen', 'Dr. Imogen Hale', 'hale', '#2e3a4e', '#c8a040', { item_gold_watch: 1, item_gold_ring: 1 }, 260, [
      { type: 'desk', x: 1, y: 4, w: 2, examine: 'A home desk with exactly one pen, one notepad and one framed photo, of a rocket. The notepad says: "GROWTH."' },
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A framed MRDN share certificate, No. 1, issued to a much younger Imogen Hale for one obol.' },
    ]],
    ['npc_ailie', 'Ailie Ronn', 'ronn', '#c86a2a', '#e8c04a', { item_pocket_watch: 1 }, 70, [
      { type: 'shelf', x: 1, y: 4, examine: 'Flight logbooks, twelve of them, and a jar of ejection-seat safety pins ("souvenirs, not regrets").' },
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A poster: "THE ESCARPMENT DASH — WINNER: B. ROOST". Ailie has written underneath: "NEXT YEAR. — A.R."' },
    ]],
    ['npc_rudy', 'Rudy Durr', 'durr', '#5a5a5e', '#7a7a7e', { item_bolts: 6 }, 48, [
      { type: 'toolrack', x: 1, y: 4, examine: 'Torque wrenches, each calibrated, each tagged with its calibration date. One is overdue. Rudy hasn\'t slept.' },
    ]],
    ['npc_tina', 'Tina Minus', 'minus', '#3a3a4a', '#c84a2a', { item_pocket_watch: 2 }, 55, [
      { type: 'shelf', x: 1, y: 4, examine: 'Stopwatches. Dozens. Each labelled with a launch and its time to the hundredth. One is labelled "BIRTHDAY (MINE) — HELD FOR WEATHER".' },
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A long-exposure photograph of a launch: a single bright scratch across the night, from the pad to the stars.' },
    ]],
    ['npc_wrenna', 'Wrenna Torq', 'torq', '#8a5a2a', '#c8a060', { item_bolts: 5, item_pocket_watch: 1 }, 30, [
      { type: 'workbench', x: 1, y: 4, w: 2, examine: 'A home workbench with a carburettor in bits on it, a carburettor half-together, and a carburettor nobody will ever see again.' },
    ]],
  ].map(([who, name, key, bed, rug, items, money, props], i) => ({
    id: `starling_${key}`, map: 'starling_flats', building: `sf_house_${i + 6}`, name: `${i + 6} Mesa Road`, mapLabel: `No. ${i + 6}`, type: 'house',
    flats: [{ who: [who], name, bed, rug, loot: { items, money }, props }],
  })),
  { id: 'lariat_tolliver', map: 'lariat', building: 'b_house_3', name: 'The Tolliver place', mapLabel: 'Tolliver', type: 'house',
    flats: [{ who: ['npc_wes'], name: 'Wes Tolliver', bed: '#8a5a3a', rug: '#a07a4a', loot: { items: { item_silver_spoons: 1 }, money: 28 }, props: [
      { type: 'painting', x: 3, y: 0, w: 2, examine: 'A rodeo poster, 1974: "WES TOLLIVER — THIRD PLACE". Third place has been framed in gold.' },
      { type: 'shelf', x: 1, y: 4, examine: 'Saddle soap, hoof picks, and a well-thumbed book: "Cows And What They\'re Thinking".' },
    ] }] },
];

/** Marty takes a fifth flat at the Plumb Line (Mason is his landlord). Built in maps/westbrook.js. */
export const PLUMB_FIVE = { who: ['npc_marty'], map: 'plumb_unit_5' };

/** The Yards Lodging House: beds for the arms works' hired hands (aw1 4, aw2 6, aw3 10). */
export const LODGING = { id: 'lodging', map: 'yards', building: 'b_scrapco', name: 'The Yards Lodging House', mapLabel: 'Lodgings', beds: 20, firstBed: { aw1: 1, aw2: 5, aw3: 11 } };

const flatId = (h, i) => (h.flats.length > 1 ? `${h.id}_${i + 1}` : h.id);
const hallId = (h) => `${h.id}_hall`;
export const homeDoorOut = (h) => `${h.id}_door_out`;

/** Locks: residents (and their invited guests, and anyone who breaks in) only. */
const lockFor = (who, label) => ({ key: 'item_none', owners: who, home: who, message: `${label}. A private home; the door is locked.` });

function flatMap(h, i) {
  const f = h.flats[i];
  const id = flatId(h, i);
  const exit = h.flats.length > 1 ? { map: hallId(h), spot: `unit_${i + 1}_door` } : { map: h.map, spot: homeDoorOut(h) };
  return {
    id, name: `${h.name}${h.flats.length > 1 ? ` — Flat ${i + 1}` : ''} (${f.name})`, kind: 'interior', music: 'mus_home', ambience: 'amb_indoor', home: f.who,
    tiles: roomTiles(9, 7, 'f', 4),
    doors: [{ id: `door_${id}_exit`, x: 4, y: 6, to: exit }],
    spots: { entry: { x: 4, y: 5, facing: 'up' }, bed: { x: 2, y: 2, facing: 'down' }, bed_b: { x: 4, y: 2, facing: 'down' }, chair: { x: 6, y: 3, facing: 'left' }, ...(f.spots || {}) },
    keepClear: [[4, 5]],
    props: [
      { id: `${id}_bed`, type: 'bed', x: 1, y: 1, color: f.bed },
      ...(f.who.length > 1 ? [{ id: `${id}_bed2`, type: 'bed', x: 3, y: 1, color: f.rug }] : []),
      { id: `${id}_table`, type: 'table', x: 6, y: 2 },
      { id: `${id}_stove`, type: 'stove', x: 7, y: 1 },
      { id: `${id}_rug`, type: 'rug', x: 3, y: 3, w: 2, h: 2, color: f.rug },
      { id: `${id}_dresser`, type: 'cabinet', x: 7, y: 4, interact: { kind: 'container', container: `ct_${id}_dresser` }, examine: 'A dresser. The kind of drawer people keep the good things in.' },
      ...f.props.map((p, k) => ({ id: `${id}_x${k}`, ...p })),
    ],
  };
}

function hallMap(h) {
  const n = h.flats.length;
  const w = Math.max(9, n * 3 + 3);
  const door = Math.floor(w / 2);
  const xs = h.flats.map((_, i) => 2 + i * 3);
  return {
    id: hallId(h), name: `${h.name} — stairwell`, kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
    tiles: roomTiles(w, 7, 'f', door, xs.map((x) => [x, 0, 1, 1, 'D'])),
    doors: [
      { id: `door_${hallId(h)}_exit`, x: door, y: 6, to: { map: h.map, spot: homeDoorOut(h) } },
      ...xs.map((x, i) => ({ id: `door_${flatId(h, i)}`, x, y: 0, label: `Flat ${i + 1} — ${h.flats[i].name}`, to: { map: flatId(h, i), spot: 'entry' }, lock: lockFor(h.flats[i].who, `Flat ${i + 1} — ${h.flats[i].name.toUpperCase()}`) })),
    ],
    spots: { entry: { x: door, y: 5, facing: 'up' }, ...Object.fromEntries(xs.map((x, i) => [`unit_${i + 1}_door`, { x, y: 1, facing: 'down' }])) },
    keepClear: [[door, 5]],
    props: [
      { id: `${hallId(h)}_mail`, type: 'cabinet', x: w - 2, y: 4, examine: `Mailboxes: ${h.flats.map((f, i) => `${i + 1} ${f.name.toUpperCase()}`).join(', ')}.` },
      { id: `${hallId(h)}_plant`, type: 'plant', x: 1, y: 5 },
    ],
  };
}

function lodgingMap() {
  const props = [];
  const spots = { entry: { x: 10, y: 9, facing: 'up' }, common_a: { x: 9, y: 7, facing: 'right' }, common_b: { x: 12, y: 7, facing: 'left' } };
  for (let k = 0; k < LODGING.beds; k++) {
    const x = 1 + (k % 10) * 2;
    const y = k < 10 ? 1 : 4;
    props.push({ id: `lodge_bed_${k + 1}`, type: 'cot', x, y });
    spots[`bed_${k + 1}`] = { x: x + 1, y: y + 1, facing: 'left' }; // beside the cot (a cot is 1×2)
  }
  props.push({ id: 'lodge_table', type: 'table', x: 10, y: 7, w: 2, examine: 'A long table, a kettle and a rota: "WHOSE TURN TO BUY MILK". Every name is crossed out.' });
  props.push({ id: 'lodge_stove', type: 'stove', x: 19, y: 7 });
  return {
    id: 'lodging', name: 'The Yards Lodging House', kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
    tiles: roomTiles(22, 11, 'f', 10), doors: [{ id: 'door_lodging_exit', x: 10, y: 10, to: { map: LODGING.map, spot: 'lodging_door_out' } }],
    spots, keepClear: [[10, 9]], props,
  };
}

/** Every home interior (halls and flats) plus the lodging house. */
export function homeMaps() {
  const out = [];
  for (const h of HOMES) {
    if (h.flats.length > 1) out.push(hallMap(h));
    h.flats.forEach((_, i) => out.push(flatMap(h, i)));
  }
  out.push(lodgingMap());
  return out;
}

/** Each flat's dresser: owned by its first resident; taking from it is burglary. */
export function homeContainers() {
  const out = {};
  for (const h of HOMES) h.flats.forEach((f, i) => {
    out[`ct_${flatId(h, i)}_dresser`] = { name: `${f.name.split(' & ')[0]}'s dresser`, owner: f.who[0], theftFact: 'fact_player_burglary', items: { ...f.loot.items }, money: f.loot.money };
  });
  out.ct_plumb_unit_5_dresser = { name: 'Marty\'s dresser', owner: 'npc_marty', theftFact: 'fact_player_burglary', items: { item_gold_watch: 1, item_cigar: 1 }, money: 45 };
  return out;
}

/** RESIDENCES entries and each resident's LIFE home. */
export function homeResidences() {
  const residences = {};
  const homes = {};
  for (const h of HOMES) {
    const units = {};
    h.flats.forEach((f, i) => {
      const unit = h.flats.length > 1 ? `flat_${i + 1}` : 'home';
      units[unit] = { map: flatId(h, i), beds: f.who.length > 1 ? ['bed', 'bed_b'] : ['bed'], capacity: f.who.length, ...(f.who.length > 1 ? { shared: true } : {}) };
      for (const who of f.who) homes[who] = `res_${h.id}/${unit}`;
    });
    residences[`res_${h.id}`] = { name: h.name, type: h.type, units };
  }
  return { residences, homes };
}

/**
 * Mark every private home — generated here or older (Osric's house, the Plumb Line flats, the farmhouses,
 * the boarding house…): its map knows its residents (`def.home`), and every locked door into it gets
 * `lock.home` — invitations open it, and it can be picked or forced. Unlocked doors stay unlocked; camps,
 * dormitories and estates (the manor has its own invitation) are left alone. Mutates `maps`.
 */
export function markHomes(maps, residences, life) {
  const residents = {};
  for (const [id, l] of Object.entries(life)) {
    const [rid, unit] = l.home.split('/');
    const r = residences[rid];
    if (!r || ['camp', 'dormitory', 'estate'].includes(r.type)) continue;
    const m = r.units[unit]?.map;
    if (m && maps[m]?.kind === 'interior') (residents[m] ||= []).push(id);
  }
  for (const [mapId, who] of Object.entries(residents)) {
    maps[mapId].home = [...new Set([...(maps[mapId].home || []), ...who])];
    for (const m of Object.values(maps)) {
      const doors = [...(m.doors || []), ...(m.buildings || []).map((b) => b.door).filter(Boolean)];
      for (const d of doors) {
        if (d.to?.map !== mapId || !d.lock || d.lock.flag) continue;
        d.lock.home = [...new Set([...(d.lock.home || []), ...who])];
      }
    }
  }
}

/** Put the front doors on the buildings (after widening; mutates `maps`). */
export function addHomes(maps) {
  for (const h of [...HOMES, LODGING]) {
    const m = maps[h.map];
    const b = m.buildings.find((x) => x.id === h.building);
    if (!b) throw new Error(`homes: no building ${h.building} on ${h.map}`);
    const d = b.door || { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    const residents = h.flats ? h.flats.flatMap((f) => f.who) : null;
    const to = h.flats ? (h.flats.length > 1 ? { map: hallId(h), spot: 'entry' } : { map: flatId(h, 0), spot: 'entry' }) : { map: 'lodging', spot: 'entry' };
    b.name = h.name;
    b.mapLabel = h.mapLabel;
    if (h.sign !== undefined) b.sign = h.sign;
    if (h === LODGING) b.sign = 'LODGINGS';
    b.door = { x: d.x, y: d.y, to, lock: h.flats ? lockFor(residents, h.name) : { key: 'item_none', staff: true, hours: { from: '06:00', to: '23:00' }, message: 'The Yards Lodging House: workers\' lodgings. Open 06:00–23:00.' } };
    m.spots[h === LODGING ? 'lodging_door_out' : homeDoorOut(h)] = { x: d.x, y: d.y + 1, facing: 'down' };
  }
}
