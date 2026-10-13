// Modal panel contents. Each panel is a function (ui, body, opts) that fills
// `body` and returns optional { title, tabs, onClose }.
import { GAME_VERSION, BUILD_CHANNEL, SAVE_SCHEMA_VERSION, versionLabel } from '../core/version.js';
import { RELEASE_NOTES } from '../core/releaseNotes.js';
import { SLOTS } from '../save/saveManager.js';
import { STATS } from '../dialogue/dialogueEngine.js';
import { OIL_PROJECTS } from '../systems/oilCompany.js';
import { runCommand } from '../game/debugCommands.js';
import { spotName, hhmm } from '../systems/gang.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

const ICONS = { knuckles: '👊', baton: '🏏', bat: '🏏', blade: '🔪', axe: '🪓', gun: '🔫', longgun: '🔫', ammo: '🧰', bun: '🍯', scone: '🧀', cup: '☕', flower: '🌸', bandage: '🩹', crowbar: '⚒️', spanner: '🔧', key: '🗝️', cog: '⚙️', bolts: '🔩', stamp: '✅', shard: '🔷', feather: '🪶', cigar: '🚬', spoon: '🥄', calc: '🧮', casing: '📟', keypad: '🔢', screen: '📺', chip: '💾', battery: '🔋', machine: '🏭', belt: '➡️', arm: '🦾' };
export const itemIcon = (def) => ICONS[def?.icon] || '📦';

// -------------------------------------------------------------------- pause
export function pausePanel(ui, body) {
  const b = (label, fn, cls = '') => h('button', { class: cls, onclick: () => { ui.audio.sfx('sfx_ui_click'); fn(); } }, label);
  body.append(
    h('div', { class: 'menu' },
      b('Resume', () => ui.closePanel(), 'primary'),
      b('Save game', () => ui.openPanel('saves', { mode: 'save' })),
      b('Load game', () => ui.openPanel('saves', { mode: 'load' })),
      b('Tablet', () => ui.openPanel('tablet')),
      b('Settings', () => ui.openPanel('settings')),
      b('About & release history', () => ui.openPanel('about')),
      b('Debug menu (testing)', () => ui.openPanel('debug')),
      b('Quit to title', () => ui.quitToTitle()),
    ),
    h('p', { class: 'muted', style: 'text-align:center;margin-top:16px' }, `The Oberverse ${versionLabel()} · save schema ${SAVE_SCHEMA_VERSION}`),
  );
  return { title: 'Paused' };
}

// ---------------------------------------------------------------- inventory
export function inventoryPanel(ui, body) {
  const g = ui.game;
  const render = () => {
    body.innerHTML = '';
    const p = g.player;
    body.append(
      h('div', { class: 'grid2', style: 'margin-bottom:12px' },
        h('div', { class: 'stat' }, h('span', {}, 'Obols'), h('b', {}, String(p.money))),
        h('div', { class: 'stat' }, h('span', {}, 'Health'), h('b', {}, `${Math.round(p.health)}/100`)),
        h('div', { class: 'stat' }, h('span', {}, 'Energy'), h('b', {}, `${Math.round(p.energy)}/100`)),
        ...STATS.map((s) => h('div', { class: 'stat' }, h('span', {}, s[0].toUpperCase() + s.slice(1)), h('b', {}, statDots(p.stats[s], ui.game.stat(s))))),
      ),
    );
    const list = g.inventory.list();
    if (!list.length) body.append(h('p', { class: 'muted' }, 'Your pockets are empty.'));
    const wrap = h('div', { class: 'list' });
    for (const e of list) {
      const owner = e.stolenFrom ? g.npcs.get(e.stolenFrom)?.profile.shortName || g.content.factions[e.stolenFrom]?.name : null;
      wrap.append(
        h('div', { class: 'item-row' },
          h('div', { class: 'icon' }, itemIcon(e.def)),
          h('div', { class: 'grow' },
            h('div', { class: 'name' }, e.def.name, e.count > 1 ? ` ×${e.count}` : '', owner ? h('span', { class: 'tag bad' }, `belongs to ${owner}`) : null, h('span', { class: 'tag' }, e.def.category)),
            h('div', { class: 'desc' }, e.def.description),
          ),
          e.def.weapon ? h('button', { class: g.player.equipped === e.id ? 'small primary' : 'small', onclick: () => {
            const r = g.combat.equip(g.player.equipped === e.id ? null : e.id);
            ui.toast(r.text, 'info', 2);
            render();
          } }, g.player.equipped === e.id ? 'Put away' : 'Equip') : null,
          e.def.use ? h('button', { class: 'small', onclick: () => {
            const r = g.inventory.use(e.id);
            ui.audio.sfx(r.ok ? 'sfx_eat' : 'sfx_ui_click');
            ui.toast(r.text, r.ok ? 'good' : 'info');
            render();
          } }, 'Use') : null,
        ),
      );
    }
    body.append(wrap);
  };
  render();
  return { title: 'Inventory' };
}

// ------------------------------------------------------------------ journal
export const JOURNAL_TABS = ['Quests', 'People', 'Customers', 'Notes', 'Standing'];

