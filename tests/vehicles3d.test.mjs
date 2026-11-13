// The 3D vehicles and machines (phase 3D-3), without WebGL: every car model, transit kind, signature car, aircraft, rocket and war machine resolves to a
// builder; each object is centred, stands on the ground, runs along +x at the model's length, has its wheels and a working update(); the cars are
// merged into few meshes; the machines module creates, places and frees its objects from the game's own state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../src/engine3d/three.js';
import { VEHICLES } from '../src/engine3d/registry3d.js';
import '../src/engine3d/vehicles3d.js';
import { CAR_MODELS } from '../src/content/vehicles.js';
import { CONTENT, newGame } from './helpers.mjs';
import { buildAircraft, KINDS } from '../src/engine3d/vehicles/aircraft.js';
import { buildRocket } from '../src/engine3d/vehicles/rocket.js';
import { buildWarVehicle, buildHelicopter } from '../src/engine3d/vehicles/military.js';
import { SPEC } from '../src/engine/drawFleet.js';
import { syncMachines, disposeMachines, parkedList } from '../src/engine3d/machines3d.js';
import { parkedMachines } from '../src/engine/drawParked.js';
import { PARK } from '../src/content/maps/hollowmoor.js';
import { Geo } from '../src/engine3d/vehicles/geo.js';
import { TYPES } from '../src/engine3d/vehicles/cars.js';

const TILE = 32;
const ctx = { night: false, time: 0, game: null };
const box = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
const builderFor = (m) => VEHICLES.get(m.id) || VEHICLES.get(m.body);
const wheelCount = (o) => o.userData.wheels.length;

// the live fields the simulation gives a car
const live = (m) => ({ id: 'car_x', model: m.id, x: 400, y: 400, angle: 0.6, wheel: 0.5, speed: 120, braking: true, chase: null, color: m.colors?.[0], moved: 120, odo: 300, hornAt: 1 });

const models = Object.entries(CAR_MODELS).map(([id, m]) => ({ ...m, id }));
const busLines = CONTENT.transit.lines.map((l) => ({ id: `bus:${l.id}`, body: 'bus', len: l.len, wid: l.wid, colors: [l.color] }));
const WHEELS = { hypotenuse: 3, bullion: 6, longdistance: 6, plumbbob: 6, paranoia: 6, longhorn: 6 };

test('every model in content.vehicles has a registered builder, and every transit kind (bus, traffic) too', () => {
  assert.ok(models.length >= 18);
  for (const m of models) assert.ok(builderFor(m), `${m.id} (${m.body})`);
  for (const b of busLines) assert.ok(builderFor(b), b.id);
  const kinds = new Set(CONTENT.transit.traffic.models);
  for (const id of kinds) assert.ok(CAR_MODELS[id] && builderFor({ id, ...CAR_MODELS[id] }), `traffic model ${id}`);
  // every body type that exists is a distinct builder
  const bodies = new Set(models.map((m) => m.body));
  for (const b of bodies) assert.ok(VEHICLES.has(b), `body ${b}`);
  assert.ok(['hatch', 'estate', 'saloon', 'police', 'gt', 'coupe', 'limo', 'pickup', 'tractor', 'bus'].every((b) => VEHICLES.has(b)));
});

test('each built vehicle is centred, stands on the ground, runs along x at the model length, has wheels and a working update', () => {
  for (const m of [...models, ...busLines]) {
    const o = builderFor(m)({ ...m }, ctx);
    const bb = box(o);
    const size = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
    const len = m.len / TILE;
    assert.ok(Math.abs(c.x) < 0.1 && Math.abs(c.z) < 0.1, `${m.id}: centred (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`);
    assert.ok(bb.min.y > -0.001 && bb.min.y < 0.05, `${m.id}: min y ${bb.min.y.toFixed(3)}`);
    assert.ok(Math.abs(size.x - len) / len < 0.15, `${m.id}: length ${size.x.toFixed(2)} vs ${len.toFixed(2)}`);
    assert.ok(size.x > size.z * 1.05 || m.id === 'bigcheese' || m.id === 'paranoia', `${m.id}: longer than wide`);
    assert.ok(size.y > 0.5 && size.y < 3.5, `${m.id}: height ${size.y.toFixed(2)}`);
    const want = WHEELS[m.id] || 4;
    assert.ok(wheelCount(o) >= want, `${m.id}: ${wheelCount(o)} wheels, wanted ${want}`);
    assert.equal(typeof o.userData.update, 'function', m.id);
    assert.equal(typeof o.userData.setColor, 'function', m.id);
    assert.doesNotThrow(() => { o.userData.update(live(m), { ...ctx, night: true }, 0.016); o.userData.update(live(m), ctx, 0.016); o.userData.update(undefined, undefined, 0); }, m.id);
    assert.doesNotThrow(() => o.userData.setColor('#8a2a2a'), m.id);
  }
});

