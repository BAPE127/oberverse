// Flight (v0.58.0). Pure functions — no game state, no DOM. The aircraft state machine and the
// scripted movements of an aircraft on the field: pushed back off its stand, taxiing to the
// threshold, lined up, rolling, rotating and climbing away — and the mirror of it, an approach, a
// landing, a rollout and a taxi back to a stand. A movement is a *plan*: a list of legs built
// deterministically from the field's geometry, the aircraft's own flight spec and the runway in
// use; `poseAt(plan, minutes)` says where the aircraft is and what it is doing that many game
// minutes after the plan began. Nothing about a plan is saved: the save holds the start time, the
// runway and the stand, and the plan is built again from those — so a reload, or a night's sleep,
// puts every aircraft exactly where it belongs.
//
// Units: tiles (x, y; y grows downward), game minutes, and radians with 0 = nose up (north) and
// clockwise positive — the convention drawAircraft(ctx, …, heading) uses. `alt` is in tiles above
// the ground.
//
//   STATES, NEXT, canGo(from, to)        the aircraft state machine
//   fieldGeo(airfield)                    runway, taxiway, connectors and aprons from the map's `airfield`
//   standPose(geo, apron, slot, size, L)  where an aircraft stands
//   windRunway(day)                       the runway in use (09 or 27), from the day's wind
//   departurePlan(F, geo, o)              stand → … → away
//   arrivalPlan(F, geo, o)                final → touchdown → rollout → taxi → stand
//   poseAt(plan, t)                       { state, label, x, y, a, alt, v, gear }
import { hashUnit } from './config.js';

/** The aircraft entity's states (v0.58.0 drives the first five; the flight update the rest). */
export const STATES = ['awaiting_delivery', 'taxiing', 'takeoff', 'airborne', 'landing', 'parked', 'maintenance', 'stored', 'retired', 'departed'];

/** Which state may follow which. Anything may be retired; a departed aircraft belongs to its customer and is gone. */
export const NEXT = {
  awaiting_delivery: ['taxiing', 'departed', 'retired'],
  parked: ['taxiing', 'maintenance', 'stored', 'retired'],
  taxiing: ['takeoff', 'parked', 'retired'],
  takeoff: ['airborne', 'taxiing', 'retired'],
  airborne: ['landing', 'departed', 'retired'],
  landing: ['taxiing', 'airborne', 'retired'],
  maintenance: ['parked', 'retired'],
  stored: ['parked', 'retired'],
  retired: [],
  departed: [],
};

export const canGo = (from, to) => (NEXT[from] || []).includes(to);

