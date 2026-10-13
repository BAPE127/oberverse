// Small authoring helper used by content files to lay out maps with
// rectangles instead of hand-typed character grids.
export class MapBuilder {
  constructor(width, height, fill = '.') {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () => Array(width).fill(fill));
  }
  set(x, y, ch) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.grid[y][x] = ch;
    return this;
  }
  rect(x, y, w, h, ch) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }
  /** Replace only cells currently holding `from`. */
  replace(x, y, w, h, from, to) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if (this.grid[j]?.[i] === from) this.set(i, j, to);
    return this;
  }
  rows() {
    return this.grid.map((r) => r.join(''));
  }
}

/** Build a walled interior room with a doorway gap in the bottom wall at doorX. */
export function roomTiles(w, h, floor = 'f', doorX = Math.floor(w / 2), extra = []) {
  const b = new MapBuilder(w, h, floor);
  b.rect(0, 0, w, 1, 'W').rect(0, h - 1, w, 1, 'W').rect(0, 0, 1, h, 'W').rect(w - 1, 0, 1, h, 'W');
  b.set(doorX, h - 1, 'D');
  for (const [x, y, rw, rh, ch] of extra) b.rect(x, y, rw, rh, ch);
  return b.rows();
}
