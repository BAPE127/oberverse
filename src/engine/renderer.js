// Canvas renderer: camera, y-sorted world drawing, speech bubbles, interaction
// highlight and day/night lighting. Reads game state; never mutates it.
import { TILE, clamp, lerp, dist } from '../core/util.js';
import { buildStaticLayer, drawBuilding, drawProp, drawWaterShimmer, FLAT_PROPS, towerHeight } from './drawWorld.js';
import { drawCharacter, rrect } from './drawCharacter.js';
import { check } from '../sim/conditions.js';
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
    ctx.setTransform(zoom, 0, 0, zoom, -this.cam.x * zoom, -this.cam.y * zoom);
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
          drawProp(ctx, p, { time: this.time, night, state: g.world.props[p.id] });
        }
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
        items.push({ y: tallY + L.y, draw: at(() => drawProp(ctx, p, { time: this.time, night, state: g.world.props[p.id], active })) });
      }
      for (const npc of g.npcs.values()) {
        if (npc.map !== lm.id) continue;
        if (!inView(npc.x - 20, npc.y - 50, 40, 60)) continue;
        items.push({ y: npc.y + L.y, draw: at(() => this.drawActor(npc.profile.appearance, npc, npc.activity === 'sleep')) });
      }
    }
    if (!this.hidePlayer) items.push({ y: g.player.y, draw: () => this.drawActor(g.player.appearance, g.player, false) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    if (!this.hidePlayer && this.playerOccluded(map)) {
      ctx.globalAlpha = 0.38;
      this.drawActor(g.player.appearance, g.player, false);
      ctx.globalAlpha = 1;
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
    drawCharacter(this.ctx, appearance, {
      x: actor.x,
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
      if (!this.hidePlayer) hole(g.player.x, g.player.y - 14, 70, 0.55);
    } else {
      for (const p of map.props) if (p.type === 'window' || p.type === 'oven' || p.type === 'stove') hole(p.x * TILE + 16, p.y * TILE + 30, 90, 0.8);
      hole(g.player.x, g.player.y - 14, 110, 0.7);
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(this.light, 0, 0, W, H, 0, 0, this.canvas.width, this.canvas.height);
    // warm glow on top
    this.ctx.globalCompositeOperation = 'lighter';
    for (const [wx, wy, r] of warm) {
      const s = this.toScreen(wx, wy);
      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * z);
      grad.addColorStop(0, `rgba(255,190,90,${0.28 * g.clock.darkness})`);
      grad.addColorStop(1, 'rgba(255,190,90,0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, r * z, 0, Math.PI * 2);
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
      const s = this.toScreen(npc.x + L.x, npc.y + L.y - 52 * (npc.profile.appearance.height || 1));
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
      if (npc.bubble && g.realTime < npc.bubble.until) this.drawBubble(npc.bubble.text, s.x, s.y - 14 * dpr);
      else if (npc.chat && !npc.bubble) this.drawBubble('…', s.x, s.y - 14 * dpr);
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
