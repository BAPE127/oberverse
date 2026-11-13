// The registries of 3D builders (docs/RENDERING.md 7). Other files fill them; world3d.js reads them.
// This API is fixed: other agents code against it.
//
//   registerProp(type, build)        build(p, ctx)     -> THREE.Object3D
//   registerVehicle(key, build)      build(model, ctx) -> THREE.Object3D
//
// Prop builder. `p` is the map's prop record (type, x, y, w, h, ...). Return an Object3D whose ORIGIN is the
// footprint's north-west corner at ground level, in tile units (+x east, +z south, +y up); world3d places it at
// (p.x, 0, p.y) inside the map's group. `ctx = { THREE, lib, map, game, night, state, time }`, `lib` being lib3d.js,
// `state` the prop's live state (game.world.props[p.id]). Optional on the returned object:
//   userData.update = (p, ctx, dt) => {}   called each frame for animated props
//   userData.lights = [{ x, y, z, color, intensity, distance }]   candidates for the light pool (x, z in the prop's
//                                          own frame, as the object's; y up)
//   userData.key = 'string'                the manager rebuilds the prop when the key changes: it is read after update() each
//                                          frame, so update() may set a new key when the prop's state changes
//
// Vehicle builder. `model` is the record from content.vehicles.models (or { body, len, wid, colors } for transit
// and special vehicles; `model.id` is the key of the model when it has one). Return an Object3D centred on the
// vehicle's centre at ground level, tile units, +x = forward. world3d turns it by rotation.y = -angle (the
// simulation's angle, radians, x east and y south, is the direction of travel). Optional on the returned object:
//   userData.update = (v, ctx, dt) => {}   v is the live car/bus object (angle, wheel, speed, braking, color, chase...)
//   userData.setColor = (hex) => {}        when the body colour is not baked in
// A vehicle is looked up by VEHICLES.get(model.id) then VEHICLES.get(model.body).
export const PROPS = new Map(); // type -> build
export const VEHICLES = new Map(); // body or model id -> build

export function registerProp(type, build) {
  if (typeof type !== 'string' || typeof build !== 'function') throw new TypeError('registerProp(type: string, build: function)');
  PROPS.set(type, build);
}

export function registerVehicle(key, build) {
  if (typeof key !== 'string' || typeof build !== 'function') throw new TypeError('registerVehicle(key: string, build: function)');
  VEHICLES.set(key, build);
}
