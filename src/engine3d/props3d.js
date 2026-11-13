// Prop builders for the 3D renderer (phase 3D-2): a blocky low-poly model for every prop type in src/content/props.js.
// This file is the index: each module in props/ exports a table of builders, registered here.
//
// The contract (registry3d.js): registerProp(type, (p, ctx) => THREE.Object3D). The object's origin is the footprint's
// north-west corner at ground level, in tile units, +x east, +z south, +y up; world3d places it at (p.x, 0, p.y).
// ctx = { THREE, lib, map, game, night, state, time }. Optional userData: update(p, ctx, dt), lights[], key.
// Nothing here touches the DOM at import time; textures (signs) are made lazily inside a builder and skipped when
// `ctx.headless` is set or there is no `document`.
import { registerProp } from './registry3d.js';
import { BUILDERS as street } from './props/street.js';
import { BUILDERS as nature } from './props/nature.js';
import { BUILDERS as furniture } from './props/furniture.js';
import { BUILDERS as industrial } from './props/industrial.js';
import { BUILDERS as farm } from './props/farm.js';
import { BUILDERS as port } from './props/port.js';
import { BUILDERS as aerospace } from './props/aerospace.js';
import { BUILDERS as casino } from './props/casino.js';

export const GROUPS = { street, nature, furniture, industrial, farm, port, aerospace, casino };
for (const table of Object.values(GROUPS)) for (const [type, build] of Object.entries(table)) registerProp(type, build);
