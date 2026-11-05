// Fort Gullcrest's garrison (v0.98.0): the government's own people, a small standing detachment that makes the base live (guards at the gate, a patrol, the commanding officer's
// staff). They are NPCs with a bed, a duty and a day, in the fort's own barracks. They belong to the national military (`world.military.gov`), never to your company; the fort's
// full garrison, tanks and aircraft come with the later releases. Pure data and small generators, in the pattern of src/content/estates.js.
import { personRecord } from './capital.js';

const P = (id, name, role, job, line, o = {}) => ({ id, name, shortName: name.split(' ').slice(-1)[0], role, kind: 'soldier', job, line, armed: o.armed ?? true, ...o });

export const FORT_PEOPLE = [
  P('npc_fg_colonel', 'Colonel Marta Brandt', 'Commanding officer of Fort Gullcrest, Sund Army. Runs the base, the garrison and, by her own account, the weather.', 'command', 'The fort is the Crown\'s and the Army\'s. If you have business here, you have business with me, and I have very little time for either.', { armed: false }),
  P('npc_fg_sergeant', 'Sergeant Major Oskar Venn', 'Sergeant major, Fort Gullcrest. The garrison fears him and would die for him, in no particular order.', 'barracks', 'Boots, belts, bunks. If it is not one of those it is somebody else\'s problem, and probably the Colonel\'s.'),
  P('npc_fg_gate_a', 'Private Hanna Ledger', 'Gate guard at Fort Gullcrest, the day watch. Has memorised every vehicle that has used the road since spring.', 'gate', 'State your business at the gate. Then state it again, slower. It is nothing personal.'),
  P('npc_fg_gate_b', 'Corporal Tobias Rook', 'Gate guard at Fort Gullcrest, the night watch. Fond of tea, lists and not being surprised.', 'gate_night', 'Gate\'s closed to anyone I do not know. I know eleven people. Make it twelve, in daylight.'),
  P('npc_fg_patrol_a', 'Private Ines Calloway', 'Soldier of the garrison, walking the fort\'s perimeter. Counts her steps; they have never once come out the same.', 'patrol', 'Perimeter patrol. Walk with me and you are a visitor. Walk ahead of me and you are an incident.'),
  P('npc_fg_patrol_b', 'Private Dov Marchetti', 'Soldier of the garrison on the second beat. Hums, always the same tune, always flat.', 'patrol', 'Beat two. Nothing to report, which is what I report, loudly, every hour.'),
];

export const FORT_OWNERS = FORT_PEOPLE.map((p) => p.id);

const SPOTS = {
  command: { work: 'fort_gullcrest:command_out', label: 'at the command post' },
  barracks: { work: 'fort_gullcrest:parade', label: 'drilling the garrison' },
  gate: { work: 'fort_gullcrest:gate_post', label: 'on the gate' },
  gate_night: { work: 'fort_gullcrest:gate_post', label: 'on the gate' },
};

function scheduleOf(p, home) {
  const S = SPOTS[p.job];
  if (p.job === 'patrol') {
    return [
      { from: '22:00', to: '06:00', activity: 'sleep', spot: `${home}:bed` },
      { from: '06:00', to: '07:00', activity: 'eat', spot: `${home}:chair`, label: 'breakfast' },
      { from: '07:00', to: '12:00', activity: 'patrol', patrol: 'beat_fort', label: 'walking the perimeter' },
      { from: '12:00', to: '13:00', activity: 'eat', spot: `${home}:chair`, label: 'lunch in the barracks' },
      { from: '13:00', to: '19:00', activity: 'patrol', patrol: 'beat_fort', label: 'walking the perimeter' },
      { from: '19:00', to: '22:00', activity: 'relax', spot: `${home}:chair`, label: 'off duty' },
    ];
  }
  const night = p.job === 'gate_night';
  const day = night ? [
    { from: '06:00', to: '08:00', activity: 'eat', spot: `${home}:chair`, label: 'breakfast after the watch' },
    { from: '08:00', to: '16:00', activity: 'sleep', spot: `${home}:bed` },
    { from: '16:00', to: '19:00', activity: 'relax', spot: `${home}:chair`, label: 'off duty' },
    { from: '19:00', to: '20:00', activity: 'eat', spot: `${home}:chair`, label: 'supper' },
    { from: '20:00', to: '24:00', activity: 'work', spot: S.work, label: S.label },
    { from: '00:00', to: '06:00', activity: 'work', spot: S.work, label: S.label },
  ] : [
    { from: '22:00', to: '06:00', activity: 'sleep', spot: `${home}:bed` },
    { from: '06:00', to: '07:00', activity: 'eat', spot: `${home}:chair`, label: 'breakfast' },
    { from: '07:00', to: '12:00', activity: 'work', spot: S.work, label: S.label },
    { from: '12:00', to: '13:00', activity: 'eat', spot: `${home}:chair`, label: 'lunch' },
    { from: '13:00', to: '19:00', activity: 'work', spot: S.work, label: S.label },
    { from: '19:00', to: '22:00', activity: 'relax', spot: `${home}:chair`, label: 'off duty' },
  ];
  return day;
}

