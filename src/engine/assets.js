// Optional image assets (character sprites/portraits from the import pipeline).
// Missing or failed images fall back to procedural drawing — never fatal.
export class Assets {
  constructor() {
    this.images = new Map();
    this.failed = new Set();
  }
  image(path) {
    if (!path || this.failed.has(path)) return null;
    const entry = this.images.get(path);
    if (entry) return entry.loaded ? entry.img : null;
    const img = new Image();
    const rec = { img, loaded: false };
    img.onload = () => (rec.loaded = true);
    img.onerror = () => {
      this.failed.add(path);
      console.warn(`[assets] Could not load ${path}; using procedural art.`);
    };
    img.src = path;
    this.images.set(path, rec);
    return null;
  }
}
