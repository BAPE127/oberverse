// The arms-works terminal (v0.13.0): a rotating globe in the style of a
// live trade map (glowing routes, borders, markers) over the fictional
// countries, and tabs for parts, equipment, staff, research and the market.
// See src/systems/arms.js.
import { h, itemIcon } from './panels.js';

// --------------------------------------------------------------- the globe
const D2R = Math.PI / 180;
let LAND = null;

/** Smooth deterministic "continents" on the sphere. */
function landNoise(lat, lon) {
  const a = lat * D2R;
  const b = lon * D2R;
  return Math.sin(b * 2 + 0.6) * Math.cos(a * 3 - 0.4) * 0.55 + Math.sin(b * 5 + a * 4 + 1.3) * 0.25 + Math.cos(b * 3 - a * 6) * 0.18 + Math.sin(b * 9 + a * 2) * 0.08 - Math.abs(lat) / 260;
}

function buildLand(countries) {
  const pts = [];
  const step = 3;
  const caps = Object.entries(countries);
  for (let lat = -78; lat <= 80; lat += step) {
    for (let lon = -180; lon < 180; lon += step) {
      let n = landNoise(lat, lon);
      // make sure every capital sits on land
      for (const [, c] of caps) {
        const d = Math.hypot(lat - c.lat, (((lon - c.lon + 540) % 360) - 180) * Math.cos(lat * D2R));
        if (d < 14) n = Math.max(n, 0.3 - d / 60);
      }
      if (n < 0.12) continue;
      let best = null;
      let bd = 30;
      for (const [id, c] of caps) {
        const d = Math.hypot(lat - c.lat, (((lon - c.lon + 540) % 360) - 180) * Math.cos(lat * D2R));
        if (d < bd) { bd = d; best = id; }
      }
      pts.push({ lat, lon, country: best, n });
    }
  }
  // border points: a neighbour belongs to another country
  const key = (lat, lon) => `${lat},${(lon + 540) % 360 - 180}`;
  const map = new Map(pts.map((p) => [key(p.lat, p.lon), p]));
  for (const p of pts) {
    const e = map.get(key(p.lat, p.lon + step));
    const nn = map.get(key(p.lat + step, p.lon));
    p.border = (e && e.country !== p.country) || (nn && nn.country !== p.country) || !e || !nn;
  }
  return pts;
}

function project(lat, lon, rot, tilt) {
  const a = lat * D2R;
  const b = (lon + rot) * D2R;
  const x = Math.cos(a) * Math.sin(b);
  const y0 = Math.sin(a);
  const z0 = Math.cos(a) * Math.cos(b);
  const t = tilt * D2R;
  return { x, y: y0 * Math.cos(t) - z0 * Math.sin(t), z: y0 * Math.sin(t) + z0 * Math.cos(t) };
}

/** Great-circle points between two lat/lon pairs. */
function arc(a, b, n = 28) {
  const v = (p) => [Math.cos(p.lat * D2R) * Math.cos(p.lon * D2R), Math.cos(p.lat * D2R) * Math.sin(p.lon * D2R), Math.sin(p.lat * D2R)];
  const A = v(a);
  const B = v(b);
  const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const om = Math.acos(dot) || 1e-6;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om);
    const s2 = Math.sin(t * om) / Math.sin(om);
    const x = s1 * A[0] + s2 * B[0];
    const y = s1 * A[1] + s2 * B[1];
    const z = s1 * A[2] + s2 * B[2];
    const lift = 1 + Math.sin(t * Math.PI) * 0.08; // routes bow off the surface a little
    out.push({ lat: Math.asin(z) / D2R, lon: Math.atan2(y, x) / D2R, lift });
  }
  return out;
}

const ROUTES = [['varn', 'ostmark'], ['varn', 'teshvar'], ['caldera', 'pallas'], ['sund', 'lirre'], ['ostmark', 'sund'], ['teshvar', 'morrow'], ['pallas', 'lirre'], ['caldera', 'teshvar'], ['morrow', 'caldera'], ['ostmark', 'lirre'], ['varn', 'caldera']];

