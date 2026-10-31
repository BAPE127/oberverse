// What needs doing, and what to do next (v0.90.0): game.corp.todo. Nothing here decides or spends by itself: it reads the same planners the managers
// use (what to reorder, which contract to bid on, which research to start, what to expand into) and adds the plain jobs a farm and a fleet have
// (harvest, plant, sell the crop; send a ship on the best contract), so the OberPad can show them to you as one button each, and gathers every
// decision waiting for you into one inbox. A daily trail of each business's result feeds the little bar charts.
//
//   items(id)      what you could do now at a business: [{ key, icon, title, sub, cost, button }] (at most three; nothing a manager already does for you)
//   run(id, key)   do it, through the service that has always done it; { ok, text }
//   status(id)     { dot: 'g' | 'a' | 'r', text }   two words, and a colour
//   tiles(id)      three figures for the business screen
//   monthNet(id) / trail(id)   this month's result so far, and the last days'
//   inbox()        every decision waiting for you: [{ key, icon, title, sub, amount, yes: { label, run }, no: { label, run } | null }]
//
// State: world.corp.trail = { [business]: { m, net, days: [ ... up to 14 daily results ] } }, written once a day (no random numbers).
import { autoReserve } from '../corp/management.js';

const BUSINESSES = ['arms', 'shipping', 'aerospace', 'farming'];
const MAXITEMS = 3;
const TRAIL = 14;

export class Todo {
  constructor(corp) { this.K = corp; }
  get g() { return this.K.game; }
  get M() { return this.K.management; }
  get Pe() { return this.K.personnel; }
  get day() { return this.g.clock.day; }
  peek() { return this.K.state.trail || null; }

  // ------------------------------------------------------------- the results
  regOf(id) { return this.K.registry().find((r) => r.playerId === id) || null; }
  monthNet(id) {
    const reg = this.regOf(id);
    if (!reg) return 0;
    const cur = Math.floor((this.day - 1) / 30);
    return Math.round(this.K.rowsOf(reg).rows.find((r) => r.m === cur)?.net ?? 0);
  }

  /** Once a day: how much better or worse this month's result is than yesterday's, per business. */
  dailyTick() {
    if (!BUSINESSES.some((id) => this.K.established(id))) return;
    const st = (this.K.state.trail ||= {});
    const cur = Math.floor((this.day - 1) / 30);
    for (const id of BUSINESSES) {
      if (!this.K.established(id)) continue;
      const net = this.monthNet(id);
      const t = (st[id] ||= { m: cur, net, days: [] });
      if (t.last === this.day) continue;
      t.days.push(Math.round(t.m === cur ? net - t.net : net));
      while (t.days.length > TRAIL) t.days.shift();
      t.m = cur; t.net = net; t.last = this.day;
    }
  }

  trail(id, n = 7) { return (this.peek()?.[id]?.days || []).slice(-n); }

  // ------------------------------------------------------------- who already does it
  /** The manager at work for this business who has the box for it ticked, or null. */
  handled(id, kind) {
    const x = this.Pe.holders(id, 'manager')[0];
    return x && this.M.atWork(x) && this.Pe.may(x, kind) ? x : null;
  }

  // ------------------------------------------------------------- what to do next
  items(id) {
    if (!this.K.established(id)) return [];
    const out = [];
    const M = this.M; const g = this.g;
    const money = (n) => `${Math.round(n).toLocaleString('en-US')}`;
    const planned = (kind, make) => { if (this.handled(id, kind)) return; const c = M.candidates(kind, id)[0]; if (c) out.push(make(c)); };
    if (id === 'arms' || id === 'aerospace') planned('reorder', (c) => ({ key: 'reorder', icon: '🛒', title: id === 'arms' ? 'Order parts' : `Buy ${M.planAero().length} material${M.planAero().length === 1 ? '' : 's'}`, sub: `What is running short · ${money(c.cost)}`, cost: c.cost, button: 'Buy' }));
    if (id === 'aerospace') planned('bid', (c) => ({ key: 'bid', icon: '📄', title: 'A contract worth bidding on', sub: `${money(c.price)} · about ${money(c.profit)} profit`, cost: 0, button: 'Bid' }));
    if (id === 'arms' || id === 'aerospace') planned('research', (c) => ({ key: 'research', icon: '🔬', title: `Research ${c.desc}`, sub: c.cost ? `${money(c.cost)}` : 'Free to start', cost: c.cost, button: 'Start' }));
    if (id === 'shipping') {
      const o = this.sendable();
      if (o) out.push({ key: 'send', icon: '🚢', title: `Send the ${o.vessel.name}`, sub: `${g.logistics.cfg.clients[o.contract.client].name} · about ${money(o.quote.profit)} profit`, cost: o.quote.cost, button: 'Send' });
    }
    if (id === 'farming') out.push(...this.farmItems());
    planned('expand', (c) => ({ key: 'expand', icon: '🏗️', title: `Expand: ${c.desc}`, sub: `${money(c.cost)}`, cost: c.cost, button: 'Buy' }));
    return out.slice(0, MAXITEMS);
  }

