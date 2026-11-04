// The two party headquarters as real offices (v0.94.1). Each is laid over its building's footprint (14 × 12): a reception, the leader's office in
// the north-west corner, the war room (a table and the polling wall) in the north-east, and an open-plan floor with one desk for each of the party's
// ten staff roles. Staff work at their own desk (`desk_<role>`); anyone may walk in during the party's opening hours.
import { roomTiles } from '../../world/mapBuilder.js';
import { POLITICS } from '../politics.js';

export const PARTY_HQ = { w: 14, h: 12, dx: 7 };
const { w: W, h: H, dx: DX } = PARTY_HQ;
// the ten desks: two rows of five
const DESKS = [
  ['chief_of_staff', 2, 5], ['campaign_manager', 4, 5], ['policy_adviser', 6, 5], ['communications', 8, 5], ['press_secretary', 10, 5],
  ['fundraising', 2, 8], ['polling', 4, 8], ['legal', 6, 8], ['security', 8, 8], ['organiser', 10, 8],
];
const ROLE_NAME = Object.fromEntries(POLITICS.staffRoles.map((r) => [r.id, r.name]));
const EXAMINE = {
  order: {
    chief_of_staff: 'The chief of staff\'s desk: the leader\'s diary in four colours, and a clock set eleven minutes fast on purpose.', campaign_manager: 'A wall planner of the next term\'s vote, with a column labelled "ORDER" and no column labelled "LUCK".',
    policy_adviser: 'Bills in neat piles, each with a cost tab in red. The thinnest pile is labelled "WILL NOT BE POPULAR".', communications: 'Mock-ups of posters: a stern face, a clenched jaw, one word: ORDER. One has been marked "TOO FRIENDLY".',
    press_secretary: 'A phone, a list of forty-one ways to say "no comment", and a cold cup of tea.', fundraising: 'A ledger of donations: capped, public and recorded. A sign: "WE THANK EVERY DONOR. WE DECLINE TO NAME THE UNHAPPY ONES."',
    polling: 'Poll sheets pinned in date order, error bars circled in green. A note: "A POLL IS A PHOTOGRAPH, NOT A PROMISE".', legal: 'Statute books with sticky tabs, and a framed sentence: "EVERYTHING WE DO IS LEGAL. WE CHECK."',
    security: 'A radio, a floor plan of every venue the leader has ever spoken at, and a tidy row of keys.', organiser: 'A stack of folding chairs, a tin of drawing pins and a clipboard that has outlasted three leaders.',
  },
  liberty: {
    chief_of_staff: 'The chief of staff\'s desk: three diaries, a jug of water and a sign that says "ASK BEFORE YOU ASSUME".', campaign_manager: 'A planner of the vote on the wall, with a hand-drawn arrow labelled "HOPE (ESTIMATED)".',
    policy_adviser: 'Bills with comment bubbles in the margin: "WHO CHECKS THIS?" appears on every one.', communications: 'Poster drafts: a smiling face, an open door, the word LIBERTY. A sticky note: "SMILE LESS TEETH".',
    press_secretary: 'A phone, a notebook of difficult questions and a mug that says "NO COMMENT (TODAY)".', fundraising: 'A ledger of small donations, each with a name and a thank-you card. The thank-you cards are the budget.',
    polling: 'Poll sheets with the error bars drawn very, very large. A note: "NEVER BELIEVE THE SECOND DECIMAL".', legal: 'A shelf of civil-liberties cases and a framed warrant, voided, with a coffee ring on it.',
    security: 'A radio, a bicycle lock and a nervous note: "THE LEADER WILL NOT WEAR THE VEST".', organiser: 'Banners rolled in a corner, a megaphone with a flat battery and a map of every church hall in Sund.',
  },
};

