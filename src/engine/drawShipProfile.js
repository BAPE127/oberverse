// Ships, side-on and in detail (v0.26.0): the large elevation drawings used
// by the shipbuilder, Fleet Command's ship cards and (later) the Yards
// berths. A hull is drawn from its look ({ hull, len, color, trim }) and its
// parts from look.fit — one component id (or null) per attachment point,
// stern to bow. Stock ships get a fit from fitFor(model).
//
// Everything is drawn in "model units": the ship is L = len × 100 long,
// centred on the origin, the waterline at y = 0, up is −y. Callers scale.
import { shade } from './drawCharacter.js';

export const UNIT = 100;
const SAIL = ['schooner', 'brig', 'galleon', 'manowar'];
const SQUARE_RIG = ['brig', 'galleon', 'manowar'];
const WAR = ['warship', 'battleship'];
const SMALL = ['runner', 'skiff', 'tug'];

export const familyOf = (hull) => (SAIL.includes(hull) ? 'sail' : WAR.includes(hull) ? 'war' : hull === 'starwake' ? 'future' : SMALL.includes(hull) ? 'small' : 'cargo');

/** How each component looks on deck (component id → drawing). */
export const PROFILE_PART = {
  c_sails: 'mast', c_topsails: 'topsail', c_diesel: 'funnel', c_eco_engine: 'ecofunnel', c_gas_turbine: 'turbine', c_fusion_drive: 'fusion',
  c_generator: 'generator', c_big_generator: 'turbogen', c_fusion_core: 'core',
  c_hold_small: 'hatch', c_hold_large: 'hatch2', c_container_bay: 'containers', c_bulk_hold: 'bulk', c_reefer: 'reefer', c_heavy_crane: 'crane', c_cabins: 'cabins', c_specialist_bay: 'pod',
  c_nav_basic: 'navmast', c_nav_advanced: 'radar', c_fleet_comms: 'antenna',
  c_reinforced: 'plating', c_armor: 'armour', c_countermeasures: 'decoy', c_stealth_coating: 'coating',
  c_cannon: 'guns', c_deck_gun: 'turret', c_missiles: 'missile', c_railgun: 'railgun', c_guard_post: 'sandbags',
  c_radar: 'radar', c_sonar: 'sonar', c_lookout: 'crowsnest', c_quantum_sensors: 'qsensor',
  c_command: 'command', c_aegis_net: 'aegis',
};

/** The hull's proportions (fractions of L). */
function dims(hull) {
  const f = familyOf(hull);
  if (f === 'sail') return { F: hull === 'schooner' ? 0.07 : 0.085, D: 0.065, castle: hull === 'galleon' || hull === 'manowar' };
  if (f === 'war') return { F: hull === 'battleship' ? 0.085 : 0.075, D: 0.05 };
  if (f === 'future') return { F: 0.085, D: 0.04, foils: 0.08 };
  if (f === 'small') return { F: 0.12, D: 0.07 };
  return { F: hull === 'coaster' ? 0.12 : hull === 'bulk' ? 0.09 : 0.1, D: hull === 'coaster' ? 0.08 : 0.07 };
}

/** Where the deckhouse/bridge sits (fractions of L), so parts keep clear of it. */
function bridgeOf(hull) {
  const f = familyOf(hull);
  if (f === 'sail') return null;
  if (f === 'war') return [-0.14, 0.04];
  if (f === 'future') return [0.12, 0.3];
  if (hull === 'skiff') return [-0.2, -0.02];
  if (f === 'small') return [-0.12, 0.12];
  return [-0.47, -0.33];
}

/** The deck's height above the waterline at x (sheer, forecastle, castles). */
export function deckY(look, x) {
  const L = (look.len || 3) * UNIT;
  const { F, castle } = dims(look.hull);
  const u = x / L;
  const f = familyOf(look.hull);
  let h = F;
  if (f === 'sail') h = F + 0.03 * u * u * 4 * (castle ? 0.6 : 1);
  else if (f === 'cargo' && u > 0.38) h = F + 0.025;
  else if (f === 'war') h = F + Math.max(0, u - 0.1) * 0.05;
  return -h * L;
}

/** The attachment points along the deck, stern to bow: [{ x, y, w }]. */
export function attachPoints(look, n = look.slots || (look.fit || []).length || 4) {
  const L = (look.len || 3) * UNIT;
  const f = familyOf(look.hull);
  const lo = f === 'sail' ? (dims(look.hull).castle ? -0.32 : -0.4) : f === 'future' ? -0.4 : f === 'war' ? -0.42 : -0.3;
  const hi = f === 'sail' ? 0.36 : f === 'war' ? 0.4 : 0.4;
  const br = bridgeOf(look.hull);
  // the usable stretches, minus the bridge
  const runs = [];
  if (br && br[0] > lo && br[1] < hi) runs.push([lo, br[0] - 0.015], [br[1] + 0.015, hi]);
  else runs.push([Math.max(lo, br && br[1] < hi && br[1] > lo ? br[1] + 0.015 : lo), hi]);
  const total = runs.reduce((a, [a0, a1]) => a + (a1 - a0), 0);
  const step = total / n;
  const pts = [];
  for (let i = 0; i < n; i++) {
    let t = (i + 0.5) * step;
    let u = runs[0][0];
    for (const [a0, a1] of runs) { if (t <= a1 - a0) { u = a0 + t; break; } t -= a1 - a0; u = a1; }
    const x = u * L;
    pts.push({ x, y: deckY(look, x), w: step * L });
  }
  return pts;
}

