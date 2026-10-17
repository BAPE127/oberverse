// The hotbar (v0.41.1, art revamp): bottom left, like the mock-up — fists and every weapon you own,
// one slot each (keys 1–9 already quick-select them), a pixel-art icon, the ammo you have for a
// gun, the one in your hand outlined in gold. Click a slot to ready it.
import { drawWeaponSprite, weaponBounds, lookOf } from '../engine/drawPixelWeapons.js';

const INK = '#14141e';

/** The weapon's pixel-art sprite (src/engine/drawPixelWeapons.js), fitted to the icon; fists are drawn here. */
export function drawWeaponIcon(cv, def) {
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  const look = lookOf(def);
  const b = look && weaponBounds(look);
  if (!b) {
    const u = cv.width / 16;
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * u, y * u, w * u, h * u); };
    R(4, 5, 8, 7, INK); R(5, 6, 6, 5, '#e8b896'); R(5, 6, 6, 1, '#f4d0b0'); R(7, 6, 1, 3, '#c8946e'); R(9, 6, 1, 3, '#c8946e'); R(4, 9, 2, 3, INK); R(5, 10, 1, 1, '#e8b896');
    return;
  }
  // drawn at one pixel per art pixel on a canvas just big enough, and scaled up crisp by the page
  const side = Math.max(b.w, b.h) + 2;
  if (cv.width !== side) { cv.width = side; cv.height = side; }
  const c2 = cv.getContext('2d');
  c2.clearRect(0, 0, side, side);
  c2.save();
  c2.translate(Math.round((side - b.w) / 2 - b.x0), Math.round((side - b.h) / 2 - b.y0));
  drawWeaponSprite(c2, look, 1);
  c2.restore();
}

export function renderHotbar(ui) {
  const g = ui.game;
  const el = ui.el.hotbar;
  if (!el) return;
  const list = [null, ...g.combat.owned()].slice(0, 9);
  const eq = g.player.equipped ?? null;
  const key = `${list.join(',')}|${eq}|${list.map((id) => (id ? g.inventory.count(g.content.items[id]?.weapon?.ammo || id) : 0)).join(',')}`;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  el.textContent = '';
  list.forEach((id, i) => {
    const def = id ? { id, ...g.content.items[id] } : null;
    const slot = document.createElement('button');
    slot.className = `hb-slot${id === eq ? ' on' : ''}`;
    slot.title = def ? def.name : 'Fists';
    const n = document.createElement('span');
    n.className = 'hb-key';
    n.textContent = String(i + 1);
    const cv = document.createElement('canvas');
    cv.width = 48;
    cv.height = 48;
    drawWeaponIcon(cv, def);
    slot.append(n, cv);
    const ammo = def?.weapon?.ammo;
    if (ammo) {
      const c = document.createElement('span');
      c.className = 'hb-count';
      c.textContent = String(g.inventory.count(ammo));
      slot.append(c);
    }
    slot.onclick = () => { const r = g.combat.select(i + 1); if (r.text) ui.toast(r.text, 'info', 2); };
    el.append(slot);
  });
}