/** One of the journal's pages (shown as apps on the tablet, src/ui/tablet.js). */
export function journalTab(ui, body, tab) {
  const g = ui.game;
  if (tab === 'Quests') {
    const list = g.quests.journal();
    if (!list.length) body.append(h('p', { class: 'muted' }, 'No quests on your tablet yet. Lanternside is full of people with problems — go and talk to some.'));
    for (const q of list) {
      body.append(
        h('div', { class: `quest ${q.state}` },
          h('h3', {}, q.title, h('span', { class: `tag ${q.state === 'completed' ? 'good' : q.state === 'failed' ? 'bad' : ''}` }, q.state === 'active' ? (q.kind === 'job' ? 'job' : 'active') : q.state)),
          h('div', { class: 'muted' }, q.summary),
          q.objectives.length ? h('ul', {}, ...q.objectives.map((o) => h('li', {}, o.text))) : null,
          ...q.hints.map((t) => h('div', { class: 'hint' }, `💡 ${t}`)),
          h('details', {}, h('summary', {}, 'Log'), ...q.notes.map((n) => h('p', {}, n.text))),
        ),
      );
    }
  } else if (tab === 'People') {
    const met = [...g.npcs.values()].filter((n) => n.met);
    if (!met.length) body.append(h('p', { class: 'muted' }, 'You haven\'t properly met anyone yet.'));
    for (const n of met) {
      const r = g.relationships.get(n, 'player');
      const meter = (label, v) => h('div', {}, h('div', { style: 'display:flex;justify-content:space-between;font-size:13px' }, h('span', {}, label), h('span', {}, String(v))),
        h('div', { class: 'meter' }, h('i', { class: v >= 0 ? 'pos' : 'neg', style: `width:${Math.min(50, Math.abs(v) / 2)}%` })));
      const mood = g.content.moods[g.moodOf(n)];
      body.append(
        h('div', { class: 'quest' },
          h('h3', {}, n.profile.name, h('span', { class: 'tag' }, g.relationships.label(n, 'player')), mood && g.moodOf(n) !== 'neutral' ? h('span', { class: 'tag' }, mood.label) : null),
          h('div', { class: 'muted' }, n.profile.role),
          h('div', { class: 'grid2' }, meter('Trust', r.trust), meter('Affection', r.affection), meter('Respect', r.respect), meter('Suspicion', r.suspicion)),
        ),
      );
    }
  } else if (tab === 'Customers') {
    customersTab(g, body);
  } else if (tab === 'Notes') {
    const entries = Object.entries(g.player.knowledge || {}).sort((a, b) => b[1].at - a[1].at);
    if (!entries.length) body.append(h('p', { class: 'muted' }, 'You don\'t know much about Lanternside yet.'));
    const wrap = h('div', { class: 'list' });
    for (const [id, k] of entries) {
      const def = g.content.facts[id];
      if (!def) continue;
      const src = k.source?.startsWith('told:') ? `heard from ${g.npcs.get(k.source.slice(5))?.profile.shortName || 'someone'}` : k.source;
      wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, k.kind === 'fact' ? '📌' : '💬'), h('div', { class: 'grow' }, h('div', {}, def.text), h('div', { class: 'desc' }, `${k.kind === 'fact' ? 'Fact' : 'Rumour'} · ${src}`))));
    }
    body.append(wrap);
  } else {
    const rep = g.player.reputation;
    for (const [id, f] of Object.entries(g.content.factions)) {
      const v = rep[id] || 0;
      body.append(h('div', { class: 'quest' }, h('h3', {}, f.name, h('span', { class: `tag ${v > 0 ? 'good' : v < 0 ? 'bad' : ''}` }, String(v))), h('div', { class: 'muted' }, f.description),
        h('div', { class: 'meter' }, h('i', { class: v >= 0 ? 'pos' : 'neg', style: `width:${Math.min(50, Math.abs(v) / 2)}%` }))));
    }
  }
}

/** Base stat as dots, plus a calculator high (green +) or comedown (orange −). */
function statDots(base, eff) {
  const dots = '●'.repeat(Math.max(0, Math.min(5, base))) + '○'.repeat(Math.max(0, 5 - base));
  return eff > base ? `${dots} +${eff - base}🧮` : eff < base ? `${dots} −${base - eff}🧮` : dots;
}

/** Journal → Customers: the calculator trade (src/systems/gang.js). */
function customersTab(g, body) {
  const st = g.world.gang;
  const tier = g.gang.tier();
  const tierName = ['Calm', 'Warned you', 'Hostile', 'At war'][tier];
  body.append(h('div', { class: 'quest' },
    h('h3', {}, 'Sums of Anarchy', h('span', { class: `tag ${tier >= 2 ? 'bad' : tier === 1 ? '' : 'good'}` }, g.gang.truce() ? `Truce to Day ${st.truceUntilDay}` : tierName)),
    h('div', { class: 'muted' }, `Anger ${Math.round(st.anger)}/100. 25: a warning · 50: they jump you in the Sumps · 75: they hunt you across Halvermouth. Stealing customers and dealing raise it; quiet days lower it. Talk to Arthur at the Abacus about a truce.`),
    h('div', { class: 'meter' }, h('i', { class: 'neg', style: `width:${Math.min(100, st.anger) / 2}%` }))));
  const rows = Object.entries(st.customers).map(([id, c]) => ({ id, c, npc: g.npcs.get(id) })).filter((r) => r.npc);
  const order = { player: 0, gang: 1, locked: 2 };
  rows.sort((a, b) => order[a.c.status] - order[b.c.status] || a.npc.profile.name.localeCompare(b.npc.profile.name));
  const wrap = h('div', { class: 'list' });
  for (const { c, npc } of rows) {
    const fav = g.content.items[`item_calc_${npc.profile.customer.favourite}`];
    const status = { player: 'Your customer', gang: 'Buys from the gang', locked: 'Doesn\'t know you' }[c.status];
    let line = `Favourite: ${fav?.name || '?'} · pays up to ${npc.profile.customer.budget} obols`;
    if (c.status === 'player') line += ` · ${c.orders} deals · happiness ${Math.round(c.satisfaction)} · habit ${Math.round(c.addiction * 100)}%`;
    if (c.status === 'locked') line += ' · needs a friend to vouch for you';
    const o = c.order;
    const orderLine = o ? `📟 ${o.qty}× ${g.content.items[`item_calc_${o.type}`]?.name} at ${o.price} each — ${spotName(o.spot)}, ${hhmm(o.from)}–${hhmm(o.until)}${g.clock.total >= o.from ? ' (NOW)' : ''}` : null;
    wrap.append(h('div', { class: 'item-row' },
      h('div', { class: 'icon' }, c.status === 'player' ? '🧮' : c.status === 'gang' ? '∑' : '🔒'),
      h('div', { class: 'grow' }, h('div', {}, `${npc.profile.name} — ${status}`), h('div', { class: 'desc' }, line), orderLine ? h('div', { class: 'hint' }, orderLine) : null)));
  }
  body.append(wrap);
  body.append(h('p', { class: 'muted' }, 'Win a customer with a free sample (their favourite works best; Charm helps). They page you orders with a time and place — deliver in person. Three good deals and they\'ll vouch for you with a friend. Officers who see you deal will arrest you.'));
}

