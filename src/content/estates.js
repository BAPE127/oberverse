// The two leaders' estates (v0.94.1): Ironcrest Hall (Josiah Vegas: stone, a gatehouse, a war room, a range) and Willowmere (Susan: lakeside, glass,
// an open study). Each has a small household that lives in its own staff cottages: a steward who keeps the door, a cook, and the grounds. The
// leaders live in their mansion's private quarters (src/content/maps/mansions.js). Access is by invitation: the steward receives callers who
// are known to the house, or who have an appointment; nothing is open to money alone.
import { personRecord, personDialogue } from './capital.js';

const P = (id, name, role, estate, job, line, o = {}) => ({ id, name, shortName: name.split(' ').slice(-1)[0], role, kind: 'house', estate, job, line, ...o });

export const ESTATE_DEFS = {
  ironcrest: { name: 'Ironcrest Hall', leader: 'npc_vegas', party: 'order', flag: 'ironcrest_invited', trusted: 'ironcrest_trusted', steward: 'npc_ih_steward', cottages: 'ih_cottages', homeId: 'ih_cottages' },
  willowmere: { name: 'Willowmere', leader: 'npc_susan', party: 'liberty', flag: 'willowmere_invited', trusted: 'willowmere_trusted', steward: 'npc_wm_steward', cottages: 'wm_cottages', homeId: 'wm_cottages' },
};

export const ESTATE_PEOPLE = [
  P('npc_ih_steward', 'Edmund Blackwood', 'Steward of Ironcrest Hall. Keeps the door, the diary and the silence.', 'ironcrest', 'steward', 'Mr Vegas receives by invitation. I keep the book. I read it twice before I write in it, and three times before I strike something out.', { short: 'Blackwood' }),
  P('npc_ih_cook', 'Agatha Alder', 'Cook at Ironcrest Hall. Feeds a household, a war room and, once a month, a range.', 'ironcrest', 'cook', 'Mr Vegas eats what is put in front of him at the hour it is put there. I have found this a restful arrangement for both of us.', { short: 'Alder' }),
  P('npc_ih_guard', 'Bram Dagger', 'Gatekeeper and groundsman at Ironcrest Hall. Large, polite and never off duty.', 'ironcrest', 'gate', 'The gate is open when I say and shut when I say. If you have a complaint, I am the one to take it to, and I will take it exactly nowhere.', { short: 'Dagger', armed: true }),
  P('npc_wm_steward', 'Philippa Reed', 'Steward of Willowmere. Warm, brisk and unshockable.', 'willowmere', 'steward', 'Miss Susan likes visitors, so I decide which. It is a kindness she does not know she is receiving.', { short: 'Reed' }),
  P('npc_wm_cook', 'Mirabel Thorne', 'Cook at Willowmere. Cooks for twelve and is asked to feed forty.', 'willowmere', 'cook', 'Miss Susan invites everyone and tells me afterwards. The soup has learned to stretch. So, I find, have I.', { short: 'Thorne' }),
  P('npc_wm_gardener', 'Jonas Fenn', 'Gardener and boatman at Willowmere. Knows every reed on the lake by name.', 'willowmere', 'garden', 'The lake keeps its own counsel. The reeds do the talking, if you stand still long enough.', { short: 'Fenn' }),
];

const SPOTS = { ironcrest: { steward: 'ironcrest_hall:steward', cook: 'ironcrest_staff:entry', gate: 'ironcrest_grounds:ih_gate' }, willowmere: { steward: 'willowmere_hall:steward', cook: 'willowmere_staff:entry', garden: 'willowmere_grounds:wm_lake' } };

