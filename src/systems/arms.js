// The arms trade (v0.13.0): Mill Road Yards arms works, built on the same
// grid engine as the calculator factory (belts, inserter arms, generators),
// with workstations that need EMPLOYEES to run, a research tree, parts and
// equipment ordered from the terminal (delivered to the loading dock), and
// Lucas Eastrise buying your output wholesale until the global market opens
// (v0.14.0). See docs/ARMS.md.
//
//   licence (Lucas, 500) ─▶ buy a works at its FOR SALE sign ─▶ terminal:
//     Parts / Equipment ─▶ loading dock (60 min)      Staff ─▶ hire, assign, pay
//     Research ─▶ a scientist at a lab earns points   Market ─▶ (v0.14)
//   stations run one recipe each (E to choose), only while a worker is at them;
//   speed = skill × morale × quirk × research. Wages are paid at 19:00.
//
// State: game.world.arms. Employees are generated characters (world.arms.staff)
// spawned as NPCs who live in their works and never leave it.
import { Factory, DX, DY, OUTPUT_CAP } from './factory.js';
import { TILE, clamp } from '../core/util.js';
import { isDown } from './combat.js';

export const LICENCE_FLAG = 'arms_licence';
const DELIVERY_MINUTES = 60;
const RP_PER_MINUTE = 0.05;
const PAY_MINUTE = 19 * 60;
const CANDIDATES = 4;
const START_MORALE = 70;

export function freshArms(content) {
  const warehouses = {};
  for (const id of Object.keys(content.armsWarehouses || {})) warehouses[id] = { entities: [], nextId: 1 };
  return {
    warehouses, research: { done: {}, current: null, progress: 0 }, staff: [], candidates: [], candidatesDay: 0, nextStaff: 1,
    orders: [], lucasDay: 0, lucasSpent: 0, produced: {}, lastPayDay: 0, earned: 0,
  };
}

export class Arms extends Factory {
  constructor(game) {
    super(game, { stateKey: 'arms', defsKey: 'armsWarehouses', kind: 'arms', domain: 'arms' });
    game.bus.on('shop:stock', (e) => {
      if (e.by === 'player' && e.shopId === 'shop_rook' && game.content.items[e.item]?.weapon?.kind === 'gun' && !game.getFlag('bought_gun_lucas')) game.setFlag('bought_gun_lucas', true);
    });
  }

  fresh() {
    return freshArms(this.game.content);
  }

  get cfg() {
    return this.game.content.arms;
  }

  licensed() {
    return Boolean(this.game.getFlag(LICENCE_FLAG));
  }

  buyLicence() {
    const g = this.game;
    if (this.licensed()) return { ok: false, text: 'You already have a licence.' };
    const price = this.cfg.licencePrice;
    if (g.player.money < price) return { ok: false, text: `The licence costs ${price} obols.` };
    g.player.money -= price;
    g.bus.emit('money:changed', { delta: -price, total: g.player.money });
    g.setFlag(LICENCE_FLAG, true);
    return { ok: true, text: 'You are now a licensed arms manufacturer and exporter. (Mill Road Yards: the west end of Mill Road.)' };
  }

  // ---------------------------------------------------------------- research
  done(id) {
    return Boolean(this.state.research.done[id]);
  }

  available(id) {
    const node = this.cfg.research[id];
    return Boolean(node) && !this.done(id) && node.requires.every((r) => this.done(r));
  }

  selectResearch(id) {
    if (!this.available(id)) return { ok: false, text: 'You can\'t research that yet.' };
    const r = this.state.research;
    if (r.current !== id) { r.current = id; r.progress = 0; }
    return { ok: true, text: `Researching: ${this.cfg.research[id].name}.` };
  }

  addResearch(points) {
    const g = this.game;
    const r = this.state.research;
    if (!r.current) return;
    r.progress += points;
    const node = this.cfg.research[r.current];
    if (r.progress >= node.cost) {
      r.done[r.current] = true;
      g.tablet.post('arms', `🔬 Research complete: ${node.name}. ${node.text}`, 'quest');
      g.bus.emit('arms:research', { id: r.current });
      r.current = null;
      r.progress = 0;
    }
  }

