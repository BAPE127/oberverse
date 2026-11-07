// The commander's briefing (v0.103.4): what the command terminal's Overview, top bar and feeds show, read from the real records and never written. It touches only the company, the
// war record's log and the world's geopolitical events; it does not call anything that advances the war (W.strategic() does), so opening the terminal moves nothing.
import { peekMilitary } from './state.js';
import { CLASSES } from '../content/troops.js';
import { view as contractsView } from './contracts.js';
import { view as engagementsView } from './engagements.js';
import { view as facilityView, capacity } from './facilities.js';
import { view as baseView } from './base.js';
import { view as linkView } from './link.js';
import { ordersView } from './procurement.js';

const company = (g) => peekMilitary(g)?.company || null;
const RISK = (p) => (p == null ? null : p >= 0.7 ? 'low' : p >= 0.45 ? 'medium' : 'high');

/** The company's missions in one list: security contracts, engagements, and battalions standing in a theatre. */
export function missions(g) {
  const C = company(g); if (!C?.identity) return { open: [], active: [], done: [], failed: [], archived: [] };
  const ct = contractsView(g); const eg = engagementsView(g); const w = peekMilitary(g)?.war;
  const open = []; const active = []; const done = []; const failed = []; const archived = [];
  for (const c of ct.open) open.push({ kind: 'contract', id: c.id, title: c.title, place: c.place || c.clientName, type: 'Security contract', client: c.clientName, priority: c.risk, text: c.text, pay: c.pay, days: c.days, expires: c.expires, needs: `${c.guards} guards`, lacks: c.lacks, raw: c });
  for (const c of ct.active) active.push({ kind: 'contract', id: c.id, title: c.title, place: c.place || c.clientName, type: 'Security contract', client: c.clientName, status: 'In progress', forces: `${c.guards} guards`, daysLeft: c.daysLeft, risk: RISK(c.chance), chance: c.chance, pay: c.pay, text: c.text, raw: c });
  for (const c of ct.done) (c.state === 'done' ? done : c.state === 'failed' ? failed : archived).push({ kind: 'contract', id: c.id, title: c.title, place: c.place || c.clientName, type: 'Security contract', client: c.clientName, day: c.ended ?? c.end, pay: c.pay, state: c.state, text: c.text, raw: c });
  for (const e of eg.open) open.push({ kind: 'engagement', id: e.id, title: e.title, place: e.place, type: `Engagement · ${e.kind}`, client: e.client, priority: e.days <= 3 ? 'urgent' : 'routine', text: e.text, pay: e.pay, days: e.days, expires: e.expires, needs: `${e.needs.troops} soldiers${e.needs.tanks ? `, ${e.needs.tanks} tanks` : ''}`, raw: e });
  for (const e of eg.active) active.push({ kind: 'engagement', id: e.id, title: e.title, place: e.place, type: `Engagement · ${e.kind}`, client: e.client, status: e.state === 'tactical' ? 'Engaged (played)' : 'In progress', forces: `${e.order?.squads?.length || 0} squads${e.order?.generalName ? ` · ${e.order.generalName}` : ''}`, daysLeft: e.daysLeft, pay: e.pay, text: e.text, raw: e });
  for (const e of eg.done) (!e.result ? archived : e.result.objectives >= 1 || e.strategic ? done : failed).push({ kind: 'engagement', id: e.id, title: e.title, place: e.place, type: `Engagement · ${e.kind}`, client: e.client, day: e.ended, pay: e.result?.paid ?? 0, state: e.result?.outcome, text: e.text, raw: e });
  for (const b of w?.battalions || []) if (b.status !== 'home') active.push({ kind: 'battalion', id: b.id, title: b.name, place: b.pos, type: 'Battalion in a theatre', status: { deploying: 'Awaiting deployment', theatre: b.engaged ? 'Engaged' : 'In the theatre', returning: 'Awaiting extraction' }[b.status] || b.status, forces: `${b.squads.length} squads`, raw: b });
  return { open, active, done, failed, archived };
}

