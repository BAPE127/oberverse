// Minimap and full map rendering (DOM canvases).
import { TILE } from '../core/util.js';
import { TILE_TYPES } from '../world/tiles.js';
import { BUILDING_ICONS } from '../content/mapIcons.js';
import { worldLayout } from '../world/layout.js';
const BASE = 8; // px per tile of the cached map images the world map scales

const MINI_SCALE = 4;

function tileColor(map, ch) {
  if (ch === 'B') return '#5b4a45';
  if (ch === 'D') return '#e8b64c';
  if (ch === 'W') return map.kind === 'interior' ? '#5b4a45' : TILE_TYPES.W.color;
  return TILE_TYPES[ch]?.color || '#000';
}

export class MapRenderer {
  constructor(game) {
    this.game = game;
    this.cache = new WeakMap(); // GameMap -> Map(scale -> canvas); rebuilt maps redraw
  }

  base(map, scale) {
    if (!this.cache.has(map)) this.cache.set(map, new Map());
    const byScale = this.cache.get(map);
    if (byScale.has(scale)) return byScale.get(scale);
    const c = document.createElement('canvas');
    c.width = map.width * scale;
    c.height = map.height * scale;
    const ctx = c.getContext('2d');
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        ctx.fillStyle = tileColor(map, map.tileAt(x, y));
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    for (const b of map.buildings) {
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x * scale, b.y * scale, b.w * scale, (b.h - 1) * scale);
    }
    for (const p of map.props) {
      if (!['tree', 'pine', 'fountain'].includes(p.type) && map.kind !== 'interior') continue;
      ctx.fillStyle = p.type === 'fountain' ? '#5aa0c0' : map.kind === 'interior' ? '#8a6142' : '#3f6f3c';
      ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
    }
    byScale.set(scale, c);
    return c;
  }

  markers(map) {
    const g = this.game;
    const out = [];
    for (const npc of g.npcs.values()) {
      if (npc.map !== map.id) continue;
      out.push({ x: npc.x / TILE, y: npc.y / TILE, color: npc.met ? npc.profile.appearance.accent || '#c0614a' : '#9a9a9a', label: npc.met ? npc.profile.shortName[0] : '?', kind: 'npc' });
    }
    for (const m of g.questMarkers()) if (m.map === map.id) out.push({ x: m.x, y: m.y, color: '#e8b64c', kind: 'quest' });
    // police cruisers in pursuit, flashing
    for (const c of g.vehicles?.carsOn(map.id) || []) if (c.chase) out.push({ x: c.x / TILE, y: c.y / TILE, color: Math.floor(performance.now() / 250) % 2 ? '#ff3a3a' : '#3a6aff', label: 'P', kind: 'npc' });
    return out;
  }

  /** The current map plus its seamless neighbours, with tile offsets. */
  layers(map) {
    const g = this.game;
    return [{ map, x: 0, y: 0 }, ...(map.kind === 'interior' ? [] : g.neighbors(map.id).map((n) => ({ map: n.map, x: n.x / TILE, y: n.y / TILE })))];
  }

  drawMinimap(canvas) {
    const g = this.game;
    const map = g.currentMap();
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const scale = map.kind === 'interior' ? Math.floor(Math.min(W / map.width, H / map.height)) : MINI_SCALE;
    const px = (g.player.x / TILE) * scale;
    const py = (g.player.y / TILE) * scale;
    let ox = Math.round(W / 2 - px);
    let oy = Math.round(H / 2 - py);
    if (map.kind === 'interior') {
      const base = this.base(map, scale);
      ox = Math.round((W - base.width) / 2);
      oy = Math.round((H - base.height) / 2);
    }
    ctx.fillStyle = map.kind === 'interior' ? '#1b1620' : TILE_TYPES['~'].color;
    ctx.fillRect(0, 0, W, H);
    for (const L of this.layers(map)) {
      ctx.drawImage(this.base(L.map, scale), ox + L.x * scale, oy + L.y * scale);
      for (const m of this.markers(L.map)) this.marker(ctx, ox + (m.x + L.x) * scale, oy + (m.y + L.y) * scale, m, 1);
    }
    this.playerArrow(ctx, ox + px, oy + py, g.player.facing, 1);
    if (g.clock.darkness > 0.2) {
      ctx.fillStyle = `rgba(14,18,48,${g.clock.darkness * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  marker(ctx, x, y, m, s) {
    if (m.kind === 'quest') {
      ctx.fillStyle = m.color;
      ctx.strokeStyle = '#2d2433';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3 * s : 7 * s;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.fillStyle = m.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (s > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${8 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, x, y + 0.5);
    }
  }

  playerArrow(ctx, x, y, facing, s) {
    const ang = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[facing] || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2d2433';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8 * s, 0);
    ctx.lineTo(-5 * s, -6 * s);
    ctx.lineTo(-2 * s, 0);
    ctx.lineTo(-5 * s, 6 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Full map with fog over undiscovered areas, labels and markers. For an
   * outdoor map, its whole region (all seamless neighbours) is drawn as one.
   */
  /** Every map in an outdoor map's region, with tile offsets (for the full map). */
  regionLayers(map) {
    const g = this.game;
    if (map.kind === 'interior') return [{ map, x: 0, y: 0 }];
    const region = Object.values(g.content.regions || {}).find((r) => r.maps[map.id]);
    if (!region) return this.layers(map);
    const me = region.maps[map.id];
    return Object.entries(region.maps).filter(([id]) => g.maps.has(id)).map(([id, o]) => ({ map: g.maps.get(id), x: o.x - me.x, y: o.y - me.y }));
  }

  drawWorldMap(canvas, mapId) {
    const g = this.game;
    const map = g.maps.get(mapId);
    const layers = this.regionLayers(map);
    const scale = map.kind === 'interior' ? 24 : layers.length > 1 ? 8 : 10;
    const minX = Math.min(...layers.map((l) => l.x));
    const minY = Math.min(...layers.map((l) => l.y));
    const maxX = Math.max(...layers.map((l) => l.x + l.map.width));
    const maxY = Math.max(...layers.map((l) => l.y + l.map.height));
    canvas.width = (maxX - minX) * scale;
    canvas.height = (maxY - minY) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = map.kind === 'interior' ? '#1b1620' : TILE_TYPES['~'].color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const disc = g.player.discovered.areas;
    const s = scale / 6;
    for (const L of layers) {
      const lx = (L.x - minX) * scale;
      const ly = (L.y - minY) * scale;
      ctx.drawImage(this.base(L.map, scale), lx, ly);
      ctx.save();
      ctx.translate(lx, ly);
      for (const a of L.map.areas) {
        if (disc[a.id]) continue;
        ctx.fillStyle = 'rgba(30,26,40,0.78)';
        ctx.fillRect(a.x * scale, a.y * scale, a.w * scale, a.h * scale);
        ctx.fillStyle = 'rgba(255,246,224,0.5)';
        ctx.font = `italic ${scale * 1.4}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('unexplored', (a.x + a.w / 2) * scale, (a.y + a.h / 2) * scale);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of L.map.buildings) {
        const area = L.map.areaAt(b.x, b.y);
        if (area && !disc[area.id]) continue;
        ctx.font = `bold ${Math.max(10, scale * 1.05)}px "Trebuchet MS", sans-serif`;
        const tx = (b.x + b.w / 2) * scale;
        const ty = (b.y + b.h / 2 - 0.5) * scale;
        const label = b.mapLabel ?? b.name;
        if (!label) continue;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(251,244,230,0.85)';
        ctx.fillRect(tx - tw / 2, ty - scale * 0.75, tw, scale * 1.5);
        ctx.fillStyle = '#2d2433';
        ctx.fillText(label, tx, ty);
      }
      for (const a of L.map.areas) {
        if (!disc[a.id]) continue;
        ctx.font = `italic bold ${scale * 1.5}px Georgia, serif`;
        ctx.fillStyle = 'rgba(255,246,224,0.95)';
        ctx.strokeStyle = 'rgba(45,36,51,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(a.name, (a.x + a.w / 2) * scale, (a.y + 1.2) * scale);
        ctx.fillText(a.name, (a.x + a.w / 2) * scale, (a.y + 1.2) * scale);
      }
      // gateways to other regions (loaded separately): an arrow and a label at the edge
      const seen = new Set();
      for (const d of L.map.doors) {
        if (!d.gateway || seen.has(d.gateway)) continue;
        seen.add(d.gateway);
        const west = d.x === 0;
        // v0.29.1: gates on the top or bottom edge point up or down
        const north = d.y === 0 && !west;
        const south = d.y === L.map.height - 1 && !west && d.x !== L.map.width - 1;
        const gx = (d.x + 0.5) * scale;
        const gy = north ? 2.2 * scale : south ? (d.y - 1.2) * scale : (d.y + 1) * scale;
        ctx.font = `bold ${Math.max(11, scale * 1.3)}px "Trebuchet MS", sans-serif`;
        const label = north ? `▲ ${d.gateway}` : south ? `▼ ${d.gateway}` : west ? `◀ ${d.gateway}` : `${d.gateway} ▶`;
        const tw = ctx.measureText(label).width + 10;
        const lx = north || south ? gx - tw / 2 : west ? gx + 4 : gx - tw - 4;
        ctx.fillStyle = 'rgba(232,182,76,0.95)';
        ctx.fillRect(lx, gy - scale * 0.9, tw, scale * 1.8);
        ctx.fillStyle = '#2d2433';
        ctx.textAlign = 'left';
        ctx.fillText(label, lx + 5, gy);
        ctx.textAlign = 'center';
      }
      for (const m of this.markers(L.map)) this.marker(ctx, m.x * scale, m.y * scale, m, Math.max(1.4, s));
      if (g.player.map === L.map.id) this.playerArrow(ctx, (g.player.x / TILE) * scale, (g.player.y / TILE) * scale, g.player.facing, Math.max(1.4, s));
      ctx.restore();
    }
  }

  // ------------------------------------------------------- the world map
  /** Every outdoor map in one world space (src/world/layout.js). */
  worldLayout() {
    return worldLayout(this.game);
  }

  /** Where the player is in world tiles (inside a building: at its door). */
  playerWorld() {
    const g = this.game;
    const L = this.worldLayout();
    const p = g.player;
    if (L.pos[p.map]) return { x: L.pos[p.map].x + p.x / TILE, y: L.pos[p.map].y + p.y / TILE, inside: null };
    for (const [id, o] of Object.entries(L.pos)) {
      const m = g.maps.get(id);
      const d = m.doors.find((x) => x.to?.map === p.map);
      if (d) return { x: o.x + d.x + 0.5, y: o.y + d.y + 0.5, inside: g.currentMap().name };
    }
    return null;
  }

  /**
   * Draw the world into a W×H canvas for a view { cx, cy (world tiles at the
   * centre), z (px per tile) }. Returns hover targets [{ x, y, w, h, info }].
   */
  drawWorld(ctx, W, H, view, hover) {
    const g = this.game;
    const L = this.worldLayout();
    const z = view.z;
    const X = (wx) => (wx - view.cx) * z + W / 2;
    const Y = (wy) => (wy - view.cy) * z + H / 2;
    const hits = [];
    const disc = g.player.discovered.areas;
    ctx.fillStyle = TILE_TYPES['~'].color;
    ctx.fillRect(0, 0, W, H);
    // gentle sea texture
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 60; i++) ctx.fillRect(((i * 97) % 997) / 997 * W, ((i * 61) % 613) / 613 * H, 10, 1);
    // roads between regions
    for (const r of L.roads) {
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = Math.max(3, z * 2);
      ctx.beginPath(); ctx.moveTo(X(r.x1), Y(r.y1)); ctx.lineTo(X(r.x2), Y(r.y2)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,0.6)';
      ctx.lineWidth = Math.max(1, z * 0.2);
      ctx.setLineDash([z * 1.2, z * 1.2]);
      ctx.beginPath(); ctx.moveTo(X(r.x1), Y(r.y1)); ctx.lineTo(X(r.x2), Y(r.y2)); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.imageSmoothingEnabled = z < BASE;
    for (const [id, o] of Object.entries(L.pos)) {
      const m = g.maps.get(id);
      const x = X(o.x);
      const y = Y(o.y);
      if (x > W || y > H || x + m.width * z < 0 || y + m.height * z < 0) continue;
      ctx.drawImage(this.base(m, BASE), x, y, m.width * z, m.height * z);
      for (const a of m.areas) {
        if (disc[a.id]) continue;
        ctx.fillStyle = 'rgba(30,26,40,0.82)';
        ctx.fillRect(X(o.x + a.x), Y(o.y + a.y), a.w * z, a.h * z);
      }
    }
    ctx.imageSmoothingEnabled = true;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // undiscovered districts say so
    for (const [id, o] of Object.entries(L.pos)) {
      for (const a of g.maps.get(id).areas) {
        if (disc[a.id] || a.w * z < 60) continue;
        ctx.font = `italic ${Math.min(18, Math.max(10, z * 1.3))}px Georgia, serif`;
        ctx.fillStyle = 'rgba(255,246,224,0.45)';
        ctx.fillText('unexplored', X(o.x + a.x + a.w / 2), Y(o.y + a.y + a.h / 2));
      }
    }
    // buildings: icons always, names when zoomed in
    const iconPx = Math.max(13, Math.min(30, z * 2.2));
    for (const [id, o] of Object.entries(L.pos)) {
      const m = g.maps.get(id);
      for (const b of m.buildings) {
        const area = m.areaAt(b.x, b.y);
        if (area && !disc[area.id]) continue;
        const meta = BUILDING_ICONS[b.id];
        if (!meta) continue;
        const bx = X(o.x + b.x + b.w / 2);
        const by = Y(o.y + b.y + b.h / 2 - 0.5);
        if (bx < -40 || by < -40 || bx > W + 40 || by > H + 40) continue;
        const yours = b.door?.lock?.flag && g.getFlag(b.door.lock.flag) && /^owns_/.test(b.door.lock.flag);
        const home = b.id === 'b_number9';
        const key = `b:${b.id}`;
        ctx.fillStyle = hover === key ? '#fff' : 'rgba(251,244,230,0.92)';
        ctx.strokeStyle = yours || home ? '#e8b64c' : '#2d2433';
        ctx.lineWidth = yours || home ? 3 : 1.5;
        ctx.beginPath(); ctx.arc(bx, by, iconPx * 0.68, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = `${iconPx * 0.8}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillStyle = '#2d2433';
        ctx.fillText(meta.icon, bx, by + 1);
        if (z >= 9) {
          const label = b.mapLabel || b.name;
          ctx.font = `bold ${Math.min(14, z)}px "Trebuchet MS", sans-serif`;
          const tw = ctx.measureText(label).width + 8;
          ctx.fillStyle = 'rgba(251,244,230,0.9)';
          ctx.fillRect(bx - tw / 2, by + iconPx * 0.75, tw, Math.min(14, z) + 4);
          ctx.fillStyle = '#2d2433';
          ctx.fillText(label, bx, by + iconPx * 0.75 + Math.min(14, z) / 2 + 2);
        }
        hits.push({ key, x: bx - iconPx * 0.7, y: by - iconPx * 0.7, w: iconPx * 1.4, h: iconPx * 1.4, info: { icon: meta.icon, name: b.name, kind: meta.kind, place: m.name, yours, home } });
      }
    }
    // your cars, wherever you left them (v0.16.0)
    for (const c of g.vehicles?.ownedCars() || []) {
      const o = L.pos[c.map];
      if (!o || c.id === g.player.driving) continue;
      const cx = X(o.x + c.x / TILE);
      const cy = Y(o.y + c.y / TILE);
      ctx.fillStyle = '#fff6d8';
      ctx.strokeStyle = c.stolen ? '#c0614a' : '#e8b64c';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, iconPx * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = `${iconPx * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.fillStyle = '#2d2433';
      ctx.fillText('🚗', cx, cy + 1);
      const m = g.content.vehicles.models[c.model];
      hits.push({ key: `car:${c.id}`, x: cx - iconPx * 0.6, y: cy - iconPx * 0.6, w: iconPx * 1.2, h: iconPx * 1.2, info: { icon: '🚗', name: `Your ${m.name}`, kind: c.stolen ? 'Stolen — parked here' : 'Parked here', place: g.maps.get(c.map).name, yours: false } });
    }
    // the No. 1 bus: its stops and where each bus is now (v0.17.0)
    if (g.transit) {
      for (const s of g.content.transit.bus.stops) {
        const o = L.pos[s.sign.map];
        if (!o) continue;
        const sx = X(o.x + s.sign.x + 0.5);
        const sy = Y(o.y + s.sign.y + 0.5);
        ctx.fillStyle = '#2f6b4f';
        ctx.strokeStyle = '#efe6cc';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, iconPx * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.font = `${iconPx * 0.5}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText('🚏', sx, sy + 1);
        const e = g.transit.eta(s.id);
        hits.push({ key: `stop:${s.id}`, x: sx - iconPx * 0.5, y: sy - iconPx * 0.5, w: iconPx, h: iconPx, info: { icon: '🚏', name: `${s.name} (bus stop)`, kind: e ? `Next bus in about ${e.minutes} min` : 'Bus stop', place: g.content.transit.bus.name } });
      }
      for (const f of g.transit.followers.filter((x) => x.kind === 'bus')) {
        const bx = X(f.wx / TILE);
        const by = Y(f.wy / TILE);
        ctx.font = `${iconPx * 0.85}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillText('🚌', bx, by);
        hits.push({ key: `bus:${f.id}`, x: bx - iconPx * 0.5, y: by - iconPx * 0.5, w: iconPx, h: iconPx, info: { icon: '🚌', name: `${g.content.transit.bus.name} bus`, kind: g.transit.heading(f), place: g.transit.dwelling(f) ? `At ${g.transit.stopFor(f).name}` : `Next stop: ${g.transit.stopFor(f, true).name}` } });
      }
    }
    // district names (zoomed in) or region names (zoomed out)
    if (z >= 3.5) {
      for (const [id, o] of Object.entries(L.pos)) {
        for (const a of g.maps.get(id).areas) {
          if (!disc[a.id]) continue;
          ctx.font = `italic bold ${Math.min(20, Math.max(11, z * 1.4))}px Georgia, serif`;
          ctx.fillStyle = 'rgba(255,246,224,0.95)';
          ctx.strokeStyle = 'rgba(45,36,51,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(a.name, X(o.x + a.x + a.w / 2), Y(o.y + a.y + 1.4));
          ctx.fillText(a.name, X(o.x + a.x + a.w / 2), Y(o.y + a.y + 1.4));
        }
      }
    } else {
      for (const r of L.regions) {
        const seen = r.maps.some((id) => g.player.discovered.maps[id]);
        ctx.font = `bold ${Math.max(14, Math.min(26, z * 6))}px Georgia, serif`;
        ctx.fillStyle = 'rgba(255,246,224,0.97)';
        ctx.strokeStyle = 'rgba(45,36,51,0.9)';
        ctx.lineWidth = 4;
        const t = seen ? r.name : `${r.name} (not visited)`;
        ctx.strokeText(t, X(r.x + r.w / 2), Y(r.y) - 14);
        ctx.fillText(t, X(r.x + r.w / 2), Y(r.y) - 14);
      }
    }
    // people and objectives
    const s = Math.max(1, Math.min(1.8, z / 6));
    for (const [id, o] of Object.entries(L.pos)) {
      for (const mk of this.markers(g.maps.get(id))) {
        if (mk.kind === 'npc' && z < 5) continue;
        this.marker(ctx, X(o.x + mk.x), Y(o.y + mk.y), mk, s);
      }
    }
    const me = this.playerWorld();
    if (me) {
      const px = X(me.x);
      const py = Y(me.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 14 * s, 0, Math.PI * 2); ctx.stroke();
      this.playerArrow(ctx, px, py, g.player.facing, Math.max(1.2, s));
      hits.push({ key: 'me', x: px - 12, y: py - 12, w: 24, h: 24, info: { icon: '🧍', name: 'You', kind: me.inside ? `Inside ${me.inside}` : g.currentMap().name } });
    }
    return hits;
  }
}