test('the nose is at +x: head lamps in front, tail lamps behind, and the front wheels are the ones that steer', () => {
  for (const m of models.filter((x) => x.body !== 'tractor' && x.id !== 'hypotenuse')) {
    const o = builderFor(m)({ ...m }, ctx);
    const P = o.userData.parts;
    const cx = (mesh) => { mesh.geometry.computeBoundingBox(); const b = mesh.geometry.boundingBox; return (b.min.x + b.max.x) / 2; };
    if (P.lampF && P.lampR) assert.ok(cx(P.lampF) > cx(P.lampR) + 0.5, `${m.id}: lamps at the right ends`);
    const steer = o.userData.wheels.filter((w) => w.steer);
    assert.ok(steer.length >= 1 && steer.every((w) => w.pivot.position.x > 0 || m.id === 'plumbbob' || m.sig), `${m.id}: steering wheels forward`);
  }
});

test('the wheels roll with the speed, the front ones steer with wheel, the brake lamps and siren answer the live state', () => {
  const m = models.find((x) => x.id === 'cruiser');
  const o = builderFor(m)({ ...m }, ctx);
  const v = { speed: 160, wheel: 0.8, braking: false, chase: { mode: 'chase' }, id: 'c1' };
  o.userData.update(v, { ...ctx, night: true, time: 0.0 }, 0.1);
  const w = o.userData.wheels;
  assert.ok(w[0].mesh.rotation.z < 0, 'turns the way a forward-rolling wheel does');
  assert.ok(w[0].pivot.rotation.y < 0 && w[2].pivot.rotation.y === 0, 'only the front pair steers; right steering turns the nose to +z');
  const tail1 = o.userData.parts.lampR.material;
  o.userData.update({ ...v, braking: true }, { ...ctx, night: true, time: 0.2 }, 0.1);
  assert.notEqual(o.userData.parts.lampR.material, tail1, 'the brake lamp is brighter');
  assert.ok(o.userData.parts.lampR.material.emissiveIntensity > tail1.emissiveIntensity);
  const seen = new Set();
  for (const t of [0.0, 0.2, 0.4, 0.9]) { o.userData.update({ ...v, braking: false }, { ...ctx, time: t + 1 }, 0.1); seen.add(o.userData.parts.barR.material); }
  assert.ok(seen.size >= 2, 'the siren bar flashes');
  // headlights: off for a parked car at night, on for the driven one
  const pipit = builderFor({ ...models[0] })({ ...models[0] }, ctx);
  pipit.userData.update({ id: 'p1', speed: 0 }, { night: true, game: { player: { driving: null } } }, 0.1);
  const off = pipit.userData.parts.lampF.material.emissiveIntensity;
  pipit.userData.update({ id: 'p1', speed: 0 }, { night: true, game: { player: { driving: 'p1' } } }, 0.1);
  assert.ok(pipit.userData.parts.lampF.material.emissiveIntensity > off + 1, 'the driven car has its lamps on at night');
});

