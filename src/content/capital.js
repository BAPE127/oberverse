// The people of the capital (v0.94.0): the eleven ambassadors, both parties' ten staff, the government's household and the six ministers —
// 43 people, each a persistent minor character with a home, a bed, a schedule, a dialogue and a job that follows from the political record.
// They are generated from this one table (stable ids; nothing here is random): appearances and voices are picked by hashing the id.
//
// Where they live: Staff Flats A and B, the Civil Service Residences and the new Diplomatic Residences (src/content/homes.js, `CAPITAL_HOMES`).
// Where they work: the embassies, the party headquarters, Halver House and the ministries (rooms generated on their footprints; the doors
// let the staff in at any hour, and the public in opening hours where the building is open to it).
// The two leaders (src/content/characters/politics.js) live here too, in Staff Flats A, until their own residences are built.

/** A stable pick from a list by the id (no randomness). */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, id, salt = '') => arr[hash(id + salt) % arr.length];

const BLDG = { staff_a: 'cq_staff_a', staff_b: 'cq_staff_b', civil: 'cq_civil_service', diplo: 'cq_diplomatic' };

/** Roles: kind, what they do, their occupation, where they work (a building id), their hours. */
// [id, name, shortName, role, kind, work building, group, home key, line]
const P = (id, name, role, kind, work, home, line, o = {}) => ({ id, name, shortName: o.short || name.split(' ').slice(-1)[0], role, kind, work, home, line, ...o });

export const AMBASSADORS = [
  P('npc_amb_ostmark', 'Konrad Falkenstein', 'Ambassador of the Ostmark Union. Seven provinces, one signature: his.', 'ambassador', 'cq_embassy_ostmark', 'diplo', 'Ostmark has seven provinces and one opinion, which is whichever the Chancellor had at breakfast. I am here to be polite about it.', { country: 'ostmark', short: 'Falkenstein' }),
  P('npc_amb_varn', 'Dovran Kestrel', 'Ambassador of Varnistan. About to hold elections for nineteen years.', 'ambassador', 'cq_embassy_varn', 'diplo', 'Varnistan will hold its elections very soon. I say this with great confidence, because I have said it for nineteen years.', { country: 'varn', short: 'Kestrel' }),
  P('npc_amb_teshvar', 'Amir Khoral', 'Ambassador of Teshvar. Speaks softly; his government\'s oil does the shouting.', 'ambassador', 'cq_embassy_teshvar', 'diplo', 'Teshvar sells what the world burns. We are very patient people: the world will always be cold in the evenings.', { country: 'teshvar', short: 'Khoral' }),
  P('npc_amb_caldera', 'Lucía Corvane', 'Ambassador of Caldera. Her government changes with the ash; she does not.', 'ambassador', 'cq_embassy_caldera', 'diplo', 'My president has changed four times since I took this post. The ambassador, you will notice, has not. That is called diplomacy, or luck.', { country: 'caldera', short: 'Corvane' }),
  P('npc_amb_pallas', 'Nikos Thessal', 'Ambassador of the Free State of Pallas, under embargo and very cheerful about it.', 'ambassador', 'cq_embassy_pallas', 'diplo', 'Free, as the name says. Embargoed, as the newspapers say. Between the two, we trade. Quietly. Please do not tell the Ostmarkers.', { country: 'pallas', short: 'Thessal' }),
  P('npc_amb_morrow', 'Marina Kauri', 'Ambassador of the Morrow Isles, speaking for two hundred islands and, she says, about forty of them.', 'ambassador', 'cq_embassy_morrow', 'diplo', 'Two hundred islands, two hundred navies, one ambassador. I represent the ones that remembered to send me instructions.', { country: 'morrow', short: 'Kauri' }),
  P('npc_amb_lirre', 'Étienne Valmont', 'Ambassador of the Grand Duchy of Lirre. Neutral, vigorously.', 'ambassador', 'cq_embassy_lirre', 'diplo', 'Lirre is neutral. We are neutral the way other nations are armed. Do sit down. Everyone does. It is part of the policy.', { country: 'lirre', short: 'Valmont' }),
  P('npc_amb_westreach', 'Dorrie Brass', 'Ambassador of the Westreach League, whose ports each keep their own prices.', 'ambassador', 'cq_embassy_westreach', 'diplo', 'The League is a handful of free ports with one flag between them and nine harbour masters. Ask me the price of anything: it depends which port.', { country: 'westreach', short: 'Brass' }),
  P('npc_amb_sunmouth', 'Cassius Zenith', 'Ambassador of the Sunmouth Isthmus Compact. The canal is almost finished.', 'ambassador', 'cq_embassy_sunmouth', 'diplo', 'The canal will be finished next year. I have been told next year for eleven years, so I am confident in the schedule.', { country: 'sunmouth', short: 'Zenith' }),
  P('npc_amb_dunmere', 'Piers Midpoint', 'Ambassador of the Free Harbour of Dunmere. Everybody passes through; he stays.', 'ambassador', 'cq_embassy_dunmere', 'diplo', 'Dunmere is where the continents meet. Nobody admits to staying. I stay. That is the whole of my embassy, and a sandwich.', { country: 'dunmere', short: 'Midpoint' }),
  P('npc_envoy_free', 'Hester Greyfen', 'Envoy of the Free Ports Mission: the free territories\' one office, no flag.', 'ambassador', 'cq_free_ports', 'staff_b', 'I speak for every free territory that is not a country. That is a great many people, and not one of them has asked me to. It is freeing.', { country: 'free', short: 'Greyfen' }),
];