// ---------------------------------------------------------------------- map
/** The world map's camera survives re-opening (world tiles at the centre, px per tile). */
const MAPVIEW = { cx: null, cy: null, z: 6 };

export function mapPanel(ui, body, opts) {
  const g = ui.game;
  const current = g.currentMap();
  const R = ui.maps;
  const tabs = [];
  const inside = current.kind === 'interior';
  const mode = opts.mode || 'world';
  tabs.push({ label: 'World', active: mode === 'world', onclick: () => ui.openPanel('map', { mode: 'world' }) });
  if (inside) tabs.push({ label: current.name, active: mode === 'here', onclick: () => ui.openPanel('map', { mode: 'here' }) });
  if (mode === 'here') {
    const canvas = h('canvas', { id: 'worldmap' });
    body.append(canvas);
    R.drawWorldMap(canvas, current.id);
    return { title: 'Map', tabs };
  }

  const L = R.worldLayout();
  const me = R.playerWorld();
  if (MAPVIEW.cx === null || opts.centre) {
    const c = me || { x: L.bounds.x + L.bounds.w / 2, y: L.bounds.y + L.bounds.h / 2 };
    MAPVIEW.cx = c.x;
    MAPVIEW.cy = c.y;
  }
  const wrap = h('div', { class: 'wmap' });
  const canvas = h('canvas', { class: 'wmap-canvas' });
  const tip = h('div', { class: 'wmap-tip hidden' });
  const zoomLabel = h('span', { class: 'wmap-zoom' });
  let W = 0;
  let H = 0;
  let hits = [];
  let hover = null;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const ZMIN = 1;
  const ZMAX = 24;
  const draw = () => {
    if (!canvas.isConnected) return;
    W = canvas.clientWidth || 720;
    H = canvas.clientHeight || 480;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hits = R.drawWorld(ctx, W, H, MAPVIEW, hover);
    zoomLabel.textContent = `${Math.round((MAPVIEW.z / 6) * 100)}%`;
  };
  const fit = (box) => {
    MAPVIEW.cx = box.x + box.w / 2;
    MAPVIEW.cy = box.y + box.h / 2;
    MAPVIEW.z = Math.max(ZMIN, Math.min(ZMAX, Math.min((W || 720) / box.w, (H || 480) / (box.h + 8)) * 0.92));
    draw();
  };
  const zoomAt = (k, sx = W / 2, sy = H / 2) => {
    const wx = MAPVIEW.cx + (sx - W / 2) / MAPVIEW.z;
    const wy = MAPVIEW.cy + (sy - H / 2) / MAPVIEW.z;
    MAPVIEW.z = Math.max(ZMIN, Math.min(ZMAX, MAPVIEW.z * k));
    MAPVIEW.cx = wx - (sx - W / 2) / MAPVIEW.z;
    MAPVIEW.cy = wy - (sy - H / 2) / MAPVIEW.z;
    draw();
  };
  const bar = h('div', { class: 'wmap-bar' },
    h('button', { class: 'small', title: 'Zoom out', onclick: () => zoomAt(1 / 1.4) }, '−'),
    zoomLabel,
    h('button', { class: 'small', title: 'Zoom in', onclick: () => zoomAt(1.4) }, '+'),
    h('button', { class: 'small', onclick: () => fit(L.bounds) }, '🌍 Whole world'),
    me ? h('button', { class: 'small', onclick: () => { MAPVIEW.cx = me.x; MAPVIEW.cy = me.y; MAPVIEW.z = Math.max(MAPVIEW.z, 8); draw(); } }, '◎ Me') : null,
    ...L.regions.map((r) => h('button', { class: 'small', onclick: () => fit(r) }, r.name)));
  wrap.append(bar, h('div', { class: 'wmap-view' }, canvas, tip));
  body.append(wrap);

  let drag = null;
  const local = (e) => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  canvas.addEventListener('pointerdown', (e) => { drag = local(e); canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); tip.classList.add('hidden'); });
  canvas.addEventListener('pointerup', () => { drag = null; canvas.classList.remove('grabbing'); });
  canvas.addEventListener('pointermove', (e) => {
    const pt = local(e);
    if (drag) {
      MAPVIEW.cx -= (pt.x - drag.x) / MAPVIEW.z;
      MAPVIEW.cy -= (pt.y - drag.y) / MAPVIEW.z;
      drag = pt;
      draw();
      return;
    }
    const hit = [...hits].reverse().find((x) => pt.x >= x.x && pt.x <= x.x + x.w && pt.y >= x.y && pt.y <= x.y + x.h);
    const key = hit?.key || null;
    if (key !== hover) { hover = key; draw(); }
    if (!hit) { tip.classList.add('hidden'); return; }
    const i = hit.info;
    tip.replaceChildren(h('b', {}, `${i.icon} ${i.name}`), h('div', {}, i.kind + (i.yours ? ' · yours' : '')), i.place ? h('div', { class: 'muted' }, i.place) : null);
    tip.classList.remove('hidden');
    tip.style.left = `${Math.min(pt.x + 14, W - 200)}px`;
    tip.style.top = `${Math.min(pt.y + 14, H - 60)}px`;
  });
  canvas.addEventListener('pointerleave', () => { tip.classList.add('hidden'); if (hover) { hover = null; draw(); } });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const pt = local(e); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, pt.x, pt.y); }, { passive: false });
  requestAnimationFrame(draw);

  body.append(
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: 'background:#fff;border:2px solid #2d2433' }), 'You'),
      h('span', {}, h('i', { style: 'background:#c0614a' }), 'People you\'ve met (zoom in)'),
      h('span', {}, h('i', { style: 'background:#e8b64c' }), 'Objective'),
      h('span', {}, h('i', { style: 'background:#fbf4e6;border:2px solid #e8b64c;border-radius:50%' }), 'Home, property and cars you own'),
    ),
    h('p', { class: 'muted' }, `Drag to pan, scroll or use + / − to zoom, hover an icon to see what it is. Areas discovered: ${Object.keys(g.player.discovered.areas).length}. Unexplored districts stay dark until you visit them.${me?.inside ? ` You are inside ${me.inside}.` : ''}`),
  );
  return { title: 'World Map', tabs, className: 'wide' };
}