/** One estate worker's day: asleep in the cottage flat, then the household's hours. */
function scheduleOf(p, home) {
  const work = SPOTS[p.estate][p.job];
  return [
    { from: '22:30', to: '06:30', activity: 'sleep', spot: `${home}:bed` },
    { from: '06:30', to: '07:30', activity: 'eat', spot: `${home}:chair`, label: 'breakfast' },
    { from: '07:30', to: '12:30', activity: 'work', spot: work, label: p.job === 'steward' ? 'keeping the house' : p.job === 'cook' ? 'in the kitchen' : p.job === 'gate' ? 'at the gate' : 'in the grounds' },
    { from: '12:30', to: '13:30', activity: 'eat', spot: `${home}:chair`, label: 'lunch at home' },
    { from: '13:30', to: '19:00', activity: 'work', spot: work, label: p.job === 'steward' ? 'keeping the house' : p.job === 'cook' ? 'in the kitchen' : p.job === 'gate' ? 'at the gate' : 'in the grounds' },
    { from: '19:00', to: '22:30', activity: 'relax', spot: `${home}:chair`, label: 'at home' },
  ];
}

/** The cottages' flats: one person each. */
export function estateFlats(estate) {
  return ESTATE_PEOPLE.filter((p) => p.estate === estate).map((p, i) => ({ who: [p.id], name: p.name, bed: ['#5a4a3a', '#4a5a6a', '#6a4a4a'][i % 3], rug: ['#8a6a4a', '#4a6a5a', '#6a5a7a'][i % 3], loot: { items: { item_pocket_watch: 1 }, money: 25 + i * 11 }, props: [
    { type: 'shelf', x: 1, y: 4, examine: 'A kettle, a calendar of the household\'s duties and a photograph of someone who has been given the day off.' }, { type: 'plant', x: 7, y: 4 }] }));
}
export const estateLife = () => Object.fromEntries(['ironcrest', 'willowmere'].flatMap((e) => ESTATE_PEOPLE.filter((p) => p.estate === e).map((p, i) => [p.id, { home: `res_${ESTATE_DEFS[e].homeId}/flat_${i + 1}`, occupation: 'official' }])));

export function estateCharacters() {
  const life = estateLife();
  return ESTATE_PEOPLE.map((p) => personRecord(p, scheduleOf(p, life[p.id].home.replace('res_', '').replace('/flat_', '_'))));
}

/** The dialogues; each steward also decides who may call (the invitation flag): the house's own acquaintances, or an appointment. */
export function estateDialogues() {
  return ESTATE_PEOPLE.map((p) => {
    const d = personDialogue(p);
    d.topics = d.topics.filter((t) => !t.id.endsWith('_leaders'));
    const E = ESTATE_DEFS[p.estate];
    if (p.job === 'steward') {
      d.topics.unshift({
        id: `t_${p.id.slice(4)}_call`, label: `"I'd like to call on ${p.estate === 'ironcrest' ? 'Mr Vegas' : 'Susan'}."`, tag: 'quest', keywords: ['call', 'visit', 'invite', 'see', 'meet', 'house'],
        if: { notFlag: E.flag },
        say: [`${E.name} receives callers by invitation, and by appointment. I keep the book.`],
        choices: [
          { id: `c_${p.id.slice(4)}_known`, label: '"We have met. I think I am known here." (Be known to the house)', if: { rel: { trust: '>=5' } }, say: ['You are known, yes. Your name is in the book of callers. The house receives from nine in the morning until nine at night. Do knock.'], effects: [{ flag: { [E.flag]: true } }, { rel: { respect: 2 } }] },
          { id: `c_${p.id.slice(4)}_appt`, label: '"I have an appointment." (Show your standing)', if: { flag: 'halver_appointment' }, say: ['The Presidency has written. Very good. Your name is in the book, and the house receives from nine until nine.'], effects: [{ flag: { [E.flag]: true } }] },
        ],
      });
      d.topics.push({ id: `t_${p.id.slice(4)}_known`, label: '"How does someone become known to the house?"', keywords: ['known', 'trust', 'become', 'how'], if: { notFlag: E.flag }, say: ['By being worth knowing. Speak to the household; be useful; be discreet. A gift is noticed, though never mentioned. And money, I should say, is not a reference.'] });
    }
    return d;
  });
}

/** Who may walk through the estate's doors at any hour: its leader and its household. */
export const ESTATE_OWNERS = Object.fromEntries(Object.entries(ESTATE_DEFS).map(([k, E]) => [k, [E.leader, ...ESTATE_PEOPLE.filter((p) => p.estate === k).map((p) => p.id)]]));