const ROLES = {
  chief_of_staff: 'Chief of staff', campaign_manager: 'Campaign manager', policy_adviser: 'Policy adviser', communications: 'Communications director', press_secretary: 'Press secretary',
  fundraising: 'Fundraising director', polling: 'Polling and research adviser', legal: 'Legal adviser', security: 'Security coordinator', organiser: 'Political organiser',
};
/** What each role says about the job (the party's name is added). */
const ROLE_LINE = {
  chief_of_staff: 'I keep the diary, the temper and the door. In that order of difficulty.', campaign_manager: 'A campaign is arithmetic with feelings. I do the arithmetic.',
  policy_adviser: 'A policy is a promise with a cost. My job is to find the cost before the voters do.', communications: 'I decide what the leader said. Then I tell the leader.',
  press_secretary: 'I am paid to say "no comment" in forty-one different ways.', fundraising: 'Donations are capped, public and recorded. I mention this so often it has become a lullaby.',
  polling: 'A poll is a photograph with an error bar. I am the one who reads the error bar out loud.', legal: 'Everything we do is legal. I know, because I check, and then I check again.',
  security: 'Nothing has happened to the leader. That is my entire achievement, and I would like it noted.', organiser: 'Someone has to put the chairs out. For nineteen years, that has been me.',
};
const STAFF = {
  order: [['chief_of_staff', 'Marcus Steele'], ['campaign_manager', 'Dolores Hartwell'], ['policy_adviser', 'Edmund Pike'], ['communications', 'Vivian Crane'], ['press_secretary', 'Barnaby Flint'],
    ['fundraising', 'Reginald Gold'], ['polling', 'Ada Quill'], ['legal', 'Judith Mallory'], ['security', 'Roth Kessler'], ['organiser', 'Tobias Weld']],
  liberty: [['chief_of_staff', 'Imelda Frost'], ['campaign_manager', 'Theo Marsh'], ['policy_adviser', 'Lena Orchard'], ['communications', 'Felix Bright'], ['press_secretary', 'Nell Parry'],
    ['fundraising', 'Gus Penhallow'], ['polling', 'Priya Sondergaard'], ['legal', 'Solomon Wray'], ['security', 'Maeve Dunlop'], ['organiser', 'Ozzie Fairweather']],
};
const PARTY_VIEW = {
  order: 'Order is not a slogan, it is a method: laws that are kept, streets that are safe, a state that arrives when it is called.',
  liberty: 'Liberty is not the absence of rules, it is knowing whose rules they are. We would like the state to ask permission more often.',
};
export const PARTY_STAFF = Object.entries(STAFF).flatMap(([party, rows]) => rows.map(([role, name], i) => P(`npc_${party === 'order' ? 'ord' : 'lib'}_${role}`, name,
  `${ROLES[role]} of ${party === 'order' ? 'the Order Party' : 'the Liberty League'}.`, 'party', party === 'order' ? 'cq_order_hq' : 'cq_liberty_hq', 'civil', `${ROLE_LINE[role]} ${PARTY_VIEW[party]}`, { party, partyRole: role, pair: Math.floor(i / 2) })));

