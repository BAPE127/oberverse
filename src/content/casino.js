// The Phonograph Grand (v0.52.0): Octavius Thomas Phonograph's casino resort, rebuilt on the site
// of the Lucky Star bar on Market Street, Halvermouth (owner's choice). The bar lives on as the
// resort's lounge.
//
//   G   the Grand Lobby — on the street, walked into like every building (its size is the
//       building's, set after the town has grown: phonographLobby)
//   2   the Casino Floor — up the grand staircase: roulette, blackjack, Texas Hold'em, Morganius's
//       stage, the cashier's cage, the bar, the security office
//   41  Morganius Spade's rooms (private)
//   42  Octavius Thomas Phonograph's penthouse (private)
//
// The lift takes you between them (src/game/game.js liftPanel); the private floors won't open
// without their owner's leave (`private` below). People without a lift button ride it through
// NPC-only doors in front of the lifts.
import { roomTiles } from '../world/mapBuilder.js';

export const CASINO = {
  name: 'The Phonograph Grand',
  owner: 'npc_octavius',
  host: 'npc_morganius',
  chipRate: 1, // obols per chip, both ways, no fee
  minBuy: 5,
  // the tables: game, stakes, where the host and the seats are (on the casino floor)
  tables: {
    roulette_1: { game: 'roulette', name: 'Roulette — the Gilded Wheel', min: 5, max: 250, seats: 5, prop: 'pg_roulette_1' },
    roulette_2: { game: 'roulette', name: 'Roulette — the High Wheel', min: 50, max: 2500, seats: 5, prop: 'pg_roulette_2' },
    blackjack_1: { game: 'blackjack', name: 'Blackjack — Table One', min: 5, max: 200, seats: 3, prop: 'pg_blackjack_1' },
    blackjack_2: { game: 'blackjack', name: 'Blackjack — Table Two', min: 25, max: 500, seats: 3, prop: 'pg_blackjack_2' },
    blackjack_3: { game: 'blackjack', name: 'Blackjack — the Velvet Table', min: 100, max: 2000, seats: 3, prop: 'pg_blackjack_3' },
    holdem_1: { game: 'holdem', name: 'Texas Hold\'em — 5/10', min: 200, max: 2000, blinds: [5, 10], seats: 6, prop: 'pg_holdem_1' },
    holdem_2: { game: 'holdem', name: 'Texas Hold\'em — 25/50', min: 1000, max: 10000, blinds: [25, 50], seats: 6, prop: 'pg_holdem_2' },
    spade: { game: 'spade', name: 'Morganius\'s Table', min: 25, max: 25, seats: 1, prop: 'pg_spade_table' },
  },
};

export const PHONOGRAPH_TOWER = {
  name: 'The Phonograph Grand', map: 'halvermouth', building: 'b_phonograph',
  floors: [
    { n: 'G', name: 'The Grand Lobby', map: 'phonograph_lobby' },
    { n: '2', name: 'The Casino Floor', map: 'phonograph_casino' },
    { n: '3', name: 'Staff quarters (private)', map: 'phonograph_staff', private: { owners: ['npc_vera', 'npc_brock'], flag: 'phonograph_key_staff', message: 'The button for 3 has a little brass plate: STAFF. It ignores you, politely.' } },
    { n: '41', name: 'Morganius Spade (private)', map: 'phonograph_spade', private: { owners: ['npc_morganius'], flag: 'phonograph_key_spade', message: 'The button for 41 won\'t light. A card is tucked into the panel: "BY INVITATION. — M.S."' } },
    { n: '42', name: 'The Penthouse (private)', map: 'phonograph_octavius', private: { owners: ['npc_octavius'], flag: 'phonograph_key_penthouse', message: 'The button for 42 needs a keycard. A small brass plate: "O.T.P. — PRIVATE RESIDENCE".' } },
  ],
};