  /** The best contract an idle ship could take right now: one still open to accept (or already accepted), most profit first. */
  sendable() {
    const L = this.g.logistics; const now = this.g.clock.total;
    return L.opportunities(8).find((o) => o.contract.status === 'accepted' || o.contract.deadline > now) || null;
  }

  /** Harvest what is ready, plant what is tilled (if you hold the seed), till what lies fallow, sell the crop you carry. */
  farmItems() {
    const F = this.g.farm; const g = this.g;
    const out = [];
    const rows = F.owned().map((id) => ({ id, st: F.plot(id), d: F.plotDef(id) })).filter((x) => x.d);
    for (const { id, st, d } of rows) if (st.state === 'planted' && st.stage >= 3) out.push({ key: `harvest:${id}`, icon: '🌾', title: `Harvest ${d.name}`, sub: `About ${F.expectedYield(id)} ${F.def.crops[st.crop].name.toLowerCase()} · ${Math.round(F.workPlan(id).minutes / 60)} h`, cost: 0, button: 'Harvest' });
    for (const { id, st, d } of rows) {
      if (st.state !== 'tilled') continue;
      const a = F.actions(id).find((x) => x.action === 'plant' && x.ok);
      if (a) out.push({ key: `plant:${id}:${a.crop}`, icon: '🌱', title: `Plant ${F.def.crops[a.crop].name.toLowerCase()} on ${d.name}`, sub: `${F.seedBags(id, a.crop)} bags of seed · ready in ${F.def.crops[a.crop].days} days`, cost: 0, button: 'Plant' });
    }
    for (const { id, st, d } of rows) if (st.state === 'fallow') out.push({ key: `till:${id}`, icon: '🚜', title: `Till ${d.name}`, sub: `${Math.round(F.workPlan(id).minutes / 60)} h of work`, cost: 0, button: 'Till' });
    for (const c of Object.values(F.def.crops)) {
      const n = g.inventory.count(c.crop);
      if (n > 0) out.push({ key: `sell:${c.crop}`, icon: '💰', title: `Sell ${n} ${g.content.items[c.crop].name.toLowerCase()}`, sub: `The Co-op pays about ${(F.coopPrice(c.crop) * n).toLocaleString('en-US')}`, cost: 0, button: 'Sell' });
    }
    return out;
  }

  /** Do one of them now. Re-planned at the moment you press, so what is done is what is needed now. */
  run(id, key) {
    const g = this.g; const M = this.M;
    const [what, a, b] = String(key).split(':');
    if (['reorder', 'bid', 'research', 'expand'].includes(what)) return M.doNow(what, id);
    if (what === 'send') {
      const L = g.logistics; const o = this.sendable();
      if (!o) return { ok: false, text: 'Nothing to send right now.' };
      if (o.contract.status === 'available') { const r = L.accept(o.contract.id); if (!r.ok) return r; }
      return L.assign(o.contract.id, o.vessel.id);
    }
    if (what === 'harvest' || what === 'till') return g.farm.work(a, what);
    if (what === 'plant') return g.farm.work(a, 'plant', b);
    if (what === 'sell') return g.farm.sellAtCoop(a, g.inventory.count(a));
    return { ok: false, text: 'No such job.' };
  }

