window.SCENES = (function () {
const SCENES = {};
const { setup, rect, B, L, flush, dot, legend, COL } = SC;

// ------------------------------------------------------------------ the Crown Quarter (capital district), 200 x 140 tiles
SCENES.crown = () => {
  setup(200, 140, 6.2, ',', 330);
  rect(0, 0, 200, 140, ','); rect(4, 10, 56, 30, '.'); rect(138, 8, 56, 4, '.'); rect(4, 44, 40, 40, ',');
  // roads: the boulevard (north–south), Embassy Row, the cross street, the approach from Halvermouth
  rect(97, 40, 6, 100, '='); rect(0, 106, 97, 5, '='); rect(103, 86, 97, 5, '='); rect(103, 40, 97, 4, '='); rect(0, 40, 97, 4, '=');
  rect(60, 130, 40, 5, '='); rect(0, 130, 60, 5, '=');
  rect(60, 56, 80, 26, 'm'); // Sovereign Square
  rect(80, 8, 40, 32, 'm'); // the forecourt of Halver House
  // government
  B(84, 6, 32, 20, COL.palace, 'HALVER HOUSE\nOffice of the President', { size: 14, edge: '#7a6a2a' });
  B(124, 12, 34, 22, COL.gov, 'THE ASSEMBLY\n(legislative chamber)', { size: 13 });
  B(42, 14, 30, 18, '#e8d8f0', 'ROYAL PAVILION\n(the boy king\'s visits)', { size: 12 });
  const mins = [['Treasury', 140], ['Defence & Security', 156], ['Interior & Police', 172]];
  mins.forEach(([n, x]) => B(x - 0, 48, 14, 16, COL.ministry, n.replace(' & ', '\n& '), { size: 10.5 }));
  B(140, 66, 14, 14, COL.ministry, 'Agriculture\n& Trade', { size: 10.5 }); B(156, 66, 14, 14, COL.ministry, 'Foreign\nAffairs', { size: 10.5 }); B(172, 66, 14, 14, COL.ministry, 'Public\nRecords', { size: 10.5 });
  // security
  B(90, 42, 20, 4, COL.sec, 'Palace checkpoint', { size: 11 }); B(88, 132, 24, 5, COL.sec, 'CROWN GATE checkpoint', { size: 11 });
  // sovereign square furnishings
  L(100, 69, 'SOVEREIGN SQUARE', { size: 15, color: '#6a5a2a', halo: 'rgba(255,255,255,.7)' }); L(100, 75, 'fountain · flagpoles · demonstration ground', { size: 11, color: '#4a3a1a', halo: 'rgba(255,255,255,.6)' });
  // embassy row (north side of Embassy Row, then south)
  B(5, 86, 22, 16, COL.embassy, 'OSTMARK\nUNION', { size: 12 }); B(29, 88, 15, 14, COL.embassy, 'VARNISTAN', { size: 10.5 }); B(46, 85, 17, 17, '#e8d8a0', 'TESHVAR\n(ornate)', { size: 11 }); B(66, 90, 14, 12, '#d0d0e0', 'LIRRE\n(neutral)', { size: 10.5 });
  B(5, 114, 16, 14, COL.embassy, 'CALDERA', { size: 10.5 }); B(23, 114, 14, 14, COL.embassy, 'PALLAS', { size: 10.5 }); B(39, 114, 16, 14, COL.embassy, 'MORROW', { size: 10.5 }); B(57, 114, 18, 14, '#c8c8c8', 'FREE PORTS\nMISSION', { size: 10 });
  // parties, press, hotels, shops (east of the boulevard, south)
  B(108, 94, 20, 12, COL.party1, 'ORDER PARTY\nheadquarters', { size: 11 }); B(130, 94, 20, 12, COL.party2, 'LIBERTY LEAGUE\nheadquarters', { size: 11 }); B(152, 94, 22, 12, COL.press, 'PRESS HALL\nbriefings · newsroom', { size: 10.5 });
  B(108, 114, 26, 14, COL.hotel, 'CROWN HOTEL\nlobby bar · rooms', { size: 11 }); B(136, 114, 18, 7, COL.shop, 'Café Concord', { size: 10 }); B(136, 122, 18, 6, COL.shop, 'The Sitting Room (restaurant)', { size: 8.5 }); B(156, 114, 20, 14, COL.shop, 'Diplomats\' Club\n& tourist shops', { size: 10 });
  // west: government staff flats and the park
  B(6, 48, 16, 14, COL.home, 'Staff flats\n(A block)', { size: 10 }); B(24, 48, 16, 14, COL.home, 'Staff flats\n(B block)', { size: 10 }); B(6, 66, 34, 14, COL.home, 'Civil Service Residences', { size: 10.5 });
  L(32, 36, 'CROWN PARK', { size: 12, color: '#fff' });
  // things that make it alive
  [[96, 130, 'Bus No. 1 terminus'], [60, 108, 'demonstrators gather'], [110, 62, 'press line']].forEach(([x, y, t]) => { dot(x, y, '#ffe28a', t, 4.5); });
  flush('THE CROWN QUARTER — new region map (about 200 × 140 tiles), entered by a gate off Grand Avenue', 'Halvermouth keeps every shop and road; nothing is demolished. Placement is a mock-up on the game\'s own tile colours; real layout comes in stage 3.');
  legend(200 * 6.2 + 14, 20, [[COL.palace, 'President / ceremonial'], [COL.gov, 'Assembly'], [COL.ministry, 'Ministries and records'], [COL.embassy, 'Embassies (7) and the Free Ports Mission'], [COL.party1, 'Party headquarters (two)'], [COL.press, 'Press hall'], [COL.hotel, 'Hotel, cafés, clubs'], [COL.sec, 'Security checkpoints']]);
};

// ------------------------------------------------------------------ the presidential building: ground floor
SCENES.palace = () => {
  setup(76, 46, 14, 't', 330);
  rect(0, 0, 76, 46, 't');
  const zone = { pub: '#b9dcb0', appt: '#f0d890', res: '#e0a0a0' };
  const room = (x, y, w, h, z, label, o = {}) => B(x, y, w, h, zone[z], label, { size: 11.5, ...o });
  room(26, 34, 24, 11, 'pub', 'GRAND LOBBY\nreception · visitors\' book · information desk');
  room(8, 34, 16, 11, 'pub', 'SECURITY SCREENING\nbags · passes · metal arch');
  room(52, 34, 16, 11, 'pub', 'PUBLIC RECORDS HALL\nlaws · budgets · poll archive');
  room(2, 18, 20, 14, 'pub', 'PRESS BRIEFING ROOM\npodium · 40 seats · camera pit');
  room(54, 18, 12, 14, 'appt', 'CABINET ROOM\nThornday meetings');
  room(24, 20, 14, 12, 'appt', 'WAITING GALLERY\nappointments · aides');
  room(40, 20, 12, 12, 'appt', 'CHIEF OF STAFF');
  room(2, 2, 20, 14, 'appt', 'STAFF OFFICES\nspeechwriters · analysts');
  room(24, 2, 28, 16, 'res', 'THE PRESIDENT\'S OFFICE\ndesk · map table · private door', { size: 13 });
  room(54, 2, 10, 7, 'res', 'PRIVATE\nNEGOTIATION A'); room(54, 10, 10, 6, 'res', 'PRIVATE\nNEGOTIATION B'); room(66, 2, 8, 14, 'res', 'SECURITY\nCONTROL\ncameras'); 
  room(66, 18, 8, 14, 'appt', 'Treasury\nliaison');
  // doors and corridors
  [[37, 45, 'MAIN ENTRANCE'], [14, 33, '', 3], [64, 33, '']].forEach(([x, y, t]) => { if (t) L(x, y + 0.5, t, { size: 11, color: '#ffe28a' }); });
  // people on their schedules (positions at 10:30 on a working day)
  const P = [[48, 15, '#ffd24a', 'President'], [42, 30, '#ffffff', 'Chief of Staff'], [4, 30, '#c8a0d8', 'Press Secretary'], [57, 30, '#9bb4d8', 'Treasury Minister'], [28, 43, '#ffffff', 'Receptionist'], [10, 43, '#ff6a5a', 'Guard'], [66, 43, '#cfcfcf', 'Records clerk'], [26, 30, '#7fe8ff', 'Visitor (you?)'], [67, 14, '#ff6a5a', 'Security chief'], [55, 8, '#ffe28a', 'Ambassador']];
  flush('HALVER HOUSE — ground floor (a mock-up of the interior plan)', 'Green: open to the public in hours. Amber: by appointment or an invitation. Red: restricted; a guard stops you, and a pass or a persuaded aide gets you in.');
  P.forEach(([x, y, c, t]) => dot(x, y, c, t, 5));
  legend(76 * 14 + 14, 20, [[zone.pub, 'Public in office hours (08:00–18:00)'], [zone.appt, 'Appointment or invitation'], [zone.res, 'Restricted: guards, pass required']]);
  SC.g.font = '600 12px system-ui'; SC.g.fillStyle = '#fff'; SC.g.textAlign = 'left';
};

// ------------------------------------------------------------------ the two mansions
SCENES.mansions = () => {
  setup(104, 36, 11, '.');
  rect(0, 0, 104, 36, '.');
  // left: Josiah Vegas — Ironcrest Hall (a hill fort of a house); right: Susan — Willowmere (lakeside, open and glassy)
  rect(0, 0, 50, 36, 'g'); rect(2, 2, 46, 32, '.'); rect(21, 28, 8, 8, '='); rect(53, 0, 51, 36, '.'); rect(70, 18, 30, 16, '~'); rect(75, 30, 8, 6, '=');
  B(2, 1, 46, 1.5, '#555a66', '', {}); B(2, 33.5, 46, 1.5, '#555a66', '', {}); B(0.5, 1, 1.5, 34, '#555a66', '', {}); B(48, 1, 1.5, 34, '#555a66', '', {});
  B(17, 29, 16, 4, COL.sec, 'GATEHOUSE · guards check you', { size: 9.5 });
  B(10, 5, 30, 18, '#a8a095', 'IRONCREST HALL\ngrand hall · trophy gallery', { size: 12 });
  B(4, 8, 5, 12, '#8e8a82', 'barracks\n(guards)', { size: 8.5 }); B(41, 8, 6, 12, '#8e8a82', 'range &\narmoury', { size: 8.5 });
  B(13, 24, 10, 4, '#c0a070', 'WAR ROOM', { size: 9 }); B(25, 24, 12, 4, '#b89060', 'STUDY (private)', { size: 9 }); B(5, 22, 7, 5, '#a09870', 'kitchen\nstaff', { size: 8.5 });
  L(25, 3, 'Josiah Vegas — "Order": discipline, hard stone, one road in, guards at every turn.', { size: 10.5, color: '#ffd0c8' });
  // Willowmere
  B(56, 6, 28, 14, '#e8e0d0', 'WILLOWMERE\nsalon · long library', { size: 12 }); B(60, 21, 14, 7, '#bfe0e0', 'GLASS CONSERVATORY\n(fundraising dinners)', { size: 9 }); B(87, 6, 12, 8, '#d8d0b8', 'garden pavilion\n(meetings)', { size: 9 }); B(56, 22, 3, 3, '#e0c0a0', '', {}); B(60, 1, 18, 4, '#d8c8a0', 'STUDY · open door', { size: 9 }); B(86, 22, 12, 6, '#c8b8a0', 'boathouse', { size: 9 });
  B(90, 30, 12, 4, COL.sec, 'staff & discreet security', { size: 8.5 });
  L(78, 35, 'Susan — "Liberty": light, lake, glass, an open garden gate and a lot of cameras you cannot see.', { size: 10.5, color: '#c8e0ff' });
  dot(27, 20, '#ffd24a', 'Vegas (evenings)', 5); dot(70, 12, '#ffd24a', 'Susan (afternoons)', 5); dot(28, 31, '#ff6a5a', 'guard', 4); dot(20, 31, '#ff6a5a', 'guard', 4);
  flush('THE TWO MANSIONS — site plans (each its own small map, reached by road from the Crown Quarter)', 'Access: by invitation, reputation or an introduction by staff. Not unlocked by money alone.');
};

// ------------------------------------------------------------------ an embassy
SCENES.embassy = () => {
  setup(90, 28, 14, 't');
  rect(0, 0, 90, 28, 't');
  const flag = (x, y, c1, c2) => { SC.g.fillStyle = '#444'; SC.g.fillRect(x * SC.S, y * SC.S - 18, 3, 24); SC.g.fillStyle = c1; SC.g.fillRect(x * SC.S + 3, y * SC.S - 18, 18, 8); SC.g.fillStyle = c2; SC.g.fillRect(x * SC.S + 3, y * SC.S - 10, 18, 8); };
  // Ostmark: large (3 halls), Varnistan: medium, Lirre: small and neutral
  B(1, 2, 38, 24, '#9bb4d8', '', {}); B(3, 4, 12, 8, '#e0e8f4', 'RECEPTION\n& visa desk', { size: 10 }); B(17, 4, 10, 8, '#f0d890', 'AMBASSADOR\nHart-Kessler', { size: 10 }); B(29, 4, 8, 8, '#e0a0a0', 'CIPHER\nROOM', { size: 9.5 }); B(3, 14, 16, 10, '#e0e8f4', 'RECEPTION HALL\nreceptions on Fairday', { size: 10 }); B(21, 14, 16, 10, '#f0d890', 'TRADE ATTACHÉ\ncontracts · disputes', { size: 10 });
  L(20, 1, 'THE OSTMARK UNION — large mission', { size: 12 });
  B(43, 4, 24, 20, '#e8b878', '', {}); B(45, 6, 10, 7, '#e0e8f4', 'RECEPTION', { size: 10 }); B(57, 6, 8, 7, '#f0d890', 'AMBASSADOR', { size: 9.5 }); B(45, 15, 20, 7, '#f0d890', 'TRADE & DEFENCE ATTACHÉ', { size: 10 });
  L(55, 3, 'VARNISTAN — medium', { size: 12 });
  B(71, 8, 17, 14, '#d0d0e0', '', {}); B(73, 10, 7, 6, '#e0e8f4', 'RECEPTION', { size: 9 }); B(81, 10, 6, 6, '#f0d890', 'AMBASSADOR', { size: 8 }); B(73, 17, 13, 4, '#d0d0d0', 'neutral lounge', { size: 9 });
  L(79, 6, 'LIRRE — small, neutral', { size: 12 });
  [[8, 12, '#fff', 'clerk'], [22, 9, '#ffd24a', 'ambassador'], [10, 19, '#7fe8ff', 'you'], [31, 9, '#ff6a5a', 'marine guard'], [30, 20, '#ffffff', 'attaché'], [50, 10, '#fff', 'clerk'], [61, 10, '#ffd24a', 'ambassador'], [76, 12, '#fff', 'clerk'], [84, 12, '#ffd24a', 'ambassador']].forEach(([x, y, c, t]) => dot(x, y, c, t, 4.5));
  flush('EMBASSY TEMPLATES — every country gets a mission; larger countries get more rooms (mock-up)', 'Each has a flag, a reception you can walk into, an ambassador, staff, a guard, hours, dialogue, and a reason to visit (trade, disputes, receptions, quests).');
  flag(37, 3, '#7aa8e8', '#fff'); flag(66, 4, '#e8a24a', '#9a3030'); flag(87, 7, '#c8c8e8', '#fff');
};

// ------------------------------------------------------------------ the mercenary lot in three stages
SCENES.merc = () => {
  const SZ = 64, SH = 44; const S = 8; setup(SZ * 3 + 8, SH, S, '.');
  const ox = (n) => n * (SZ + 4);
  rect(0, 0, SZ * 3 + 8, SH, '.');
  for (let n = 0; n < 3; n++) { rect(ox(n), 0, SZ, SH, ','); rect(ox(n) + 1, 1, SZ - 2, SH - 2, '.'); rect(ox(n) + 26, SH - 6, 8, 6, '='); }
  for (let n = 0; n < 3; n++) { rect(ox(n) + 1, 1, SZ - 2, 1, 'g'); rect(ox(n) + 1, SH - 3, SZ - 2, 1, 'g'); rect(ox(n) + 1, 1, 1, SH - 3, 'g'); rect(ox(n) + SZ - 2, 1, 1, SH - 3, 'g'); }
  const a = ox(0), b = ox(1), c = ox(2);
  // stage 1: the lot (a fence, a gate, a container office, a bunkhouse and a range)
  B(a + 24, SH - 6, 10, 3, COL.sec, 'GATE', { size: 9 }); B(a + 5, 6, 18, 9, '#c0a870', 'Site office\n(company HQ)', { size: 9.5 }); B(a + 28, 6, 16, 9, '#a0a890', 'Bunkhouse (12)', { size: 9.5 }); B(a + 46, 6, 14, 12, '#7a8a6a', 'Shooting\nrange', { size: 9 }); B(a + 6, 22, 14, 8, '#8e8a82', 'Armoury\n(cage)', { size: 9 }); L(a + 32, SH - 1.2, 'STAGE 1 — "Hollowmoor Lot": a security firm', { size: 12, color: '#ffe28a' });
  // stage 2: + mess, medical, motor pool, tank workshop, parade ground
  B(b + 5, 6, 18, 9, '#c0a870', 'Command HQ', { size: 9.5 }); B(b + 25, 6, 14, 9, '#a0a890', 'Barracks A', { size: 9.5 }); B(b + 41, 6, 14, 9, '#a0a890', 'Barracks B', { size: 9.5 }); B(b + 5, 18, 14, 8, '#d0a890', 'Mess hall', { size: 9.5 }); B(b + 21, 18, 12, 8, '#e0c8c8', 'Medical', { size: 9.5 }); B(b + 35, 18, 20, 10, '#7a7a82', 'Motor pool\n& tank workshop', { size: 9.5 }); B(b + 5, 28, 12, 8, '#8e8a82', 'Armoury', { size: 9.5 }); B(b + 20, 29, 12, 8, '#8a8a70', 'Depot', { size: 9.5 }); B(b + 24, SH - 6, 10, 3, COL.sec, 'GATE', { size: 9 }); L(b + 32, SH - 1.2, 'STAGE 2 — a small army', { size: 12, color: '#ffe28a' });
  // stage 3: + tank factory, helicopter works, hangars, helipad, training ground, aircraft apron
  B(c + 4, 4, 18, 8, '#c0a870', 'Command HQ + briefing', { size: 9 }); B(c + 24, 4, 12, 8, '#a0a890', 'Barracks ×4', { size: 9 }); B(c + 38, 4, 12, 8, '#d0a890', 'Mess · rec', { size: 9 }); B(c + 52, 4, 10, 8, '#e0c8c8', 'Hospital', { size: 9 });
  B(c + 4, 14, 22, 12, '#6a6a76', 'TANK FACTORY\n(only tanks)', { size: 10 }); B(c + 28, 14, 20, 12, '#5a6a76', 'HELICOPTER WORKS\n(only helicopters)', { size: 9.5 }); B(c + 50, 14, 12, 12, '#8a8a70', 'Supply depot', { size: 9 });
  B(c + 4, 28, 26, 8, '#707a82', 'AIRCRAFT HANGARS\n(planes transferred from Aerospace)', { size: 9 }); B(c + 32, 28, 14, 8, '#8e8a82', 'Armoury ×2', { size: 9 }); B(c + 48, 28, 14, 8, '#7a8a6a', 'Training ground\n& range', { size: 9 }); rect(c + 3, 37, 40, 3, 'a'); L(c + 23, 38.5, 'apron / runway strip', { size: 9, color: '#fff' }); L(c + 32, SH - 1.2, 'STAGE 3 — a military company', { size: 12, color: '#ffe28a' });
  flush('THE MERCENARY HEADQUARTERS — three stages built by Mason\'s Os (a mock-up; the lot is its own region map)', 'Fence and gate protected before a coup (no hostile damage can destroy the core buildings). Only a tank factory and a helicopter works: planes, missiles, guns and ships come from your other companies.');
};

// ------------------------------------------------------------------ the national military base
SCENES.natbase = () => {
  setup(104, 68, 10, '.');
  rect(0, 0, 104, 68, '.'); rect(0, 0, 104, 68, ','); rect(3, 3, 98, 62, '.');
  rect(0, 62, 104, 6, '='); rect(46, 40, 8, 25, '='); rect(46, 40, 8, 8, '='); rect(6, 48, 92, 4, '=');
  rect(58, 4, 40, 6, 'a'); rect(58, 4, 5, 6, 'a'); // runway strip
  // wall
  [[3, 3, 98, 1], [3, 64, 98, 1], [3, 3, 1, 62], [100, 3, 1, 62]].forEach(([x, y, w, h]) => B(x, y, w, h, '#666b75', '', {}));
  B(43, 61, 14, 4, COL.sec, 'MAIN GATE', { size: 11 }); B(3, 30, 4, 8, COL.sec, 'west gate', { size: 8.5 }); B(97, 30, 4, 8, COL.sec, 'east gate', { size: 8.5 });
  B(40, 40, 20, 9, '#d9c27a', 'COMMAND HQ\nColonel ... (Sund Army)', { size: 11 }); B(8, 8, 16, 10, '#a0a890', 'Barracks 1', { size: 10 }); B(26, 8, 16, 10, '#a0a890', 'Barracks 2', { size: 10 }); B(8, 20, 16, 10, '#a0a890', 'Barracks 3', { size: 10 }); B(26, 20, 16, 10, '#a0a890', 'Mess hall', { size: 10 });
  B(8, 33, 14, 10, '#e0c8c8', 'Hospital', { size: 10 }); B(24, 33, 14, 10, '#8a8a70', 'Supply depot', { size: 10 }); B(10, 53, 26, 8, '#7a7a82', 'MOTOR POOL — armour & vehicles', { size: 10 }); B(64, 14, 30, 12, '#707a82', 'HANGARS (aircraft)', { size: 10 }); B(64, 28, 14, 10, '#8e8a82', 'Armoury', { size: 10 }); B(80, 28, 16, 10, '#7a8a6a', 'Parade ground', { size: 10 }); B(66, 53, 28, 8, '#7a8a6a', 'Training range & obstacle course', { size: 10 });
  [[50, 55, '#ff6a5a', 'guards'], [52, 44, '#ffd24a', 'commanding officer'], [15, 14, '#cfcfcf', 'soldiers (barracks 07:00)'], [32, 24, '#cfcfcf', 'mess 12:00'], [70, 20, '#7fe8ff', 'pilots'], [80, 55, '#cfcfcf', 'range 09:00–11:00']].forEach(([x, y, c, t]) => dot(x, y, c, t, 4.5));
  flush('FORT GULLCREST — the government\'s own base (mock-up; its own region map, reached by road from Lariat)', 'The government\'s soldiers, tanks and aircraft are separate from yours. They have patrols, guard posts and the same sleep, eat, train rhythm. Sizes shown in the plan are placeholders.');
};

// ------------------------------------------------------------------ the tactical battle (RTS) mock
SCENES.tactical = () => {
  setup(160, 90, 8, '.');
  rect(0, 0, 160, 90, '.'); rect(0, 0, 160, 90, ','); rect(0, 0, 160, 90, '.'); rect(20, 0, 14, 90, '~'); rect(20, 40, 14, 6, 'b'); rect(0, 40, 160, 6, '='); rect(70, 0, 5, 90, '='); rect(104, 14, 40, 18, 'g');
  SC.T.b = '#9a6b45'; rect(20, 40, 14, 6, 'b');
  const blds = [[40, 10, 12, 8], [56, 10, 10, 12], [40, 22, 10, 10], [80, 8, 12, 10], [96, 10, 6, 6], [80, 22, 12, 12], [108, 48, 14, 10], [126, 50, 10, 14], [80, 52, 10, 12], [96, 56, 10, 8], [40, 52, 12, 10], [56, 54, 10, 10], [108, 66, 14, 10], [126, 70, 12, 10]];
  blds.forEach(([x, y, w, h], i) => B(x, y, w, h, i === 6 ? '#c06050' : '#8a7e72', i === 6 ? 'Supply depot (can be destroyed)' : '', { size: 8.5, edge: '#3a3228' }));
  // woods
  [[2, 4], [2, 18], [6, 60], [4, 76], [140, 4], [146, 20], [150, 68]].forEach(([x, y]) => B(x, y, 12, 10, '#3f7a48', '', { edge: '#2a5a34' }));
  L(8, 10, 'forest\n(cover)', { size: 9 });
  flush('A TACTICAL BATTLE — "The Crossing at Halden Roads" (mock-up of the overhead command view)', 'Drawn from the game\'s own tile colours and the same people/vehicle sprites at a higher camera. Squad-level orders. Fog hides what your recon has not seen.');
  const g = SC.g, S = SC.S;
  // deployment zones and objectives
  g.setLineDash([8, 6]); g.strokeStyle = '#4ab4ff'; g.lineWidth = 3; g.strokeRect(2 * S, 60 * S, 40 * S, 18 * S); g.strokeStyle = '#ff6a5a'; g.strokeRect(112 * S, 2 * S, 44 * S, 14 * S); g.setLineDash([]);
  L(22, 61.5, 'YOUR DEPLOYMENT ZONE', { size: 11, color: '#9bd4ff' }); L(134, 9, 'enemy side (estimated)', { size: 11, color: '#ffb0a6' });
  // fog of war over the enemy half
  g.fillStyle = 'rgba(8,10,24,.42)'; g.fillRect(100 * S, 0, 60 * S, 40 * S);
  // units
  const sq = (x, y, c, label, n) => { g.fillStyle = c; g.strokeStyle = '#05040f'; g.lineWidth = 2; for (let k = 0; k < n; k++) { const dx = (k % 4) * 11 - 16, dy = Math.floor(k / 4) * 11 - 6; g.beginPath(); g.arc(x * S + dx * 1.5, y * S + dy * 1.5, 7, 0, 7); g.fill(); g.stroke(); } g.font = '700 11px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,15,.85)'; g.strokeText(label, x * S, y * S - 20); g.fillText(label, x * S, y * S - 20); };
  sq(11, 70, '#4ab4ff', 'Alpha Squad (8) rifles', 8); sq(24, 70, '#4ab4ff', 'Bravo (6) anti-tank', 6); sq(36, 72, '#86e0ff', 'Medics (3)', 3);
  // tanks
  const tank = (x, y, c, t) => { g.fillStyle = c; g.strokeStyle = '#05040f'; g.lineWidth = 2; g.fillRect(x * S - 17, y * S - 10, 34, 20); g.strokeRect(x * S - 17, y * S - 10, 34, 20); g.fillRect(x * S, y * S - 3, 30, 6); g.beginPath(); g.arc(x * S - 2, y * S, 7, 0, 7); g.fillStyle = '#86e0ff'; g.fill(); g.stroke(); g.font = '700 10.5px system-ui'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.strokeStyle = 'rgba(5,4,15,.85)'; g.lineWidth = 3; g.strokeText(t, x * S, y * S - 18); g.fillText(t, x * S, y * S - 18); };
  tank(48, 54, '#4ab4ff', 'Tank "Anvil" (hull 82%)'); tank(58, 60, '#4ab4ff', 'Tank "Ledger" (hull 100%)');
  // ordered movement arrows
  g.strokeStyle = '#4ab4ff'; g.lineWidth = 3; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(26 * S, 60 * S); g.lineTo(26 * S, 46 * S); g.lineTo(60 * S, 46 * S); g.lineTo(74 * S, 40 * S); g.stroke(); g.setLineDash([]); g.fillStyle = '#4ab4ff'; g.beginPath(); g.moveTo(74 * S, 40 * S); g.lineTo(66 * S, 36 * S); g.lineTo(66 * S, 44 * S); g.fill();
  // enemy contacts
  [[116, 34], [124, 36], [132, 28], [128, 32], [120, 30]].forEach(([x, y]) => { g.fillStyle = '#ff6a5a'; g.strokeStyle = '#2a0500'; g.lineWidth = 2; g.beginPath(); g.arc(x * S, y * S, 7, 0, 7); g.fill(); g.stroke(); });
  g.font = '700 11px system-ui'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,15,.85)'; g.fillStyle = '#ffd0c8'; g.strokeText('contact: ~12 infantry?', 124 * S, 29 * S); g.fillText('contact: ~12 infantry?', 124 * S, 29 * S);
  // objectives
  const flagAt = (x, y, c, t) => { g.fillStyle = c; g.fillRect(x * S, y * S - 24, 3, 28); g.fillRect(x * S + 3, y * S - 24, 18, 11); g.font = '800 11px system-ui'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(5,4,15,.85)'; g.lineWidth = 3; g.strokeText(t, x * S + 25, y * S - 14); g.fillText(t, x * S + 25, y * S - 14); };
  flagAt(72, 44, '#ffd24a', 'OBJECTIVE: hold the crossing'); flagAt(110, 40, '#ff6a5a', 'Enemy depot');
  // missile strike marker
  g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.beginPath(); g.arc(115 * S, 53 * S, 26, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,210,74,.18)'; g.fill(); g.fillStyle = '#ffe28a'; g.font = '700 11px system-ui'; g.textAlign = 'center'; g.fillText('Longbow strike called (2 left)', 115 * S, 53 * S + 40);
  // HUD
  g.fillStyle = 'rgba(8,6,20,.94)'; g.fillRect(0, 640, 1280, 80); g.strokeStyle = '#4a47b0'; g.lineWidth = 2; g.strokeRect(1, 641, 1278, 78);
  const card = (x, t, s, c) => { g.fillStyle = '#23205a'; g.fillRect(x, 650, 150, 60); g.strokeStyle = c; g.strokeRect(x, 650, 150, 60); g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.textAlign = 'left'; g.fillText(t, x + 8, 668); g.fillStyle = '#a09ec9'; g.font = '600 11px system-ui'; g.fillText(s, x + 8, 688); g.fillStyle = c; g.fillRect(x + 8, 696, 134 * 0.8, 6); };
  card(14, 'Alpha Squad', '8/8 · morale high', '#5fe08a'); card(172, 'Bravo (AT)', '6/6 · 3 rockets', '#5fe08a'); card(330, 'Medics', '3/3 · fatigue 20%', '#f2c14e'); card(488, 'Anvil', 'hull 82% · 6 shells', '#f2c14e'); card(646, 'Ledger', 'hull 100% · 8 shells', '#5fe08a');
  ['Move', 'Hold', 'Attack', 'Flank', 'Suppress', 'Withdraw'].forEach((t, n) => { g.fillStyle = n === 2 ? '#f2c14e' : '#2d2a70'; g.fillRect(820 + n * 74, 655, 68, 50); g.fillStyle = n === 2 ? '#2a1a00' : '#fff'; g.font = '700 12px system-ui'; g.textAlign = 'center'; g.fillText(t, 854 + n * 74, 685); });
  g.fillStyle = 'rgba(8,6,20,.9)'; g.fillRect(900, 10, 360, 70); g.fillStyle = '#ffe28a'; g.font = '800 13px system-ui'; g.textAlign = 'left'; g.fillText('OBJECTIVES', 912, 28); g.fillStyle = '#fff'; g.font = '600 12px system-ui'; g.fillText('☐ Hold the crossing for 10 min (4:12 left)', 912, 48); g.fillText('☐ Destroy the enemy depot  ·  Support: 1 aircraft, 2 missiles', 912, 66);
};
return SCENES;
})();