test('a car is a handful of draw calls: at most 12 meshes, geometry shared between cars of a model', () => {
  let worst = 0;
  for (const m of models) {
    const a = builderFor(m)({ ...m }, ctx); const b = builderFor(m)({ ...m }, ctx);
    let meshes = 0; a.traverse((x) => { if (x.isMesh) meshes++; });
    worst = Math.max(worst, meshes);
    assert.ok(meshes <= (m.sig ? 22 : 14), `${m.id}: ${meshes} meshes`);
    const ga = []; a.traverse((x) => { if (x.isMesh) ga.push(x.geometry); });
    const gb = []; b.traverse((x) => { if (x.isMesh) gb.push(x.geometry); });
    assert.deepEqual(ga.map((g) => g.uuid), gb.map((g) => g.uuid), `${m.id}: the geometry is shared`);
  }
  const ordinary = models.filter((m) => !m.sig).map((m) => { let n = 0; builderFor(m)({ ...m }, ctx).traverse((x) => { if (x.isMesh) n++; }); return n; });
  assert.ok(Math.max(...ordinary) <= 12, `ordinary cars: ${ordinary.join(',')}`);
});

test('each body type is its own model: the proportions differ (height, glass house, length)', () => {
  const heights = new Map();
  for (const body of ['hatch', 'estate', 'saloon', 'gt', 'coupe', 'limo', 'pickup']) {
    const m = models.find((x) => x.body === body);
    const bb = box(builderFor(m)({ ...m }, ctx));
    heights.set(body, bb.getSize(new THREE.Vector3()).y);
  }
  assert.ok(heights.get('coupe') < heights.get('saloon') && heights.get('gt') < heights.get('saloon'), 'sports cars are lower');
  assert.ok(heights.get('pickup') > heights.get('saloon'), 'a pickup is taller');
  assert.equal(new Set(Object.values(TYPES).map((t) => t.lay.join())).size >= 6, true, 'the cabin layouts differ');
});

test('the geometry kit faces its triangles outward (boxes, prisms, plans, cylinders, lofts)', () => {
  const out = (fn, centre) => {
    const G = new Geo(); fn(G); const b = G.b.get('a'); let bad = 0;
    for (let i = 0; i < b.pos.length; i += 9) {
      const c = [0, 1, 2].map((k) => (b.pos[i + k] + b.pos[i + 3 + k] + b.pos[i + 6 + k]) / 3);
      if (b.nor[i] * (c[0] - centre[0]) + b.nor[i + 1] * (c[1] - centre[1]) + b.nor[i + 2] * (c[2] - centre[2]) <= 0) bad++;
    }
    return bad;
  };
  assert.equal(out((G) => G.box('a', -1, 1, 0, 2, -1, 1), [0, 1, 0]), 0);
  assert.equal(out((G) => G.prism('a', [[-1, 0], [1, 0], [1, 1], [0.2, 2], [-1, 1]], -1, 1), [0, 0.9, 0]), 0);
  assert.equal(out((G) => G.plan('a', [[-1, -1], [1, -1], [1, 1], [-1, 1]], 0, 2), [0, 1, 0]), 0);
  for (const [ax, c] of [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]]) assert.equal(out((G) => G.cyl('a', ax, 0, 0, 0, 1, 2, '#fff'), c), 0, `cylinder along ${ax}`);
  assert.equal(out((G) => G.tbox('a', 0, 1, 0, 2, 2, 2, '#fff', 0.3, 0.4, 0.5), [0, 1, 0]), 0);
});

test('every aircraft look in the aerospace catalogue builds: right length and span, on the ground, centred, a livery honoured', () => {
  const P = CONTENT.aerospace.products;
  const kinds = new Set();
  for (const [id, p] of Object.entries(P)) {
    if (p.line !== 'aircraft') continue;
    kinds.add(p.look.kind);
    for (const liv of [null, 'military', 'stealth']) {
      const o = buildAircraft(p.look, liv);
      const bb = box(o); const s = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
      assert.ok(Math.abs(s.x - p.look.len) / p.look.len < 0.22, `${id}: length ${s.x.toFixed(2)} vs ${p.look.len}`);
      assert.ok(Math.abs(s.z - p.look.span) / p.look.span < 0.2, `${id}: span ${s.z.toFixed(2)} vs ${p.look.span}`);
      assert.ok(bb.min.y > -0.001 && bb.min.y < 0.05, `${id}: min y ${bb.min.y.toFixed(3)}`);
      assert.ok(Math.abs(c.x) < Math.max(0.5, p.look.len * 0.08) && Math.abs(c.z) < 0.3, `${id}: centred (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`);
      assert.doesNotThrow(() => { o.userData.update({ alt: 3, v: 10, gear: false, state: 'airborne' }, { night: true }, 0.05); o.userData.update({ alt: 0, v: 0, gear: true, state: 'parked' }, ctx, 0.05); }, id);
    }
  }
  for (const k of Object.keys(KINDS)) assert.ok(kinds.has(k), `a product uses the ${k} look`);
});