/** Party → role → person (the party's staff records are filled from this). */
export const STAFF_BY_PARTY = PARTY_STAFF.reduce((o, p) => { (o[p.party] ||= {})[p.partyRole] = p.id; return o; }, {});

export const HOUSEHOLD = [
  P('npc_hh_chief', 'Alistair Penn', 'Chief of Staff to the President. Runs Halver House; the President, he says, runs the country, "in a general way".', 'house', 'halver_chief', 'staff_a', 'The President decides. I make sure the President has something to decide. It is a more honest way of running a country than most.', { short: 'Penn', room: 'halver_chief' }),
  P('npc_hh_reception', 'Rosamund Vale', 'Receptionist at Halver House. Knows everyone\'s name, and the name of everyone they would rather not meet.', 'house', 'halver_house', 'staff_a', 'The visitors\' book is on the desk. Sign it, please, in your own hand. We do check. Gently.', { short: 'Vale', spot: 'halver_house:reception' }),
  P('npc_hh_press', 'Quentin Aird', 'Press Secretary to the President. Briefs at noon on Thorndays.', 'house', 'halver_press', 'staff_a', 'I brief at noon. Questions are welcome; answers are scheduled. If you have a quarrel with the President, I am the polite end of it.', { short: 'Aird', room: 'halver_press' }),
  P('npc_hh_guard1', 'Hobb Tamsin', 'Sergeant of the Guard at Halver House. Checks bags, hats and intentions.', 'house', 'halver_house', 'staff_a', 'Bags on the table, please. It is not that I suspect you. It is that I am paid to look as if I might.', { short: 'Tamsin', spot: 'halver_house:screening', armed: true }),
  P('npc_hh_guard2', 'Fenwick Rudge', 'Guard at Halver House. Silent, large and very fond of the pigeon on the barrier.', 'house', 'halver_house', 'staff_b', '...Mm. The pigeon is named Admiral. Do not tell the Sergeant.', { short: 'Rudge', spot: 'halver_house:screening', armed: true }),
  P('npc_hh_records', 'Ursula Page', 'Records clerk of the Public Records Hall. Everything is in here somewhere.', 'house', 'halver_records', 'staff_b', 'Laws, budgets and the poll archive, by year. Ask. It is in here somewhere, and I know approximately where.', { short: 'Page', room: 'halver_records' }),
];

