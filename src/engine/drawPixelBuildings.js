// Roofless buildings (v0.40.0, art revamp stage 3). In the pixel look a building on the street is
// drawn like Streets of Rogue: no roof, thin walls with a light top edge, a short front face with
// its windows, door, awning and sign — and you see straight in. What you see is a cutaway of its
// real interior: that map's floor and its furniture, laid out in proportion inside the walls (the
// interiors are bigger than the footprints, so it's a scaled plan, not the room itself). Buildings
// with no interior get a plain room. You still go in through the door, as before.
import { drawPixelProp } from './drawPixelProps.js';
import { paintFloor } from './drawPixelGround.js';
import { hash2 } from '../core/rng.js';

const INK = '#1b1a24';
const FACE = 10; // art px: the front wall's face
const TOPW = 3; // art px: wall thickness seen from above
const BACK = 9; // art px: the back wall's face
// furniture that hangs on walls or is too small to read at this size stays out of the cutaway
const SKIP = new Set(['window', 'painting', 'item', 'stairs', 'rug', 'hatch', 'lamp_mechanism', 'wallcrack', 'loosebrick', 'vent', 'cellbars', 'logbook']);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** The floor most of an interior map is laid with. */
function floorOf(inside) {
  if (!inside) return 'f';
  const n = {};
  for (let y = 1; y < inside.height - 1; y++) for (let x = 1; x < inside.width - 1; x++) {
    const ch = inside.tileAt(x, y);
    if ('ftcg'.includes(ch)) n[ch] = (n[ch] || 0) + 1;
  }
  return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || 'f';
}

/** The interior's furniture, placed in proportion inside a W×H (art px) floor; nothing overlaps or pokes out. */
export function layout(b, inside, W, H) {
  const out = [];
  const taken = [];
  const fits = (x, y, w, h) => x >= 0 && y >= 0 && x + w <= W && y + h <= H && !taken.some((r) => x < r.x + r.w && r.x < x + w && y < r.y + r.h && r.y < y + h);
  const place = (p, x, y) => {
    const w = p.w * 16;
    const h = p.h * 16;
    if (!fits(x, y, w, h)) return;
    taken.push({ x, y, w, h });
    out.push({ ...p, ax: x, ay: y });
  };
  if (inside) {
    const iw = Math.max(1, inside.width - 2) * 16;
    const ih = Math.max(1, inside.height - 2) * 16;
    const props = inside.props.filter((p) => !SKIP.has(p.type) && p.w * 16 <= W && p.h * 16 <= H);
    // the biggest first, so counters and beds win their places over chairs
    props.sort((a, c) => c.w * c.h - a.w * a.h);
    for (const p of props) place(p, Math.round(((p.x - 1) * 16 * W) / iw), Math.round(((p.y - 1) * 16 * H) / ih));
  } else if (W >= 40 && H >= 20) {
    // no interior map: a room that fits what the place is
    const name = `${b.sign || ''} ${b.name || ''} ${b.id}`;
    const P = (type, w, h, x, y, extra) => place({ id: `${b.id}_${type}_${x}_${y}`, type, w, h, ...extra }, x, y);
    const rowOf = (fn) => { for (let tx = 6; tx + 16 <= W - 4; tx += 40) fn(tx); };
    if (b.shabby) {
      P('cot', 1, 2, 2, 0); P('barrel', 1, 1, W - 18, 2); P('crate', 1, 1, W - 18, H - 17);
    } else if (/house|home|residence|cottage|boarding/i.test(name)) {
      P('bed', 1, 2, 2, 0, { color: ['#6f8fb5', '#b56f6f', '#7fa86a'][Math.floor(hash2(b.x, b.y) * 3)] }); P('wardrobe', 1, 1, 22, 0);
      P('table', 1, 1, W - 40, H - 20); P('chair', 1, 1, W - 24, H - 20); P('stove', 1, 1, W - 20, 0);
    } else if (/diner|cafe|bar\b|star|saloon|grill|lucky/i.test(name)) {
      P('counter', Math.min(4, Math.floor((W - 8) / 16)), 1, 4, 1); P('shelf', 1, 1, W - 20, 0, {});
      rowOf((tx) => { P('table', 1, 1, tx, H - 20); P('chair', 1, 1, tx + 16, H - 20); });
    } else if (/bank|bail|office|exchange|trust|insurance|school|church|mission|hall|post|land|mutual|ledger|herald|telephone|ironclad|securities|tower|hotel/i.test(name)) {
      P('cabinet', 1, 1, 2, 0); P('cabinet', 1, 1, 20, 0);
      rowOf((tx) => { P('desk', 1, 1, tx, H - 22); P('chair', 1, 1, tx + 16, H - 22); });
    } else if (/storage|cold|port|wh\d|depot|elevator|garage|repair|tractor|warehouse|gate/i.test(name)) {
      for (let k = 0; k < 6; k++) P(k % 2 ? 'barrel' : 'crate', 1, 1, 2 + Math.floor(hash2(b.x + k, b.y) * (W - 20)), Math.floor(hash2(b.y, b.x + k) * (H - 16)));
      P('workbench', 2, 1, W - 36, H - 18);
    } else {
      // a shop: shelves along the back, a display, the counter by the door
      for (let tx = 2; tx + 32 <= W - 2; tx += 36) P('shelf', 2, 1, tx, 0);
      P('display', 2, 1, 4, Math.max(16, Math.floor(H / 2) - 8), {});
      P('counter', 2, 1, W - 36, H - 18);
    }
  }
  return out.sort((a, c) => a.ay - c.ay);
}