/** One headquarters. `party`: 'order' | 'liberty'. */
export function partyHQ(party) {
  const id = `${party}_hq`;
  const order = party === 'order';
  const E = EXAMINE[party];
  const props = [
    { id: `${id}_poster`, type: 'painting', x: 5, y: 0, w: 4, examine: order ? 'A banner: a stern face, a clenched jaw and the single word ORDER. It is a good banner. They have eleven.' : 'A banner: a smiling face, an unlocked door and the single word LIBERTY. Someone has added, in pencil, "(PLEASE KNOCK)".' },
    { id: `${id}_flag`, type: 'flagpole', x: 12, y: 1, color: order ? '#8a2a30' : '#2a5a9a' },
    { id: `${id}_reception`, type: 'counter', x: 8, y: 9, w: 3, examine: 'The reception counter: a visitors\' book, a bell and a bowl of badges. Take one; they are free. The leaflets are not entirely free: they ask for your vote.' },
    { id: `${id}_chair`, type: 'chair', x: 9, y: 10 },
    { id: `${id}_plant1`, type: 'plant', x: 1, y: 10 }, { id: `${id}_plant2`, type: 'plant', x: 12, y: 10 },
    { id: `${id}_bench`, type: 'bench', x: 1, y: 9, w: 2, examine: 'Chairs for supporters waiting to see someone. Some have been waiting a while; there is a mug on the floor beside each.' },
    // the leader's office (north-west corner)
    { id: `${id}_leader_desk`, type: 'desk', x: 2, y: 1, w: 3, color: order ? '#2a1a14' : '#6a4a2a', examine: order ? 'Josiah Vegas\'s desk: a blotter, a seal and a single pen, aligned with the edge.' : 'Susan\'s desk: seven open files, a half-eaten apple and a speech marked "FINAL (4)".' },
    { id: `${id}_leader_chair`, type: 'chair', x: 3, y: 2 },
    { id: `${id}_leader_shelf`, type: 'shelf', x: 1, y: 1, examine: order ? 'Bound volumes of speeches, alphabetical, each marked "DELIVERED".' : 'Books on constitutions and two on gardening; one is clearly read more than the other.' },
    // the war room (north-east): the table and the polling wall
    { id: `${id}_war_table`, type: 'table', x: 9, y: 2, w: 3, color: '#3a3a44', examine: 'The war-room table: a map of Sund\'s nine states, a pile of poll sheets, coloured pins. The pins are the staff\'s whole religion.' },
    { id: `${id}_war_wall`, type: 'monitor_wall', x: 9, y: 0, w: 3, examine: 'The polling wall: the latest polls by state, the party\'s lines in the party\'s colour. Whoever is losing stands furthest from it.' },
    { id: `${id}_terminal`, type: 'terminal', x: 6, y: 1, interact: { kind: 'bank', tab: 'Politics' }, examine: 'A terminal showing the Politics page: who governs, the books, the latest polls. The same page your tablet shows.' },
    { id: `${id}_board`, type: 'noticeboard', x: 7, y: 0, examine: order ? 'THE ORDER PARTY: "Meetings Thornday evening. Bring a friend. Do not bring a protest sign: it will be handed back, folded."' : 'THE LIBERTY LEAGUE: "Open meeting every Thornday. Bring a friend. Bring a protest sign. We have a sign-painting corner."' },
  ];
  const spots = { entry: { x: DX, y: H - 2, facing: 'up' }, reception: { x: 9, y: 10, facing: 'up' }, leader: { x: 3, y: 3, facing: 'down' }, war_table: { x: 10, y: 4, facing: 'up' } };
  DESKS.forEach(([role, x, y]) => {
    props.push({ id: `${id}_desk_${role}`, type: 'desk', x, y, examine: `${ROLE_NAME[role]}. ${E[role]}` }, { id: `${id}_chair_${role}`, type: 'chair', x, y: y + 1 });
    spots[`desk_${role}`] = { x, y: y + 2, facing: 'up' };
  });
  return {
    id, name: order ? 'The Order Party — headquarters' : 'The Liberty League — headquarters', kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor', wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTiles(W, H, order ? 'c' : 't', DX, [[1, 5, 1, 1, order ? 'c' : 't']]),
    doors: [{ id: `door_${id}_exit`, x: DX, y: H - 1, to: { map: 'crown_quarter', spot: `cq_${party}_hq_out` } }],
    spots, keepClear: [[DX, H - 2]], props,
  };
}

export default [partyHQ('order'), partyHQ('liberty')];