export const MINISTERS = [
  P('npc_min_treasury', 'Ophelia Strand', 'Minister of the Treasury. Balances the budget on paper and, mostly, in fact.', 'minister', 'cq_min_treasury', 'staff_a', 'The budget balances. It balances because I have asked it to nicely, twice a year, and stood over it.', { short: 'Strand', ministry: 'treasury' }),
  P('npc_min_defence', 'General Ambrose Kell', 'Minister of Defence & Security. A general with a gentle voice and no illusions.', 'minister', 'cq_min_defence', 'staff_b', 'A country cannot choose its neighbours. It can only choose how loudly to keep its own door. I would prefer to keep it quietly.', { short: 'Kell', ministry: 'defence' }),
  P('npc_min_interior', 'Hector Lyle', 'Minister of the Interior & Police. Believes in the police as other men believe in the weather: with respect.', 'minister', 'cq_min_interior', 'civil', 'The Chief of Police is a loyal servant and a collector of mugs. I have decided to find that reassuring.', { short: 'Lyle', ministry: 'interior' }),
  P('npc_min_agriculture', 'Marigold Tench', 'Minister of Agriculture & Trade. Farmer\'s daughter; has never once been fooled by a cow.', 'minister', 'cq_min_agriculture', 'civil', 'Farms are inspected twice a year and loved all year. I am the only minister who has been bitten by her own department.', { short: 'Tench', ministry: 'agriculture' }),
  P('npc_min_foreign', 'Percival Lorne', 'Minister of Foreign Affairs. Eleven countries, and a view on each that he will share with nobody.', 'minister', 'cq_min_foreign', 'diplo', 'Eleven embassies, one Free Ports Mission, and a dossier on each that I would be delighted to discuss, but will not.', { short: 'Lorne', ministry: 'foreign' }),
  P('npc_min_records', 'Cornelius Ink', 'Minister of Public Records. Believes a thing that is not written down did not happen, and vice versa.', 'minister', 'cq_min_records', 'diplo', 'Whatever happened, it is in the Records. If it is not in the Records, it is about to be, and you will want to check the spelling.', { short: 'Ink', ministry: 'records' }),
];

export const CAPITAL_PEOPLE = [...AMBASSADORS, ...PARTY_STAFF, ...HOUSEHOLD, ...MINISTERS];
export const CAPITAL_HOME_BUILDINGS = BLDG;

// ------------------------------------------------------------------ appearance, schedule, dialogue
const SKIN = ['#f0d0b0', '#e0b898', '#d8b090', '#c89a78', '#b88868', '#a07050', '#8a5e44'];
const HAIR = ['#1e1a16', '#2a2622', '#4a3626', '#6a3a24', '#8a6a3a', '#c8c4bc', '#a8a49c', '#d8b870'];
const OUTFIT = { ambassador: ['#2a3a5a', '#3a2a4a', '#4a3a2a', '#2a4a3a', '#5a2a34', '#2a2a3a'], party: ['#2a3a5a', '#4a2a34', '#2a4a4a', '#5a4a2a', '#3a3a4a'], house: ['#2a2e36', '#2a3040', '#3a3a3a'], minister: ['#1e2a3a', '#2a2a2a', '#3a2a3a', '#2a3a2a'] };
const STYLE = ['short', 'parted', 'bun', 'curly', 'ponytail', 'long', 'messy'];

function appearanceOf(p) {
  const female = ['Lucía', 'Marina', 'Dorrie', 'Hester', 'Dolores', 'Vivian', 'Ada', 'Judith', 'Imelda', 'Lena', 'Nell', 'Priya', 'Maeve', 'Rosamund', 'Ursula', 'Ophelia', 'Marigold'].some((n) => p.name.startsWith(n));
  const outfit = pick(OUTFIT[p.kind], p.id, 'o');
  const base = { skin: pick(SKIN, p.id, 's'), hair: pick(HAIR, p.id, 'h'), hairStyle: female ? pick(['bun', 'long', 'ponytail', 'curly', 'parted'], p.id, 'st') : pick(['short', 'parted', 'messy', 'curly'], p.id, 'st'), outfit, undershirt: '#f4f2ee',
    tie: female && p.kind !== 'house' ? null : pick(['#7a2a34', '#2a4a7a', '#4a6a2a', '#8a6a2a', '#3a3a5a'], p.id, 't'), legs: '#1e2230', shoes: '#141418', accessories: [], accent: p.party === 'order' ? '#b8962e' : p.party === 'liberty' ? '#e8b040' : '#c9a24a',
    build: pick(['average', 'thin', 'broad', 'round', 'wiry'], p.id, 'b'), height: 0.96 + (hash(p.id + 'ht') % 12) / 100 };
  if (p.armed) base.build = 'broad';
  if (p.kind === 'ambassador') base.accessories = [pick(['lapelpin', 'watchchain', 'scarf', 'monocle'], p.id, 'a')];
  return base;
}

