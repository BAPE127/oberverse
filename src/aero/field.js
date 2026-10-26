// The field (v0.58.0): what happens on Starling Field and how the simulation tells the renderer.
// Pure plan-making is in flight.js; this is the glue to the aerospace system's state (`A` is the
// Aerospace system, as in events.js): which stand a finished aircraft waits on, when it is
// cleared to leave (one runway, one taxiway, so one at a time), the minute-by-minute change of
// its state, and the list of everything moving on the field that the renderer draws.
//
// Saved: `state.field` = { reserved: [{ from, to }], starts: [t…], active: [aircraft ids] } and, on
// an aircraft, `stand` = { apron, slot, size } and `move` = { kind, t0, rwy } while a movement
// is under way (its `flight` record is the flyable-aircraft update's). Nothing else — the movement is rebuilt from those, so a reload, or a night's
// sleep, finds every aircraft where it should be.
import { fieldGeo, standPose, windRunway, departurePlan, arrivalPlan, poseAt, planLength, runwayWindow, route, along } from './flight.js';
import { apronSize } from './catalog.js';
import { hashUnit } from './config.js';

const MARGIN = 2; // minutes either side of another aircraft's time on the runway

export const geoOf = (A) => (A._geo ||= fieldGeo(A.game.content.maps[A.A.map].airfield));

/** The field's saved state (created on first use). */
export function fieldState(A) {
  const s = A.state;
  s.field ||= { reserved: [], starts: [], active: [] };
  s.field.reserved ||= []; s.field.starts ||= []; s.field.active ||= [];
  return s.field;
}

const lookOf = (A, ac) => A.cfg.products[ac.model]?.look;

/** Where an aircraft stands (tile centre), from its stand. */
export function standOf(A, ac) {
  if (ac.stand.override) return { x: ac.stand.override.x, y: ac.stand.override.y, a: 0 };
  const look = lookOf(A, ac);
  return standPose(geoOf(A), ac.stand.apron, ac.stand.slot, ac.stand.size, look?.len || 4);
}

/** Give a finished aircraft the first run of free stands that fits it (the apron's capacity already allows it). */
export function assignStand(A, co, ac, product) {
  const geo = geoOf(A);
  const apronId = `${co.id}_apron`;
  const ap = geo.aprons[apronId];
  if (!ap) return;
  const n = Math.min(ap.slots.length, co.apron || ap.slots.length);
  const size = Math.max(1, Math.min(n, apronSize(product) || 1));
  const taken = new Array(n).fill(false);
  for (const o of Object.values(A.state.aircraft)) {
    if (o === ac || o.state !== 'awaiting_delivery' || o.stand?.apron !== apronId) continue;
    for (let i = 0; i < o.stand.size; i++) taken[o.stand.slot + i] = true;
  }
  let slot = -1;
  for (let i = 0; i + size <= n && slot < 0; i++) if (taken.slice(i, i + size).every((x) => !x)) slot = i;
  if (slot < 0) slot = Math.max(0, taken.indexOf(false)); // the apron is fragmented: take the first gap (it overlaps a neighbour a little)
  ac.stand = { apron: apronId, slot, size };
  const f = fieldState(A);
  if (!f.active.includes(ac.id)) f.active.push(ac.id);
}

/** A movement's plan, built from what is saved and kept while it's needed. */
export function planOf(A, ac) {
  const fl = ac.move;
  if (!fl || !ac.stand) return null;
  const key = `${ac.id}|${fl.kind}|${fl.t0}|${fl.rwy}`;
  const cache = (A._plans ||= new Map());
  let plan = cache.get(key);
  if (!plan) {
    const P = A.cfg.products[ac.model];
    const o = { stand: standOf(A, ac), apron: ac.stand.apron, len: P.look.len, spec: ac.spec || P.spec, rwy: fl.rwy };
    plan = fl.kind === 'arrival' ? arrivalPlan(A.cfg.flight, geoOf(A), o) : departurePlan(A.cfg.flight, geoOf(A), o);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    cache.set(key, plan);
  }
  return plan;
}

/**
 * Clear an aircraft to leave: the earliest time from now that the runway is free for its roll and
 * the taxiway is free for it to start. Returns the start time (also saved on the aircraft).
 */
