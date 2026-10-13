// Tile type registry. Maps are authored as grids of single-character codes.
// `solid` blocks movement; `water` is used by audio/ambience and rendering.
export const TILE_TYPES = {
  '.': { name: 'grass', solid: false, color: '#7fb069', alt: '#76a862' },
  ',': { name: 'paving', solid: false, color: '#cfc6b4', alt: '#c6bca9' },
  '=': { name: 'road', solid: false, color: '#5f6470', alt: '#5a5f6a' },
  ':': { name: 'dirt path', solid: false, color: '#c9a978', alt: '#c09f6d' },
  '~': { name: 'water', solid: true, water: true, color: '#3f88a8', alt: '#3a80a0' },
  b: { name: 'bridge', solid: false, color: '#9a6b45', alt: '#90623d' },
  p: { name: 'pier planks', solid: false, color: '#a27650', alt: '#976c47' },
  s: { name: 'sand', solid: false, color: '#e6d3a1', alt: '#dfca94' },
  r: { name: 'rock', solid: true, color: '#8d8f94', alt: '#83858a' },
  B: { name: 'building', solid: true, color: '#6b5b53', alt: '#6b5b53' },
  D: { name: 'doorway', solid: false, color: '#5a4636', alt: '#5a4636' },
  W: { name: 'wall', solid: true, wall: true, color: '#e9dcc3', alt: '#e9dcc3' },
  f: { name: 'wood floor', solid: false, color: '#b98a5e', alt: '#b08157' },
  t: { name: 'tile floor', solid: false, color: '#dcd6cc', alt: '#d2ccc1' },
  c: { name: 'carpet', solid: false, color: '#8e5a6e', alt: '#875468' },
  g: { name: 'concrete', solid: false, color: '#a7a9a6', alt: '#9fa19e' },
  m: { name: 'plaza stone', solid: false, color: '#d8d2c4', alt: '#d0c9ba' },
  u: { name: 'mud', solid: false, color: '#7d6e5a', alt: '#756652' },
  x: { name: 'void', solid: true, color: '#14121a', alt: '#14121a' },
};

export const isSolidCode = (ch) => Boolean(TILE_TYPES[ch]?.solid);
