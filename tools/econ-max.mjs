// What a fully built business makes (v0.91.4), to set beside the starter figures of tools/econ-audit.mjs.
// Each business is built out as far as the game allows, given a manager, run in for a few days and then measured over 5 days.
//   node tools/econ-max.mjs aerospace|shipping|arms|farming   (env KNOBS as in econ-audit.mjs, env DAYS for the measured window, default 5)
import { newGame } from '../tests/helpers.mjs';
import { INCOME } from '../src/content/income.js';
import { OPS } from '../src/content/operations.js';

for (const [path, v] of Object.entries(JSON.parse(process.env.KNOBS || '{}'))) {
  const parts = path.split('.'); let o = parts[0] === 'ops' ? OPS : INCOME; if (parts[0] === 'ops') parts.shift();
  while (parts.length > 1) o = o[parts.shift()];
  o[parts[0]] = v;
}
const which = process.argv[2] || 'aerospace';
const WINDOW = Number(process.env.DAYS || 5);
const SETTLE = Number(process.env.SETTLE || 8);
const seed = Number(process.env.SEED || 4242);
const chk = (r, what) => { if (!r?.ok) throw new Error(`${what}: ${r?.text}`); return r; };
const DAY = 1440;
const CAPEX = ['machines', 'ship', 'port', 'works', 'land', 'capital', 'equipment', 'transfer', 'hall', 'facility', 'animals', 'fencing', 'hiring', 'loan', 'refund', 'deposit', 'internal', 'grant'];

const g = newGame(seed); g.player.money = 5e9;
const id = which;

function flows(a) {
  const t = { in: {}, out: {} };
  for (const m of Object.values(a.months)) { for (const [k, v] of Object.entries(m.in)) t.in[k] = (t.in[k] || 0) + v; for (const [k, v] of Object.entries(m.out)) t.out[k] = (t.out[k] || 0) + v; }
  return t;
}
const net = (a, b) => {
  let rev = 0; let cost = 0; const cats = { in: {}, out: {} };
  for (const [k, v] of Object.entries(b.in)) { const d = v - (a.in[k] || 0); if (!CAPEX.includes(k) && d) { rev += d; cats.in[k] = Math.round(d); } }
  for (const [k, v] of Object.entries(b.out)) { const d = v - (a.out[k] || 0); if (!CAPEX.includes(k) && d) { cost += d; cats.out[k] = Math.round(d); } }
  return { rev: Math.round(rev), cost: Math.round(cost), net: Math.round(rev - cost), cats };
};
const skip = (days) => { for (let i = 0; i < days; i++) g.skipTime(DAY); };

if (id === 'aerospace') {
  chk(g.aero.buyFirm(), 'firm');
  g.corp.ensureWorld(); chk(g.corp.group.form(), 'form'); chk(g.corp.group.join('aerospace'), 'join'); chk(g.corp.contribute('parent', 2e9), 'parent'); chk(g.corp.group.capitalise('aerospace', 1.5e9), 'cap');
  const A = g.aero; const co = A.roost;
  for (const c of A.contractsOf(co, 'active')) A.cancelContract('roost', c.id);
  g.aero.roost.autoProcure = true;
  // every hall, then every bay its slots take, then the research and the crew
  for (const hid of Object.keys(A.cfg.halls)) if (!A.cfg.halls[hid].owned) chk(A.buildHall(co, hid), 'hall ' + hid);
  skip(14);
  const want = { h1_a: 'light', h2_a: 'light', h2_b: 'light', hh_a: 'heavy', hh_b: 'heavy', hw_a: 'wide', hw_b: 'secure', hx_a: 'secure', hx_b: 'secure', hs_a: 'rocket', hs_b: 'clean', hs_c: 'clean' };
  for (const [slot, type] of Object.entries(want)) { if (co.bays.some((b) => b.slot === slot)) continue; const r = A.buildBay(co, type, slot); if (!r.ok) console.log('bay', slot, r.text); }
  for (const r of Object.keys(A.cfg.research)) if (!co.research.includes(r)) co.research.push(r);
  for (const f of Object.keys(A.cfg.facilities)) if (f !== 'apron' && !co.facilities[f]) A.buildFacility(co, f);
  skip(10);
  co.training = 'intensive';
  const hireTo = () => { for (const role of ['tech', 'engineer', 'inspector']) { const n = A.staffNeeded(co, role) - A.staffCount(co, role); if (n > 0) A.hire(co, n, role); } };
  hireTo();
  chk(g.corp.personnel.hire('manager', 'aerospace'), 'manager').person.startDay = 1;
  // each aircraft bay builds, on its own, the plane that earns most a day there
  const setAuto = () => { for (const b of co.bays) if (b.ready <= A.now && !b.auto) { const options = A.bayProducts(co, b).map((pid) => { const p = A.cfg.products[pid]; return { pid, v: p.price / p.days }; }).sort((x, y) => y.v - x.v); if (options.length) A.setBayAuto(co, b.id, options[0].pid); } };
  setAuto();
  console.log('bays', co.bays.map((b) => `${b.id}:${b.auto || '-'}`).join(' '));
  console.log('crew', co.workforce, 'of', A.staffNeeded(co, 'tech'), '| engineers', co.engineers, '| inspectors', co.inspectors);
  const t0 = () => flows(g.corp.account('aerospace'));
  skip(SETTLE); hireTo(); setAuto();
  const a = t0(); skip(WINDOW); const b = t0();
  const r = net(a, b);
  console.log(`aerospace, fully built: ${WINDOW} days → revenue ${r.rev.toLocaleString()}, costs ${r.cost.toLocaleString()}, NET ${r.net.toLocaleString()}`, JSON.stringify(r.cats));
  console.log('stock sold', co.stats.stock, 'delivered', co.stats.delivered);
}

if (id === 'shipping') {
  chk(g.logistics.buyCompany(), 'company');
  g.corp.ensureWorld(); chk(g.corp.group.form(), 'form'); chk(g.corp.group.join('shipping'), 'join'); chk(g.corp.contribute('parent', 2e9), 'parent'); chk(g.corp.group.capitalise('shipping', 1.5e9), 'cap');
  const L = g.logistics;
  const PORTS = (process.env.PORTS || 'port_lanternside,port_gullwing,port_kingsfjord,port_lirre,port_ostmark,port_varn').split(',');
  for (const p of PORTS) chk(L.buyPort(p), 'port ' + p);
  const SHIPS = Number(process.env.SHIPS || 8);
  const model = process.env.MODEL || 'bluecap_container';
  const owned = L.ownedPorts();
  for (let i = 0; i < SHIPS; i++) chk(L.buyShip(model, owned[i % owned.length], `Max ${i + 1}`), 'ship ' + i);
  chk(g.corp.personnel.hire('manager', 'shipping'), 'manager').person.startDay = 1;
  console.log('ports', owned.length, 'ships', L.vessels().length);
  g.clock.total = Math.floor(g.clock.total / DAY) * DAY + 6 * 60;
  const t0 = () => flows(g.corp.account('shipping'));
  skip(SETTLE);
  const a = t0(); skip(WINDOW); const b = t0();
  const r = net(a, b);
  console.log(`shipping, fully built (${owned.length} ports, ${SHIPS} × ${model}): ${WINDOW} days → revenue ${r.rev.toLocaleString()}, costs ${r.cost.toLocaleString()}, NET ${r.net.toLocaleString()}`, JSON.stringify(r.cats));
}
