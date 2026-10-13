// World layout: outdoor maps that sit side by side in one continuous space.
// Offsets are in tiles. Two maps share a seam column when B.x === A.x + A.width - 1
// (A's last column and B's first column are the same strip of ground). Walkable
// tiles on that strip become seamless doors: the player and NPCs simply walk
// across, and the renderer, minimap and world map draw the neighbours together.
export const REGIONS = {
  // Halvermouth is its own region: loaded on entry through the East Gate (too big to stitch).
  city: {
    name: 'Halvermouth',
    maps: { halvermouth: { x: 0, y: 0, fallbackSpot: 'east_gate' } },
  },
  coast: {
    name: 'Lanternside & surrounds',
    maps: {
      westbrook: { x: -43, y: 0, fallbackSpot: 'east_edge' },
      lanternside: { x: 0, y: 0, fallbackSpot: 'east_road' }, // west edge joins Westbrook (fallback via west_road)
      ober_fields: { x: 63, y: 0, fallbackSpot: 'west_road' },
    },
  },
};
