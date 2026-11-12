// Canvas renderer: camera, y-sorted world drawing, speech bubbles, interaction
// highlight and day/night lighting. Reads game state; never mutates it.
import { TILE, clamp, lerp, dist } from '../core/util.js';
import { buildGroundChunk, buildGroundOverview, CHUNK } from './drawPixelGround.js';
import { drawPropShadow, SPRITE_PROPS } from './propSprites.js';
import { drawShopFront } from './drawPixelBuildings.js';
import { drawFields } from './drawFarm.js';
import { setPixelProps, drawBuilding, drawProp, drawWaterShimmer, FLAT_PROPS, towerHeight } from './drawWorld.js';
import { drawCar, drawBus, setPixelCars } from './drawVehicles.js';
import { parkedMachines } from './drawParked.js';
import { drawAircraft } from './drawAero.js';
import { drawCrawler, drawBoard, drawPadFx, drawSky, launchLight } from './drawLaunch.js';
import { shakeAt } from '../aero/launch.js';
import { windRunway } from '../aero/flight.js';
import { lookOf, isGunLook } from './drawPixelWeapons.js';
import { drawTrail } from './drawSignatureCars.js';
import { drawCharacter, setPixelPeople, rrect } from './drawCharacter.js';
import { check } from '../sim/conditions.js';
import { isDown } from '../systems/combat.js';
import { drawWrath, wrathCamera, wrathLift, wrathPlayerAlpha } from './wrath.js';
import { inWindow } from '../world/clock.js';
import { project, unproject, sortItems, behindBox, hidesPoint, spriteFacing, facingVector, bodyBox, pointBox } from './iso.js';
import { IsoBuildings, buildingHeight, buildingBox, columnPicture, bakeDiamond } from './isoBuildings.js';

/** v0.55.0: props whose look comes from the aerospace simulation (Aerospace.propView). */
const AERO_VIEW = new Set(['aircraft', 'bay_slot', 'launch_pad', 'hall_site', 'aero_facility']);
import { floatLift, drawFloatShadow, HOST_FX, hostState, runEffects, EFFECTS } from './cardMagic.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const CONFETTI = ['#ff5a8a', '#f2e05a', '#5ad0f2', '#8aff6a', '#c08aff'];
const LIGHT_SCALE = 0.25; // the light map is soft, so it is rendered at quarter resolution and upscaled

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/**
 * v0.51.0: a pool of light, made once per size: its opacity falls off from the middle and is stepped
 * into a few levels with an ordered dither — pixel-art light, crisp, no smooth gradient and no hard
 * rings — and, stamped where the light is, the dither travels with it instead of crawling.
 */
const lightSprites = new Map();
function lightSprite(rad, strength, rgb = '0,0,0', levels = 7) {
  const r = Math.max(2, Math.round(rad));
  const k = Math.round(strength * 20);
  const key = `${r}|${k}|${rgb}|${levels}`;
  let cv = lightSprites.get(key);
  if (cv) return cv;
  const S = r * 2 + 1;
  cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const [cr, cg, cb] = rgb.split(',').map(Number);
  const st = k / 20;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const t = Math.hypot(x - r, y - r) / r;
    if (t >= 1) continue;
    const a = st * (t < 0.55 ? 1 - (t / 0.55) * 0.38 : 0.62 * (1 - (t - 0.55) / 0.45));
    const q = Math.floor(a * levels + BAYER4[((y & 3) << 2) | (x & 3)]) / levels;
    if (q <= 0) continue;
    const i = (y * S + x) * 4;
    d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = Math.min(255, Math.round(q * 255));
  }
  ctx.putImageData(img, 0, 0);
  if (lightSprites.size > 400) lightSprites.clear();
  lightSprites.set(key, cv);
  return cv;
}

const MAX_CHUNKS = 160; // chunks of ground kept (8×8 tiles, a quarter of a megabyte each: about 40 MB)
const MAX_ISO_CHUNKS = 96; // the same ground baked into iso diamonds (half a megabyte each)
const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

export class Renderer {
  constructor(canvas, game, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blit = { x: 0, y: 0 }; // v0.46.0: the sub-pixel slide of the finished picture
    this.game = game;
    this.assets = assets;
    this.cam = { x: 0, y: 0, zoom: 2 };
    this.staticLayers = new WeakMap(); // keyed by GameMap object: rebuilt maps get fresh layers
    // v0.48.0: the ground is built in chunks as you come to them (the grown towns are too big for one canvas each)
    this.groundChunks = new WeakMap(); // GameMap → { v, chunks: Map(key → canvas) }
    this.chunkLRU = new Map(); // canvas → true, oldest first
    this.wantChunks = [];
    this.light = document.createElement('canvas');
    // v0.38.0: the pixel pipeline — the world is drawn into a small canvas (one art pixel = 2 world
    // pixels) and scaled up with no smoothing; text, lighting and overlays go on top at full resolution
    this.pixel = true;
    this.px = 4; // device pixels per art pixel
    this.low = document.createElement('canvas');
    this.lowCtx = this.low.getContext('2d');
    // text drawn by the world (shop signs, plates, labels) mustn't pixelate: the low canvas records it
    // with its transform and style, and it's replayed on the full-resolution canvas after the upscale
    this.worldText = [];
    const lc = this.lowCtx;
    for (const op of ['fillText', 'strokeText']) {
      const orig = lc[op].bind(lc);
      lc[op] = (t, x, y, maxW) => {
        if (!this.capturingText) return orig(t, x, y, maxW);
        this.worldText.push({ op, t, x, y, maxW, m: lc.getTransform(), font: lc.font, fill: lc.fillStyle, stroke: lc.strokeStyle, lw: lc.lineWidth, join: lc.lineJoin, align: lc.textAlign, base: lc.textBaseline, alpha: lc.globalAlpha });
      };
    }
    this.layers = [];
    this.time = 0;
    this.highlight = null;
    // v0.104.0: the isometric view (docs/RENDERING.md). `iso` is the owner's choice (the old top-down pass stays behind
    // `iso = false`); `isoNow` is what this frame is actually drawn with (the Wrath cutscene still uses the old pass)
    this.iso = true;
    this.isoNow = false;
    this.camIso = false;
    this.isoBaked = new WeakMap(); // ground chunk canvas → its iso diamond
    this.isoLRU = new Map();
    this.wallMaps = new WeakMap();
    this.bld = new IsoBuildings();
    this.motion = new WeakMap(); // actor → { x, y, dx, dy, movedAt, face, faceAt }: what the sprite's facing is chosen from
    this.hiddenMaps = new Set(); // interiors under a roof this frame: nothing of theirs is drawn, tagged or lit
    this.occluders = [];
    this.base = { s: 1, ex: 0, ey: 0 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.light.width = Math.ceil(this.canvas.width * LIGHT_SCALE);
    this.light.height = Math.ceil(this.canvas.height * LIGHT_SCALE);
    // v0.47.0: about 24 tiles across (the owner's "medium"), at a whole number of device pixels per world pixel
    const fit = Math.min(window.innerWidth / (24 * TILE), window.innerHeight / (14 * TILE));
    this.baseZoom = clamp(fit, 1, 4) * dpr;
  }

  /** v0.48.0: a small picture of a whole map's ground (the city far below a tower floor). */
  staticLayer(map) {
    let cv = this.staticLayers.get(map);
    if (!cv) {
      cv = buildGroundOverview(map, makeCanvas);
      this.staticLayers.set(map, cv);
    }
    return cv;
  }

  /** One chunk of a map's ground, built the first time it's wanted and kept while it's recently used. */
  groundChunk(map, cx, cy) {
    const v = map.fieldsVersion || 0; // v0.30.0: a map whose fields changed (crops planted, grown, harvested) gets its ground redrawn
    let entry = this.groundChunks.get(map);
    if (!entry || entry.v !== v) {
      if (entry) for (const c of entry.chunks.values()) this.chunkLRU.delete(c);
      entry = { v, chunks: new Map() };
      this.groundChunks.set(map, entry);
    }
    const key = cy * 4096 + cx;
    let c = entry.chunks.get(key);
    if (!c) {
      if (map.groundBeyond === undefined) {
        map.groundBeyond = this.groundBeyond(map);
        const region = Object.values(this.game.content.regions || {}).find((r) => r.maps[map.id]);
        const at = region?.maps[map.id];
        map.groundOrigin = at ? { x: (at.x || 0) * TILE, y: (at.y || 0) * TILE } : null;
      }
      const fields = map.def?.fields ? (ctx) => drawFields(ctx, map.def.fields.map((f) => ({ ...f, ...(map.fieldState?.[f.id] || {}) }))) : null;
      c = buildGroundChunk(map, cx, cy, makeCanvas, fields);
      c.owner = entry;
      c.key = key;
      entry.chunks.set(key, c);
    }
    this.chunkLRU.delete(c);
    this.chunkLRU.set(c, true);
    while (this.chunkLRU.size > MAX_CHUNKS) {
      const old = this.chunkLRU.keys().next().value;
      this.chunkLRU.delete(old);
      old.owner.chunks.delete(old.key);
    }
    return c;
  }

  /** What lies past a street map's edge: its outdoor neighbours' tiles (so a river or a beach runs on across the seam). */
  groundBeyond(map) {
    if (map.kind === 'interior') return null;
    const near = this.game.neighbors(map.id).filter((n) => n.map.kind !== 'interior');
    if (!near.length) return null;
    return (tx, ty) => {
      for (const n of near) {
        const x = tx - Math.round(n.x / TILE);
        const y = ty - Math.round(n.y / TILE);
        if (x >= 0 && y >= 0 && x < n.map.width && y < n.map.height) return n.map.tileAt(x, y);
      }
      return null;
    };
  }

  hasChunk(map, cx, cy) {
    const entry = this.groundChunks.get(map);
    return Boolean(entry && entry.v === (map.fieldsVersion || 0) && entry.chunks.has(cy * 4096 + cx));
  }

  /** Draw the ground of layer map `lm` under view `lv` (map coordinates), offset by (ox, oy). */
  drawGround(ctx, lm, lv, ox, oy) {
    const cs = CHUNK * TILE;
    const cx0 = Math.max(0, Math.floor(lv.x / cs));
    const cy0 = Math.max(0, Math.floor(lv.y / cs));
    const cx1 = Math.min(Math.ceil(lm.width / CHUNK) - 1, Math.floor((lv.x + lv.w) / cs));
    const cy1 = Math.min(Math.ceil(lm.height / CHUNK) - 1, Math.floor((lv.y + lv.h) / cs));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(this.groundChunk(lm, cx, cy), cx * cs + ox, cy * cs + oy);
    // the ring just outside the view is built ahead, a chunk a frame
    this.wantChunks.push({ map: lm, cx0: cx0 - 1, cy0: cy0 - 1, cx1: cx1 + 1, cy1: cy1 + 1 });
  }

  /** Build one chunk the view is about to need (called once a frame, after drawing). */
  prefetchGround() {
    const want = this.wantChunks;
    this.wantChunks = [];
    this.frameNo = (this.frameNo || 0) + 1;
    if (this.frameNo % 2) return; // every other frame: a chunk takes a few milliseconds
    for (const w of want) {
      const mx = Math.ceil(w.map.width / CHUNK) - 1;
      const my = Math.ceil(w.map.height / CHUNK) - 1;
      for (let cy = Math.max(0, w.cy0); cy <= Math.min(my, w.cy1); cy++) for (let cx = Math.max(0, w.cx0); cx <= Math.min(mx, w.cx1); cx++) {
        if (this.hasChunk(w.map, cx, cy)) continue;
        this.groundChunk(w.map, cx, cy);
        return;
      }
    }
  }

  /** v0.41.0: a floor high up is drawn over the city far below (its ground, small and hazy, sliding with the camera). */
  drawCityBelow(ctx, lm, lv) {
    const a = lm.def.aloft;
    const city = this.game.maps.get(a.over);
    if (!city) return;
    const ground = this.staticLayer(city);
    const k = 0.45; // how small the street looks from up here
    const unit = (ground.width / city.width) / TILE; // the ground canvas's pixels per world pixel
    const cx = (lm.width * TILE) / 2;
    const cy = (lm.height * TILE) / 2;
    const camX = lv.x + lv.w / 2;
    const camY = lv.y + lv.h / 2;
    // the tower's own spot in the city sits under the middle of the floor, and drifts with the camera (parallax)
    const ox = cx - (camX - cx) * 0.35 - a.x * TILE * k;
    const oy = cy - (camY - cy) * 0.35 - a.y * TILE * k + TILE * 6;
    ctx.fillStyle = '#6f8aa6';
    ctx.fillRect(lv.x - 64, lv.y - 64, lv.w + 128, lv.h + 128);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(ground, 0, 0, ground.width, ground.height, ox, oy, (ground.width / unit) * k, (ground.height / unit) * k);
    ctx.restore();
    ctx.fillStyle = this.game.clock.minuteOfDay > 20 * 60 || this.game.clock.minuteOfDay < 6 * 60 ? 'rgba(15,20,45,0.5)' : 'rgba(170,200,230,0.3)';
    ctx.fillRect(lv.x - 64, lv.y - 64, lv.w + 128, lv.h + 128);
  }

  /** Factory build mode: the placement ghost (green = fits, red = blocked). */
  drawBuildCursor(ctx, c) {
    const x = c.x * TILE;
    const y = c.y * TILE;
    ctx.fillStyle = c.valid ? (c.remove ? 'rgba(255,170,60,0.25)' : 'rgba(90,224,122,0.25)') : 'rgba(255,74,58,0.22)';
    ctx.fillRect(x, y, c.w * TILE, c.h * TILE);
    ctx.strokeStyle = c.valid ? (c.remove ? '#ffaa3c' : '#5ae07a') : '#ff4a3a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x + 1, y + 1, c.w * TILE - 2, c.h * TILE - 2);
    ctx.setLineDash([]);
    if (c.arrow) {
      const cx = x + TILE / 2;
      const cy = y + TILE / 2;
      const dx = [1, 0, -1, 0][c.dir];
      const dy = [0, 1, 0, -1][c.dir];
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - dx * 9, cy - dy * 9); ctx.lineTo(cx + dx * 9, cy + dy * 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + dx * 10, cy + dy * 10); ctx.lineTo(cx + dx * 3 - dy * 6, cy + dy * 3 + dx * 6); ctx.moveTo(cx + dx * 10, cy + dy * 10); ctx.lineTo(cx + dx * 3 + dy * 6, cy + dy * 3 - dx * 6); ctx.stroke();
    }
  }

