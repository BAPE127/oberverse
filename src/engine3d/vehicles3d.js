// Vehicle builders for the 3D renderer (phase 3D-3): this file only imports the files that register them (registry3d.js).
// The contract (registry3d.js): registerVehicle(key, (model, ctx) => THREE.Object3D), key a model id or a body type. The
// object is centred on the vehicle's centre at ground level, tile units, +x = forward; world3d turns it by
// rotation.y = -angle. Optional userData: update(v, ctx, dt), setColor(hex).
//   vehicles/cars.js      hatch, estate, saloon, police, gt, coupe, limo, pickup
//   vehicles/service.js   bus, tractor (three sizes)
//   vehicles/signature.js the nine signature cars (by model id)
// Large machines that are not content/vehicles models (aircraft, rocket, war vehicles) live in machines3d.js.
import './vehicles/cars.js';
import './vehicles/service.js';
import './vehicles/signature.js';
