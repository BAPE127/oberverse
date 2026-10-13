// Minimap and full map rendering (DOM canvases).
import { TILE } from '../core/util.js';
import { TILE_TYPES } from '../world/tiles.js';

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
        const gx = (d.x + 0.5) * scale;
        const gy = (d.y + 1) * scale;
        ctx.font = `bold ${Math.max(11, scale * 1.3)}px "Trebuchet MS", sans-serif`;
        const label = west ? `◀ ${d.gateway}` : `${d.gateway} ▶`;
        const tw = ctx.measureText(label).width + 10;
        const lx = west ? gx + 4 : gx - tw - 4;
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
}