const lift = (x, id, y = 0) => ({ id, type: 'lift', x, y, interact: { kind: 'lift', tower: 'phonograph' }, examine: 'A gilt lift, mirrored inside. The dial goes up to 42.' });
/** A door only the residents and staff use: they step into the lift here and out on their floor. */
const shaft = (id, x, y, to, spot, owners) => ({ id, x, y, keepTile: true, npcOnly: true, label: 'Lift', to: { map: to, spot }, ...(owners ? { lock: { key: 'item_none', owners } } : {}) });

const STAFF = ['npc_morganius', 'npc_octavius', 'npc_vera', 'npc_brock'];

// ---------------------------------------------------------------- the casino floor
const CW = 36;
const CH = 24;

function casinoFloor() {
  const t = roomTiles(CW, CH, 'c', 18);
  const props = [
    lift(4, 'pg_casino_lift_a'), lift(5, 'pg_casino_lift_b'), lift(6, 'pg_casino_lift_c'),
    // the cashier's cage, by the stairs
    { id: 'pg_cage', type: 'cashier_cage', x: 2, y: 19, w: 6, interact: { kind: 'casino_cashier' }, examine: 'The cashier\'s cage: brass bars, green-shaded lamps, and a sign: "CHIPS · 1 OBOL EACH · NO FEES · NO NONSENSE".' },
    // roulette, blackjack, hold'em (CASINO.tables[…].prop)
    { id: 'pg_roulette_1', type: 'roulette_table', x: 3, y: 7, w: 4, h: 2, interact: { kind: 'casino', table: 'roulette_1' } },
    { id: 'pg_roulette_2', type: 'roulette_table', x: 3, y: 12, w: 4, h: 2, color: '#1e3a5a', interact: { kind: 'casino', table: 'roulette_2' } },
    { id: 'pg_blackjack_1', type: 'blackjack_table', x: 11, y: 7, w: 3, h: 2, interact: { kind: 'casino', table: 'blackjack_1' } },
    { id: 'pg_blackjack_2', type: 'blackjack_table', x: 11, y: 12, w: 3, h: 2, interact: { kind: 'casino', table: 'blackjack_2' } },
    { id: 'pg_blackjack_3', type: 'blackjack_table', x: 11, y: 17, w: 3, h: 2, color: '#5a1a2a', interact: { kind: 'casino', table: 'blackjack_3' } },
    { id: 'pg_holdem_1', type: 'poker_table', x: 22, y: 7, w: 4, h: 3, interact: { kind: 'casino', table: 'holdem_1' } },
    { id: 'pg_holdem_2', type: 'poker_table', x: 22, y: 14, w: 4, h: 3, color: '#1e3a5a', interact: { kind: 'casino', table: 'holdem_2' } },
    // Morganius's stage
    { id: 'pg_stage', type: 'magic_circle', x: 14, y: 1, w: 8, h: 5, examine: 'A circle inlaid in the floor in silver: suits, runes, and the words NOTHING IS UP MY SLEEVE. EVERYTHING IS.' },
    { id: 'pg_spade_table', type: 'spade_table', x: 16, y: 3, w: 4, h: 2, interact: { kind: 'casino', table: 'spade' } },
    { id: 'pg_pillar_a', type: 'pillar', x: 13, y: 1 }, { id: 'pg_pillar_b', type: 'pillar', x: 22, y: 1 },
    { id: 'pg_pillar_c', type: 'pillar', x: 13, y: 5 }, { id: 'pg_pillar_d', type: 'pillar', x: 22, y: 5 },
    // the bar
    { id: 'pg_bar', type: 'counter', x: 28, y: 2, w: 7, color: '#2a1a24', examine: 'The Spade Bar. Cocktails with names like "The Double Down" and "Morganius\'s Regret".' },
    ...[29, 31, 33].map((x) => ({ id: `pg_stool_${x}`, type: 'chair', x, y: 3 })),
    ...[[29, 6], [32, 6], [29, 9], [32, 9]].flatMap(([x, y]) => [{ id: `pg_lt_${x}_${y}`, type: 'table', x, y, color: '#2a1a24' }, { id: `pg_lc_${x}_${y}`, type: 'chair', x: x + 1, y }]),
    // slot machines down the east wall (for looks: Morganius had them "disenchanted")
    ...[11, 13, 15, 17, 19].map((y) => ({ id: `pg_slot_${y}`, type: 'slot_machine', x: 34, y, examine: 'A slot machine, lit up like a fairground. A brass plate: "OUT OF ORDER — BY ORDER OF M. SPADE. THE ONLY GAMES HERE ARE GAMES OF SKILL. AND MAGIC."' })),
    ...[29, 31].map((x) => ({ id: `pg_slot_b${x}`, type: 'slot_machine', x, y: 21 })),
    // velvet ropes along the stairs; plants; the security office's door is on the west wall
    { id: 'pg_rope_a', type: 'velvet_rope', x: 15, y: 21, w: 2 }, { id: 'pg_rope_b', type: 'velvet_rope', x: 20, y: 21, w: 2 },
    { id: 'pg_plant_a', type: 'plant', x: 1, y: 1 }, { id: 'pg_plant_b', type: 'plant', x: 34, y: 22 }, { id: 'pg_plant_c', type: 'plant', x: 9, y: 22 },
    { id: 'pg_plant_d', type: 'plant', x: 26, y: 22 },
    { id: 'pg_rug', type: 'rug', x: 17, y: 18, w: 3, h: 5, color: '#8a1a22' },
    { id: 'pg_board', type: 'noticeboard', x: 8, y: 1, w: 2, interact: undefined, examine: 'HOUSE RULES. Roulette: single zero, pays 35 to 1 on a number. Blackjack: dealer stands on all 17s, blackjack pays 3 to 2. Hold\'em: no limit, table stakes. Morganius\'s table: by appointment with fate. Chips at the cage.' },
  ];
  return {
    id: 'phonograph_casino', name: 'The Phonograph Grand — Casino Floor', kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
    wallStyle: 'grand', floorStyle: { c: 1 }, grime: 0.95,
    tiles: t,
    doors: [
      { id: 'door_pg_stairs_down', x: 18, y: CH - 1, label: 'Grand staircase (down to the lobby)', to: { map: 'phonograph_lobby', spot: 'stairs_down' } },
      { id: 'door_pg_security', x: 0, y: 4, label: 'Security office', to: { map: 'phonograph_security', spot: 'entry' }, lock: { key: 'item_none', owners: STAFF, message: 'SECURITY — STAFF ONLY. A camera above the door turns to look at you.' } },
      shaft('shaft_pg_casino_41', 4, 1, 'phonograph_spade', 'lift', ['npc_morganius']),
      shaft('shaft_pg_casino_42', 5, 1, 'phonograph_octavius', 'lift', ['npc_octavius', 'npc_vera']),
      shaft('shaft_pg_casino_3', 6, 1, 'phonograph_staff', 'lift', STAFF),
    ],
    spots: {
      entry: { x: 18, y: 21, facing: 'up' },
      stairs_up: { x: 18, y: 21, facing: 'up' },
      lift: { x: 4, y: 2, facing: 'down' },
      security_out: { x: 1, y: 4, facing: 'right' },
      // the cage: the cashier behind it, the customer in front
      cage_cashier: { x: 4, y: 18, facing: 'down' },
      cage_owner: { x: 6, y: 18, facing: 'down' },
      cage_front: { x: 4, y: 20, facing: 'up' },
      // the hosts' places at each table, and the seats
      host_roulette_1: { x: 5, y: 6, facing: 'down' }, host_roulette_2: { x: 5, y: 11, facing: 'down' },
      host_blackjack_1: { x: 12, y: 6, facing: 'down' }, host_blackjack_2: { x: 12, y: 11, facing: 'down' }, host_blackjack_3: { x: 12, y: 16, facing: 'down' },
      host_holdem_1: { x: 24, y: 6, facing: 'down' }, host_holdem_2: { x: 24, y: 13, facing: 'down' },
      host_spade: { x: 18, y: 2, facing: 'down' },
      seat_roulette_1: { x: 5, y: 9, facing: 'up' }, seat_roulette_2: { x: 5, y: 14, facing: 'up' },
      seat_blackjack_1: { x: 12, y: 9, facing: 'up' }, seat_blackjack_2: { x: 12, y: 14, facing: 'up' }, seat_blackjack_3: { x: 12, y: 19, facing: 'up' },
      seat_holdem_1: { x: 24, y: 10, facing: 'up' }, seat_holdem_2: { x: 24, y: 17, facing: 'up' },
      seat_spade: { x: 18, y: 5, facing: 'up' },
      // where Morganius drifts between (weighted in src/systems/casino.js)
      m_stage: { x: 18, y: 2, facing: 'down' }, m_centre: { x: 18, y: 11, facing: 'down' }, m_roulette: { x: 8, y: 10, facing: 'left' },
      m_blackjack: { x: 15, y: 13, facing: 'left' }, m_poker: { x: 27, y: 11, facing: 'left' }, m_lounge: { x: 31, y: 8, facing: 'down' },
      m_overlook: { x: 18, y: 19, facing: 'up' }, m_slots: { x: 32, y: 16, facing: 'right' },
      bar_a: { x: 29, y: 3, facing: 'up' }, bar_b: { x: 31, y: 3, facing: 'up' }, bar_c: { x: 33, y: 3, facing: 'up' }, bar_staff: { x: 31, y: 1, facing: 'down' },
      floor_watch: { x: 9, y: 15, facing: 'right' }, floor_watch_b: { x: 20, y: 9, facing: 'down' },
    },
    keepClear: [[18, 22], [18, 21], [4, 1], [5, 1], [6, 1], [4, 2], [1, 4]],
    props,
  };
}

