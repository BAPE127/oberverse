// The 3D camera (docs/RENDERING.md 7.2): pure maths, DOM-free, so a test can check it in Node.
//
// The 2D renderer's mapping is  screen = ((wx - wy - cam.x) * zoom, ((wx + wy) / 2 - z - cam.y) * zoom)  in device pixels,
// with the world in px (32 to a tile). In tile units (X = wx/32, Y = z/32, Z = wy/32) that is
//     sx = 32 zoom (X - Z)          sy = 16 zoom (X + Z) - 32 zoom Y        (up to the camera offset)
// A point and the point (t, t, t) further along project to the same pixel, so the view direction is (1, 1, 1): an
// orthographic camera on the true-isometric axis (elevation 35.26 degrees, azimuth 45 degrees, looking north-west),
// whose vertical axis is then squeezed to 0.866 so ground tiles are the game's 2:1 diamonds. An OrthographicCamera
// frustum with unequal half-width and half-height does exactly that. Verified by tests/engine3d.test.mjs.
import { unproject } from '../engine/iso.js';

export const TILE = 32;
const D = 200; // how far the camera stands from the point it looks at (orthographic: only the depth range matters)

/**
 * The camera for a view. `cam` is the renderer's { x, y, zoom } (iso px, device px per iso px); W and H the canvas in
 * device px; `shake` the world shake in iso px (the picture slides by +shake, so the camera is at cam - shake).
 * Returns the frustum and the look-at line, in tile units.
 */
export function cameraFrame(cam, W, H, shake = null) {
  const zoom = cam.zoom;
  const ix = cam.x - (shake ? shake.x : 0) + W / (2 * zoom);
  const iy = cam.y - (shake ? shake.y : 0) + H / (2 * zoom);
  const g = unproject(ix, iy, 0);
  const target = [g.x / TILE, 0, g.y / TILE];
  const k = 1 / Math.sqrt(3);
  const sx = TILE * Math.SQRT2 * zoom; // device px per view unit across
  const sy = 16 * Math.sqrt(6) * zoom; // and up
  const hw = W / 2 / sx;
  const hh = H / 2 / sy;
  return { target, position: [target[0] + k * D, k * D, target[2] + k * D], left: -hw, right: hw, top: hh, bottom: -hh, near: 1, far: 2 * D + 120 };
}

/** Point a three.js OrthographicCamera by a `cameraFrame`. */
export function applyFrame(camera, f) {
  camera.left = f.left; camera.right = f.right; camera.top = f.top; camera.bottom = f.bottom;
  camera.near = f.near; camera.far = f.far;
  camera.up.set(0, 1, 0);
  camera.position.set(f.position[0], f.position[1], f.position[2]);
  camera.lookAt(f.target[0], f.target[1], f.target[2]);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** World px (map-local plus layer offset) and height px to the three.js point (tile units). */
export const toTile = (wx, wy, z = 0) => [wx / TILE, z / TILE, wy / TILE];
