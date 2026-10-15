// Canvas renderer: camera, y-sorted world drawing, speech bubbles, interaction
// highlight and day/night lighting. Reads game state; never mutates it.
import { TILE, clamp, lerp, dist } from '../core/util.js';
import { buildStaticLayer, drawBuilding, drawProp, drawWaterShimmer, FLAT_PROPS, towerHeight } from './drawWorld.js';
import { drawCar, drawBus } from './drawVehicles.js';
import { drawCharacter, rrect } from './drawCharacter.js';
import { check } from '../sim/conditions.js';
import { isDown } from '../systems/combat.js';
import { drawWrath, wrathCamera, wrathLift, wrathPlayerAlpha } from './wrath.js';
import { inWindow } from '../world/clock.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const LIGHT_SCALE = 0.25; // the light map is soft, so it is rendered at quarter resolution and upscaled

export class Renderer {
  constructor(canvas, game, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.assets = assets;
    this.cam = { x: 0, y: 0, zoom: 2 };
    this.staticLayers = new WeakMap(); // keyed by GameMap object: rebuilt maps get fresh layers
    this.light = document.createElement('canvas');
    this.layers = [];
    this.time = 0;
    this.highlight = null;
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
    const fit = Math.min(window.innerWidth / (22 * TILE), window.innerHeight / (13.5 * TILE));
    this.baseZoom = clamp(fit, 1.1, 2.4) * dpr;
  }