function security() {
  return {
    id: 'phonograph_security', name: 'The Phonograph Grand — Security', kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
    wallStyle: 'grand', floorStyle: { t: 3 }, grime: 0.8,
    tiles: roomTiles(9, 7, 't', 4).map((row, y) => (y === 6 ? 'WWWWWWWWW' : row)).map((row, y) => (y === 3 ? `W${row.slice(1, 8)}D` : row)),
    doors: [{ id: 'door_pg_security_out', x: 8, y: 3, label: 'Casino floor', to: { map: 'phonograph_casino', spot: 'security_out' } }],
    spots: { entry: { x: 7, y: 3, facing: 'left' }, desk: { x: 3, y: 3, facing: 'up' }, coffee: { x: 6, y: 5, facing: 'up' } },
    props: [
      { id: 'pg_monitors', type: 'monitor_wall', x: 1, y: 1, w: 6, examine: 'A wall of screens: every table, every chip, every corner — except the stage, where the picture is always just snow and a grinning card.' },
      { id: 'pg_sec_desk', type: 'desk', x: 2, y: 4, w: 3 },
      { id: 'pg_sec_chair', type: 'chair', x: 3, y: 3 },
      { id: 'pg_sec_cabinet', type: 'cabinet', x: 7, y: 1 },
    ],
  };
}