// ---------------------------------------------------------------- container
export function containerPanel(ui, body, opts) {
  const g = ui.game;
  const render = (msg) => {
    body.innerHTML = '';
    const v = g.containerView(opts.containerId);
    if (v.owner !== 'player') body.append(h('p', { class: 'muted' }, `This belongs to ${v.ownerName}. Taking things without permission is theft — if anyone sees.`));
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    const wrap = h('div', { class: 'list' });
    if (v.money > 0) {
      wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '🪙'), h('div', { class: 'grow' }, h('div', { class: 'name' }, `${v.money} obols`)),
        h('button', { class: 'small', onclick: () => { const r = g.takeFromContainer(v.id, 'money'); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, 'Take')));
    }
    for (const it of v.items) {
      wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(it.def)), h('div', { class: 'grow' }, h('div', { class: 'name' }, it.def.name, it.count > 1 ? ` ×${it.count}` : ''), h('div', { class: 'desc' }, it.def.description)),
        h('button', { class: 'small', onclick: () => { const r = g.takeFromContainer(v.id, it.id); if (!r.ok) ui.audio.sfx('sfx_fail'); render(r.text); } }, 'Take'),
        v.owner === 'player' && it.count > 1 ? h('button', { class: 'small', onclick: () => { const r = g.takeFromContainer(v.id, it.id, it.count); render(r.text); } }, 'All') : null));
    }
    if (!v.items.length && v.money <= 0) wrap.append(h('p', { class: 'muted' }, 'Empty.'));
    body.append(wrap);
    const returnable = g.inventory.list().filter((e) => e.stolenFrom === v.owner || v.owner === 'player');
    if (returnable.length) {
      body.append(h('h3', { style: 'margin:14px 0 6px' }, v.owner === 'player' ? 'Store' : 'Put back'));
      const w2 = h('div', { class: 'list' });
      for (const e of returnable) {
        w2.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(e.def)), h('div', { class: 'grow' }, h('div', { class: 'name' }, e.def.name)),
          h('button', { class: 'small', onclick: () => { const r = g.putInContainer(v.id, e.id); render(r.text); } }, 'Put'),
          v.owner === 'player' && e.count > 1 ? h('button', { class: 'small', onclick: () => { const r = g.putInContainer(v.id, e.id, e.count); render(r.text); } }, 'All') : null));
      }
      body.append(w2);
      if (v.owner === 'player' && returnable.some((e) => e.def.category === 'part')) {
        body.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { onclick: () => {
          let n = 0;
          for (const e of g.inventory.list()) if (e.def.category === 'part') { g.putInContainer(v.id, e.id, e.count); n += e.count; }
          render(`Stored ${n} parts.`);
        } }, 'Store all parts')));
      }
    }
  };
  render();
  return { title: g.content.containers[opts.containerId].name };
}

// --------------------------------------------------------------------- shop
export function shopPanel(ui, body, opts) {
  const g = ui.game;
  const def = g.content.shops[opts.shopId];
  const render = (msg) => {
    body.innerHTML = '';
    body.append(h('div', { class: 'stat', style: 'margin-bottom:10px' }, h('span', {}, 'Your obols'), h('b', {}, String(g.player.money))));
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    const st = g.world.shops[opts.shopId];
    const wrap = h('div', { class: 'list' });
    for (const [id, n] of Object.entries(st.stock)) {
      const item = g.content.items[id];
      const price = g.priceFor(opts.shopId, id);
      const listPrice = def.prices?.[id] ?? item.price;
      wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(item)),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, item.name, h('span', { class: 'tag' }, n > 0 ? `${n} left` : 'sold out'), price < listPrice ? h('span', { class: 'tag good' }, 'friend price') : null, listPrice > item.price ? h('span', { class: 'tag bad' }, 'company price') : null), h('div', { class: 'desc' }, item.description)),
        h('button', { class: 'small primary', disabled: n <= 0 || g.player.money < price, onclick: () => { const r = g.buy(opts.shopId, id); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, `Buy · ${price}`)));
    }
    body.append(wrap);
    const sellable = g.inventory.list().filter((e) => g.priceFor(opts.shopId, e.id, true) > 0);
    if (sellable.length) {
      body.append(h('h3', { style: 'margin:14px 0 6px' }, `${g.npcs.get(def.owner)?.profile.shortName || 'They'} will buy`));
      if (def.armsBuyer && g.arms.licensed()) body.append(h('p', { class: 'muted' }, `Wholesale for your arms works' output: half of value, with your research. Lucas has ${g.arms.lucasBudgetLeft()} obols left to spend today.`));
      const w2 = h('div', { class: 'list' });
      for (const e of sellable) {
        w2.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(e.def)), h('div', { class: 'grow' }, h('div', { class: 'name' }, e.def.name, e.count > 1 ? ` ×${e.count}` : '')),
          h('button', { class: 'small', onclick: () => { const r = g.sell(opts.shopId, e.id); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, `Sell · ${g.priceFor(opts.shopId, e.id, true)}`)));
      }
      body.append(w2);
    }
  };
  render();
  return { title: def.name, onClose: opts.onClose };
}

// --------------------------------------------------------------------- read
export function readPanel(ui, body, opts) {
  ui.audio.sfx('sfx_page');
  body.append(h('div', { class: 'doc' }, ...opts.body.map((p) => h('p', {}, p))));
  return { title: opts.title };
}