/** The fort's barracks block: a flat each. */
export function fortFlats() {
  return FORT_PEOPLE.map((p, i) => ({ who: [p.id], name: p.name, bed: ['#4a5a3a', '#5a5a4a', '#3a4a5a'][i % 3], rug: ['#6a6a4a', '#5a6a5a', '#4a5a6a'][i % 3], loot: { items: { item_pocket_watch: 1 }, money: 5 + i },
    props: [{ type: 'shelf', x: 1, y: 4, examine: 'A kettle, a tin of boot polish and a photograph of someone back home who is not impressed.' }, { type: 'plant', x: 7, y: 4 }] }));
}
export const fortLife = () => Object.fromEntries(FORT_PEOPLE.map((p, i) => [p.id, { home: `res_fort_barracks/flat_${i + 1}`, occupation: 'soldier' }]));

export function fortCharacters() {
  const life = fortLife();
  return FORT_PEOPLE.map((p) => personRecord(p, scheduleOf(p, life[p.id].home.replace('res_', '').replace('/flat_', '_'))));
}

export function fortDialogues() {
  return FORT_PEOPLE.map((p) => {
    const k = p.id.slice(4);
    return {
      id: `dlg_${k}`,
      greetings: [
        { if: { activity: 'sleep' }, say: ['*asleep, boots by the bunk, one eye very slightly open*'] },
        { if: { firstMeeting: true }, say: [`${p.name}. ${p.role.split('.')[0]}.`, 'You are on Army ground. Keep your hands where I can see them, and your questions short.'] },
        { if: {}, variants: [['Yes?'], ['State your business.'], ['Move along, citizen, unless there is something.']] },
      ],
      farewells: [{ if: {}, variants: [['Carry on.'], ['Mind the road.']] }],
      topics: [
        { id: `t_${k}_job`, label: '"What do you do?"', keywords: ['do', 'job', 'work', 'role', 'what'], say: [p.line] },
        { id: `t_${k}_fort`, label: '"What is Fort Gullcrest?"', keywords: ['fort', 'gullcrest', 'base', 'army', 'here'], say: ['The Crown\'s own base on the Hald Reach: barracks, a motor pool, hangars, a range and a gate. It is not a company\'s and it is not for sale. Companies keep their own ground.'] },
        { id: `t_${k}_company`, label: '"I am thinking of starting a security firm."', keywords: ['company', 'security', 'firm', 'mercenary', 'hire', 'licence'], say: ['Then you want the Civic Office for the licence, a lot of your own and a great deal of patience. A private lot is yours to fence; the Army\'s base is not yours to fear. (Your company would build on Hollowmoor Lot, on the shore road west of the Yards.)'] },
      ],
      askPrompt: [['Ask. Briefly.']],
      unknown: [['Above my pay grade.'], ['I could not say, and I would not.']],
      gift: { loved: [['Coffee. You are forgiven for everything.']], liked: [['Thank you. I did not see that.']], neutral: [['Noted.']], disliked: [['Regulations.']], tooMany: [['That is plenty.']], ownStolen: [['That is mine.']] },
      barks: { greet: ['Halt. Oh, it is you.'], work: ['Mm.', 'Clear.'], chat: ['Quite.'], argue: ['Orders are orders.'], sleep: ['zzz'], moods: {} },
    };
  });
}

export const FORT_PATROL = { name: 'The Fort Gullcrest perimeter', dwell: 8, points: ['fort_gullcrest:patrol_a', 'fort_gullcrest:patrol_b', 'fort_gullcrest:patrol_c', 'fort_gullcrest:patrol_d', 'fort_gullcrest:patrol_e', 'fort_gullcrest:patrol_f'] };
