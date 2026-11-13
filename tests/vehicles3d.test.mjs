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
  const kinds = new Set(CONTENT.transit.traffic.loops?.map?.((l) => l.model) || []);
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
  const red = o.userData.parts.barR.material;
  o.userData.update({ ...v, braking: false }, { ...ctx, night: false, time: 0.4 }, 0.1);
  o.userData.update({ ...v, braking: false }, { ...ctx, night: false, time: 0.9 }, 0.1);
  assert.notEqual(o.userData.parts.barR.material, red, 'the siren bar flashes');
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
  const find = (cls) => ms.dynGroup.children.filter((c) => c.userData.subs && c.userData.subs.lower);
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