// ------------------------------------------------------------------ geometry
const tau = Math.PI * 2;
const norm = (a) => { let x = a % tau; if (x > Math.PI) x -= tau; if (x < -Math.PI) x += tau; return x; };
const lerp = (a, b, u) => a + (b - a) * u;
const lerpAngle = (a, b, u) => a + norm(b - a) * u;
const smooth = (u) => { const c = Math.max(0, Math.min(1, u)); return c * c * (3 - 2 * c); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** The heading of a direction vector (0 = up/north, clockwise positive). */
const headingOf = (dx, dy) => Math.atan2(dx, -dy);

/**
 * The field's working geometry from the map's `airfield` (src/content/maps/starling.js): the
 * centrelines are where drawPixelGround paints them.
 */
export function fieldGeo(af) {
  const rw = af.runways[0];
  const runway = { x0: rw.x, x1: rw.x + rw.w, y: rw.y + Math.floor(rw.h / 2), ends: rw.ends };
  const tw = af.taxiways.find((t) => t.w >= t.h && t.y + t.h <= rw.y); // taxiway A
  const taxi = { y: tw.y + Math.floor(tw.h / 2), x0: tw.x, x1: tw.x + tw.w };
  const links = af.taxiways.filter((t) => t.w < t.h);
  const conns = links.filter((t) => t.y + t.h === rw.y).map((t) => ({ x: t.x + Math.floor(t.w / 2) })).sort((a, b) => a.x - b.x);
  const aprons = {};
  for (const ap of af.aprons) {
    const edge = ap.y + ap.h;
    const link = links.find((t) => t.y === edge && t.x >= ap.x && t.x + t.w <= ap.x + ap.w);
    aprons[ap.id] = { id: ap.id, company: ap.company, x: ap.x, y: ap.y, w: ap.w, h: ap.h, edge, slots: ap.slots, link: link ? { x: link.x + Math.floor(link.w / 2) } : null };
  }
  return { runway, taxi, west: conns[0], east: conns[conns.length - 1], aprons, hold: af.hold };
}

/** The lead-in line's x for a stand slot (drawPixelGround paints it a tile and a half in from the slot's x). */
export const slotX = (slot) => slot[0] + 3.5;

/** Where an aircraft stands: `slot` is the first stand's index, `size` the stands it takes, `len` its length in tiles. */
export function standPose(geo, apronId, slot, size, len) {
  const ap = geo.aprons[apronId];
  const first = ap.slots[slot];
  const last = ap.slots[Math.min(ap.slots.length - 1, slot + size - 1)];
  return { x: (slotX(first) + slotX(last)) / 2, y: first[1] + 0.5 + len / 2, a: 0 };
}

/** The runway in use today: 09 (take off to the east, wind from the west) on most days. */
export function windRunway(day) {
  return hashUnit(`wind|${day}`) < 0.7 ? '09' : '27';
}

/** The windsocks' bearing today: they stream away from where the wind comes from (radians, 0 = pointing up). */
export function windHeading(day) {
  return windRunway(day) === '09' ? Math.PI / 2 : -Math.PI / 2;
}

// ------------------------------------------------------------------ paths
/** A polyline with its corners rounded (a quadratic curve cut `r` tiles in), measured by distance. */
function route(pts, r = 0) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (rr < 0.05 || Math.abs(cross) < 1e-6 * l1 * l2) { out.push(b); continue; }
    const p1 = [lerp(b[0], a[0], rr / l1), lerp(b[1], a[1], rr / l1)];
    const p2 = [lerp(b[0], c[0], rr / l2), lerp(b[1], c[1], rr / l2)];
    out.push(p1);
    for (let k = 1; k <= 7; k++) {
      const t = k / 8;
      out.push([(1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0], (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1]]);
    }
    out.push(p2);
  }
  out.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, cum, len: cum[cum.length - 1] };
}

/** The point `d` tiles along a route, and the heading there. */
function along(path, d) {
  const dd = clamp(d, 0, path.len);
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < dd) i++;
  const a = path.pts[i - 1];
  const b = path.pts[i];
  const seg = path.cum[i] - path.cum[i - 1] || 1;
  const u = (dd - path.cum[i - 1]) / seg;
  return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), a: headingOf(b[0] - a[0], b[1] - a[1]) };
}

// ------------------------------------------------------------------ legs
/** A leg of a plan: how long it takes (minutes), the state the aircraft is in, and its pose at u ∈ [0, 1]. */
const leg = (state, label, dur, pose) => ({ state, label, dur, pose });

const still = (state, label, dur, at) => leg(state, label, dur, () => ({ ...at, alt: 0, gear: true }));

const go = (state, label, dur, path, o = {}) => leg(state, label, dur, (u) => {
  const p = along(path, path.len * (o.ease ? o.ease(u) : u));
  return { x: p.x, y: p.y, a: o.heading ? o.heading(u, p) : p.a, alt: o.alt ? o.alt(u) : 0, gear: o.gear ? o.gear(u) : true };
});

const ends = (path) => ({ first: along(path, 0), last: along(path, path.len) });

/** Total minutes of a plan. */
export const planLength = (plan) => plan.legs.reduce((a, l) => a + l.dur, 0);

/**
 * Where the aircraft is, `t` minutes into a plan. Past the end it stays at the last pose with
 * `done: true`. Also gives its ground speed (tiles a minute) for the engine sound.
 */
export function poseAt(plan, t) {
  if (t < 0) { const l = plan.legs[0]; return { ...l.pose(0), state: l.state, label: l.label, v: 0, done: false, before: true }; }
  let rest = t;
  for (let i = 0; i < plan.legs.length; i++) {
    const l = plan.legs[i];
    if (rest <= l.dur || i === plan.legs.length - 1) {
      const u = l.dur > 0 ? clamp(rest / l.dur, 0, 1) : 1;
      const p = l.pose(u);
      // ground speed (tiles a minute) from a short step either side, for the engine sound
      const du = 0.05 / Math.max(l.dur, 0.05);
      const u2 = Math.min(1, u + du);
      const u1 = Math.max(0, u2 - du);
      const a = l.pose(u1);
      const b = l.pose(u2);
      const v = u2 > u1 ? Math.hypot(b.x - a.x, b.y - a.y) / ((u2 - u1) * l.dur) : 0;
      return { ...p, state: l.state, label: l.label, v: Number.isFinite(v) ? v : 0, done: t >= planLength(plan), leg: i };
    }
    rest -= l.dur;
  }
  return null;
}

