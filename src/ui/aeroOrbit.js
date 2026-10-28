// The Orbit page of the aerospace terminal (v0.59.0): your satellites and what they sell — the
// Earth turning under them, a card for each market (what your network carries, what the market
// wants and who else is selling), what one more satellite would earn, the fleet and its health,
// the satellites you keep working for customers, and the policies (insurance, replacements).
// Everything it shows comes from src/aero/fleet.js through the system; everything it does goes
// through the system's checked methods.
import { drawOrbitView } from '../engine/drawOrbit.js';
import { daysLeft } from '../aero/orbit.js';
import { fmtMoney, missingTech } from '../aero/catalog.js';
import { satelliteCanvas } from '../engine/drawAero.js';

const bar = (h, frac, colour, title) => h('div', { class: 'ao-meter', title }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%;background:${colour}` }));

export function orbitPage(env) {
  const { A, C, g, h, btn, kpi, section, muted, pill, act, refresh, COL, AO, co } = env;
  const c = co();
  const S = C.services;
  const rows = A.networkReport(c);
  const fleet = A.fleetOf(c);
  const live = fleet.live;
  const supportedLive = fleet.supported.filter((s) => s.status === 'operational' || s.status === 'degraded');
  const estNetwork = rows.reduce((a, r) => a + r.sold.revenue, 0);
  const estFees = supportedLive.reduce((a, s) => a + Math.round(s.price * S.support.rate * (s.capability ?? 1)), 0);
  const estOps = Math.round(([...live, ...supportedLive].reduce((a, s) => a + (s.opex || 0), 0) + (live.length ? S.centre.cost : 0)) * Math.max(0.3, 1 + c.research.reduce((a, id) => a + (C.research[id]?.effect?.opsCost || 0), 0)));
  const book = live.reduce((a, s) => a + (s.book || 0), 0);

  // ---------------------------------------------------------------- the picture
  const canvas = h('canvas', { class: 'ao-orbit', width: 1500, height: 560 });
  const own = new Set(live.map((s) => s.id));
  const show = [...live, ...supportedLive, ...Object.values(A.state.satellites).filter((s) => !s.own && s.manufacturer !== c.id && (s.status === 'operational' || s.status === 'degraded')).slice(0, 14)];
  const station = C.aero.station || { lat: 41, lon: 18 };
  const t0 = performance.now();
  const loop = () => {
    if (!canvas.isConnected) return;
    const t = (performance.now() - t0) / 1000;
    // time moves a little faster than it does in the world, so the sky is never still
    drawOrbitView(canvas.getContext('2d'), canvas.width, canvas.height, { sats: show, now: A.now + t * 5, S, station, own, t });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ---------------------------------------------------------------- the markets
  const marketCard = (r) => {
    const R = r.def;
    const buildable = Object.entries(C.products).filter(([, p]) => p.line === 'satellite' && Object.keys(p.service || {})[0] === r.role);
    const best = buildable.find(([, p]) => A.canBuild(c, p));
    const need = !best && buildable[0] ? missingTech(C, c, buildable[0][1]).map((id) => C.research[id].name).join(', ') : null;
    const sel = AO.orbitRole === r.role;
    const mult = r.mult !== 1 ? pill(`${r.mult > 1 ? '▲' : '▼'} ${Math.round(Math.abs(r.mult - 1) * 100)}% for now`, r.mult > 1 ? COL.green : COL.red) : null;
    return h('div', { class: `ao-card orbit${sel ? ' sel' : ''}${r.net.n ? '' : ' off'}`, style: `--role:${R.colour}` },
      h('div', { class: 'ao-card-head' }, h('span', { class: 'ao-role-icon' }, R.icon), h('div', { class: 'grow' }, h('b', {}, R.name), h('small', {}, `${r.net.n} satellite${r.net.n === 1 ? '' : 's'}${r.net.n ? ` · covers ${Math.round(r.net.coverage * 100)}% of a full network (${R.full})` : ` · a full network is ${R.full}`}`)), mult),
      r.barred ? h('div', { class: 'ao-alert' }, 'Needs a secure hall and clearance.') : null,
      h('div', { class: 'ao-kv' }, h('span', {}, 'You carry'), h('b', {}, `${r.net.capacity.toFixed(r.net.capacity < 10 ? 1 : 0)} ${R.unit}`)),
      bar(h, r.net.coverage, R.colour, 'coverage'),
      h('div', { class: 'ao-kv' }, h('span', {}, 'Market wants'), h('b', {}, `${r.market.demand.toFixed(r.market.demand < 10 ? 1 : 0)} ${R.unit}`), h('span', {}, `· others carry ${r.market.rivals.toFixed(r.market.rivals < 10 ? 1 : 0)}`)),
      h('div', { class: 'ao-kv' }, h('span', {}, 'Selling'), h('b', {}, r.net.n ? `${Math.round(r.sold.utilisation * 100)}% of what you carry` : '—'), h('span', {}, `at ${Math.round(r.sold.price).toLocaleString()} a ${R.unit.replace(/s$/, '')}`)),
      h('div', { class: 'ao-kv big' }, h('span', {}, 'Takes, a day'), h('b', { class: r.sold.revenue ? 'pos' : '' }, r.sold.revenue ? fmtMoney(r.sold.revenue) : '—')),
      h('p', { class: 'ao-muted small' }, R.text),
      best || sel ? btn(sel ? 'Hide the order sheet' : 'Order satellites ›', () => { AO.orbitRole = sel ? null : r.role; AO.scrollTo = sel ? null : '.ordersheet'; refresh(); }, sel ? '' : 'primary') : h('small', { class: 'neg' }, need ? `Needs ${need}` : 'Not yet buildable: research it first, and a clean room, pad and rocket of your own.'));
  };

  // ---------------------------------------------------------------- the ordering sheet
  const orderSheet = () => {
    const role = AO.orbitRole;
    if (!role) return null;
    const R = S.roles[role];
    const list = Object.entries(C.products).filter(([, p]) => p.line === 'satellite' && Object.keys(p.service || {})[0] === role).sort((a, b) => a[1].price - b[1].price);
    const qty = AO.orbitQty || 1;
    const chips = h('div', { class: 'ao-chips' }, ...[1, 2, 3, 4].map((n) => h('button', { class: `ao-chip${qty === n ? ' on' : ''}`, onclick: () => { AO.orbitQty = n; refresh(); } }, `× ${n}`)));
    const body = list.map(([pid, p]) => {
      const f = A.orderForecast(c, pid);
      const can = A.canBuild(c, p);
      const barred = R.needs === 'cleared' && !A.cleared(c);
      const miss = (p.tech && !c.research.includes(p.tech)) ? C.research[p.tech]?.name : null;
      const good = f.ratio >= 1.15;
      const img = satelliteCanvas({ mass: p.mass, role: p.role }, { panels: true });
      const pic = h('canvas', { width: 90, height: 60, class: 'ao-pic', style: 'width:60px;height:40px' });
      if (img) { const x = pic.getContext('2d'); x.imageSmoothingEnabled = false; const k = Math.min(78 / img.width, 48 / img.height, 2); x.drawImage(img, (90 - img.width * k) / 2, (60 - img.height * k) / 2, img.width * k, img.height * k); }
      return h('tr', { class: can && !barred ? '' : 'dim' },
        h('td', {}, h('div', { class: 'ao-cell' }, pic, h('div', {}, h('b', {}, p.name), h('small', {}, `${p.life} days of life · ${p.service[role]} ${R.unit} · mass ${'SMHX'[p.mass - 1]}`)))),
        h('td', { class: 'r' }, fmtMoney(f.build), h('small', {}, ` + launch ${fmtMoney(f.launch)}`)),
        h('td', { class: 'r' }, f.perDay ? `+${fmtMoney(f.perDay)}` : '—', h('small', {}, ` a day · ${fmtMoney(f.opex)} to run`)),
        h('td', { class: `r ${good ? 'pos' : f.ratio < 0.9 ? 'neg' : ''}` }, f.cost ? `${f.ratio.toFixed(2)}×` : '—', h('small', {}, f.paybackDays ? ` payback ${f.paybackDays} d` : '')),
        h('td', { class: 'r' }, barred ? h('small', { class: 'neg' }, 'needs clearance') : miss ? h('small', { class: 'neg' }, `needs ${miss}`) : !can ? h('small', { class: 'neg' }, 'needs a pad and a rocket') : btn(`Order ${qty}`, () => act(() => A.orderSatellite(c, pid, qty)), 'primary')));
    });
    const hint = (() => {
      const r = rows.find((x) => x.role === role);
      if (!r) return null;
      if (!r.net.n) return `The first ${R.short.toLowerCase()} satellite covers little of the sky; the network is worth having at ${R.full}.`;
      if (r.net.n < R.full) return `${R.full - r.net.n} more would give a full network: the last satellite is worth the most.`;
      return r.sold.utilisation < 0.95 ? 'You already carry more than the market buys: another would sit idle.' : 'A full network, sold out. Another would add capacity the market still wants.';
    })();
    return h('div', { class: 'ao-sec ordersheet' }, h('h4', {}, `Order — ${R.name}`), chips, hint ? muted(hint) : null,
      h('div', { class: 'ao-table-wrap' }, h('table', { class: 'ao-table' }, h('tr', {}, h('th', {}, 'Satellite'), h('th', { class: 'r' }, 'To build and launch'), h('th', { class: 'r' }, 'Adds'), h('th', { class: 'r' }, 'Life return'), h('th', {}, '')), ...body)),
      muted('Life return is what it earns over its whole life (less running costs and ageing) against what it costs to build and to launch. Prices are today\'s; storms, price wars and hurricane seasons move them.'));
  };

  // ---------------------------------------------------------------- the fleet
  const satRow = (s) => {
    const R = S.roles[s.role] || S.roles.comms;
    const life = Math.max(0, daysLeft(s, A.now));
    const share = c.orbit?.roles?.[s.role]?.revenue && c.orbit.roles[s.role].n ? Math.round(c.orbit.roles[s.role].revenue / c.orbit.roles[s.role].n) : null;
    const cap = Math.round(((s.capability ?? 1) * (1 - S.degrade * Math.min(1, (A.now - s.commissioned) / (s.lifeDays * 1440)))) * 100);
    const hit = s.hit && s.hit.untilDay >= A.day;
    return h('div', { class: 'ao-row static fleet' },
      h('span', { class: 'ao-role-icon', style: `color:${R.colour}` }, R.icon),
      h('div', { class: 'grow' }, h('b', {}, s.name), h('small', {}, `${R.short} · ${s.status === 'degraded' ? 'degraded at commissioning' : 'operational'}${s.hardened ? ' · hardened' : ''}${hit ? ' · storm-damaged' : ''}`)),
      h('div', { class: 'ao-mini' }, h('small', {}, `capability ${cap}%`), bar(h, cap / 100, cap > 80 ? COL.green : cap > 60 ? COL.amber : COL.red, 'capability')),
      h('div', { class: 'ao-mini' }, h('small', {}, `${Math.round(life)} d left`), bar(h, life / s.lifeDays, life > 15 ? COL.blue : COL.amber, 'life')),
      h('em', { class: 'pos' }, share != null ? `${fmtMoney(share)}/d` : '—'),
      h('small', {}, fmtMoney(s.book || 0)),
      btn('De-orbit', () => { if (window.confirm(`De-orbit ${s.name}? It stops costing and stops earning, and its ${fmtMoney(s.book || 0)} book value is written off.`)) act(() => A.decommissionSatellite(c, s.id)); }, 'small'));
  };
  const ended = fleet.own.filter((s) => s.status === 'failed' || s.status === 'decommissioned').slice(-4).reverse();
  const orders = fleet.orders.map((u) => h('div', { class: 'ao-row static fleet' }, h('span', { class: 'ao-role-icon' }, '🛰'), h('div', { class: 'grow' }, h('b', {}, `${C.products[u.product].name} #${u.n}`), h('small', {}, u.blocker?.text || A.stageOf(u)?.name || 'queued')), h('small', {}, `stage ${u.stage + 1}`), btn('Cancel', () => act(() => A.cancelOwnOrder(c, u.id)), 'small')));

  const supported = supportedLive.map((s) => {
    const R = S.roles[s.role] || S.roles.comms;
    const age = (A.now - s.commissioned) / (s.lifeDays * 1440);
    return h('div', { class: 'ao-row static fleet' }, h('span', { class: 'ao-role-icon', style: `color:${R.colour}` }, R.icon), h('div', { class: 'grow' }, h('b', {}, s.name), h('small', {}, `${C.customers[s.owner]?.name || s.owner}${age < S.support.warrantyShare ? ' · under warranty' : ''}${s.replaceTender ? ' · replacement tendered' : ''}`)),
      h('div', { class: 'ao-mini' }, h('small', {}, `${Math.round(daysLeft(s, A.now))} d left`), bar(h, daysLeft(s, A.now) / s.lifeDays, COL.blue, 'life')), h('em', { class: 'pos' }, `${fmtMoney(Math.round(s.price * S.support.rate * (s.capability ?? 1)))}/d`));
  });

  const premium = Math.round(book * S.insurance.premium);
  const policies = h('div', { class: 'ao-grid small' },
    h('div', { class: 'ao-tile' }, h('small', {}, 'INSURANCE'), h('b', {}, c.insured ? 'Fleet insured' : 'Uninsured'), h('small', {}, `${fmtMoney(premium)} a day · pays ${Math.round(S.insurance.payout * 100)}% of book value on a loss`), btn(c.insured ? 'Cancel cover' : 'Insure the fleet', () => act(() => A.setFleetPolicy(c, 'insured', !c.insured)), c.insured ? '' : 'primary')),
    h('div', { class: 'ao-tile' }, h('small', {}, 'REPLACEMENTS'), h('b', {}, c.autoReplace ? 'Automatic' : 'By hand'), h('small', {}, `A successor goes on the floor when a satellite has ${S.autoReplaceDays} days left`), btn(c.autoReplace ? 'Turn off' : 'Replace automatically', () => act(() => A.setFleetPolicy(c, 'autoReplace', !c.autoReplace)), c.autoReplace ? '' : 'primary')));

  const news = A.state.reports.filter((r) => r.company === c.id && r.kind === 'orbit').slice(0, 7);
  const sky = Object.entries(A.state.orbit?.mult || {}).filter(([, m]) => m.untilDay >= A.day);

  return h('div', {},
    h('div', { class: 'ao-kpis' },
      kpi('In orbit', String(live.length), '', `+ ${supportedLive.length} you keep for customers`),
      kpi('Networks sell, today', fmtMoney(c.orbit?.revenue ?? estNetwork), 'pos', `estimate ${fmtMoney(estNetwork)}`),
      kpi('Support fees, today', fmtMoney(c.orbit?.fees ?? estFees), 'pos', `${supportedLive.length} satellites`),
      kpi('Running costs, a day', fmtMoney(estOps), 'neg', `fleet book value ${fmtMoney(book)}`)),
    h('div', { class: 'ao-orbitwrap' }, canvas, h('div', { class: 'ao-orbit-note' }, sky.length ? sky.map(([r, m]) => pill(`${S.roles[r].icon} ${S.roles[r].short} ${m.m > 1 ? '▲' : '▼'} ${Math.round(Math.abs(m.m - 1) * 100)}% until Day ${m.untilDay}`, m.m > 1 ? COL.green : COL.red)) : muted('The sky is quiet.'))),
    orderSheet(),
    section('The markets', h('div', { class: 'ao-grid wide' }, ...rows.map(marketCard))),
    h('div', { class: 'ao-two' },
      h('div', {}, section(`Your fleet (${live.length})`, ...(live.length ? live.map(satRow) : [muted('Nothing of yours is in orbit yet. Order a satellite above: it is built, launched and commissioned like any customer\'s, and then it works for you.')]),
        orders.length ? section('On the floor and on the way up', ...orders) : null,
        ended.length ? section('Recently ended', ...ended.map((s) => h('div', { class: 'ao-row static dim' }, h('div', { class: 'grow' }, h('b', {}, s.name), h('small', {}, s.status === 'failed' ? `lost: ${s.failure}` : 'reached the end of its life')), h('small', {}, `Day ${Math.floor((s.failedAt || s.decommissioned || 0) / 1440) + 1}`)))) : null)),
      h('div', {}, section('Policies', policies),
        section(`Kept working for customers (${supportedLive.length})`, ...(supported.length ? supported : [muted('Satellites you build for customers pay a support fee for as long as they live — and ask for a replacement when they are nearly spent.')])),
        section('From the sky', ...(news.length ? news.map((r) => h('div', { class: 'ao-log-line' }, h('i', {}, A.when(r.at).replace('Day ', 'D')), ' ', r.text)) : [muted('Nothing yet.')])))));
}