// ---------------------------------------------------------------- the penthouses (high over the city)
function aloftFloor(id, name, w, h, ground, liftX, props, extra = {}) {
  return {
    id, name, kind: 'interior', music: 'mus_home', ambience: 'amb_indoor', aloft: { tower: 'phonograph' }, ...extra,
    tiles: roomTiles(w, h, ground, liftX).map((row, y) => (y === h - 1 ? 'W'.repeat(w) : row)),
    doors: extra.doors || [],
    spots: { entry: { x: liftX, y: 2, facing: 'down' }, lift: { x: liftX, y: 2, facing: 'down' }, ...(extra.spots || {}) },
    keepClear: [[liftX, 1], [liftX, 2]],
    props: [lift(liftX, `${id}_lift`), ...props],
  };
}

function staffQuarters() {
  // the people who keep the place running live in: a bunk room off a staff corridor (more beds
  // than staff, for the croupiers and the night shift)
  const beds = [1, 3, 5, 7, 9, 11];
  return aloftFloor('phonograph_staff', 'The Phonograph Grand — Staff Quarters', 14, 9, 'f', 2, [
    ...beds.map((x, i) => ({ id: `pgs_bed_${i + 1}`, type: 'bed', x, y: 5, color: i % 2 ? '#3a2a4a' : '#5a1a2a' })),
    ...[4, 8, 12].map((x) => ({ id: `pgs_locker_${x}`, type: 'cabinet', x, y: 1, examine: 'A staff locker. Name tags: VERA, BROCK, and a row of blank ones for the night shift.' })),
    { id: 'pgs_table', type: 'table', x: 6, y: 3 }, { id: 'pgs_chair_a', type: 'chair', x: 5, y: 3 }, { id: 'pgs_chair_b', type: 'chair', x: 7, y: 3 },
    { id: 'pgs_rota', type: 'noticeboard', x: 9, y: 1, interact: undefined, examine: 'THE ROTA. Cage: Vera, 14:00–02:00. Floor: Brock, 16:00–04:00. Mr Phonograph: "whenever". Mr Spade: "eternally". Underneath, in purple ink: "Do not feed the cards."' },
  ], {
    restricted: 'phonograph_staff',
    wallStyle: 'grand', floorStyle: { f: 2 },
    spots: { ...Object.fromEntries(beds.map((x, i) => [`bed_${i + 1}`, { x, y: 4, facing: 'down' }])), table: { x: 5, y: 3, facing: 'right' } },
    doors: [shaft('shaft_pgs_down', 2, 1, 'phonograph_casino', 'lift', STAFF)],
  });
}

