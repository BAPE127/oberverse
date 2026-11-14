// Formations: where the members of a group stand round a point.
/** The spots of a formation: `n` places round a point, facing the way the group is going (line abreast, a column, a wedge, a skirmish line spread wide). */
export function formationSpots(n, x, y, heading, kind = 'line') {
  const fx = Math.cos(heading); const fy = Math.sin(heading); const px = -fy; const py = fx; const gap = kind === 'skirmish' ? 2.6 : 1.7; const out = [];
  for (let i = 0; i < n; i++) {
    const o = i - (n - 1) / 2; let a = o * gap; let b = 0;
    if (kind === 'column') { a = (i % 2 ? 0.8 : -0.8); b = -Math.floor(i / 1) * 1.2 * 0.5 * 2; }
    else if (kind === 'wedge') { a = o * gap; b = -Math.abs(o) * 1.4; }
    out.push({ x: x + px * a + fx * b, y: y + py * a + fy * b });
  }
  return out;
}
