// Prop builders for the 3D renderer: one file for the 159 prop types, filled by the props agent (phase 3D-2).
// It registers nothing yet; world3d.js shows a plain box of the footprint (fallbacks3d.js) for an unregistered type.
//
// The contract (registry3d.js): registerProp(type, (p, ctx) => THREE.Object3D). The object's origin is the footprint's
// north-west corner at ground level, in tile units, +x east, +z south, +y up; world3d places it at (p.x, 0, p.y).
// ctx = { THREE, lib, map, game, night, state, time }. Optional userData: update(p, ctx, dt), lights[], key.
// Do not put builders anywhere but here (and files this one imports).
import { registerProp } from './registry3d.js';

void registerProp; // (nothing registered yet)