/** The workplace spot and the hours of a person's day. `where` is a spot string for the person's work. */
function scheduleOf(p, homeMap) {
  const work = p.spot || (p.room ? `${p.room}:entry` : `crown_quarter__${p.work}:desk`);
  const sleep = `${homeMap}:bed`;
  const chair = `${homeMap}:chair`;
  const late = hash(p.id) % 3; // a little variety: some start at eight, some at nine, some at half past
  const start = ['08:00', '08:30', '09:00'][late];
  return [
    { from: '23:00', to: '06:30', activity: 'sleep', spot: sleep },
    { from: '06:30', to: start, activity: 'eat', spot: chair, label: 'breakfast and the papers' },
    { from: start, to: '12:30', activity: 'work', spot: work, label: p.kind === 'ambassador' ? 'at the embassy' : p.kind === 'party' ? 'at party headquarters' : p.kind === 'minister' ? 'at the ministry' : 'at Halver House' },
    { from: '12:30', to: '13:30', activity: 'eat', spot: 'crown_quarter:square_fountain', label: 'lunch by the fountain' },
    { from: '13:30', to: '17:30', activity: 'work', spot: work, label: p.kind === 'ambassador' ? 'at the embassy' : p.kind === 'party' ? 'at party headquarters' : p.kind === 'minister' ? 'at the ministry' : 'at Halver House' },
    { from: '17:30', to: '19:30', activity: 'leisure', spot: pick(['crown_quarter:park_bench', 'crown_quarter:embassy_row', 'crown_quarter:press_line'], p.id, 'l'), label: 'a walk and a word with whoever is about' },
    { from: '19:30', to: '23:00', activity: 'relax', spot: chair, label: 'at home' },
  ];
}

const FLAT_NAME = { diplo: 'Diplomatic Residences', staff_a: 'Staff Flats A', staff_b: 'Staff Flats B', civil: 'Civil Service Residences' };

const BEDS = ['#5a6a8a', '#8a4a4a', '#4a7a5a', '#7a6a3a', '#5a4a7a', '#3a6a7a', '#8a5a3a', '#6a6a6a'];
const RUGS = ['#c9a24a', '#7a2a34', '#2a6a4a', '#5a5a7a', '#8a6a4a', '#2a4a6a'];
const flat = (key, who, name, o = {}) => ({ who, name, bed: o.bed || pick(BEDS, who[0], 'bed'), rug: o.rug || pick(RUGS, who[0], 'rug'), loot: o.loot || { items: { item_pocket_watch: 1 }, money: 20 + (hash(who[0] + 'm') % 60) },
  props: o.props || [{ type: 'shelf', x: 1, y: 4, examine: 'Briefing papers, a kettle and a framed photograph of someone who is not in the room.' }, { type: 'plant', x: 7, y: 4 }] });