function octaviusPenthouse() {
  return aloftFloor('phonograph_octavius', 'The Penthouse — Octavius Thomas Phonograph', 18, 12, 'f', 2, [
    { id: 'otp_desk', type: 'desk', x: 13, y: 2, w: 3, color: '#2a1a14', examine: 'A desk carved from a single slab of something rare. Three phones on it, all face down. A fourth, face up, buzzing.' },
    { id: 'otp_chair', type: 'chair', x: 14, y: 3 },
    { id: 'otp_dock', type: 'phone_dock', x: 16, y: 2, examine: 'A charging dock for nine phones. Eight are charging. The ninth is in his hand. It always is.' },
    { id: 'otp_bed', type: 'bed', x: 1, y: 7, w: 2, h: 3, color: '#c9a24a', examine: 'A bed with a gold silk cover. Unslept in: the phone on the pillow suggests he naps in the lift.' },
    { id: 'otp_piano', type: 'piano', x: 6, y: 2, w: 3, h: 2, examine: 'A white grand piano. Nobody has played it. It has a very good accountant.' },
    { id: 'otp_sofa_a', type: 'chair', x: 7, y: 6 }, { id: 'otp_sofa_b', type: 'chair', x: 9, y: 6 },
    { id: 'otp_table', type: 'table', x: 8, y: 7, color: '#e8e2d4' },
    { id: 'otp_rug', type: 'rug', x: 6, y: 5, w: 5, h: 4, color: '#c9a24a' },
    { id: 'otp_art_a', type: 'painting', x: 4, y: 0, examine: 'A portrait of Octavius, looking at his phone. The painter was paid to paint the phone first.' },
    { id: 'otp_art_b', type: 'painting', x: 11, y: 0, examine: 'An original by an artist you\'ve never heard of, priced in a currency you\'ve never seen.' },
    { id: 'otp_statue', type: 'statue', x: 14, y: 8, w: 2, h: 2, label: 'MARGIN', examine: 'A bronze bull, lifesize from the waist up. The plaque says MARGIN.' },
    { id: 'otp_bar', type: 'counter', x: 12, y: 9, w: 2, color: '#1e1a24', examine: 'A private bar: one bottle of everything, opened by nobody.' },
    { id: 'otp_plant_a', type: 'plant', x: 1, y: 1 }, { id: 'otp_plant_b', type: 'plant', x: 16, y: 9 },
    { id: 'otp_window', type: 'window', x: 8, y: 0, w: 2, examine: 'Floor to ceiling glass. Halvermouth, all of it, and most of the sea. He has it on his phone too.' },
  ], {
    restricted: 'phonograph_penthouse',
    wallStyle: 'grand', floorStyle: { f: 1 },
    spots: { desk: { x: 14, y: 3, facing: 'up' }, sofa: { x: 8, y: 6, facing: 'down' }, bed: { x: 3, y: 8, facing: 'left' }, window: { x: 9, y: 1, facing: 'up' }, bar: { x: 12, y: 8, facing: 'down' } },
    doors: [shaft('shaft_otp_down', 2, 1, 'phonograph_casino', 'lift', ['npc_octavius', 'npc_vera'])],
  });
}

