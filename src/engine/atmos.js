// What the eye sees of the time of day (v0.107.0). A map may set `def.atmos.dark: [min, max]`: the Sump never sees daylight, the Crown never
// sees night. Only the drawing reads this; the clock, schedules and every rule keep the real darkness.
export function seenDarkness(g) {
  const d = g.clock.darkness; const a = g.currentMap?.()?.def?.atmos?.dark;
  return a ? Math.min(a[1], Math.max(a[0], d)) : d;
}