/** Every flat of the capital's homes, built from who lives where: ambassadors one to a flat; colleagues of a party, the household and the ministers two to a flat; the two leaders a flat each. */
export function capitalFlats() {
  const out = { diplo: [], staff_a: [], staff_b: [], civil: [] };
  const add = (key, who, name, o) => out[key].push(flat(key, who, name, o));
  for (const p of AMBASSADORS) add(p.home, [p.id], p.name);
  for (const party of ['order', 'liberty']) {
    const rows = PARTY_STAFF.filter((p) => p.party === party);
    for (let i = 0; i < rows.length; i += 2) add('civil', rows.slice(i, i + 2).map((p) => p.id), rows.slice(i, i + 2).map((p) => p.name).join(' & '));
  }
  for (const key of ['staff_a', 'staff_b', 'civil', 'diplo']) {
    const list = [...HOUSEHOLD, ...MINISTERS].filter((p) => p.home === key);
    for (let i = 0; i < list.length; i += 2) { const c = list.slice(i, i + 2); add(key, c.map((p) => p.id), c.map((p) => p.name).join(' & ')); }
  }
  // the two leaders, until their own residences are built (v0.94.0 moved them here from Crown Court so they live where they work)
  add('staff_b', ['npc_vegas'], 'Josiah Vegas', { bed: '#1e2a44', rug: '#8a1a24', loot: { items: { item_gold_watch: 1, item_cigar: 2 }, money: 120 }, props: [
    { type: 'desk', x: 1, y: 4, w: 2, examine: 'Speeches in three drafts, each marked in red: "TOO KIND", "TOO LONG", "JUST RIGHT (SAY IT TWICE)".' },
    { type: 'painting', x: 3, y: 0, w: 2, examine: 'A framed election poster: a stern face, a clenched jaw and the single word ORDER. Underneath, in pencil, someone has written "bless you".' }] });
  add('staff_a', ['npc_susan'], 'Susan', { bed: '#2a6a5a', rug: '#e8b040', loot: { items: { item_gold_ring: 1, item_pocket_watch: 1 }, money: 90 }, props: [
    { type: 'desk', x: 1, y: 4, w: 2, examine: 'Three speeches, all headed "FINAL". A mug that says WORLD\'S MOST OVERCOMMITTED. A bus ticket to somewhere she has not had time to visit.' },
    { type: 'shelf', x: 7, y: 4, examine: 'Books on constitutions, two on gardening, and a very worn paperback with the cover torn off. It is, she says, "research".' }] });
  return out;
}

/** Where each person sleeps: id → 'res_<building>/flat_N' (the residence ids follow src/content/homes.js: res_<home id>). */
export function capitalLife() {
  const flats = capitalFlats();
  const life = {};
  for (const [key, list] of Object.entries(flats)) list.forEach((f, i) => { for (const id of f.who) life[id] = { home: `res_${BLDG[key]}/flat_${i + 1}`, occupation: 'official' }; });
  delete life.npc_vegas.occupation; delete life.npc_susan.occupation; // (the leaders' LIFE entries are in life.js)
  return life;
}

const local = (o) => ({ tier: 'minor', origin: 'generated', faction: null, walkSpeed: 1, punctuality: 2, impulses: [], notices: [], reactions: {}, knowledge: [], noSnitch: false, ...o });

/** The character records. */
export function capitalCharacters() {
  const life = capitalLife();
  return CAPITAL_PEOPLE.map((p) => {
    const homeMap = `${life[p.id].home.replace('res_', '').replace('/flat_', '_')}`;
    return local({
      id: p.id, name: p.name, shortName: p.shortName, combat: p.armed ? { maxHealth: 110, weapon: 'item_baton' } : { never: true, maxHealth: 80 }, role: p.role, dialogue: `dlg_${p.id.slice(4)}`,
      voice: { wave: pick(['sine', 'triangle', 'sawtooth'], p.id, 'v'), pitch: 90 + (hash(p.id + 'p') % 110), variance: 6 + (hash(p.id + 'q') % 10), rate: 0.85 + (hash(p.id + 'r') % 15) / 100 },
      appearance: appearanceOf(p),
      personality: { traits: [pick(['careful', 'dry', 'warm', 'brisk', 'patient', 'wry'], p.id, 'tr1'), pick(['discreet', 'tireless', 'gossipy', 'exact', 'diplomatic'], p.id, 'tr2')], sociability: 0.4 + (hash(p.id + 'so') % 50) / 100, conscientiousness: 0.6 + (hash(p.id + 'co') % 40) / 100, impulsiveness: 0.1 + (hash(p.id + 'im') % 25) / 100, discretion: 0.5 + (hash(p.id + 'di') % 45) / 100, honesty: 0.5 + (hash(p.id + 'ho') % 45) / 100, empathy: 0.4 + (hash(p.id + 'em') % 50) / 100, confidence: 0.5 + (hash(p.id + 'cf') % 45) / 100, humor: 0.2 + (hash(p.id + 'hu') % 60) / 100 },
      speech: { rumorPrefix: 'Between ourselves,', factPrefix: 'For the record,', refuse: 'I could not possibly say.' },
      schedule: scheduleOf(p, homeMap),
      relationships: { player: { trust: 0, affection: 0, respect: 0, suspicion: 5 } },
      giftPrefs: { item_coffee: 4 + (hash(p.id + 'g') % 6), tags: { food: 2 } },
      opinions: {},
    });
  });
}