  // ------------------------------------------------------------- how a business is
  /** Two words and a colour: red for a loan behind, amber for something short, green for running. */
  status(id) {
    const K = this.K;
    if (!K.established(id)) return { dot: 'r', text: 'Not yours' };
    if (K.business.inArrears(id)) return { dot: 'r', text: 'Behind on a loan' };
    const short = this.shortage(id);
    if (short) return { dot: 'a', text: short };
    const a = K.account(id);
    if (a.funded && a.cash < autoReserve(K.group.runningPerDay(id))) return { dot: 'a', text: 'Low on cash' };
    return { dot: 'g', text: 'Running' };
  }

  /** What is short, if anything: parts at the arms works, materials at the aerospace firm. */
  shortage(id) {
    const M = this.M;
    if (id === 'arms') { const n = M.planArms().length; return n ? `Short of ${n} part${n === 1 ? '' : 's'}` : null; }
    if (id === 'aerospace') { const A = this.g.aero; const n = A.owned ? new Set(A.shortfalls(A.roost).map((s) => s.material)).size : 0; return n ? `Short of ${n} part${n === 1 ? '' : 's'}` : null; }
    return null;
  }

  tiles(id) {
    const g = this.g;
    if (id === 'arms') return [{ n: g.arms.ownedIds().length, t: 'works' }, { n: g.arms.state.staff.length, t: 'staff' }, { n: g.market.state.shipments.length, t: 'at sea' }];
    if (id === 'shipping') { const vs = g.logistics.vessels().filter((v) => v.status !== 'lost'); return [{ n: vs.length, t: 'ships' }, { n: vs.filter((v) => v.status === 'underway').length, t: 'at sea' }, { n: g.logistics.ownedPorts().length, t: 'ports' }]; }
    if (id === 'aerospace') { const A = g.aero; return [{ n: A.contractsOf(A.roost, 'active').length, t: 'contracts' }, { n: new Set(A.shortfalls(A.roost).map((s) => s.material)).size, t: 'parts short' }, { n: A.openTenders().length, t: 'open tenders' }]; }
    const F = g.farm; const owned = F.owned();
    return [{ n: owned.length, t: 'plots' }, { n: owned.filter((p) => F.plot(p).state === 'planted' && F.plot(p).stage >= 3).length, t: 'ready' }, { n: owned.filter((p) => F.plot(p).state === 'fallow').length, t: 'fallow' }];
  }

  // ------------------------------------------------------------- the inbox
  inbox() {
    const K = this.K; const M = this.M; const Pe = this.Pe;
    const out = [];
    const money = (n) => `${Math.round(n).toLocaleString('en-US')}`;
    for (const q of M.peek()?.pending || []) {
      const who = Pe.person(q.actor)?.first || 'A manager';
      out.push({ key: `req:${q.id}`, icon: '🙋', title: `${who} would like to ${M.verb(q.kind)}`, sub: `${Pe.employerName(q.employer)}${q.desc ? ` · ${q.desc}` : ''}`, amount: q.cost || 0,
        yes: { label: 'Yes', run: () => M.approve(q.id) }, no: { label: 'No', run: () => M.decline(q.id) } });
    }
    for (const l of K.lending.loans().filter((x) => x.arrears > 0)) out.push({ key: `loan:${l.id}`, icon: '🏦', title: 'You are behind on a loan', sub: 'Lariat State Bank · nothing is taken from you', amount: l.arrears, yes: { label: 'Pay now', run: () => K.lending.repay(l.id, l.arrears) }, no: null });
    for (const id of BUSINESSES) {
      if (!K.established(id)) continue;
      for (const l of K.business.loans(id).filter((x) => x.arrears > 0)) out.push({ key: `bloan:${l.id}`, icon: '🏦', title: `${Pe.employerName(id)} is behind on a loan`, sub: 'Lariat State Bank', amount: l.arrears, yes: { label: 'Pay now', run: () => K.business.repay(l.id, l.arrears) }, no: null });
      const short = this.shortage(id);
      if (short && !this.handled(id, 'reorder')) { const c = M.candidates('reorder', id)[0]; if (c) out.push({ key: `short:${id}`, icon: '🛒', title: `${Pe.employerName(id)}: ${short.toLowerCase()}`, sub: `Order what is needed · ${money(c.cost)}`, amount: c.cost, yes: { label: 'Buy', run: () => M.doNow('reorder', id) }, no: null }); }
    }
    return out.slice(0, 8);
  }
}
