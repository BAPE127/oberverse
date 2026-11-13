// The ground in 3D: the game's own pixel-art ground chunks (renderer.groundChunk) as nearest-filtered textures on flat
// quads, one per 8 x 8 tile chunk, created when a chunk comes into view and disposed with the same kind of LRU the
// 2D chunk cache uses. Keeps every special ground painter and the game's pixel look; neighbours share exact edges.
import { THREE, sharedGeometry } from './lib3d.js';
import { holeLit } from './buildings3d.js';

const CHUNK = 8; // tiles (drawPixelGround.CHUNK)
const MAX_QUADS = 150;

const planeFor = (w, h) => sharedGeometry(`ground${w}x${h}`, () => new THREE.PlaneGeometry(w, h));

export class Ground3D {
  constructor(host) {
    this.host = host; // the 2D Renderer: groundChunk(map, cx, cy), wantChunks
    this.entries = new Map(); // quad key → { canvas, tex, mesh, last, parent }
    this.tick = 0;
  }

  /**
   * Make sure the chunks of `map` touching the tile rectangle `r` ({ x0, y0, x1, y1 }, map-local tiles) have quads in
   * `parent` (the map's ground group), at height `y`. Returns the number of quads shown.
   */
  show(map, parent, r, y) {
    const cx0 = Math.max(0, Math.floor(r.x0 / CHUNK));
    const cy0 = Math.max(0, Math.floor(r.y0 / CHUNK));
    const cx1 = Math.min(Math.ceil(map.width / CHUNK) - 1, Math.floor(r.x1 / CHUNK));
    const cy1 = Math.min(Math.ceil(map.height / CHUNK) - 1, Math.floor(r.y1 / CHUNK));
    let n = 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const canvas = this.host.groundChunk(map, cx, cy);
      const key = `${map.id}|${cx},${cy}`;
      let e = this.entries.get(key);
      if (e && e.canvas !== canvas) { this.drop(key); e = null; } // the chunk was repainted (crops grew, a field changed)
      if (!e) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        const tw = canvas.width / 32;
        const th = canvas.height / 32;
        const m = holeLit(new THREE.MeshLambertMaterial({ map: tex }));
        const mesh = new THREE.Mesh(planeFor(tw, th), m);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx * CHUNK + tw / 2, y, cy * CHUNK + th / 2);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        e = { canvas, tex, mesh, last: 0, parent };
        this.entries.set(key, e);
        parent.add(mesh);
      }
      e.last = this.tick;
      e.mesh.visible = true;
      n++;
    }
    // the ring just outside the view is painted ahead, a chunk a frame (renderer.prefetchGround)
    this.host.wantChunks.push({ map, cx0: cx0 - 1, cy0: cy0 - 1, cx1: cx1 + 1, cy1: cy1 + 1 });
    return n;
  }

  /** Call once a frame, after `show`: hides quads not shown this frame and frees the oldest beyond the cap. */
  endFrame() {
    this.tick++;
    for (const e of this.entries.values()) if (e.last !== this.tick - 1) e.mesh.visible = false;
    if (this.entries.size > MAX_QUADS) {
      const old = [...this.entries.entries()].filter(([, e]) => e.last < this.tick - 1).sort((a, b) => a[1].last - b[1].last);
      for (const [k] of old.slice(0, this.entries.size - MAX_QUADS)) this.drop(k);
    }
  }

  drop(key) {
    const e = this.entries.get(key);
    if (!e) return;
    e.parent.remove(e.mesh);
    e.mesh.material.dispose();
    e.tex.dispose();
    this.entries.delete(key);
  }

  /** Free every quad of one map (it left the scene). */
  dropMap(mapId) {
    for (const k of [...this.entries.keys()]) if (k.startsWith(`${mapId}|`)) this.drop(k);
  }

  dispose() {
    for (const k of [...this.entries.keys()]) this.drop(k);
  }

  get size() { return this.entries.size; }
}