const airLooks = () => Object.entries(CONTENT.aerospace.products).filter(([, p]) => p.line === 'aircraft').map(([id, p]) => ({ id, look: p.look }));
const meshTris = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh) n += m.geometry.attributes.position.count / 3; }); return n; };
const partBox = (o, keep) => { o.updateMatrixWorld(true); const b = new THREE.Box3(); const t = new THREE.Box3(); o.traverse((m) => { if (m.isMesh && keep(m)) { t.copy(m.geometry.boundingBox || (m.geometry.computeBoundingBox(), m.geometry.boundingBox)).applyMatrix4(m.matrixWorld); b.union(t); } }); return b; };

test('the 18 aircraft are 18 different aircraft: each has its own triangle count and its own proportions, none is a slab, and none repeats another', () => {
  const sigs = new Map();
  for (const { id, look } of airLooks()) {
    const o = buildAircraft(look, null); const bb = box(o); const s = bb.getSize(new THREE.Vector3());
    const tris = meshTris(o);
    assert.ok(tris >= 480 && tris < 3200, `${id}: ${tris} triangles is a built aircraft, not a box and not a monster`);
    assert.ok(s.y > 0.7, `${id}: stands ${s.y.toFixed(2)} tall (a slab is under 0.7)`);
    const sig = `${Math.round(tris / 4)}|${(s.y / look.len).toFixed(2)}|${(s.z / s.x).toFixed(2)}`;
    assert.ok(!sigs.has(sig), `${id} repeats ${sigs.get(sig)}`);
    sigs.set(sig, id);
  }
  assert.equal(sigs.size, 18);
  // every look is a different shape from every other at the same size: compare the plan outlines (a coarse occupancy grid of the model seen from above)
  const grids = (look) => {
    const o = buildAircraft(look, null); o.updateMatrixWorld(true);
    const top = new Set(); const side = new Set(); const v = new THREE.Vector3();
    o.traverse((m) => { if (!m.isMesh || !m.visible || (m.parent && m.parent.visible === false)) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); top.add(`${Math.round((v.x / look.len) * 12)},${Math.round((v.z / look.span) * 12)}`); side.add(`${Math.round((v.x / look.len) * 12)},${Math.round((v.y / look.len) * 24)}`); } });
    return { top, side };
  };
  const iouOf = (a, b) => { let both = 0; for (const k of a) if (b.has(k)) both++; return both / (a.size + b.size - both); };
  const plans = airLooks().map(({ id, look }) => ({ id, ...grids(look) }));
  for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) {
    const t = iouOf(plans[i].top, plans[j].top); const sd = iouOf(plans[i].side, plans[j].side);
    assert.ok(!(t > 0.9 && sd > 0.9), `${plans[i].id} and ${plans[j].id} look the same from above (${t.toFixed(2)}) and from the side (${sd.toFixed(2)})`);
  }
});

test('aircraft sit on their gear: the wheels touch the ground, the body is above it, and the gear reaches up to the body', () => {
  for (const { id, look } of airLooks()) {
    const o = buildAircraft(look, null);
    const gear = o.userData.subs.gear;
    assert.ok(gear, `${id}: has a gear part`);
    const gb = partBox(gear, () => true);
    assert.ok(gb.min.y > -0.001 && gb.min.y < 0.03, `${id}: wheels at ${gb.min.y.toFixed(3)}`);
    const bodyOnly = partBox(o, (m) => !Object.values(o.userData.subs).some((sg) => { for (let q = m; q; q = q.parent) if (q === sg) return true; return false; }));
    assert.ok(bodyOnly.min.y > 0.08, `${id}: the body (${bodyOnly.min.y.toFixed(2)}) clears the ground`);
    assert.ok(gb.max.y >= bodyOnly.min.y - 0.02 || gb.max.y > 0.3, `${id}: the gear reaches the body`);
    assert.ok(bodyOnly.min.y < 1.2, `${id}: and is not on stilts`);
  }
});