export function drawGlobe(ctx, size, time, countries, opts = {}) {
  if (!LAND) LAND = buildLand(countries);
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const rot = -time * 8 + (opts.rot || 0);
  const tilt = 22;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  // stars
  for (let i = 0; i < 70; i++) {
    const sx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const sy = (Math.sin(i * 78.233) * 12543.123) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 7) % 10) / 20})`;
    ctx.fillRect(Math.abs(sx) * size, Math.abs(sy) * size, 1, 1);
  }
  // ocean
  const og = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  og.addColorStop(0, '#1e5a6e');
  og.addColorStop(0.7, '#0c3444');
  og.addColorStop(1, '#04141c');
  ctx.fillStyle = og;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // land
  const px = Math.max(1.6, r * 3 * D2R * 1.05);
  for (const p of LAND) {
    const q = project(p.lat, p.lon, rot, tilt);
    if (q.z <= 0) continue;
    const shade = 0.45 + 0.55 * q.z;
    const desert = Math.abs(p.lat) < 32 && p.n < 0.4;
    const base = desert ? [120, 98, 62] : Math.abs(p.lat) > 58 ? [190, 196, 200] : [74, 98, 60];
    ctx.fillStyle = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(base[2] * shade)})`;
    ctx.fillRect(cx + q.x * r - px / 2, cy - q.y * r - px / 2, px * (0.6 + 0.4 * q.z), px);
  }
  // borders
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const p of LAND) {
    if (!p.border) continue;
    const q = project(p.lat, p.lon, rot, tilt);
    if (q.z <= 0.05) continue;
    ctx.fillRect(cx + q.x * r - 0.7, cy - q.y * r - 0.7, 1.4, 1.4);
  }
  // trade routes, with traffic crawling along them
  ctx.lineWidth = 1.4;
  ROUTES.forEach(([a, b], i) => {
    const A = countries[a];
    const B = countries[b];
    if (!A || !B) return;
    const pts = arc(A, B);
    ctx.strokeStyle = i % 2 ? A.color : B.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      const q = project(p.lat, p.lon, rot, tilt);
      if (q.z <= 0) { pen = false; continue; }
      const X = cx + q.x * r * p.lift;
      const Y = cy - q.y * r * p.lift;
      if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      pen = true;
    }
    ctx.stroke();
    const k = Math.floor(((time * 6 + i * 3) % pts.length));
    const q = project(pts[k].lat, pts[k].lon, rot, tilt);
    if (q.z > 0) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + q.x * r * pts[k].lift - 1.5, cy - q.y * r * pts[k].lift - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  });
  // capitals
  ctx.font = `bold ${Math.max(9, size / 38)}px "Trebuchet MS", sans-serif`;
  for (const [id, c] of Object.entries(countries)) {
    const q = project(c.lat, c.lon, rot, tilt);
    if (q.z <= 0) continue;
    const X = cx + q.x * r;
    const Y = cy - q.y * r;
    const pulse = 3 + Math.sin(time * 3 + id.length) * 1.5;
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(X, Y, pulse + 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(X, Y, 3, 0, Math.PI * 2); ctx.fill();
    if (q.z > 0.35 && opts.labels !== false) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(c.name, X + 6, Y - 4);
    }
  }
  // atmosphere
  const ag = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.12);
  ag.addColorStop(0, 'rgba(120,200,255,0)');
  ag.addColorStop(0.5, 'rgba(120,200,255,0.25)');
  ag.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------- the terminal
const TABS = ['Overview', 'Parts', 'Equipment', 'Staff', 'Research', 'Market'];

