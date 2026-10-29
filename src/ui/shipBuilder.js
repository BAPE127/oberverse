// The shipbuilder (v0.26.0): Fleet Command's Shipyard sheet. A big, detailed
// side profile of the hull you've chosen with glowing attachment points;
// drag parts from the tray at the bottom onto a point (or click a part to
// put it in the next free one), drag them between points or off the ship.
// Everything it shows comes from game.logistics.shipyard: validate() decides
// what's seaworthy, what it costs and how long it takes; commission() builds
// it. The design's layout (which slot each part is in) only changes the look.
//
//   Design         hulls along the top, the ship in the middle, parts below,
//                  numbers, paint and the bill on the right
//   Slips & yards  Mason's Os's yards, and the ships on the slips
//   Parts store    licences and the parts you've bought
import { h } from './panels.js';
import { drawProfileFitted, drawPartIcon } from '../engine/drawShipProfile.js';

const FAMILIES = [['propulsion', 'Propulsion'], ['power', 'Power'], ['cargo', 'Cargo'], ['navigation', 'Navigation'], ['defense', 'Defence'], ['weapons', 'Weapons'], ['sensors', 'Sensors'], ['support', 'Fleet support']];
const num = (n) => Math.round(n).toLocaleString();
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** The design being drawn: slots holds a component id (or null) per attachment point. */
function draft(Y, B) {
  const C = Y.cfg;
  const ready = Y.yards();
  const d = (B.d ||= { kind: 'cargo', hull: 'h_coaster', slots: [], name: '', color: C.colours[0], trim: '#e8e2d4', port: ready[0] || null });
  if (!C.hulls[d.hull] || C.hulls[d.hull].kind !== d.kind) d.hull = Object.keys(C.hulls).find((id) => C.hulls[id].kind === d.kind);
  const H = C.hulls[d.hull];
  d.slots = Array.from({ length: H.slots }, (_, i) => d.slots[i] || null);
  if (!ready.includes(d.port)) d.port = ready[0] || null;
  return d;
}

/** The simulation's design object for a draft. */
const designOf = (d) => {
  const idx = d.slots.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
  return { kind: d.kind, hull: d.hull, components: idx.map((i) => d.slots[i]), layout: idx, name: d.name, appearance: { color: d.color, trim: d.trim }, port: d.port };
};

/** A small canvas with a ship's profile (hull cards, slips). */
function profilePic(look, w, hgt, opts = {}) {
  const c = h('canvas', { width: w * 2, height: hgt * 2, style: `width:${w}px;height:${hgt}px` });
  const x = c.getContext('2d');
  if (opts.reveal != null) {
    // a hull on the slip: built up to `reveal`, the rest as a blueprint outline
    x.globalAlpha = 0.25;
    drawProfileFitted(x, look, w, hgt, w * 1.9, hgt * 1.9, { time: 0, water: false });
    x.globalAlpha = 1;
    x.save(); x.beginPath(); x.rect(0, 0, w * 2 * opts.reveal, hgt * 2); x.clip();
    drawProfileFitted(x, look, w, hgt, w * 1.9, hgt * 1.9, { time: 0, water: false });
    x.restore();
    x.strokeStyle = '#f2c14e'; x.setLineDash([6, 6]); x.lineWidth = 2;
    x.beginPath(); x.moveTo(w * 2 * opts.reveal, 0); x.lineTo(w * 2 * opts.reveal, hgt * 2); x.stroke();
  } else drawProfileFitted(x, look, w, hgt, w * 1.9, hgt * 1.9, { time: 0, water: opts.water !== false });
  return c;
}

function partPic(id, w, hgt, look) {
  const c = h('canvas', { width: w * 2, height: hgt * 2, style: `width:${w}px;height:${hgt}px`, class: 'sb-icon' });
  const x = c.getContext('2d');
  x.scale(2, 2);
  drawPartIcon(x, id, w, hgt, look);
  return c;
}