test('the hooks machines3d drives: gear up in the air, lights by night, propellers turn about their own hubs, pitch in a climb, burner when moving', () => {
  const P = Object.fromEntries(airLooks().map((a) => [a.look.kind, a.look]));
  const PROPS = { highwing: 1, twinprop: 2, turboprop_liner: 2 };
  for (const [kind, look] of Object.entries(P)) {
    const o = buildAircraft(look, null);
    const u = o.userData;
    const n = [0, 1, 2, 3].filter((i) => u.subs[`prop${i}`] && partBox(u.subs[`prop${i}`], () => true).max.y > partBox(u.subs[`prop${i}`], () => true).min.y).length;
    assert.equal(n, PROPS[kind] || 0, `${kind}: ${n} propellers`);
    u.update({ v: 0, alt: 0, gear: true, state: 'parked' }, { night: false }, 0.05);
    assert.equal(u.subs.gear.visible, true, `${kind}: gear down on the ground`);
    assert.equal(u.subs.nav.visible, false, `${kind}: no lights by day`);
    u.update({ v: 30, alt: 3, gear: false, state: 'airborne' }, { night: true }, 0.05);
    assert.equal(u.subs.gear.visible, false, `${kind}: gear up in the air`);
    assert.equal(u.subs.nav.visible, true, `${kind}: lights by night`);
    for (let i = 0; i < 40; i++) u.update({ v: 30, alt: 3, gear: false, state: 'airborne' }, { night: true }, 0.05);
    assert.ok(o.rotation.z > 0.03, `${kind}: nose up in the climb (${o.rotation.z.toFixed(3)})`);
    if (u.subs.burn) assert.equal(u.subs.burn.visible, true, `${kind}: burner when flying`);
    u.update({ v: 0, alt: 0, gear: true, state: 'parked' }, { night: false }, 5);
    if (u.subs.burn) assert.equal(u.subs.burn.visible, false, `${kind}: no flame at rest`);
    if (PROPS[kind]) {
      const p0 = u.subs.prop0; const r0 = p0.rotation.x;
      u.update({ v: 10, alt: 0, gear: true, state: 'takeoff' }, { night: false }, 0.05);
      assert.notEqual(p0.rotation.x, r0, `${kind}: the propeller turns once it moves`);
      const hub = partBox(p0, () => true).getCenter(new THREE.Vector3());
      assert.ok(Math.abs(hub.y - p0.position.y) < 0.12 && Math.abs(hub.z - p0.position.z) < 0.12, `${kind}: the blades turn about their own hub (${hub.y.toFixed(2)}, ${hub.z.toFixed(2)}) vs (${p0.position.y.toFixed(2)}, ${p0.position.z.toFixed(2)})`);
      if (PROPS[kind] === 2) assert.ok(Math.abs(p0.position.z) > 0.3, `${kind}: wing propellers are out on the wings`);
    }
  }
});

test('an aircraft part-built shows less than the finished one (shorter, fewer wings, no engines, unpainted) and still stands on the ground', () => {
  const look = CONTENT.aerospace.products.ap_tern.look;
  const done = meshTris(buildAircraft(look, null));
  const stages = [{ fuselage: 0.4, wings: 0, engines: false, painted: false }, { fuselage: 1, wings: 0.5, engines: false, painted: false }, { fuselage: 1, wings: 1, engines: true, painted: false }];
  let last = 0;
  for (const st of stages) {
    const o = buildAircraft(look, null, st);
    const t = meshTris(o);
    assert.ok(t <= done && (t < done || st.engines) && t >= last * 0.6, `stage ${JSON.stringify(st)}: ${t} vs finished ${done}`);
    last = t;
    assert.ok(box(o).min.y > -0.001 && box(o).min.y < 0.05);
  }
  const sz = (st) => box(buildAircraft(look, null, st)).getSize(new THREE.Vector3());
  assert.ok(sz(stages[0]).x < sz(stages[1]).x * 0.7, 'the half-built fuselage is short');
  assert.ok(sz(stages[0]).z < sz(stages[2]).z * 0.5, 'and has no wings');
});