export function terminalPanel(ui, body, opts) {
  const g = ui.game;
  const A = g.arms;
  const wh = opts.warehouse;
  const def = A.def(wh);
  const tab = opts.tab || 'Overview';
  const items = g.content.items;
  const cfg = A.cfg;
  const go = (t, extra = {}) => ui.openPanel('terminal', { warehouse: wh, tab: t, ...extra });
  const say = (r) => { ui.audio.sfx(r.ok ? 'sfx_ui_click' : 'sfx_fail'); go(tab, { msg: r.text }); };

  // the screen: globe + status
  const wrap = h('div', { class: 'terminal' });
  const canvas = h('canvas', { width: 300, height: 300, class: 'globe' });
  const status = h('div', { class: 'term-status' });
  const p = A.power(wh);
  const staff = A.staffOf(wh);
  const r = A.state.research;
  status.append(...[
    h('div', { class: 'term-title' }, `▣ ${def.name.toUpperCase()} — ARMS WORKS TERMINAL`),
    h('div', {}, `Funds: ${g.player.money} obols · Power: ${p.machines}/${p.capacity} stations · Staff: ${staff.length}/${def.bunks}`),
    h('div', {}, `Research: ${r.current ? `${cfg.research[r.current].name} ${Math.floor(r.progress)}/${cfg.research[r.current].cost} RP` : 'none selected'}`),
    h('div', {}, `Lucas's budget today: ${A.lucasBudgetLeft()} obols · Earned to date: ${A.state.earned} obols`),
    opts.msg ? h('div', { class: 'term-msg' }, `> ${opts.msg}`) : null,
  ].filter(Boolean));
  wrap.append(h('div', { class: 'term-top' }, canvas, status));
  body.append(wrap);
  const ctx = canvas.getContext('2d');
  const t0 = performance.now();
  const loop = () => {
    if (!canvas.isConnected) return;
    drawGlobe(ctx, 300, (performance.now() - t0) / 1000, cfg.countries);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const sect = h('div', { class: 'term-body' });
  body.append(sect);
  const row = (icon, name, desc, ...buttons) => h('div', { class: 'item-row' }, h('div', { class: 'icon' }, icon), h('div', { class: 'grow' }, h('div', { class: 'name' }, name), desc ? h('div', { class: 'desc' }, desc) : null), ...buttons);
  const btn = (label, fn, cls = 'small') => h('button', { class: cls, onclick: fn }, label);

  if (tab === 'Overview') {
    const made = Object.entries(A.state.produced).filter(([, n]) => n > 0).map(([id, n]) => `${items[id]?.name} ×${n}`).join(', ') || 'nothing yet';
    const dock = Object.entries(g.world.containers[def.inBay].items).filter(([, n]) => n > 0).map(([id, n]) => `${items[id]?.name} ×${n}`).join(', ') || 'empty';
    const cage = Object.entries(g.world.containers[def.outCrate].items).filter(([, n]) => n > 0).map(([id, n]) => `${items[id]?.name} ×${n}`).join(', ') || 'empty';
    sect.append(
      h('p', {}, h('b', {}, 'Produced: '), made),
      h('p', {}, h('b', {}, 'Loading dock: '), dock),
      h('p', {}, h('b', {}, 'Export cage: '), cage),
      h('p', { class: 'muted' }, 'How it works: order parts and equipment here (they land on the loading dock within the hour). Take the equipment from the dock, press B to place stations, then hire staff and assign them. Choose each station\'s recipe with E. Belts and inserter arms can move parts between stations. Carry finished weapons to Lucas at Pipecreek Armory — the global market opens soon.'),
    );
  } else if (tab === 'Parts' || tab === 'Equipment') {
    const list = Object.entries(items).filter(([, it]) => (tab === 'Parts' ? it.category === 'arms_part' && it.price > 0 : it.build && (it.build.domain === 'arms' || ['belt', 'inserter', 'generator'].includes(it.build.type))));
    if (tab === 'Parts' && A.partsMult() < 1) sect.append(h('p', { class: 'muted' }, `Lean Supply: parts ${Math.round((1 - A.partsMult()) * 100)}% off.`));
    for (const [id, it] of list) {
      const price = A.partPrice(id);
      const qs = tab === 'Parts' ? [1, 10, 50] : it.build.type === 'belt' ? [10, 50] : [1];
      sect.append(row(itemIcon(it), `${it.name} — ${price} obols`, it.description, ...qs.map((q) => btn(`×${q}`, () => say(A.order(wh, id, q))))));
    }
    const pending = A.state.orders.filter((o) => o.wh === wh);
    if (pending.length) sect.append(h('p', { class: 'muted' }, `On the way: ${pending.map((o) => `${o.qty}× ${items[o.item].name}`).join(', ')}.`));
  } else if (tab === 'Staff') {
    const stations = A.cells(wh).machines;
    sect.append(h('div', { class: 'row' }, btn('Auto-assign free staff', () => say(A.autoAssign(wh)), 'primary')));
    if (!staff.length) sect.append(h('p', { class: 'muted' }, 'No staff yet. Hire from the applicants below.'));
    for (const st of staff) {
      const sel = h('select', { onchange: (e) => say(A.assign(st.id, e.target.value || null)) },
        h('option', { value: '' }, '— unassigned —'),
        ...stations.map((e) => h('option', { value: e.id, selected: st.assigned === e.id }, `${cfg.stations[e.kind].name} @${e.x},${e.y}${A.workerAt(e) && A.workerAt(e) !== st ? ` (${A.workerAt(e).shortName})` : ''}`)));
      const skills = Object.entries(st.skills).map(([k, v]) => `${k} ${v}`).join(' · ');
      sect.append(row('👷', `${st.name} — ${st.wage}/day — morale ${Math.round(st.morale)}${st.unpaid ? ' (UNPAID)' : ''}`, `${skills}${st.quirk ? ` · ${cfg.quirks[st.quirk].name}: ${cfg.quirks[st.quirk].text}` : ''}`, sel, btn('Bonus', () => say(A.bonus(st.id))), btn('Fire', () => say(A.fire(st.id)))));
    }
    sect.append(h('h3', { style: 'margin:14px 0 6px' }, `Applicants today (${staff.length}/${def.bunks} bunks used)`));
    A.candidates().forEach((c, i) => {
      const skills = Object.entries(c.skills).map(([k, v]) => `${k} ${v}`).join(' · ');
      sect.append(row('📋', `${c.name} — ${c.main} specialist — ${c.wage}/day`, `${skills}${c.quirk ? ` · ${cfg.quirks[c.quirk].name}: ${cfg.quirks[c.quirk].text}` : ''}`, btn('Hire', () => say(A.hire(i, wh)))));
    });
    sect.append(h('p', { class: 'muted' }, 'Wages are paid at 19:00 from your obols. Unpaid twice, or morale under 15, and they quit. Idle staff recover morale; working ones slowly lose it — a bonus (a day\'s wage) helps.'));
  } else if (tab === 'Research') {
    const labs = A.cells(wh).machines.filter((e) => e.kind === 'lab');
    sect.append(h('p', { class: 'muted' }, labs.length ? 'Research points come from staffed research labs (in any of your works). Pick a project:' : 'You need a Research Lab (Equipment) with a scientist assigned to earn research points.'));
    const grid = h('div', { class: 'research' });
    for (const br of cfg.branches) {
      const col = h('div', { class: 'branch' }, h('h4', {}, br));
      for (const [id, n] of Object.entries(cfg.research).filter(([, x]) => x.branch === br)) {
        const done = A.done(id);
        const avail = A.available(id);
        const cur = r.current === id;
        const cls = `node${done ? ' done' : avail ? ' avail' : ' locked'}${cur ? ' cur' : ''}`;
        const need = n.requires.filter((q) => !A.done(q)).map((q) => cfg.research[q].name).join(', ');
        col.append(h('button', { class: cls, disabled: !avail || cur, onclick: () => say(A.selectResearch(id)) },
          h('b', {}, n.name), h('span', {}, done ? ' ✓' : ` ${n.cost} RP`), h('div', { class: 'desc' }, n.text), cur ? h('div', { class: 'desc' }, `In progress: ${Math.floor(r.progress)}/${n.cost}`) : null, !done && need ? h('div', { class: 'desc' }, `Needs: ${need}`) : null));
      }
      grid.append(col);
    }
    sect.append(grid);
  } else if (tab === 'Market') {
    sect.append(h('p', {}, h('b', {}, 'The global market opens soon. '), 'Until then, Lucas Eastrise buys your output wholesale at Pipecreek Armory, at half of value, up to his daily budget.'));
    for (const [id, it] of Object.entries(items).filter(([, x]) => x.arms)) {
      sect.append(row(itemIcon(it), `${it.name}`, `Value ${A.value(id)} obols (×${A.priceMult(it.arms.family).toFixed(2)} research) · Lucas pays ${A.wholesale(id) || Math.round(A.value(id) * cfg.wholesale.share)}`));
    }
    sect.append(h('h3', { style: 'margin:14px 0 6px' }, 'The world'));
    for (const c of Object.values(cfg.countries)) sect.append(row('🌐', c.name, c.blurb));
  }
  return { title: `Terminal — ${def.name}`, tabs: TABS.map((t) => ({ label: t, active: t === tab, onclick: () => go(t) })) };
}
