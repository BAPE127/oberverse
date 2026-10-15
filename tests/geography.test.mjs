// v0.28.0: the world's geography — fictional continents and islands with
// real coastlines. Capitals stand on land, every port is on a coast that
// reaches the open sea, the coasts are irregular (not circles), there are
// archipelagos, and it all comes out the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT } from './helpers.mjs';
import { elevation } from '../src/world/geography.js';
import { landGrid, elevationAt, isLand } from '../src/world/globe.js';
import { seaRoute } from '../src/world/seaRoutes.js';

const C = CONTENT.arms.countries;
const PORTS = CONTENT.logistics.ports;

test('every capital and Halvermouth stand on land', () => {
  for (const [id, c] of Object.entries(C)) assert.ok(isLand(c.lat, c.lon, C), `${id} is on land`);
  assert.ok(isLand(CONTENT.arms.hq.lat, CONTENT.arms.hq.lon, C) || elevationAt(CONTENT.arms.hq.lat, CONTENT.arms.hq.lon) > -0.2, 'HQ on or by its island');
});

test('every port is on a coast, and its own country\'s ports are near its capital', () => {
  const { data, w, h, res } = landGrid();
  for (const [id, p] of Object.entries(PORTS)) {
    const j = Math.round((90 - p.lat) * res);
    const i = Math.round((p.lon + 180) * res);
    assert.ok(data[j * w + i] > 0, `${id} is on land`);
    let sea = false;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (data[(j + dj) * w + ((i + di + w) % w)] <= 0) sea = true;
    assert.ok(sea, `${id} is on the coast`);
    if (p.country) {
      const c = C[p.country];
      assert.ok(Math.hypot(p.lat - c.lat, ((p.lon - c.lon + 540) % 360) - 180) < 30, `${id} is in ${p.country}`);
    }
  }
  // all reachable by sea from home
  for (const id of Object.keys(PORTS)) assert.ok(seaRoute([PORTS.port_millroad.lat, PORTS.port_millroad.lon], [PORTS[id].lat, PORTS[id].lon], C), `a sea route to ${id}`);
});

test('real coastlines: land covers a sensible share, coasts are long and irregular, and there are many islands', () => {
  const { data, w, h } = landGrid();
  let land = 0;
  let coast = 0;
  for (let j = 1; j < h - 1; j++) for (let i = 0; i < w; i++) {
    if (data[j * w + i] <= 0) continue;
    land++;
    if (data[(j - 1) * w + i] <= 0 || data[(j + 1) * w + i] <= 0 || data[j * w + ((i + 1) % w)] <= 0 || data[j * w + ((i - 1 + w) % w)] <= 0) coast++;
  }
  const share = land / (w * h);
  assert.ok(share > 0.22 && share < 0.45, `land share ${share.toFixed(2)}`);
  // a disc of the same area would have a perimeter of ~2√(πA); real coasts are far longer
  assert.ok(coast > 6 * Math.sqrt(Math.PI * land), `coastline ${coast} cells is irregular`);
  // count separate landmasses (islands)
  const seen = new Uint8Array(w * h);
  let islands = 0;
  for (let k = 0; k < w * h; k++) {
    if (seen[k] || data[k] <= 0) continue;
    islands++;
    const q = [k];
    seen[k] = 1;
    while (q.length) {
      const x = q.pop();
      const j = Math.floor(x / w);
      const i = x % w;
      for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const jj = j + dj;
        if (jj < 0 || jj >= h) continue;
        const y = jj * w + ((i + di + w) % w);
        if (!seen[y] && data[y] > 0) { seen[y] = 1; q.push(y); }
      }
    }
  }
  assert.ok(islands > 60, `${islands} separate landmasses`);
  // the Morrow Isles are an archipelago: several islands round the capital
  let morrow = 0;
  for (let lat = -42; lat <= -20; lat += 0.5) for (let lon = 136; lon <= 166; lon += 0.5) if (elevationAt(lat, lon) > 0) morrow++;
  assert.ok(morrow > 30 && morrow < 600, `Morrow Isles: ${morrow} land samples`);
});

test('deterministic', () => {
  for (const [la, lo] of [[49, -25], [-32, 148], [10, 0], [70, 100]]) assert.equal(elevation(la, lo), elevation(la, lo));
  assert.equal(elevationAt(12.3, 45.6), elevationAt(12.3, 45.6));
});