const plans = new WeakMap();

/** Draw building `b` roofless. opts: { inside (its interior map, if any), lit, night, doorLocked, time }. */
export function drawPixelBuilding(ctx, b, opts) {
  const x0 = b.x * 32;
  const y0 = b.y * 32;
  const W = b.w * 16;
  const H = b.h * 16;
  const R = (ax, ay, aw, ah, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + ax * 2, y0 + ay * 2, aw * 2, ah * 2); };
  const wall = b.wall || '#d8cdb8';
  const trim = b.trim || '#5a4a3a';
  const top = shade(wall, -18);
  const frontY = H - FACE; // the front face's top row
  const fx = TOPW;
  const fy = TOPW + BACK;
  const fw = W - TOPW * 2;
  const fh = frontY - TOPW - fy;

  // shadow on the street
  ctx.fillStyle = 'rgba(15,15,35,0.25)';
  ctx.fillRect(x0 + W * 2, y0 + 8, 8, H * 2 - 4);
  ctx.fillRect(x0 + 8, y0 + H * 2, W * 2, 6);

  // the floor
  if (fh > 0) {
    const ch = floorOf(opts.inside);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + fx * 2, y0 + fy * 2, fw * 2, fh * 2);
    ctx.clip();
    for (let ty = 0; ty * 16 < fh; ty++) for (let tx = 0; tx * 16 < fw; tx++) paintFloor((x, y, w, h, c) => R(x / 2, y / 2, w / 2, h / 2, c), ch, (fx + tx * 16) * 2, (fy + ty * 16) * 2, b.x + tx, b.y + ty); // (paintFloor works in world pixels)
    if (b.shabby) for (let i = 0; i < 6; i++) R(fx + Math.floor(hash2(b.x + i, b.y) * (fw - 4)), fy + Math.floor(hash2(b.y, b.x + i) * (fh - 3)), 4, 2, 'rgba(60,45,30,0.35)');
    // the furniture
    let plan = plans.get(b);
    if (!plan || plan.inside !== opts.inside) { plan = { inside: opts.inside, items: layout(b, opts.inside, fw, fh) }; plans.set(b, plan); }
    for (const p of plan.items) drawPixelProp(ctx, { ...p, x: (x0 + (fx + p.ax) * 2) / 32, y: (y0 + (fy + p.ay) * 2) / 32 }, { time: opts.time, night: opts.night });
    // light in the room, at night, when someone's in
    if (opts.night) { ctx.fillStyle = opts.lit ? 'rgba(255,200,120,0.12)' : 'rgba(10,15,40,0.35)'; ctx.fillRect(x0 + fx * 2, y0 + fy * 2, fw * 2, fh * 2); }
    ctx.restore();
    R(fx, fy, fw, 2, 'rgba(0,0,0,0.18)'); // the back wall's shadow
  }

  // the back wall: a top, then its face (papered above a dado rail)
  R(0, 0, W, TOPW + 0.5, INK);
  R(0.5, 0.5, W - 1, TOPW - 0.5, top);
  R(0.5, 0.5, W - 1, 0.5, shade(top, 30));
  R(TOPW, TOPW, W - TOPW * 2, BACK, shade(wall, -8));
  R(TOPW, TOPW + BACK - 4, W - TOPW * 2, 1, shade(trim, 10));
  R(TOPW, TOPW + BACK - 3, W - TOPW * 2, 3, shade(wall, -26));
  R(TOPW, TOPW, W - TOPW * 2, 1, INK);
  // a tower's lobby: lift doors in the back wall (the floors above are reached from inside)
  if (b.tower) for (const lx of [Math.floor(W / 2) - 13, Math.floor(W / 2) + 3]) { R(lx, TOPW + 1, 10, BACK - 1, INK); R(lx + 1, TOPW + 2, 8, BACK - 2, '#b8bec8'); R(lx + 4, TOPW + 2, 1, BACK - 2, '#6a6e78'); R(lx + 3, TOPW + 1, 4, 1, '#c9a24a'); }
  // side walls
  for (const sx of [0, W - TOPW]) { R(sx, 0, TOPW, frontY, INK); R(sx + 0.5, 0.5, TOPW - 1, frontY - 0.5, top); R(sx + 0.5, 0.5, 0.5, frontY - 0.5, shade(top, 30)); }

  // v0.41.1: the people in there, where they stand in the real room (in front of the back wall)
  if (opts.people?.length && opts.inside && opts.drawPerson) {
    const iw = Math.max(1, opts.inside.width - 2) * 32;
    const ih = Math.max(1, opts.inside.height - 2) * 32;
    for (const npc of [...opts.people].sort((a, c) => a.y - c.y)) {
      const px = x0 + fx * 2 + ((npc.x - 32) / iw) * fw * 2;
      const py = y0 + fy * 2 + ((npc.y - 32) / ih) * fh * 2 + 8;
      opts.drawPerson(npc, Math.max(x0 + fx * 2 + 10, Math.min(x0 + (fx + fw) * 2 - 10, px)), Math.min(y0 + (fy + fh) * 2, py));
    }
  }

  // the front: a top edge and a short face with windows, a door, an awning, pilasters
  R(0, frontY - 0.5, W, TOPW + 0.5, INK);
  R(0.5, frontY, W - 1, TOPW - 0.5, top);
  R(0.5, frontY, W - 1, 0.5, shade(top, 30));
  const faceY = frontY + TOPW - 1;
  const faceH = H - faceY;
  R(0, faceY, W, faceH, INK);
  R(0.5, faceY, W - 1, faceH - 0.5, wall);
  R(1, H - 3, W - 2, 2, shade(wall, -30));
  const doorAx = b.door ? (b.door.x - b.x) * 16 : -999;
  for (let wx = 5; wx + 9 <= W - 4; wx += 16) {
    if (wx + 10 > doorAx - 2 && wx < doorAx + 18) continue;
    R(wx - 1, faceY + 1, 11, 5, trim);
    R(wx, faceY + 2, 9, 3, opts.lit ? '#ffd88a' : '#7aa3b8');
    if (!opts.lit) R(wx + 1, faceY + 2, 2, 3, '#b8d8e6');
    R(wx + 4, faceY + 2, 1, 3, trim);
  }
  if (b.columns) for (let cx = 2; cx < W - 3; cx += 16) if (!(cx + 3 > doorAx - 2 && cx < doorAx + 18)) { R(cx, faceY, 3, faceH - 1, '#f7f4ee'); R(cx + 2, faceY, 1, faceH - 1, '#cfcac0'); }
  if (b.shabby) { R(3, faceY + 2, 5, 3, shade(wall, -25)); R(W - 9, faceY + 4, 6, 2, '#8a6a4a'); }
  if (b.door) {
    R(doorAx + 2, faceY - 1, 12, faceH, trim);
    R(doorAx + 3, faceY, 10, faceH - 1, opts.doorLocked ? shade(trim, -25) : '#6b4a32');
    R(doorAx + 4, faceY + 1, 8, 2, opts.lit ? '#ffd68c' : 'rgba(255,255,255,0.2)');
    R(doorAx + 10, faceY + 4, 1, 1, '#e8c35a');
    R(doorAx + 1, H, 14, 1, 'rgba(120,110,100,0.8)'); // the step
  }
  if (b.awning) for (let i = 0; i * 5 < W; i++) { R(i * 5, faceY - 2, 5, 3, i % 2 ? '#f3e5c6' : b.awning); R(i * 5 + 1, faceY + 1, 3, 1, i % 2 ? '#f3e5c6' : b.awning); }

  // the sign, on the front wall's top
  if (b.sign) {
    ctx.font = 'bold 9px "Trebuchet MS", "Segoe UI", sans-serif';
    const tw = Math.ceil(ctx.measureText(b.sign).width + 10);
    const right = x0 + W * 2;
    const sx = b.door ? Math.min(Math.max(b.door.x * 32 + 16 - tw / 2, x0 + 2), right - tw - 2) : x0 + (W * 2 - tw) / 2;
    const sy = y0 + (frontY - 4) * 2;
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(sx) - 2, sy - 2, tw + 4, 17);
    ctx.fillStyle = '#3a2c25';
    ctx.fillRect(Math.round(sx), sy, tw, 13);
    ctx.fillStyle = '#f6e7c1';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.sign, Math.round(sx) + 5, sy + 7);
  }
}