  bonusSum(fn) {
    let s = 0;
    for (const [id, node] of Object.entries(this.cfg.research)) if (this.done(id) && node.bonus) s += fn(node.bonus) || 0;
    return s;
  }

  speedMult() {
    return 1 + this.bonusSum((b) => b.speed);
  }

  priceMult(family) {
    return 1 + this.bonusSum((b) => (b.price?.all || 0) + (b.price?.[family] || 0));
  }

  partsMult() {
    return 1 + this.bonusSum((b) => b.parts);
  }

  recipeUnlocked(rid) {
    const r = this.cfg.recipes[rid];
    return Boolean(r) && (!r.requires || this.done(r.requires));
  }

  /** What a buyer pays for one unit, with research. */
  value(itemId) {
    const a = this.game.content.items[itemId]?.arms;
    return a ? Math.round(a.value * this.priceMult(a.family)) : 0;
  }

  // ------------------------------------------------------------- wholesale
  wholesale(itemId) {
    if (!this.licensed()) return 0;
    return Math.round(this.value(itemId) * this.cfg.wholesale.share);
  }

  lucasBudgetLeft() {
    const s = this.state;
    if (s.lucasDay !== this.game.clock.day) { s.lucasDay = this.game.clock.day; s.lucasSpent = 0; }
    return Math.max(0, this.cfg.wholesale.dailyBudget - s.lucasSpent);
  }

  /** Called by Game.sell for an arms item at Pipecreek. */
  sellToLucas(itemId, price) {
    if (price > this.lucasBudgetLeft()) return { ok: false, text: `Lucas: "Love it, can't afford it today. ${this.lucasBudgetLeft()} obols left in the kitty. Come back tomorrow."` };
    this.state.lucasSpent += price;
    this.state.earned += price;
    return { ok: true };
  }

  // ----------------------------------------------------------- warehouses
  buyPrompt(whId) {
    const def = this.def(whId);
    if (this.owns(whId)) return { type: 'message', text: `${def.name} is yours. (SOLD.)` };
    if (!this.licensed()) return { type: 'message', text: `FOR SALE: ${def.name}, ${def.price} obols. "ARMS LICENCE REQUIRED — no licence, no sale, no exceptions, no kidding." (Lucas Eastrise at Pipecreek Armory can arrange one.)` };
    return {
      type: 'choices', title: def.name,
      text: `FOR SALE: ${def.name}, ${def.price} obols. Power for ${def.basePower} stations, bunks for ${def.bunks} staff, a loading dock, an export cage and a terminal.`,
      options: [{ label: `Buy it for ${def.price} obols`, call: ['arms', 'buy', whId] }, { label: 'Not now', call: ['arms', 'noop'] }],
    };
  }

  buy(whId) {
    if (!this.licensed()) return { ok: false, text: 'You need an arms licence.' };
    const r = super.buy(whId);
    if (r.ok) r.text = `${this.def(whId).name} is yours. The terminal inside handles parts, equipment, staff and research.`;
    return r;
  }

  // -------------------------------------------------------------- stations
  initialSetting() {
    return null;
  }

  recipeOf(e) {
    if (e.kind === 'lab') return null;
    const r = this.cfg.recipes[e.setting];
    return r && r.station === e.kind ? r : null;
  }

  recipeOut(e) {
    return this.recipeOf(e)?.out || null;
  }

  setRecipe(entityId, rid) {
    const e = this.findEntity(entityId);
    const r = this.cfg.recipes[rid];
    if (!e || !r || r.station !== e.kind) return { ok: false, text: '' };
    if (!this.recipeUnlocked(rid)) return { ok: false, text: `Research ${this.cfg.research[r.requires].name} first.` };
    e.setting = rid;
    e.progress = 0;
    return { ok: true, text: `The ${this.cfg.stations[e.kind].name} will make: ${this.game.content.items[r.out].name}.` };
  }

  settingOptions(e) {
    if (e.kind === 'lab') return [];
    const g = this.game;
    return Object.entries(this.cfg.recipes).filter(([rid, r]) => r.station === e.kind && this.recipeUnlocked(rid))
      .map(([rid, r]) => ({ label: `Make ${g.content.items[r.out].name}${e.setting === rid ? ' (current)' : ''} — ${Object.entries(r.in).map(([id, n]) => `${n > 1 ? `${n}× ` : ''}${g.content.items[id].name}`).join(' + ')}`, call: ['arms', 'setRecipe', e.id, rid] }));
  }