  snapCamera() {
    this.cam.snap = true;
  }

  updateCamera(dt) {
    const g = this.game;
    const map = g.currentMap();
    let zoom = this.baseZoom; // v0.47.0: one zoom indoors and out (buildings are walked into, not loaded)
    if (this.pixel) {
      // v0.46.0: fine pixels — one low-res pixel per world pixel (half the old art pixel), and a
      // whole number of device pixels to each, so every pixel is the same size
      this.px = Math.max(1, Math.round(zoom));
      zoom = this.px;
    }
    this.cam.zoom = zoom;
    const vw = this.canvas.width / zoom;
    const vh = this.canvas.height / zoom;
    // Camera bounds cover the current map and any seamless neighbours.
    let minX = 0;
    let minY = 0;
    let maxX = map.width * TILE;
    let maxY = map.height * TILE;
    for (const l of this.layers.slice(1)) {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.map.width * TILE);
      maxY = Math.max(maxY, l.y + l.map.height * TILE);
    }
    const mw = maxX - minX;
    const mh = maxY - minY;
    const iso = this.isoNow;
    let tx = g.player.x - vw / 2;
    let ty = g.player.y - 16 - vh / 2;
    if (iso) {
      // the camera lives in iso space: it follows the chest, and keeps the middle of the view on the map
      const pc = project(g.player.x, g.player.y, 16);
      tx = pc.x - vw / 2;
      ty = pc.y - vh / 2;
      const bx0 = minX - maxY;
      const bx1 = maxX - minY;
      const by0 = (minX + minY) / 2;
      const by1 = (maxX + maxY) / 2;
      if (bx1 - bx0 <= vw && by1 - by0 <= vh) {
        tx = bx0 + (bx1 - bx0 - vw) / 2;
        ty = by0 + (by1 - by0 - vh) / 2;
      } else {
        const c = unproject(tx + vw / 2, ty + vh / 2, 0);
        const cx = clamp(c.x, minX, maxX);
        const cy = clamp(c.y, minY, maxY);
        if (cx !== c.x || cy !== c.y) {
          const q = project(cx, cy);
          tx = q.x - vw / 2;
          ty = q.y - vh / 2;
        }
      }
    } else {
      tx = mw <= vw ? minX + (mw - vw) / 2 : clamp(tx, minX, maxX - vw);
      ty = mh <= vh ? minY + (mh - vh) / 2 : clamp(ty, minY - TILE, maxY - vh);
    }
    const wr = g.combat.wrath;
    if (wr) {
      this.camIso = false;
      const c = wrathCamera(g, wr, vw, vh, zoom);
      this.cam.zoom = c.zoom;
      this.cam.x = c.x;
      this.cam.y = c.y;
      this.view = { x: c.x, y: c.y, w: this.canvas.width / c.zoom, h: this.canvas.height / c.zoom };
      return;
    }
    if (this.cam.snap || this.cam.mapId !== map.id || this.camIso !== iso) {
      this.cam.x = tx;
      this.cam.y = ty;
      this.cam.snap = false;
      this.cam.mapId = map.id;
    } else {
      const k = 1 - Math.exp(-dt * 12); // v0.46.0: a tighter follow (it trailed the player)
      this.cam.x = lerp(this.cam.x, tx, k);
      this.cam.y = lerp(this.cam.y, ty, k);
    }
    this.view = { x: this.cam.x, y: this.cam.y, w: vw, h: vh };
    this.camIso = iso;
  }

  /** Called when the player walks across a seam: keep the view continuous. */
  seamlessShift(fromId, toId) {
    const off = this.game.mapOffset(fromId, toId);
    if (!off) return this.snapCamera();
    const o = this.isoNow ? project(off.x, off.y) : off;
    this.cam.x -= o.x;
    this.cam.y -= o.y;
    this.cam.mapId = toId;
  }

  /**
   * The one mapping from the world to the canvas (device pixels). `z` is height above the ground, in
   * world pixels; in the old top-down view it is a lift on screen, as the callers used to subtract it from y.
   */
  toScreen(wx, wy, z = 0) {
    if (this.isoNow) return { x: (wx - wy - this.cam.x) * this.cam.zoom, y: ((wx + wy) / 2 - z - this.cam.y) * this.cam.zoom };
    return { x: (wx - this.cam.x) * this.cam.zoom, y: (wy - z - this.cam.y) * this.cam.zoom };
  }

  /** The inverse: the world point at height `z` that shows at canvas pixel (sx, sy). */
  toWorld(sx, sy, z = 0) {
    const ix = this.cam.x + sx / this.cam.zoom;
    const iy = this.cam.y + sy / this.cam.zoom;
    if (this.isoNow) return unproject(ix, iy, z);
    return { x: ix, y: iy + z };
  }

  /**
   * v0.47.0: the street and every building's interior are drawn together (buildings are walked
   * into, not loaded): the streets first, then the rooms over their footprints
   */
  computeLayers(map) {
    const g = this.game;
    return [{ map, x: 0, y: 0 }, ...g.neighbors(map.id)].filter((L) => !(L.map.def?.hall && !g.aero.hallBuilt(L.map.def.hall)) && !(L.map.def?.facility && g.war.facilityState(L.map.def.facility) !== 'built')).sort((a, b) => (a.map.kind === 'interior') - (b.map.kind === 'interior')); // v0.57.0: a hall still being built has no room to draw
  }

  render(dt) {
    // the Wrath cutscene was made for the top-down view: while it plays, the frame is drawn the old way
    this.isoNow = Boolean(this.iso && this.pixel && !this.game.combat.wrath);
    if (this.isoNow) return this.renderIso(dt);
    this.time += dt;
    this.prefetchGround(); // (what last frame's view will want next)
    const g = this.game;
    const main = this.ctx;
    const map = g.currentMap();
    this.layers = this.computeLayers(map);
    this.updateCamera(dt);
    const { zoom } = this.cam;
    const v = this.view;
    // v0.38.0: the world pass goes into the low-resolution canvas (the Wrath keeps full resolution)
    const pixel = this.pixel && !g.combat.wrath;
    setPixelProps(this.pixel);
    setPixelPeople(this.pixel);
    setPixelCars(this.pixel);
    if (pixel) {
      const lw = Math.ceil(this.canvas.width / this.px) + 2;
      const lh = Math.ceil(this.canvas.height / this.px) + 2;
      if (this.low.width !== lw || this.low.height !== lh) { this.low.width = lw; this.low.height = lh; }
      this.ctx = this.lowCtx;
      this.worldText.length = 0;
      this.capturingText = true;
    }
    const ctx = this.ctx;
    const s = pixel ? zoom / this.px : zoom; // world → canvas scale

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = map.kind === 'interior' ? '#1b1620' : '#2d6f8f';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // explosions shake the camera
    // v0.44.0: and so do gunshots, hard hits and getting hurt (combat.kick)
    const cs = g.combat.shake;
    const shake = Math.max(g.heavy && g.realTime < g.heavy.shakeUntil ? (g.heavy.shakeUntil - g.realTime) * 14 : 0, cs && g.realTime < cs.until ? cs.mag * 2 : 0, this.launchShake(map));
    const shx = shake ? (Math.random() - 0.5) * shake : 0;
    const shy = shake ? (Math.random() - 0.5) * shake : 0;
    // v0.46.0: the world is drawn on whole pixels (so it doesn't shimmer) and the finished picture
    // slid by the leftover fraction — the camera glides smoothly instead of stepping a pixel at a time
    const ox = (-this.cam.x + shx) * s;
    const oy = (-this.cam.y + shy) * s;
    const ix = Math.floor(ox) + 1;
    const iy = Math.floor(oy) + 1;
    this.blit = pixel ? { x: (ox - ix) * this.px, y: (oy - iy) * this.px } : { x: 0, y: 0 };
    ctx.setTransform(s, 0, 0, s, pixel ? ix : ox, pixel ? iy : oy);
    ctx.imageSmoothingEnabled = true;

    const night = g.clock.darkness > 0.45;
    this.wind = windRunway(g.clock.day) === '09' ? 1 : -1;
    this.dishTrack = g.player.map === 'starling_flats' ? g.aero.groundPass() : null; // v0.59.0: what the ground station's dishes follow // v0.58.0: the windsocks and the runway in use
    const items = [];
    // Draw the current map and its seamless neighbours, each at its offset.
    for (const L of this.layers) {
      const lm = L.map;
      const lv = { x: v.x - L.x, y: v.y - L.y, w: v.w, h: v.h };
      const inView = (x, y, w, h, pad = 64) => x + w > lv.x - pad && x < lv.x + lv.w + pad && y + h > lv.y - pad * 2 && y < lv.y + lv.h + pad;
      const at = (fn) => () => {
        ctx.save();
        ctx.translate(L.x, L.y);
        fn();
        ctx.restore();
      };
      if (lm.def?.aloft?.over) this.drawCityBelow(ctx, lm, lv);
      this.drawGround(ctx, lm, lv, L.x, L.y);
      at(() => {
        if (lm.kind !== 'interior') drawWaterShimmer(ctx, lm, lv, this.time);
        if (lm.id === 'lanternside' && g.getFlag('canal_slick')) this.drawCanalSlick(ctx, lm, lv);
        for (const p of lm.props) {
          if (!FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
          if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE)) continue;
          drawProp(ctx, p, { wind: this.wind, track: this.dishTrack, map: lm, time: this.time, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null, state: g.world.props[p.id], jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime, berth: p.type === 'shipberth' ? g.logistics.docks.at(p.slot) : null, slip: p.type === 'slipway' ? g.logistics.slip() : null });
        }
        // v0.49.0: the props' shadows, on the ground under everyone (they fade as the light goes)
        const shade = 0.34 * (1 - Math.min(1, g.clock.darkness) * 0.75);
        for (const p of lm.props) {
          if (!SPRITE_PROPS.has(p.type) || !this.propVisible(p)) continue;
          if (!inView(p.x * TILE - 32, p.y * TILE - 64, p.w * TILE + 64, p.h * TILE + 96)) continue;
          drawPropShadow(ctx, p, { map: lm, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null }, shade);
        }
        if (g.vehicles?.skids?.length) this.drawSkids(ctx, lm.id);
        if (g.combat.decals.length) this.drawCombatGround(ctx, lm.id); // v0.44.0: blood and spent cases
        if (g.vehicles?.trail?.length) drawTrail(ctx, g.vehicles.trail, lm.id, g.realTime); // v0.34.0: coins, sums, cheese…
        if (lm.id === g.player.map && g.heavy?.decals.length) this.drawScorch(ctx, g.heavy.decals.filter((d) => d.map === lm.id));
      })();
      for (const b of lm.buildings) {
        if (b.facility && g.war.facilityState(b.facility) !== 'built') continue; // v0.98.0: Hollowmoor Lot's sites (the scaffold props stand here)
        if (b.hall && !g.aero.hallBuilt(b.hall)) continue; // v0.57.0: a building site (the hall_site prop) stands here until it's built
        if (b.interior) {
          // v0.47.0: its room is drawn in its place; v0.51.0: its sign and awning over the front
          if ((b.sign || b.awning) && inView(b.x * TILE, (b.y + b.h - 2) * TILE, b.w * TILE, 3 * TILE)) items.push({ y: (b.y + b.h) * TILE + L.y + 1, draw: at(() => drawShopFront(ctx, b, this.time, night)) });
          continue;
        }
        const above = b.tower && !this.pixel ? towerHeight(b) / TILE : 4;
        if (!inView(b.x * TILE, (b.y - above) * TILE, b.w * TILE, (b.h + above) * TILE)) continue;
        const door = lm.doors.find((d) => d.building === b.id);
        items.push({ y: (b.y + b.h) * TILE + L.y, draw: at(() => drawBuilding(ctx, b, { lit: this.buildingLit(b), night, time: this.time, lampLit: Boolean(g.getFlag('lighthouse_relit')), doorLocked: door && !g.playerCanPass(door), inside: door?.to?.map ? g.maps.get(door.to.map) : null, people: door?.to?.map && this.pixel ? this.peopleIn(door.to.map) : null, drawPerson: (npc, x, y) => this.drawActor(npc.profile.appearance, { ...npc, x, y }, npc.activity === 'sleep') })) });
      }
      for (const p of lm.props) {
        if (FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
        if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE)) continue;
        // sortRow lets an actor stand "inside" a prop (Mason in the excavator cab)
        const tallY = p.sortRow !== undefined ? p.sortRow * TILE : p.type === 'tree' || p.type === 'pine' || p.type === 'streetlamp' ? (p.y + 1) * TILE - 2 : (p.y + p.h) * TILE - 1;
        const active = p.animateWhen ? check(p.animateWhen, g) : true;
        items.push({ y: tallY + L.y, draw: at(() => drawProp(ctx, p, { wind: this.wind, track: this.dishTrack, map: lm, time: this.time, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null, state: g.world.props[p.id], active, jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime, containerItems: (id) => g.world.containers[id]?.items })) });
      }
      if (lm.id === 'hollowmoor_lot') { // v0.103.6: the company's own vehicles and aircraft, parked where the base keeps them
        for (const pm of parkedMachines(g)) { if (!inView(pm.x * TILE - 96, pm.y * TILE - 96, 192, 192)) continue; items.push({ y: pm.y * TILE + 28 + L.y, draw: at(() => pm.draw(ctx)) }); }
      }
      for (const npc of g.npcs.values()) {
        if (npc.map !== lm.id || npc.riding != null) continue; // passengers are inside the bus
        if (!inView(npc.x - 20, npc.y - 50, 40, 60)) continue;
        if (isDown(npc, g.clock.total)) {
          items.push({ y: npc.y + L.y - 20, draw: at(() => this.drawLying(npc)) });
          continue;
        }
        const nwi = npc.hostile?.mode === 'fight' && npc.profile.combat?.weapon ? g.content.items[npc.profile.combat.weapon] : null;
        const nw = nwi ? (this.pixel ? lookOf(nwi) : nwi.weapon?.held) : null;
        const app = nw ? { ...npc.profile.appearance, holding: nw } : npc.profile.appearance;
        const lift = g.combat.wrath?.npcId === npc.id ? wrathLift(g, g.combat.wrath) : 0;
        if (npc.profile.float && !lift) {
          // v0.52.0: Morganius floats — a bob over a glow on the floor, a glide instead of a walk, his cards about him
          items.push({ y: npc.y + L.y, draw: at(() => this.drawFloater(npc, app)) });
          continue;
        }
        items.push({ y: npc.y + L.y, draw: at(() => this.drawActor(app, lift ? { ...npc, y: npc.y - lift, moving: false } : npc, npc.activity === 'sleep')) });
      }
      // cars (src/systems/vehicles.js)
      if (g.vehicles) {
        const models = g.content.vehicles.models;
        for (const car of g.vehicles.carsOn(lm.id)) {
          const m = models[car.model];
          if (!inView(car.x - m.len / 2, car.y - m.len / 2, m.len, m.len)) continue;
          const driven = car.id === g.player.driving;
          items.push({ y: car.y + L.y + Math.abs(Math.sin(car.angle)) * m.len * 0.4 + 4, draw: at(() => drawCar(ctx, m, car.x, car.y, car.angle, { color: car.color, id: car.id, braking: driven && car.braking, lit: (driven || Boolean(car.chase)) && night, time: this.time, siren: Boolean(car.chase), wheel: car.wheel, ...(m.sig && this.sigOpts(car, lm, driven)) })) });
        }
      }
      // v0.58.0: the aircraft on Starling Field — on their stands, pushed back, taxiing, rolling, climbing away (src/aero/field.js)
      if (lm.id === 'starling_flats') { this.drawField(items, at, inView, night); this.drawLaunches(items, at, inView, night); }
      if (lm.id === 'starling_flats') this.drawConvoys(items, at, inView, night);
      // the bus and the traffic (src/systems/transit.js)
      if (g.transit) {
        const models = g.content.vehicles.models;
        for (const f of g.transit.on(lm.id)) {
          if (!inView(f.x - f.len / 2, f.y - f.len / 2, f.len, f.len)) continue;
          const sortY = f.y + L.y + Math.abs(Math.sin(f.angle)) * f.len * 0.4 + 4;
          const braking = f.speed < f.max * 0.3;
          if (f.kind === 'bus') items.push({ y: sortY, draw: at(() => drawBus(ctx, f.x, f.y, f.angle, { len: f.len, wid: f.wid, color: f.color, lit: night, braking, number: f.line === 'r1' ? '1' : f.line.replace('r', '') })) });
          else items.push({ y: sortY, draw: at(() => drawCar(ctx, models[f.model], f.x, f.y, f.angle, { color: f.color, id: f.id, lit: night, braking })) });
        }
      }
    }
    const held = this.pixel ? lookOf(g.combat.equipped()) : g.combat.equipped().weapon.held; // v0.45.0: each weapon its own sprite
    const playerLook = held ? { ...g.player.appearance, holding: held } : g.player.appearance;
    const pAlpha = g.combat.wrath ? wrathPlayerAlpha(g, g.combat.wrath) : 1;
    const aboard = g.player.driving || (g.player.riding !== null && g.player.riding !== undefined);
    if (!this.hidePlayer && !aboard && pAlpha > 0) items.push({ y: g.player.y, draw: () => { ctx.globalAlpha = pAlpha; this.drawActor(playerLook, g.player, false); ctx.globalAlpha = 1; } });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    if (!this.hidePlayer && !aboard && this.playerOccluded(map)) {
      ctx.globalAlpha = 0.38;
      this.drawActor(playerLook, g.player, false);
      ctx.globalAlpha = 1;
    }
    if (this.buildCursor) this.drawBuildCursor(ctx, this.buildCursor);
    this.drawCombatFx(ctx);
    if (g.heavy) this.drawHeavy(ctx);

    if (g.combat.wrath) {
      this.drawLighting(map);
      drawWrath(this, g, g.combat.wrath);
      return;
    }
    this.drawHighlight(ctx);
    if (pixel) {
      // scale the art up, crisp; everything after this is full resolution
      this.ctx = main;
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.imageSmoothingEnabled = false;
      main.drawImage(this.low, Math.round(this.blit.x), Math.round(this.blit.y), this.low.width * this.px, this.low.height * this.px);
      main.imageSmoothingEnabled = true;
      this.capturingText = false;
      this.replayWorldText(main);
    }
    this.drawLighting(map);
    this.drawOverlays(map);
    this.drawCrosshair();
  }

  // ================================================================== the isometric view (v0.104.0, docs/RENDERING.md)

  /** The canvas transform of the plain iso screen: the camera's whole-pixel offset, nothing else. */
  setScreen(ctx) {
    const b = this.base;
    ctx.setTransform(b.s, 0, 0, b.s, b.ex, b.ey);
  }

  /** The ground transform: world pixels laid flat as the 2:1 diamond grid ((1, 0.5, -1, 0.5) on top of the camera). */
  setGround(ctx) {
    const b = this.base;
    ctx.setTransform(b.s, b.s * 0.5, -b.s, b.s * 0.5, b.ex, b.ey);
  }

  /**
   * A billboard: the flat drawing's point (fx, fy) lands on the screen position of the ground point (gx, gy)
   * lifted by z, so an upright sprite stands on its feet. Whole pixels, so sprites stay crisp.
   */
  setBill(ctx, fx, fy, gx, gy, z = 0) {
    const b = this.base;
    ctx.setTransform(b.s, 0, 0, b.s, b.ex + b.s * Math.round(gx - gy - fx), b.ey + b.s * Math.round((gx + gy) / 2 - z - fy));
  }

  /** The ground rectangle (world px) that the view (iso space, optionally taller or lower by `padTop`/`padBottom`) covers. */
  worldBox(v, padTop = 0, padBottom = 0) {
    const c = [unproject(v.x, v.y - padTop), unproject(v.x + v.w, v.y - padTop), unproject(v.x, v.y + v.h + padBottom), unproject(v.x + v.w, v.y + v.h + padBottom)];
    const x0 = Math.min(...c.map((q) => q.x));
    const y0 = Math.min(...c.map((q) => q.y));
    return { x: x0, y: y0, w: Math.max(...c.map((q) => q.x)) - x0, h: Math.max(...c.map((q) => q.y)) - y0 };
  }

  /** Does a street map have free-standing wall tiles (cached: tiles of a map never change)? */
  hasWalls(lm) {
    let has = this.wallMaps.get(lm);
    if (has === undefined) { has = lm.grid.some((row) => row.includes('W')); this.wallMaps.set(lm, has); }
    return has;
  }

  /** The ground chunk baked into its iso diamond, cached beside the flat chunk with the same LRU discipline. */
  isoChunk(map, cx, cy) {
    const src = this.groundChunk(map, cx, cy);
    let iso = this.isoBaked.get(src);
    if (!iso) {
      iso = bakeDiamond(src);
      iso.src = src;
      iso.sh = src.height;
      this.isoBaked.set(src, iso);
    }
    this.isoLRU.delete(iso);
    this.isoLRU.set(iso, true);
    while (this.isoLRU.size > MAX_ISO_CHUNKS) {
      const old = this.isoLRU.keys().next().value;
      this.isoLRU.delete(old);
      this.isoBaked.delete(old.src);
    }
    return iso;
  }

  /** Draw layer `lm`'s ground: each chunk's diamond at its iso position (neighbours tile exactly: same lattice, nearest sampling). */
  drawGroundIso(ctx, lm, L, lv) {
    const cs = CHUNK * TILE;
    const cx0 = Math.max(0, Math.floor(lv.x / cs));
    const cy0 = Math.max(0, Math.floor(lv.y / cs));
    const cx1 = Math.min(Math.ceil(lm.width / CHUNK) - 1, Math.floor((lv.x + lv.w) / cs));
    const cy1 = Math.min(Math.ceil(lm.height / CHUNK) - 1, Math.floor((lv.y + lv.h) / cs));
    const v = this.view;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const gx = cx * cs + L.x;
      const gy = cy * cs + L.y;
      const src = this.groundChunk(lm, cx, cy);
      const ix = gx - gy - src.height;
      const iy = (gx + gy) / 2;
      const w = src.width + src.height;
      const h = w >> 1;
      if (ix + w < v.x || ix > v.x + v.w || iy + h < v.y || iy > v.y + v.h) continue;
      ctx.drawImage(this.isoChunk(lm, cx, cy), ix, iy);
    }
    this.wantChunks.push({ map: lm, cx0: cx0 - 1, cy0: cy0 - 1, cx1: cx1 + 1, cy1: cy1 + 1 });
  }

  /** The sprite facing, chosen from the screen direction of motion (the actor's own `facing` is never written). */
  actorFacing(actor, now) {
    let m = this.motion.get(actor);
    if (!m) { m = { x: actor.x, y: actor.y, dx: 0, dy: 1, movedAt: -9, face: 'down', faceAt: -9, moved: false, lastFacing: actor.facing }; this.motion.set(actor, m); }
    const ddx = actor.x - m.x;
    const ddy = actor.y - m.y;
    m.x = actor.x;
    m.y = actor.y;
    const d = Math.hypot(ddx, ddy);
    if (d > 0.05 && d < 40) { m.dx = ddx; m.dy = ddy; m.movedAt = now; m.moved = true; m.lastFacing = actor.facing; }
    let face;
    if (now - m.movedAt < 0.2) face = spriteFacing(m.dx, m.dy);
    else if (m.moved && actor.facing === m.lastFacing) face = m.face; // stopped: keep the way the walk was facing
    else { const f = facingVector(actor.facing); face = spriteFacing(f[0], f[1]); }
    if (face !== m.face && now - m.faceAt < 0.1) return m.face; // no flicker at a boundary
    if (face !== m.face) m.faceAt = now;
    m.face = face;
    return face;
  }

  /** Is a point (a name tag) hidden by a roofed building drawn in front of it (and not inside the see-through hole)? */
  tagHidden(wx, wy, z) {
    for (const o of this.occluders) {
      if (!behindBox({ x: wx, y: wy }, o.box) || !hidesPoint(o.box, o.h, wx, wy, z)) continue;
      if (o.fade > 0.2) {
        const p = project(wx, wy, z);
        if (Math.hypot(p.x - o.hx, p.y - o.hy) < o.r * o.fade * 0.8) continue;
      }
      return true;
    }
    return false;
  }

  /** One frame of the world in the isometric view. Same pipeline as `render`: low-resolution pass, upscale, text, lights, overlays. */
  renderIso(dt) {
    this.time += dt;
    this.prefetchGround();
    const g = this.game;
    const main = this.ctx;
    const map = g.currentMap();
    this.layers = this.computeLayers(map);
    this.updateCamera(dt);
    const { zoom } = this.cam;
    const v = this.view;
    setPixelProps(true);
    setPixelPeople(true);
    setPixelCars(true);
    const lw = Math.ceil(this.canvas.width / this.px) + 2;
    const lh = Math.ceil(this.canvas.height / this.px) + 2;
    if (this.low.width !== lw || this.low.height !== lh) { this.low.width = lw; this.low.height = lh; }
    this.ctx = this.lowCtx;
    this.worldText.length = 0;
    this.capturingText = true;
    const ctx = this.ctx;
    const s = zoom / this.px;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = map.kind === 'interior' ? '#1b1620' : '#2d6f8f';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const cs = g.combat.shake;
    const shake = Math.max(g.heavy && g.realTime < g.heavy.shakeUntil ? (g.heavy.shakeUntil - g.realTime) * 14 : 0, cs && g.realTime < cs.until ? cs.mag * 2 : 0, this.launchShake(map));
    const shx = shake ? (Math.random() - 0.5) * shake : 0;
    const shy = shake ? (Math.random() - 0.5) * shake : 0;
    // as before: whole pixels, and the finished picture slid by the leftover fraction
    const ox = (-this.cam.x + shx) * s;
    const oy = (-this.cam.y + shy) * s;
    const ex = Math.floor(ox) + 1;
    const ey = Math.floor(oy) + 1;
    this.blit = { x: (ox - ex) * this.px, y: (oy - ey) * this.px };
    this.base = { s, ex, ey };
    this.setScreen(ctx);
    ctx.imageSmoothingEnabled = false;

    const night = g.clock.darkness > 0.45;
    this.wind = windRunway(g.clock.day) === '09' ? 1 : -1;
    this.dishTrack = g.player.map === 'starling_flats' ? g.aero.groundPass() : null;
    const dtc = Math.min(dt, 0.1);
    const focus = { x: g.player.x, y: g.player.y };

    // which interiors are laid over which building, and which of them are open this frame
    const ids = new Set(this.layers.map((L) => L.map.id));
    const overlaid = new Map();
    for (const L of this.layers) {
      if (L.map.kind === 'interior') continue;
      for (const b of L.map.buildings) if (b.interior && ids.has(b.interior)) overlaid.set(b.interior, { b, L, st: this.bld.step(b, g.player.map === b.interior, this.time, dtc) });
    }
    this.hiddenMaps = new Set();
    for (const [id, r] of overlaid) if (r.st.t <= 0.001) this.hiddenMaps.add(id);
    this.occluders = [];

    const wv = this.worldBox(v, 0, 0);
    const hit = (ix0, iy0, ix1, iy1, pad = 24) => ix1 > v.x - pad && ix0 < v.x + v.w + pad && iy1 > v.y - pad && iy0 < v.y + v.h + pad;
    const items = [];
    const tops = [];
    const holeSprite = (r) => lightSprite(r, 1, '0,0,0', 5);

    for (const L of this.layers) {
      const lm = L.map;
      if (this.hiddenMaps.has(lm.id)) continue; // a room under a roof: nothing of it is drawn
      const rec = overlaid.get(lm.id);
      const lv = { x: wv.x - L.x, y: wv.y - L.y, w: wv.w, h: wv.h };
      // layer-local rectangle → does it touch the view (up: how far above it things stand)
      const inView = (x, y, w, h, pad = 64, up = 120) => {
        const gx = x + L.x;
        const gy = y + L.y;
        return hit(gx - (gy + h), (gx + gy) / 2 - up, gx + w - gy, (gx + w + gy + h) / 2 + 8, pad);
      };
      const flat = (fn) => () => { ctx.save(); this.setGround(ctx); ctx.translate(L.x, L.y); fn(); ctx.restore(); };
      // an upright sprite drawn at layer-local (x, y) with its feet at the ground point (gx, gy) (layer-local too)
      const upright = (fx, fy, gx, gy, fn) => () => { ctx.save(); this.setBill(ctx, fx + L.x, fy + L.y, gx + L.x, gy + L.y); ctx.translate(L.x, L.y); fn(); ctx.restore(); };
      const personBox = (x, y, r = 3) => pointBox(x + L.x, y + L.y, r);
      const billRect = (x, y, hw, up) => { const p = project(x + L.x, y + L.y); return { x0: p.x - hw, x1: p.x + hw, y0: p.y - up, y1: p.y + 6 }; };

      if (lm.def?.aloft?.over) { ctx.save(); this.setGround(ctx); this.drawCityBelow(ctx, lm, lv); ctx.restore(); }
      this.drawGroundIso(ctx, lm, L, lv);
      ctx.save();
      this.setGround(ctx);
      ctx.translate(L.x, L.y);
      if (lm.kind !== 'interior') drawWaterShimmer(ctx, lm, lv, this.time);
      if (lm.id === 'lanternside' && g.getFlag('canal_slick')) this.drawCanalSlick(ctx, lm, lv);
      for (const p of lm.props) {
        if (!FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
        if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE, 64, 8)) continue;
        drawProp(ctx, p, { wind: this.wind, track: this.dishTrack, map: lm, time: this.time, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null, state: g.world.props[p.id], jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime, berth: p.type === 'shipberth' ? g.logistics.docks.at(p.slot) : null, slip: p.type === 'slipway' ? g.logistics.slip() : null });
      }
      const shade2 = 0.34 * (1 - Math.min(1, g.clock.darkness) * 0.75);
      for (const p of lm.props) {
        if (!SPRITE_PROPS.has(p.type) || !this.propVisible(p)) continue;
        if (!inView(p.x * TILE - 32, p.y * TILE - 64, p.w * TILE + 64, p.h * TILE + 96, 64, 8)) continue;
        drawPropShadow(ctx, p, { map: lm, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null }, shade2);
      }
      if (g.vehicles?.skids?.length) this.drawSkids(ctx, lm.id);
      if (g.combat.decals.length) this.drawCombatGround(ctx, lm.id);
      if (g.vehicles?.trail?.length) drawTrail(ctx, g.vehicles.trail, lm.id, g.realTime);
      if (lm.id === g.player.map && g.heavy?.decals.length) this.drawScorch(ctx, g.heavy.decals.filter((d) => d.map === lm.id));
      ctx.restore();

      // ---- buildings on a street: a roofed box (or nothing but its open room, once the player is in it)
      if (lm.kind !== 'interior') {
        for (const b of lm.buildings) {
          if (b.facility && g.war.facilityState(b.facility) !== 'built') continue;
          if (b.hall && !g.aero.hallBuilt(b.hall)) continue;
          const r = b.interior ? overlaid.get(b.interior) : null;
          const t = r ? r.st.t : 0;
          if (t >= 1) continue; // open: the room stands in its place
          const box = buildingBox(b, L);
          const H = buildingHeight(b);
          const o = project(box.x0, box.y0);
          const wpx = (b.w + b.h) * TILE;
          if (!hit(o.x - b.h * TILE, o.y - H - 52, o.x - b.h * TILE + wpx, o.y + wpx / 2, 8)) continue;
          const door = lm.doors.find((d) => d.building === b.id);
          const pic = this.bld.picture(b, { lit: this.buildingLit(b), night, locked: Boolean(door && !g.playerCanPass(door)) });
          const behind = t < 0.01 && behindBox(focus, box) && hidesPoint(box, H, focus.x, focus.y, 20);
          const fade = this.bld.stepFade(b, behind, dtc);
          const px = o.x - pic.ox;
          const py = o.y - pic.oy;
          const fp = project(focus.x, focus.y, 20);
          if (t < 0.01) this.occluders.push({ box, h: H, fade, hx: fp.x, hy: fp.y, r: 110 });
          items.push({ box, rect: { x0: px, y0: py, x1: px + pic.canvas.width, y1: py + pic.canvas.height }, draw: () => {
            this.setScreen(ctx);
            if (t > 0) ctx.globalAlpha = 1 - t;
            if (fade > 0.01) this.bld.drawWithHole(ctx, pic, px, py, fp.x, fp.y, 110 * fade, holeSprite); else ctx.drawImage(pic.canvas, px, py);
            ctx.globalAlpha = 1;
          } });
        }
      }

      // ---- walls: an open room's walls (a storey at the back, a kerb elsewhere) and free-standing walls on a street
      const wallItems = (kind, tx0, ty0, tx1, ty1, pal, alpha) => {
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
          if (lm.tileAt(tx, ty) !== 'W') continue;
          const k = kind === 'room' ? (lm.def?.aloft?.roof ? 'low' : tx === 0 || ty === 0 ? 'tall' : 'low') : 'street';
          const pic = columnPicture(k, pal);
          const gx = tx * TILE + L.x;
          const gy = ty * TILE + L.y;
          const o = project(gx, gy);
          const px = o.x - pic.ox;
          const py = o.y - pic.oy;
          if (!hit(px, py, px + pic.canvas.width, py + pic.canvas.height, 4)) continue;
          items.push({ box: { x0: gx, y0: gy, x1: gx + TILE, y1: gy + TILE }, rect: { x0: px, y0: py, x1: px + pic.canvas.width, y1: py + pic.canvas.height }, draw: () => { this.setScreen(ctx); if (alpha < 1) ctx.globalAlpha = alpha; ctx.drawImage(pic.canvas, px, py); ctx.globalAlpha = 1; } });
        }
      };
      if (lm.kind === 'interior') {
        const aloft = lm.def?.aloft;
        const pal = rec ? { wall: rec.b.wall || '#d8cdb8', trim: rec.b.trim || '#5a4a3a' } : aloft && !aloft.roof ? { wall: '#3a3e48', trim: '#3a3e48', glass: '#8fb8d0' } : { wall: '#d8cdb8', trim: '#5a4a3a' };
        wallItems('room', 0, 0, lm.width - 1, lm.height - 1, pal, rec ? rec.st.t : 1);
      } else if (this.hasWalls(lm)) {
        wallItems('street', Math.max(0, Math.floor(lv.x / TILE) - 1), Math.max(0, Math.floor(lv.y / TILE) - 1), Math.min(lm.width - 1, Math.ceil((lv.x + lv.w) / TILE) + 1), Math.min(lm.height - 1, Math.ceil((lv.y + lv.h) / TILE) + 1), { wall: '#5b4a45', trim: '#5b4a45' }, 1);
      }

      // ---- upright props: billboards on their footprint's middle
      for (const p of lm.props) {
        if (FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
        if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE)) continue;
        const active = p.animateWhen ? check(p.animateWhen, g) : true;
        const cx = (p.x + p.w / 2) * TILE;
        const cy = (p.y + p.h / 2) * TILE;
        items.push({ box: { x0: p.x * TILE + L.x, y0: p.y * TILE + L.y, x1: (p.x + p.w) * TILE + L.x, y1: (p.y + p.h) * TILE + L.y }, rect: billRect(cx, cy, p.w * 16 + 24, 96 + (p.h - 1) * TILE),
          draw: upright(cx, (p.y + p.h) * TILE - 2, cx, cy, () => drawProp(ctx, p, { wind: this.wind, track: this.dishTrack, map: lm, time: this.time, night, aero: AERO_VIEW.has(p.type) ? g.aero.propView(p) : null, state: g.world.props[p.id], active, jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime, containerItems: (id) => g.world.containers[id]?.items })) });
      }
      if (lm.id === 'hollowmoor_lot') {
        for (const pm of parkedMachines(g)) {
          if (!inView(pm.x * TILE - 96, pm.y * TILE - 96, 192, 192)) continue;
          items.push({ box: { x0: pm.x * TILE - 48 + L.x, y0: pm.y * TILE - 48 + L.y, x1: pm.x * TILE + 48 + L.x, y1: pm.y * TILE + 48 + L.y }, up: 30, draw: flat(() => pm.draw(ctx)) });
        }
      }

      // ---- people
      for (const npc of g.npcs.values()) {
        if (npc.map !== lm.id || npc.riding != null) continue;
        if (!inView(npc.x - 20, npc.y - 4, 40, 8, 24, 70)) continue;
        if (isDown(npc, g.clock.total)) {
          items.push({ box: personBox(npc.x, npc.y, 12), rect: billRect(npc.x, npc.y, 30, 20), draw: upright(npc.x, npc.y, npc.x, npc.y, () => this.drawLying(npc)) });
          continue;
        }
        const nwi = npc.hostile?.mode === 'fight' && npc.profile.combat?.weapon ? g.content.items[npc.profile.combat.weapon] : null;
        const nw = nwi ? lookOf(nwi) : null;
        const app = nw ? { ...npc.profile.appearance, holding: nw } : npc.profile.appearance;
        const face = this.actorFacing(npc, this.time);
        const rect = billRect(npc.x, npc.y, 20, 56);
        if (npc.profile.float) items.push({ box: personBox(npc.x, npc.y), rect: { ...rect, y0: rect.y0 - 20 }, draw: upright(npc.x, npc.y, npc.x, npc.y, () => this.drawFloater(npc, app, face)) });
        else items.push({ box: personBox(npc.x, npc.y), rect, draw: upright(npc.x, npc.y, npc.x, npc.y, () => this.drawActor(app, npc, npc.activity === 'sleep', face)) });
      }

      // ---- cars: for now their top-down drawing lies flat on the ground (phase 5 gives them volume); the box is the rotated body's
      if (g.vehicles) {
        const models = g.content.vehicles.models;
        for (const car of g.vehicles.carsOn(lm.id)) {
          const m = models[car.model];
          if (!inView(car.x - m.len / 2, car.y - m.len / 2, m.len, m.len, 64, 30)) continue;
          const driven = car.id === g.player.driving;
          items.push({ box: bodyBox(car.x + L.x, car.y + L.y, m.len, m.wid || m.len * 0.45, car.angle), up: 16, draw: flat(() => drawCar(ctx, m, car.x, car.y, car.angle, { color: car.color, id: car.id, braking: driven && car.braking, lit: (driven || Boolean(car.chase)) && night, time: this.time, siren: Boolean(car.chase), wheel: car.wheel, ...(m.sig && this.sigOpts(car, lm, driven)) })) });
        }
      }
      const shiftNew = (n0) => {
        for (let i = n0; i < items.length; i++) {
          const it = items[i];
          it.box = { x0: it.box.x0 + L.x, y0: it.box.y0 + L.y, x1: it.box.x1 + L.x, y1: it.box.y1 + L.y };
          if (it.up === undefined) it.up = 24;
          if (it.top) { items.splice(i, 1); tops.push(it); i--; }
        }
      };
      if (lm.id === 'starling_flats') {
        let n0 = items.length;
        this.drawField(items, flat, inView, night);
        shiftNew(n0);
        n0 = items.length;
        this.drawLaunches(items, flat, inView, night);
        shiftNew(n0);
        n0 = items.length;
        this.drawConvoys(items, flat, inView, night);
        shiftNew(n0);
      }
      if (g.transit) {
        const models = g.content.vehicles.models;
        for (const f of g.transit.on(lm.id)) {
          if (!inView(f.x - f.len / 2, f.y - f.len / 2, f.len, f.len, 64, 30)) continue;
          const braking = f.speed < f.max * 0.3;
          const box = bodyBox(f.x + L.x, f.y + L.y, f.len, f.wid || f.len * 0.4, f.angle);
          if (f.kind === 'bus') items.push({ box, up: 30, draw: flat(() => drawBus(ctx, f.x, f.y, f.angle, { len: f.len, wid: f.wid, color: f.color, lit: night, braking, number: f.line === 'r1' ? '1' : f.line.replace('r', '') })) });
          else items.push({ box, up: 16, draw: flat(() => drawCar(ctx, models[f.model], f.x, f.y, f.angle, { color: f.color, id: f.id, lit: night, braking })) });
        }
      }
    }

    // ---- the player (alone in the street, or the one in the car, who is drawn with it)
    const held = lookOf(g.combat.equipped());
    const playerLook = held ? { ...g.player.appearance, holding: held } : g.player.appearance;
    const aboard = g.player.driving || (g.player.riding !== null && g.player.riding !== undefined);
    if (!this.hidePlayer && !aboard) {
      const p = g.player;
      const face = this.actorFacing(p, this.time);
      const pp = project(p.x, p.y);
      items.push({ box: pointBox(p.x, p.y), rect: { x0: pp.x - 20, x1: pp.x + 20, y0: pp.y - 56, y1: pp.y + 6 }, draw: () => { ctx.save(); this.setBill(ctx, p.x, p.y, p.x, p.y); this.drawActor(playerLook, p, false, face); ctx.restore(); } });
    }

    for (const it of sortItems(items)) it.draw();
    tops.sort((a, b) => a.y - b.y);
    for (const it of tops) it.draw();

    if (this.buildCursor) { ctx.save(); this.setGround(ctx); this.drawBuildCursor(ctx, this.buildCursor); ctx.restore(); }
    this.setScreen(ctx);
    this.drawCombatFxIso(ctx);
    if (g.heavy) { ctx.save(); this.setGround(ctx); this.drawHeavy(ctx); ctx.restore(); } // (phase 5: rockets and drones get their height)
    this.setScreen(ctx);
    this.drawHighlight(ctx);

    this.ctx = main;
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.imageSmoothingEnabled = false;
    main.drawImage(this.low, Math.round(this.blit.x), Math.round(this.blit.y), this.low.width * this.px, this.low.height * this.px);
    main.imageSmoothingEnabled = true;
    this.capturingText = false;
    this.replayWorldText(main);
    this.drawLighting(map);
    this.drawOverlays(map);
    this.drawCrosshair();
  }

  /** Bullets, sparks, flashes, swings, blasts and falling cases in the isometric view: chest-plane positions become real heights. */
  drawCombatFxIso(ctx) {
    const g = this.game;
    const t = g.realTime;
    const B = 18; // BODY_Y: a bullet flies this high above the feet; combat stores y minus it
    const at = (x, y, z = 0) => project(x, y, z);
    for (const b of g.combat.bullets) {
      if (b.map !== g.player.map) continue;
      const head = at(b.x, b.y + B, B);
      if (b.kind) {
        // the odd ammunition is drawn by its own painter, turned to the screen direction of its flight
        const sd = Math.hypot(b.dx - b.dy, (b.dx + b.dy) / 2) || 1;
        const sb = { ...b, dx: (b.dx - b.dy) / sd, dy: (b.dx + b.dy) / 2 / sd };
        ctx.save();
        ctx.translate(Math.round(head.x - b.x), Math.round(head.y - b.y));
        const done = this.drawOddBullet(ctx, sb, t);
        ctx.restore();
        if (done) continue;
      }
      const len = b.hurts ? 10 : 16;
      const tail = at(b.x - b.dx * len, b.y + B - b.dy * len, B);
      ctx.strokeStyle = b.hurts ? 'rgba(255,140,90,0.55)' : 'rgba(255,230,150,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
      ctx.fillStyle = b.hurts ? '#ffb070' : '#fff6c8';
      ctx.fillRect(Math.round(head.x) - 2, Math.round(head.y) - 2, 4, 4);
    }
    for (const q of g.combat.particles) {
      if (q.map !== g.player.map) continue;
      const gp = at(q.x, q.y);
      const hp = at(q.x, q.y, q.z);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(Math.round(gp.x), Math.round(gp.y), 2, 1);
      ctx.fillStyle = q.kind === 'coin' ? '#f2c84a' : q.kind === 'confetti' ? CONFETTI[q.hue || 0] : q.kind === 'case' ? '#e8b83a' : '#b0181e';
      ctx.fillRect(Math.round(hp.x), Math.round(hp.y), q.kind === 'case' ? 4 : 2 * q.size, 2);
    }
    for (const f of g.combat.fx) {
      const k = 1 - (t - f.start) / Math.max(0.001, f.until - f.start);
      if (f.type === 'flash') {
        const p = at(f.x, f.y + B, B);
        const x = Math.round(p.x / 2) * 2;
        const y = Math.round(p.y / 2) * 2;
        const r = k > 0.5 ? 10 : 6;
        ctx.fillStyle = '#ffd060';
        ctx.fillRect(x - r, y - 2, r * 2, 4); ctx.fillRect(x - 2, y - r, 4, r * 2);
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(x - 4, y - 4, 8, 8);
      } else if (f.type === 'swing') {
        const a = Math.atan2(f.dir.y, f.dir.x);
        const R = f.range * 0.85;
        for (let i = -6; i <= 6; i++) {
          const th = a + (i / 6) * f.arc;
          const w = (7 - Math.abs(i)) * 1.2 * k + 2;
          const p = at(f.x + Math.cos(th) * R, f.y + B + Math.sin(th) * R, B);
          ctx.fillStyle = `rgba(255,255,255,${0.75 * k})`;
          ctx.fillRect(Math.round(p.x / 2) * 2 - w / 2, Math.round(p.y / 2) * 2 - w / 2, w, w);
        }
      } else if (f.type === 'spark') {
        const p = at(f.x, f.y + B, B);
        ctx.fillStyle = `rgba(255,220,150,${k})`;
        for (let i = 0; i < 4; i++) ctx.fillRect(p.x + Math.cos(i * 1.7) * 5 * (1 - k), p.y + Math.sin(i * 1.7) * 5 * (1 - k), 2, 2);
      } else if (f.type === 'blast') {
        // a fireball standing on the ground: its heat is a round ring flat on the floor (an ellipse on screen)
        const age = 1 - k;
        const R = f.r * (0.35 + 0.65 * Math.min(1, age * 2.5));
        const ground = at(f.x, f.y);
        const up = (z) => ({ x: ground.x, y: ground.y - z });
        let c = up(10 + age * 20);
        ctx.fillStyle = `rgba(60,50,45,${0.5 * k})`;
        ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.05, 0, Math.PI * 2); ctx.fill();
        c = up(8);
        ctx.fillStyle = `rgba(255,140,40,${0.8 * k})`;
        ctx.beginPath(); ctx.arc(c.x, c.y, R * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,236,170,${k})`;
        ctx.beginPath(); ctx.arc(c.x, c.y, R * 0.4 * k, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(ground.x, ground.y, f.r * age * 1.3, f.r * age * 0.65, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  /** v0.58.0: how hard the ground shakes under the player from a launch (px; the pad's ignition and ascent). */
  launchShake(map) {
    if (map.id !== 'starling_flats') return 0;
    const g = this.game;
    const L = g.content.aerospace.flight.launch;
    let m = 0;
    for (const l of g.aero.launches()) {
      if (l.kind !== 'sequence') continue;
      const d = Math.hypot(l.base.x - g.player.x / TILE, l.base.y - g.player.y / TILE);
      m = Math.max(m, shakeAt(L, l.ph, d));
    }
    return m;
  }

  /** v0.58.0: the launch complex in motion — the crawler, the countdown board, the fire and smoke, the rocket in the sky. */
  drawLaunches(items, at, inView, night) {
    const ctx = this.ctx;
    const g = this.game;
    const L = g.content.aerospace.flight.launch;
    const time = g.realTime;
    for (const l of g.aero.launches()) {
      const bx = l.base.x * TILE;
      const by = l.base.y * TILE;
      if (l.kind === 'rollout') {
        if (!inView(l.x * TILE - 140, l.y * TILE - 420, 280, 520)) continue;
        items.push({ y: (l.y + 1.7) * TILE, box: { x0: l.x * TILE - 70, y0: l.y * TILE - 40, x1: l.x * TILE + 70, y1: l.y * TILE + 60 }, draw: at(() => drawCrawler(ctx, l, this.time)) });
        continue;
      }
      const reach = (l.ph.h + 14) * TILE;
      if (inView(bx - 260, by - 120, 520, 420)) {
        items.push({ y: by + 6 * TILE, box: { x0: bx - 100, y0: by - 40, x1: bx + 100, y1: by + 6 * TILE }, draw: at(() => { drawPadFx(ctx, l, L, time); drawBoard(ctx, l, L); }) });
      }
      if (l.ph.t >= 0 && inView(bx - 300, by - reach - 300, 600, reach + 500)) items.push({ y: 1e7, top: true, box: pointBox(bx, by, 4), draw: at(() => drawSky(ctx, l, L, time, night)) });
    }
  }

  /** v0.58.0: the lights of the field and the pad at night: landing lights, the launch's glare. */
  fieldLights(hole, warm) {
    const g = this.game;
    const L = g.content.aerospace.flight.launch;
    for (const l of g.aero.launches()) {
      if (l.kind !== 'sequence') continue;
      const li = launchLight(l, L);
      if (li) { hole(li.x * TILE, li.y * TILE, li.r * TILE, li.s); warm.push([li.x * TILE, li.y * TILE, li.r * TILE * 0.5]); }
      if (l.ph.phase !== 'done') hole((l.base.x + 3.4) * TILE, (l.base.y + 2.4) * TILE, 70, 0.8); // the countdown board is lit
    }
    for (const m of g.aero.movers()) {
      if (m.state === 'awaiting_delivery' || m.state === 'parked') continue;
      const px = m.x * TILE;
      const py = m.y * TILE;
      const az = m.alt * TILE; // height above the apron
      const fx = Math.sin(m.a);
      const fy = -Math.cos(m.a);
      const half = m.look.len * TILE / 2;
      hole(px + fx * (half + 60), py + fy * (half + 60), 70 + (m.state === 'takeoff' ? 30 : 0), 0.7, az + 4);
      hole(px, py, 40, 0.4, az);
    }
  }

  /** v0.58.0: an aircraft's navigation lights at night: red to port, green to starboard, white at the tail, and strobes on the wingtips. */
  drawNavLights(ctx, m, x, y, k) {
    if (m.state === 'awaiting_delivery') return;
    const rx = Math.cos(m.a);
    const ry = Math.sin(m.a);
    const fx = Math.sin(m.a);
    const fy = -Math.cos(m.a);
    const half = m.look.span * TILE * 0.47 * k;
    const tail = m.look.len * TILE * 0.44 * k;
    const dot = (px, py, c, r) => { ctx.fillStyle = c; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, r, r); };
    dot(x - rx * half, y - ry * half, '#ff3a2a', 3);
    dot(x + rx * half, y + ry * half, '#3fe07a', 3);
    dot(x - fx * tail, y - fy * tail, '#f4f0d8', 3);
    if (Math.floor(this.time * 1.6 + m.x) % 3 === 0) { dot(x - rx * half - fx * 3, y - ry * half - fy * 3, '#ffffff', 4); dot(x + rx * half - fx * 3, y + ry * half - fy * 3, '#ffffff', 4); }
  }

  /** v0.58.0: secure convoys on the road — escort, transporter, escort. */
  drawConvoys(items, at, inView, night) {
    const ctx = this.ctx;
    const models = this.game.content.vehicles.models;
    for (const v of this.game.aero.convoys()) {
      const m = models[v.model];
      const x = v.x * TILE;
      const y = v.y * TILE;
      if (!inView(x - m.len / 2, y - m.len / 2, m.len, m.len)) continue;
      items.push({ y: y + Math.abs(Math.sin(v.angle)) * m.len * 0.4 + 4, box: bodyBox(x, y, m.len, m.wid || m.len * 0.45, v.angle), draw: at(() => drawCar(ctx, m, x, y, v.angle, { color: v.color, id: v.id, lit: night, braking: false })) });
    }
  }

  /** v0.58.0: the aircraft on the field. Those on the ground sort among the props by their tail; those in the air are drawn over everything. */
  drawField(items, at, inView, night) {
    const ctx = this.ctx;
    for (const m of this.game.aero.movers()) {
      const px = m.x * TILE;
      const py = m.y * TILE;
      const r = (Math.max(m.look.len, m.look.span) / 2 + 2) * TILE;
      const lift = m.alt * TILE;
      if (!inView(px - r - lift, py - r - lift, r * 2 + lift * 2, r * 2 + lift * 2)) continue;
      const air = m.alt > 0.05;
      items.push({ y: air ? 1e7 : py + m.look.len * TILE * 0.5, top: air, box: bodyBox(px, py, m.look.len * TILE, m.look.span * TILE, m.a - Math.PI / 2), draw: at(() => { drawAircraft(ctx, m.look, px, py, m.a, { livery: m.livery, altitude: lift, scale: 1 + m.alt * 0.035 }); if (night) this.drawNavLights(ctx, m, px, py - lift, 1 + m.alt * 0.035); }) });
    }
  }

  /** v0.44.0: a chunky pixel crosshair where the mouse is, while you hold a gun (the cursor is hidden). */
  drawCrosshair() {
    const g = this.game;
    const m = this.mouse;
    const on = this.pixel && m && g.player.aim && g.combat.equipped().weapon.kind === 'gun' && !g.player.driving && !g.paused;
    this.canvas.style.cursor = on ? 'none' : '';
    if (!on) return;
    const c = this.ctx;
    const u = Math.max(2, this.px / 2);
    const x = Math.round(m.x / u) * u;
    const y = Math.round(m.y / u) * u;
    const spread = g.combat.cooldown > 0 ? 3 : 2; // it opens up as you fire
    c.setTransform(1, 0, 0, 1, 0, 0);
    for (const [col, o] of [['#14143a', 1], ['#ffffff', 0]]) {
      c.fillStyle = col;
      for (const [dx, dy, w, h] of [[-(spread + 3), -0.5, 3, 1], [spread, -0.5, 3, 1], [-0.5, -(spread + 3), 1, 3], [-0.5, spread, 1, 3]]) c.fillRect(x + (dx - o * 0.5) * u, y + (dy - o * 0.5) * u, (w + o) * u, (h + o) * u);
    }
    c.fillStyle = g.combat.reloading ? '#f2c14e' : '#e8503a';
    c.fillRect(x - u / 2, y - u / 2, u, u);
  }

  /** v0.38.0: draw the world's text (recorded during the pixel pass) crisply at full resolution. */
  replayWorldText(main) {
    const px = this.px;
    main.save();
    for (const t of this.worldText) {
      const m = t.m;
      main.setTransform(m.a * px, m.b * px, m.c * px, m.d * px, m.e * px + Math.round(this.blit.x), m.f * px + Math.round(this.blit.y));
      main.font = t.font;
      main.textAlign = t.align;
      main.textBaseline = t.base;
      main.globalAlpha = t.alpha;
      if (t.op === 'fillText') { main.fillStyle = t.fill; main.fillText(t.t, t.x, t.y, t.maxW); } else { main.strokeStyle = t.stroke; main.lineWidth = t.lw; main.lineJoin = t.join; main.strokeText(t.t, t.x, t.y, t.maxW); }
    }
    main.restore();
    this.worldText.length = 0;
  }

  /** True when a building drawn in front of the player covers them. */
  playerOccluded(map) {
    const p = this.game.player;
    for (const b of map.buildings) {
      const bottom = (b.y + b.h) * TILE;
      if (p.y >= bottom) continue;
      const top = b.tower && !this.pixel ? bottom - towerHeight(b) : b.round ? b.y * TILE - TILE * 4.5 : this.pixel ? bottom - TILE * 0.9 : b.y * TILE - TILE * 0.6; // roofless: only the front face covers you
      if (p.x > b.x * TILE - 8 && p.x < (b.x + b.w) * TILE + 8 && p.y > top && p.y - 40 < bottom) return true;
    }
    return false;
  }

  /** Oily rainbow sheen on the Lantern Canal (rows 22–23) after the pipeline leaks. */
  /** v0.34.0: the extra things a signature car's drawing animates with. */
  sigOpts(car, map, driven) {
    return { driven, moving: driven ? car.moved || 0 : 0, hornAge: car.hornAt == null ? 99 : this.game.realTime - car.hornAt, spin: this.time * 2, odo: car.odo || 0, onWater: map.tileAt(Math.floor(car.x / TILE), Math.floor(car.y / TILE)) === '~' };
  }

  /** Tyre marks, fading over a dozen seconds. */
  drawSkids(ctx, mapId) {
    const now = this.game.realTime;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    for (const k of this.game.vehicles.skids) {
      if (k.map !== mapId) continue;
      ctx.strokeStyle = `rgba(20,20,24,${(0.32 * (1 - (now - k.t) / 14)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(k.x0, k.y0); ctx.lineTo(k.x1, k.y1); ctx.stroke();
    }
    ctx.restore();
  }

  drawCanalSlick(ctx, map, v) {
    const x0 = Math.max(0, Math.floor(v.x / TILE));
    const x1 = Math.min(map.width - 1, Math.ceil((v.x + v.w) / TILE));
    for (let x = x0; x <= x1; x++) {
      for (const y of [22, 23]) {
        if (map.tileAt(x, y) !== '~') continue;
        const hue = (x * 37 + y * 11 + this.time * 20) % 360;
        ctx.fillStyle = `hsla(${hue}, 60%, 45%, 0.18)`;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.fillStyle = 'rgba(20,15,25,0.22)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  propVisible(p) {
    if (p.hiddenUnless && !check(p.hiddenUnless, this.game)) return false;
    if (p.ambient && !this.game.aero.ambientHome(p.ambient)) return false; // v0.58.0: Meridian's own aircraft are out
    if (p.type === 'item' && this.game.world.props[p.id]?.taken) return false;
    return true;
  }

  /** An unconscious or dead NPC lying on the ground. */
  drawLying(npc) {
    const ctx = this.ctx;
    if (npc.dead) {
      ctx.fillStyle = 'rgba(110,20,24,0.55)';
      ctx.beginPath(); ctx.ellipse(npc.x, npc.y - 2, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(npc.x + 22, npc.y - 2);
    ctx.rotate(-Math.PI / 2);
    if (npc.dead) ctx.globalAlpha = 0.85;
    drawCharacter(ctx, npc.profile.appearance, { x: 0, y: 0, facing: 'down', moving: false, idleTime: 0, sleeping: true });
    ctx.restore();
  }

  /** Tracers, muzzle flashes, swing arcs and bullet sparks (world space). */
  drawCombatFx(ctx) {
    const g = this.game;
    const t = g.realTime;
    const px = this.pixel;
    // v0.44.0: bullets you can see — a hot slug and a short streak behind it
    for (const b of g.combat.bullets) {
      if (b.map !== g.player.map) continue;
      if (b.kind && this.drawOddBullet(ctx, b, t)) continue; // v0.45.0: pigeons, fish, cheese…
      const len = b.hurts ? 10 : 16;
      ctx.strokeStyle = b.hurts ? 'rgba(255,140,90,0.55)' : 'rgba(255,230,150,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - b.dx * len, b.y - b.dy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = b.hurts ? '#ffb070' : '#fff6c8';
      ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4);
    }
    for (const q of g.combat.particles) {
      if (q.map !== g.player.map) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2);
      ctx.fillStyle = q.kind === 'coin' ? '#f2c84a' : q.kind === 'confetti' ? CONFETTI[q.hue || 0] : q.kind === 'case' ? '#e8b83a' : '#b0181e';
      ctx.fillRect(Math.round(q.x), Math.round(q.y - q.z), q.kind === 'case' ? 4 : 2 * q.size, 2);
    }
    for (const f of g.combat.fx) {
      const k = 1 - (t - f.start) / Math.max(0.001, f.until - f.start);
      if (px && f.type === 'tracer') continue; // the bullets say it
      if (px && f.type === 'flash') {
        // a blocky four-point muzzle star
        const x = Math.round(f.x / 2) * 2;
        const y = Math.round(f.y / 2) * 2;
        const r = k > 0.5 ? 10 : 6;
        ctx.fillStyle = '#ffd060';
        ctx.fillRect(x - r, y - 2, r * 2, 4); ctx.fillRect(x - 2, y - r, 4, r * 2);
        ctx.fillStyle = '#fff8e0';
        ctx.fillRect(x - 4, y - 4, 8, 8);
        continue;
      }
      if (px && f.type === 'swing') {
        // a fat white smear along the arc, thickest in the middle
        const a = Math.atan2(f.dir.y, f.dir.x);
        const R = f.range * 0.85;
        for (let i = -6; i <= 6; i++) {
          const th = a + (i / 6) * f.arc;
          const w = (7 - Math.abs(i)) * 1.2 * k + 2;
          ctx.fillStyle = `rgba(255,255,255,${0.75 * k})`;
          ctx.fillRect(Math.round((f.x + Math.cos(th) * R) / 2) * 2 - w / 2, Math.round((f.y + Math.sin(th) * R) / 2) * 2 - w / 2, w, w);
        }
        continue;
      }
      if (f.type === 'tracer') {
        ctx.strokeStyle = `rgba(255,236,170,${0.85 * k})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else if (f.type === 'flash') {
        ctx.fillStyle = `rgba(255,214,120,${k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 7 + 4 * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,255,240,${k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill();
      } else if (f.type === 'spark') {
        ctx.fillStyle = `rgba(255,220,150,${k})`;
        for (let i = 0; i < 4; i++) ctx.fillRect(f.x + Math.cos(i * 1.7) * 5 * (1 - k), f.y + Math.sin(i * 1.7) * 5 * (1 - k), 2, 2);
      } else if (f.type === 'blast') {
        // fireball: a white core, orange flame, dark smoke rolling out
        const age = 1 - k;
        const R = f.r * (0.35 + 0.65 * Math.min(1, age * 2.5));
        ctx.fillStyle = `rgba(60,50,45,${0.5 * k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y - 10 - age * 20, R * 1.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,140,40,${0.8 * k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y - 8, R * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,236,170,${k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y - 8, R * 0.4 * k, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * age * 1.3, f.r * age * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (f.type === 'swing') {
        const a = Math.atan2(f.dir.y, f.dir.x);
        ctx.strokeStyle = `rgba(255,255,255,${0.55 * k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.range * 0.85, a - f.arc, a + f.arc); ctx.stroke();
      }
    }
    // aiming line for guns
    const w = g.combat.equipped();
    const p = g.player;
    if (w.weapon.kind === 'gun' && !g.paused && !px) {
      const d = g.combat.aimVector(w);
      ctx.strokeStyle = 'rgba(255,90,70,0.45)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x + d.x * 16, p.y - 18 + d.y * 16); ctx.lineTo(p.x + d.x * 70, p.y - 18 + d.y * 70); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** v0.45.0: the special weapons' ammunition, in flight. */
  drawOddBullet(ctx, b, t) {
    const a = Math.atan2(b.dy, b.dx);
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * 2, y * 2, w * 2, h * 2); };
    switch (b.kind) {
      case 'pigeon': { const flap = Math.floor(t * 16) % 2; if (b.dx < 0) ctx.scale(-1, 1); R(-3, -1, 6, 3, '#8a8a96'); R(2, -2, 2, 2, '#b0b0ba'); R(4, -1, 1, 1, '#e8a040'); R(-2, flap ? -3 : 1, 3, 2, '#6a6a76'); R(-4, 0, 1, 1, '#5a5a66'); break; }
      case 'fish': ctx.rotate(a); R(-4, -1, 7, 3, '#8ab0c8'); R(-4, -1, 7, 1, '#d0e8f0'); R(-6, -2, 2, 1, '#4a7aa8'); R(-6, 1, 2, 1, '#4a7aa8'); R(2, -1, 1, 1, '#14141e'); break;
      case 'cheese': { ctx.rotate(t * 12); R(-3, -3, 6, 6, '#f2c14e'); R(-3, -3, 6, 1, '#ffe08a'); R(-1, -1, 1, 1, '#c8902a'); R(1, 1, 1, 1, '#c8902a'); break; }
      case 'coin': R(-1, -1, 3, 3, Math.floor(t * 20) % 2 ? '#f2c84a' : '#fff0a0'); break;
      case 'nail': ctx.rotate(a); R(-3, 0, 5, 1, '#c9ced4'); R(2, -1, 1, 3, '#8a9098'); break;
      case 'chalk': ctx.rotate(a); R(-6, 0, 4, 1, 'rgba(240,240,232,0.5)'); R(-2, -1, 3, 2, '#f0f0e8'); break;
      case 'ray': ctx.rotate(a); R(-24, -1, 26, 2, 'rgba(90,255,138,0.45)'); R(-10, -1, 12, 2, '#5aff8a'); R(0, -1, 2, 2, '#e0ffe8'); break;
      case 'harpoon': ctx.rotate(a); R(-30, 0, 24, 1, '#8a6a3a'); R(-6, -1, 10, 2, '#c9ced4'); R(4, -2, 2, 4, '#c9ced4'); R(6, -1, 1, 2, '#c9ced4'); break;
      case 'card': ctx.rotate(t * 30); R(-2, -3, 4, 6, '#f6f2e8'); R(-2, -3, 4, 1, '#ffffff'); R(-1, -1, 2, 2, Math.floor(t * 7) % 2 ? '#c8242c' : '#1b1a24'); break; // v0.52.0
      case 'ring': for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(232,195,90,${0.9 - k * 0.25})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-Math.cos(a) * k * 6, -Math.sin(a) * k * 6, 4 + k * 2, a - 1, a + 1); ctx.stroke(); } break; // v0.52.0: hold music
      case 'confetti': for (let k = 0; k < 4; k++) R(Math.round(Math.cos(k * 1.7 + t * 9) * 3), Math.round(Math.sin(k * 2.3 + t * 9) * 3), 1, 1, CONFETTI[k]); break;
      default: ctx.restore(); return false;
    }
    ctx.restore();
    return true;
  }

  /** v0.44.0: blood spatter, pools under the fallen, spent cases — on the ground, fading after a few minutes. */
  drawCombatGround(ctx, mapId) {
    const t = this.game.realTime;
    for (const d of this.game.combat.decals) {
      if (d.map !== mapId) continue;
      const age = t - d.at;
      const a = Math.max(0, Math.min(1, (240 - age) / 60));
      if (a <= 0) continue;
      const x = Math.round(d.x / 2) * 2;
      const y = Math.round(d.y / 2) * 2;
      if (d.kind === 'coin' || d.kind === 'confetti') { ctx.fillStyle = d.kind === 'coin' ? `rgba(242,200,74,${a})` : CONFETTI[d.hue || 0]; ctx.globalAlpha = a; ctx.fillRect(x, y, d.kind === 'coin' ? 4 : 2, 2); ctx.globalAlpha = 1; continue; }
      if (d.kind === 'blood') { ctx.fillStyle = `rgba(150,20,24,${0.85 * a})`; ctx.fillRect(x, y, d.size * 2 + 2, 2); if (d.size > 1) ctx.fillRect(x + 2, y + 2, 2, 2); }
      else if (d.kind === 'case') { ctx.fillStyle = `rgba(232,184,58,${a})`; ctx.fillRect(x, y, 4, 2); ctx.fillStyle = `rgba(140,100,30,${a})`; ctx.fillRect(x + 2, y, 2, 2); }
      else if (d.kind === 'pool') {
        const r = Math.min(1, age / 3) * 9; // spreads for a few seconds
        ctx.fillStyle = `rgba(120,14,20,${0.8 * a})`;
        for (let k = -r; k <= r; k += 2) { const w = Math.round(Math.sqrt(Math.max(0, r * r - k * k)) * 1.7 / 2) * 2; ctx.fillRect(x - w, y + Math.round(k * 0.6 / 2) * 2, w * 2, 2); }
      }
    }
  }

  /** Scorch marks where things exploded (ground level). */
  drawScorch(ctx, decals) {
    const t = this.game.realTime;
    for (const d of decals) {
      const fade = Math.min(1, (d.until - t) / 20);
      const gr = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      gr.addColorStop(0, `rgba(20,16,14,${0.7 * fade})`);
      gr.addColorStop(1, 'rgba(20,16,14,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** Rockets, missiles, drones and incoming cruise-missile reticles (src/systems/heavy.js). */
  drawHeavy(ctx) {
    const g = this.game;
    const H = g.heavy;
    const t = g.realTime;
    for (const pr of H.projectiles) {
      const a = Math.atan2(pr.vy, pr.vx);
      // smoke trail
      for (let i = 1; i <= 6; i++) {
        ctx.fillStyle = `rgba(210,210,210,${0.35 - i * 0.05})`;
        ctx.beginPath(); ctx.arc(pr.x - Math.cos(a) * i * 7, pr.y - 18 - Math.sin(a) * i * 7, 2 + i, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(pr.x, pr.y - 18);
      ctx.rotate(a);
      ctx.fillStyle = pr.kind === 'missile' ? '#d8dce0' : '#5a6a3a';
      ctx.fillRect(-8, -2.5, 14, 5);
      ctx.fillStyle = '#c0302a';
      ctx.beginPath(); ctx.moveTo(6, -2.5); ctx.lineTo(11, 0); ctx.lineTo(6, 2.5); ctx.fill();
      ctx.fillStyle = Math.floor(t * 30) % 2 ? '#ffd27a' : '#ff8a3a';
      ctx.beginPath(); ctx.arc(-10, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const s of H.strikes) {
      const left = Math.max(0, s.at - t);
      const R = s.blast * TILE;
      ctx.strokeStyle = `rgba(255,58,42,${0.5 + 0.5 * Math.sin(t * 12)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, R, R * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x - R, s.y); ctx.lineTo(s.x + R, s.y); ctx.moveTo(s.x, s.y - R * 0.6); ctx.lineTo(s.x, s.y + R * 0.6); ctx.stroke();
      ctx.fillStyle = '#ff3a2a';
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`INBOUND ${left.toFixed(1)}s`, s.x, s.y - R * 0.6 - 6);
      ctx.textAlign = 'left';
      if (left < 0.6) {
        // the missile comes down from the sky
        const k = 1 - left / 0.6;
        const mx = s.x + 200 * (1 - k);
        const my = s.y - 400 * (1 - k);
        ctx.strokeStyle = 'rgba(230,230,230,0.6)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(s.x + 200, s.y - 400); ctx.lineTo(mx, my); ctx.stroke();
        ctx.fillStyle = '#d8dce0';
        ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const d of H.drones) {
      const bob = Math.sin(t * 6 + d.born) * 2;
      ctx.fillStyle = 'rgba(20,20,35,0.25)';
      ctx.beginPath(); ctx.ellipse(d.x, d.y + 26, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(d.x, d.y - 14 + bob);
      if (d.kind === 'kestrel') {
        ctx.fillStyle = '#3a3e46';
        ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(0, -4); ctx.lineTo(14, 2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-2, -8, 4, 14);
      } else {
        ctx.strokeStyle = '#1e1e22';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, 7); ctx.moveTo(7, -7); ctx.lineTo(-7, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(200,200,210,0.55)';
        for (const [dx, dy] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { ctx.beginPath(); ctx.ellipse(dx, dy, 5, 1.4, t * 40, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(-3.5, -2.5, 7, 5);
      }
      ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff3a2a' : '#3aff6a';
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }

  /** v0.41.1: who's inside a building (seen through its open top), awake and on their feet. */
  peopleIn(mapId) {
    const out = [];
    for (const npc of this.game.npcs.values()) if (npc.map === mapId && npc.riding == null && !npc.dead && !isDown(npc, this.game.clock.total)) out.push(npc);
    return out;
  }

  /** A floating person (profile.float): the shadow on the floor, the figure in the air, the card magic. */
  drawFloater(npc, app, facing) {
    const ctx = this.ctx;
    const t = this.time;
    const sleeping = npc.activity === 'sleep';
    const h = sleeping ? 4 : floatLift(npc, t);
    drawFloatShadow(ctx, npc.x, npc.y, h, t);
    // a trail of cards while he glides (kept here: it's only for the eye)
    const trails = (this.floatTrails ||= new Map());
    let hist = trails.get(npc.id);
    if (!hist) trails.set(npc.id, (hist = []));
    const last = hist[hist.length - 1];
    if (npc.moving && (!last || Math.hypot(last.x - npc.x, last.y - npc.y) > 7)) hist.push({ x: npc.x, y: npc.y - h - 8, t });
    while (hist.length && t - hist[0].t > 1.2) hist.shift();
    if (hist.length) EFFECTS.trail(ctx, { hist, now: t, h: 3.4 });
    this.drawActor(app, { ...npc, y: npc.y - h, moving: false }, sleeping, facing);
    if (!sleeping && !isDown(npc, this.game.clock.total)) {
      const st = hostState(npc, this.game.realTime);
      runEffects(ctx, HOST_FX[st.state](npc.x, npc.y - h, st.s, t), t);
    }
  }

  drawActor(appearance, actor, sleeping, facing = actor.facing) {
    const img = appearance.sprite ? this.assets?.image(appearance.sprite) : null;
    if (img) {
      const h = 46 * (appearance.height || 1);
      const w = (img.width / img.height) * h;
      this.ctx.fillStyle = 'rgba(20,20,35,0.28)';
      this.ctx.beginPath();
      this.ctx.ellipse(actor.x, actor.y, 9, 4, 0, 0, Math.PI * 2);
      this.ctx.fill();
      const bob = actor.moving ? Math.abs(Math.sin((actor.animTime || 0) * 11)) * 1.6 : 0;
      this.ctx.save();
      if (facing === 'left') {
        this.ctx.translate(actor.x, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(img, -w / 2, actor.y - h - bob, w, h);
      } else this.ctx.drawImage(img, actor.x - w / 2, actor.y - h - bob, w, h);
      this.ctx.restore();
      return;
    }
    // flinch when hit
    const shake = actor.hurtAt && this.game.realTime - actor.hurtAt < 0.2 ? Math.sin(this.game.realTime * 90) * 2 : 0;
    // v0.44.0: a white flash when hit; a gun points where it's aimed
    const flash = actor.hurtAt && this.game.realTime - actor.hurtAt < 0.09;
    const ad = actor === this.game.player ? (appearance.holding && isGunLook(appearance.holding) ? this.game.combat.aimVector(this.game.combat.equipped()) : null)
      : actor.hostile?.mode === 'fight' && isGunLook(appearance.holding) ? { x: this.game.player.x - actor.x, y: this.game.player.y - actor.y } : null;
    if (actor.stunUntil > this.game.realTime) {
      // v0.45.0: stunned — little stars going round
      for (let k = 0; k < 3; k++) {
        const th = this.time * 6 + (k * Math.PI * 2) / 3;
        this.ctx.fillStyle = k % 2 ? '#fff6a0' : '#f2c14e';
        this.ctx.fillRect(Math.round(actor.x + Math.cos(th) * 10) - 2, Math.round(actor.y - (this.pixel ? 32 : 56) + Math.sin(th) * 3) - 2, 4, 4);
      }
    }
    // in the isometric view a held gun points along the screen direction of the aim
    const aimA = ad ? (this.isoNow ? Math.atan2((ad.x + ad.y) / 2, ad.x - ad.y) : Math.atan2(ad.y, ad.x)) : null;
    drawCharacter(this.ctx, appearance, {
      flash,
      aim: aimA,
      x: actor.x + shake,
      y: actor.y,
      facing,
      moving: actor.moving,
      animTime: actor.animTime,
      idleTime: this.time + (actor.x % 7),
      sleeping,
    });
  }

  buildingLit(b) {
    const g = this.game;
    if (g.clock.darkness < 0.3) return false;
    const door = b.door;
    if (!door?.to) return false;
    const interior = door.to.map;
    if (g.player.map === interior) return true;
    for (const npc of g.npcs.values()) if (npc.map === interior && npc.activity !== 'sleep') return true;
    if (door.lock?.hours && inWindow(g.clock.minuteOfDay, door.lock.hours.from, door.lock.hours.to)) return true;
    return false;
  }

  /** The interaction ring in the isometric view: a ground ellipse for a person, the footprint's diamond for a prop or door. */
  drawHighlightIso(ctx, h) {
    const poly = (x0, y0, x1, y1) => {
      const c = [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
      ctx.beginPath();
      c.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.stroke();
    };
    if (h.kind === 'npc') {
      const npc = this.game.npcs.get(h.id);
      if (!npc) return;
      const L = this.layers.find((q) => q.map.id === npc.map) || { x: 0, y: 0 };
      const c = project(npc.x + L.x, npc.y + L.y);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 14, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (h.kind === 'prop') {
      const p = this.game.currentMap().prop(h.id);
      if (p) poly(p.x * TILE - 1, p.y * TILE - 1, (p.x + p.w) * TILE + 1, (p.y + p.h) * TILE + 1);
    } else if (h.kind === 'door') {
      const d = this.game.currentMap().doors.find((x) => x.id === h.id);
      if (d) poly(d.x * TILE + 1, d.y * TILE + 1, (d.x + 1) * TILE - 1, (d.y + 1) * TILE - 1);
    }
  }

  drawHighlight(ctx) {
    const h = this.highlight;
    if (!h) return;
    const pulse = 0.5 + Math.sin(this.time * 6) * 0.5;
    ctx.strokeStyle = `rgba(255,236,160,${0.55 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    if (this.isoNow) return this.drawHighlightIso(ctx, h);
    if (h.kind === 'npc') {
      const npc = this.game.npcs.get(h.id);
      if (npc) {
        ctx.beginPath();
        ctx.ellipse(npc.x, npc.y, 13, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (h.kind === 'prop') {
      const p = this.game.currentMap().prop(h.id);
      if (p) {
        rrect(ctx, p.x * TILE - 1, p.y * TILE - 1, p.w * TILE + 2, p.h * TILE + 2, 6);
        ctx.stroke();
      }
    } else if (h.kind === 'door') {
      const d = this.game.currentMap().doors.find((x) => x.id === h.id);
      if (d) {
        rrect(ctx, d.x * TILE + 1, d.y * TILE + 1, TILE - 2, TILE - 2, 5);
        ctx.stroke();
      }
    }
  }

  drawLighting(map) {
    const g = this.game;
    // v0.51.0: one night for the whole scene — a room you're standing in is part of the street around it
    const outdoor = this.layers.some((L) => L.map.kind !== 'interior');
    const dark = outdoor ? g.clock.darkness * 0.78 : 0.12 + g.clock.darkness * 0.2;
    if (dark < 0.02) return;
    const pix = this.pixel && !g.combat.wrath;
    const LS = pix ? 1 / this.px : LIGHT_SCALE;
    if (pix) {
      const lw = this.low.width;
      const lh = this.low.height;
      if (this.light.width !== lw || this.light.height !== lh) { this.light.width = lw; this.light.height = lh; }
    } else if (Math.abs(this.light.width - Math.ceil(this.canvas.width * LIGHT_SCALE)) > 1) {
      this.light.width = Math.ceil(this.canvas.width * LIGHT_SCALE);
      this.light.height = Math.ceil(this.canvas.height * LIGHT_SCALE);
    }
    // smooth pools of light (in the pixel look, dithered sprites: lightSprite)
    const ramp = (grad, a, rgb = '0,0,0') => { grad.addColorStop(0, `rgba(${rgb},${a})`); grad.addColorStop(0.55, `rgba(${rgb},${a * 0.62})`); grad.addColorStop(1, `rgba(${rgb},0)`); };
    const lc = this.light.getContext('2d');
    const W = this.light.width;
    const H = this.light.height;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = outdoor ? `rgba(16,16,52,${dark})` : `rgba(30,20,10,${dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const z = this.cam.zoom;
    const iso = this.isoNow;
    const at = (wx, wy, wz = 0) => {
      const sc = this.toScreen(wx, wy, wz);
      // on the world's own pixel grid, so the pools don't shimmer against the ground as the camera moves
      return pix ? { x: Math.round((sc.x - Math.round(this.blit.x)) * LS), y: Math.round((sc.y - Math.round(this.blit.y)) * LS) } : { x: sc.x * LS, y: sc.y * LS };
    };
    // a pool of light at (wx, wy), height wz; `ground` squashes it 2:1 into the iso ground plane
    const hole = (wx, wy, r, strength = 1, wz = 0, ground = false) => {
      const s = at(wx, wy, wz);
      const rad = r * z * LS;
      if (s.x < -rad || s.y < -rad || s.x > W + rad || s.y > H + rad) return;
      if (pix) {
        const sp = lightSprite(rad, strength);
        if (ground && iso) { lc.imageSmoothingEnabled = false; lc.drawImage(sp, s.x - (sp.width >> 1), s.y - (sp.height >> 2), sp.width, sp.height >> 1); return; }
        lc.drawImage(sp, s.x - (sp.width >> 1), s.y - (sp.height >> 1));
        return;
      }
      const grad = lc.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
      ramp(grad, strength);
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(s.x, s.y, rad, 0, Math.PI * 2);
      lc.fill();
    };
    /** A lit room: its whole floor, the light spilling a little past its walls. */
    const room = (wx, wy, ww, wh, strength) => {
      if (iso) { // an open room's floor is a diamond; the light spills a little past its walls
        const c = [at(wx, wy), at(wx + ww, wy), at(wx + ww, wy + wh), at(wx, wy + wh)];
        const mx = (c[0].x + c[2].x) / 2;
        const my = (c[0].y + c[2].y) / 2;
        for (let i = 0; i < 4; i++) {
          const grow = 1 + (3 - i) * 0.05;
          lc.fillStyle = `rgba(0,0,0,${strength * (i === 3 ? 1 : 0.22)})`;
          lc.beginPath();
          c.forEach((q, k) => { const px = mx + (q.x - mx) * grow; const py = my + (q.y - my) * grow; if (k) lc.lineTo(px, py); else lc.moveTo(px, py); });
          lc.closePath();
          lc.fill();
        }
        return;
      }
      const a = at(wx, wy);
      const k = z * LS;
      const w = ww * k;
      const h = wh * k;
      if (a.x > W || a.y > H || a.x + w < 0 || a.y + h < 0) return;
      for (let i = 0; i < 4; i++) {
        const pad = (10 - i * 4) * k;
        lc.fillStyle = `rgba(0,0,0,${strength * (i === 3 ? 1 : 0.22)})`;
        lc.fillRect(a.x - pad, a.y - pad, w + pad * 2, h + pad * 2);
      }
    };
    const warm = []; // [wx, wy, radius, tint, wz]
    const fronts = [];
    const hidden = iso ? this.hiddenMaps : new Set(); // (rooms under a roof: only the iso view has roofs)
    if (outdoor) {
      this.beam = null;
      for (const L of this.layers) {
        if (L.map.kind === 'interior') continue;
        for (const p of L.map.props) {
          if (p.type !== 'streetlamp') continue;
          if (iso) { // a 2:1 pool on the ground, the lamp's own glow up at the head
            hole(p.x * TILE + 16 + L.x, p.y * TILE + 16 + L.y, 120, 0.95, 0, true);
            warm.push([p.x * TILE + 16 + L.x, p.y * TILE + 16 + L.y, 46, undefined, 46]);
          } else {
            hole(p.x * TILE + 16 + L.x, p.y * TILE + L.y, 120, 0.95, 10);
            warm.push([p.x * TILE + 16 + L.x, p.y * TILE + L.y, 46, undefined, 22]);
          }
        }
        for (const p of L.map.props) {
          if (p.type !== 'barrelfire') continue;
          if (iso) {
            hole(p.x * TILE + 16 + L.x, p.y * TILE + 16 + L.y, 80, 0.85, 0, true);
            warm.push([p.x * TILE + 16 + L.x, p.y * TILE + 16 + L.y, 30, undefined, 14]);
          } else {
            hole(p.x * TILE + 16 + L.x, p.y * TILE + 4 + L.y, 80, 0.85);
            warm.push([p.x * TILE + 16 + L.x, p.y * TILE + 2 + L.y, 30]);
          }
        }
        for (const L2 of this.layers) { // v0.88.0: the lamps inside a headquarters (the hall is lit, so the lamps show)
          if (L2.map.kind !== 'interior' || hidden.has(L2.map.id)) continue;
          for (const p of L2.map.props) {
            if (p.type !== 'floorlamp' || !p.glow || !this.propVisible(p)) continue;
            if (iso) {
              hole(p.x * TILE + 16 + L2.x, p.y * TILE + 16 + L2.y, 90, 0.9, 0, true);
              warm.push([p.x * TILE + 16 + L2.x, p.y * TILE + 16 + L2.y, 0, p.glow, 36]);
            } else {
              hole(p.x * TILE + 16 + L2.x, p.y * TILE + 8 + L2.y, 90, 0.9);
              warm.push([p.x * TILE + 16 + L2.x, p.y * TILE + 4 + L2.y, 0, p.glow]);
            }
          }
        }
        for (const b of L.map.buildings) {
          if (b.tower && !this.pixel) hole((b.x + b.w / 2) * TILE + L.x, (b.y + b.h) * TILE + L.y, b.w * 18, 0.45, towerHeight(b) * 0.45);
          if (!this.buildingLit(b)) continue;
          const open = iso && b.interior && !hidden.has(b.interior) && this.layers.some((q) => q.map.id === b.interior);
          if (b.interior && (!iso || open)) {
            room(b.x * TILE + L.x, b.y * TILE + L.y, b.w * TILE, b.h * TILE, 0.82);
            if (!iso) fronts.push([b.x * TILE + L.x, (b.y + b.h) * TILE + L.y, b.w * TILE]);
          } else if (iso) {
            // a roofed building: its windows are lit (in the picture) and light falls from the door onto the street
            const dx = (b.door ? b.door.x + 0.5 : b.x + b.w / 2) * TILE + L.x;
            hole(dx, (b.y + b.h) * TILE + 24 + L.y, 30 + b.w * 6, 0.65, 0, true);
          } else hole((b.x + b.w / 2) * TILE + L.x, (b.y + b.h) * TILE + L.y, 30 + b.w * 9, 0.75);
        }
        const lh = L.map.buildings.find((b) => b.round);
        if (lh && g.getFlag('lighthouse_relit')) {
          const lx = (lh.x + lh.w / 2) * TILE + L.x;
          if (iso) {
            const ly = (lh.y + lh.h / 2) * TILE + L.y;
            hole(lx, ly, 160, 1, 170);
            this.beam = { x: lx, y: ly, z: 170 };
          } else {
            hole(lx, lh.y * TILE + L.y, 160, 1, TILE * 3.2 + 14);
            this.beam = { x: lx, y: lh.y * TILE + L.y, z: TILE * 3.2 + 14 };
          }
        }
      }
      if (!this.hidePlayer && !g.player.driving && (g.player.riding === null || g.player.riding === undefined)) hole(g.player.x, g.player.y, 70, 0.55, 14);
      for (const f of g.combat.fx) {
        if (f.type !== 'flash') continue; // v0.44.0: gunfire lights the street
        const fy = iso ? f.y + 18 : f.y; // (a flash sits at chest height)
        const fz = iso ? 18 : 0;
        hole(f.x, fy, 90, 0.9, fz);
        warm.push([f.x, fy, 40, undefined, fz]);
      }
      // police cruisers: flashing red and blue
      for (const c of g.vehicles?.carsOn(map.id) || []) {
        if (!c.chase) continue;
        hole(c.x, c.y, 95, 0.75, 6);
        warm.push([c.x, c.y, 0, Math.floor(this.time * 6) % 2 ? 'red' : 'blue', 10]);
      }
      // every vehicle on the road lights its way
      for (const f of g.transit?.on(map.id) || []) {
        const cs = Math.cos(f.angle);
        const sn = Math.sin(f.angle);
        hole(f.x + cs * (f.len / 2 + 40), f.y + sn * (f.len / 2 + 40), 60, 0.6, 4);
        if (f.kind === 'bus') hole(f.x, f.y, 80, 0.5, 8); // a lit bus interior
      }
      if (map.id === 'starling_flats') this.fieldLights(hole, warm);
      // headlights: a pool of light ahead of the car you're driving
      const car = g.vehicles?.driving();
      if (car) {
        const m = g.content.vehicles.models[car.model];
        const cs = Math.cos(car.angle);
        const sn = Math.sin(car.angle);
        for (const [d, r] of [[m.len / 2 + 30, 55], [m.len / 2 + 80, 75], [m.len / 2 + 140, 90]]) hole(car.x + cs * d, car.y + sn * d, r, 0.85, 4);
        this.headlights = { x: car.x + cs * (m.len / 2), y: car.y + sn * (m.len / 2), z: 4, angle: car.angle };
      } else this.headlights = null;
    } else {
      for (const p of map.props) if (p.type === 'window' || p.type === 'oven' || p.type === 'stove') hole(p.x * TILE + 16, p.y * TILE, 90, 0.8, -30);
      hole(g.player.x, g.player.y, 110, 0.7, 14);
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = !pix;
    this.ctx.drawImage(this.light, 0, 0, W, H, pix ? Math.round(this.blit.x) : 0, pix ? Math.round(this.blit.y) : 0, pix ? W * this.px : this.canvas.width, pix ? H * this.px : this.canvas.height);
    this.ctx.imageSmoothingEnabled = true;
    // warm glow on top (in the pixel look, stepped and dithered like the shadows)
    const glow = pix ? (this.glow ||= document.createElement('canvas')) : null;
    let gc = this.ctx;
    let gk = z;
    if (glow) {
      if (glow.width !== W || glow.height !== H) { glow.width = W; glow.height = H; }
      gc = glow.getContext('2d');
      gc.globalCompositeOperation = 'source-over';
      gc.clearRect(0, 0, W, H);
      gk = z * LS;
    }
    const gpos = (wx, wy, wz = 0) => (glow ? at(wx, wy, wz) : this.toScreen(wx, wy, wz));
    gc.globalCompositeOperation = 'lighter';
    for (const [wx, wy, r0, tint, wz] of warm) {
      const s = gpos(wx, wy, wz);
      const r = tint === 'red' || tint === 'blue' ? 110 : tint ? 70 : r0;
      const rgb = tint === 'red' ? '255,40,40' : tint === 'blue' ? '60,110,255' : tint || '255,190,90';
      if (glow) {
        const sp = lightSprite(r * gk, 1, rgb, 6);
        gc.globalAlpha = Math.min(1, (tint ? 0.5 : 0.3) * g.clock.darkness);
        gc.drawImage(sp, s.x - (sp.width >> 1), s.y - (sp.height >> 1));
        gc.globalAlpha = 1;
        continue;
      }
      const grad = gc.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * gk);
      ramp(grad, (tint ? 0.5 : 0.3) * g.clock.darkness, rgb);
      gc.fillStyle = grad;
      gc.beginPath();
      gc.arc(s.x, s.y, r * gk, 0, Math.PI * 2);
      gc.fill();
    }
    // v0.51.0: a lit building's light falls out of its front onto the pavement
    for (const [wx, wy, ww] of fronts) {
      const s = gpos(wx, wy);
      const grad = gc.createLinearGradient(0, s.y, 0, s.y + 26 * gk);
      grad.addColorStop(0, `rgba(255,200,120,${0.22 * g.clock.darkness})`);
      grad.addColorStop(1, 'rgba(255,200,120,0)');
      gc.fillStyle = grad;
      gc.fillRect(s.x, s.y, ww * gk, 26 * gk);
    }
    if (glow) {
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(glow, 0, 0, W, H, Math.round(this.blit.x), Math.round(this.blit.y), W * this.px, H * this.px);
      this.ctx.imageSmoothingEnabled = true;
    }
    if (this.headlights && outdoor) {
      const s = this.toScreen(this.headlights.x, this.headlights.y, this.headlights.z);
      const len = 230 * z;
      // the cone's direction on screen (in the iso view the world angle is projected)
      const ha = iso ? Math.atan2((Math.sin(this.headlights.angle) + Math.cos(this.headlights.angle)) / 2, Math.cos(this.headlights.angle) - Math.sin(this.headlights.angle)) : this.headlights.angle;
      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
      grad.addColorStop(0, `rgba(255,245,200,${0.3 * g.clock.darkness})`);
      grad.addColorStop(1, 'rgba(255,245,200,0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.arc(s.x, s.y, len, ha - 0.42, ha + 0.42);
      this.ctx.closePath();
      this.ctx.fill();
    }
    if (this.beam) {
      // the restored lighthouse's sweeping beam
      const s = this.toScreen(this.beam.x, this.beam.y, this.beam.z);
      const ang = this.time * 0.6;
      const len = 900 * z;
      for (const a of [ang, ang + Math.PI]) {
        const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
        grad.addColorStop(0, `rgba(255,240,180,${0.45 * g.clock.darkness})`);
        grad.addColorStop(1, 'rgba(255,240,180,0)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(s.x, s.y);
        this.ctx.arc(s.x, s.y, len, a - 0.09, a + 0.09);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /** Screen-space text: names, moods, speech bubbles. */
  drawOverlays(map) {
    const g = this.game;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = this.dpr;
    const layerOf = new Map(this.layers.map((l) => [l.map.id, l]));
    for (const npc of g.npcs.values()) {
      const L = layerOf.get(npc.map);
      if (!L || npc.riding != null) continue;
      if (this.isoNow && this.hiddenMaps.has(npc.map)) continue; // inside a roofed building: nobody sees the tag
      const near = dist(npc.x + L.x, npc.y + L.y, g.player.x, g.player.y) < TILE * 4.5;
      const lying = isDown(npc, g.clock.total);
      const tagZ = lying ? 26 : (this.pixel ? 30 : 52) * (npc.profile.appearance.height || 1); // v0.46.0: the pixel people are smaller
      if (this.isoNow && this.tagHidden(npc.x + L.x, npc.y + L.y, tagZ)) continue; // behind a building that hides them: so does their tag
      const s = this.toScreen(npc.x + L.x, npc.y + L.y, tagZ);
      if (near || npc.bubble) {
        const mood = g.moodOf(npc);
        const icon = g.content.moods[mood]?.icon || '';
        const label = `${npc.profile.shortName}${icon ? ' ' + icon : ''}${npc.activity === 'sleep' ? ' z' : ''}`;
        ctx.font = `bold ${11 * dpr}px ${FONT}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(28,22,38,0.62)';
        rrect(ctx, s.x - tw / 2 - 5 * dpr, s.y - 8 * dpr, tw + 10 * dpr, 15 * dpr, 7 * dpr);
        ctx.fill();
        ctx.fillStyle = '#fff6e0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, s.x, s.y);
      }
      if (npc.activity === 'sleep') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = `bold ${(10 + Math.sin(this.time * 2) * 2) * dpr}px ${FONT}`;
        const zs = this.toScreen(npc.x + L.x + 10, npc.y + L.y, (this.pixel ? 28 : 46) + ((this.time * 8) % 10));
        ctx.fillText('z', zs.x, zs.y);
      }
      const bar = g.combat.healthBar(npc);
      if (bar) this.drawHealthBar(npc, bar, s, dpr, near || npc.bubble);
      if (npc.bubble && g.realTime < npc.bubble.until) this.drawBubble(npc.bubble.text, s.x, s.y - (bar ? 30 : 14) * dpr);
      else if (npc.chat && !npc.bubble) this.drawBubble('…', s.x, s.y - 14 * dpr);
    }
    // floating damage numbers
    for (const f of g.combat.fx) {
      if (f.type !== 'damage') continue;
      const age = g.realTime - f.start;
      const fs = this.isoNow ? this.toScreen(f.x, f.y + 46, 46 + age * 30) : this.toScreen(f.x, f.y, age * 30); // (f.y is 46 px above the feet)
      ctx.globalAlpha = Math.max(0, 1 - age / 0.9);
      ctx.font = `bold ${14 * dpr}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(30,20,30,0.85)';
      ctx.strokeText(`-${f.amount}`, fs.x, fs.y);
      ctx.fillStyle = f.player ? '#ff6a5a' : '#ffe08a';
      ctx.fillText(`-${f.amount}`, fs.x, fs.y);
      ctx.globalAlpha = 1;
    }
    // an officer is cuffing the player
    const pulled = g.pursuit?.progress() || 0;
    const cuff = Math.max(g.police?.cuffProgress() || 0, pulled);
    if (cuff > 0) {
      const s = this.toScreen(g.player.x, g.player.y, -16); // under the feet, clear of name tags
      const bw = 56 * dpr;
      ctx.fillStyle = 'rgba(20,20,30,0.8)';
      ctx.fillRect(s.x - bw / 2 - 2 * dpr, s.y - 2 * dpr, bw + 4 * dpr, 9 * dpr);
      ctx.fillStyle = Math.floor(this.time * 6) % 2 ? '#ff4a4a' : '#4a7aff';
      ctx.fillRect(s.x - bw / 2, s.y, bw * cuff, 5 * dpr);
      ctx.font = `bold ${10 * dpr}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(pulled && g.player.driving ? 'PULLED OVER — drive!' : 'BEING CUFFED — run!', s.x, s.y + 18 * dpr);
    }
    // red vignette when the player is hurt
    const hurt = g.player.hurtAt ? Math.max(0, 1 - (g.realTime - g.player.hurtAt) / 0.6) : 0;
    const low = g.player.health < 30 ? 0.25 + Math.sin(this.time * 4) * 0.08 : 0;
    const vig = Math.max(hurt * 0.55, low);
    if (vig > 0.01) {
      const W = this.canvas.width;
      const H = this.canvas.height;
      const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      grad.addColorStop(0, 'rgba(160,0,0,0)');
      grad.addColorStop(1, `rgba(160,0,0,${vig})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    // interaction prompt marker above the player
    if (this.highlight) {
      const s = this.toScreen(g.player.x, g.player.y, this.pixel ? 32 : 54);
      const bounce = Math.sin(this.time * 5) * 2 * dpr;
      ctx.fillStyle = '#ffe9a6';
      ctx.beginPath();
      ctx.moveTo(s.x - 5 * dpr, s.y - 6 * dpr + bounce);
      ctx.lineTo(s.x + 5 * dpr, s.y - 6 * dpr + bounce);
      ctx.lineTo(s.x, s.y + bounce);
      ctx.closePath();
      ctx.fill();
    }
    ctx.textAlign = 'left';
  }

  /** Health bar (and name, if the tag isn't already shown) above an NPC's head. */
  drawHealthBar(npc, bar, s, dpr, tagShown) {
    const ctx = this.ctx;
    const w = 54 * dpr;
    const h = 7 * dpr;
    const x = s.x - w / 2;
    const y = s.y - 20 * dpr;
    if (!tagShown) {
      ctx.font = `bold ${10 * dpr}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(28,22,38,0.8)';
      ctx.strokeText(npc.profile.shortName, s.x, y - 2 * dpr);
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(npc.profile.shortName, s.x, y - 2 * dpr);
    }
    ctx.fillStyle = 'rgba(20,14,24,0.8)';
    rrect(ctx, x - 2 * dpr, y - 2 * dpr, w + 4 * dpr, h + 4 * dpr, 4 * dpr);
    ctx.fill();
    const f = bar.frac;
    ctx.fillStyle = bar.hurt ? '#ffffff' : f > 0.6 ? '#5fbf6a' : f > 0.3 ? '#e8b64c' : '#d9534a';
    if (f > 0) { rrect(ctx, x, y, Math.max(2, w * f), h, 3 * dpr); ctx.fill(); }
    if (npc.downUntil && this.game.clock.total < npc.downUntil) {
      ctx.font = `bold ${9 * dpr}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff6e0';
      ctx.fillText('KNOCKED OUT', s.x, y + h + 3 * dpr);
    }
    ctx.textBaseline = 'middle';
  }

  drawBubble(text, x, y) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    ctx.font = `${12 * dpr}px ${FONT}`;
    const maxW = 190 * dpr;
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    const lh = 15 * dpr;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14 * dpr;
    const bh = lines.length * lh + 10 * dpr;
    const bx = x - bw / 2;
    const by = y - bh;
    ctx.fillStyle = 'rgba(255,251,240,0.96)';
    ctx.strokeStyle = 'rgba(60,45,40,0.55)';
    ctx.lineWidth = 1.5 * dpr;
    rrect(ctx, bx, by, bw, bh, 8 * dpr);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5 * dpr, by + bh - 1);
    ctx.lineTo(x, by + bh + 7 * dpr);
    ctx.lineTo(x + 5 * dpr, by + bh - 1);
    ctx.fill();
    ctx.fillStyle = '#2d2433';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, by + 5 * dpr + i * lh));
    ctx.textAlign = 'left';
  }
}