export function scheduleDeparture(A, ac) {
  const f = fieldState(A);
  const F = A.cfg.flight;
  const now = A.now;
  const rwy = windRunway(A.day);
  ac.move = { kind: 'departure', t0: now, rwy };
  const w = runwayWindow(planOf(A, ac));
  f.reserved = f.reserved.filter((r) => r.to > now - 60);
  f.starts = f.starts.filter((t) => t > now - 60);
  let t0 = now;
  for (let guard = 0; guard < 60; guard++) {
    let moved = false;
    for (const r of f.reserved) if (t0 + w.from < r.to + MARGIN && t0 + w.to > r.from - MARGIN) { t0 = r.to + MARGIN - w.from; moved = true; }
    for (const st of f.starts) if (Math.abs(t0 - st) < F.stagger) { t0 = st + F.stagger; moved = true; }
    if (!moved) break;
  }
  t0 = Math.round(t0 * 100) / 100;
  ac.move = { kind: 'departure', t0, rwy };
  f.reserved.push({ from: t0 + w.from, to: t0 + w.to });
  f.starts.push(t0);
  return t0;
}

/** Every minute: an aircraft in a movement takes the state its plan says. */
export function tickField(A) {
  const s = A.state;
  ensureAmbient(A);
  const f = s.field;
  if (!f?.active.length) return;
  // Meridian's own aircraft: each morning, who goes out today
  if (f.ambientDay !== A.day && A.game.clock.minuteOfDay >= A.A.decisionHour * 60) { f.ambientDay = A.day; scheduleAmbient(A); }
  const now = A.now;
  for (const id of [...f.active]) {
    const ac = s.aircraft[id];
    if (!ac) { f.active.splice(f.active.indexOf(id), 1); continue; }
    if (ac.ambient && ac.state === 'parked' && !ac.move && ac.sorties?.length && now >= ac.sorties[0].dep) {
      ac.sortie = ac.sorties.shift();
      scheduleDeparture(A, ac);
    }
    const fl = ac.move;
    if (!fl || now < fl.t0) continue;
    const plan = planOf(A, ac);
    const p = poseAt(plan, now - fl.t0);
    if (p.done) {
      if (fl.kind === 'departure' && ac.ambient) {
        // one of Meridian's own: out of sight for the length of its trip, then it comes home (the landing is cleared now, for then)
        ac.state = 'airborne';
        ac.hours = Math.round((ac.hours + (ac.sortie?.away || 30) / 60) * 100) / 100;
        scheduleArrival(A, ac, fl.t0 + planLength(plan) + (ac.sortie?.away || 30));
        ac.sortie = null;
        continue;
      }
      if (fl.kind === 'departure') {
        ac.state = 'departed';
        ac.location = { departed: fl.t0 + planLength(plan) };
        ac.hours = Math.round((ac.hours + 0.15) * 100) / 100;
        f.active.splice(f.active.indexOf(id), 1);
      } else ac.state = 'parked';
      ac.move = null;
      ac.flight = { ...ac.flight, movements: (ac.flight?.movements || 0) + 1, lastMovement: { kind: fl.kind, t0: fl.t0, rwy: fl.rwy } };
      continue;
    }
    if (ac.state !== p.state) {
      if (p.state === 'takeoff' && fl.kind === 'departure' && !ac.ambient && A.company(ac.manufacturer)?.kind === 'player') { // (the player's own deliveries are news; the rest of the field's traffic isn't)
        const P = A.cfg.products[ac.model];
        const who = A.cfg.customers[ac.owner]?.name;
        A.news(`✈ ${who ? `${who}'s ` : 'A '}${P.name} takes off from Starling Field, runway ${fl.rwy}.`, 'info');
      }
      ac.state = p.state;
    }
  }
}

/** An aircraft's standing pose at its stand. */
const parkedPose = (A, ac) => ({ ...standOf(A, ac), alt: 0, gear: true, v: 0, state: ac.state, label: 'on stand' });

/** Everything moving or standing on the field, for the renderer: { id, look, livery, x, y, a, alt, v, gear, state, label } in tiles. */
export function movers(A) {
  const s = A.state;
  const f = s.field;
  if (!f?.active.length) return [];
  const out = [];
  const now = A.now;
  for (const id of f.active) {
    const ac = s.aircraft[id];
    if (!ac?.stand) continue;
    const look = lookOf(A, ac);
    if (!look) continue;
    let p;
    if (ac.move && now >= ac.move.t0) p = poseAt(planOf(A, ac), now - ac.move.t0);
    else if (ac.state === 'awaiting_delivery' || (ac.state === 'parked' && !ac.ambient)) p = parkedPose(A, ac); // (Meridian's own sit on their props when home)
    else continue;
    if (p.done && ac.move?.kind === 'departure') continue;
    out.push({ id, look, livery: ac.livery || null, x: p.x, y: p.y, a: p.a, alt: p.alt, v: p.v, gear: p.gear, state: p.state, label: p.label, model: ac.model });
  }
  return out;
}

/** Fix up saves: aircraft waiting on the apron get stands; the field's lists exist. */
export function migrateField(A) {
  const s = A.state;
  ensureAmbient(A);
  const f = fieldState(A);
  for (const ac of Object.values(s.aircraft)) {
    if (ac.state !== 'awaiting_delivery') continue;
    const co = A.company(ac.manufacturer);
    if (!co) continue;
    if (!ac.stand) assignStand(A, co, ac, A.cfg.products[ac.model]);
    if (!f.active.includes(ac.id)) f.active.push(ac.id);
  }
}

// ------------------------------------------------------------------ the secure convoy
/** The convoy's road (from the map) as a measured path, kept. */
function convoyPath(A, coId) {
  const way = A.game.content.maps[A.A.map].convoy?.[coId];
  if (!way) return null;
  const cache = (A._convoyPaths ||= {});
  return (cache[coId] ||= route(way, 3));
}

/** A strategic product has reached its convoy stage: the convoy leaves now and is off the map in a while. */
export function startConvoy(A, co, u) {
  const path = convoyPath(A, co.id);
  if (!path) return;
  const F = A.cfg.flight;
  const now = A.now;
  u.convoy = { t0: now, t1: now + (path.len + 2 * F.convoyGap) / F.convoySpeed };
  if (co.kind === 'player') A.news(`🛡️ A secure convoy leaves ${co.name} under escort — a consignment for ${A.cfg.customers[A.contract(u.contract)?.customer]?.name || 'a defence customer'}.`, 'info');
}

/** The vehicles of every convoy on the road right now: { id, model, color, x, y, angle } (tiles; angle 0 = east). */
export function convoys(A) {
  const out = [];
  const now = A.now;
  const F = A.cfg.flight;
  for (const co of A.companies()) {
    for (const u of A.unitsOf(co)) {
      if (!u.convoy || now < u.convoy.t0 || now > u.convoy.t1) continue;
      const path = convoyPath(A, co.id);
      if (!path) continue;
      const lead = (now - u.convoy.t0) * F.convoySpeed;
      [['dray', '#23272f', 0], ['longhorn', '#586048', 1], ['dray', '#23272f', 2]].forEach(([model, color, i]) => {
        const d = lead - i * F.convoyGap;
        if (d < 0 || d > path.len) return;
        const p = along(path, d);
        out.push({ id: `${u.id}|${i}`, model, color, x: p.x, y: p.y, angle: p.a - Math.PI / 2, escort: i !== 1 });
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ Meridian's own aircraft
/** The first time the field is looked at, Meridian's company jet and test aircraft become entities that go out and come home. */
export function ensureAmbient(A) {
  const s = A.state;
  const f = fieldState(A);
  if (f.ambientDone) return;
  s.aircraft ||= {};
  for (const d of A.cfg.flight.ambient) {
    if (s.aircraft[d.id]) continue;
    const P = A.cfg.products[d.model];
    s.aircraft[d.id] = {
      id: d.id, model: d.model, unit: null, contract: null, manufacturer: 'meridian', owner: 'meridian', registration: d.reg, ambient: true,
      state: 'parked', location: { map: A.A.map, site: d.apron }, condition: 100, fuel: P.spec?.fuel ?? 0, hours: 1200, built: 0,
      config: {}, spec: P.spec ? { ...P.spec } : null, livery: d.livery, flight: { flyable: false }, move: null, sorties: [],
      stand: { apron: d.apron, slot: 0, size: 1, override: { x: d.at.x + P.look.span / 2, y: d.at.y + P.look.len / 2 } },
    };
    if (!f.active.includes(d.id)) f.active.push(d.id);
  }
  f.ambientDone = true;
}

/** Is this one of Meridian's own at home on its stand (so its prop shows)? */
export function ambientHome(A, id) {
  const ac = A.state.aircraft?.[id];
  if (!ac) return true;
  return ac.state === 'parked' && !(ac.move && A.now >= ac.move.t0);
}

/** Each morning: which of Meridian's own go out today, when, and for how long — fixed by the day, not the dice. */
export function scheduleAmbient(A) {
  const s = A.state;
  const day = A.day;
  const base = (day - 1) * 1440;
  for (const d of A.cfg.flight.ambient) {
    const ac = s.aircraft?.[d.id];
    if (!ac) continue;
    const r = (k) => hashUnit(`amb|${d.id}|${day}|${k}`);
    ac.sorties = [];
    if (r('go') > d.chance) continue;
    const n = d.max > 1 ? 1 + Math.floor(r('n') * d.max) : 1;
    let free = base + d.from * 60;
    for (let i = 0; i < n; i++) {
      const away = Math.round(d.away[0] + r(`a${i}`) * (d.away[1] - d.away[0]));
      const dep = Math.round(Math.max(free, base + d.from * 60 + r(`t${i}`) * (d.to - d.from) * 60));
      ac.sorties.push({ dep, away });
      free = dep + away + 90;
    }
  }
}

/** Clear a landing: the first time at or after `desired` that the runway is free for the whole of the approach and rollout. */
export function scheduleArrival(A, ac, desired) {
  const f = fieldState(A);
  const rwy = windRunway(Math.floor(desired / 1440) + 1);
  ac.move = { kind: 'arrival', t0: desired, rwy };
  const w = runwayWindow(planOf(A, ac));
  f.reserved = f.reserved.filter((r) => r.to > A.now - 60);
  let t0 = desired;
  for (let guard = 0; guard < 60; guard++) {
    let moved = false;
    for (const r of f.reserved) if (t0 + w.from < r.to + MARGIN && t0 + w.to > r.from - MARGIN) { t0 = r.to + MARGIN - w.from; moved = true; }
    if (!moved) break;
  }
  t0 = Math.round(t0 * 100) / 100;
  ac.move = { kind: 'arrival', t0, rwy };
  f.reserved.push({ from: t0 + w.from, to: t0 + w.to });
  return t0;
}

// ------------------------------------------------------------------ what the player hears
/**
 * How loud the field is at (px, py) tiles: { jet, jetPitch, rocket } each 0..1 — the loudest aircraft
 * (a roll or a climb-out is loud, a taxi a murmur) and the loudest launch (the ignition builds, the
 * ascent thunders and fades, a vehicle lost is one hard crack).
 */
export function soundAt(A, px, py) {
  let jet = 0;
  let jetPitch = 0;
  for (const m of movers(A)) {
    if (m.state === 'awaiting_delivery' || m.state === 'parked') continue;
    const d = Math.hypot(m.x - px, m.y - py) + m.alt * 0.6;
    const base = m.state === 'takeoff' ? 1 : m.state === 'airborne' ? 0.8 : m.state === 'landing' ? 0.7 : m.v > 0.5 ? 0.22 : 0.1;
    const lvl = base / (1 + d / 12);
    if (lvl > jet) { jet = lvl; jetPitch = Math.max(0, Math.min(1, m.v / 20)); }
  }
  let rocket = 0;
  for (const l of A.launches()) {
    if (l.kind !== 'sequence') continue;
    const ph = l.ph;
    const d = Math.hypot(l.base.x - px, l.base.y - py);
    let base = 0;
    if (ph.phase === 'ignition') base = 0.15 + 0.55 * ph.burn;
    else if (ph.phase === 'ascent') base = 1 / (1 + ph.t * 0.12);
    else if (ph.phase === 'lost') base = ph.boom < 0.5 ? 1.2 : Math.max(0, 0.5 - ph.boom * 0.2);
    rocket = Math.max(rocket, Math.min(1, base / (1 + d / 22)));
  }
  return { jet: Math.min(1, jet), jetPitch, rocket };
}