  statusExtra(whId, e) {
    const w = this.workerAt(e);
    const who = w ? `Staffed by ${w.name}${this.present(w, e) ? '' : ' (not at the station right now)'}.` : 'UNSTAFFED — assign someone at the terminal.';
    if (e.kind === 'lab') {
      const r = this.state.research;
      return `${who} ${r.current ? `Researching ${this.cfg.research[r.current].name}: ${Math.floor(r.progress)}/${this.cfg.research[r.current].cost}.` : 'No research selected (terminal → Research).'}`;
    }
    return `${who} ${e.progress > 0 ? `Working: ${Math.round(((e.progress - 1) / (this.recipeOf(e)?.minutes || 1)) * 100)}%.` : 'Waiting for inputs.'}`;
  }

  stepMachine(whId, m) {
    if (m.kind === 'lab') {
      const rate = this.rate(whId, m);
      m.working = rate > 0 && Boolean(this.state.research.current);
      if (m.working) this.addResearch(rate * RP_PER_MINUTE);
      return;
    }
    super.stepMachine(whId, m);
  }

  produced(whId, m, out) {
    const s = this.state;
    s.produced[out] = (s.produced[out] || 0) + 1;
    // for the tablet's daily report
    if (!s.today) s.today = {};
    const t = (s.today[whId] ||= {});
    t[out] = (t[out] || 0) + 1;
    this.alerted?.delete(m.id); // it's working again: a later stall is news
    this.game.bus.emit('arms:produced', { warehouse: whId, item: out });
  }

  /** Station spot: the free floor tile a worker stands on, beside the station. */
  stationSpot(whId, e) {
    const map = this.game.maps.get(this.def(whId).map);
    const free = (x, y) => map.inBounds(x, y) && map.grid[y][x] === 'g' && !map.blockedTile(x, y) && !map.props.some((p) => p.type === 'belt' && p.x === x && p.y === y);
    const cands = [];
    for (let x = e.x; x < e.x + e.w; x++) cands.push([x, e.y + e.h], [x, e.y - 1]);
    for (let y = e.y; y < e.y + e.h; y++) cands.push([e.x - 1, y], [e.x + e.w, y]);
    const c = cands.find(([x, y]) => free(x, y)) || [e.x, e.y + e.h];
    return { x: c[0], y: c[1], facing: c[1] >= e.y + e.h ? 'up' : c[1] < e.y ? 'down' : c[0] < e.x ? 'right' : 'left' };
  }

  refreshSpots(whId) {
    const map = this.game.maps.get(this.def(whId).map);
    for (const k of Object.keys(map.spots)) if (k.startsWith('st_')) delete map.spots[k];
    for (const e of this.state.warehouses[whId].entities) if (e.type === 'machine') map.spots[`st_${e.id}`] = this.stationSpot(whId, e);
  }

  install() {
    super.install();
    if (!this.game.world) return;
    for (const id of Object.keys(this.defs())) if (this.game.maps.get(this.def(id).map)) this.refreshSpots(id);
  }

  place(whId, itemId, x, y, dir) {
    const r = super.place(whId, itemId, x, y, dir);
    if (r.ok) this.refreshSpots(whId);
    return r;
  }

  remove(whId, x, y) {
    const e = this.at(whId, x, y);
    const r = super.remove(whId, x, y);
    if (r.ok) {
      for (const s of this.state.staff) if (s.assigned === e?.id) s.assigned = null;
      this.refreshSpots(whId);
    }
    return r;
  }

  // ----------------------------------------------------------------- staff
  staffOf(whId) {
    return this.state.staff.filter((s) => s.warehouse === whId);
  }

  workerAt(e) {
    return this.state.staff.find((s) => s.assigned === e.id) || null;
  }

  quirk(s) {
    return (s.quirk && this.cfg.quirks[s.quirk]) || {};
  }

