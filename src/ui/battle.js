// The battle (v0.101.0, stage 10a): a full-screen panel in the manner of Fleet Command. It shows a battle (src/battle/sim.js) on the look renderer (src/engine/drawBattle.js): a camera (the isometric one of docs/RENDERING.md 2.6) with
// three tiers (far: banners, command: everything at the game's own scale, close: the same sprites enlarged), selection by click or box, orders (move, attack-move, hold, garrison, retreat), a
// view that opens a building to one floor (with a switch to show the ground floor instead), speed controls, and the result when it ends. The panel only DRAWS and GIVES ORDERS: the battle is
// the simulation's, the records are the engagement's (game.war), and the battle is saved as its setup, its orders and its tick.
import { h } from './panels.js';
import { createBattle, step, issue, outcome, replay, sightOf, isVeh, callSupport, callReserve, issueFormation, designated, beginBattle, chooseEntry, deploy, planIntel, currentEntry, splitTeam, mergeTeams, teamOf } from '../battle/sim.js';
import { landingSpot, landRadius } from '../battle/flight.js';
import { myTeams, tagMap, teamLetter, TEAM_VARS, TEAM_FALLBACK, clickSelect, orderIds, teamsOfSelection, autoBind, bindTeam, recall, unplaced, intelText, liveMembers } from './battleTeams.js';
import { los } from '../battle/nav.js';
import { BattleView, TP } from '../engine/drawBattle.js';
import { FxLayer } from '../engine/drawBattleFx.js';
import { Battle3D } from '../engine3d/battle3d.js';
import { TICK, SUPPORT, UAV, RAID, FLIGHT } from '../content/battle.js';

