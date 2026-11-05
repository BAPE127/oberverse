// The battle (v0.101.0, stage 10a): a full-screen panel in the manner of Fleet Command. It shows a battle (src/battle/sim.js) on the look renderer (src/engine/drawBattle.js): a camera with
// three tiers (far: banners, command: everything at the game's own scale, close: the same sprites enlarged), selection by click or box, orders (move, attack-move, hold, garrison, retreat), a
// view that opens a building to one floor (with a switch to show the ground floor instead), speed controls, and the result when it ends. The panel only DRAWS and GIVES ORDERS: the battle is
// the simulation's, the records are the engagement's (game.war), and the battle is saved as its setup, its orders and its tick.
import { h } from './panels.js';
import { createBattle, step, issue, outcome, replay, sightOf, isVeh, callSupport, issueFormation } from '../battle/sim.js';
import { los } from '../battle/nav.js';
import { BattleView, TP } from '../engine/drawBattle.js';
import { FxLayer } from '../engine/drawBattleFx.js';
import { TICK, SUPPORT, UAV } from '../content/battle.js';

const SPEEDS = [[0, '⏸'], [1, '▶'], [4, '⏩'], [16, '⏭']];
const mmss = (ticks) => { const s = Math.floor(ticks / TICK.perSecond); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function battlePanel(ui, body, opts = {}) {
  const g = ui.game; const W = g.war; const id = opts.id;
  const eng = W.engagement(id); const bt = W.battle(id);
  body.classList.add('bt');
  if (!eng || !bt) { body.append(h('div', { class: 'bt-msg' }, 'There is no battle to fight.', h('button', { onclick: () => ui.closePanel() }, 'Close'))); return { title: '', className: 'battlecmd' }; }
  const canvas = h('canvas', { class: 'bt-canvas' }); const top = h('div', { class: 'bt-top' }); const bar = h('div', { class: 'bt-bar' }); const feed = h('div', { class: 'bt-feed' }); const card = h('div', { class: 'bt-card' }); const over = h('div', { class: 'bt-over hidden' });
  body.append(canvas, top, bar, feed, card, over);

  const B = bt.result ? null : (bt.tick > 0 ? replay(bt.setup, bt.log, bt.tick) : createBattle(bt.setup));
  const view = new BattleView(canvas); const squadLooks = {};
  for (const s of W.squads()) for (const m of s.members) squadLooks[m] = s.look;
  const S = { formation: 'line', speed: 1, acc: 0, sel: new Set(), mode: null, gFloor: 1, ground: new Set(), drag: null, keys: new Set(), done: Boolean(bt.result), lastSave: 0, vis: new Set(), visTick: -99, log: [], filed: Boolean(bt.result) };
  let raf = 0; let last = performance.now(); let closed = false;

  const say = (t) => { S.log.unshift(t); S.log.length = Math.min(S.log.length, 7); feed.replaceChildren(...S.log.map((x) => h('div', {}, x))); };
  const save = () => { if (B && !S.filed) W.saveBattle(id, B.tick, B.log); };

  if (B) {
    view.fx = new FxLayer(bt.key); view.attach(B, squadLooks);
    const mine = B.units.filter((u) => u.side === 'p');
    const cx = mine.reduce((a, u) => a + u.x, 0) / (mine.length || 1); const cy = mine.reduce((a, u) => a + u.y, 0) / (mine.length || 1);
    view.cam.zoom = 1;
    const fit = () => { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(320, Math.round(r.width)); canvas.height = Math.max(240, Math.round(r.height)); };
    fit(); view.center(cx, cy);
    say(`${eng.title}: ${mine.length} of yours against ${B.units.filter((u) => u.side === 'e').length}.`);
  }

  // ---- what the player's side can see (computed a few times a second)
  const seenSet = () => {
    if (!B) return new Set();
    if (B.tick - S.visTick < 5) return S.vis;
    S.visTick = B.tick; const out = new Set();
    for (const e of B.units) if (e.side === 'e' && e.alive && !e.fled && B.spotted[e.id] && B.tick - B.spotted[e.id] < UAV.memory * TICK.perSecond) out.add(e.id);
    for (const e of B.units) if (e.side === 'e' && e.alive && !e.fled) for (const u of B.units) { if (u.side !== 'p' || !u.alive || u.fled) continue; if (Math.hypot(u.x - e.x, u.y - e.y) <= sightOf(u) && los(B.map, u.x, u.y, u.z, e.x, e.y, e.z)) { out.add(e.id); break; } }
    for (const e of S.vis) if (!out.has(e) && B.tick - (view.seenAt.get(e) ?? -99) < 20 && B.byId.get(e)?.alive) out.add(e);
    for (const e of out) view.seenAt.set(e, B.tick);
    S.vis = out; return out;
  };

  // ---- which buildings are opened, and to which floor
  const opened = () => {
    const o = {};
    for (const u of B.units) { if (u.side !== 'p' || !u.alive || u.fled || u.kind !== 'inf') continue; const b = B.map.bid[Math.floor(u.y) * B.map.w + Math.floor(u.x)]; if (b < 0) continue; const cur = o[b] || { floor: 0 }; cur.floor = Math.max(cur.floor, u.z); o[b] = cur; }
    for (const k of Object.keys(o)) if (S.ground.has(Number(k))) { o[k].upper = o[k].floor; o[k].floor = 0; o[k].ground = true; }
    return o;
  };

  // ---- orders
  const give = (order, label) => { const ids = [...S.sel].filter((x) => B.byId.get(x)?.alive); if (!ids.length) { say('Select someone first.'); return; } issue(B, ids, order); save(); say(`${ids.length} ${label}.`); };
  const buildingAt = (t) => { const b = B.map.bid[Math.floor(t.y) * B.map.w + Math.floor(t.x)]; return b >= 0 ? B.map.buildings[b] : null; };
  const target = (e, shift) => {
    const t = view.toTile(e.clientX, e.clientY); if (t.x < 0 || t.y < 0 || t.x >= B.map.w || t.y >= B.map.h) return;
    const mode = S.mode || (shift ? 'amove' : 'move');
    if (mode.startsWith('support:')) { const [, kind, ref] = mode.split(':'); const r = callSupport(B, { kind, x: t.x, y: t.y, ...(ref ? { id: ref } : {}) }); say(r.text); if (r.ok) save(); S.mode = null; paintBar(); return; }
    if (mode === 'fire') { const ids = [...S.sel].filter((x) => B.byId.get(x)?.arty && B.byId.get(x).alive); if (!ids.length) { say('Select a mortar, a gun or a howitzer first.'); S.mode = null; paintBar(); return; } issue(B, ids, { type: 'fire', x: t.x, y: t.y }); save(); say(`${ids.length} fire at the point.`); S.mode = null; paintBar(); return; }
    if (mode === 'reverse') { give({ type: 'reverse', x: t.x, y: t.y }, 'back up to the point'); S.mode = null; paintBar(); return; }
    if (mode === 'repair' || mode === 'load') { const f = unitAtPoint(e); if (!f || (mode === 'repair' && !f.mod) || (mode === 'load' && !(f.pax))) { say(mode === 'repair' ? 'Click one of your vehicles.' : 'Click one of your carriers.'); return; } give({ type: mode, target: f.id }, mode === 'repair' ? `repair ${f.name}` : `board ${f.name}`); S.mode = null; paintBar(); return; }
    if (mode === 'escort') { const f = unitAtPoint(e); if (!f) { say('Click one of your units to escort.'); return; } const ids = [...S.sel].filter((x) => x !== f.id); give({ type: 'escort', target: f.id }, `escort ${f.name}`); S.mode = null; paintBar(); void ids; return; }
    if (mode === 'flank' || mode === 'regroup' || mode === 'recon') { give({ type: mode, x: t.x, y: t.y }, { flank: 'flank round to the point', regroup: 'regroup at the point', recon: 'scout ahead' }[mode]); S.mode = null; paintBar(); return; }
    if (mode === 'charge' || mode === 'scout' || mode === 'fpv') { const want = { charge: 'engineer', scout: 'uav', fpv: 'uav' }[mode]; const ids = [...S.sel].filter((x) => B.byId.get(x)?.role === want && B.byId.get(x).alive); if (!ids.length) { say(`Select ${want === 'uav' ? 'a UAV operator' : 'an engineer'} first.`); S.mode = null; paintBar(); return; } issue(B, ids, { type: mode, x: t.x, y: t.y }); save(); say({ charge: 'plant a charge', scout: 'send the scout drone', fpv: 'launch an FPV drone' }[mode] + '.'); S.mode = null; paintBar(); return; }
    if (mode === 'smoke' || mode === 'suppress' || mode === 'breach' || mode === 'fire') { give({ type: mode, x: t.x, y: t.y }, { smoke: 'throw smoke', suppress: 'suppress the point', breach: 'open the wall', fire: 'fire at the point' }[mode]); S.mode = null; paintBar(); return; }
    if (mode === 'garrison') { const b = buildingAt(t); if (!b) { say('Click a building.'); return; } give({ type: 'garrison', b: b.id, floor: Math.min(S.gFloor, b.floors - 1) }, `garrison building ${b.id + 1}, floor ${Math.min(S.gFloor, b.floors - 1) + 1}`); }
    else if (S.formation !== 'none' && (mode === 'move' || mode === 'amove') && [...S.sel].filter((x) => B.byId.get(x)?.alive).length >= 3) { const ids = [...S.sel].filter((x) => B.byId.get(x)?.alive); issueFormation(B, ids, mode, t.x, t.y, S.formation); save(); say(`${ids.length} ${mode === 'amove' ? 'attack-move' : 'move'} in a ${S.formation}.`); }
    else give({ type: mode, x: t.x, y: t.y }, mode === 'amove' ? 'attack-move' : 'move');
    S.mode = null; paintBar();
  };
  const unitAtPoint = (e) => { const w = view.toWorld(e.clientX, e.clientY); let best = null; let bd = 22 / view.cam.zoom + 8; for (const u of B.units) { if (u.side !== 'p' || !u.alive || u.fled) continue; const d = Math.hypot(u.x * TP - w.x, u.y * TP - 10 - w.y); if (d < bd) { bd = d; best = u; } } return best; };

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (!B) return; canvas.setPointerCapture(e.pointerId);
    if (e.button === 2) { if (S.sel.size) target(e, e.shiftKey); return; }
    if (e.button === 1 || e.altKey) { S.drag = { pan: true, x: e.clientX, y: e.clientY }; return; }
    if (S.mode?.startsWith('support:')) { target(e, false); return; }
    if (S.mode && S.sel.size) { target(e, e.shiftKey); return; }
    S.drag = { x: e.clientX, y: e.clientY, x1: e.clientX, y1: e.clientY, sel: true, shift: e.shiftKey };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (B) S.mouse = view.toTile(e.clientX, e.clientY);
    const d = S.drag; if (!d) return;
    if (d.pan) { view.cam.x -= (e.clientX - d.x) / view.cam.zoom; view.cam.y -= (e.clientY - d.y) / view.cam.zoom; d.x = e.clientX; d.y = e.clientY; view.clamp(); return; }
    d.x1 = e.clientX; d.y1 = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = S.drag; S.drag = null; if (!d || !d.sel) return;
    const moved = Math.hypot(d.x1 - d.x, d.y1 - d.y) > 6;
    if (!d.shift) S.sel.clear();
    if (moved) { const a = view.toWorld(Math.min(d.x, d.x1), Math.min(d.y, d.y1)); const b = view.toWorld(Math.max(d.x, d.x1), Math.max(d.y, d.y1)); for (const u of B.units) if (u.side === 'p' && u.alive && !u.fled && u.x * TP >= a.x && u.x * TP <= b.x && u.y * TP >= a.y && u.y * TP <= b.y) S.sel.add(u.id); }
    else { const u = unitAtPoint(e); if (u) { if (d.shift && S.sel.has(u.id)) S.sel.delete(u.id); else S.sel.add(u.id); } }
    paintCard();
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (B) view.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
  const onKey = (e) => {
    if (closed || !B) return; const k = e.key.toLowerCase();
    if (k === 'escape') { e.stopPropagation(); close(); return; }
    if (k === ' ') { S.speed = S.speed ? 0 : 1; paintBar(); e.preventDefault(); }
    else if (k === '1' || k === '2' || k === '3') { S.speed = [1, 4, 16][Number(k) - 1]; paintBar(); }
    else if (k === 'h') give({ type: 'hold' }, 'hold'); else if (k === 'r') give({ type: 'retreat' }, 'retreat');
    else if (k === 'a') { S.mode = 'amove'; paintBar(); } else if (k === 'm') { S.mode = 'move'; paintBar(); } else if (k === 'g') { S.mode = 'garrison'; paintBar(); }
    else if (k === 's') { S.mode = 'smoke'; paintBar(); } else if (k === 'b') { S.mode = 'breach'; paintBar(); }
    else if (k === 'c') { const u = [...S.sel].map((x) => B.byId.get(x)).filter(Boolean)[0]; if (u) view.center(u.x, u.y); }
    else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) { S.keys.add(k); e.preventDefault(); }
  };
  const onKeyUp = (e) => S.keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);

  // ---- the chrome
  const paintTop = () => {
    if (!B) { top.replaceChildren(h('b', {}, eng.title), h('span', {}, 'Battle filed'), h('span', { class: 'grow' }), h('button', { onclick: () => close() }, '✕')); return; }
    const mine = B.units.filter((u) => u.side === 'p'); const alive = mine.filter((u) => u.alive && !u.fled).length; const foes = B.units.filter((u) => u.side === 'e' && u.alive && !u.fled).length;
    const goal = { defence: `Hold the marked ground (${Math.min(100, Math.round((B.hold / (60 * TICK.perSecond)) * 100))}%)`, offence: `Take the marked ground (${Math.min(100, Math.round((B.cap / (40 * TICK.perSecond)) * 100))}%)`, logistics: 'Get a vehicle through to the green gate' }[B.goal];
    top.replaceChildren(h('b', {}, eng.title), h('span', {}, goal), h('span', {}, `⏱ ${mmss(B.tick)} / ${mmss(B.maxTicks)}`), h('span', { class: 'grow' }), h('span', { class: 'bt-p' }, `Yours ${alive}/${mine.length}`), h('span', { class: 'bt-e' }, `Enemy in sight ${[...seenSet()].length}`), h('span', { title: 'the camera tier' }, `🔭 ${view.tier()}`), h('button', { onclick: () => close() }, '✕ Leave'));
  };
  /** What can be called from the real stock, as buttons: each item left, each aircraft not yet used. Then a click on the map. */
  const supportButtons = (mk) => {
    const out = [];
    for (const [item, n] of Object.entries(B.sup.items)) if (n > 0 && SUPPORT[item]) out.push(mk(`${SUPPORT[item].name} ×${n}`, `support:${item}`, () => { S.mode = S.mode === `support:${item}` ? null : `support:${item}`; paintBar(); }));
    for (const a of B.sup.air) if (!a.used) out.push(mk(`✈ ${a.name || SUPPORT[a.kind].name} (${a.kind})`, `support:${a.kind}:${a.id}`, () => { const m = `support:${a.kind}:${a.id}`; S.mode = S.mode === m ? null : m; paintBar(); }));
    for (const a of B.sup.strategic) if (!a.used) out.push(mk(`☢ ${a.name || 'Strategic missile'}`, `support:strategic:${a.id}`, () => { const m = `support:strategic:${a.id}`; S.mode = S.mode === m ? null : m; paintBar(); }));
    if (B.rules >= 3 && B.units.some((u) => u.side === 'p' && u.alive && u.role === 'medic')) out.push(mk('Tend', 'tend', () => give({ type: 'tend' }, 'tend the wounded')));
    if (B.rules >= 3 && B.units.some((u) => u.side === 'p' && u.alive && u.role === 'engineer')) out.push(mk(`Plant charge (${B.sup.items.item_breach_charge || 0})`, 'charge', () => { S.mode = S.mode === 'charge' ? null : 'charge'; paintBar(); }));
    if (B.rules >= 3 && B.units.some((u) => u.side === 'p' && u.alive && u.role === 'uav')) out.push(mk('Scout drone', 'scout', () => { S.mode = S.mode === 'scout' ? null : 'scout'; paintBar(); }), mk(`FPV strike (${(B.sup.items.item_drone_attack || 0) + (B.sup.items.item_drone_strike || 0)})`, 'fpv', () => { S.mode = S.mode === 'fpv' ? null : 'fpv'; paintBar(); }));
    if (B.rules >= 3 && B.units.some((u) => u.side === 'p' && u.alive && u.arty)) out.push(mk(`Fire mission (${B.sup.items.item_artillery_shell || 0} shells)`, 'fire', () => { S.mode = S.mode === 'fire' ? null : 'fire'; paintBar(); }));
    return out;
  };
  const paintBar = () => {
    const mk = (label, k, fn) => h('button', { class: S.mode === k ? 'on' : '', onclick: fn }, label);
    bar.replaceChildren(...SPEEDS.map(([v, l]) => h('button', { class: S.speed === v ? 'on' : '', onclick: () => { S.speed = v; paintBar(); } }, l)), h('span', { class: 'sep' }),
      mk('Move', 'move', () => { S.mode = S.mode === 'move' ? null : 'move'; paintBar(); }), mk('Attack-move', 'amove', () => { S.mode = S.mode === 'amove' ? null : 'amove'; paintBar(); }),
      h('button', { onclick: () => give({ type: 'hold' }, 'hold') }, 'Hold'), mk('Garrison', 'garrison', () => { S.mode = S.mode === 'garrison' ? null : 'garrison'; paintBar(); }),
      h('button', { onclick: () => { S.gFloor = (S.gFloor + 1) % 6; paintBar(); } }, `Floor ${S.gFloor + 1}`), h('button', { onclick: () => give({ type: 'retreat' }, 'retreat') }, 'Retreat'), h('span', { class: 'sep' }),
      mk('Flank', 'flank', () => { S.mode = S.mode === 'flank' ? null : 'flank'; paintBar(); }), mk('Regroup', 'regroup', () => { S.mode = S.mode === 'regroup' ? null : 'regroup'; paintBar(); }), mk('Recon', 'recon', () => { S.mode = S.mode === 'recon' ? null : 'recon'; paintBar(); }), mk('Escort', 'escort', () => { S.mode = S.mode === 'escort' ? null : 'escort'; paintBar(); }),
      h('button', { title: 'how a group of three or more arranges itself when it moves', onclick: () => { const fs = ['line', 'column', 'wedge', 'skirmish', 'none']; S.formation = fs[(fs.indexOf(S.formation) + 1) % fs.length]; paintBar(); } }, `Formation: ${S.formation}`),
      h('button', { title: 'hold fire / defensive / aggressive, for those selected', onclick: () => { const ss = ['aggressive', 'defensive', 'holdfire']; S.stance = ss[(ss.indexOf(S.stance || 'aggressive') + 1) % 3]; if (S.sel.size) give({ type: 'stance', stance: S.stance }, `${S.stance}`); paintBar(); } }, `Stance: ${S.stance || 'aggressive'}`),
      mk('Reverse', 'reverse', () => { S.mode = S.mode === 'reverse' ? null : 'reverse'; paintBar(); }), mk('Repair', 'repair', () => { S.mode = S.mode === 'repair' ? null : 'repair'; paintBar(); }), mk('Board', 'load', () => { S.mode = S.mode === 'load' ? null : 'load'; paintBar(); }), h('button', { onclick: () => { const ids = [...S.sel].filter((x) => B.byId.get(x)?.pax?.length); if (!ids.length) say('Select a carrier with people aboard.'); else { issue(B, ids, { type: 'unload' }); save(); say('unload.'); } } }, 'Unload'),
      mk('Smoke', 'smoke', () => { S.mode = S.mode === 'smoke' ? null : 'smoke'; paintBar(); }), mk('Suppress', 'suppress', () => { S.mode = S.mode === 'suppress' ? null : 'suppress'; paintBar(); }), mk('Breach', 'breach', () => { S.mode = S.mode === 'breach' ? null : 'breach'; paintBar(); }),
      ...(B ? supportButtons(mk) : []), ...(B && B.rules >= 3 && B.units.some((u) => u.side === 'e' && u.W.airOnly && u.alive && seenSet().has(u.id)) ? [h('span', { class: 'bt-warn', title: 'an anti-air gun in sight: an aircraft pass in its reach can be shot down' }, '⚠ enemy AA in sight')] : []), h('span', { class: 'sep' }),
      h('button', { onclick: () => view.zoomBy(1.25, canvas.width / 2, canvas.height / 2) }, '＋'), h('button', { onclick: () => view.zoomBy(0.8, canvas.width / 2, canvas.height / 2) }, '－'),
      ...(B ? Object.entries(opened()).map(([b, v]) => h('button', { class: S.ground.has(Number(b)) ? 'on' : '', title: 'what to show of this building', onclick: () => { const n = Number(b); if (S.ground.has(n)) S.ground.delete(n); else S.ground.add(n); paintBar(); } }, `🏢${Number(b) + 1}: ${S.ground.has(Number(b)) ? 'ground floor' : `floor ${v.floor + 1}`}`)) : []));
  };
  const paintCard = () => {
    const us = [...S.sel].map((x) => B?.byId.get(x)).filter(Boolean);
    if (!us.length) { card.replaceChildren(h('small', {}, B ? 'Click a soldier or drag a box. Right-click to move (Shift: attack-move). Space pauses. Mouse wheel zooms; drag with Alt to pan.' : '')); return; }
    const by = {}; for (const u of us) by[u.role] = (by[u.role] || 0) + 1;
    card.replaceChildren(h('b', {}, `${us.length} selected`), h('small', {}, Object.entries(by).map(([k, v]) => `${v} ${k.replace('_', ' ')}`).join(', ')), h('small', {}, B.rules >= 4 ? `Stance: ${[...new Set(us.map((u) => u.stance))].join('/')}` : ''), h('small', {}, `Average health ${Math.round((us.reduce((a, u) => a + u.hp / u.hpMax, 0) / us.length) * 100)}% · ${us.filter((u) => u.state !== 'steady').length} shaken or worse`));
  };
  paintTop(); paintBar(); paintCard();

  // ---- the end of the battle
  const finish = () => {
    if (S.filed) return; S.filed = true; S.done = true;
    const o = outcome(B); const r = W.fileBattle(id, o);
    ui.audio?.sfx?.(o.objectives >= 2 ? 'sfx_coin' : 'sfx_fail');
    over.classList.remove('hidden');
    over.replaceChildren(h('h3', {}, o.objectives >= 2 ? 'The field is yours' : o.objectives === 1 ? 'A hard-won partial result' : 'The battle is lost'), h('p', {}, `${o.outcome.replace('_', ' ')} · ${o.objectives} of 3 objectives · ${B.why}.`), h('p', {}, `${o.dead.length} killed, ${o.wounded.length} wounded, ${o.lost.length} vehicle${o.lost.length === 1 ? '' : 's'} lost. ${r.text}`), h('p', {}, 'The records change when your people come home: then the pay arrives and the after-action report is written.'), h('button', { onclick: () => close() }, 'Close'));
  };
  if (S.filed && !B) { over.classList.remove('hidden'); over.replaceChildren(h('h3', {}, 'The battle is over'), h('p', {}, `Result filed: ${bt.result.outcome.replace('_', ' ')}, ${bt.result.objectives} of 3 objectives. Your people return on day ${eng.order.end}.`), h('button', { onclick: () => close() }, 'Close')); }

  // ---- the loop
  const frame = (now) => {
    if (closed) return; raf = requestAnimationFrame(frame);
    const dtm = Math.min(0.1, (now - last) / 1000); last = now;
    if (!B) return;
    const r = canvas.getBoundingClientRect(); if (canvas.width !== Math.round(r.width) || canvas.height !== Math.round(r.height)) { canvas.width = Math.max(320, Math.round(r.width)); canvas.height = Math.max(240, Math.round(r.height)); }
    const pan = 700 * dtm / view.cam.zoom; for (const k of S.keys) { if (k === 'arrowleft') view.cam.x -= pan; if (k === 'arrowright') view.cam.x += pan; if (k === 'arrowup') view.cam.y -= pan; if (k === 'arrowdown') view.cam.y += pan; view.clamp(); }
    if (!B.over && S.speed) { S.acc += dtm * TICK.perSecond * S.speed; let n = 0; while (S.acc >= 1 && !B.over && n < 80) { step(B); view.fx.step(); S.acc -= 1; n++; } if (n === 80) S.acc = 0; }
    if (B.over && !S.filed) finish();
    view.effects(B);
    view.visible = (e) => seenSet().has(e.id);
    view.draw(B, { selected: S.sel, open: opened(), seen: seenSet() });
    if (S.drag?.sel && Math.hypot(S.drag.x1 - S.drag.x, S.drag.y1 - S.drag.y) > 6) { const g2 = canvas.getContext('2d'); const rr = canvas.getBoundingClientRect(); g2.setTransform(1, 0, 0, 1, 0, 0); g2.strokeStyle = '#7af0a0'; g2.lineWidth = 1; g2.strokeRect(Math.min(S.drag.x, S.drag.x1) - rr.left, Math.min(S.drag.y, S.drag.y1) - rr.top, Math.abs(S.drag.x1 - S.drag.x), Math.abs(S.drag.y1 - S.drag.y)); }
    if (S.mode?.startsWith('support:') && S.mouse) { const q = SUPPORT[S.mode.split(':')[1]]; const g2 = canvas.getContext('2d'); const z = view.cam.zoom; const sx = (S.mouse.x * TP - view.cam.x) * z; const sy = (S.mouse.y * TP - view.cam.y) * z; g2.setTransform(1, 0, 0, 1, 0, 0); g2.strokeStyle = '#ff6a4a'; g2.lineWidth = 2; g2.setLineDash([8, 6]); g2.beginPath(); g2.ellipse(sx, sy, (q.r || q.width || 1.5) * TP * z, (q.r || q.width || 1.5) * TP * z * 0.8, 0, 0, Math.PI * 2); g2.stroke(); if (q.len) { g2.beginPath(); g2.moveTo(sx - (q.len / 2) * TP * z, sy); g2.lineTo(sx + (q.len / 2) * TP * z, sy); g2.stroke(); } g2.setLineDash([]); }
    if (B.tick % 10 === 0) { paintTop(); paintCard(); }
    if (B.tick - S.lastSave >= 100) { S.lastSave = B.tick; save(); }
    ui.battleFrames = (ui.battleFrames || 0) + 1;
  };
  raf = requestAnimationFrame(frame);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); save();
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
    ui.closePanel();
  }
  // the smoke test and the debug commands drive the same battle
  ui.battleHandle = { B, S, view, give, step: (n = 1) => { for (let i = 0; i < n && !B.over; i++) { step(B); view.fx.step(); } if (B.over && !S.filed) finish(); }, finish, close, save };
  return { title: '', className: 'battlecmd', onClose: () => { if (!closed) { closed = true; cancelAnimationFrame(raf); save(); window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); } ui.battleHandle = null; } };
}
export { isVeh };