// ------------------------------------------------------------------ departure
/** How far down the runway an aircraft rolls before it lifts off (tiles): its take-off run in metres, compressed, within the runway. */
export function rollTiles(F, geo, spec) {
  const run = spec?.takeoff || 0;
  const room = geo.runway.x1 - geo.runway.x0 - F.rollMargin;
  return clamp(F.rollTiles + run / F.metresPerTile, F.rollMin, room);
}

/**
 * The plan for an aircraft leaving: pushed back off its stand, a tail swing, a taxi to the
 * threshold of the runway in use, a hold short, a line-up, the roll, the climb out.
 * o: { stand: {x, y} (centre), apron, len (tiles), spec, rwy: '09' | '27' }
 */
export function departurePlan(F, geo, o) {
  const east = o.rwy !== '27'; // 09 departs to the east
  const dir = east ? 1 : -1;
  const taxiDir = -dir; // toward the threshold we leave from
  const ap = geo.aprons[o.apron];
  const th = (east ? geo.west : geo.east).x;
  const legs = [];
  const sx = o.stand.x;
  const sy = o.stand.y;
  const len = Math.min(o.len || 4, 12);
  if (o.spec?.vtol) return vtolDeparture(F, geo, o, dir);
  // pushed back along the lead-in to the apron's edge, swinging its tail round to face the way it will taxi
  const py = ap.link ? ap.edge - 1.6 : ap.edge - 0.6 + len * 0.12;
  const push = route([[sx, sy], [sx, py]]);
  const taxiPts = ap.link
    ? [[sx, py], [ap.link.x, py], [ap.link.x, geo.taxi.y], [th, geo.taxi.y], [th, geo.taxi.y + 1.25]]
    : [[sx, py], [sx + taxiDir * 6, geo.taxi.y], [th, geo.taxi.y], [th, geo.taxi.y + 1.25]];
  const taxi = route(taxiPts, 3);
  const swingTo = along(taxi, 0.6).a;
  legs.push(go('taxiing', 'being pushed back', Math.max(1.5, push.len / F.pushSpeed), push, { ease: smooth, heading: (u) => lerpAngle(0, swingTo, smooth((u - 0.35) / 0.65)) }));
  legs.push(go('taxiing', `taxiing to runway ${o.rwy}`, taxi.len / F.taxiSpeed, taxi, { ease: (u) => lerp(u, smooth(u), 0.45) }));
  const hold = along(taxi, taxi.len);
  legs.push(still('taxiing', `holding short of runway ${o.rwy}`, F.holdShort, hold));
  const lineX = th + dir * 5;
  const line = route([[th, geo.taxi.y + 1.25], [th, geo.runway.y], [lineX, geo.runway.y]], 3);
  legs.push(go('taxiing', `lining up on runway ${o.rwy}`, line.len / F.lineupSpeed, line, { ease: (u) => lerp(u, smooth(u), 0.5) }));
  const lined = along(line, line.len);
  legs.push(still('taxiing', `cleared for take-off, runway ${o.rwy}`, F.lineupHold, lined));
  const D = rollTiles(F, geo, o.spec);
  const roll = route([[lineX, geo.runway.y], [lineX + dir * D, geo.runway.y]]);
  const heading = dir * Math.PI / 2;
  legs.push(go('takeoff', `rolling, runway ${o.rwy}`, F.rollMinutes + D * F.rollPerTile, roll, { ease: (u) => u * u, heading: () => heading }));
  // away: out past the end of the runway and off the map, speeding up from the speed it left the ground at
  const outX = dir > 0 ? geo.runway.x1 + F.exitTiles : geo.runway.x0 - F.exitTiles;
  const away = route([[lineX + dir * D, geo.runway.y], [outX, geo.runway.y]]);
  const v0 = (2 * D) / (F.rollMinutes + D * F.rollPerTile);
  const peak = F.climbAlt + clamp((o.spec?.climb || 10) / 10, 0.5, 6);
  legs.push(go('airborne', 'climbing away', away.len / (v0 * 1.4), away, { ease: (u) => 0.714 * u + 0.286 * u * u, heading: () => heading, alt: (u) => peak * Math.pow(u, 1.25), gear: (u) => u < 0.12 }));
  return { legs, kind: 'departure', rwy: o.rwy };
}

