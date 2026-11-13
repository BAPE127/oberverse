// Vehicle builders for the 3D renderer: cars, buses, signature cars, tractors, aircraft, ships, tanks, helicopters, the
// rocket: filled by the vehicles agent (phase 3D-3). It registers nothing yet; world3d.js shows a simple two-box car in the
// model's colour (fallbacks3d.js) for an unregistered body.
//
// The contract (registry3d.js): registerVehicle(key, (model, ctx) => THREE.Object3D), key a model id or a body type. The
// object is centred on the vehicle's centre at ground level, tile units, +x = forward; world3d turns it by
// rotation.y = -angle. Optional userData: update(v, ctx, dt), setColor(hex).
// Do not put builders anywhere but here (and files this one imports).
import { registerVehicle } from './registry3d.js';

void registerVehicle; // (nothing registered yet)
