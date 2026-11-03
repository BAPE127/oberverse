// Mock-only city definitions for the Post-War cities, written in the game's own map format (tiles, buildings, towers, props) so the
// game's own renderer draws them. Nothing here is in src/. Run via ingame.mjs.
import { MapBuilder } from '/src/world/mapBuilder.js';
const hash = (a, b = 0, c = 0) => { let h = ((a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (arr, k, s = 0) => arr[Math.floor(hash(k, arr.length, 7 + s) * arr.length) % arr.length];

// style tables: wall, roof, trim, neon (sign text colour), awnings, sign names
export const STYLES = {
  // ---- Neumina
  n_res: { walls: ['#5d4e86', '#6a5a96', '#54487a'], roofs: ['#2c2450', '#342a5c'], trims: ['#1c1634', '#241c40'], neons: ['#ff5ec8', '#5ee6ff', '#ffd75e'], awn: ['#c43fa0', '#2fb4d0'], names: ['NOODLE BAR', 'CAPSULE HOTEL', 'LAUNDROMAT', 'POCKET MARKET', 'VENDING HALL', 'TEA STALL', 'CO-OP FLATS', 'REPAIR SHOP', 'ARCADE', 'PRINT SHOP', 'PAWN & LOAN', 'HAIR & CHROME', 'SLEEP PODS', 'RAMEN 24', 'DUMPLING HOUSE', 'PET CLONER', 'NIGHT SCHOOL', 'PHARMACY', 'TOFU WORKS', 'BIKE & DRONE'] },
  n_corp: { walls: ['#3f4f86', '#4a5a94', '#36457a'], roofs: ['#232d52', '#2a3560'], trims: ['#141a34', '#1c2442'], neons: ['#5ee6ff', '#ffd75e', '#a98cff'], awn: ['#2f78d0'], names: ['MERIDIAN BANK', 'AXION LABS', 'VIREO MEDIA', 'HELIX LEGAL', 'SABLE ENERGY', 'QUILL DATA', 'ATRIUM CAFE', 'PELHAM TRUST', 'NOVA INSURANCE', 'ZEPHYR HOLDINGS', 'IRIS BIOTECH', 'LUMEN UTILITIES', 'ARGENT CAPITAL', 'COBALT CONSULTING', 'HALDEN GROUP'] },
  n_ent: { walls: ['#7a3f96', '#6a3586', '#86489f'], roofs: ['#34184a', '#40205a'], trims: ['#220f34', '#2c1442'], neons: ['#ff5ec8', '#5ee6ff', '#ffd75e', '#ff8a4e'], awn: ['#d03aa8', '#2fb4d0', '#e0a030'], names: ['STATIC LOUNGE', 'HOLO CASINO', 'SUSHI LINE', 'KARAOKE CELL', 'DREAM PARLOUR', 'SYNTH RECORDS', 'MIRAGE BAR', 'TATTOO & PORTS', 'GAME HALL', 'BUBBLE TEA', 'CINEMA NINE', 'SKIN & SOUND', 'PACHINKO PALACE', 'VELVET WIRE', 'CHROME CAFE', 'DANCE VAULT', 'VR PARLOUR', 'LUCKY OCTOPUS'] },
  n_seam: { walls: ['#6a4a5a', '#5a3f50', '#745464'], roofs: ['#2a1c28', '#34242e'], trims: ['#1a1018', '#22141c'], neons: ['#ff8a4e', '#8aff9a', '#ff5ec8'], awn: ['#b8602a'], names: ['CHOP SHOP', 'BACK-ALLEY CLINIC', 'DATA FENCE', 'SMOKE DEN', 'SCRAP YARD', 'BUNKER BAR', 'GAMBLING CELLAR', 'PARTS SWAP', 'SQUAT', 'DROP POINT', 'RUST CAFE', 'WIRE BAZAAR', 'BROKER DEN', 'CRACKED SCREENS', 'INK CELLAR', 'BLACK LAMP'] },
  n_ind: { walls: ['#4a5f70', '#40546a', '#546a7c'], roofs: ['#222c38', '#2a3644'], trims: ['#141a22', '#1a222c'], neons: ['#ff8a4e', '#ffd75e', '#5ee6ff'], awn: ['#c08020'], names: ['KILN WORKS', 'CELL FOUNDRY', 'COOLANT PLANT', 'DEPOT 7', 'ASSEMBLY B', 'POWER HUB', 'CARGO GATE', 'PUMP HOUSE', 'WAREHOUSE 22', 'RECYCLER', 'DATA FARM', 'FAB LINE 3', 'SMELTER', 'STAMPING HALL', 'BATTERY STORE', 'CABLE WORKS'] },
  n_tran: { walls: ['#3f7090', '#487e9e', '#366380'], roofs: ['#1e3a50', '#244458'], trims: ['#102030', '#162838'], neons: ['#5ee6ff', '#8aff9a', '#ffd75e'], awn: ['#2f9ab8'], names: ['TICKET HALL', 'BUS BAYS', 'CARGO LIFT', 'LOST & FOUND', 'FOOD COURT', 'TAXI RANK', 'METRO ANNEX', 'LOCKER HALL', 'SKYBUS LOUNGE', 'MAGLEV DEPOT'] },
  n_lab: { walls: ['#7a4a7e', '#6a3f70', '#865488'], roofs: ['#34203a', '#3e2846'], trims: ['#201026', '#2a1632'], neons: ['#ff5ec8', '#ff6a6a'], awn: ['#b03a6a'], names: ['GENE LAB', 'COLD STORE', 'SERVER VAULT', 'STAFF BLOCK', 'CLEAN ROOM', 'TEST HALL', 'GUARD POST', 'LOADING DOCK', 'ANIMAL WING'] },
  // ---- Saint Halloran
  r_lan: { walls: ['#8a5a36', '#7a4e30', '#946440'], roofs: ['#3a2a22', '#443228'], trims: ['#2a1c14', '#34241a'], neons: ['#ffc846', '#ff5a5a', '#ff9a3c'], awn: ['#b83a2a', '#c89a2a'], names: ['LANTERN TEA HOUSE', 'JOSS PAWNBROKER', 'FAN TAN PARLOUR', 'TEMPLE SHOP', 'OLD TOWN BAKERY', 'FORTUNE RADIO', 'JADE TAILOR', 'HERB & CURE', 'DRAGON NOODLES', 'MOON GATE CAFE', 'ABACUS BANK', 'INK & SEAL', 'SILK ROW', 'MAHJONG HALL', 'LUCKY CAT LAUNDRY'] },
  r_van: { walls: ['#8a4048', '#7a363e', '#964c54'], roofs: ['#3a2428', '#442c30'], trims: ['#2a1418', '#341c20'], neons: ['#ff5a6a', '#ffc846', '#ff8aa8'], awn: ['#a82a3a', '#c8a030'], names: ['VELVET ROOM', 'ACE PAWN', 'IVORY BANK', 'OYSTER BAR', 'DICE & DAME', 'MIDNIGHT JAZZ', 'CIGAR LOUNGE', 'DRESS SHOP', 'RACING WIRE', 'OPERA DOOR', 'DIAMOND ROW', 'SILVER FOX BAR', 'PENTHOUSE CLUB', 'TUX RENTAL', 'GOLD LEAF HOTEL'] },
  r_kes: { walls: ['#4a6a84', '#3f5f78', '#56768e'], roofs: ['#24323e', '#2c3c48'], trims: ['#16222c', '#1c2a36'], neons: ['#6ec0f0', '#ff9a3c', '#8aff9a'], awn: ['#2a6a9a'], names: ['DOCK CAFE', 'CHANDLERY', 'ROPE WORKS', 'PIER ROW BAR', 'FISH MARKET', 'SHIP AGENT', 'COLD STORE', 'CUSTOMS ANNEX', 'UNION PUB', 'ICE HOUSE', 'NET LOFT', 'SMOKEHOUSE', 'BOAT YARD', 'CANNERY', 'SHIPWRIGHT', 'CRATE WORKS'] },
  r_civ: { walls: ['#9a9aaa', '#8a8a9a', '#a6a6b4'], roofs: ['#4a4c58', '#54566a'], trims: ['#34363e', '#3c3e48'], neons: ['#dce6ff', '#ffe9a0'], awn: ['#4a5a8a'], names: ['RECORDS OFFICE', 'PRESS CLUB', 'LAWYERS ROW', 'POST OFFICE', 'BAR ASSOCIATION', 'TAX BUREAU', 'LAND OFFICE', 'FIRE STATION 1', 'NOTARY', 'CITY ARCHIVE'] },
  r_ten: { walls: ['#80604a', '#745644', '#8a6a52'], roofs: ['#3a2e28', '#42342c'], trims: ['#2a201a', '#32261e'], neons: ['#ffb040', '#ffd870', '#8aff9a'], awn: ['#8a5a2a'], names: ['BOARDING HOUSE', 'CORNER GROCERY', 'LAUNDRY', 'CHEAP ROOMS', 'RAG SHOP', 'SOUP KITCHEN', 'POOL HALL', 'PAWN & LOAN', 'PENNY CAFE', 'COBBLER', 'BARBER', 'ROOMS TO LET'] },
  r_mhe: { walls: ['#92725a', '#86664f', '#9c7c64'], roofs: ['#3e342c', '#483c32'], trims: ['#2c241c', '#342a22'], neons: ['#ffb040', '#ffd870'], awn: ['#7a4a2a', '#4a7a4a'], names: ['MAPLE FLATS', 'FLORIST', 'DENTIST', 'BOOKSHOP', 'PHARMACY', 'DOCTOR HALE', 'BAKERY', 'GROCERS', 'DINER', 'TOY SHOP', 'CINEMA', 'TEA ROOM'] },
};

/**
 * Build a city. cfg: { id, name, W, H, bandsY: [[y0,y1]...], colsX: per band [[x0,x1]...], cells: {key: style}, avenues:[...], streets:[...], plazas, landmarks }
 * Returns { def, meta } where meta lists buildings (centres) and road lanes for the overlay and the cars/people placer.
 */
export function buildCity(cfg) {
  const { W, H } = cfg; const m = new MapBuilder(W, H, cfg.ground || ',');
  const buildings = [], props = [], meta = { roads: [], plazas: [], blds: [], lamps: [], doors: [] };
  let bn = 0, pn = 0;
  const P = (type, x, y, o = {}) => { if (x < 0 || y < 0 || x >= W || y >= H) return null; const p = { id: `p${pn++}`, type, x, y, ...o }; props.push(p); return p; };
  // roads
  for (const r of cfg.roads) { m.rect(r.x, r.y, r.w, r.h, '='); meta.roads.push(r); }
  for (const z of cfg.plazas || []) { m.rect(z.x, z.y, z.w, z.h, z.tile || 'm'); meta.plazas.push(z); }
  for (const a of cfg.alleys || []) m.rect(a.x, a.y, a.w, a.h, 'g');
  for (const w of cfg.water || []) m.rect(w.x, w.y, w.w, w.h, '~');
  for (const p of cfg.paving || []) m.rect(p.x, p.y, p.w, p.h, p.tile || ',');
  // buildings in cells
  const tower = (id, name, x, y, w, h, storeys, st, o = {}) => ({ id, name, mapLabel: name, x, y, w, h, tower: storeys, wall: o.wall, glass: o.glass || '#8fd0e8', trim: o.trim, roof: o.roof, sign: o.sign, signColor: o.neon, helipad: o.helipad, door: { x: x + Math.floor(w / 2), y: y + h - 1 } });
  const shop = (name, x, y, w, h, st, o = {}) => ({ id: `b${bn++}`, name, mapLabel: name, x, y, w, h, sign: o.sign ?? name, signColor: o.neon, roof: o.roof, wall: o.wall, trim: o.trim, flatRoof: true, awning: o.awning, shabby: o.shabby, columns: o.columns, door: { x: x + Math.floor(w / 2), y: y + h - 1 } });
  let sk = 0; const used = new Set();
  for (const cell of cfg.cells) {
    const S = STYLES[cell.style]; const x0 = cell.x, y0 = cell.y, cw = cell.w, ch = cell.h;
    // rows: split cell height into one or two rows with a 2-tile alley when tall enough
    const rows = []; if (ch >= 17) { const h1 = Math.floor((ch - 2) / 2); rows.push([y0, h1]); rows.push([y0 + h1 + 2, ch - h1 - 2]); m.rect(x0, y0 + h1, cw, 2, 'g'); meta.alleys = (meta.alleys || []).concat([{ x: x0, y: y0 + h1, w: cw, h: 2 }]); } else rows.push([y0, ch]);
    rows.forEach(([ry, rh], ri) => {
      let x = x0;
      while (x < x0 + cw) {
        const wmin = cell.wmin || 6, wmax = cell.wmax || 12; let w = wmin + Math.floor(hash(x, ry, sk++) * (wmax - wmin + 1)); if (cell.lanes && w < 5) w = 5; if (x0 + cw - (x + w) < 5) w = x0 + cw - x; if (w < 4) break;
        const bh = Math.min(rh, (cell.dmin || 7) + Math.floor(hash(x, ry, 3) * ((cell.dmax || 10) - (cell.dmin || 7) + 1))); const by = ry + rh - bh;
        let name = pick(S.names, x * 31 + ry * 7 + sk, ri); for (let t = 0; used.has(name) && t < S.names.length; t++) name = S.names[(S.names.indexOf(name) + 1) % S.names.length]; used.add(name);
        const k = Math.floor(hash(x, ry, 11) * 1000);
        const wall = pick(S.walls, k), roof = pick(S.roofs, k + 1), trim = pick(S.trims, k + 2), neon = pick(S.neons, k + 3);
        const isTower = (cell.towers || 0) > hash(x, ry, 5) && w >= 7 && bh >= 8;
        let b;
        if (isTower) { b = tower(`b${bn++}`, name, x, by, w, bh, 10 + Math.floor(hash(x, ry, 9) * 22), S, { wall, trim, roof, neon, sign: name, helipad: hash(x, ry, 13) < 0.35 }); }
        else b = shop(name, x, by, w, bh, S, { wall, roof, trim, neon, awning: hash(x, ry, 17) < 0.55 ? pick(S.awn, k + 4) : undefined, shabby: cell.style.endsWith('seam') || cell.style.endsWith('ten') ? hash(x, ry, 19) < 0.4 : false, columns: cell.style.endsWith('civ') && hash(x, ry, 23) < 0.5 });
        buildings.push(b); m.rect(b.x, b.y, b.w, b.h, 'B'); meta.blds.push({ id: b.id, name: b.name, x: b.x, y: b.y, w: b.w, h: b.h, tower: b.tower, style: cell.style });
        let gap = hash(x, ry, 29) < 0.35 ? 1 : 0; if (cell.lanes && hash(x, ry, 31) < 0.4) { gap = 2; m.rect(x + w, ry, 2, rh, 'g'); }
        x += w + gap;
      }
    });
  }
  // landmarks override: rect + custom
  for (const L of cfg.landmarks || []) {
    // clear buildings overlapping the footprint
    for (let i = buildings.length - 1; i >= 0; i--) { const b = buildings[i]; if (b.x < L.x + L.w && b.x + b.w > L.x && b.y < L.y + L.h && b.y + b.h > L.y) { m.rect(b.x, b.y, b.w, b.h, ','); buildings.splice(i, 1); const mi = meta.blds.findIndex((q) => q.id === b.id); if (mi >= 0) meta.blds.splice(mi, 1); } }
    const o = L.o || {}; const id = `b${bn++}`;
    const b = L.tower ? tower(id, L.name, L.x, L.y, L.w, L.h, L.tower, null, { wall: o.wall, trim: o.trim, roof: o.roof, neon: o.neon, sign: L.sign || L.name, helipad: o.helipad, glass: o.glass }) : { id, name: L.name, mapLabel: L.name, x: L.x, y: L.y, w: L.w, h: L.h, sign: L.sign || L.name, signColor: o.neon, roof: o.roof, wall: o.wall, trim: o.trim, flatRoof: true, awning: o.awning, columns: o.columns, door: { x: L.x + Math.floor(L.w / 2), y: L.y + L.h - 1 } };
    buildings.push(b); m.rect(b.x, b.y, b.w, b.h, 'B'); meta.blds.push({ id, name: L.name, x: b.x, y: b.y, w: b.w, h: b.h, tower: b.tower, style: 'landmark', key: L.key });
  }
  // street furniture: lamps along every road edge, hydrants, benches, plants
  const road = (x, y) => m.grid[y]?.[x] === '=';
  const sw = (x, y) => m.grid[y]?.[x] === ',';
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!sw(x, y)) continue;
    const nearRoad = road(x + 1, y) || road(x - 1, y) || road(x, y + 1) || road(x, y - 1);
    if (nearRoad && (x * 7 + y * 13) % (cfg.lampStep || 11) === 0) { P('streetlamp', x, y); meta.lamps.push([x, y]); }
    else if (nearRoad && (x * 5 + y * 3) % 23 === 1) P(pick(['hydrant', 'trashbarrel', 'bench', 'plant', 'plant'], x * 3 + y), x, y);
  }
  for (const a of meta.alleys || []) for (let x = a.x + 2; x < a.x + a.w - 2; x += 5 + (x % 3)) P(pick(['dumpster', 'crate', 'barrel', 'trashbarrel', 'vent'], x * 3 + a.y), x, a.y + (x % 2));
  for (const p of cfg.props || []) P(p.type, p.x, p.y, p.o || {});
  for (const z of cfg.plazas || []) { if (z.fountain) P('fountain', z.x + Math.floor(z.w / 2) - 1, z.y + Math.floor(z.h / 2) - 1); for (let i = 0; i < (z.trees || 0); i++) P('tree', z.x + 1 + Math.floor(hash(z.x, i, 1) * (z.w - 2)), z.y + 1 + Math.floor(hash(z.y, i, 2) * (z.h - 2))); }
  // door tiles stay clear: remove props standing in front of doors
  const blocked = new Set(buildings.map((b) => `${b.door.x},${b.door.y + 1}`)); meta.doors = buildings.map((b) => [b.door.x, b.door.y]);
  for (let i = props.length - 1; i >= 0; i--) if (blocked.has(`${props[i].x},${props[i].y}`)) props.splice(i, 1);
  const def = { id: cfg.id, name: cfg.name, kind: 'outdoor', tiles: m.rows(), buildings, props, spots: { start: { x: cfg.start[0], y: cfg.start[1], facing: 'down' } }, areas: [] };
  return { def, meta };
}