export function messagePanel(ui, body, opts) {
  body.append(h('p', {}, opts.text));
  if (opts.confirm) {
    body.append(h('div', { class: 'row' }, h('button', { class: 'ghost', onclick: () => ui.closePanel() }, opts.cancelLabel || 'Cancel'), h('button', { class: 'primary', onclick: () => opts.confirm() }, opts.confirmLabel || 'OK')));
  }
  return { title: opts.title || '' };
}

// -------------------------------------------------------------------- debug
/** Debug menu (` key): testing tools and a command console. Not part of normal play. */
export function debugPanel(ui, body) {
  const g = ui.game;
  ui.debugLog = ui.debugLog || ['Debug console — type help for commands. Changes mark the save as debug_used.'];
  ui.debugHistory = ui.debugHistory || [];
  const status = h('div', { class: 'grid2 debug-status' });
  const log = h('pre', { class: 'debug-log' });
  const refresh = () => {
    const p = g.player;
    const w = g.combat.equipped();
    const ammo = g.combat.ammoStatus();
    status.innerHTML = '';
    status.append(
      h('div', { class: 'stat' }, h('span', {}, 'Obols'), h('b', {}, String(p.money))),
      h('div', { class: 'stat' }, h('span', {}, 'Health / energy'), h('b', {}, `${Math.round(p.health)} / ${Math.round(p.energy)}${p.god ? ' · GOD' : ''}`)),
      h('div', { class: 'stat' }, h('span', {}, 'Where'), h('b', {}, `${p.map} ${Math.floor(p.x / 32)},${Math.floor(p.y / 32)}`)),
      h('div', { class: 'stat' }, h('span', {}, 'When'), h('b', {}, `Day ${g.clock.day} ${g.clock.timeString}`)),
      h('div', { class: 'stat' }, h('span', {}, 'Weapon'), h('b', {}, `${w.name}${ammo ? ` ${ammo.loaded}/${ammo.mag} · ${ammo.reserve}` : ''}`)),
      h('div', { class: 'stat' }, h('span', {}, 'Overlay'), h('b', {}, ui.settings.showFps ? 'on' : 'off')),
    );
    log.textContent = ui.debugLog.slice(-200).join('\n');
    log.scrollTop = log.scrollHeight;
  };
  const run = (line) => {
    if (!line.trim()) return;
    ui.debugHistory.push(line);
    ui.debugLog.push(`> ${line}`);
    if (line.trim() === 'clear') ui.debugLog = [];
    else if (line.trim() === 'overlay') {
      ui.settings.showFps = !ui.settings.showFps;
      ui.applySettings();
      ui.debugLog.push(`Overlay ${ui.settings.showFps ? 'on' : 'off'}.`);
    } else {
      const r = runCommand(g, line);
      if (r.text) ui.debugLog.push(r.text);
    }
    refresh();
  };
  const btn = (label, line, cls = 'small') => h('button', { class: cls, onclick: () => run(line) }, label);

  // quick actions
  const quick = h('div', { class: 'debug-quick' },
    btn('+100 obols', 'money +100'), btn('+1000 obols', 'money +1000'), btn('Heal', 'heal'), btn('God mode', 'god'),
    btn('All weapons', 'weapons'), btn('Ammo', 'ammo'), btn('Revive all', 'revive all'),
    btn('→ 08:00', 'time 08:00'), btn('→ 22:00', 'time 22:00'), btn('Skip 1 h', 'skip 60'), btn('Overlay', 'overlay'),
  );

  // teleport
  const mapSel = h('select', { class: 'debug-select' }, ...[...g.maps.values()].map((m) => h('option', { value: m.id, selected: m.id === g.player.map }, `${m.name} (${m.id})`)));
  const tp = h('div', { class: 'debug-row' }, mapSel, h('button', { class: 'small primary', onclick: () => { run(`tp ${mapSel.value}`); } }, 'Teleport'));

  // item spawner
  const search = h('input', { type: 'text', class: 'debug-input', placeholder: 'Search items (name, id or category: weapon, ammo, gift…)' });
  const qty = h('input', { type: 'number', class: 'debug-qty', value: '1', min: '1' });
  const list = h('div', { class: 'list debug-items' });
  const drawItems = () => {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    const matches = Object.entries(g.content.items).filter(([id, it]) => !q || id.includes(q) || it.name.toLowerCase().includes(q) || it.category === q);
    for (const [id, it] of matches.slice(0, 40)) {
      list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(it)),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, it.name, h('span', { class: 'tag' }, it.category), g.inventory.count(id) ? h('span', { class: 'tag good' }, `have ${g.inventory.count(id)}`) : null), h('div', { class: 'desc' }, id)),
        h('button', { class: 'small primary', onclick: () => { run(`give ${id} ${Math.max(1, Number(qty.value) || 1)}`); drawItems(); } }, 'Give')));
    }
    if (!matches.length) list.append(h('p', { class: 'muted' }, 'No items match.'));
  };
  search.addEventListener('input', drawItems);

  // console
  let hi = ui.debugHistory.length;
  const input = h('input', { type: 'text', class: 'debug-input debug-console', placeholder: 'Command (help, give pistol, money 500, tp halvermouth, revive all…)', autocomplete: 'off', spellcheck: 'false' });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { run(input.value); input.value = ''; hi = ui.debugHistory.length; }
    else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); input.value = ui.debugHistory[hi] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(ui.debugHistory.length, hi + 1); input.value = ui.debugHistory[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Escape') { input.blur(); ui.closePanel(); }
    e.stopPropagation();
  });

  body.append(
    status,
    h('h3', {}, 'Quick'), quick,
    h('h3', {}, 'Teleport'), tp,
    h('h3', {}, 'Console'), log, input,
    h('h3', {}, 'Spawn items'), h('div', { class: 'debug-row' }, search, h('span', { class: 'muted' }, 'qty'), qty), list,
  );
  refresh();
  drawItems();
  setTimeout(() => input.focus(), 30);
  return { title: 'Debug menu' };
}