// ======================================================================= the sheet
export function shipyardSheet(ui, B, say, refresh) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const ready = Y.yards();
  if (!B.sub) B.sub = ready.length ? 'design' : 'yards';
  const tabs = h('div', { class: 'fc-tabs' }, ...[['design', '🛠 Design & build'], ['yards', `🏗 Slips & yards${Y.state.builds.some((b) => ['building', 'waiting'].includes(b.status)) ? ' •' : ''}`], ['parts', '📦 Parts store']].map(([k, label]) => h('button', { class: `fc-btn${B.sub === k ? ' primary' : ''}`, onclick: () => { B.sub = k; refresh(); } }, label)));
  const body = B.sub === 'design' ? (ready.length ? designer(ui, B, say, refresh) : h('div', { class: 'sb-empty' }, h('h3', {}, 'No working shipyard yet'), h('p', {}, 'Mason\'s Os build one at a commercial port or bigger. Commission it on the Slips & yards page — or ask Mason.'), h('button', { class: 'fc-btn primary', onclick: () => { B.sub = 'yards'; refresh(); } }, 'Slips & yards ›')))
    : B.sub === 'yards' ? yardsPage(ui, B, say, refresh) : storePage(ui, B, say, refresh);
  return h('div', { class: `sb-wrap ${B.sub}` }, tabs, body);
}