function spadeRooms() {
  return aloftFloor('phonograph_spade', 'Morganius Spade\'s Rooms', 16, 11, 'c', 2, [
    { id: 'ms_circle', type: 'magic_circle', x: 6, y: 3, w: 5, h: 5, examine: 'A practice circle chalked on the carpet, rubbed out and redrawn so many times the carpet has given up.' },
    { id: 'ms_cards', type: 'floating_cards', x: 8, y: 5, examine: 'A whole deck, hanging in the air in a slow spiral. Pick a card, any card. They won\'t let you.' },
    { id: 'ms_cards_b', type: 'floating_cards', x: 13, y: 2 },
    { id: 'ms_bed', type: 'bed', x: 13, y: 6, w: 2, h: 3, color: '#4a2a6a', examine: 'A four-poster with curtains of deep purple. The pillows are embroidered: ♠ ♥ ♦ ♣. One of them is snoring. Not Morganius.' },
    { id: 'ms_books_a', type: 'shelf', x: 1, y: 1, w: 2, examine: 'Books: "The Pass and the Palm", "Shuffling Off This Mortal Coil", "Cards of the Lower Planes (annotated, angrily)".' },
    { id: 'ms_books_b', type: 'shelf', x: 4, y: 1, w: 2 },
    { id: 'ms_ball', type: 'crystal_ball', x: 3, y: 6, examine: 'A crystal ball on a claw stand. Inside: the casino floor, from above. And you, looking into a crystal ball.' },
    { id: 'ms_candles_a', type: 'candelabra', x: 1, y: 8 }, { id: 'ms_candles_b', type: 'candelabra', x: 10, y: 1 },
    { id: 'ms_mirror', type: 'window', x: 7, y: 0, w: 2, examine: 'A tall mirror. Your reflection does the trick before you do.' },
  ], {
    restricted: 'phonograph_spade',
    wallStyle: 'arcane', floorStyle: { c: 2 },
    spots: { chamber: { x: 8, y: 4, facing: 'down' }, bed: { x: 12, y: 7, facing: 'right' }, ball: { x: 4, y: 6, facing: 'left' }, books: { x: 2, y: 2, facing: 'up' } },
    doors: [shaft('shaft_ms_down', 2, 1, 'phonograph_casino', 'lift', ['npc_morganius'])],
  });
}

/** The resort's fixed floors (the lobby is made once the street is laid out: phonographLobby). */
export function casinoMaps() {
  return [casinoFloor(), security(), staffQuarters(), octaviusPenthouse(), spadeRooms()];
}

/**
 * The Grand Lobby, the size of the building on the grown street: the door where the building's
 * door is, the grand staircase up at the back, the reception desk, the Lucky Star Lounge.
 */