const SPEEDS = [[0, '⏸'], [1, '▶'], [4, '⏩'], [16, '⏭']];
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Medics', 'Overwatch', 'Heavy', 'Anti-tank'];
const mmss = (ticks) => { const s = Math.floor(ticks / TICK.perSecond); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function battlePanel(ui, body, opts = {}) {
  const g = ui.game; const W = g.war; const id = opts.id;
  const eng = W.engagement(id); const bt = W.battle(id);
  body.classList.add('bt');
  if (!eng || !bt) { body.append(h('div', { class: 'bt-msg' }, 'There is no battle to fight.', h('button', { onclick: () => ui.closePanel() }, 'Close'))); return { title: '', className: 'battlecmd' }; }
  const canvas = h('canvas', { class: 'bt-canvas' }); const top = h('div', { class: 'bt-top' }); const bar = h('div', { class: 'bt-bar' }); const feed = h('div', { class: 'bt-feed' }); const card = h('div', { class: 'bt-card' }); const over = h('div', { class: 'bt-over hidden' });
  const menu = h('div', { class: 'bt-menu hidden', oncontextmenu: (e) => e.preventDefault() }); const hint = h('div', { class: 'bt-hint hidden' }); const plan = h('div', { class: 'bt-plan hidden' });
  body.append(canvas, top, bar, feed, card, hint, plan, over, menu, h('datalist', { id: 'bt-names' }, ...NAMES.map((n) => h('option', { value: n }))));

  const B = bt.result ? null : (bt.tick > 0 || bt.log?.length ? replay(bt.setup, bt.log, bt.tick) : createBattle(bt.setup));
  const view = new BattleView(canvas); const squadLooks = {};
  for (const s of W.squads()) for (const m of s.members) squadLooks[m] = s.look;
  const S = { formation: 'line', speed: 1, acc: 0, sel: new Set(), mode: null, gFloor: 1, ground: new Set(), drag: null, keys: new Set(), done: Boolean(bt.result), lastSave: 0, vis: new Set(), visTick: -99, log: [], pings: [], menu: null, filed: Boolean(bt.result), bind: new Map(), place: null, passA: null, tags: new Map(), tagSig: '', teamName: '', confirm: false, footprints: false };
  const css = getComputedStyle(body); const colorOf = (i) => css.getPropertyValue(TEAM_VARS[i % TEAM_VARS.length]).trim() || TEAM_FALLBACK[i % TEAM_FALLBACK.length];
  if (B) S.bind = autoBind(B);
  const planning = () => Boolean(B) && B.phase === 'plan';
  if (planning()) S.speed = 0;
  let raf = 0; let last = performance.now(); let closed = false;

  const say = (t) => { S.log.unshift(t); S.log.length = Math.min(S.log.length, 5); feed.replaceChildren(...S.log.map((x) => h('div', {}, x))); };
  const save = () => { if (B && !S.filed) W.saveBattle(id, B.tick, B.log); };

  if (B) {
    view.fx = new FxLayer(bt.key); view.r3 = Battle3D.create(view); view.attach(B, squadLooks); // (the WebGL layer under the canvas; null where there is no WebGL: the 2D isometric battle draws everything)
    const mine = B.units.filter((u) => u.side === 'p');
    const cx = mine.reduce((a, u) => a + u.x, 0) / (mine.length || 1); const cy = mine.reduce((a, u) => a + u.y, 0) / (mine.length || 1);
    view.cam.zoom = 1;
    const fit = () => { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(320, Math.round(r.width)); canvas.height = Math.max(240, Math.round(r.height)); };
    fit(); if (planning()) { const z = currentEntry(B).zone; view.center(z.x + z.w / 2, z.y + z.h / 2); } else view.center(cx, cy);
    say(planning() ? `${eng.title}: plan the approach. ${mine.length} of yours.` : `${eng.title}: ${mine.length} of yours against ${B.units.filter((u) => u.side === 'e').length}.`);
  }

  // ---- what the player's side can see (computed a few times a second)
  const seenSet = () => {
    if (!B) return new Set();
    if (B.tick - S.visTick < 5) return S.vis;
    S.visTick = B.tick; const out = new Set();
    for (const e of B.units) if (e.side === 'e' && e.alive && !e.fled && B.spotted[e.id] !== undefined && B.tick - B.spotted[e.id] < UAV.memory * TICK.perSecond) out.add(e.id);
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
  const give = (order, label) => {
    if (planning()) { say('Orders come when the battle begins: place your force first.'); return; }
    const ids = [...S.sel].filter((x) => B.byId.get(x)?.alive); if (!ids.length) { say('Select someone first.'); return; }
    issue(B, orderIds(B, ids), order); save(); say(`${ids.length} ${label}.`); if (order.x !== undefined) ping(order.x, order.y, order.type, ids);
  };
  const heliIds = () => [...S.sel].filter((x) => { const u = B.byId.get(x); return u && u.alive && !u.fled && u.kind === 'helicopter'; });
  /** Orders for a helicopter: orbit a point, an attack pass along a dragged line, land (refused, with why, where there is no room). */
  const flyOrder = (mode, t, t1) => {
    const hs = heliIds().map((x) => B.byId.get(x)); if (!hs.length) { say('Select a helicopter first.'); return false; }
    if (mode === 'orbit') { issue(B, hs.map((u) => u.id), { type: 'orbit', x: t.x, y: t.y, r: FLIGHT.orbitR }); save(); say('Orbiting the point.'); ping(t.x, t.y, 'recon', hs.map((u) => u.id)); return true; }
    if (mode === 'pass') {
      const u0 = hs[0]; const len = 9; const a = t1 ? t : { x: t.x - Math.cos(u0.heading || 0) * len / 2, y: t.y - Math.sin(u0.heading || 0) * len / 2 }; const b2 = t1 || { x: t.x + Math.cos(u0.heading || 0) * len / 2, y: t.y + Math.sin(u0.heading || 0) * len / 2 };
      issue(B, hs.map((u) => u.id), { type: 'pass', x: a.x, y: a.y, x1: b2.x, y1: b2.y }); save(); say('Attack pass along the line.'); ping(b2.x, b2.y, 'amove', hs.map((u) => u.id)); return true;
    }
    if (mode === 'land') {
      let n = 0; for (const u of hs) { const spot = landingSpot(B, t.x, t.y, landRadius(u), u.id); if (!spot) { say(`${u.name} cannot land there: it needs open ground for its rotor within ${8} tiles (no roof, wall, tree, water or trench, and no one standing on it).`); continue; } issue(B, [u.id], { type: 'land', x: t.x, y: t.y }); n++; }
      if (n) { save(); say(`${n} landing.`); ping(t.x, t.y, 'move', hs.map((u) => u.id)); } return n > 0;
    }
    return false;
  };
  // (the standing building under the pointer wins: its picture covers ground further back; failing that, the building on the ground tile)
  const buildingAt = (t, e) => { const on = e ? view.buildingAt(e.clientX, e.clientY) : null; if (on) return on; const b = B.map.bid[Math.floor(t.y) * B.map.w + Math.floor(t.x)]; return b >= 0 ? B.map.buildings[b] : null; };
  const target = (e, shift, forced) => {
    const t = view.toTile(e.clientX, e.clientY); if (t.x < 0 || t.y < 0 || t.x >= B.map.w || t.y >= B.map.h) return;
    const mode = forced || S.mode || (shift ? 'amove' : 'move');
    if (mode.startsWith('support:')) { const [, kind, ref] = mode.split(':'); const r = callSupport(B, { kind, x: t.x, y: t.y, ...(ref ? { id: ref } : {}) }); say(r.text); if (r.ok) save(); S.mode = null; paintBar(); return; }
    if (mode === 'fire') { const ids = [...S.sel].filter((x) => B.byId.get(x)?.arty && B.byId.get(x).alive); if (!ids.length) { say('Select a mortar, a gun or a howitzer first.'); S.mode = null; paintBar(); return; } if (B.rules >= 4 && !designated(B, 'p', t.x, t.y)) { say('Nothing is designated there: put eyes on the enemy first (a squad in sight, a scout drone or a recon order).'); return; } issue(B, ids, { type: 'fire', x: t.x, y: t.y }); save(); say(`${ids.length} fire at the point.`); S.mode = null; paintBar(); return; }
    if (mode === 'pass') { flyOrder('pass', t); S.mode = null; paintBar(); return; }
    if (mode === 'orbit' || mode === 'land') { flyOrder(mode, t); S.mode = null; paintBar(); return; }
    if (mode === 'reverse') { give({ type: 'reverse', x: t.x, y: t.y }, 'back up to the point'); S.mode = null; paintBar(); return; }
    if (mode === 'repair' || mode === 'load') { const f = unitAtPoint(e); if (!f || (mode === 'repair' && !f.mod) || (mode === 'load' && !(f.pax))) { say(mode === 'repair' ? 'Click one of your vehicles.' : 'Click one of your carriers.'); return; } give({ type: mode, target: f.id }, mode === 'repair' ? `repair ${f.name}` : `board ${f.name}`); S.mode = null; paintBar(); return; }
    if (mode === 'escort') { const f = unitAtPoint(e); if (!f) { say('Click one of your units to escort.'); return; } const ids = [...S.sel].filter((x) => x !== f.id); give({ type: 'escort', target: f.id }, `escort ${f.name}`); S.mode = null; paintBar(); void ids; return; }
    if (mode === 'flank' || mode === 'regroup' || mode === 'recon') { give({ type: mode, x: t.x, y: t.y }, { flank: 'flank round to the point', regroup: 'regroup at the point', recon: 'scout ahead' }[mode]); S.mode = null; paintBar(); return; }
    if (mode === 'charge' || mode === 'scout' || mode === 'fpv') { const want = { charge: 'engineer', scout: 'uav', fpv: 'uav' }[mode]; const ids = [...S.sel].filter((x) => B.byId.get(x)?.role === want && B.byId.get(x).alive); if (!ids.length) { say(`Select ${want === 'uav' ? 'a UAV operator' : 'an engineer'} first.`); S.mode = null; paintBar(); return; } issue(B, ids, { type: mode, x: t.x, y: t.y }); save(); say({ charge: 'plant a charge', scout: 'send the scout drone', fpv: 'launch an FPV drone' }[mode] + '.'); S.mode = null; paintBar(); return; }
    if (mode === 'smoke' || mode === 'suppress' || mode === 'breach' || mode === 'fire') { give({ type: mode, x: t.x, y: t.y }, { smoke: 'throw smoke', suppress: 'suppress the point', breach: 'open the wall', fire: 'fire at the point' }[mode]); S.mode = null; paintBar(); return; }
    if (mode === 'garrison') { const b = buildingAt(t, e); if (!b) { say('Click a building.'); return; } give({ type: 'garrison', b: b.id, floor: Math.min(S.gFloor, b.floors - 1) }, `garrison building ${b.id + 1}, floor ${Math.min(S.gFloor, b.floors - 1) + 1}`); }
    else if (S.formation !== 'none' && (mode === 'move' || mode === 'amove') && [...S.sel].filter((x) => B.byId.get(x)?.alive).length >= 3) { const ids = [...S.sel].filter((x) => B.byId.get(x)?.alive); issueFormation(B, ids, mode, t.x, t.y, S.formation); ping(t.x, t.y, mode, ids); save(); say(`${ids.length} ${mode === 'amove' ? 'attack-move' : 'move'} in a ${S.formation}.`); }
    else give({ type: mode, x: t.x, y: t.y }, mode === 'amove' ? 'attack-move' : 'move');
    S.mode = null; paintBar();
  };
  const unitAtPoint = (e) => view.unitAt(B.units.filter((u) => u.side === 'p' && u.alive && !u.fled), e.clientX, e.clientY);

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (!B) return; try { canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer (the smoke test) has nothing to capture */ }
    if (S.menu) closeMenu();
    if (e.button === 2) { if (S.mode) { S.mode = null; paintBar(); return; } if (e.shiftKey && S.sel.size) target(e, true); else openMenu(e); return; } // a right click opens the order menu; Shift + right click is the quick attack-move
    if (e.button === 1 || e.altKey) { S.drag = { pan: true, x: e.clientX, y: e.clientY }; return; }
    if (S.mode?.startsWith('support:')) { target(e, false); return; }
    if (S.mode === 'pass' && S.sel.size) { S.passA = { ...view.toTile(e.clientX, e.clientY), cx: e.clientX, cy: e.clientY }; return; } // (an attack pass is a dragged line: the pointer up ends it)
    if (S.mode && S.sel.size) { target(e, e.shiftKey); return; }
    if (planning()) { const f = unitAtPoint(e); if (f) { S.sel = new Set(clickSelect(B, f.id, e.ctrlKey || e.metaKey)); S.place = { id: f.kind === 'inf' ? teamOf(B, f.id)?.id : f.id, name: f.name, x: e.clientX, y: e.clientY, moved: false }; paintCard(); paintPlan(); return; } }
    S.drag = { x: e.clientX, y: e.clientY, x1: e.clientX, y1: e.clientY, sel: true, shift: e.shiftKey };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (B) { S.mouse = view.toTile(e.clientX, e.clientY); S.mouseAt = { x: e.clientX, y: e.clientY }; }
    if (S.place) { if (Math.hypot(e.clientX - S.place.x, e.clientY - S.place.y) > 6) S.place.moved = true; return; }
    const d = S.drag; if (!d) return;
    if (d.pan) { view.cam.x -= (e.clientX - d.x) / view.cam.zoom; view.cam.y -= (e.clientY - d.y) / view.cam.zoom; d.x = e.clientX; d.y = e.clientY; view.clamp(); return; }
    d.x1 = e.clientX; d.y1 = e.clientY;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (S.passA) { const a = S.passA; S.passA = null; const t1 = view.toTile(e.clientX, e.clientY); const far = Math.hypot(e.clientX - a.cx, e.clientY - a.cy) > 12; flyOrder('pass', { x: a.x, y: a.y }, far ? t1 : null); S.mode = null; paintBar(); return; }
    if (S.place) { const pl = S.place; S.place = null; if (pl.moved && pl.id && planning()) { const t = view.toTile(e.clientX, e.clientY); const r = deploy(B, pl.id, t.x, t.y); say(r.text); if (r.ok) save(); paintPlan(); } return; }
    const d = S.drag; S.drag = null; if (!d || !d.sel) return;
    const moved = Math.hypot(d.x1 - d.x, d.y1 - d.y) > 6;
    if (!d.shift) S.sel.clear();
    if (moved) { for (const u of view.unitsIn(B.units.filter((q) => q.side === 'p' && q.alive && !q.fled), d.x, d.y, d.x1, d.y1)) S.sel.add(u.id); } // (the units whose screen positions are in the dragged screen rectangle)
    else { const u = unitAtPoint(e); if (u) { if (d.shift && S.sel.has(u.id)) { for (const m of clickSelect(B, u.id, e.ctrlKey || e.metaKey)) S.sel.delete(m); } else for (const m of clickSelect(B, u.id, e.ctrlKey || e.metaKey)) S.sel.add(m); } } // (a click on a soldier takes his team; Ctrl takes him alone)
    paintCard(); paintPlan();
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (B) view.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
  const onKey = (e) => {
    if (closed || !B) return; const k = e.key.toLowerCase();
    if (k === 'escape') { e.stopPropagation(); if (S.menu) { closeMenu(); return; } if (S.mode) { S.mode = null; paintBar(); return; } close(); return; }
    if (k === ' ') { S.speed = S.speed ? 0 : 1; paintBar(); e.preventDefault(); }
    else if (k >= '1' && k <= '9' && !e.shiftKey && !e.altKey) { // number keys are the teams: Ctrl + number binds the selected team, a number calls it up (twice: centre on it)
      if (e.ctrlKey || e.metaKey) { const tos = teamsOfSelection(B, [...S.sel]); if (tos.length === 1) { bindTeam(S.bind, k, tos[0].team.id); say(`${tos[0].team.name} is on ${k}.`); paintCard(); e.preventDefault(); } return; }
      const ids = recall(B, S.bind, k); if (ids.length) { const again = S.lastDigit === k && performance.now() - S.lastDigitAt < 500; S.sel = new Set(ids); if (again) { const u = B.byId.get(ids[0]); view.center(u.x, u.y); } S.lastDigit = k; S.lastDigitAt = performance.now(); paintCard(); paintPlan(); e.preventDefault(); }
    }
    else if (k === '-' || k === '=' || k === '+') { const i = SPEEDS.findIndex((x) => x[0] === S.speed); S.speed = SPEEDS[Math.max(1, Math.min(SPEEDS.length - 1, (i < 1 ? 1 : i) + (k === '-' ? -1 : 1)))][0]; if (!planning()) paintBar(); }
    else if (k === 'f') { S.mode = 'move'; paintBar(); } else if (k === 'o') { S.mode = 'orbit'; paintBar(); } else if (k === 'p') { S.mode = 'pass'; paintBar(); } else if (k === 'l') { S.mode = 'land'; paintBar(); }
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
    const goal = { defence: `Hold the marked ground (${Math.min(100, Math.round((B.hold / (60 * TICK.perSecond)) * 100))}%)`, offence: `Take the marked ground (${Math.min(100, Math.round((B.cap / (40 * TICK.perSecond)) * 100))}%)`, logistics: 'Get a vehicle through to the green gate', raid: `Raid the marked ground: hold it ${RAID.seconds} s (${Math.min(100, Math.round((B.raid / (RAID.seconds * TICK.perSecond)) * 100))}%)`, extract: 'Reach the officer and bring them back to the green mark', rescue: 'Reach the downed pilot and bring them back to the green mark' }[B.goal];
    top.replaceChildren(h('b', {}, eng.title), h('span', {}, goal), h('span', {}, `⏱ ${mmss(B.tick)} / ${mmss(B.maxTicks)}`), h('span', { class: 'grow' }), h('span', { class: 'bt-p' }, `Yours ${alive}/${mine.length}`), h('span', { class: 'bt-e' }, `Enemy in sight ${[...seenSet()].length}`), h('button', { onclick: () => close() }, '✕ Leave'));
  };
  /** What can be called from the real stock: each item left, each aircraft not yet used, each strategic missile. [label, mode] pairs: the mode is then aimed at the map. */
  const supportEntries = () => {
    const out = [];
    for (const [item, n] of Object.entries(B.sup.items)) if (n > 0 && SUPPORT[item]) out.push([`${SUPPORT[item].name} ×${n}`, `support:${item}`]);
    for (const a of B.sup.air) if (!a.used) out.push([`${a.name || SUPPORT[a.kind].name} (${a.kind})`, `support:${a.kind}:${a.id}`]);
    for (const a of B.sup.strategic) if (!a.used) out.push([`${a.name || 'Strategic missile'}`, `support:strategic:${a.id}`]);
    return out;
  };

  // ---- order pings: a ring where an order was given and a thin line from those who go (drawn on the canvas, in real time, so they play while the battle is paused)
  const PING = { move: '#7af0a0', reverse: '#7af0a0', amove: '#ff9a6a', flank: '#8ab4ff', regroup: '#8ab4ff', recon: '#8ab4ff', smoke: '#cfd3ff', suppress: '#ffd45a', breach: '#ffd45a', fire: '#ffd45a' };
  const ping = (x, y, kind, ids) => { S.pings.push({ x, y, kind, ids: ids || [...S.sel], t0: performance.now() }); if (S.pings.length > 12) S.pings.shift(); };
  const drawPings = () => {
    const now = performance.now(); S.pings = S.pings.filter((p) => now - p.t0 < 900); if (!S.pings.length && !S.menu) return;
    const g2 = canvas.getContext('2d'); const z = view.cam.zoom; g2.setTransform(1, 0, 0, 1, 0, 0); const sc = (x, y, h = 0) => { const q = view.toCanvas(x * TP, y * TP, h); return [q.x, q.y]; }; const zs = Math.max(0.8, z); const ell = (x, y, r) => { g2.beginPath(); g2.ellipse(x, y, r, r / 2, 0, 0, 7); }; // (rings lie on the ground: 2:1 ellipses)
    for (const p of S.pings) {
      const k = (now - p.t0) / 900; const col = PING[p.kind] || '#7af0a0'; const [x, y] = sc(p.x, p.y); g2.strokeStyle = col; g2.fillStyle = col; g2.lineWidth = 2;
      if (k < 0.7) for (const id of p.ids) { const u = B.byId.get(id); if (!u || !u.alive) continue; const [ux, uy] = sc(u.x, u.y, 8); g2.setLineDash([5, 5]); g2.globalAlpha = (1 - k / 0.7) * 0.45; g2.beginPath(); g2.moveTo(ux, uy); g2.lineTo(x, y); g2.stroke(); }
      g2.setLineDash([]); g2.globalAlpha = 1 - k; ell(x, y, (8 + 28 * k) * zs); g2.stroke(); ell(x, y, (6 + 16 * k) * zs); g2.stroke(); g2.beginPath(); g2.ellipse(x, y, 3 + 2 * (1 - k), 1.5 + (1 - k), 0, 0, 7); g2.fill();
    }
    if (S.menu) { const [x, y] = sc(S.menu.t.x, S.menu.t.y); const k = (now % 1200) / 1200; g2.globalAlpha = 0.9 - 0.6 * k; g2.strokeStyle = '#ffffff'; g2.lineWidth = 1.5; g2.setLineDash([]); ell(x, y, (6 + 8 * k) * zs); g2.stroke(); }
    g2.globalAlpha = 1; g2.setLineDash([]);
  };

  // ---- the order menu: right-click the map; every order the buttons used to carry is here, for this spot and for the people selected
  const closeMenu = () => { if (!S.menu) return; S.menu = null; menu.classList.add('hidden'); };
  const openMenu = (e) => {
    if (planning()) { say('Place your force first: drag a team, a vehicle or a helicopter into the green zone, then Begin.'); return; }
    const t = view.toTile(e.clientX, e.clientY); if (t.x < 0 || t.y < 0 || t.x >= B.map.w || t.y >= B.map.h) return;
    const pe = { clientX: e.clientX, clientY: e.clientY }; const f = unitAtPoint(pe);
    if (!S.sel.size && f) { S.sel.add(f.id); paintCard(); }
    const us = [...S.sel].map((x) => B.byId.get(x)).filter((u) => u && u.alive && !u.fled); if (!us.length) { say('Select someone first: click a soldier or drag a box.'); return; }
    const has = (fn) => us.some(fn); const b = buildingAt(t, pe); const via = (mode) => () => target(pe, false, mode);
    const go = [['➜', 'Move here', 'M', via('move')], ['⚔', 'Attack-move here', 'A', via('amove')]];
    if (b) for (let i = 0; i < Math.min(b.floors, 5); i++) go.push(['⌂', b.floors > 1 ? `Garrison building ${b.id + 1}, floor ${i + 1}` : `Garrison building ${b.id + 1}`, i === Math.min(S.gFloor, b.floors - 1) ? 'G' : '', () => { S.gFloor = i; target(pe, false, 'garrison'); }]);
    if (us.some((u) => u.kind === 'helicopter')) { go[0] = ['✈', 'Fly to here', 'F', via('move')]; go.push(['◌', 'Orbit here', 'O', via('orbit')], ['⇄', 'Attack pass through here', 'P', via('pass')], ['⤓', 'Land here', 'L', via('land')]); }
    const tac = [['↷', 'Flank round to here', '', via('flank')], ['◎', 'Regroup here', '', via('regroup')], ['👁', 'Scout ahead to here', '', via('recon')]];
    if (has(isVeh)) tac.push(['⮌', 'Reverse to here', '', via('reverse')]);
    const fire = [['☁', 'Throw smoke here', 'S', via('smoke')], ['≋', 'Suppress this point', '', via('suppress')], ['▦', 'Open the wall (breach)', 'B', via('breach')]];
    if (has((u) => u.arty)) fire.push(['✹', 'Fire mission here', '', via('fire')]);
    if (has((u) => u.role === 'engineer')) fire.push(['✸', `Plant a charge (${B.sup.items.item_breach_charge || 0})`, '', via('charge')]);
    if (has((u) => u.role === 'uav')) fire.push(['✈', 'Scout drone to here', '', via('scout')], ['✺', 'FPV strike here', '', via('fpv')]);
    const onUnit = []; if (f && has((u) => u.id !== f.id)) onUnit.push(['⛨', `Escort ${f.name}`, '', via('escort')]); if (f?.mod) onUnit.push(['🔧', `Repair ${f.name}`, '', via('repair')]); if (f?.pax) onUnit.push(['⇥', `Board ${f.name}`, '', via('load')]);
    const sup = supportEntries().map(([label, mode]) => ['✦', `Call: ${label}`, '', via(mode)]);
    const stand = [['■', 'Hold position', 'H', () => give({ type: 'hold' }, 'hold')], ['⏏', 'Retreat', 'R', () => give({ type: 'retreat' }, 'retreat')]];
    if (B.rules >= 3 && has((u) => u.role === 'medic')) stand.unshift(['✚', 'Tend the wounded', '', () => give({ type: 'tend' }, 'tend the wounded')]);
    if (has((u) => u.pax?.length)) stand.unshift(['⇤', 'Unload', '', () => { const ids = us.filter((u) => u.pax?.length).map((u) => u.id); issue(B, ids, { type: 'unload' }); save(); say('unload.'); }]);
    const kids = [h('div', { class: 'bt-mh' }, `${us.length} selected`)];
    [go, tac, fire, onUnit, sup, stand].filter((sec) => sec.length).forEach((sec, i) => { if (i) kids.push(h('div', { class: 'bt-ms' })); for (const [ic, label, key, fn] of sec) kids.push(h('button', { class: 'bt-mi', onclick: () => { closeMenu(); fn(); } }, h('i', {}, ic), h('span', {}, label), key ? h('kbd', {}, key) : null)); });
    menu.replaceChildren(...kids); menu.classList.remove('hidden'); S.menu = { t, pe };
    const r = body.getBoundingClientRect(); let x = e.clientX - r.left + 6; let y = e.clientY - r.top + 6; x = Math.max(8, Math.min(x, r.width - menu.offsetWidth - 8)); y = Math.max(8, Math.min(y, r.height - menu.offsetHeight - 8)); menu.style.left = `${x}px`; menu.style.top = `${y}px`;
  };

  // ---- the chrome
  const MODES = { move: 'Move', amove: 'Attack-move', garrison: 'Garrison', smoke: 'Throw smoke', breach: 'Open the wall', orbit: 'Orbit here', pass: 'Attack pass: press and drag a line', land: 'Land here' };
  const paintBar = () => {
    const sep = () => h('span', { class: 'sep' });
    if (planning()) { bar.replaceChildren(h('button', { onclick: () => view.zoomBy(1.25, canvas.width / 2, canvas.height / 2) }, '＋'), h('button', { onclick: () => view.zoomBy(0.8, canvas.width / 2, canvas.height / 2) }, '－'), h('span', { class: 'bt-warn' }, 'Planning: the clock is stopped')); hint.classList.add('hidden'); return; }
    bar.replaceChildren(...SPEEDS.map(([v, l]) => h('button', { class: S.speed === v ? 'on' : '', title: ['pause (Space)', 'normal (1)', 'fast (2)', 'fastest (3)'][SPEEDS.findIndex((x) => x[0] === v)], onclick: () => { S.speed = v; paintBar(); } }, l)), sep(),
      h('button', { title: 'how a group of three or more arranges itself when it moves', onclick: () => { const fs = ['line', 'column', 'wedge', 'skirmish', 'none']; S.formation = fs[(fs.indexOf(S.formation) + 1) % fs.length]; paintBar(); } }, `▤ ${S.formation}`),
      h('button', { title: 'hold fire / defensive / aggressive, for those selected', onclick: () => { const ss = ['aggressive', 'defensive', 'holdfire']; S.stance = ss[(ss.indexOf(S.stance || 'aggressive') + 1) % 3]; if (S.sel.size) give({ type: 'stance', stance: S.stance }, `${S.stance}`); paintBar(); } }, `🛡 ${S.stance || 'aggressive'}`),
      ...(B && B.reserve.length ? [h('button', { class: B.reserveAt !== null ? 'on' : '', title: 'the squads you held back come on at your edge after twenty seconds', onclick: () => { const r = callReserve(B); say(r.text); if (r.ok) save(); paintBar(); } }, B.reserveAt !== null ? 'Reserve coming…' : `Reserve (${B.reserve.length})`)] : []),
      ...(B && B.rules >= 3 && B.units.some((u) => u.side === 'e' && u.W.airOnly && u.alive && seenSet().has(u.id)) ? [h('span', { class: 'bt-warn', title: 'an anti-air gun in sight: an aircraft pass in its reach can be shot down' }, '⚠ enemy AA')] : []), sep(),
      h('button', { onclick: () => view.zoomBy(1.25, canvas.width / 2, canvas.height / 2) }, '＋'), h('button', { onclick: () => view.zoomBy(0.8, canvas.width / 2, canvas.height / 2) }, '－'),
      ...(B ? Object.entries(opened()).map(([b, v]) => h('button', { class: S.ground.has(Number(b)) ? 'on' : '', title: 'what to show of this building', onclick: () => { const n = Number(b); if (S.ground.has(n)) S.ground.delete(n); else S.ground.add(n); paintBar(); } }, `🏢${Number(b) + 1}: ${S.ground.has(Number(b)) ? 'ground' : `floor ${v.floor + 1}`}`)) : []),
      h('button', { class: 'bt-help', title: 'Right-click the map for every order. Shift + right-click: attack-move at once. Hotkeys: M move · A attack-move · G garrison · S smoke · B breach · H hold · R retreat · F fly to · O orbit · P attack pass · L land · 1-9 teams (Ctrl + number binds) · Ctrl-click one soldier · Space pause · - + speed · C centre · arrows or Alt-drag pan · Esc cancels', onclick: () => say('Right-click for orders (Shift: attack-move). M A G S B · H hold · R retreat · F O P L helicopter · 1-9 teams · Space pause · - + speed · C centre · Esc cancels.') }, '?'));
    if (S.mode) { hint.textContent = S.mode.startsWith('support:') ? 'Call support: click the target · Esc cancels' : `${MODES[S.mode] || S.mode}: click the target · Esc cancels`; hint.classList.remove('hidden'); } else hint.classList.add('hidden');
  };
  const paintCard = () => {
    const us = [...S.sel].map((x) => B?.byId.get(x)).filter(Boolean);
    if (!us.length) { card.replaceChildren(h('small', {}, B ? (planning() ? 'Click a soldier to take his team (Ctrl: him alone), drag a team onto the zone to place it.' : 'Click a soldier (his team) or drag a box, then right-click for orders. Space pauses · wheel zooms · Alt-drag pans · 1-9 teams') : '')); return; }
    const by = {}; for (const u of us) by[u.role] = (by[u.role] || 0) + 1; const shaken = us.filter((u) => u.state !== 'steady').length;
    const tos = teamsOfSelection(B, [...S.sel]); const inf = tos.filter((q) => q.team.kind === 'inf');
    const teamChips = tos.map((q) => h('button', { class: 'bt-chip bt-team', style: `border-color:${colorOf(myTeams(B).findIndex((t) => t.id === q.team.id))}`, title: `select all of ${q.team.name}`, onclick: () => { S.sel = new Set(liveMembers(B, q.team)); paintCard(); paintPlan(); } }, `${teamLetter(q.team)} ${q.team.name} ${q.n}/${q.of}`));
    const kids = [h('div', { class: 'bt-chips' }, h('b', {}, `${us.length}`), ...teamChips, ...Object.entries(by).map(([k, v]) => h('button', { class: 'bt-chip', title: `keep only the ${k.replace('_', ' ')}`, onclick: () => { S.sel = new Set(us.filter((u) => u.role === k).map((u) => u.id)); paintCard(); } }, `${v} ${k.replace('_', ' ')}`)))];
    const actions = [];
    if (inf.length === 1 && inf[0].n < inf[0].of && !planning()) { const nameIn = h('input', { class: 'bt-name', list: 'bt-names', placeholder: 'Alpha', value: S.teamName, oninput: (e) => { S.teamName = e.target.value; } }); actions.push(nameIn, h('button', { title: 'split the selected soldiers off as a team of their own', onclick: () => doSplit(inf[0].team.id) }, 'Split off as team')); }
    if (inf.length >= 2 && !planning()) actions.push(h('button', { title: 'merge the selected teams into the first', onclick: () => doMerge(inf.map((q) => q.team.id)) }, 'Merge teams'));
    if (actions.length) kids.push(h('div', { class: 'bt-chips' }, ...actions));
    kids.push(h('small', {}, `Health ${Math.round((us.reduce((a, u) => a + u.hp / u.hpMax, 0) / us.length) * 100)}%${shaken ? ` · ${shaken} shaken` : ''}${B.rules >= 4 ? ` · ${[...new Set(us.map((u) => u.stance))].join('/')}` : ''}${planning() ? '' : ' · right-click for orders'}`));
    card.replaceChildren(...kids);
  };
  // ---- teams: split and merge (free while planning; in the battle the simulation's own rules, with its refusal said as it gives it)
  const refreshTeams = () => { autoBind(B, S.bind); S.tagSig = ''; paintCard(); paintPlan(); };
  const doSplit = (teamId) => { const t = (B.teams || []).find((q) => q.id === teamId); const ids = [...S.sel].filter((x) => t?.members.includes(x)); const r = splitTeam(B, teamId, ids, S.teamName.trim() || undefined); say(r.text); if (r.ok) { save(); S.teamName = ''; S.sel = new Set(ids); refreshTeams(); } else paintCard(); return r; };
  const doMerge = (teamIds) => { let last = null; for (const id of teamIds.slice(1)) { const r = mergeTeams(B, teamIds[0], id); say(r.text); if (!r.ok) break; last = r; } if (last) { save(); S.sel = new Set(liveMembers(B, (B.teams || []).find((q) => q.id === teamIds[0]))); refreshTeams(); } else paintCard(); return last; };

  // ---- the planning stage: zones and entries on the ground, the force as cards by team, the scout picture, Begin
  const paintPlan = () => {
    if (!planning()) { plan.classList.add('hidden'); return; }
    plan.classList.remove('hidden');
    const intel = planIntel(B); const un = unplaced(B); const cur = currentEntry(B);
    const teams = myTeams(B); const infTeams = teams.filter((t) => t.kind === 'inf');
    const kids = [h('h3', {}, 'Plan the approach'), h('small', {}, 'Drag a team, vehicle or helicopter on the map onto the green zone. Select soldiers, name them and split them off as a team of their own.')];
    kids.push(h('div', { class: 'bt-sec' }, 'Where you come in'), h('div', { class: 'bt-chips' }, ...intel.entries.map((e) => h('button', { class: e.id === cur.id ? 'on' : '', title: 'lay the force out again in this zone', onclick: () => { const r = chooseEntry(B, e.id); say(r.text); if (r.ok) { save(); const z = e.zone; view.center(z.x + z.w / 2, z.y + z.h / 2); } paintPlan(); } }, e.name))));
    kids.push(h('div', { class: 'bt-sec' }, 'Your force'));
    teams.forEach((t, i) => {
      const live = liveMembers(B, t); const col = colorOf(i); const picked = live.filter((m) => S.sel.has(m)); const out = t.members.some((m) => { const u = B.byId.get(m); const z = cur.zone; return u && u.alive && !u.inside && !(u.x >= z.x && u.y >= z.y && u.x < z.x + z.w && u.y < z.y + z.h); });
      const chips = t.kind === 'inf' ? live.map((m) => { const u = B.byId.get(m); return h('button', { class: `bt-chip${S.sel.has(m) ? ' on' : ''}`, title: u.name, onclick: () => { if (S.sel.has(m)) S.sel.delete(m); else S.sel.add(m); paintCard(); paintPlan(); } }, `${u.role.replace('_', ' ')}`); }) : [];
      const acts = [];
      if (t.kind === 'inf' && live.length >= 2 && picked.length && picked.length < live.length) acts.push(h('button', { onclick: () => doSplit(t.id) }, `Split off ${picked.length} as team`));
      if (t.kind === 'inf' && infTeams.length > 1) { const sel = h('select', { class: 'bt-sel', title: 'merge another team into this one' }, h('option', { value: '' }, 'Merge in…'), ...infTeams.filter((q) => q.id !== t.id).map((q) => h('option', { value: q.id }, q.name))); sel.onchange = () => { if (sel.value) doMerge([t.id, sel.value]); }; acts.push(sel); }
      kids.push(h('div', { class: `bt-tcard${out ? ' out' : ''}`, style: `border-left-color:${col}` }, h('div', { class: 'bt-th', onclick: () => { S.sel = new Set(live); const u = B.byId.get(live[0]); if (u) view.center(u.x, u.y); paintCard(); paintPlan(); } }, h('i', { class: 'bt-tl', style: `background:${col}` }, teamLetter(t)), h('b', {}, t.name), h('span', {}, t.kind === 'inf' ? `${live.length} soldier${live.length === 1 ? '' : 's'}` : t.kind === 'veh' ? 'machine' : ''), h('em', {}, out ? 'outside the zone' : 'in place'), h('kbd', {}, [...S.bind].find(([, v]) => v === t.id)?.[0] || '')), chips.length ? h('div', { class: 'bt-chips' }, ...chips) : null, acts.length ? h('div', { class: 'bt-chips' }, ...acts) : null));
    });
    kids.push(h('div', { class: 'bt-chips' }, h('input', { class: 'bt-name', list: 'bt-names', placeholder: 'Name for the next team (Alpha, Medics…)', value: S.teamName, oninput: (e) => { S.teamName = e.target.value; } }), h('button', { title: 'lay the force out again, the sound way, in the chosen zone', onclick: () => { const r = chooseEntry(B, cur.id); say('Default placement.'); if (r.ok) save(); paintPlan(); } }, 'Default placement')));
    kids.push(h('div', { class: 'bt-sec' }, 'What the scouts know'), h('small', { class: 'bt-intel' }, intelText(intel)));
    if (S.confirm && un.count) kids.push(h('div', { class: 'bt-warnbox' }, `${un.count} of yours (${un.teams.join(', ')}) are outside the zone and will start where they are. Begin anyway?`, h('div', { class: 'bt-chips' }, h('button', { onclick: () => begin() }, 'Begin anyway'), h('button', { onclick: () => { S.confirm = false; paintPlan(); } }, 'Keep planning'))));
    else kids.push(h('button', { class: 'bt-begin', onclick: () => { if (un.count) { S.confirm = true; paintPlan(); } else begin(); } }, 'Begin the battle'));
    plan.replaceChildren(...kids);
  };
  const begin = () => { const r = beginBattle(B); say(r.text); if (!r.ok) return; S.confirm = false; S.speed = 1; S.sel.clear(); save(); paintBar(); paintTop(); paintCard(); paintPlan(); };
  const drawPlan = () => {
    if (!planning()) return; const g2 = canvas.getContext('2d'); const now = performance.now(); const intel = planIntel(B); const cur = currentEntry(B);
    g2.setTransform(1, 0, 0, 1, 0, 0); const poly = (z) => { g2.beginPath(); [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.h], [z.x, z.y + z.h]].forEach(([x, y], i) => { const q = view.toCanvas(x * TP, y * TP, 0); if (i) g2.lineTo(q.x, q.y); else g2.moveTo(q.x, q.y); }); g2.closePath(); };
    const label = (x, y, text, col) => { g2.font = 'bold 12px system-ui'; g2.textAlign = 'center'; g2.fillStyle = 'rgba(8,8,20,0.8)'; const w = g2.measureText(text).width + 12; g2.fillRect(x - w / 2, y - 12, w, 17); g2.fillStyle = col; g2.fillText(text, x, y + 1); };
    for (const e of intel.entries) {
      const mine = e.id === cur.id; poly(e.zone);
      if (mine) { g2.fillStyle = 'rgba(122,240,160,0.14)'; g2.fill(); g2.strokeStyle = 'rgba(122,240,160,0.95)'; g2.lineWidth = 3; g2.setLineDash([]); } else { g2.fillStyle = 'rgba(138,180,255,0.06)'; g2.fill(); g2.strokeStyle = 'rgba(138,180,255,0.7)'; g2.lineWidth = 2; g2.setLineDash([9, 7]); }
      g2.stroke(); g2.setLineDash([]); const c = view.toCanvas((e.zone.x + e.zone.w / 2) * TP, (e.zone.y + e.zone.h / 2) * TP, 0); label(c.x, c.y, mine ? `${e.name} (your zone)` : `${e.name}: another way in`, mine ? '#7af0a0' : '#8ab4ff');
    }
    const z = view.cam.zoom; const ell = (x, y, r) => { g2.beginPath(); g2.ellipse(x, y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, 7); };
    for (const sp of intel.strongpoints) { if (sp.kind === 'building') { const b = B.map.buildings[sp.b]; if (!b) continue; g2.beginPath(); [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].forEach(([x, y], i) => { const q = view.toCanvas(x * TP, y * TP, 0); if (i) g2.lineTo(q.x, q.y); else g2.moveTo(q.x, q.y); }); g2.closePath(); g2.strokeStyle = '#ffb43a'; g2.lineWidth = 2; g2.setLineDash([5, 4]); g2.stroke(); g2.setLineDash([]); const c = view.toCanvas(sp.x * TP, sp.y * TP, 70); label(c.x, c.y, 'strongpoint', '#ffb43a'); } else { const c = view.toCanvas(sp.x * TP, sp.y * TP, 0); ell(c.x, c.y, 3 * TP * z); g2.strokeStyle = '#ffb43a'; g2.lineWidth = 2; g2.setLineDash([5, 4]); g2.stroke(); g2.setLineDash([]); label(c.x, c.y - 10, 'trench line', '#ffb43a'); } }
    for (const c0 of intel.contacts) {
      const c = view.toCanvas(c0.x * TP, c0.y * TP, 0); const sure = c0.conf >= 1;
      if (!sure) { const r = (2 + (1 - c0.conf) * 12) * TP * z; g2.beginPath(); g2.ellipse(c.x, c.y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, 7); g2.fillStyle = 'rgba(255,90,70,0.12)'; g2.fill(); g2.strokeStyle = 'rgba(255,110,90,0.8)'; g2.lineWidth = 2; g2.setLineDash([7, 6]); g2.lineDashOffset = -(now / 80) % 13; g2.stroke(); g2.setLineDash([]); g2.lineDashOffset = 0; }
      ell(c.x, c.y, 0.7 * TP * z); g2.strokeStyle = '#ff6a58'; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#ff6a58'; g2.fillRect(c.x - 3, c.y - 3, 6, 6);
      label(c.x, c.y - 14, sure ? `${c0.role ? c0.role.replace('_', ' ') : c0.kind === 'inf' ? 'troops' : c0.kind === 'air' ? 'aircraft' : 'vehicle'} (confirmed)` : `${c0.kind === 'inf' ? 'troops' : c0.kind === 'air' ? 'aircraft' : 'vehicle'}? (suspected)`, '#ff9a8a');
    }
    for (const a of intel.aa) { const c = view.toCanvas(a.x * TP, a.y * TP, 0); label(c.x, c.y - 28, 'AA', '#ffd45a'); }
    if (S.place?.moved && S.mouseAt) { const t = S.mouse; const zn = cur.zone; const ok = t && t.x >= zn.x && t.y >= zn.y && t.x < zn.x + zn.w && t.y < zn.y + zn.h; const c = view.toCanvas(t.x * TP, t.y * TP, 0); ell(c.x, c.y, 1.6 * TP * z); g2.strokeStyle = ok ? '#7af0a0' : '#ff6a58'; g2.lineWidth = 3; g2.stroke(); label(c.x, c.y - 16, ok ? `place ${S.place.name || 'here'}` : 'outside your zone', ok ? '#7af0a0' : '#ff6a58'); }
  };
  // ---- a helicopter's flight: its path, an orbit's ring, a pass's line, a landing's mark (at the altitude it is drawn at; the landing on the ground)
  const drawFlight = () => {
    const hs = B.units.filter((u) => u.kind === 'helicopter' && u.side === 'p' && u.alive && !u.fled); if (!hs.length) return; const g2 = canvas.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); const zs = view.cam.zoom;
    for (const u of hs) {
      const sel = S.sel.has(u.id); const o = u.order || {}; if (!sel && !(o.type === 'orbit' || o.type === 'pass' || o.type === 'land' || u.path?.length)) continue;
      const alt = view.altPx(u); const col = sel ? '#8ad8ff' : 'rgba(138,216,255,0.45)'; g2.strokeStyle = col; g2.fillStyle = col; g2.lineWidth = sel ? 2 : 1;
      const P = (x, y, hh = alt) => view.toCanvas(x * TP, y * TP, hh);
      if (o.type === 'orbit') { const r = (o.r || FLIGHT.orbitR) * TP * zs; const c = P(o.x, o.y, alt); g2.beginPath(); g2.ellipse(c.x, c.y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, 7); g2.setLineDash([10, 6]); g2.stroke(); g2.setLineDash([]); const g0 = P(o.x, o.y, 0); g2.beginPath(); g2.ellipse(g0.x, g0.y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, 7); g2.globalAlpha = 0.35; g2.stroke(); g2.globalAlpha = 1; }
      else if (u.path?.length) { let p0 = P(u.x, u.y); g2.beginPath(); g2.moveTo(p0.x, p0.y); for (const q of u.path) { const p1 = P(q.x, q.y, o.type === 'land' && u.path.length === 1 ? Math.min(alt, 20) : alt); g2.lineTo(p1.x, p1.y); } g2.setLineDash([8, 6]); g2.stroke(); g2.setLineDash([]); const last = u.path[u.path.length - 1]; const pe = P(last.x, last.y, alt); g2.beginPath(); g2.arc(pe.x, pe.y, 4, 0, 7); g2.fill(); if (o.type === 'pass') { g2.font = 'bold 11px system-ui'; g2.textAlign = 'center'; g2.fillText('attack pass', pe.x, pe.y - 8); } }
      if (o.type === 'land' && o.x !== undefined) { const c = P(o.x, o.y, 0); const r = landRadius(u) * TP * zs; g2.beginPath(); g2.ellipse(c.x, c.y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, 7); g2.stroke(); g2.font = 'bold 13px system-ui'; g2.textAlign = 'center'; g2.fillText('H', c.x, c.y + 4); }
    }
  };
  paintTop(); paintBar(); paintCard(); paintPlan();

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
    if (S.tagSig !== `${B.teams?.length}|${B.teamSeq}|${(B.teams || []).map((t) => t.members.length).join()}`) { S.tagSig = `${B.teams?.length}|${B.teamSeq}|${(B.teams || []).map((t) => t.members.length).join()}`; S.tags = tagMap(B, colorOf); }
    view.draw(B, { selected: S.sel, open: opened(), seen: seenSet(), cursor: S.mouse, tags: S.tags, footprints: S.footprints });
    if (S.drag?.sel && Math.hypot(S.drag.x1 - S.drag.x, S.drag.y1 - S.drag.y) > 6) { const g2 = canvas.getContext('2d'); const rr = canvas.getBoundingClientRect(); g2.setTransform(1, 0, 0, 1, 0, 0); g2.strokeStyle = '#7af0a0'; g2.lineWidth = 1; g2.strokeRect(Math.min(S.drag.x, S.drag.x1) - rr.left, Math.min(S.drag.y, S.drag.y1) - rr.top, Math.abs(S.drag.x1 - S.drag.x), Math.abs(S.drag.y1 - S.drag.y)); }
    if (S.mode?.startsWith('support:') && S.mouse) { const q = SUPPORT[S.mode.split(':')[1]]; const g2 = canvas.getContext('2d'); const z = view.cam.zoom; const c0 = view.toCanvas(S.mouse.x * TP, S.mouse.y * TP); const r = (q.r || q.width || 1.5) * TP * z; g2.setTransform(1, 0, 0, 1, 0, 0); g2.strokeStyle = '#ff6a4a'; g2.lineWidth = 2; g2.setLineDash([8, 6]); g2.beginPath(); g2.ellipse(c0.x, c0.y, r * Math.SQRT2, r * Math.SQRT1_2, 0, 0, Math.PI * 2); g2.stroke(); if (q.len) { const a = view.toCanvas((S.mouse.x - q.len / 2) * TP, S.mouse.y * TP); const b = view.toCanvas((S.mouse.x + q.len / 2) * TP, S.mouse.y * TP); g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); } g2.setLineDash([]); } // (the strike's circle lies on the ground: a 2:1 ellipse; its run is a line along the map's x axis)
    drawFlight(); drawPlan(); drawPings();
    if (B.tick % 10 === 0 && !planning()) { paintTop(); if (!card.contains(document.activeElement)) paintCard(); }
    if (B.tick - S.lastSave >= 100) { S.lastSave = B.tick; save(); }
    ui.battleFrames = (ui.battleFrames || 0) + 1;
  };
  raf = requestAnimationFrame(frame);

  function close() {
    if (closed) return; closed = true; cancelAnimationFrame(raf); save();
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
    view.dropR3();
    ui.closePanel();
  }
  // the smoke test and the debug commands drive the same battle
  ui.battleHandle = { B, S, view, give, paintPlan, doSplit, doMerge, begin, flyOrder, step: (n = 1) => { for (let i = 0; i < n && !B.over; i++) { step(B); view.fx.step(); } if (B.over && !S.filed) finish(); }, finish, close, save };
  return { title: '', className: 'battlecmd', onClose: () => { if (!closed) { closed = true; cancelAnimationFrame(raf); save(); window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); } view.dropR3(); ui.battleHandle = null; } };
}
export { isVeh };