test('the aerospace props that show aircraft, rockets and satellites stand over their own footprint tiles, centred, in every state', async () => {
  const { BUILDERS } = await import('../src/engine3d/props/aerospace.js');
  const g = newGame(47);
  const P = CONTENT.aerospace.products;
  const rockets = Object.values(P).filter((p) => p.line === 'rocket' || p.line === 'missile').map((p) => p.look);
  const fakeCtx = (v) => ({ game: { aero: { propView: () => v } }, night: false, time: 0 });
  const seen = (o) => partBox(o, (m) => { for (let q = m; q; q = q.parent) if (q.visible === false) return false; return true; });
  const cases = [];
  for (const { id, look } of airLooks()) for (const b of [null, { fuselage: 0.5, wings: 0.4, engines: false, painted: false }, { fuselage: 1, wings: 1, engines: true, painted: false }]) cases.push({ type: 'bay_slot', w: 10, h: 8, v: { look, kind: 'aircraft', livery: look.kind.includes('fighter') ? 'military' : null, build: b, key: `${id}|${b ? 1 : 0}` }, id });
  for (const r of rockets) cases.push({ type: 'bay_slot', w: 12, h: 6, v: { look: r, kind: 'rocket', stages: 1, key: 'r' }, id: 'rocket' }, { type: 'bay_slot', w: 5, h: 10, v: { look: r, kind: 'stack', stagesTotal: 3, stageIndex: 2, key: 's' }, id: 'stack' }, { type: 'launch_pad', w: 10, h: 10, v: { rocket: r, stages: 0.4, key: 'p' }, id: 'pad' });
  cases.push({ type: 'bay_slot', w: 4, h: 5, v: { look: { mass: 300, role: 'x' }, kind: 'satellite', panels: true, key: 'sat' }, id: 'satellite' });
  for (const c of cases) {
    const o = BUILDERS[c.type]({ x: 0, y: 0, w: c.w, h: c.h, type: c.type, aero: {} }, fakeCtx(c.v));
    const b = seen(o);
    assert.ok(Number.isFinite(b.min.x + b.max.z), `${c.id}: finite`);
    assert.ok(b.min.x >= -0.001 && b.max.x <= c.w + 0.001 && b.min.z >= -0.001 && b.max.z <= c.h + 0.001, `${c.id} in ${c.type} ${c.w}x${c.h}: x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
  }
  // the standing aircraft: any size and any heading, centred over the record's own tiles
  for (const { id, look } of airLooks()) for (const heading of [0, Math.PI / 2, Math.PI]) for (const [w, h] of [[look.span + 1, look.len + 1], [Math.ceil(look.len) + 1, Math.ceil(look.span) + 1]]) {
    const o = BUILDERS.aircraft({ x: 0, y: 0, w, h, type: 'aircraft', heading }, fakeCtx({ look, livery: null, heading, key: id }));
    const b = seen(o);
    assert.ok(b.min.x >= -0.001 && b.max.x <= w + 0.001 && b.min.z >= -0.001 && b.max.z <= h + 0.001, `${id} heading ${heading.toFixed(1)} on ${w}x${h}: x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
    assert.ok(Math.abs((b.min.x + b.max.x) / 2 - w / 2) < 0.1 && Math.abs((b.min.z + b.max.z) / 2 - h / 2) < 0.1, `${id}: centred`);
  }
  void g;
});

test('every rocket look builds standing on the ground, as tall as it says, with its stages as parts', () => {
  const P = CONTENT.aerospace.products;
  for (const [id, p] of Object.entries(P)) {
    if (p.line !== 'rocket') continue;
    const o = buildRocket(p.look);
    const bb = box(o); const s = bb.getSize(new THREE.Vector3());
    assert.ok(Math.abs(bb.min.y) < 0.2, `${id}: stands on the pad`);
    assert.ok(Math.abs(s.y - p.look.h) / p.look.h < 0.12, `${id}: height ${s.y.toFixed(2)} vs ${p.look.h}`);
    assert.ok(o.userData.subs.lower && o.userData.subs.upper, `${id}: two stages`);
    if (p.look.boosters) assert.ok(s.x > 1.0, `${id}: boosters stand out`);
  }
});

test('every war machine sprite spec builds in its real size: ground vehicles, hover vehicles and helicopters, standing on the ground', () => {
  let n = 0;
  for (const [id, sp] of Object.entries(SPEC)) {
    const o = sp.rotor !== undefined ? buildHelicopter(id) : buildWarVehicle(id);
    assert.ok(o, id); n++;
    const bb = box(o); const s = bb.getSize(new THREE.Vector3()); const c = bb.getCenter(new THREE.Vector3());
    if (sp.rotor === undefined) {
      const L = sp.L / TILE;
      assert.ok(Math.abs(s.x - L) / L < 0.25, `${id}: length ${s.x.toFixed(2)} vs ${L.toFixed(2)}`);
      assert.ok(bb.min.y > -0.001 && bb.min.y < 0.1, `${id}: min y ${bb.min.y.toFixed(2)}`);
      assert.ok(Math.abs(c.x) < 0.25 && Math.abs(c.z) < 0.2, `${id}: centred`);
    } else {
      const L = (sp.L + sp.tailL) / TILE;
      assert.ok(s.x > L * 0.7, `${id}: helicopter ${s.x.toFixed(2)} vs ${L.toFixed(2)}`);
      assert.ok(bb.min.y > -0.001 && bb.min.y < 0.1, `${id}: skids on the ground`);
    }
    assert.doesNotThrow(() => { o.userData.update({ speed: 50, wheel: 0.3, running: true }, ctx, 0.05); o.userData.update({}, ctx, 0.05); }, id);
  }
  assert.ok(n >= 30, `${n} specs`);
});

// ------------------------------------------------------------------------------------------------ the machines module
function fakeWorld(maps) {
  const scenes = new Map();
  for (const id of maps) { const g = new THREE.Group(); const dyn = new THREE.Group(); g.add(dyn); scenes.set(id, { id, group: g, dynGroup: dyn, map: { id } }); }
  return { mapScenes: scenes, nearView: () => true, cands: [], host: { time: 1 }, deadline: 0 };
}
const objs = (w, id) => w.mapScenes.get(id).dynGroup.children.length;

test('machines3d: aircraft on the field are placed at the mover state (heading, height), updated, and freed when they leave', () => {
  const g = newGame(41);
  const A = g.aero;
  const id = A.registerAircraft(A.meridian, { id: 'U-t1', product: 'ap_swift', contract: null, config: {} });
  A.state.aircraft[id].owner = 'cu_skyward';
  const w = fakeWorld(['starling_flats']);
  syncMachines(w, g, { night: false }, 0.016);
  const ms = w.mapScenes.get('starling_flats');
  const m = A.movers().find((x) => x.id === id);
  assert.ok(m);
  const obj = ms.dynGroup.children.find((c) => c.userData.look);
  assert.ok(obj, 'the aircraft is in the scene');
  assert.ok(Math.abs(obj.position.x - m.x) < 1e-6 && Math.abs(obj.position.z - m.y) < 1e-6 && obj.position.y === 0, 'at its stand');
  assert.ok(Math.abs(obj.rotation.y - (Math.PI / 2 - m.a)) < 1e-6, 'nose along the heading (0 = north)');
  // in the air it has height; the object is the same one
  const ac = A.state.aircraft[id];
  const real = A.movers;
  A.movers = () => [{ ...m, alt: 6, state: 'airborne', gear: false, a: 1.0, x: m.x + 5 }];
  syncMachines(w, g, { night: true }, 0.016);
  assert.equal(obj.position.y, 6, 'real height');
  assert.ok(Math.abs(obj.rotation.y - (Math.PI / 2 - 1.0)) < 1e-6);
  A.movers = () => [];
  for (let i = 0; i < 400; i++) syncMachines(w, g, {}, 0.016);
  assert.equal(objs(w, 'starling_flats'), 0, 'freed after a while out of the picture');
  A.movers = real; void ac;
  disposeMachines(w);
});

test('machines3d: a launch shows the rocket on the pad, lifts it by the phase height, drops the first stage at separation, and shows a lost vehicle as fire', async () => {
  const g = newGame(42);
  const A = g.aero;
  const { startSequence } = await import('../src/aero/launch.js');
  const L = CONTENT.aerospace.flight.launch;
  const co = A.meridian;
  const look = CONTENT.aerospace.products.rk_colossus.look;
  const setSeq = (dLift, success = true) => { const s = startSequence(L, { id: 'U9' }, A.now, success, 10); s.lift = A.now + dLift; s.end = success ? s.lift + L.ascentMin : s.lift + (s.failT || 2) + L.aftermath; co.pad.seq = { ...s, look, unit: 'U9', company: 'meridian' }; };
  const w = fakeWorld(['starling_flats']);
  const ms = w.mapScenes.get('starling_flats');
  const find = () => ms.dynGroup.children.filter((c) => c.visible && c.userData.subs && c.userData.subs.lower);
  setSeq(10);
  syncMachines(w, g, {}, 0.016);
  let rk = find();
  assert.equal(rk.length, 1, 'a rocket on the pad');
  const base = A.launches()[0].base;
  assert.ok(Math.abs(rk[0].position.x - base.x) < 1e-6 && Math.abs(rk[0].position.z - base.y) < 1e-6 && rk[0].position.y === 0, 'at the foot of the pad');
  setSeq(-3);
  syncMachines(w, g, {}, 0.016);
  rk = find();
  assert.ok(rk[0].position.y > 1 && Math.abs(rk[0].position.y - A.launches()[0].ph.h) < 1e-6, 'lifted by the phase height');
  assert.ok(rk[0].userData.subs.lower.visible, 'before separation the whole stack climbs');
  setSeq(-6.5);
  syncMachines(w, g, {}, 0.016);
  rk = find();
  assert.equal(rk.length, 2, 'the spent first stage is its own object');
  assert.ok(rk.some((r) => !r.userData.subs.lower.visible), 'the climbing stack has let go of its first stage');
  assert.ok(ms.dynGroup.children.some((c) => c.isInstancedMesh && c.count > 0), 'smoke');
  setSeq(-2.5, false);
  syncMachines(w, g, {}, 0.016);
  assert.equal(find().length, 0, 'a lost vehicle is gone from the sky');
  assert.ok(w.cands.length > 0, 'and the fire lights the night');
  disposeMachines(w);
  assert.equal(ms.dynGroup.children.length, 0, 'disposal leaves nothing behind');
});

test('machines3d: the company\'s parked machines stand where the 2D art puts them, one per stand, same ids and order', () => {
  const g = newGame(43);
  const list = [['vehicle', 'anvil'], ['vehicle', 'wolf'], ['vehicle', 'aegis'], ['helicopter', 'wren'], ['helicopter', 'viper'], ['aircraft', 'af_falcon'], ['vehicle', 'ambulance']];
  g.war.equipment = () => list.map(([kind, type], i) => ({ id: `e${i}`, kind, type, status: 'stored' }));
  const mine = parkedList(g); const theirs = parkedMachines(g);
  assert.deepEqual(mine.map((m) => [m.id, m.x, m.y]), theirs.map((m) => [m.id, m.x, m.y]));
  const w = fakeWorld(['hollowmoor_lot']);
  syncMachines(w, g, { night: false }, 0.016);
  const ms = w.mapScenes.get('hollowmoor_lot');
  assert.equal(ms.dynGroup.children.length, mine.length, 'one object each');
  for (const p of mine) {
    const o = ms.dynGroup.children.find((c) => Math.abs(c.position.x - p.x) < 1e-6 && Math.abs(c.position.z - p.y) < 1e-6);
    assert.ok(o, `${p.id} at its stand`);
  }
  assert.ok(PARK.ground.length >= 10);
  g.war.equipment = () => list.slice(0, 2).map(([kind, type], i) => ({ id: `e${i}`, kind, type, status: i ? 'deployed' : 'stored' }));
  for (let i = 0; i < 400; i++) syncMachines(w, g, {}, 0.016);
  assert.equal(ms.dynGroup.children.length, 1, 'a machine sent off is taken out of the yard');
  disposeMachines(w);
});

test('machines3d never throws when a map is not shown or the game has no aerospace state', () => {
  const g = newGame(44);
  const w = fakeWorld(['halvermouth']);
  assert.doesNotThrow(() => syncMachines(w, g, undefined, 0.016));
  disposeMachines(w);
});