export function phonographLobby(street) {
  const b = street.buildings.find((x) => x.id === 'b_phonograph');
  const W = b.w;
  const H = b.h;
  if (W < 9 || H < 14) throw new Error(`casino: the Phonograph Grand's lobby is too small (${W}×${H})`);
  const dx = b.door.x - b.x; // the front door's column: the red carpet runs straight up to the staircase
  const lx = dx - 2 >= 1 ? dx - 2 : dx + 2;
  const tiles = roomTiles(W, H, 't', dx);
  const props = [
    lift(lx, 'pg_lobby_lift'),
    { id: 'pg_reception', type: 'counter', x: 1, y: 2, w: 3, color: '#1e1a24', examine: 'Reception. A brass bell, a leather register, and a concierge who has already decided what you can afford.' },
    // the Lucky Star, kept as the lobby's lounge bar
    { id: 'pg_lounge_bar', type: 'counter', x: 1, y: H - 9, w: 3, color: '#3a2a4a', examine: 'The Lucky Star Lounge — the old bar\'s sign hangs over it, polished and framed: "THE LUCKY STAR · EST. LONG AGO · STILL HERE".' },
    { id: 'pg_lounge_stool_a', type: 'chair', x: 1, y: H - 8 }, { id: 'pg_lounge_stool_b', type: 'chair', x: 3, y: H - 8 },
    { id: 'pg_lounge_table', type: 'table', x: 2, y: H - 5, color: '#2a1a24' }, { id: 'pg_lounge_chair', type: 'chair', x: 3, y: H - 5 },
    { id: 'pg_lobby_rug', type: 'rug', x: dx - 1, y: 1, w: Math.min(3, W - dx), h: H - 2, color: '#8a1a22' },
    { id: 'pg_lobby_pillar_a', type: 'pillar', x: 5, y: 4 }, { id: 'pg_lobby_pillar_b', type: 'pillar', x: 5, y: H - 5 },
    { id: 'pg_lobby_plant_a', type: 'plant', x: 4, y: 1 }, { id: 'pg_lobby_plant_b', type: 'plant', x: W - 2, y: H - 6 },
    { id: 'pg_lobby_sofa', type: 'chair', x: 1, y: 6 }, { id: 'pg_lobby_sofa_b', type: 'chair', x: 2, y: 6 },
    { id: 'pg_luggage', type: 'luggage_cart', x: 1, y: H - 3, examine: 'A brass luggage trolley. Somebody\'s matched set of crocodile cases, and a cage with a very calm parrot.' },
    { id: 'pg_directory', type: 'sign', x: 3, y: 4, examine: 'THE PHONOGRAPH GRAND. 2 — THE CASINO (up the stairs). 41, 42 — PRIVATE. The Lucky Star Lounge — this floor.' },
  ];
  return {
    id: 'phonograph_lobby', name: 'The Phonograph Grand — Grand Lobby', kind: 'interior', music: 'mus_home', ambience: 'amb_indoor',
    wallStyle: 'grand', floorStyle: { t: 4 }, grime: 0.95,
    tiles,
    doors: [
      { id: 'door_pg_lobby_exit', x: dx, y: H - 1, to: { map: 'halvermouth', spot: 'b_phonograph_out' } },
      { id: 'door_pg_stairs_up', x: dx, y: 0, label: 'Grand staircase (up to the casino)', to: { map: 'phonograph_casino', spot: 'stairs_up' } },
    ],
    spots: {
      entry: { x: dx, y: H - 2, facing: 'up' },
      stairs_down: { x: dx, y: 1, facing: 'down' },
      lift: { x: lx, y: 1, facing: 'down' },
      reception: { x: 2, y: 1, facing: 'down' },
      reception_front: { x: 2, y: 3, facing: 'up' },
      lounge_staff: { x: 2, y: H - 10, facing: 'down' },
      lounge_a: { x: 1, y: H - 7, facing: 'up' }, lounge_b: { x: 3, y: H - 7, facing: 'up' },
      lounge_table: { x: 3, y: H - 4, facing: 'up' },
      lobby_seat: { x: 1, y: 7, facing: 'up' },
      doorman: { x: dx + 1 < W - 1 ? dx + 1 : dx - 1, y: H - 2, facing: 'down' },
    },
    keepClear: [[dx, H - 2], [dx, 1], [dx, 2], [lx, 1]],
    props,
  };
}