// --------------------------------------------------------------- struck down
/** After the Wrath: the player's choice. Closing the card counts as rising again. */
export function struckDownPanel(ui, body, opts) {
  let chosen = false;
  const rise = () => {
    if (chosen) return;
    chosen = true;
    ui.game.combat.riseAgain();
    ui.el.hud.classList.remove('cinematic');
    ui.closeAllPanels();
    ui.afterModalClose();
    ui.renderer.snapCamera();
  };
  body.append(
    h('p', { class: 'doc' }, `You raised a hand against ${opts.name}, and the Oberverse answered.`),
    h('p', { class: 'muted' }, 'Imported characters are protected. They cannot be harmed — only the hand that strikes at them.'),
    h('div', { class: 'row' },
      ui.saves.list().some((x) => x.slot === 'auto' && !x.empty && !x.corrupt) ? h('button', { class: 'ghost', onclick: () => {
        chosen = true;
        ui.closeAllPanels();
        if (ui.loadFrom('auto') === false) { chosen = false; rise(); return; } // couldn't load: rise instead
        ui.el.hud.classList.remove('cinematic');
      } }, 'Load last autosave') : null,
      h('button', { class: 'primary', onclick: rise }, opts.after === 'jail' ? 'Wake up (in a cell)' : 'Rise again (wake at home tomorrow)')),
  );
  return { title: 'You were struck down', onClose: rise };
}

// ----------------------------------------------------------------- settings
export function settingsPanel(ui, body) {
  const s = ui.settings;
  const grid = h('div', { class: 'settings-grid' });
  const slider = (key, label) => {
    const val = h('span', {}, `${Math.round(s[key] * 100)}`);
    grid.append(h('label', { for: `set-${key}` }, label), h('input', { id: `set-${key}`, type: 'range', min: 0, max: 1, step: 0.05, value: s[key], oninput: (e) => { s[key] = Number(e.target.value); val.textContent = `${Math.round(s[key] * 100)}`; ui.applySettings(); } }), val);
  };
  slider('master', 'Master volume');
  slider('music', 'Music');
  slider('sfx', 'Sound effects');
  slider('ambience', 'Ambience');
  slider('voice', 'Voices');
  grid.append(h('label', { for: 'set-mute' }, 'Mute all'), h('input', { id: 'set-mute', type: 'checkbox', checked: s.muted, onchange: (e) => { s.muted = e.target.checked; ui.applySettings(); } }), h('span'));
  const speed = h('select', { id: 'set-speed', onchange: (e) => { s.textSpeed = e.target.value; ui.applySettings(); } }, ...['slow', 'normal', 'fast', 'instant'].map((v) => h('option', { value: v, selected: s.textSpeed === v }, v)));
  grid.append(h('label', { for: 'set-speed' }, 'Text speed'), speed, h('span'));
  grid.append(h('label', { for: 'set-fps' }, 'Show debug info'), h('input', { id: 'set-fps', type: 'checkbox', checked: s.showFps, onchange: (e) => { s.showFps = e.target.checked; ui.applySettings(); } }), h('span'));
  body.append(grid);
  if (ui.audio.failures.length) body.append(h('p', { class: 'muted' }, `Audio notes: ${ui.audio.failures.slice(-3).join('; ')}`));
  if (!ui.audio.enabled) body.append(h('p', { class: 'muted' }, 'Sound starts after your first click or key press (browser rule). If it never starts, your browser may not support Web Audio — the game still works silently.'));
  const rows = [
    ['WASD / Arrows', 'Move'], ['Shift', 'Sprint (uses energy)'], ['E / Space', 'Interact, talk, advance dialogue'], ['1–9', 'Choose a dialogue option'],
    ['I / Tab', 'Inventory'], ['J / Q', 'Journal'], ['M', 'Map'], ['Esc / P', 'Pause menu / back'], ['F5 / F9', 'Quick save / quick load'], ['`', 'Debug overlay'],
  ];
  body.append(h('table', { class: 'controls-table' }, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))));
  return { title: 'Settings', onClose: () => ui.saveSettings() };
}

// -------------------------------------------------------------------- saves
export function savesPanel(ui, body, opts) {
  const mode = opts.mode || 'load';
  const inGame = Boolean(ui.game?.player) && ui.state === 'playing';
  const render = (msg) => {
    body.innerHTML = '';
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    const list = ui.saves.list();
    const wrap = h('div', { class: 'list' });
    for (const s of list) {
      const label = s.slot === 'auto' ? 'Autosave' : `Slot ${s.slot.slice(4)}`;
      const info = s.empty ? 'Empty' : s.corrupt ? 'Unreadable (a backup may load)' : `${s.meta.playerName} · Day ${s.meta.day} ${s.meta.time} · ${s.meta.location} · v${s.gameVersion}`;
      const btns = [];
      if (mode === 'save' && s.slot !== 'auto' && inGame) btns.push(h('button', { class: 'small primary', onclick: () => { const r = ui.saveTo(s.slot); render(r.ok ? `Saved to ${label}.` : r.error); } }, 'Save here'));
      if (!s.empty) btns.push(h('button', { class: 'small', onclick: () => ui.loadFrom(s.slot) }, 'Load'));
      if (!s.empty) btns.push(h('button', { class: 'small ghost', onclick: () => ui.exportSlot(s.slot) }, 'Export'));
      if (!s.empty && s.slot !== 'auto') btns.push(h('button', { class: 'small ghost', onclick: () => { ui.saves.delete(s.slot); render(`${label} deleted (a backup copy was kept).`); } }, 'Delete'));
      wrap.append(h('div', { class: 'item-row slot' }, h('div', { class: 'icon' }, s.slot === 'auto' ? '⟳' : '💾'), h('div', { class: 'grow' }, h('div', { class: 'name' }, label), h('div', { class: 'desc' }, info)), ...btns));
    }
    body.append(wrap);
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none', onchange: async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      const target = list.find((x) => x.empty && x.slot !== 'auto')?.slot || 'slot3';
      const r = ui.saves.importToSlot(target, text);
      render(r.ok ? `Imported into ${target}.${r.warnings.length ? ' Repairs: ' + r.warnings.join(' ') : ''}` : `Import failed: ${r.errors.join(' ')}`);
    } });
    body.append(h('div', { class: 'row' }, file, h('button', { class: 'small', onclick: () => file.click() }, 'Import save file…')));
  };
  render();
  return { title: mode === 'save' ? 'Save game' : 'Load game' };
}