  /** Is this worker at their station and on shift? */
  present(s, e) {
    const g = this.game;
    const npc = g.npcs.get(s.id);
    if (!npc || npc.activity === 'sleep' || isDown(npc, g.clock.total) || npc.dead) return false;
    if (!this.onShift(s)) return false;
    const map = this.def(s.warehouse).map;
    const spot = g.maps.get(map)?.spots[`st_${e.id}`];
    if (npc.map !== map || !spot) return false;
    return Math.hypot(npc.x - (spot.x * TILE + TILE / 2), npc.y - (spot.y * TILE + TILE / 2)) < 2.5 * TILE;
  }

  onShift(s) {
    const m = this.game.clock.minuteOfDay;
    const day = m >= 7 * 60 && m < 19 * 60;
    return this.quirk(s).night ? !day : day;
  }

  rate(whId, m) {
    const s = this.workerAt(m);
    if (!s || !this.present(s, m)) return 0;
    const skill = s.skills[this.cfg.stations[m.kind].skill] || 1;
    const q = this.quirk(s);
    return (0.4 + 0.2 * skill) * (0.5 + s.morale / 100) * (1 + (q.speed || 0) + (q.stations?.[m.kind] || 0)) * this.speedMult();
  }

  /** A procedurally generated job applicant. */
  candidate() {
    const g = this.game;
    const R = g.rng;
    const pick = (a) => a[Math.floor(R.next() * a.length)];
    const skills = {};
    for (const k of this.cfg.staffSkills) skills[k] = 1 + Math.floor(R.next() * 2);
    const main = pick(this.cfg.staffSkills);
    skills[main] = 3 + Math.floor(R.next() * 3);
    const quirk = R.next() < 0.65 ? pick(Object.keys(this.cfg.quirks)) : null;
    const total = Object.values(skills).reduce((a, b) => a + b, 0);
    const wage = Math.max(10, Math.round((10 + 5 * total) * (1 + (this.cfg.quirks[quirk]?.wage || 0))));
    const first = pick(this.cfg.staffNames.first);
    const last = pick(this.cfg.staffNames.last);
    const skins = ['#f2d6c0', '#e2b896', '#c48a62', '#8a5a3a', '#6a4430', '#f0c8a8', '#d9a77c'];
    const hairs = ['#1a1410', '#3a2a20', '#6a3a2a', '#c9813a', '#e8e2d4', '#8a7a6a', '#2a1e1a'];
    const styles = ['short', 'messy', 'curly', 'parted', 'bun', 'ponytail', 'long', 'cap'];
    const coveralls = ['#4a5a3a', '#3a4a6a', '#6a5a3a', '#5a3a3a', '#3a5a5a'];
    return {
      name: `${first} ${last}`, shortName: first, skills, main, quirk, wage,
      appearance: { skin: pick(skins), hair: pick(hairs), hairStyle: pick(styles), hatColor: '#c9a24a', outfit: pick(coveralls), legs: '#2a2a2e', build: pick(['thin', 'average', 'broad', 'wiry']), height: 0.94 + R.next() * 0.14, accessories: R.next() < 0.4 ? ['goggles'] : [], accent: '#c9a24a' },
      voice: { wave: pick(['triangle', 'square', 'sine']), pitch: 120 + Math.floor(R.next() * 200), variance: 20, rate: 1 + R.next() * 0.3 },
    };
  }

  candidates() {
    const s = this.state;
    if (s.candidatesDay !== this.game.clock.day || !s.candidates.length) {
      s.candidatesDay = this.game.clock.day;
      s.candidates = Array.from({ length: CANDIDATES }, () => this.candidate());
    }
    return s.candidates;
  }

  hire(index, whId) {
    const g = this.game;
    const s = this.state;
    const c = this.candidates()[index];
    if (!c) return { ok: false, text: 'That applicant has gone.' };
    if (!this.owns(whId)) return { ok: false, text: 'Not your works.' };
    const used = new Set(this.staffOf(whId).map((x) => x.bunk));
    const def = this.def(whId);
    let bunk = 1;
    while (used.has(bunk) && bunk <= def.bunks) bunk++;
    if (bunk > def.bunks) return { ok: false, text: `${def.name} only has bunks for ${def.bunks}.` };
    const st = { ...c, id: `npc_staff_${s.nextStaff++}`, warehouse: whId, bunk, assigned: null, morale: START_MORALE, unpaid: 0, hiredDay: g.clock.day };
    s.staff.push(st);
    s.candidates.splice(index, 1);
    this.spawn(st);
    g.bus.emit('arms:hired', { id: st.id });
    return { ok: true, text: `Hired ${st.name} (${st.main}, ${st.wage} obols/day) at ${def.name}.` };
  }