// ======================================================================= the hull
function hullPath(ctx, look, L) {
  const hull = look.hull;
  const f = familyOf(hull);
  const { F, D } = dims(hull);
  const d = (x) => deckY(look, x);
  ctx.beginPath();
  if (f === 'sail') {
    ctx.moveTo(-L * 0.5, d(-L * 0.5) - (dims(hull).castle ? L * 0.04 : 0));
    for (let i = -10; i <= 9; i++) ctx.lineTo((i / 20) * L, d((i / 20) * L) - (dims(hull).castle && i < -6 ? L * 0.04 : 0));
    ctx.quadraticCurveTo(L * 0.5, d(L * 0.45) - L * 0.01, L * 0.52, d(L * 0.5) - L * 0.02);
    ctx.quadraticCurveTo(L * 0.46, 0, L * 0.4, D * L);
    ctx.lineTo(-L * 0.38, D * L);
    ctx.quadraticCurveTo(-L * 0.48, D * L * 0.6, -L * 0.5, -F * L * 0.2);
  } else if (f === 'war') {
    ctx.moveTo(-L * 0.5, d(-L * 0.5));
    ctx.lineTo(L * 0.1, d(L * 0.1));
    ctx.lineTo(L * 0.5, d(L * 0.5) - L * 0.006);
    ctx.quadraticCurveTo(L * 0.47, D * L * 0.2, L * 0.4, D * L);
    ctx.lineTo(-L * 0.42, D * L);
    ctx.lineTo(-L * 0.5, D * L * 0.1);
  } else if (f === 'future') {
    ctx.moveTo(-L * 0.5, -F * L * 0.75);
    ctx.lineTo(L * 0.05, -F * L);
    ctx.quadraticCurveTo(L * 0.4, -F * L * 1.05, L * 0.52, -F * L * 0.2);
    ctx.lineTo(L * 0.42, D * L);
    ctx.lineTo(-L * 0.46, D * L);
    ctx.lineTo(-L * 0.5, D * L * 0.2);
  } else if (hull === 'skiff') {
    ctx.moveTo(-L * 0.5, -F * L);
    ctx.lineTo(L * 0.3, -F * L);
    ctx.quadraticCurveTo(L * 0.52, -F * L, L * 0.5, -F * L * 0.2);
    ctx.quadraticCurveTo(L * 0.45, D * L, L * 0.2, D * L);
    ctx.lineTo(-L * 0.45, D * L);
    ctx.lineTo(-L * 0.5, 0);
  } else {
    // cargo and small hulls: a raked bow over a bulb, a transom stern
    const bulb = f === 'cargo' && look.hull !== 'coaster';
    ctx.moveTo(-L * 0.5, d(-L * 0.5));
    ctx.lineTo(L * 0.38, d(L * 0.38));
    ctx.lineTo(L * 0.42, d(L * 0.42 + 1));
    ctx.lineTo(L * 0.5, d(L * 0.5) - L * 0.006);
    ctx.quadraticCurveTo(L * 0.47, -F * L * 0.2, L * 0.455, 0);
    if (bulb) {
      ctx.quadraticCurveTo(L * 0.5, D * L * 0.35, L * 0.47, D * L * 0.75);
      ctx.quadraticCurveTo(L * 0.44, D * L, L * 0.38, D * L);
    } else ctx.quadraticCurveTo(L * 0.44, D * L, L * 0.36, D * L);
    ctx.lineTo(-L * 0.4, D * L);
    ctx.quadraticCurveTo(-L * 0.47, D * L * 0.9, -L * 0.47, D * L * 0.2);
    ctx.lineTo(-L * 0.5, 0);
  }
  ctx.closePath();
}

