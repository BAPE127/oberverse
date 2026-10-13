// Optional image assets (character sprites/portraits from the import pipeline).
// Missing or failed images fall back to procedural drawing — never fatal.
export class Assets {
  constructor() {
    this.images = new Map();
    this.failed = new Set();
  }
  /**
   * @param {string} path image URL or data URI
   * @param {Function} [onLoad] called once the image is ready (if it was not already)
   */
  image(path, onLoad) {
    if (!path || this.failed.has(path)) return null;
    const entry = this.images.get(path);
    if (entry) {
      if (entry.loaded) return entry.img;
      if (onLoad) entry.waiters.push(onLoad);
      return null;
    }
    const img = new Image();
    const rec = { img, loaded: false, waiters: onLoad ? [onLoad] : [] };
    img.onload = () => {
      rec.loaded = true;
      for (const fn of rec.waiters.splice(0)) fn(img);
    };
    img.onerror = () => {
      this.failed.add(path);
      console.warn(`[assets] Could not load ${path}; using procedural art.`);
    };
    img.src = path;
    this.images.set(path, rec);
    return null;
  }
}