  fire(staffId) {
    const g = this.game;
    const s = this.state;
    const st = s.staff.find((x) => x.id === staffId);
    if (!st) return { ok: false, text: '' };
    s.staff = s.staff.filter((x) => x !== st);
    g.npcs.delete(st.id);
    return { ok: true, text: `${st.name} clears out their bunk and leaves.` };
  }

  assign(staffId, entityId) {
    const s = this.state;
    const st = s.staff.find((x) => x.id === staffId);
    if (!st) return { ok: false, text: '' };
    if (entityId) {
      const e = this.findEntity(entityId);
      if (!e || e.type !== 'machine' || this.whOf(entityId) !== st.warehouse) return { ok: false, text: 'That station isn\'t in their works.' };
      for (const o of s.staff) if (o.assigned === entityId) o.assigned = null;
    }
    st.assigned = entityId || null;
    const npc = this.game.npcs.get(st.id);
    if (npc && npc.intent?.source === 'staff') { npc.intent = null; this.game.npcSystem.think(npc, true); }
    return { ok: true, text: entityId ? `${st.shortName} → ${this.cfg.stations[this.findEntity(entityId).kind].name}.` : `${st.shortName} is unassigned.` };
  }

  /** Put the best free worker on every unstaffed station. */
  autoAssign(whId) {
    const stations = this.cells(whId).machines.filter((e) => !this.workerAt(e));
    let n = 0;
    for (const e of stations) {
      const skill = this.cfg.stations[e.kind].skill;
      const free = this.staffOf(whId).filter((x) => !x.assigned).sort((a, b) => (b.skills[skill] || 0) - (a.skills[skill] || 0));
      if (!free.length) break;
      this.assign(free[0].id, e.id);
      n++;
    }
    return { ok: true, text: n ? `Assigned ${n} worker${n === 1 ? '' : 's'}.` : 'Nobody free, or nothing unstaffed.' };
  }

  bonus(staffId) {
    const g = this.game;
    const st = this.state.staff.find((x) => x.id === staffId);
    if (!st) return { ok: false, text: '' };
    if (g.player.money < st.wage) return { ok: false, text: `A bonus is a day's wage: ${st.wage} obols.` };
    g.player.money -= st.wage;
    g.bus.emit('money:changed', { delta: -st.wage, total: g.player.money });
    st.morale = clamp(st.morale + 15, 0, 100);
    return { ok: true, text: `${st.shortName} pockets the bonus. Morale ${Math.round(st.morale)}.` };
  }

  /** A generated employee's character profile. They live and work in their works. */
  profileOf(st) {
    const map = this.def(st.warehouse).map;
    const night = this.quirk(st).night;
    const schedule = night
      ? [{ from: '19:00', to: '07:00', activity: 'work', spot: `${map}:post_${st.bunk}` }, { from: '07:00', to: '11:00', activity: 'leisure', spot: `${map}:post_${st.bunk}` }, { from: '11:00', to: '19:00', activity: 'sleep', spot: `${map}:bunk_${st.bunk}` }]
      : [{ from: '07:00', to: '19:00', activity: 'work', spot: `${map}:post_${st.bunk}` }, { from: '19:00', to: '23:00', activity: 'leisure', spot: `${map}:post_${st.bunk}` }, { from: '23:00', to: '07:00', activity: 'sleep', spot: `${map}:bunk_${st.bunk}` }];
    return {
      id: st.id, name: st.name, shortName: st.shortName, tier: 'minor', origin: 'generated', faction: null, staff: true, noSnitch: true,
      role: `Employee at ${this.def(st.warehouse).name}: ${st.main}${st.quirk ? `, ${this.cfg.quirks[st.quirk].name.toLowerCase()}` : ''}.`,
      dialogue: 'dlg_staff', voice: st.voice, appearance: st.appearance,
      personality: { traits: [st.main, ...(st.quirk ? [this.cfg.quirks[st.quirk].name.toLowerCase()] : [])], sociability: 0.5, conscientiousness: 0.6, impulsiveness: 0.3, discretion: 0.8, honesty: 0.6, empathy: 0.5 },
      speech: { rumorPrefix: 'On the floor they say', factPrefix: 'Boss,', refuse: 'Not my department, boss.' },
      combat: { never: true, maxHealth: 90 }, walkSpeed: 1, punctuality: 10,
      schedule, impulses: [], notices: [], knowledge: [], relationships: { player: { trust: 10, affection: 0, respect: 10, suspicion: 0 } }, giftPrefs: { item_coffee: 6, tags: { food: 3 } }, opinions: {},
    };
  }