// ======================================================================= design & build
function designer(ui, B, say, refresh) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const C = Lg.cfg;
  const d = draft(Y, B);
  const H = C.hulls[d.hull];
  const design = designOf(d);
  const v = Y.validate(design, d.port);
  const look = { ...v.stats.look, fit: d.slots, slots: H.slots };
  const fam = (B.family ||= 'propulsion');

  // ---------------------------------------------------------------- hulls
  const hullRow = h('div', { class: 'sb-hulls' },
    h('div', { class: 'sb-kind' }, ...[['cargo', '📦 Cargo'], ['warship', '⚔ Warship']].map(([k, label]) => h('button', { class: `fc-btn${d.kind === k ? ' primary' : ''}`, onclick: () => { d.kind = k; d.hull = null; d.slots = []; B.sel = null; refresh(); } }, label))),
    ...Object.entries(C.hulls).filter(([, X]) => X.kind === d.kind).map(([id, X]) => {
      const locked = X.needsTech && !Y.state.tech[X.needsTech];
      return h('button', { class: `sb-hull${id === d.hull ? ' on' : ''}${locked ? ' locked' : ''}`, title: X.text, onclick: () => {
        // keep what still fits, in the same places
        const keep = d.slots.filter((p) => p && !Y.fits(id, p));
        d.hull = id;
        d.slots = Array.from({ length: X.slots }, (_, i) => keep[i] || null);
        B.sel = null;
        refresh();
      } }, profilePic({ ...X.look, color: d.color, trim: d.trim, fit: [], slots: X.slots }, 120, 44, { water: false }), h('b', {}, `${locked ? '🔒 ' : ''}${X.name.replace(/ hull$/i, '')}`), h('small', {}, `${num(X.price)} · ${X.slots} slots · size ${X.size}`));
    }));

  // ---------------------------------------------------------------- the stage
  const stage = h('div', { class: 'sb-stage' });
  const canvas = h('canvas', { class: 'sb-canvas' });
  const tip = h('div', { class: 'sb-tip hidden' });
  const hint = h('div', { class: 'sb-hint' }, d.slots.some(Boolean) ? 'Drag parts between points · drag one off the ship to remove it · click a part to inspect it' : 'Drag a part from the tray onto a glowing point — or just click it');
  stage.append(canvas, tip, hint);
  const ctx = canvas.getContext('2d');
  let tf = null; // the last drawing's transform and points
  let hover = -1;
  const drag = { id: null, from: null, x: 0, y: 0, target: -1, ghost: null, moved: false };
  const pointsState = () => d.slots.map((id, i) => ({ state: drag.id && drag.target === i ? 'target' : id ? 'filled' : 'empty' }));

  const draw = (ms) => {
    if (!canvas.isConnected) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(canvas.clientWidth * dpr);
    const Hh = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
    ctx.clearRect(0, 0, W, Hh);
    // a blueprint floor
    const bg = ctx.createRadialGradient(W / 2, Hh * 0.45, 0, W / 2, Hh * 0.45, W * 0.7);
    bg.addColorStop(0, '#0e2a44'); bg.addColorStop(1, '#040c18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, Hh);
    ctx.strokeStyle = 'rgba(90,180,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32 * dpr) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, Hh); ctx.stroke(); }
    for (let y = 0; y < Hh; y += 32 * dpr) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const pts = pointsState();
    tf = drawProfileFitted(ctx, look, W / 2, Hh * 0.5, W * 0.92, Hh * 0.86, { time: ms / 1000, points: pts, hover });
    tf.pts = pts;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const toModel = (e) => {
    const b = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: ((e.clientX - b.left) * dpr - tf.ox) / tf.s, y: ((e.clientY - b.top) * dpr - tf.oy) / tf.s };
  };
  const pointAt = (e, slack = 1.6) => {
    if (!tf?.pts) return -1;
    const p = toModel(e);
    let best = -1;
    let bd = Infinity;
    tf.pts.forEach((q, i) => {
      if (q.cx == null) return;
      // the point's circle or the part standing on it
      const dx = Math.abs(p.x - q.cx);
      const inside = dx < Math.max(q.r * slack, (tf.points[i]?.w || 0) * 0.5) && p.y > q.cy - q.r * 6 && p.y < q.cy + q.r * 3;
      const dist = Math.hypot(p.x - q.cx, p.y - q.cy);
      if (inside && dist < bd) { bd = dist; best = i; }
    });
    return best;
  };
  const describe = (i) => {
    const id = d.slots[i];
    if (!id) return [`Point ${i + 1}`, 'Empty — drop a part here'];
    const c = C.components[id];
    return [c.name, c.text, `${c.weight} t${c.power ? ` · ${c.power > 0 ? '+' : ''}${c.power} power` : ''}${c.mounts ? ` · ${c.mounts} mounts` : ''} · ${num(c.price)}`];
  };
  const showTip = (i, e) => {
    if (i < 0 || drag.id) { tip.classList.add('hidden'); return; }
    tip.replaceChildren(...describe(i).map((l, k) => (k ? h('div', {}, l) : h('b', {}, l))));
    const b = stage.getBoundingClientRect();
    tip.style.left = `${Math.min(e.clientX - b.left + 14, b.width - 240)}px`;
    tip.style.top = `${e.clientY - b.top + 14}px`;
    tip.classList.remove('hidden');
  };

  // ---------------------------------------------------------------- dragging
  const place = (i, id, from) => {
    if (from != null) {
      // move or swap between points
      [d.slots[i], d.slots[from]] = [d.slots[from], d.slots[i]];
      B.sel = i;
      ui.audio.sfx('sfx_ui_click');
      refresh();
      return;
    }
    const c = C.components[id];
    const why = Y.fits(d.hull, id);
    if (why) { say({ ok: false, text: `${c.name}: ${why}.` }); return; }
    const n = d.slots.filter((x, k) => x === id && k !== i).length;
    if (n >= c.max) { say({ ok: false, text: `${c.name}: at most ${c.max} per ship.` }); return; }
    d.slots[i] = id;
    B.sel = i;
    ui.audio.sfx('sfx_ui_click');
    refresh();
  };
  const startDrag = (e, id, from = null) => {
    drag.id = id; drag.from = from; drag.x = e.clientX; drag.y = e.clientY; drag.moved = false; drag.target = -1;
    const look2 = { hull: d.hull === 'h_sail_trader' ? 'brig' : C.hulls[d.hull].look.hull, color: d.color, trim: d.trim };
    drag.ghost = partPic(id, 110, 84, look2);
    drag.ghost.classList.add('sb-ghost', 'hidden');
    document.body.append(drag.ghost);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };
  const onMove = (e) => {
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) drag.moved = true;
    if (!drag.moved) return;
    drag.ghost.classList.remove('hidden');
    drag.ghost.style.left = `${e.clientX - 55}px`;
    drag.ghost.style.top = `${e.clientY - 60}px`;
    const b = canvas.getBoundingClientRect();
    const over = e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
    drag.target = over ? pointAt(e, 2.6) : -1;
    canvas.style.cursor = drag.target >= 0 ? 'copy' : over ? 'grabbing' : 'no-drop';
  };
  const onUp = (e) => {
    window.removeEventListener('pointermove', onMove);
    drag.ghost?.remove();
    const { id, from, target, moved } = drag;
    drag.id = null;
    canvas.style.cursor = '';
    if (!moved) {
      if (from != null) { B.sel = from; refresh(); return; }
      // a click on a tray part: the next free point
      const free = d.slots.findIndex((x) => !x);
      if (free < 0) { say({ ok: false, text: 'Every point is taken — drag the part onto one to replace what\'s there.' }); return; }
      place(free, id, null);
      return;
    }
    if (target >= 0) { if (target !== from) place(target, id, from); return; }
    if (from != null) {
      // dropped off the ship: take it off
      d.slots[from] = null;
      B.sel = null;
      refresh();
    }
  };
  canvas.addEventListener('pointerdown', (e) => {
    const i = pointAt(e);
    if (i >= 0 && d.slots[i]) { e.preventDefault(); startDrag(e, d.slots[i], i); } else if (i < 0) { B.sel = null; refresh(); }
  });
  canvas.addEventListener('pointermove', (e) => { if (drag.id) return; hover = pointAt(e); canvas.style.cursor = hover >= 0 && d.slots[hover] ? 'grab' : 'default'; showTip(hover, e); });
  canvas.addEventListener('pointerleave', () => { hover = -1; tip.classList.add('hidden'); });
  canvas.addEventListener('dblclick', (e) => { const i = pointAt(e); if (i >= 0 && d.slots[i]) { d.slots[i] = null; B.sel = null; refresh(); } });

  // ---------------------------------------------------------------- the tray
  const famTabs = h('div', { class: 'sb-famtabs' }, ...FAMILIES.map(([k, label]) => {
    const any = Object.values(C.components).some((c) => c.family === k && !Y.fits(d.hull, Object.keys(C.components).find((id) => C.components[id] === c)));
    const count = d.slots.filter((id) => id && C.components[id].family === k).length;
    return h('button', { class: `sb-famtab${fam === k ? ' on' : ''}${any ? '' : ' none'}`, onclick: () => { B.family = k; refresh(); } }, label, count ? h('i', {}, String(count)) : null);
  }));
  const cards = h('div', { class: 'sb-cards' });
  const iconLook = { hull: C.hulls[d.hull].look.hull, color: d.color, trim: d.trim };
  for (const [id, c] of Object.entries(C.components).filter(([, x]) => x.family === fam)) {
    const why = Y.fits(d.hull, id);
    const locked = c.tech === 'advanced' && !Y.state.tech.advanced;
    const n = d.slots.filter((x) => x === id).length;
    const full = n >= c.max;
    const stock = Y.state.stock[id] || 0;
    const card = h('div', { class: `sb-card${why ? ' off' : ''}${full ? ' full' : ''}`, title: why ? `Doesn't fit: ${why}` : c.text },
      partPic(id, 120, 84, iconLook),
      h('b', {}, c.name),
      h('div', { class: 'sb-card-meta' }, h('span', {}, `${num(c.price)} ◎`), h('span', {}, `${c.weight} t`), c.power ? h('span', { class: c.power > 0 ? 'pos' : 'neg' }, `${c.power > 0 ? '+' : ''}${c.power} ⚡`) : null, c.mounts ? h('span', {}, `${c.mounts} mt`) : null),
      h('small', {}, why ? `✖ ${why}` : locked ? '🔒 needs the licence' : full ? `max ${c.max} fitted` : stock ? `${stock} in store` : c.text));
    if (!why && !full) card.addEventListener('pointerdown', (e) => { e.preventDefault(); startDrag(e, id, null); });
    cards.append(card);
  }
  const tray = h('div', { class: 'sb-tray' }, famTabs, cards);

  // ---------------------------------------------------------------- the side panel
  const st = v.stats;
  const meter = (label, used, max, unit = '') => h('div', { class: `sb-meter${used > max ? ' over' : ''}` }, h('span', {}, label), h('div', { class: 'fc-bar-track' }, h('i', { style: `width:${Math.min(100, (used / Math.max(1, max)) * 100)}%;background:${used > max ? '#ff5a5a' : used / Math.max(1, max) > 0.85 ? '#f2c14e' : '#3ad6ff'}` })), h('em', {}, `${used}/${max}${unit}`));
  const statBar = (label, val, max, colour, text) => h('div', { class: 'fc-bar' }, h('span', {}, label), h('div', { class: 'fc-bar-track' }, h('i', { style: `width:${Math.min(100, (val / max) * 100)}%;background:${colour}` })), h('em', {}, text ?? String(val)));
  const comps = d.slots.filter(Boolean).map((id) => C.components[id]);
  const reqs = H.requires.map(([f, n, tech]) => {
    const have = comps.filter((c) => c.family === f && (!tech || c.tech === tech)).length;
    return h('div', { class: `sb-req${have >= n ? ' ok' : ''}` }, have >= n ? '✔' : '✖', ` ${n > 1 ? `${n}× ` : ''}${tech ? `${tech} ` : ''}${f === 'defense' ? 'defence' : f}`, h('small', {}, ` ${have}/${n}`));
  });
  const ownReasons = v.reasons.filter((r) => !/^needs (\d+× )?(sail |modern |advanced )?[a-z]+$/.test(r));
  const sel = B.sel != null && d.slots[B.sel] ? B.sel : null;
  const name = h('input', { class: 'fc-input', value: d.name, maxlength: 28, placeholder: 'Name her' });
  name.addEventListener('input', () => { d.name = name.value; });
  const swatches = (key) => h('div', { class: 'sb-swatches' }, h('small', {}, key === 'color' ? 'Hull' : 'Trim'), ...C.colours.map((col) => h('button', { class: `sb-swatch${d[key] === col ? ' on' : ''}`, style: `background:${col}`, title: col, onclick: () => { d[key] = col; refresh(); } })));
  const canBuild = v.ok && !v.missing.length && g.corp.canAfford('shipping', v.cost.now);
  const side = h('div', { class: 'sb-side' },
    h('div', { class: 'fc-kicker' }, `${Lg.className({ cls: H.cls }).toUpperCase()} · SIZE ${H.size}${H.needsTech ? ' · FUTURISTIC' : ''}`),
    h('h3', {}, H.name),
    h('p', { class: 'fc-muted' }, H.text),
    sel != null ? h('div', { class: 'sb-selected' }, partPic(d.slots[sel], 90, 64, iconLook), h('div', {}, h('b', {}, C.components[d.slots[sel]].name), h('small', {}, `Point ${sel + 1} · ${C.components[d.slots[sel]].text}`), h('button', { class: 'fc-btn', onclick: () => { d.slots[sel] = null; B.sel = null; refresh(); } }, 'Remove'))) : null,
    h('div', { class: 'fc-sec' }, h('h4', {}, 'Fit'),
      meter('Points', comps.length, H.slots),
      meter('Weight', v.weight, H.maxWeight, ' t'),
      meter('Power', v.powerUsed, v.powerMade),
      H.mounts ? meter('Mounts', v.mounts, H.mounts) : null),
    h('div', { class: 'fc-sec' }, h('h4', {}, 'A seaworthy ' + (H.kind === 'warship' ? 'warship' : 'cargo ship') + ' needs'), h('div', { class: 'sb-reqs' }, ...reqs)),
    h('div', { class: 'fc-sec' }, h('h4', {}, 'Performance'),
      H.kind === 'cargo' || st.capacity ? statBar('Cargo', st.capacity, 420, '#3ad6ff', `${st.capacity} u`) : null,
      statBar('Speed', st.speed, 45, '#4ade9a', `${st.speed} kn`),
      statBar('Range', st.range, 80000, '#f2c14e', `${num(st.range / 1000)}k km`),
      statBar('Reliable', st.reliability * 100, 100, '#9ad1ff', `${Math.round(st.reliability * 100)}%`),
      H.kind === 'warship' ? statBar('Attack', st.combat.attack, 100, '#ff78dc') : null,
      statBar('Defence', st.combat.defense, 100, '#7ab0ff'),
      statBar('Detection', st.combat.detection, 100, '#c9a2ff'),
      statBar('Stealth', st.combat.stealth, 100, '#8a9aaa'),
      h('small', { class: 'fc-muted' }, `Costs ${st.opex}/day at sea · ${st.upkeep}/day in port`),
      st.tags.length || st.bonuses.length ? h('div', { class: 'fc-chips' }, ...st.tags.map((t) => h('span', { class: 'fc-pill', style: 'border-color:#3ad6ff;color:#bfefff' }, t)), ...st.bonuses.map((b) => h('span', { class: 'fc-pill', style: 'border-color:#f2c14e;color:#ffe7a8' }, `★ ${C.bonuses[b].name}`))) : null),
    ownReasons.length ? h('div', { class: 'fc-sec' }, ...ownReasons.map((r) => h('div', { class: 'fc-card-why' }, `✖ ${r}`))) : null,
    h('div', { class: 'fc-sec' }, h('h4', {}, 'Paint and name'), name, swatches('color'), swatches('trim')),
    h('div', { class: 'fc-sec' }, h('h4', {}, 'Build'),
      Y.yards().length > 1 ? h('select', { class: 'fc-input', onchange: (e) => { d.port = e.target.value; refresh(); } }, ...Y.yards().map((id) => h('option', { value: id, selected: id === d.port }, `Yard: ${Lg.port(id).name}`))) : h('small', { class: 'fc-muted' }, `Yard: ${Lg.port(d.port).name}`),
      h('div', { class: 'sb-bill' },
        h('div', {}, h('span', {}, 'Hull'), h('b', {}, num(v.cost.hull))),
        h('div', {}, h('span', {}, 'Labour'), h('b', {}, num(v.cost.labour))),
        h('div', {}, h('span', {}, `Parts (${comps.length})`), h('b', {}, `${num(v.cost.parts)}${v.missing.length ? ` · ${num(v.missingCost)} to buy` : ' · in store'}`)),
        h('div', {}, h('span', {}, 'On the slip'), h('b', {}, `${v.days} days`))),
      v.missing.length ? h('button', { class: 'fc-btn', disabled: !g.corp.canAfford('shipping', v.missingCost), onclick: () => { say(Y.buyMissing(design)); refresh(); } }, `Buy ${v.missing.reduce((a, m) => a + m.n, 0)} missing part${v.missing.reduce((a, m) => a + m.n, 0) === 1 ? '' : 's'} · ${num(v.missingCost)}`) : null,
      h('button', { class: 'fc-go big', disabled: !canBuild, title: v.reasons[0] || '', onclick: () => {
        const r = Y.commission(design);
        say(r);
        if (r.ok) { B.d = { ...d, slots: [], name: '' }; B.sel = null; B.sub = 'yards'; }
        refresh();
      } }, v.ok ? (v.missing.length ? 'Buy the parts first' : `Lay the keel · ${num(v.cost.now)} ◎`) : `✖ ${v.reasons[0]}`)));

  // keyboard: Delete removes the selected part
  const keys = (e) => {
    if (!canvas.isConnected) { window.removeEventListener('keydown', keys); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null && document.activeElement?.tagName !== 'INPUT') { d.slots[sel] = null; B.sel = null; refresh(); }
  };
  window.addEventListener('keydown', keys);
  return h('div', { class: 'sb' }, hullRow, stage, tray, side);
}