/** The dialogue records: a greeting, what they do, what they think of the two parties, and where the Politics page is. */
export function capitalDialogues() {
  const open = (tab) => ({ panel: { name: 'tablet', opts: { tab } } });
  return CAPITAL_PEOPLE.map((p) => {
    const kindIntro = { ambassador: `${p.name}, ${p.role.split('.')[0]}.`, party: `${p.name}. ${p.role.split('.')[0]}.`, house: `${p.name}. ${p.role.split('.')[0]}.`, minister: `${p.name}. ${p.role.split('.')[0]}.` }[p.kind];
    return {
      id: `dlg_${p.id.slice(4)}`,
      greetings: [
        { if: { activity: 'sleep' }, say: ['*asleep, a briefing folder open on the blanket*'] },
        { if: { firstMeeting: true }, say: [kindIntro, 'Do come in. Most people do not, so it is a pleasant change.'] },
        { if: { rel: { affection: '>=30' } }, variants: [['Ah, a friendly face. Sit down. The kettle is on, which is the most political thing I do.']] },
        { if: {}, variants: [['Good day.'], ['Yes? One moment.'], ['Welcome. Mind the carpet; it has opinions.']] },
      ],
      farewells: [{ if: {}, variants: [['Good day.'], ['Do come again. Everyone does, eventually.']] }],
      topics: [
        { id: `t_${p.id.slice(4)}_job`, label: '"What do you do?"', keywords: ['do', 'job', 'work', 'role', 'what'], say: [p.line] },
        { id: `t_${p.id.slice(4)}_gov`, label: '"Who governs Sund?"', keywords: ['government', 'president', 'governs', 'sund', 'politics'], say: ['Look at the Politics page on your tablet: who governs, the term, the date of the vote, and where the parties differ. I would only add colour, and colour is cheap.'], effects: [open('Politics')] },
        { id: `t_${p.id.slice(4)}_leaders`, label: '"What do you make of Vegas and Susan?"', keywords: ['vegas', 'susan', 'josiah', 'leader', 'leaders', 'party', 'parties'], say: [p.party === 'order' ? 'Josiah is the most serious man in Sund. Susan is the cleverest person he has ever disliked. I say this with the greatest respect for both.' : p.party === 'liberty' ? 'Susan is the best reason to vote I know. Josiah is the best reason not to leave it to chance. We say that to each other, over the wall.' : 'Both are very good at what they do. I have found it unwise to say which of them is more so, in a building where either might be President.'] },
      ],
      askPrompt: [['Ask what you like. I will tell you what I can.']],
      unknown: [['That is not my department.'], ['I could not possibly say, and I will not say it twice.']],
      gift: { loved: [['Coffee. You understand me.']], liked: [['Thank you. Noted.']], neutral: [['Thank you.']], disliked: [['I will find it a home.']], tooMany: [['That is plenty.']], ownStolen: [['That is mine.']] },
      barks: { greet: ['Good day.'], work: ['Mm.', 'Noted.'], chat: ['Quite.'], argue: ['That is not what the minutes say.'], sleep: ['zzz'], moods: {} },
    };
  });
}

/** Who may walk through a building's door at any hour (its own people). */
export const OWNERS = (() => {
  const o = {};
  for (const p of CAPITAL_PEOPLE) { if (p.kind === 'house') continue; (o[p.work] ||= []).push(p.id); }
  o.cq_order_hq = [...(o.cq_order_hq || []), 'npc_vegas'];
  o.cq_liberty_hq = [...(o.cq_liberty_hq || []), 'npc_susan'];
  return o;
})();
/** Halver House's own people and the two leaders (whichever is President works there): they may use every door of the House. */
export const HOUSE_OWNERS = [...HOUSEHOLD.map((p) => p.id), 'npc_vegas', 'npc_susan'];