  spawn(st) {
    const g = this.game;
    const npc = g.createNpc(this.profileOf(st));
    g.npcs.set(st.id, npc);
    return npc;
  }

  /** After a load: recreate every employee as an NPC. */
  spawnStaff() {
    for (const st of this.state.staff) if (!this.game.npcs.has(st.id)) this.spawn(st);
  }

  /** Daily at 19:00: wages, morale, quitting. */
  payroll() {
    const g = this.game;
    const s = this.state;
    s.lastPayDay = g.clock.day;
    this.dailyReport();
    if (!s.staff.length) return;
    let paid = 0;
    const leaving = [];
    for (const st of s.staff) {
      const q = this.quirk(st);
      if (g.player.money >= st.wage) {
        g.player.money -= st.wage;
        paid += st.wage;
        st.unpaid = 0;
        st.morale += 1;
      } else {
        st.unpaid += 1;
        st.morale -= 25;
      }
      st.morale += st.assigned ? (q.workaholic ? 0 : -2) : 3;
      st.morale += q.morale || 0;
      st.morale = clamp(st.morale, 0, 100);
      if (st.unpaid >= 2 || st.morale < 15) leaving.push(st);
    }
    if (paid) g.bus.emit('money:changed', { delta: -paid, total: g.player.money });
    if (paid) g.tablet.post('arms', `💼 Payroll: ${paid} obols to ${s.staff.length - leaving.length} staff.`, 'info');
    for (const st of leaving) {
      this.fire(st.id);
      g.tablet.post('arms', `${st.name} quit ${this.def(st.warehouse).name}${st.unpaid >= 2 ? ' — unpaid twice' : ' — morale hit rock bottom'}.`, 'warn');
    }
  }

  // ------------------------------------------------------------ ordering
  partPrice(itemId) {
    const it = this.game.content.items[itemId];
    return Math.max(1, Math.round(it.price * (it.category === 'arms_part' ? this.partsMult() : 1)));
  }

  /** Order parts or equipment from the terminal; delivered to the loading dock in an hour. */
  order(whId, itemId, qty = 1) {
    const g = this.game;
    const it = g.content.items[itemId];
    if (!it || !this.owns(whId)) return { ok: false, text: '' };
    qty = Math.max(1, Math.round(qty));
    const cost = this.partPrice(itemId) * qty;
    if (g.player.money < cost) return { ok: false, text: `${qty}× ${it.name} costs ${cost} obols. You have ${g.player.money}.` };
    g.player.money -= cost;
    g.bus.emit('money:changed', { delta: -cost, total: g.player.money });
    this.state.orders.push({ wh: whId, item: itemId, qty, at: g.clock.total + DELIVERY_MINUTES });
    return { ok: true, text: `Ordered ${qty}× ${it.name} (${cost} obols). Arriving at the loading dock within the hour.` };
  }