function drawHull(ctx, look, L, t, fx) {
  const hull = look.hull;
  const f = familyOf(hull);
  const { F, D } = dims(hull);
  const color = fx.coating ? shade(look.color || '#4a4a52', -45) : look.color || '#4a4a52';
  const trim = look.trim || '#e8e2d4';
  // propeller and rudder (behind the hull)
  if (f !== 'future') {
    const px = -L * (f === 'war' ? 0.44 : 0.43);
    ctx.fillStyle = '#b08a3a';
    for (let k = 0; k < 3; k++) {
      const a = t * 6 + (k * Math.PI * 2) / 3;
      ctx.beginPath(); ctx.ellipse(px, D * L * 0.62 + Math.sin(a) * D * L * 0.22, L * 0.006, D * L * 0.2 * Math.abs(Math.cos(a)) + 1, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = shade(color, -35);
    ctx.fillRect(-L * (f === 'war' ? 0.475 : 0.468), D * L * 0.15, L * 0.018, D * L * 0.85);
  }
  // hydrofoils
  if (f === 'future') {
    const fo = dims(hull).foils * L;
    for (const fx2 of [-0.3, 0.28]) {
      ctx.fillStyle = '#9aa4b0';
      ctx.fillRect(fx2 * L - L * 0.006, D * L * 0.5, L * 0.012, fo);
      ctx.fillStyle = '#c8d2dc';
      ctx.beginPath(); ctx.ellipse(fx2 * L, D * L * 0.5 + fo, L * 0.05, L * 0.007, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.save();
  hullPath(ctx, look, L);
  ctx.clip();
  // topsides
  const g = ctx.createLinearGradient(0, -F * L * 1.3, 0, D * L);
  g.addColorStop(0, shade(color, 18));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -30));
  ctx.fillStyle = g;
  ctx.fillRect(-L, -L, L * 2, L * 2);
  // planking or plating
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = Math.max(0.6, L * 0.0015);
  if (f === 'sail') {
    for (let y = -F * L * 1.6; y < D * L; y += L * 0.011) { ctx.beginPath(); ctx.moveTo(-L, y); ctx.lineTo(L, y + Math.sin(y) * 0.5); ctx.stroke(); }
  } else {
    for (let x = -L * 0.5; x < L * 0.5; x += L * 0.045) { ctx.beginPath(); ctx.moveTo(x, -L); ctx.lineTo(x, L); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-L, -F * L * 0.45); ctx.lineTo(L, -F * L * 0.45); ctx.stroke();
  }
  if (fx.plating) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = -L * 0.48; x < L * 0.48; x += L * 0.015) for (const y of [-F * L * 0.8, -F * L * 0.2]) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, L * 0.0018), 0, Math.PI * 2); ctx.fill(); }
  }
  if (fx.armour) {
    ctx.fillStyle = shade(color, -38);
    ctx.fillRect(-L * 0.44, -F * L * 0.42, L * 0.86, F * L * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    for (let x = -L * 0.44; x < L * 0.42; x += L * 0.06) ctx.strokeRect(x, -F * L * 0.42, L * 0.06, F * L * 0.5);
  }
  if (fx.coating) {
    ctx.strokeStyle = 'rgba(160,190,220,0.18)';
    ctx.lineWidth = Math.max(0.8, L * 0.002);
    for (let x = -L * 0.5; x < L * 0.5; x += L * 0.07) { ctx.beginPath(); ctx.moveTo(x, -F * L); ctx.lineTo(x + L * 0.04, D * L); ctx.stroke(); }
  }
  // the sheer stripe in the trim colour
  ctx.fillStyle = trim;
  ctx.beginPath();
  for (let i = -10; i <= 10; i++) { const x = (i / 20) * L; ctx.lineTo(x, deckY(look, x) + L * 0.004); }
  for (let i = 10; i >= -10; i--) { const x = (i / 20) * L; ctx.lineTo(x, deckY(look, x) + L * (f === 'sail' ? 0.01 : 0.012)); }
  ctx.fill();
  // below the waterline: antifouling (copper on wooden hulls) and a boot-top
  ctx.fillStyle = f === 'sail' ? '#b8733a' : f === 'future' ? '#2a3440' : '#8a2a22';
  ctx.fillRect(-L, L * 0.004, L * 2, L);
  ctx.fillStyle = '#16181c';
  ctx.fillRect(-L, -L * 0.006, L * 2, L * 0.01);
  // portholes / gun-ports / glowing seams
  if (f === 'sail') {
    const n = fx.guns ? (dims(hull).castle ? 2 : 1) : 0;
    for (let row = 0; row < n; row++) {
      for (let x = -L * 0.36; x < L * 0.34; x += L * 0.045) {
        const y = deckY(look, x) + L * (0.024 + row * 0.03);
        ctx.fillStyle = '#c8402a'; ctx.fillRect(x - L * 0.009, y - L * 0.008, L * 0.018, L * 0.016);
        ctx.fillStyle = '#121214'; ctx.fillRect(x - L * 0.006, y - L * 0.005, L * 0.012, L * 0.01);
        ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x - L * 0.002, y - L * 0.002, L * 0.012, L * 0.004);
      }
    }
    if (dims(hull).castle) {
      // the stern gallery
      ctx.fillStyle = shade(trim, -10);
      ctx.fillRect(-L * 0.5, deckY(look, -L * 0.48) - L * 0.035, L * 0.07, L * 0.03);
      ctx.fillStyle = '#ffd88a';
      for (let k = 0; k < 3; k++) ctx.fillRect(-L * 0.49 + k * L * 0.02, deckY(look, -L * 0.48) - L * 0.03, L * 0.012, L * 0.016);
    }
  } else if (f === 'future') {
    ctx.save();
    ctx.strokeStyle = trim; ctx.shadowColor = trim; ctx.shadowBlur = L * 0.02;
    ctx.lineWidth = Math.max(1, L * 0.004);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2);
    ctx.beginPath(); ctx.moveTo(-L * 0.48, -F * L * 0.45); ctx.lineTo(L * 0.46, -F * L * 0.35); ctx.stroke();
    ctx.restore();
  } else if (f !== 'war') {
    ctx.fillStyle = 'rgba(20,24,30,0.7)';
    for (let x = -L * 0.45; x < -L * 0.32; x += L * 0.022) { ctx.beginPath(); ctx.arc(x, -F * L * 0.7, L * 0.004, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  // hull number / name board and an anchor
  if (f === 'war' && fx.number) {
    ctx.fillStyle = '#f2f0ea';
    ctx.font = `bold ${Math.round(L * 0.03)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(look.number || 'O-1', L * 0.38, -F * L * 0.55);
  }
  if (f === 'cargo' || f === 'small') {
    ctx.fillStyle = '#1a1c20';
    ctx.beginPath(); ctx.arc(L * 0.43, -F * L * 0.65, L * 0.008, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a3c40'; ctx.lineWidth = Math.max(0.8, L * 0.003);
    ctx.beginPath(); ctx.moveTo(L * 0.43, -F * L * 0.6); ctx.lineTo(L * 0.428, -F * L * 0.35); ctx.stroke();
  }
  // bowsprit and figurehead
  if (f === 'sail') {
    const by = deckY(look, L * 0.5) - L * 0.02;
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(1.2, L * 0.006);
    ctx.beginPath(); ctx.moveTo(L * 0.48, by); ctx.lineTo(L * 0.66, by - L * 0.07); ctx.stroke();
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.ellipse(L * 0.51, by + L * 0.02, L * 0.01, L * 0.018, -0.4, 0, Math.PI * 2); ctx.fill();
  }
  // the railing
  ctx.strokeStyle = f === 'sail' ? '#6a4a2a' : 'rgba(230,230,230,0.7)';
  ctx.lineWidth = Math.max(0.6, L * 0.0015);
  ctx.beginPath();
  for (let i = -19; i <= 19; i++) { const x = (i / 40) * L; ctx.lineTo(x, deckY(look, x) - L * 0.012); }
  ctx.stroke();
  for (let i = -19; i <= 19; i += 1) { const x = (i / 40) * L; ctx.beginPath(); ctx.moveTo(x, deckY(look, x)); ctx.lineTo(x, deckY(look, x) - L * 0.012); ctx.stroke(); }
}

/** The bridge / deckhouse every powered hull has. */
function drawBridge(ctx, look, L, t) {
  const br = bridgeOf(look.hull);
  if (!br) return;
  const f = familyOf(look.hull);
  const x0 = br[0] * L;
  const x1 = br[1] * L;
  const base = deckY(look, (x0 + x1) / 2);
  const tiers = look.hull === 'skiff' ? 1 : f === 'war' ? 3 : f === 'future' ? 2 : f === 'small' ? 2 : look.len >= 6 ? 4 : look.len >= 4.5 ? 3 : 2;
  const th = L * (f === 'small' ? 0.034 : look.len <= 3.4 ? 0.04 : 0.032);
  const white = f === 'war' ? shade(look.color || '#6f7f8f', 12) : f === 'future' ? shade(look.color || '#d8dee6', 8) : '#f2f0ea';
  let top = base;
  for (let k = 0; k < tiers; k++) {
    const inset = (x1 - x0) * (f === 'war' ? 0.1 * k : 0.04 * k);
    const a = x0 + inset;
    const b = x1 - (f === 'future' ? inset * 3 : inset * (f === 'war' ? 1 : 0.2));
    const y = base - (k + 1) * th;
    ctx.fillStyle = shade(white, -k * 3);
    if (f === 'future') {
      ctx.beginPath(); ctx.moveTo(a, y + th); ctx.lineTo(a + th * 0.6, y); ctx.lineTo(b - th, y); ctx.lineTo(b, y + th); ctx.closePath(); ctx.fill();
    } else ctx.fillRect(a, y, b - a, th);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(a, y + th - L * 0.003, b - a, L * 0.003);
    // windows: the top tier is the wheelhouse, all glass
    const wy = y + th * 0.3;
    const wh = th * (k === tiers - 1 ? 0.45 : 0.3);
    const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
    glass.addColorStop(0, '#5a8ab0'); glass.addColorStop(1, '#1a3a5a');
    ctx.fillStyle = glass;
    if (k === tiers - 1) ctx.fillRect(a + th * 0.2, wy, b - a - th * 0.4, wh);
    else for (let x = a + th * 0.3; x < b - th * 0.4; x += th * 0.55) ctx.fillRect(x, wy, th * 0.32, wh);
    top = y;
  }
  // bridge wings, a lifeboat, the mast with its lights
  if (f === 'cargo') {
    ctx.fillStyle = white;
    ctx.fillRect(x0 - L * 0.01, top + th * 0.05, x1 - x0 + L * 0.02, th * 0.12);
    ctx.fillStyle = '#e8641e';
    ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, base - th * 1.15, (x1 - x0) * 0.28, th * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2f0ea';
    ctx.fillRect((x0 + x1) / 2 - (x1 - x0) * 0.2, base - th * 1.3, (x1 - x0) * 0.4, th * 0.08);
  }
  const mx = (x0 + x1) / 2;
  ctx.strokeStyle = f === 'war' ? '#2a3440' : '#cfd4da';
  ctx.lineWidth = Math.max(1, L * 0.003);
  ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, top - L * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx - L * 0.015, top - L * 0.045); ctx.lineTo(mx + L * 0.015, top - L * 0.045); ctx.stroke();
  const blink = Math.sin(t * 3) > 0;
  ctx.fillStyle = blink ? '#fff6c0' : '#c0b080';
  ctx.beginPath(); ctx.arc(mx, top - L * 0.062, Math.max(1, L * 0.003), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e83a3a'; ctx.beginPath(); ctx.arc(mx - L * 0.015, top - L * 0.045, Math.max(0.8, L * 0.0025), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3ae86a'; ctx.beginPath(); ctx.arc(mx + L * 0.015, top - L * 0.045, Math.max(0.8, L * 0.0025), 0, Math.PI * 2); ctx.fill();
}

// ======================================================================= the parts
const box = (ctx, x, y, w, h, fill, edge = 'rgba(0,0,0,0.25)') => {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge; ctx.lineWidth = Math.max(0.5, Math.min(w, h) * 0.04); ctx.strokeRect(x, y, w, h);
};
const glow = (ctx, colour, blur, fn) => { ctx.save(); ctx.shadowColor = colour; ctx.shadowBlur = blur; fn(); ctx.restore(); };
const CONTAINER_COLOURS = ['#c0402a', '#2a6ab0', '#e8c35a', '#3a8a5a', '#8a4ab0', '#e07a2a', '#5a6a7a'];

/**
 * Draw one part standing on the deck at (x, y): w is its slot's width, m the
 * height module, P the part key. Each part sticks to its slot (the crane's
 * boom and the masts' sails may overhang).
 */
function drawPart(ctx, P, x, y, w, m, look, t, seed = 0, family = 'cargo') {
  const trim = look.trim || '#e8e2d4';
  const color = look.color || '#4a4a52';
  const W = w * 0.86;
  const l = x - W / 2;
  switch (P) {
    case 'funnel': case 'ecofunnel': case 'turbine': {
      const twin = P === 'turbine';
      const fw = W * (twin ? 0.3 : 0.42);
      const fh = m * (P === 'ecofunnel' ? 2.1 : twin ? 3 : 2.5);
      box(ctx, x - W * 0.4, y - m * 0.5, W * 0.8, m * 0.5, shade(color, 10));
      for (const dx of twin ? [-fw * 0.6, fw * 0.6] : [0]) {
        const fx = x + dx;
        ctx.fillStyle = P === 'ecofunnel' ? '#e8eee8' : trim;
        ctx.beginPath(); ctx.moveTo(fx - fw / 2, y - m * 0.5); ctx.lineTo(fx - fw * 0.42, y - fh); ctx.lineTo(fx + fw * 0.5, y - fh); ctx.lineTo(fx + fw / 2, y - m * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = P === 'ecofunnel' ? '#3a9a5a' : '#f2f0ea';
        ctx.fillRect(fx - fw * 0.46, y - fh * 0.7, fw * 0.94, fh * 0.12);
        ctx.fillStyle = '#16181c';
        ctx.fillRect(fx - fw * 0.43, y - fh, fw * 0.93, fh * 0.12);
        // smoke
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.5 + k / 4 + seed * 0.13) % 1;
          ctx.fillStyle = `rgba(${twin ? '120,110,100' : P === 'ecofunnel' ? '220,230,220' : '90,90,96'},${0.35 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(fx - ph * W * 0.8, y - fh - ph * m * 2.2, fw * (0.3 + ph * 0.6), 0, Math.PI * 2); ctx.fill();
        }
      }
      if (P === 'ecofunnel') { ctx.fillStyle = '#2a4a6a'; ctx.fillRect(x - W * 0.45, y - m * 0.62, W * 0.9, m * 0.1); }
      break;
    }
    case 'fusion': {
      const h = m * 1.5;
      ctx.fillStyle = '#c8d0da';
      ctx.beginPath(); ctx.roundRect(l, y - h, W, h, h * 0.4); ctx.fill();
      ctx.fillStyle = '#2a3440'; ctx.fillRect(l + W * 0.1, y - h * 0.62, W * 0.8, h * 0.24);
      glow(ctx, '#5ad8ff', m, () => {
        const p = 0.6 + 0.4 * Math.sin(t * 4 + seed);
        ctx.fillStyle = `rgba(90,216,255,${p})`;
        ctx.beginPath(); ctx.arc(x, y - h * 0.5, h * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = Math.max(0.6, h * 0.04);
        ctx.beginPath(); ctx.arc(x, y - h * 0.5, h * 0.34, t * 2, t * 2 + 4.5); ctx.stroke();
      });
      break;
    }
    case 'core': {
      const h = m * 1.2;
      box(ctx, l + W * 0.1, y - h * 0.5, W * 0.8, h * 0.5, '#9aa4b0');
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#6a7480'; ctx.fillRect(l + W * (0.14 + k * 0.15), y - h * 0.48, W * 0.04, h * 0.44); }
      ctx.fillStyle = '#d8dee6';
      ctx.beginPath(); ctx.arc(x, y - h * 0.5, W * 0.3, Math.PI, 0); ctx.fill();
      glow(ctx, '#ffb84a', m, () => { ctx.fillStyle = `rgba(255,184,74,${0.7 + 0.3 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(x, y - h * 0.62, W * 0.1, 0, Math.PI * 2); ctx.fill(); });
      break;
    }
    case 'generator': case 'turbogen': {
      const h = m * (P === 'turbogen' ? 1.1 : 0.8);
      box(ctx, l + W * 0.08, y - h, W * 0.84, h, '#7a8088');
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 4; k++) ctx.fillRect(l + W * 0.16, y - h * (0.8 - k * 0.17), W * 0.4, h * 0.06);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#1a1a1a' : '#f2c14e'; ctx.fillRect(l + W * 0.08 + (k * W * 0.84) / 6, y - h * 0.14, (W * 0.84) / 6, h * 0.14); }
      ctx.fillStyle = '#3a3c40';
      ctx.fillRect(x + W * 0.2, y - h - m * 0.6, W * 0.08, m * 0.6);
      if (P === 'turbogen') {
        ctx.fillRect(x + W * 0.32, y - h - m * 0.5, W * 0.08, m * 0.5);
        ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = Math.max(0.6, h * 0.05);
        ctx.beginPath(); ctx.arc(x + W * 0.2, y - h * 0.5, h * 0.24, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 4; k++) { const a = t * 8 + (k * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(x + W * 0.2, y - h * 0.5); ctx.lineTo(x + W * 0.2 + Math.cos(a) * h * 0.22, y - h * 0.5 + Math.sin(a) * h * 0.22); ctx.stroke(); }
      }
      break;
    }
    case 'hatch': case 'hatch2': case 'bulk': {
      const h = m * (P === 'hatch' ? 0.45 : 0.6);
      box(ctx, l, y - h, W, h, shade(color, -18));
      const panels = P === 'hatch' ? 2 : 3;
      for (let k = 0; k < panels; k++) {
        const pw = W / panels;
        ctx.fillStyle = shade(trim === '#e8e2d4' ? '#5a6a4a' : trim, -25);
        ctx.fillRect(l + k * pw + pw * 0.06, y - h - m * 0.12, pw * 0.88, m * 0.14);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(l + k * pw + pw * 0.06, y - h - m * 0.12, pw * 0.88, m * 0.03);
      }
      if (P === 'bulk') {
        ctx.fillStyle = '#7a5a3a';
        ctx.beginPath(); ctx.moveTo(l + W * 0.15, y - h - m * 0.12); ctx.quadraticCurveTo(x, y - h - m * 0.9, l + W * 0.85, y - h - m * 0.12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(l + W * (0.25 + ((k * 37) % 50) / 100), y - h - m * (0.2 + (k % 3) * 0.12), m * 0.04, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'containers': {
      const rows = 3;
      const ch = m * 0.55;
      const cols = 2;
      const cw = W / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const col = CONTAINER_COLOURS[(seed * 3 + r * 5 + c * 2) % CONTAINER_COLOURS.length];
          const bx = l + c * cw;
          const by = y - (r + 1) * ch;
          box(ctx, bx + cw * 0.03, by, cw * 0.94, ch * 0.96, col, 'rgba(0,0,0,0.35)');
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(0.4, cw * 0.02);
          for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(bx + (cw * k) / 6, by + ch * 0.1); ctx.lineTo(bx + (cw * k) / 6, by + ch * 0.86); ctx.stroke(); }
        }
      }
      break;
    }
    case 'reefer': {
      const h = m * 1.2;
      box(ctx, l, y - h, W, h, '#eef2f6');
      ctx.fillStyle = '#4ad8e8'; ctx.fillRect(l, y - h * 0.62, W, h * 0.1);
      for (let k = 0; k < 2; k++) {
        const fx = l + W * (0.28 + k * 0.44);
        const fy = y - h * 0.3;
        ctx.fillStyle = '#aab4c0'; ctx.beginPath(); ctx.arc(fx, fy, W * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a5460'; ctx.lineWidth = Math.max(0.5, W * 0.02);
        for (let b = 0; b < 3; b++) { const a = t * 7 + b * 2.1 + k; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * W * 0.11, fy + Math.sin(a) * W * 0.11); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(200,240,255,0.7)';
      ctx.fillRect(l + W * 0.05, y - h * 0.95, W * 0.9, h * 0.12);
      ctx.fillStyle = '#2a6ab0';
      ctx.font = `bold ${Math.max(5, h * 0.18)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('❄', x, y - h * 0.8);
      break;
    }
    case 'crane': {
      box(ctx, x - W * 0.12, y - m * 1.2, W * 0.24, m * 1.2, '#e8b43a');
      const ang = -0.9 + Math.sin(t * 0.4 + seed) * 0.08;
      const len = w * (family === 'icon' ? 0.9 : 1.8);
      const bx = x + Math.cos(ang) * len;
      const by = y - m * 1.2 + Math.sin(ang) * len;
      ctx.strokeStyle = '#e8b43a'; ctx.lineWidth = Math.max(1, W * 0.06);
      ctx.beginPath(); ctx.moveTo(x, y - m * 1.2); ctx.lineTo(bx, by); ctx.stroke();
      ctx.lineWidth = Math.max(0.5, W * 0.015); ctx.strokeStyle = '#a07a1a';
      for (let k = 0; k < 8; k++) { const f0 = k / 8; const f1 = (k + 1) / 8; ctx.beginPath(); ctx.moveTo(x + (bx - x) * f0, y - m * 1.2 + (by - y + m * 1.2) * f0 - W * 0.04); ctx.lineTo(x + (bx - x) * f1, y - m * 1.2 + (by - y + m * 1.2) * f1 + W * 0.04); ctx.stroke(); }
      ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = Math.max(0.4, W * 0.01);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + m * 1.6); ctx.stroke();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(bx - W * 0.05, by + m * 1.6, W * 0.1, W * 0.08);
      box(ctx, x - W * 0.2, y - m * 1.45, W * 0.3, m * 0.3, '#f2f0ea');
      break;
    }
    case 'cabins': {
      const h = m * 1.1;
      box(ctx, l, y - h, W, h, '#f2f0ea');
      ctx.fillStyle = trim; ctx.fillRect(l, y - h, W, h * 0.12);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = '#ffd88a';
        ctx.beginPath(); ctx.arc(l + W * (0.15 + k * 0.23), y - h * 0.55, h * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = Math.max(0.4, h * 0.03); ctx.stroke();
      }
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(l + W * 0.82, y - h * 0.6, W * 0.1, h * 0.6);
      break;
    }
    case 'pod': {
      const h = m * 1.2;
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath(); ctx.roundRect(l, y - h, W, h, h * 0.5); ctx.fill();
      glow(ctx, '#4ad8e8', m * 0.6, () => { ctx.strokeStyle = '#4ad8e8'; ctx.lineWidth = Math.max(0.6, h * 0.04); ctx.beginPath(); ctx.roundRect(l + W * 0.08, y - h * 0.85, W * 0.84, h * 0.7, h * 0.35); ctx.stroke(); });
      ctx.fillStyle = '#e8c35a';
      ctx.beginPath(); ctx.moveTo(x, y - h * 0.7); ctx.lineTo(x + h * 0.18, y - h * 0.38); ctx.lineTo(x - h * 0.18, y - h * 0.38); ctx.closePath(); ctx.fill();
      break;
    }
    case 'navmast': {
      box(ctx, x - W * 0.25, y - m * 0.7, W * 0.5, m * 0.7, '#f2f0ea');
      ctx.fillStyle = '#2a4a6a'; ctx.fillRect(x - W * 0.2, y - m * 0.6, W * 0.4, m * 0.2);
      ctx.strokeStyle = '#cfd4da'; ctx.lineWidth = Math.max(0.8, W * 0.03);
      ctx.beginPath(); ctx.moveTo(x, y - m * 0.7); ctx.lineTo(x, y - m * 2.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - W * 0.2, y - m * 1.9); ctx.lineTo(x + W * 0.2, y - m * 1.9); ctx.stroke();
      ctx.lineWidth = Math.max(0.4, W * 0.01);
      ctx.beginPath(); ctx.moveTo(x, y - m * 2.4); ctx.lineTo(x + W * 0.35, y - m * 3); ctx.stroke();
      ctx.fillStyle = Math.sin(t * 3 + seed) > 0 ? '#ffeaa0' : '#a09060';
      ctx.beginPath(); ctx.arc(x, y - m * 2.45, Math.max(0.8, W * 0.04), 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'radar': {
      ctx.strokeStyle = family === 'war' ? '#3a4450' : '#cfd4da';
      ctx.lineWidth = Math.max(0.8, W * 0.04);
      ctx.beginPath(); ctx.moveTo(x - W * 0.2, y); ctx.lineTo(x, y - m * 2.2); ctx.lineTo(x + W * 0.2, y); ctx.stroke();
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - W * 0.2 * (1 - k / 4), y - m * 0.55 * k); ctx.lineTo(x + W * 0.2 * (1 - k / 4), y - m * 0.55 * k); ctx.stroke(); }
      box(ctx, x - W * 0.18, y - m * 2.35, W * 0.36, m * 0.18, '#d8dee6');
      const c = Math.cos(t * 3 + seed);
      ctx.fillStyle = '#e8eef4';
      ctx.fillRect(x - W * 0.42 * Math.abs(c), y - m * 2.62, W * 0.84 * Math.abs(c) + 1, m * 0.18);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x - W * 0.42 * Math.abs(c), y - m * 2.5, W * 0.84 * Math.abs(c) + 1, m * 0.05);
      break;
    }
    case 'antenna': case 'command': {
      const tall = P === 'command' ? 3.4 : 2.6;
      if (P === 'command') {
        ctx.fillStyle = shade(color, 15);
        ctx.beginPath(); ctx.moveTo(l + W * 0.05, y); ctx.lineTo(l + W * 0.15, y - m * 1.1); ctx.lineTo(l + W * 0.85, y - m * 1.1); ctx.lineTo(l + W * 0.95, y); ctx.fill();
        ctx.fillStyle = '#1a3a5a'; ctx.fillRect(l + W * 0.2, y - m * 0.95, W * 0.6, m * 0.3);
      }
      ctx.strokeStyle = '#2a3440'; ctx.lineWidth = Math.max(0.6, W * 0.025);
      for (const dx of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.moveTo(x + dx * W, y - (P === 'command' ? m * 1.1 : 0)); ctx.lineTo(x + dx * W * 1.3, y - m * tall * (dx ? 0.75 : 1)); ctx.stroke(); }
      ctx.fillStyle = '#e8eef4';
      ctx.beginPath(); ctx.ellipse(x - W * 0.3, y - m * tall * 0.55, W * 0.14, m * 0.3, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.arc(x, y - m * tall, Math.max(0.8, W * 0.035), 0, Math.PI * 2); ctx.fill();
      if (P === 'command') { ctx.fillStyle = trim; ctx.fillRect(x, y - m * tall, W * 0.25, m * 0.25); }
      break;
    }
    case 'plating': case 'armour': {
      const h = m * (P === 'armour' ? 0.8 : 0.5);
      ctx.fillStyle = shade(color, -30);
      ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(l + W * 0.15, y - h); ctx.lineTo(l + W * 0.85, y - h); ctx.lineTo(l + W, y); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(l + W * (0.2 + k * 0.15), y - h * 0.5, Math.max(0.6, W * 0.02), 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'coating': {
      glow(ctx, '#7a9ac8', m * 0.5, () => {
        ctx.fillStyle = '#2a3040';
        ctx.beginPath(); ctx.moveTo(l + W * 0.2, y); ctx.lineTo(x, y - m * 0.9); ctx.lineTo(l + W * 0.8, y); ctx.fill();
        ctx.strokeStyle = 'rgba(140,180,230,0.6)'; ctx.lineWidth = Math.max(0.5, W * 0.015);
        ctx.stroke();
      });
      break;
    }
    case 'decoy': {
      box(ctx, l + W * 0.2, y - m * 0.4, W * 0.6, m * 0.4, shade(color, -10));
      ctx.fillStyle = '#3a3c40';
      for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(l + W * (0.3 + k * 0.13), y - m * 0.4); ctx.rotate(-0.5); ctx.fillRect(-W * 0.04, -m * 0.7, W * 0.08, m * 0.7); ctx.restore(); }
      break;
    }
    case 'guns': {
      // a deck cannon (the broadside's gun-ports are drawn on the hull)
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - W * 0.25, y - m * 0.3, W * 0.5, m * 0.3);
      ctx.fillStyle = '#121214';
      ctx.beginPath(); ctx.arc(x - W * 0.12, y - m * 0.1, m * 0.12, 0, Math.PI * 2); ctx.arc(x + W * 0.12, y - m * 0.1, m * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x - W * 0.1, y - m * 0.5, W * 0.55, m * 0.2);
      break;
    }
    case 'turret': case 'railgun': {
      const h = m * (P === 'railgun' ? 0.8 : 0.9);
      ctx.fillStyle = shade(color, 8);
      ctx.fillRect(x - W * 0.2, y - h * 0.35, W * 0.4, h * 0.35);
      ctx.beginPath(); ctx.moveTo(x - W * 0.36, y - h * 0.35); ctx.lineTo(x - W * 0.3, y - h); ctx.lineTo(x + W * 0.2, y - h); ctx.lineTo(x + W * 0.36, y - h * 0.35); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - W * 0.3, y - h * 0.5, W * 0.6, h * 0.05);
      const elev = -0.12 + Math.sin(t * 0.6 + seed) * 0.05;
      ctx.save(); ctx.translate(x + W * 0.25, y - h * 0.68); ctx.rotate(elev);
      ctx.fillStyle = '#2a2e34'; ctx.fillRect(0, -h * 0.07, W * 0.7, h * 0.14);
      if (P === 'railgun') {
        ctx.fillRect(0, -h * 0.2, W * 0.75, h * 0.07);
        glow(ctx, '#5ad8ff', m * 0.5, () => { ctx.fillStyle = `rgba(90,216,255,${0.6 + 0.4 * Math.sin(t * 5)})`; ctx.fillRect(W * 0.05, -h * 0.12, W * 0.65, h * 0.04); });
      }
      ctx.restore();
      break;
    }
    case 'missile': {
      const h = m * 0.9;
      box(ctx, l + W * 0.1, y - h * 0.5, W * 0.8, h * 0.5, shade(color, 5));
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let k = 0; k < 4; k++) ctx.fillRect(l + W * (0.15 + k * 0.18), y - h * 0.48, W * 0.14, h * 0.08);
      ctx.save(); ctx.translate(x - W * 0.1, y - h * 0.5); ctx.rotate(-0.6);
      box(ctx, 0, -h * 0.28, W * 0.7, h * 0.5, shade(color, -12));
      ctx.fillStyle = '#e8e2d4';
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(W * 0.7, -h * 0.15 + k * h * 0.25, h * 0.09, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'sandbags': {
      ctx.fillStyle = '#b8a070';
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(l + W * (0.2 + k * 0.2 + r * 0.1), y - m * (0.12 + r * 0.22), W * 0.11, m * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x, y - m * 0.7, W * 0.4, m * 0.08);
      ctx.fillStyle = '#4a5a3a'; ctx.beginPath(); ctx.arc(x - W * 0.05, y - m * 0.75, m * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sonar': {
      // under the keel, drawn by drawProfile after the hull
      break;
    }
    case 'crowsnest': {
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1, W * 0.05);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - m * 3.6); ctx.stroke();
      ctx.fillStyle = '#7a5a3a';
      ctx.beginPath(); ctx.moveTo(x - W * 0.22, y - m * 3.2); ctx.lineTo(x + W * 0.22, y - m * 3.2); ctx.lineTo(x + W * 0.16, y - m * 2.8); ctx.lineTo(x - W * 0.16, y - m * 2.8); ctx.fill();
      ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = Math.max(0.6, W * 0.025);
      ctx.beginPath(); ctx.moveTo(x + W * 0.1, y - m * 3.3); ctx.lineTo(x + W * 0.4, y - m * 3.45); ctx.stroke();
      break;
    }
    case 'qsensor': case 'aegis': {
      const r = P === 'aegis' ? W * 0.42 : W * 0.32;
      box(ctx, x - W * 0.15, y - m * 0.8, W * 0.3, m * 0.8, '#9aa4b0');
      ctx.fillStyle = '#e8eef4';
      ctx.beginPath(); ctx.arc(x, y - m * 0.8 - r * 0.8, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,150,0.4)'; ctx.lineWidth = Math.max(0.4, r * 0.03);
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x, y - m * 0.8 - r * 0.8, r * Math.cos((k * Math.PI) / 6), r, 0, 0, Math.PI * 2); ctx.stroke(); }
      glow(ctx, P === 'aegis' ? '#4a8ae8' : '#b04ae8', m, () => {
        ctx.strokeStyle = P === 'aegis' ? 'rgba(74,138,232,0.8)' : 'rgba(176,74,232,0.7)';
        ctx.lineWidth = Math.max(0.6, r * 0.05);
        const ph = (t * 0.8) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(x, y - m * 0.8 - r * 0.8, r * (1 + ph * 0.8), 0, Math.PI * 2); ctx.stroke();
      });
      break;
    }
    case 'mast': case 'topsail': {
      const H = P === 'topsail' ? m * 5 : m * 7.5;
      const square = SQUARE_RIG.includes(look.hull);
      const sway = Math.sin(t * 0.9 + seed) * m * 0.08;
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(1.2, W * 0.06);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway, y - H); ctx.stroke();
      // rigging to the deck either side
      ctx.strokeStyle = 'rgba(40,30,20,0.55)'; ctx.lineWidth = Math.max(0.4, W * 0.01);
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sway, y - H); ctx.lineTo(x + d * w * 0.9, y); ctx.stroke(); }
      const sail = (yt, yb, wTop, wBot) => {
        const billow = Math.sin(t * 1.3 + seed) * wBot * 0.05;
        ctx.fillStyle = '#efe6d0';
        ctx.beginPath();
        ctx.moveTo(x + sway - wTop / 2, yt);
        ctx.lineTo(x + sway + wTop / 2, yt);
        ctx.quadraticCurveTo(x + sway + wBot / 2 + billow + wBot * 0.12, (yt + yb) / 2, x + sway + wBot / 2, yb);
        ctx.lineTo(x + sway - wBot / 2, yb);
        ctx.quadraticCurveTo(x + sway - wBot / 2 + billow + wBot * 0.12, (yt + yb) / 2, x + sway - wTop / 2, yt);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.lineWidth = Math.max(0.4, wBot * 0.01);
        ctx.beginPath(); ctx.moveTo(x + sway - wBot / 2, (yt + yb) / 2); ctx.lineTo(x + sway + wBot / 2, (yt + yb) / 2); ctx.stroke();
        ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(0.8, W * 0.035);
        ctx.beginPath(); ctx.moveTo(x + sway - wTop * 0.55, yt); ctx.lineTo(x + sway + wTop * 0.55, yt); ctx.stroke();
      };
      if (square) {
        const n = P === 'topsail' ? 2 : 3;
        for (let k = 0; k < n; k++) {
          const yb = y - m * 1.1 - k * (H - m * 1.4) / n;
          const yt = yb - ((H - m * 1.4) / n) * 0.88;
          sail(yt, yb, w * (1.15 - k * 0.22), w * (1.25 - k * 0.22));
        }
        ctx.fillStyle = look.trim || '#c8402a';
        ctx.beginPath(); ctx.moveTo(x + sway, y - H); ctx.lineTo(x + sway + w * 0.35, y - H + m * 0.15); ctx.lineTo(x + sway, y - H + m * 0.3); ctx.fill();
      } else {
        // fore-and-aft: a gaff sail behind the mast, a jib before
        const billow = Math.sin(t * 1.3 + seed) * w * 0.05;
        ctx.fillStyle = '#efe6d0';
        ctx.beginPath(); ctx.moveTo(x + sway, y - H * 0.92); ctx.lineTo(x - w * 1.2, y - H * 0.7); ctx.quadraticCurveTo(x - w * 1.25 + billow, y - H * 0.35, x - w * 1.25, y - m * 1.2); ctx.lineTo(x, y - m * 1.2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + sway, y - H * 0.88); ctx.quadraticCurveTo(x + w * 0.5 + billow, y - H * 0.4, x + w * 0.85, y - m * 0.9); ctx.lineTo(x + w * 0.1, y - m * 0.9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(0.8, W * 0.035);
        ctx.beginPath(); ctx.moveTo(x, y - m * 1.2); ctx.lineTo(x - w * 1.3, y - m * 1.2); ctx.stroke();
      }
      break;
    }
    default: {
      box(ctx, l + W * 0.2, y - m * 0.5, W * 0.6, m * 0.5, '#8a9098');
    }
  }
}