// -------------------------------------------------------------------- about
export function aboutPanel(ui, body) {
  body.append(
    h('p', {}, h('b', {}, `The Oberverse ${versionLabel()}`), ` — build channel: ${BUILD_CHANNEL}, save schema ${SAVE_SCHEMA_VERSION}.`),
    h('p', { class: 'muted' }, 'A persistent, character-driven sandbox RPG. All characters, writing, art and music in this build are original to the project and generated procedurally in your browser. No online services are used.'),
  );
  for (const r of RELEASE_NOTES) {
    body.append(h('div', { class: 'quest' }, h('h3', {}, `v${r.version} — ${r.title}`, h('span', { class: 'tag' }, r.channel), h('span', { class: 'tag' }, r.date)), h('ul', {}, ...r.notes.map((n) => h('li', {}, n)))));
  }
  body.append(h('p', { class: 'muted' }, `Full history: CHANGELOG.md and VERSION_HISTORY.md in the project folder. Current version: ${GAME_VERSION}.`));
  return { title: 'About the Oberverse' };
}

// ---------------------------------------------------------------- choices
export function choicesPanel(ui, body, opts) {
  body.append(h('p', {}, opts.text));
  const wrap = h('div', { class: 'list' });
  for (const o of opts.options) {
    wrap.append(h('button', { style: 'text-align:left', onclick: () => {
      ui.audio.sfx('sfx_ui_click');
      const [sys, method, ...args] = o.call;
      const target = { oil: ui.game.oil, construction: ui.game.construction, police: ui.game.police, gang: ui.game.gang, factory: ui.game.factory, arms: ui.game.arms, vehicles: ui.game.vehicles }[sys] || ui.game;
      const r = target[method](...args);
      ui.closePanel();
      if (r?.text) ui.showCaption(r.text, 5);
    } }, o.label));
  }
  body.append(wrap);
  return { title: opts.title };
}

// ----------------------------------------------------------------- invest
export function investPanel(ui, body, opts) {
  stocksScreen(ui, body);
  return { title: 'Ober\'s Oil — Share Register', onClose: opts.onClose };
}

/** The share register: Sir Moneybucks's desk, and the tablet's Stocks app. */
export function stocksScreen(ui, body, opts = {}) {
  const g = ui.game;
  const render = (msg) => {
    body.innerHTML = '';
    if (opts.header) body.append(opts.header());
    const s = g.oil.state;
    const out = g.oil.computeOutput();
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    body.append(
      h('div', { class: 'grid2', style: 'margin-bottom:12px' },
        h('div', { class: 'stat' }, h('span', {}, 'Your obols'), h('b', {}, String(g.player.money))),
        h('div', { class: 'stat' }, h('span', {}, 'Your shares'), h('b', {}, String(s.sharesOwned))),
        h('div', { class: 'stat' }, h('span', {}, 'Share price'), h('b', {}, `${s.sharePrice} obols`)),
        h('div', { class: 'stat' }, h('span', {}, 'Output today'), h('b', {}, `${out} barrels${s.strike ? ' (STRIKE)' : ''}`)),
        h('div', { class: 'stat' }, h('span', {}, 'Dividend/share'), h('b', {}, `≈${g.oil.dividendPerShare(out).toFixed(2)} at 18:00`)),
        h('div', { class: 'stat' }, h('span', {}, 'Dividends received'), h('b', {}, `${s.dividendsPaid} obols`)),
      ),
      h('div', { class: 'row', style: 'justify-content:flex-start' },
        ...[1, 5].map((n) => h('button', { class: 'small primary', disabled: g.player.money < s.sharePrice * n, onclick: () => { const r = g.oil.buyShares(n); render(r.text); } }, `Buy ${n} (${s.sharePrice * n})`)),
        ...[1, 5].map((n) => h('button', { class: 'small', disabled: s.sharesOwned < n, onclick: () => { const r = g.oil.sellShares(n); render(r.text); } }, `Sell ${n}`)),
      ),
      h('h3', { style: 'margin:16px 0 6px' }, 'Expansion projects'),
      h('p', { class: 'muted' }, 'Funding a project earns bonus shares — and has consequences.'),
    );
    const wrap = h('div', { class: 'list' });
    for (const [id, p] of Object.entries(OIL_PROJECTS)) {
      const done = g.oil.projectCount(id) >= p.max;
      wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, id === 'derrick' ? '🛢️' : id === 'pipeline' ? '🔧' : '⛑️'),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, p.name, h('span', { class: 'tag' }, `+${p.bonusShares} shares`), done ? h('span', { class: 'tag good' }, 'done') : null), h('div', { class: 'desc' }, p.text)),
        h('button', { class: 'small primary', disabled: done || g.player.money < p.cost, onclick: () => { const r = g.oil.fundProject(id); render(r.text); } }, `Fund · ${p.cost}`)));
    }
    body.append(wrap);
    if (s.history.length) body.append(h('p', { class: 'muted', style: 'margin-top:10px' }, `Recent days: ${s.history.slice(-5).map((d) => `Day ${d.day}: ${d.output} bbl @ ${d.price}`).join(' · ')}`));
  };
  render();
}