  // ----------------------------------------------------------- per minute
  minuteTick() {
    super.minuteTick();
    const g = this.game;
    const s = this.state;
    const now = g.clock.total;
    // deliveries
    if (s.orders.length) {
      const due = s.orders.filter((o) => o.at <= now);
      if (due.length) {
        s.orders = s.orders.filter((o) => o.at > now);
        const by = {};
        for (const o of due) {
          const st = g.world.containers[this.def(o.wh).inBay];
          st.items[o.item] = (st.items[o.item] || 0) + o.qty;
          by[o.wh] = (by[o.wh] || 0) + o.qty;
        }
        for (const [wh, n] of Object.entries(by)) g.tablet.post('arms', `🚚 ${n} item${n === 1 ? '' : 's'} delivered to ${this.def(wh).name}'s loading dock.`, 'info');
      }
    }
    // workers walk to their stations for their shift, and back off it
    for (const st of s.staff) {
      const npc = g.npcs.get(st.id);
      if (!npc || npc.dead) continue;
      const e = st.assigned ? this.findEntity(st.assigned) : null;
      const map = this.def(st.warehouse).map;
      if (e && this.onShift(st) && npc.activity !== 'sleep') {
        const spot = `${map}:st_${e.id}`;
        if (npc.intent?.source !== 'staff' || npc.intent.spot !== spot) {
          npc.intent = { source: 'staff', activity: 'work', spot, until: now + 60, label: `at the ${this.cfg.stations[e.kind].name.toLowerCase()}` };
          npc.activity = 'work';
          npc.arrived = false;
          g.npcSystem.plan(npc);
        } else npc.intent.until = now + 60;
      } else if (npc.intent?.source === 'staff') {
        npc.intent = null;
        g.npcSystem.think(npc, true);
      }
    }
    if (g.clock.minuteOfDay === PAY_MINUTE && s.lastPayDay < g.clock.day) this.payroll();
    if (g.clock.minuteOfDay === PAY_MINUTE - 60 && s.staff.length) {
      const due = s.staff.reduce((a, st) => a + st.wage, 0);
      if (g.player.money < due) g.tablet.post('arms', `⚠ Payroll at 19:00 is ${due} obols and you have ${g.player.money}. Unpaid staff lose morale — twice unpaid and they quit.`, 'warn');
    }
    if (g.clock.minuteOfDay % 60 === 30) this.checkStations();
  }

  // ------------------------------------------------------- tablet alerts
  /** Hourly: tell the tablet about staffed stations that have stalled (once per stall). */
  checkStations() {
    const g = this.game;
    if (!this.alerted) this.alerted = new Map();
    for (const wh of this.ownedIds()) {
      for (const m of this.cells(wh).machines) {
        const st = this.workerAt(m);
        let why = null;
        if (st && m.powered === false) why = 'has no power — build a generator';
        else if (st && this.present(st, m)) {
          if (m.kind === 'lab') why = this.state.research.current ? null : 'is idle — pick a research project';
          else {
            const r = this.recipeOf(m);
            const outTotal = Object.values(m.out || {}).reduce((a, b) => a + b, 0);
            if (!r) why = 'has no recipe set';
            else if (outTotal >= OUTPUT_CAP) why = 'is full — collect its output';
            else if (m.progress === 0 && !Object.entries(r.in).every(([id, n]) => (m.in[id] || 0) >= n)) why = 'is out of parts';
          }
        }
        const key = m.id;
        if (!why) { this.alerted.delete(key); continue; }
        if (this.alerted.get(key) === why) continue;
        this.alerted.set(key, why);
        g.tablet.post('arms', `${this.cfg.stations[m.kind].name} at ${this.def(wh).name} ${why} (${st.shortName} is standing idle).`, 'warn');
      }
    }
  }

  /** At 19:00: what each works made today. */
  dailyReport() {
    const g = this.game;
    const s = this.state;
    const items = g.content.items;
    for (const wh of this.ownedIds()) {
      const made = Object.entries(s.today?.[wh] || {});
      const list = made.map(([id, n]) => `${items[id]?.name} ×${n}`).join(', ');
      const cage = Object.values(g.world.containers[this.def(wh).outCrate]?.items || {}).reduce((a, b) => a + b, 0);
      if (made.length || this.staffOf(wh).length) g.tablet.post('arms', `📊 ${this.def(wh).name} today: ${list || 'nothing made'}. Export cage: ${cage} item${cage === 1 ? '' : 's'}.`, made.length ? 'good' : 'info');
    }
    s.today = {};
  }

  interact(prop) {
    const act = prop.interact;
    if (act.action === 'buy') return this.buyPrompt(act.warehouse);
    if (act.action === 'terminal') {
      if (!this.owns(act.warehouse)) return { type: 'message', text: 'The terminal asks for a password. You don\'t own this works.' };
      return { type: 'terminal', warehouse: act.warehouse };
    }
    if (act.action === 'entity') return this.entityPrompt(prop);
    return { type: 'none' };
  }
}

export { DX, DY };
