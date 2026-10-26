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
import { fieldGeo, standPose, windRunway, departurePlan, arrivalPlan, poseAt, planLength, runwayWindow } from './flight.js';
import { apronSize } from './catalog.js';

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
  const f = s.field;
  if (!f?.active.length) return;
  const now = A.now;
  for (const id of [...f.active]) {
    const ac = s.aircraft[id];
    if (!ac) { f.active.splice(f.active.indexOf(id), 1); continue; }
    const fl = ac.move;
    if (!fl || now < fl.t0) continue;
    const plan = planOf(A, ac);
    const p = poseAt(plan, now - fl.t0);
    if (p.done) {
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
      if (p.state === 'takeoff' && fl.kind === 'departure') {
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
    else if (ac.state === 'awaiting_delivery' || ac.state === 'parked') p = parkedPose(A, ac);
    else continue;
    if (p.done && ac.move?.kind === 'departure') continue;
    out.push({ id, look, livery: ac.livery || null, x: p.x, y: p.y, a: p.a, alt: p.alt, v: p.v, gear: p.gear, state: p.state, label: p.label, model: ac.model });
  }
  return out;
}

/** Fix up saves: aircraft waiting on the apron get stands; the field's lists exist. */
export function migrateField(A) {
  const s = A.state;
  if (!s.aircraft) return;
  const f = fieldState(A);
  for (const ac of Object.values(s.aircraft)) {
    if (ac.state !== 'awaiting_delivery') continue;
    const co = A.company(ac.manufacturer);
    if (!co) continue;
    if (!ac.stand) assignStand(A, co, ac, A.cfg.products[ac.model]);
    if (!f.active.includes(ac.id)) f.active.push(ac.id);
  }
}