/** A vertical take-off: up off the stand, then the transition and away. */
function vtolDeparture(F, geo, o, dir) {
  const { x, y } = o.stand;
  const heading = dir * Math.PI / 2;
  const legs = [];
  legs.push(still('taxiing', 'running up', F.lineupHold + 1, { x, y, a: 0 }));
  legs.push(leg('takeoff', 'lifting off vertically', F.vtolRise, (u) => ({ x, y, a: lerpAngle(0, heading, smooth((u - 0.6) / 0.4)), alt: F.vtolAlt * smooth(u), gear: u < 0.2 })));
  const away = route([[x, y], [dir > 0 ? geo.runway.x1 + F.exitTiles : geo.runway.x0 - F.exitTiles, y - 4]]);
  legs.push(go('airborne', 'climbing away', away.len / F.vtolSpeed, away, { ease: (u) => u * u, heading: () => heading, alt: (u) => F.vtolAlt + F.climbAlt * u, gear: () => false }));
  return { legs, kind: 'departure', rwy: dir > 0 ? '09' : '27' };
}

// ------------------------------------------------------------------ arrival
/**
 * An aircraft coming home: a straight-in final, the flare and touchdown, the rollout to the end of
 * the runway, off at the far connector, back along taxiway A and nose-in to its stand.
 * o: { stand: {x, y}, apron, len, spec, rwy }
 */
export function arrivalPlan(F, geo, o) {
  const east = o.rwy !== '27'; // 09 lands heading east
  const dir = east ? 1 : -1;
  const near = east ? geo.runway.x0 : geo.runway.x1;
  const td = near + dir * F.touchdown;
  const exit = (east ? geo.east : geo.west).x;
  const ap = geo.aprons[o.apron];
  const sx = o.stand.x;
  const sy = o.stand.y;
  const heading = dir * Math.PI / 2;
  const legs = [];
  const finalLen = F.finalTiles;
  const fin = route([[td - dir * finalLen, geo.runway.y], [td, geo.runway.y]]);
  legs.push(go('landing', `on final, runway ${o.rwy}`, F.finalMin, fin, { heading: () => heading, alt: (u) => F.finalAlt * Math.pow(1 - u, 1.15), gear: (u) => u > 0.35 }));
  const stop = exit - dir * 6;
  const rollLen = Math.abs(stop - td);
  const rollout = route([[td, geo.runway.y], [stop, geo.runway.y]]);
  legs.push(go('landing', 'braking', F.rollMinutes * 0.6 + rollLen * F.rollPerTile * 0.8, rollout, { ease: (u) => 1 - (1 - u) * (1 - u), heading: () => heading }));
  // off the runway, along taxiway A, into the stand
  const py = ap.link ? ap.edge - 1.6 : ap.edge - 0.6;
  const pts = [[stop, geo.runway.y], [exit, geo.runway.y], [exit, geo.taxi.y]];
  if (ap.link) pts.push([ap.link.x, geo.taxi.y], [ap.link.x, py], [sx, py], [sx, sy]);
  else pts.push([sx, geo.taxi.y], [sx, sy]);
  const taxi = route(pts, 3);
  legs.push(go('taxiing', 'taxiing to its stand', taxi.len / F.taxiSpeed, taxi, { ease: (u) => lerp(u, smooth(u), 0.45) }));
  legs.push(still('parked', 'on stand', 1, { x: sx, y: sy, a: 0 }));
  return { legs, kind: 'arrival', rwy: o.rwy, final: { x: fin.pts[0][0], y: fin.pts[0][1] }, end: ends(taxi).last };
}

/**
 * The minutes of a plan (from its start) in which the aircraft is on the runway: a departure from
 * lining up to the end of its roll, an arrival from its final to the end of its braking.
 */
export function runwayWindow(plan) {
  let t = 0;
  let from = null;
  let to = 0;
  for (const l of plan.legs) {
    if (/lining up|cleared for|rolling|on final|braking/.test(l.label)) { if (from === null) from = t; to = t + l.dur; }
    t += l.dur;
  }
  return { from: from ?? 0, to };
}
