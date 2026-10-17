// The hotbar (v0.41.1, art revamp): bottom left, like the mock-up — fists and every weapon you own,
// one slot each (keys 1–9 already quick-select them), a pixel-art icon, the ammo you have for a
// gun, the one in your hand outlined in gold. Click a slot to ready it.
const INK = '#14141e';

/** A 16×16 pixel-art icon for a weapon (by its `held` look and id), drawn onto `cv`. */
export function drawWeaponIcon(cv, def) {
  const ctx = cv.getContext('2d');
  const u = cv.width / 16;
  ctx.clearRect(0, 0, cv.width, cv.height);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * u, y * u, w * u, h * u); };
  const held = def?.weapon?.held || 'fists';
  const id = def?.id || '';
  const steel = '#c9ced4';
  const dark = '#2e2e36';
  const wood = '#8a5a34';
  if (held === 'fists' || !def?.weapon) {
    R(4, 5, 8, 7, INK); R(5, 6, 6, 5, '#e8b896'); R(5, 6, 6, 1, '#f4d0b0'); R(7, 6, 1, 3, '#c8946e'); R(9, 6, 1, 3, '#c8946e'); R(4, 9, 2, 3, INK); R(5, 10, 1, 1, '#e8b896');
  } else if (held === 'knuckles') {
    R(3, 6, 10, 5, INK); for (let k = 0; k < 4; k++) { R(4 + k * 2, 7, 2, 2, steel); R(4 + k * 2, 7, 1, 1, '#ffffff'); } R(4, 9, 8, 1, '#8a9098');
  } else if (held === 'club') {
    for (let k = 0; k < 10; k++) { R(3 + k, 12 - k, 3, 2, INK); R(4 + k, 12 - k, 1 + (k > 5 ? 1 : 0), 1, k > 6 ? '#a07048' : wood); }
    R(2, 12, 3, 2, '#3a2a1e');
  } else if (held === 'blade') {
    for (let k = 0; k < 8; k++) { R(6 + k, 9 - k, 2, 2, INK); R(6 + k, 9 - k, 1, 1, steel); } R(3, 10, 4, 2, INK); R(4, 10, 2, 1, '#3a2a1e'); R(5, 9, 1, 3, '#c9a24a');
  } else if (held === 'axe') {
    for (let k = 0; k < 10; k++) R(4 + k, 13 - k, 2, 1, wood); R(10, 1, 5, 6, INK); R(11, 2, 3, 4, '#c0414a'); R(11, 2, 1, 4, steel);
  } else if (held === 'pistol') {
    const big = /revolver|38/.test(id);
    R(2, 5, 12, 4, INK); R(3, 6, 10, 2, dark); R(3, 6, 10, 1, '#5a5a66');
    if (big) { R(6, 5, 4, 4, INK); R(7, 6, 2, 2, '#6a6a76'); }
    R(9, 8, 4, 6, INK); R(10, 9, 2, 4, wood); R(7, 9, 2, 2, INK);
  } else {
    // long guns: a shotgun (pump), a rifle (scope) or a submachine gun (magazine)
    const smg = /smg|sub|tommy/.test(id);
    const rifle = /rifle|hunting/.test(id);
    R(0, 6, 16, 3, INK); R(1, 7, 9, 1, dark); R(10, 6, 5, 4, INK); R(10, 7, 5, 2, wood); R(1, 6, 8, 1, '#5a5a66');
    if (rifle) { R(4, 3, 5, 3, INK); R(5, 4, 3, 1, '#5a6a7a'); }
    if (smg) { R(6, 9, 3, 5, INK); R(7, 9, 1, 4, dark); }
    if (!rifle && !smg) { R(3, 9, 4, 2, INK); R(4, 9, 2, 1, wood); }
  }
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
