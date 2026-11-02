// A headless audit of what each business makes (v0.91.1). Each business is built alone in its own game (so they do not share ships or cash), given a manager and
// run for a number of days; the audit prints what came in and went out by category and the profit a day. Usage:
//   node tools/econ-audit.mjs [days] [seed] [business]      (business: arms | shipping | aerospace | farming; default: all four, one after the other)
//   env CRATES=n   the arms line's output in crates a day (default 6: one assembly bench fed by a lathe)
import { newGame } from '../tests/helpers.mjs';
import { runCommand } from '../src/game/debugCommands.js';
const days = Number(process.argv[2] || 24), seed = Number(process.argv[3] || 4242);
const only = process.argv[4];
const chk = (r, what) => { if (!r?.ok) throw new Error(`${what}: ${r?.text}`); return r; };
const CRATES = Number(process.env.CRATES || 6);

function build(id) {
  const g = newGame(seed); g.player.money = 80e6;
  let AB = null;
  if (id === 'arms') {
    chk(g.arms.buyLicence(), 'licence'); chk(g.arms.buy('aw1'), 'works');
    runCommand(g, 'works aw1'); g.changeMap('aw1', 'entry'); runCommand(g, 'stations');
    // the starter line: one assembly bench on pistols, belted to the export cage; the lathes that would feed it are stood in for by the morning's delivery of components (costed below)
    AB = g.arms.place('aw1', 'item_st_assembly', 10, 5).entity; g.arms.setRecipe(AB.id, 'pistol');
    chk(g.arms.place('aw1', 'item_inserter', 12, 5, 0), 'ins'); for (let x = 13; x <= 26; x++) chk(g.arms.place('aw1', 'item_belt', x, 5, x === 26 ? 3 : 0), 'belt'); g.inventory.add('item_belt', 2);
    chk(g.arms.place('aw1', 'item_belt', 26, 4, 3), 'b4'); chk(g.arms.place('aw1', 'item_belt', 26, 3, 3), 'b3');
    runCommand(g, 'hire aw1'); g.arms.autoAssign('aw1');
  }
  if (id === 'shipping') chk(g.logistics.buyCompany(), 'shipping');
  if (id === 'aerospace') chk(g.aero.buyFirm(), 'aero');
  if (id === 'farming') for (const p of ['plot_east_1', 'plot_east_2', 'plot_east_3']) chk(g.farm.buy(p), p);
  g.corp.ensureWorld(); g.market.state; chk(g.corp.group.form(), 'form');
  chk(g.corp.group.join(id), 'join ' + id); chk(g.corp.contribute('parent', 3_000_000), 'parent'); chk(g.corp.group.capitalise(id, 600000), 'cap ' + id);
  if (id === 'aerospace') g.aero.roost.autoProcure = false;
  const r = g.corp.personnel.hire('manager', id); chk(r, 'hire ' + id); r.person.startDay = 1;
  return { g, AB };
}

function audit(id) {
  const { g, AB } = build(id);
  const a = g.corp.account(id); const start = a.cash;
  let componentCost = 0;
  g.clock.total = 6 * 60; g.world.lastHour = 6;
  for (let i = 0; i < days * 1440; i++) {
    if (AB && i % 1440 === 0) { // the morning's components for CRATES crates (5 receivers, 5 barrels, 5 furniture a crate), paid from the arms account at half price
      const cost = Math.round(CRATES * (5 * 17 + 5 * 12 + 5 * 8) * 0.5);
      if (g.corp.canAfford('arms', cost)) { g.corp.pay('arms', cost, { cat: 'parts' }); componentCost += cost; g.arms.findEntity(AB.id).in = { item_ai_receiver: CRATES * 5, item_ai_barrel: CRATES * 5, item_ai_furniture: CRATES * 5 }; }
    }
    g.update(1, { x: 0, y: 0 });
  }
  const tot = { in: {}, out: {} };
  for (const m of Object.values(a.months)) { for (const [k, v] of Object.entries(m.in)) tot.in[k] = (tot.in[k] || 0) + v; for (const [k, v] of Object.entries(m.out)) tot.out[k] = (tot.out[k] || 0) + v; }
  const revenue = Object.entries(tot.in).filter(([k]) => !['transfer', 'loan', 'refund', 'deposit', 'internal', 'grant'].includes(k)).reduce((s, [, v]) => s + v, 0);
  const opex = Object.entries(tot.out).filter(([k]) => !['machines', 'ship', 'port', 'works', 'land', 'capital', 'equipment', 'transfer', 'hall', 'facility', 'animals', 'fencing', 'hiring'].includes(k)).reduce((s, [, v]) => s + v, 0);
  return { id, revenue: Math.round(revenue), opex: Math.round(opex), profitPerDay: Math.round((revenue - opex) / days), cash: Math.round(a.cash - start), in: tot.in, out: tot.out };
}

const rows = (only ? [only] : ['aerospace', 'shipping', 'arms', 'farming']).map(audit);
for (const o of rows) console.log(o.id.padEnd(10), 'revenue', String(o.revenue).padStart(9), 'costs', String(o.opex).padStart(9), 'profit/day', String(o.profitPerDay).padStart(7), '\n   in ', JSON.stringify(o.in), '\n   out', JSON.stringify(o.out));
if (!only) console.log('\norder by profit a day:', [...rows].sort((a, b) => b.profitPerDay - a.profitPerDay).map((o) => `${o.id} ${o.profitPerDay}`).join(' > '));