// ======================================================================= slips and yards
function yardsPage(ui, B, say, refresh) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const C = Lg.cfg;
  const out = h('div', { class: 'sb-page' });
  const builds = Y.state.builds.filter((b) => ['building', 'waiting'].includes(b.status));
  out.append(h('h3', {}, 'On the slips'));
  if (!builds.length) out.append(h('p', { class: 'fc-muted' }, 'Nothing on the slips. Design a ship and lay its keel.'));
  const grid = h('div', { class: 'fc-grid' });
  for (const b of builds) {
    const f = Math.min(1, (g.clock.total - b.start) / Math.max(1, b.end - b.start));
    const look = Y.compute(b.design).look;
    grid.append(h('div', { class: 'fc-tile' },
      profilePic(look, 300, 110, { reveal: b.status === 'waiting' ? 1 : f }),
      h('b', {}, b.design.name), h('small', {}, `${C.hulls[b.design.hull].name} · ${Lg.port(b.port).name}`),
      h('div', { class: 'fc-bar' }, h('span', {}, 'Built'), h('div', { class: 'fc-bar-track' }, h('i', { style: `width:${Math.round(f * 100)}%;background:#f2c14e` })), h('em', {}, `${Math.round(f * 100)}%`)),
      h('small', {}, b.status === 'waiting' ? 'Finished — waiting for a free berth' : `Launches ${Lg.when(b.end)}`),
      h('button', { class: 'fc-btn', onclick: () => { say(Y.cancel(b.id)); refresh(); } }, 'Cancel (parts back, half refunded)')));
  }
  out.append(grid);
  out.append(h('h3', {}, 'Shipyards'), h('p', { class: 'fc-muted' }, 'Mason\'s Os build a yard at a commercial port or bigger. Futuristic hulls need a yard at an advanced port (warships: advanced port or naval base) and the licence.'));
  const yg = h('div', { class: 'fc-grid' });
  for (const id of Lg.ownedPorts()) {
    const y = Y.yard(id);
    const q = Y.yardQuote(id);
    yg.append(h('div', { class: 'fc-tile' }, h('b', {}, Lg.port(id).name), h('small', {}, Lg.portType(id).name),
      y ? (y.status === 'ready' ? h('span', { class: 'pos' }, '✅ Working') : h('div', {}, h('div', { class: 'fc-bar' }, h('span', {}, 'Building'), h('div', { class: 'fc-bar-track' }, h('i', { style: `width:${Math.round(Math.min(1, (g.clock.total - y.start) / (y.end - y.start)) * 100)}%;background:#f2c14e` })), h('em', {}, `ready ${Lg.when(y.end)}`))))
        : q.ok ? h('button', { class: 'fc-go', disabled: !g.corp.canAfford('shipping', q.cost), onclick: () => { say(Y.commissionYard(id)); refresh(); } }, `Commission Mason's Os`, h('small', {}, `${num(q.cost)} ◎ · ${q.days} days${q.discount ? ` · −${Math.round(q.discount * 100)}% goodwill` : ''}`))
          : h('small', { class: 'fc-muted' }, cap(q.reasons[0]))));
  }
  out.append(yg);
  return out;
}