// --------------------------------------------------------------- contracts
export function contractsPanel(ui, body, opts) {
  const g = ui.game;
  const P = g.properties;
  const render = (msg) => {
    body.innerHTML = '';
    const site = g.construction.state;
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    body.append(h('div', { class: 'grid2', style: 'margin-bottom:12px' },
      h('div', { class: 'stat' }, h('span', {}, 'Your obols'), h('b', {}, String(g.player.money))),
      h('div', { class: 'stat' }, h('span', {}, 'Crew goodwill'), h('b', {}, `${site.goodwill} / 30`)),
      h('div', { class: 'stat' }, h('span', {}, 'Goodwill discount'), h('b', {}, `${Math.round(g.construction.discount() * 100)}%`)),
      h('div', { class: 'stat' }, h('span', {}, 'Faster builds'), h('b', {}, g.construction.speedup() ? `−${g.construction.speedup()} day(s)` : 'not yet')),
    ));
    const plots = P.list();
    if (!plots.length) {
      body.append(h('p', { class: 'doc' }, 'The board is covered in blueprints and not one surveyed plot. A note in Quinn\'s tidy hand: "No plots surveyed yet — new land coming soon!" Underneath, in Mason\'s: "We\'re still laying the groundwork. Literally."'),
        h('p', { class: 'muted' }, 'Working shifts for Dee now builds crew goodwill: cheaper and faster contracts once plots open up.'));
    }
    const wrap = h('div', { class: 'list' });
    for (const { id, plot, status, record } of plots) {
      if (status !== 'none') {
        const bp = P.blueprints[record.blueprint];
        const label = status === 'permit' ? 'awaiting permit (Form 22-B, Civic Office)' : status === 'building' ? `under construction — ${record.daysLeft} day(s) left` : 'finished';
        wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, '🏗️'), h('div', { class: 'grow' }, h('div', { class: 'name' }, plot.name, h('span', { class: 'tag' }, bp.name)), h('div', { class: 'desc' }, label))));
        continue;
      }
      for (const bpId of plot.allowed || Object.keys(P.blueprints)) {
        const bp = P.blueprints[bpId];
        const q = P.quote(id, bpId);
        wrap.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, bpId === 'home' ? '🏠' : bpId === 'rental' ? '🏘️' : '🏪'),
          h('div', { class: 'grow' }, h('div', { class: 'name' }, `${plot.name}: ${bp.name}`, h('span', { class: 'tag' }, `${q.days} days`)), h('div', { class: 'desc' }, `${bp.text} Land ${q.land} + build ${q.build}.`)),
          h('button', { class: 'small primary', disabled: g.player.money < q.total, onclick: () => { const r = P.commission(id, bpId); render(r.text); } }, `Sign · ${q.total}`)));
      }
    }
    body.append(wrap);
  };
  render();
  return { title: 'Mason\'s Os — Contracts', onClose: opts.onClose };
}

// ------------------------------------------------------------------ ledger
export function ledgerPanel(ui, body) {
  const g = ui.game;
  if (!g.ledger) {
    const r = g.startLedger();
    if (!r.ok) {
      body.append(h('p', {}, r.text));
      return { title: 'The Ledger' };
    }
  }
  const render = (last) => {
    body.innerHTML = '';
    const m = g.ledger;
    const pointsRow = (pp, hp) => h('div', { class: 'grid2', style: 'margin-bottom:10px' },
      h('div', { class: 'stat' }, h('span', {}, 'You'), h('b', {}, `${pp} pts`)),
      h('div', { class: 'stat' }, h('span', {}, 'Sir Moneybucks'), h('b', {}, `${hp} pts`)));
    if (last) {
      const txt = last.folded ? `You fold. He shows a ${last.houseCard}${last.bluff ? ' — it was a bluff' : ''}. He takes 1 point.` :
        `You play ${last.playerCard}, he shows ${last.houseCard}${last.bluff ? ' (a bluff!)' : ''}. ${last.winner === 'player' ? `You take ${last.points}.` : `He takes ${last.points}${last.playerCard === last.houseCard ? ' — ties go to the house' : ''}.`}`;
      body.append(h('p', {}, h('b', {}, txt)));
    }
    if (!m) return;
    if (m.finished) {
      const res = g.finishLedger();
      body.append(pointsRow(res.playerPoints, res.housePoints),
        h('p', { class: 'doc' }, res.won ? 'You win the purse: 40 obols. Sir Moneybucks lights a cigar very slowly and says nothing for a full ten seconds.' : 'The house wins. Sir Moneybucks pockets your stake without looking at it.'),
        h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => ui.closePanel() }, 'Leave the table')));
      ui.audio.sfx(res.won ? 'sfx_quest' : 'sfx_fail');
      return;
    }
    const c = m.current;
    body.append(
      pointsRow(m.playerPoints, m.housePoints),
      h('p', {}, `Round ${m.round + 1} of 3. Sir Moneybucks lays a card face down and announces: `, h('b', {}, c.raise ? '"RAISE." (this round is worth 2)' : '"Steady." (this round is worth 1)')),
      h('p', { class: 'muted' }, `You watch him closely… ${c.tell}`),
      h('p', {}, 'Play a card (higher wins; ties go to the house), or fold and concede only 1 point:'),
      h('div', { class: 'row', style: 'justify-content:flex-start' },
        ...m.playerHand.map((card) => h('button', { class: 'primary', style: 'min-width:54px;font-size:20px', onclick: () => { ui.audio.sfx('sfx_page'); render(g.playLedger(card)); } }, String(card))),
        h('button', { class: 'ghost', onclick: () => { ui.audio.sfx('sfx_ui_click'); render(g.playLedger(null)); } }, 'Fold')),
      h('p', { class: 'muted', style: 'font-size:13px' }, 'Rules: you hold 3 cards, he holds 4. He raises on strong cards — and sometimes on weak ones. Your Wits decide how often you can read him.'),
    );
  };
  render();
  return { title: 'The Ledger — Stake 20 obols' };
}

export const PANELS = {
  choices: choicesPanel,
  invest: investPanel,
  ledger: ledgerPanel,
  contracts: contractsPanel,
  pause: pausePanel,
  inventory: inventoryPanel,
  map: mapPanel,
  container: containerPanel,
  shop: shopPanel,
  read: readPanel,
  message: messagePanel,
  struckDown: struckDownPanel,
  debug: debugPanel,
  settings: settingsPanel,
  saves: savesPanel,
  about: aboutPanel,
};

export { SLOTS };
