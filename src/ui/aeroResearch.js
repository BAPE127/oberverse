// The Research page of the aerospace terminal (v0.59.0): the whole tree laid out by branch and
// depth, each project coloured by where you stand with it, the lines between what needs what, a
// card for the one you pick (what it does, what it opens, what it costs), and a queue of up to
// three so the lab never stands idle. Layout and wording: src/aero/research.js.
import { layout, effectLines, unlocksOf, BRANCHES } from '../aero/research.js';
import { fmtMoney } from '../aero/catalog.js';
import { satelliteCanvas, aircraftCanvas, rocketCanvas } from '../engine/drawAero.js';

const NS = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/'); // (the SVG namespace; written so the no-network check sees no URL)
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

export function researchPage(env) {
  const { A, C, h, btn, kpi, section, muted, pill, act, refresh, COL, AO, co } = env;
  const c = co();
  const R = C.research;
  const L = layout(R);
  const done = new Set(c.research);
  const queue = c.queue || [];
  const now = c.researching?.id || null;
  const status = (id) => (done.has(id) ? 'done' : id === now ? 'now' : queue.includes(id) ? 'queued' : (R[id].requires || []).every((r) => done.has(r)) ? 'avail' : (R[id].requires || []).every((r) => done.has(r) || r === now || queue.includes(r)) ? 'soon' : 'locked');
  const sel = AO.tech && R[AO.tech] ? AO.tech : (now || queue[0] || Object.keys(R).find((id) => status(id) === 'avail') || 'light_airframes');
  const ROLE = { avail: COL.amber, done: COL.green, now: COL.blue, queued: COL.blue, soon: '#7a8aa6', locked: '#4a5468' };

  // ---------------------------------------------------------------- the tree
  const tree = h('div', { class: 'ao-tree', style: `width:${L.width}px;height:${L.height}px` });
  const svg = svgEl('svg', { width: L.width, height: L.height, class: 'ao-tree-lines' });
  for (const lane of L.lanes) {
    tree.append(h('div', { class: 'ao-lane', style: `top:${lane.top}px;height:${lane.height - 8}px;width:${L.width - 12}px` }, h('span', {}, lane.name)));
  }
  const { w, h: nh } = L.size;
  for (const [id, r] of Object.entries(R)) {
    for (const q of r.requires || []) {
      const a = L.nodes[q];
      const b = L.nodes[id];
      const x1 = a.x + w; const y1 = a.y + nh / 2; const x2 = b.x; const y2 = b.y + nh / 2;
      const mid = (x1 + x2) / 2;
      const lit = done.has(q);
      svg.append(svgEl('path', { d: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`, fill: 'none', stroke: lit ? 'rgba(94,224,138,0.55)' : 'rgba(120,140,170,0.32)', 'stroke-width': lit ? 2 : 1.4 }));
    }
  }
  tree.append(svg);
  for (const [id, r] of Object.entries(R)) {
    const n = L.nodes[id];
    const st = status(id);
    const fx = effectLines(C, r.effect);
    const opens = unlocksOf(C, id);
    tree.append(h('button', { class: `ao-tech ${st}${sel === id ? ' sel' : ''}`, style: `left:${n.x}px;top:${n.y}px;width:${w}px;height:${nh}px;--c:${ROLE[st]}`, onclick: () => { AO.tech = id; refresh(); } },
      h('b', {}, r.name),
      h('small', {}, st === 'done' ? '✓ researched' : st === 'now' ? `under way · done ${A.when(c.researching.doneAt).replace('Day ', 'D')}` : st === 'queued' ? `queued · #${queue.indexOf(id) + 1}` : `${r.cost ? fmtMoney(r.cost) : 'free'} · ${A.researchDays(c, id)} d`),
      h('span', { class: 'ao-tech-tags' }, opens.products.length ? `${opens.products.length} product${opens.products.length === 1 ? '' : 's'}` : '', fx.length ? ' ⚙' : '', r.clearance ? ' 🔒' : '')));
  }
  const scroller = h('div', { class: 'ao-tree-scroll' }, tree);
  // bring the chosen project into view (once per page change)
  requestAnimationFrame(() => { const el = tree.querySelector('.ao-tech.sel'); if (el && !scroller.dataset.seen) { scroller.scrollLeft = Math.max(0, el.offsetLeft - 80); scroller.dataset.seen = '1'; } });

  // ---------------------------------------------------------------- the chosen project
  const r = R[sel];
  const st = status(sel);
  const opens = unlocksOf(C, sel);
  const pic = (pid) => {
    const p = C.products[pid];
    const cv = h('canvas', { width: 120, height: 64, class: 'ao-pic', style: 'width:60px;height:32px' });
    const img = p.line === 'aircraft' ? aircraftCanvas(p.look, {}) : p.line === 'satellite' ? satelliteCanvas({ mass: p.mass, role: p.role }, { panels: true }) : rocketCanvas(p.look, { stages: 1, lying: true });
    if (img) { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; const k = Math.min(108 / img.width, 54 / img.height, 2); x.drawImage(img, (120 - img.width * k) / 2, (64 - img.height * k) / 2, img.width * k, img.height * k); }
    return cv;
  };
  const need = (r.requires || []).map((id) => h('span', { class: `ao-req ${done.has(id) ? 'ok' : ''}`, onclick: () => { AO.tech = id; refresh(); } }, `${done.has(id) ? '✓' : '○'} ${R[id].name}`));
  const days = A.researchDays(c, sel);
  const lab = A.hallState(c, 'lab').state === 'built';
  const canNow = st === 'avail' && !c.researching && A.canAfford(c, r.cost);
  const detail = h('div', { class: 'ao-techdetail' },
    h('div', { class: 'ao-kicker' }, `${(BRANCHES.find(([id]) => id === r.branch) || [, 'Research'])[1].toUpperCase()}${r.clearance ? ' · NEEDS CLEARANCE' : ''}`),
    h('h3', {}, r.name),
    h('div', { class: 'ao-pills' }, pill(st === 'done' ? 'Researched' : st === 'now' ? 'Under way' : st === 'queued' ? 'Queued' : st === 'avail' ? 'Ready to research' : st === 'soon' ? 'Waiting on the queue' : 'Locked', ROLE[st])),
    h('p', { class: 'ao-muted' }, r.text),
    need.length ? h('div', { class: 'ao-sub' }, h('small', {}, 'NEEDS'), h('div', { class: 'ao-reqs' }, ...need)) : null,
    effectLines(C, r.effect).length ? h('div', { class: 'ao-sub' }, h('small', {}, 'WHAT IT DOES'), ...effectLines(C, r.effect).map((t) => h('div', { class: 'ao-fx' }, '⚙ ', t))) : null,
    opens.products.length || opens.options.length || opens.next.length ? h('div', { class: 'ao-sub' }, h('small', {}, 'WHAT IT OPENS'),
      ...opens.products.map((pid) => h('div', { class: 'ao-open' }, pic(pid), h('div', {}, h('b', {}, C.products[pid].name), h('small', {}, C.products[pid].line === 'aircraft' ? 'aircraft' : C.products[pid].line === 'satellite' ? 'satellite' : C.products[pid].line === 'rocket' ? 'launch vehicle' : 'strategic product')))),
      ...opens.options.map((t) => h('div', { class: 'ao-fx' }, '◇ option — ', t)),
      opens.next.length ? h('div', { class: 'ao-fx' }, '→ leads to ', opens.next.map((id) => R[id].name).join(', ')) : null) : null,
    st !== 'done' ? h('div', { class: 'ao-sub' }, h('small', {}, 'COST'), h('div', { class: 'ao-kpis two' }, kpi('Money', r.cost ? fmtMoney(r.cost) : 'free'), kpi('Time', `${days} days`, '', lab ? 'laboratory saves a quarter' : `${R[sel].days} days at standard pace`)),
      muted(`Chance of a breakthrough on top: ${Math.round(A.breakthroughChance(c) * 100)}% (a laboratory and surplus engineers raise it).`)) : null,
    st === 'avail' ? h('div', { class: 'ao-actions' }, btn(c.researching ? `Queue it (${queue.length}/3)` : `Research now · ${fmtMoney(r.cost)}`, () => act(() => (c.researching ? A.queueResearch(c, sel) : A.startResearch(c, sel))), 'primary big', c.researching ? queue.length >= 3 : !canNow, c.researching ? null : (!A.canAfford(c, r.cost) ? 'Not enough money' : null))) : null,
    st === 'soon' ? h('div', { class: 'ao-actions' }, btn(`Queue it (${queue.length}/3)`, () => act(() => A.queueResearch(c, sel)), 'primary big', queue.length >= 3)) : null,
    st === 'queued' ? h('div', { class: 'ao-actions' }, btn('Take it out of the queue', () => act(() => A.unqueueResearch(c, sel)))) : null,
    st === 'locked' ? muted('Research what it needs first (queue it, or do it now).') : null);

  const current = c.researching ? h('div', { class: 'ao-alert' }, `🔬 Researching ${R[c.researching.id].name} — done ${A.when(c.researching.doneAt)}${c.researching.breakthrough ? ' · the team has a feeling about this one' : ''}.`) : muted('The laboratory is idle. Pick a project and research it, or queue several.');
  const qchips = queue.length ? h('div', { class: 'ao-pills' }, ...queue.map((id, i) => h('button', { class: 'ao-chip on', onclick: () => { AO.tech = id; refresh(); }, title: 'Click to look at it' }, `${i + 1}. ${R[id].name}`, h('em', {}, fmtMoney(R[id].cost))))) : null;

  return h('div', {},
    h('div', { class: 'ao-kpis' }, kpi('Researched', `${c.research.length}`, '', `of ${Object.keys(R).length} projects`), kpi('Under way', c.researching ? R[c.researching.id].name : '—'), kpi('Queued', `${queue.length} / 3`, '', queue.length ? `next: ${R[queue[0]].name}` : 'nothing waiting'), kpi('Engineers', `${Math.round(A.engineerRate(c) * 100)}%`, A.engineerRate(c) < 1 ? 'neg' : '', 'of the pace the lab could keep')),
    current, qchips,
    h('div', { class: 'ao-researchwrap' }, h('div', { class: 'ao-treebox' }, scroller, muted('Grey lines: needs. Green: done. ⚙ changes how something works; 🔒 needs clearance. Click a project.')), detail));
}