/** A part's key (for any component id). */
export const partKey = (id) => PROFILE_PART[id] || 'box';

/**
 * Draw a ship side-on, centred on (0, 0) in model units, bow to the right.
 * opts: { time, water (true), points ([{ x, y, w, state }]) to draw
 * attachment points, hover (index), fit (override look.fit) }.
 */
export function drawProfile(ctx, look, opts = {}) {
  const t = opts.time || 0;
  const L = (look.len || 3) * UNIT;
  const f = familyOf(look.hull);
  const fit = opts.fit || look.fit || [];
  const pts = attachPoints(look, Math.max(fit.length, look.slots || 0, 1));
  const keys = fit.map((id) => (id ? partKey(id) : null));
  const fx = { plating: keys.includes('plating'), armour: keys.includes('armour'), coating: keys.includes('coating'), guns: keys.includes('guns') };
  const m = Math.min(L * (f === 'sail' ? 0.034 : 0.055), (pts[0]?.w || L * 0.1) * 0.8);
  // things behind the hull: masts' rigging and tall parts read better in front, so the hull goes first
  drawHull(ctx, look, L, t, { ...fx, number: !opts.points });
  // sonar bulbs under the keel
  keys.forEach((k, i) => {
    if (k !== 'sonar' || !pts[i]) return;
    const D = dims(look.hull).D * L;
    ctx.fillStyle = '#2a3440';
    ctx.beginPath(); ctx.ellipse(pts[i].x, D + m * 0.3, m * 0.9, m * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4ad8e8'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3); ctx.beginPath(); ctx.arc(pts[i].x + m * 0.5, D + m * 0.3, m * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  });
  drawBridge(ctx, look, L, t);
  // parts, stern to bow; masts last so their sails sit on top
  const order = keys.map((k, i) => i).sort((a, b) => (keys[a] === 'mast' || keys[a] === 'topsail' ? 1 : 0) - (keys[b] === 'mast' || keys[b] === 'topsail' ? 1 : 0));
  for (const i of order) {
    const k = keys[i];
    const p = pts[i];
    if (!k || !p) continue;
    drawPart(ctx, k, p.x, p.y, p.w, m, look, t, i, f);
  }
  // the sea
  if (opts.water !== false) {
    const D = dims(look.hull).D * L + (dims(look.hull).foils || 0) * L;
    const sea = ctx.createLinearGradient(0, 0, 0, D * 1.6);
    sea.addColorStop(0, 'rgba(40,130,170,0.38)');
    sea.addColorStop(1, 'rgba(10,40,70,0.8)');
    ctx.fillStyle = sea;
    ctx.beginPath();
    const wx0 = -L * 0.56;
    const wx1 = L * (f === 'sail' ? 0.68 : 0.56);
    ctx.moveTo(wx0, D * 1.6);
    for (let x = wx0; x <= wx1; x += L * 0.02) ctx.lineTo(x, Math.sin(x * 0.05 + t * 1.6) * L * 0.004 + Math.sin(x * 0.013 - t) * L * 0.003);
    ctx.lineTo(wx1, D * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.5)';
    ctx.lineWidth = Math.max(0.8, L * 0.002);
    ctx.beginPath();
    for (let x = wx0; x <= wx1; x += L * 0.02) ctx.lineTo(x, Math.sin(x * 0.05 + t * 1.6) * L * 0.004 + Math.sin(x * 0.013 - t) * L * 0.003);
    ctx.stroke();
  }
  // attachment points (the builder)
  if (opts.points) {
    opts.points.forEach((p, i) => {
      const q = pts[i];
      if (!q) return;
      const r = Math.max(m * 0.55, Math.min(q.w * 0.3, m * 0.9));
      const cy = q.y - r * 1.4;
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + i);
      const col = p.state === 'bad' ? '255,90,90' : p.state === 'target' ? '242,193,78' : p.state === 'filled' ? '120,255,200' : '58,214,255';
      ctx.save();
      ctx.shadowColor = `rgb(${col})`;
      ctx.shadowBlur = r * (p.state === 'target' ? 2.5 : 1.5);
      ctx.strokeStyle = `rgba(${col},${p.state === 'filled' ? 0.35 : 0.5 + 0.5 * pulse})`;
      ctx.lineWidth = Math.max(1, r * (p.state === 'target' || opts.hover === i ? 0.22 : 0.12));
      ctx.beginPath(); ctx.arc(q.x, cy, r * (p.state === 'target' ? 1.25 : 1), 0, Math.PI * 2); ctx.stroke();
      if (p.state !== 'filled') {
        ctx.fillStyle = `rgba(${col},${0.12 + 0.12 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${col},0.9)`;
        ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath(); ctx.moveTo(q.x - r * 0.45, cy); ctx.lineTo(q.x + r * 0.45, cy); ctx.moveTo(q.x, cy - r * 0.45); ctx.lineTo(q.x, cy + r * 0.45); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = `rgba(${col},0.9)`;
      ctx.font = `600 ${Math.max(6, r * 0.7)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), q.x, q.y + r * 0.8 + L * 0.02);
      p.cx = q.x; p.cy = cy; p.r = r;
    });
  }
  return { L, points: pts, m };
}

/** The visible extent of a profile, in model units (for fitting it to a canvas). */
export function profileBounds(look) {
  const L = (look.len || 3) * UNIT;
  const f = familyOf(look.hull);
  const up = f === 'sail' ? 0.42 : f === 'war' ? 0.28 : 0.32;
  const D = dims(look.hull).D + (dims(look.hull).foils || 0) + 0.03;
  return { x0: -L * 0.56, x1: L * (f === 'sail' ? 0.68 : 0.56), y0: -L * up, y1: L * D };
}

/** Draw a profile scaled to fit a w × h box centred on (cx, cy). Returns the transform. */
export function drawProfileFitted(ctx, look, cx, cy, w, h, opts = {}) {
  const b = profileBounds(look);
  const s = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0));
  const ox = cx - ((b.x0 + b.x1) / 2) * s;
  const oy = cy - ((b.y0 + b.y1) / 2) * s;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  const r = drawProfile(ctx, look, opts);
  ctx.restore();
  return { ...r, s, ox, oy };
}

/** A single part on a short length of deck (the builder's tray). */
export function drawPartIcon(ctx, compId, w, h, look = { hull: 'freighter', color: '#5a6a7a', trim: '#e8c35a' }, t = 0) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  partIcon(ctx, compId, w, h, look, t);
  ctx.restore();
}

function partIcon(ctx, compId, w, h, look, t) {
  const k = partKey(compId);
  const deck = h * 0.8;
  ctx.fillStyle = shade(look.color, -10);
  ctx.fillRect(w * 0.05, deck, w * 0.9, h * 0.12);
  ctx.fillStyle = look.trim;
  ctx.fillRect(w * 0.05, deck, w * 0.9, h * 0.025);
  const tall = ['mast', 'topsail', 'crowsnest', 'radar', 'antenna', 'command', 'navmast', 'crane', 'funnel', 'turbine', 'ecofunnel'].includes(k);
  const m = tall ? h * (k === 'mast' ? 0.09 : k === 'topsail' ? 0.13 : 0.2) : h * 0.32;
  const sw = k === 'mast' || k === 'topsail' ? w * 0.34 : w * 0.62;
  if (k === 'sonar') {
    ctx.fillStyle = '#2a3440'; ctx.beginPath(); ctx.ellipse(w / 2, deck + h * 0.1, w * 0.25, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4ad8e8'; ctx.beginPath(); ctx.arc(w * 0.62, deck + h * 0.1, h * 0.03, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (k === 'guns') {
    // the broadside: gun-ports in a strip of hull
    ctx.fillStyle = '#6a3a1e'; ctx.fillRect(w * 0.05, deck - h * 0.35, w * 0.9, h * 0.35);
    for (let x = w * 0.15; x < w * 0.9; x += w * 0.22) { ctx.fillStyle = '#c8402a'; ctx.fillRect(x, deck - h * 0.25, w * 0.12, h * 0.14); ctx.fillStyle = '#121214'; ctx.fillRect(x + w * 0.02, deck - h * 0.23, w * 0.08, h * 0.1); }
    return;
  }
  drawPart(ctx, k, k === 'crane' ? w * 0.3 : w / 2, deck, sw, m, { ...look, hull: k === 'mast' || k === 'topsail' ? 'brig' : look.hull }, t, 1, 'icon');
}

/** A fit for a stock (dealership) ship, so it's drawn as detailed as a custom one. */
export function fitFor(model) {
  const look = model.look || {};
  if (look.fit) return look.fit;
  const tags = model.tags || [];
  const len = look.len || 3;
  const hold = tags.includes('reefer') ? 'c_reefer' : tags.includes('container') ? 'c_container_bay' : tags.includes('bulk') ? 'c_bulk_hold' : 'c_hold_large';
  const n = (k, id) => Array(Math.max(1, k)).fill(id);
  switch (look.hull) {
    case 'coaster': return ['c_diesel', ...n(Math.round(len - 1), 'c_hold_small'), 'c_nav_basic'];
    case 'runner': return ['c_gas_turbine', 'c_cabins', 'c_nav_basic'];
    case 'tug': return ['c_diesel', 'c_heavy_crane', 'c_nav_basic'];
    case 'skiff': return ['c_eco_engine', 'c_guard_post', 'c_nav_basic'];
    case 'freighter': return ['c_diesel', hold, tags.includes('heavy') ? 'c_heavy_crane' : hold, hold, 'c_hold_small', 'c_nav_basic'];
    case 'container': return ['c_diesel', ...n(Math.round(len * 1.2), 'c_container_bay'), 'c_nav_advanced'];
    case 'heavylift': return ['c_diesel', 'c_heavy_crane', 'c_hold_large', 'c_heavy_crane', 'c_container_bay', 'c_hold_large', 'c_nav_advanced'];
    case 'bulk': return ['c_diesel', ...n(Math.round(len - 1.5), 'c_bulk_hold'), 'c_nav_basic'];
    case 'starwake': return model.kind === 'warship'
      ? ['c_fusion_drive', 'c_fusion_core', 'c_railgun', 'c_stealth_coating', (model.bonuses || []).includes('fleet_shield') ? 'c_aegis_net' : 'c_quantum_sensors', 'c_missiles']
      : ['c_fusion_drive', 'c_fusion_core', 'c_specialist_bay', 'c_container_bay', 'c_reefer', 'c_nav_advanced'];
    case 'schooner': return ['c_sails', 'c_cannon', 'c_sails', 'c_lookout'];
    case 'brig': return ['c_sails', 'c_cannon', 'c_cannon', 'c_sails'];
    case 'galleon': return ['c_sails', 'c_cannon', 'c_sails', 'c_hold_large', 'c_sails'];
    case 'manowar': return ['c_sails', 'c_cannon', 'c_sails', 'c_cannon', 'c_sails', 'c_lookout'];
    case 'battleship': return ['c_deck_gun', 'c_deck_gun', 'c_gas_turbine', 'c_radar', 'c_armor', 'c_gas_turbine', 'c_deck_gun', 'c_deck_gun'];
    case 'warship': {
      const f = ['c_missiles', 'c_gas_turbine', 'c_radar', 'c_deck_gun'];
      if (len >= 4.4) f.splice(2, 0, 'c_fleet_comms');
      if (len >= 5.2) f.push('c_missiles', 'c_deck_gun');
      if ((model.bonuses || []).includes('fleet_support')) f.splice(3, 0, 'c_command');
      return f;
    }
    default: return ['c_diesel', hold, 'c_nav_basic'];
  }
}

/** A model's look with its fit filled in (custom ships keep theirs). */
export const detailedLook = (model) => ({ ...model.look, fit: fitFor(model), slots: model.look?.slots || fitFor(model).length });