const FAC_OK = (f) => f.state === 'built';
/** The company at a glance: every figure is a count of real records. */
export function briefing(g) {
  const C = company(g); if (!C?.identity) return null;
  const alive = C.personnel.filter((p) => p.status !== 'dead');
  const troops = alive.filter((p) => CLASSES[p.role]?.group === 'troop');
  const fac = facilityView(g); const B = baseView(g); const M = missions(g);
  const veh = C.equipment.filter((x) => ['vehicle', 'helicopter'].includes(x.kind)); const air = C.equipment.filter((x) => x.kind === 'aircraft' || x.kind === 'missile');
  const ready = (list) => list.filter((x) => x.status !== 'destroyed');
  const built = fac.filter(FAC_OK); const damaged = fac.filter((f) => ['damaged', 'ruin', 'destroyed'].includes(f.gate) || f.state === 'ruin');
  const L = linkView(g); const orders = ordersView(g);
  const short = L ? L.rows.filter((r) => r.want && r.have < r.want) : [];
  const w = peekMilitary(g)?.war;
  const online = Boolean(C.licensed && C.lot.owned);
  return {
    name: C.identity.name, funds: g.corp.cashOf?.('security') ?? 0, licensed: C.licensed, lot: C.lot.owned,
    status: !C.licensed ? 'Unlicensed' : !C.lot.owned ? 'No base yet' : !built.length ? 'Base under construction' : M.active.length ? 'On operations' : 'Standing by',
    personnel: { total: alive.length, available: alive.filter((p) => p.status === 'active' && p.assignedTo == null && !p.post).length, training: alive.filter((p) => p.status === 'training').length, wounded: alive.filter((p) => p.status === 'wounded').length, troops: troops.length, squads: C.squads.length },
    missions: { active: M.active.length, done: M.done.length, failed: M.failed.length, open: M.open.length },
    readiness: B.readiness, vehicles: { total: veh.length, ready: ready(veh).length, lost: veh.length - ready(veh).length }, aircraft: { total: air.length, ready: ready(air).length },
    base: { built: built.length, total: fac.length, damaged: damaged.length, building: fac.filter((f) => ['permit', 'foundation', 'frame', 'fitted'].includes(f.state)).map((f) => ({ id: f.id, name: f.name, state: f.state, daysLeft: f.daysLeft })), protectedBase: peekMilitary(g)?.protection?.baseProtected !== false, online, beds: capacity(g).beds, shortages: B.short },
    supply: { short: short.length, shortRows: short.map((r) => r.name), levels: L ? L.rows.filter((r) => r.want).length : 0, held: Object.values(C.stock).reduce((a, b) => a + b, 0) },
    orders: { pending: orders.pending.length, transit: orders.transit.length },
    production: (C.lines || []).filter((l) => l.unit).length, productionQueue: (C.production || []).length,
    battalions: (w?.battalions || []).length, employer: w?.employer ? { side: w.employer.side, enemy: w.employer.enemy, theatre: w.employer.theatre } : null,
  };
}

/** What happened lately, newest first, from the records the game already keeps: the company log, the supply link, procurement, internal moves, the war log and contract offers. */
export function activity(g, limit = 40) {
  const C = company(g); if (!C?.identity) return [];
  const out = [];
  for (const e of C.log || []) out.push({ day: e.day, text: e.text, tag: 'company' });
  for (const e of C.link?.log || []) out.push({ day: e.day, text: e.text, tag: 'supply' });
  for (const o of C.orders || []) { out.push({ day: o.placed, text: `Ordered ${o.lines.reduce((a, l) => a + l.qty, 0)} items from ${o.supplierName} (${o.total.toLocaleString('en-US')} obols).`, tag: 'procurement' }); if (o.state === 'delivered') out.push({ day: o.deliveredDay ?? o.due, text: `Order ${o.id} from ${o.supplierName} delivered.`, tag: 'procurement' }); }
  for (const t of peekMilitary(g)?.transfers || []) out.push({ day: t.day, text: `${t.qty} × ${t.name} moved ${t.status === 'returned' ? 'back to' : 'from'} ${String(t.status === 'returned' ? t.to : t.from).replace('arms:', 'Arms works ').replace('aerospace', 'Aerospace')} (no charge).`, tag: 'logistics' });
  for (const e of peekMilitary(g)?.war?.log || []) out.push({ day: e.day, text: e.text, tag: 'theatre' });
  return out.sort((a, b) => b.day - a.day).slice(0, limit);
}

/** The world's developments, newest first: recorded wars and embargoes with their timelines, and the geopolitical log. */
export function worldFeed(g, limit = 30) {
  const geo = g.corp?.geo?.peek?.(); if (!geo) return [];
  const out = [];
  for (const e of geo.events || []) for (const t of e.timeline || []) out.push({ day: t.day, text: t.text, kind: e.kind, id: e.id });
  for (const l of geo.log || []) out.push({ day: l.day, text: l.text, kind: 'log' });
  const seen = new Set();
  return out.sort((a, b) => b.day - a.day).filter((x) => { const k = `${x.day}|${x.text}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
}