  staticLayer(map) {
    if (!this.staticLayers.has(map)) {
      this.staticLayers.set(map, buildStaticLayer(map, (w, h) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
      }));
    }
    return this.staticLayers.get(map);
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
    const zoom = this.baseZoom * (map.kind === 'interior' ? 1.15 : 1);
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
    let tx = g.player.x - vw / 2;
    let ty = g.player.y - 16 - vh / 2;
    tx = mw <= vw ? minX + (mw - vw) / 2 : clamp(tx, minX, maxX - vw);
    ty = mh <= vh ? minY + (mh - vh) / 2 : clamp(ty, minY - TILE, maxY - vh);
    const wr = g.combat.wrath;
    if (wr) {
      const c = wrathCamera(g, wr, vw, vh, zoom);
      this.cam.zoom = c.zoom;
      this.cam.x = c.x;
      this.cam.y = c.y;
      this.view = { x: c.x, y: c.y, w: this.canvas.width / c.zoom, h: this.canvas.height / c.zoom };
      return;
    }
    if (this.cam.snap || this.cam.mapId !== map.id) {
      this.cam.x = tx;
      this.cam.y = ty;
      this.cam.snap = false;
      this.cam.mapId = map.id;
    } else {
      const k = 1 - Math.exp(-dt * 8);
      this.cam.x = lerp(this.cam.x, tx, k);
      this.cam.y = lerp(this.cam.y, ty, k);
    }
    this.view = { x: this.cam.x, y: this.cam.y, w: vw, h: vh };
  }

  /** Called when the player walks across a seam: keep the view continuous. */
  seamlessShift(fromId, toId) {
    const off = this.game.mapOffset(fromId, toId);
    if (!off) return this.snapCamera();
    this.cam.x -= off.x;
    this.cam.y -= off.y;
    this.cam.mapId = toId;
  }

  toScreen(wx, wy) {
    return { x: (wx - this.cam.x) * this.cam.zoom, y: (wy - this.cam.y) * this.cam.zoom };
  }

  render(dt) {
    this.time += dt;
    const g = this.game;
    const ctx = this.ctx;
    const map = g.currentMap();
    this.layers = [{ map, x: 0, y: 0 }, ...(map.kind === 'interior' ? [] : g.neighbors(map.id))];
    this.updateCamera(dt);
    const { zoom } = this.cam;
    const v = this.view;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = map.kind === 'interior' ? '#1b1620' : '#2d6f8f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // explosions shake the camera
    const shake = g.heavy && g.realTime < g.heavy.shakeUntil ? (g.heavy.shakeUntil - g.realTime) * 14 : 0;
    const shx = shake ? (Math.random() - 0.5) * shake : 0;
    const shy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(zoom, 0, 0, zoom, (-this.cam.x + shx) * zoom, (-this.cam.y + shy) * zoom);
    ctx.imageSmoothingEnabled = true;

    const night = g.clock.darkness > 0.45;
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
      const layer = this.staticLayer(lm);
      const sx = Math.max(0, Math.floor(lv.x));
      const sy = Math.max(0, Math.floor(lv.y));
      const sw = Math.min(layer.width - sx, Math.ceil(lv.w) + 2);
      const sh = Math.min(layer.height - sy, Math.ceil(lv.h) + 2);
      if (sw > 0 && sh > 0) ctx.drawImage(layer, sx, sy, sw, sh, sx + L.x, sy + L.y, sw, sh);
      at(() => {
        if (lm.kind !== 'interior') drawWaterShimmer(ctx, lm, lv, this.time);
        if (lm.id === 'lanternside' && g.getFlag('canal_slick')) this.drawCanalSlick(ctx, lm, lv);
        for (const p of lm.props) {
          if (!FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
          if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE)) continue;
          drawProp(ctx, p, { time: this.time, night, state: g.world.props[p.id], jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime, berth: p.type === 'shipberth' ? g.logistics.docks.at(p.slot) : null, slip: p.type === 'slipway' ? g.logistics.slip() : null });
        }
        if (g.vehicles?.skids?.length) this.drawSkids(ctx, lm.id);
        if (lm.id === g.player.map && g.heavy?.decals.length) this.drawScorch(ctx, g.heavy.decals.filter((d) => d.map === lm.id));
      })();
      for (const b of lm.buildings) {
        const above = b.tower ? towerHeight(b) / TILE : 4;
        if (!inView(b.x * TILE, (b.y - above) * TILE, b.w * TILE, (b.h + above) * TILE)) continue;
        const door = lm.doors.find((d) => d.building === b.id);
        items.push({ y: (b.y + b.h) * TILE + L.y, draw: at(() => drawBuilding(ctx, b, { lit: this.buildingLit(b), night, time: this.time, lampLit: Boolean(g.getFlag('lighthouse_relit')), doorLocked: door && !g.playerCanPass(door) })) });
      }
      for (const p of lm.props) {
        if (FLAT_PROPS.has(p.type) || !this.propVisible(p)) continue;
        if (!inView(p.x * TILE, p.y * TILE, p.w * TILE, p.h * TILE)) continue;
        // sortRow lets an actor stand "inside" a prop (Mason in the excavator cab)
        const tallY = p.sortRow !== undefined ? p.sortRow * TILE : p.type === 'tree' || p.type === 'pine' || p.type === 'streetlamp' ? (p.y + 1) * TILE - 2 : (p.y + p.h) * TILE - 1;
        const active = p.animateWhen ? check(p.animateWhen, g) : true;
        items.push({ y: tallY + L.y, draw: at(() => drawProp(ctx, p, { time: this.time, night, state: g.world.props[p.id], active, jailDig: g.world.police?.jail?.dig, clock: g.clock.total, realTime: g.realTime })) });
      }
      for (const npc of g.npcs.values()) {
        if (npc.map !== lm.id) continue;
        if (!inView(npc.x - 20, npc.y - 50, 40, 60)) continue;
        if (isDown(npc, g.clock.total)) {
          items.push({ y: npc.y + L.y - 20, draw: at(() => this.drawLying(npc)) });
          continue;
        }
        const nw = npc.hostile?.mode === 'fight' && npc.profile.combat?.weapon ? g.content.items[npc.profile.combat.weapon]?.weapon?.held : null;
        const app = nw ? { ...npc.profile.appearance, holding: nw } : npc.profile.appearance;
        const lift = g.combat.wrath?.npcId === npc.id ? wrathLift(g, g.combat.wrath) : 0;
        items.push({ y: npc.y + L.y, draw: at(() => this.drawActor(app, lift ? { ...npc, y: npc.y - lift, moving: false } : npc, npc.activity === 'sleep')) });
      }
      // cars (src/systems/vehicles.js)
      if (g.vehicles) {
        const models = g.content.vehicles.models;
        for (const car of g.vehicles.carsOn(lm.id)) {
          const m = models[car.model];
          if (!inView(car.x - m.len / 2, car.y - m.len / 2, m.len, m.len)) continue;
          const driven = car.id === g.player.driving;
          items.push({ y: car.y + L.y + Math.abs(Math.sin(car.angle)) * m.len * 0.4 + 4, draw: at(() => drawCar(ctx, m, car.x, car.y, car.angle, { color: car.color, id: car.id, braking: driven && car.braking, lit: (driven || Boolean(car.chase)) && night, time: this.time, siren: Boolean(car.chase), wheel: car.wheel })) });
        }
      }
      // the bus and the traffic (src/systems/transit.js)
      if (g.transit) {
        const models = g.content.vehicles.models;
        for (const f of g.transit.on(lm.id)) {
          if (!inView(f.x - f.len / 2, f.y - f.len / 2, f.len, f.len)) continue;
          const sortY = f.y + L.y + Math.abs(Math.sin(f.angle)) * f.len * 0.4 + 4;
          const braking = f.speed < f.max * 0.3;
          if (f.kind === 'bus') items.push({ y: sortY, draw: at(() => drawBus(ctx, f.x, f.y, f.angle, { len: f.len, wid: f.wid, color: f.color, lit: night, braking })) });
          else items.push({ y: sortY, draw: at(() => drawCar(ctx, models[f.model], f.x, f.y, f.angle, { color: f.color, id: f.id, lit: night, braking })) });
        }
      }
    }
    const held = g.combat.equipped().weapon.held;
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
    this.drawLighting(map);
    this.drawOverlays(map);
  }

  /** True when a building drawn in front of the player covers them. */
  playerOccluded(map) {
    const p = this.game.player;
    for (const b of map.buildings) {
      const bottom = (b.y + b.h) * TILE;
      if (p.y >= bottom) continue;
      const top = b.tower ? bottom - towerHeight(b) : b.round ? b.y * TILE - TILE * 4.5 : b.y * TILE - TILE * 0.6;
      if (p.x > b.x * TILE - 8 && p.x < (b.x + b.w) * TILE + 8 && p.y > top && p.y - 40 < bottom) return true;
    }
    return false;
  }

  /** Oily rainbow sheen on the Lantern Canal (rows 22–23) after the pipeline leaks. */
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
    for (const f of g.combat.fx) {
      const k = 1 - (t - f.start) / Math.max(0.001, f.until - f.start);
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
    if (w.weapon.kind === 'gun' && !g.paused) {
      const d = g.combat.aimVector(w);
      ctx.strokeStyle = 'rgba(255,90,70,0.45)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x + d.x * 16, p.y - 18 + d.y * 16); ctx.lineTo(p.x + d.x * 70, p.y - 18 + d.y * 70); ctx.stroke();
      ctx.setLineDash([]);
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

  drawActor(appearance, actor, sleeping) {
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
      if (actor.facing === 'left') {
        this.ctx.translate(actor.x, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(img, -w / 2, actor.y - h - bob, w, h);
      } else this.ctx.drawImage(img, actor.x - w / 2, actor.y - h - bob, w, h);
      this.ctx.restore();
      return;
    }
    // flinch when hit
    const shake = actor.hurtAt && this.game.realTime - actor.hurtAt < 0.2 ? Math.sin(this.game.realTime * 90) * 2 : 0;
    drawCharacter(this.ctx, appearance, {
      x: actor.x + shake,
      y: actor.y,
      facing: actor.facing,
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

  drawHighlight(ctx) {
    const h = this.highlight;
    if (!h) return;
    const pulse = 0.5 + Math.sin(this.time * 6) * 0.5;
    ctx.strokeStyle = `rgba(255,236,160,${0.55 + pulse * 0.4})`;
    ctx.lineWidth = 2;
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
    const outdoor = map.kind !== 'interior';
    const dark = outdoor ? g.clock.darkness * 0.72 : 0.12 + g.clock.darkness * 0.2;
    if (dark < 0.02) return;
    const lc = this.light.getContext('2d');
    const W = this.light.width;
    const H = this.light.height;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = outdoor ? `rgba(14,18,48,${dark})` : `rgba(30,20,10,${dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const z = this.cam.zoom;
    const hole = (wx, wy, r, strength = 1) => {
      const sc = this.toScreen(wx, wy);
      const s = { x: sc.x * LIGHT_SCALE, y: sc.y * LIGHT_SCALE };
      const rad = r * z * LIGHT_SCALE;
      if (s.x < -rad || s.y < -rad || s.x > W + rad || s.y > H + rad) return;
      const grad = lc.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
      grad.addColorStop(0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(s.x, s.y, rad, 0, Math.PI * 2);
      lc.fill();
    };
    const warm = [];
    if (outdoor) {
      this.beam = null;
      for (const L of this.layers) {
        for (const p of L.map.props) {
          if (p.type !== 'streetlamp') continue;
          hole(p.x * TILE + 16 + L.x, p.y * TILE - 10 + L.y, 120, 0.95);
          warm.push([p.x * TILE + 16 + L.x, p.y * TILE - 22 + L.y, 46]);
        }
        for (const p of L.map.props) {
          if (p.type !== 'barrelfire') continue;
          hole(p.x * TILE + 16 + L.x, p.y * TILE + 4 + L.y, 80, 0.85);
          warm.push([p.x * TILE + 16 + L.x, p.y * TILE + 2 + L.y, 30]);
        }
        for (const b of L.map.buildings) {
          if (b.tower) hole((b.x + b.w / 2) * TILE + L.x, (b.y + b.h) * TILE - towerHeight(b) * 0.45 + L.y, b.w * 18, 0.45);
          if (!this.buildingLit(b)) continue;
          hole((b.x + b.w / 2) * TILE + L.x, (b.y + b.h) * TILE + L.y, 30 + b.w * 9, 0.75);
        }
        const lh = L.map.buildings.find((b) => b.round);
        if (lh && g.getFlag('lighthouse_relit')) {
          const lx = (lh.x + lh.w / 2) * TILE + L.x;
          const ly = lh.y * TILE - TILE * 3.2 - 14 + L.y;
          hole(lx, ly, 160, 1);
          this.beam = { x: lx, y: ly };
        }
      }
      if (!this.hidePlayer && !g.player.driving && (g.player.riding === null || g.player.riding === undefined)) hole(g.player.x, g.player.y - 14, 70, 0.55);
      // police cruisers: flashing red and blue
      for (const c of g.vehicles?.carsOn(map.id) || []) {
        if (!c.chase) continue;
        hole(c.x, c.y - 6, 95, 0.75);
        warm.push([c.x, c.y - 10, 0, Math.floor(this.time * 6) % 2 ? 'red' : 'blue']);
      }
      // every vehicle on the road lights its way
      for (const f of g.transit?.on(map.id) || []) {
        const cs = Math.cos(f.angle);
        const sn = Math.sin(f.angle);
        hole(f.x + cs * (f.len / 2 + 40), f.y + sn * (f.len / 2 + 40) - 4, 60, 0.6);
        if (f.kind === 'bus') hole(f.x, f.y - 8, 80, 0.5); // a lit bus interior
      }
      // headlights: a pool of light ahead of the car you're driving
      const car = g.vehicles?.driving();
      if (car) {
        const m = g.content.vehicles.models[car.model];
        const cs = Math.cos(car.angle);
        const sn = Math.sin(car.angle);
        for (const [d, r] of [[m.len / 2 + 30, 55], [m.len / 2 + 80, 75], [m.len / 2 + 140, 90]]) hole(car.x + cs * d, car.y + sn * d - 4, r, 0.85);
        this.headlights = { x: car.x + cs * (m.len / 2), y: car.y + sn * (m.len / 2) - 4, angle: car.angle };
      } else this.headlights = null;
    } else {
      for (const p of map.props) if (p.type === 'window' || p.type === 'oven' || p.type === 'stove') hole(p.x * TILE + 16, p.y * TILE + 30, 90, 0.8);
      hole(g.player.x, g.player.y - 14, 110, 0.7);
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(this.light, 0, 0, W, H, 0, 0, this.canvas.width, this.canvas.height);
    // warm glow on top
    this.ctx.globalCompositeOperation = 'lighter';
    for (const [wx, wy, r0, tint] of warm) {
      const s = this.toScreen(wx, wy);
      const r = tint ? 110 : r0;
      const rgb = tint === 'red' ? '255,40,40' : tint === 'blue' ? '60,110,255' : '255,190,90';
      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * z);
      grad.addColorStop(0, `rgba(${rgb},${(tint ? 0.5 : 0.28) * g.clock.darkness})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, r * z, 0, Math.PI * 2);
      this.ctx.fill();
    }
    if (this.headlights && outdoor) {
      const s = this.toScreen(this.headlights.x, this.headlights.y);
      const len = 230 * z;
      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, len);
      grad.addColorStop(0, `rgba(255,245,200,${0.3 * g.clock.darkness})`);
      grad.addColorStop(1, 'rgba(255,245,200,0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(s.x, s.y);
      this.ctx.arc(s.x, s.y, len, this.headlights.angle - 0.42, this.headlights.angle + 0.42);
      this.ctx.closePath();
      this.ctx.fill();
    }
    if (this.beam) {
      // the restored lighthouse's sweeping beam
      const s = this.toScreen(this.beam.x, this.beam.y);
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
      if (!L) continue;
      const near = dist(npc.x + L.x, npc.y + L.y, g.player.x, g.player.y) < TILE * 4.5;
      const lying = isDown(npc, g.clock.total);
      const s = this.toScreen(npc.x + L.x, npc.y + L.y - (lying ? 26 : 52 * (npc.profile.appearance.height || 1)));
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
        const zs = this.toScreen(npc.x + L.x + 10, npc.y + L.y - 46 - ((this.time * 8) % 10));
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
      const fs = this.toScreen(f.x, f.y - age * 30);
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
      const s = this.toScreen(g.player.x, g.player.y + 16); // under the feet, clear of name tags
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
      const s = this.toScreen(g.player.x, g.player.y - 54);
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