// ======================================================================= the parts store
function storePage(ui, B, say, refresh) {
  const g = ui.game;
  const Lg = g.logistics;
  const Y = Lg.shipyard;
  const C = Lg.cfg;
  const out = h('div', { class: 'sb-page' });
  for (const [id, t] of Object.entries(C.tech)) {
    out.append(h('div', { class: 'fc-card' }, h('div', { class: 'fc-card-head' }, h('span', { class: 'fc-ic' }, '📜'), h('div', { class: 'grow' }, h('b', {}, t.name), h('small', {}, t.text)),
      Y.state.tech[id] ? h('span', { class: 'pos' }, '✔ Held') : h('button', { class: 'fc-btn primary', disabled: !g.corp.canAfford('shipping', t.price), onclick: () => { say(Y.buyTech(id)); refresh(); } }, `Buy · ${num(t.price)}`))));
  }
  out.append(h('p', { class: 'fc-muted' }, `Parts wait in your store until a build uses them (at most ${Y.rules.maxStock} of each). The designer buys whatever a design still needs in one click, so you only need this to stock up.`));
  for (const [fam, label] of FAMILIES) {
    const list = Object.entries(C.components).filter(([, c]) => c.family === fam);
    if (!list.length) continue;
    out.append(h('h3', {}, label));
    const grid = h('div', { class: 'sb-store' });
    for (const [id, c] of list) {
      const have = Y.state.stock[id] || 0;
      const locked = c.tech === 'advanced' && !Y.state.tech.advanced;
      grid.append(h('div', { class: `sb-card${locked ? ' off' : ''}` }, partPic(id, 120, 84), h('b', {}, c.name), h('small', {}, c.text),
        h('div', { class: 'sb-card-meta' }, h('span', {}, `${num(c.price)} ◎`), h('span', {}, `${c.weight} t`), h('span', {}, c.tech), have ? h('span', { class: 'pos' }, `${have} in store`) : null),
        h('div', { class: 'fc-row-inline' }, h('button', { class: 'fc-btn', disabled: locked || !g.corp.canAfford('shipping', c.price), onclick: () => { say(Y.buyComponent(id, 1)); refresh(); } }, locked ? '🔒' : 'Buy 1'), !locked ? h('button', { class: 'fc-btn', disabled: !g.corp.canAfford('shipping', c.price) * 5, onclick: () => { say(Y.buyComponent(id, 5)); refresh(); } }, 'Buy 5') : null)));
    }
    out.append(grid);
  }
  return out;
}

