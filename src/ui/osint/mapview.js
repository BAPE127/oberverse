// A pan-and-zoom canvas for the terminal's three maps (v0.103.4): the base (tiles), the world (degrees) and a theatre (pixels of its baked ground). It draws only when something changed, keeps its camera and
// its canvas when the page around it is rebuilt (`mount` moves the same element into the new page), and stops its loop when it is not on screen.
import { h } from '../panels.js';

export class MapView {
  /** opts: { draw(ctx, V), click(wx, wy, ev), hover(wx, wy) → label|null, min, max, wrapX (world width, for the world map) } */
  constructor(opts) {
    this.o = opts; this.cam = { x: 0, y: 0, z: 1 }; this.dirty = true; this.running = false; this.hoverText = null; this.size = { w: 0, h: 0, dpr: 1 };
    this.canvas = h('canvas', {}); this.tools = h('div', { class: 'osx-maptools' }); this.label = h('div', { class: 'osx-maplabel' }, '');
    this.el = h('div', { class: 'osx-mapbox' }, this.canvas, this.tools, this.label);
    this.bind();
  }

  mount(box) { box.append(this.el); this.running = true; this.dirty = true; if (!this.raf) this.loop(); return this; }
  unmount() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  invalidate() { this.dirty = true; }
  toScreen(x, y) { const { w, h: hh } = this.size; return [w / 2 + (x - this.cam.x) * this.cam.z, hh / 2 + (y - this.cam.y) * this.cam.z]; }
  toWorld(sx, sy) { const { w, h: hh } = this.size; return [this.cam.x + (sx - w / 2) / this.cam.z, this.cam.y + (sy - hh / 2) / this.cam.z]; }
  /** Fit the box x0,y0 to x1,y1 (world units) in view. */
  fit(x0, y0, x1, y1, pad = 0.92) { this.fitBox = [x0, y0, x1, y1, pad]; this.applyFit(); }
  applyFit() { const [x0, y0, x1, y1, pad] = this.fitBox || []; const { w, h: hh } = this.size; if (!w || !hh || x0 === undefined) return; this.cam = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: Math.min(w / (x1 - x0), hh / (y1 - y0)) * pad }; this.fitted = true; this.dirty = true; }
  centre(x, y, z) { this.cam.x = x; this.cam.y = y; if (z) this.cam.z = z; this.dirty = true; }

  measure() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = this.canvas.clientWidth; const hh = this.canvas.clientHeight;
    if (!w || !hh) return false;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(hh * dpr)) { this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(hh * dpr); this.dirty = true; }
    const was = this.size.w; this.size = { w, h: hh, dpr };
    if (!was && this.fitBox && !this.fitted) this.applyFit();
    return true;
  }

  loop() {
    this.raf = requestAnimationFrame(() => {
      this.raf = 0; if (!this.running) return;
      if (this.measure() && this.dirty) { this.dirty = false; const ctx = this.canvas.getContext('2d'); ctx.setTransform(this.size.dpr, 0, 0, this.size.dpr, 0, 0); ctx.clearRect(0, 0, this.size.w, this.size.h); this.o.draw(ctx, this); }
      this.loop();
    });
  }

  bind() {
    const c = this.canvas; let drag = null;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const clamp = (z) => Math.max(this.o.min ?? 0.2, Math.min(this.o.max ?? 60, z));
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture?.(e.pointerId); const [sx, sy] = pos(e); drag = { sx, sy, cx: this.cam.x, cy: this.cam.y, moved: false }; c.style.cursor = 'grabbing'; });
    c.addEventListener('pointermove', (e) => {
      const [sx, sy] = pos(e);
      if (drag) { const dx = sx - drag.sx; const dy = sy - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { this.cam.x = drag.cx - dx / this.cam.z; this.cam.y = drag.cy - dy / this.cam.z; this.wrap(); this.dirty = true; } return; }
      const [wx, wy] = this.toWorld(sx, sy); const t = this.o.hover ? this.o.hover(wx, wy, sx, sy) : null;
      if (t !== this.hoverText) { this.hoverText = t; this.label.textContent = t || ''; this.dirty = true; }
    });
    const end = (e) => { if (!drag) return; const was = drag; drag = null; c.style.cursor = 'grab'; if (!was.moved) { const [sx, sy] = pos(e); const [wx, wy] = this.toWorld(sx, sy); this.o.click?.(wx, wy, e, sx, sy); } };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', () => { drag = null; c.style.cursor = 'grab'; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); const [sx, sy] = pos(e); const [wx, wy] = this.toWorld(sx, sy); this.cam.z = clamp(this.cam.z * (e.deltaY < 0 ? 1.18 : 1 / 1.18)); const [nx, ny] = this.toWorld(sx, sy); this.cam.x += wx - nx; this.cam.y += wy - ny; this.wrap(); this.dirty = true; }, { passive: false });
    c.addEventListener('dblclick', (e) => { const [sx, sy] = pos(e); const [wx, wy] = this.toWorld(sx, sy); this.cam.x = wx; this.cam.y = wy; this.cam.z = clamp(this.cam.z * 1.8); this.dirty = true; });
  }
  wrap() { const W = this.o.wrapX; if (W) { while (this.cam.x > W / 2) this.cam.x -= W; while (this.cam.x < -W / 2) this.cam.x += W; } }
  zoomBy(f) { this.cam.z = Math.max(this.o.min ?? 0.2, Math.min(this.o.max ?? 60, this.cam.z * f)); this.dirty = true; }
}
