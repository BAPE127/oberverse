// The signature cars (v0.34.0), drawn top-down like every car (nose along +x),
// in two passes: the chassis on the ground, then the tall bits lifted a few
// pixels "up" the screen to match the world's 3/4 view. Each is built around
// its owner — see src/content/signatureCars.js.
// opts: color, braking, lit, time (s), wheel, moving (px/s), hornAge (s since
// the horn), driven, spin (the mixer drum), odo (px driven), onWater.
import { rrect } from './drawCharacter.js';

function seed(s) {
  let h = 5;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function shadow(ctx, L, W, r = 8) {
  ctx.fillStyle = 'rgba(10,10,20,0.28)';
  rrect(ctx, -L / 2 + 3, -W / 2 + 4, L, W, r);
  ctx.fill();
}

/** Wheels at shares of the length: [x, size] pairs; fronts (x > 0) turn. */
function wheels(ctx, L, W, xs, opts, ww = 14, wh = 8, color = '#18181c', out = 0) {
  ctx.fillStyle = color;
  for (const sx of xs) for (const sy of [-1, 1]) {
    ctx.save();
    ctx.translate(sx * L, sy * (W / 2 + out));
    ctx.rotate(sx > 0 ? (opts.wheel || 0) * 0.5 : 0);
    rrect(ctx, -ww / 2, -wh / 2, ww, wh, 2);
    ctx.fill();
    ctx.restore();
  }
}

function lights(ctx, L, W, opts, inset = 4) {
  ctx.fillStyle = opts.lit ? '#fff6c0' : '#e8e0b0';
  ctx.fillRect(L / 2 - 4, -W / 2 + inset, 4, 6);
  ctx.fillRect(L / 2 - 4, W / 2 - inset - 6, 4, 6);
  ctx.fillStyle = opts.braking ? '#ff3a2a' : '#a8241c';
  ctx.fillRect(-L / 2, -W / 2 + inset, 4, 6);
  ctx.fillRect(-L / 2, W / 2 - inset - 6, 4, 6);
}

function pass(ctx, x, y, angle, lift, fn) {
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.rotate(angle);
  fn();
  ctx.restore();
}

const DRAW = {
  // Sir Moneybucks: six wheels of solid gold, a chandelier, a champagne fountain, a hot tub
  bullion(ctx, m, L, W, o) {
    const t = o.time || 0;
    return [() => {
      shadow(ctx, L, W);
      wheels(ctx, L, W, [-0.34, -0.1, 0.32], o, 15, 8, '#2a2418');
      const gold = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
      gold.addColorStop(0, '#fff0a0'); gold.addColorStop(0.35, '#e8b830'); gold.addColorStop(1, '#9a6a10');
      ctx.fillStyle = gold;
      ctx.strokeStyle = '#7a5208';
      ctx.lineWidth = 1.5;
      rrect(ctx, -L / 2, -W / 2, L, W, 8); ctx.fill(); ctx.stroke();
      // ingot bevels down each side
      ctx.strokeStyle = 'rgba(255,250,210,0.6)';
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * L * 0.12, -W / 2 + 2); ctx.lineTo(i * L * 0.12 + 6, -W / 2 + 7); ctx.stroke(); }
      lights(ctx, L, W, o, 5);
      // the champagne fountain on the bonnet
      ctx.fillStyle = '#f2ede2';
      ctx.beginPath(); ctx.ellipse(L * 0.36, 0, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f6e7a8';
      ctx.beginPath(); ctx.ellipse(L * 0.36, 0, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,220,0.9)';
      for (let i = 0; i < 6; i++) { const a = t * 3 + i; ctx.fillRect(L * 0.36 + Math.cos(a) * (3 + (i % 3) * 2), Math.sin(a) * (3 + (i % 3) * 2), 1.6, 1.6); }
      // the hot tub at the back, bubbling
      ctx.fillStyle = '#e8e4da';
      rrect(ctx, -L / 2 + 6, -W / 2 + 7, L * 0.2, W - 14, 6); ctx.fill();
      ctx.fillStyle = '#5ac8d8';
      rrect(ctx, -L / 2 + 9, -W / 2 + 10, L * 0.2 - 6, W - 20, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 5; i++) { const ph = (t * 1.5 + i * 0.37) % 1; ctx.beginPath(); ctx.arc(-L / 2 + 13 + ((i * 7) % (L * 0.14)), -W / 2 + 13 + ((i * 11) % (W - 26)), 1 + ph * 1.6, 0, Math.PI * 2); ctx.fill(); }
    }, () => {
      // the cabin roof: white leather, a gold £-ish emblem, the chandelier
      ctx.fillStyle = '#c8961e';
      rrect(ctx, -L * 0.22, -W / 2 + 5, L * 0.46, W - 10, 6); ctx.fill();
      ctx.fillStyle = '#9fc4d6';
      rrect(ctx, L * 0.17, -W / 2 + 7, 8, W - 14, 3); ctx.fill();
      ctx.fillStyle = '#f4efe2';
      rrect(ctx, -L * 0.18, -W / 2 + 9, L * 0.34, W - 18, 5); ctx.fill();
      const cx = -L * 0.01;
      ctx.strokeStyle = '#c8a040';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx + Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
        ctx.fillStyle = `rgba(230,250,255,${0.6 + tw * 0.4})`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 9, Math.sin(a) * 9, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.arc(cx, 0, 3.2, 0, Math.PI * 2); ctx.fill();
    }];
  },

  // Mason Nails: a cement-mixer hot rod with a tower crane and a swinging plumb bob
  plumbbob(ctx, m, L, W, o) {
    const t = o.time || 0;
    const turn = (o.spin || 0);
    return [() => {
      shadow(ctx, L, W);
      wheels(ctx, L, W, [-0.36, -0.16, 0.3], o, 16, 9);
      ctx.fillStyle = '#4a4a50';
      rrect(ctx, -L / 2, -W / 2 + 4, L, W - 8, 4); ctx.fill(); // the chassis rails
      ctx.fillStyle = '#e8a020';
      ctx.strokeStyle = '#8a5a10';
      ctx.lineWidth = 1.2;
      rrect(ctx, L * 0.12, -W / 2, L * 0.38, W, 6); ctx.fill(); ctx.stroke(); // the cab
      // hazard chevrons on the front bumper
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#1a1a1a' : '#f2d020'; ctx.fillRect(L / 2 - 4, -W / 2 + (i * W) / 6, 4, W / 6); }
      lights(ctx, L, W, o, 6);
    }, () => {
      // the mixer drum, turning
      const dx = -L * 0.16;
      const dl = L * 0.52;
      const drum = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
      drum.addColorStop(0, '#f0f0ea'); drum.addColorStop(0.5, '#c8c8c0'); drum.addColorStop(1, '#8a8a84');
      ctx.fillStyle = drum;
      ctx.beginPath(); ctx.ellipse(dx, 0, dl / 2, W / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.ellipse(dx, 0, dl / 2, W / 2 - 4, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#e8a020';
      for (let i = -4; i < 6; i++) {
        const p = ((i * 14 + turn * 22) % 140) - 70;
        ctx.beginPath(); ctx.moveTo(dx + p, -W / 2); ctx.lineTo(dx + p + 6, -W / 2); ctx.lineTo(dx + p - 10, W / 2); ctx.lineTo(dx + p - 16, W / 2); ctx.fill();
      }
      ctx.restore();
      // scaffolding roll cage over the cab
      ctx.strokeStyle = '#9aa0a8';
      ctx.lineWidth = 2;
      ctx.strokeRect(L * 0.16, -W / 2 + 3, L * 0.28, W - 6);
      ctx.beginPath(); ctx.moveTo(L * 0.16, -W / 2 + 3); ctx.lineTo(L * 0.44, W / 2 - 3); ctx.moveTo(L * 0.16, W / 2 - 3); ctx.lineTo(L * 0.44, -W / 2 + 3); ctx.stroke();
      ctx.fillStyle = '#7fa4b8';
      ctx.fillRect(L * 0.4, -W / 2 + 6, 6, W - 12); // windscreen
      // the tower crane: mast on the cab, jib out over the nose, a brass plumb bob swinging below it
      const mx = L * 0.24;
      ctx.fillStyle = '#f2c020';
      ctx.fillRect(mx - 4, -4, 8, 8);
      ctx.strokeStyle = '#f2c020';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(mx - 18, 0); ctx.lineTo(mx + L * 0.5, 0); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#8a6a10';
      for (let k = mx - 16; k < mx + L * 0.5; k += 6) { ctx.beginPath(); ctx.moveTo(k, -1.5); ctx.lineTo(k + 3, 1.5); ctx.stroke(); }
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(mx - 24, -5, 8, 10); // counterweight
      const sw = Math.sin(t * 2.4) * 6 + Math.max(-8, Math.min(8, -(o.moving || 0) / 40));
      const bx = mx + L * 0.46;
      ctx.strokeStyle = '#3a3a3a';
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + sw, 10); ctx.stroke();
      ctx.fillStyle = '#c8962a';
      ctx.beginPath(); ctx.moveTo(bx + sw - 4, 10); ctx.lineTo(bx + sw + 4, 10); ctx.lineTo(bx + sw, 18); ctx.fill();
    }];
  },

  // Chief Lawrence Order: an armoured interceptor, three light bars, a giant gavel, a doughnut spare
  gavel(ctx, m, L, W, o) {
    const t = o.time || 0;
    const age = o.hornAge ?? 99;
    return [() => {
      shadow(ctx, L, W, 6);
      wheels(ctx, L, W, [-0.3, 0.3], o, 16, 9);
      ctx.fillStyle = '#1a2236';
      ctx.strokeStyle = '#0a0e18';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-L / 2, -W / 2 + 4); ctx.lineTo(-L / 2 + 6, -W / 2); ctx.lineTo(L / 2 - 10, -W / 2); ctx.lineTo(L / 2, -W / 2 + 10);
      ctx.lineTo(L / 2, W / 2 - 10); ctx.lineTo(L / 2 - 10, W / 2); ctx.lineTo(-L / 2 + 6, W / 2); ctx.lineTo(-L / 2, W / 2 - 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // armour plates and rivets
      ctx.strokeStyle = 'rgba(160,180,210,0.25)';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * L * 0.16, -W / 2 + 1); ctx.lineTo(i * L * 0.16, W / 2 - 1); ctx.stroke(); }
      ctx.fillStyle = '#e8e2d4';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LAW', -L * 0.16, -W / 2 + 4);
      ctx.fillText('ORDER', -L * 0.16, W / 2 - 4);
      lights(ctx, L, W, o, 6);
      // the scales-of-justice bull bar
      ctx.strokeStyle = '#d8b040';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L / 2 + 3, -W / 2 + 6); ctx.lineTo(L / 2 + 3, W / 2 - 6); ctx.stroke();
      for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(L / 2 + 6, sy * (W / 2 - 8), 4, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      // the doughnut spare tyre
      ctx.fillStyle = '#c8884a';
      ctx.beginPath(); ctx.arc(-L / 2 - 6, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f29ac0';
      ctx.beginPath(); ctx.arc(-L / 2 - 6, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2236';
      ctx.beginPath(); ctx.arc(-L / 2 - 6, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      const sp = ['#fff', '#3a8aff', '#ffe040', '#40d070'];
      for (let i = 0; i < 9; i++) { const a = i * 2.3; ctx.fillStyle = sp[i % 4]; ctx.fillRect(-L / 2 - 6 + Math.cos(a) * 6.5 - 1, Math.sin(a) * 6.5 - 0.5, 2, 1); }
    }, () => {
      ctx.fillStyle = '#2a3450';
      rrect(ctx, -L * 0.26, -W / 2 + 6, L * 0.48, W - 12, 5); ctx.fill();
      ctx.fillStyle = '#6a8aa0';
      ctx.fillRect(L * 0.16, -W / 2 + 8, 6, W - 16);
      // three light bars, flashing when it's on the move
      const on = (o.driven || (o.moving || 0) > 5) ? Math.sin(t * 12) > 0 : true;
      for (const bx of [-L * 0.2, -L * 0.04, L * 0.1]) {
        ctx.fillStyle = on ? '#ff3a3a' : '#6a1a1a';
        ctx.fillRect(bx, -W / 2 + 7, 5, W / 2 - 7);
        ctx.fillStyle = on ? '#2a3a7a' : '#3a6aff';
        ctx.fillRect(bx, 0, 5, W / 2 - 7);
      }
      // the gavel: lifts and slams with the horn
      const raised = age < 0.12 || (age > 0.28 && age < 0.4);
      const k = raised ? 1.35 : 1;
      ctx.save();
      ctx.translate(-L * 0.04, 0);
      ctx.scale(k, k);
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(-2, -2, 30, 4); // the handle
      ctx.fillStyle = '#9a5e2c';
      rrect(ctx, -9, -10, 14, 20, 3); ctx.fill(); // the head
      ctx.fillStyle = '#d8b040';
      ctx.fillRect(-9, -8, 14, 2); ctx.fillRect(-9, 6, 14, 2);
      ctx.restore();
      if (age < 0.7 && !raised) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ORDER!', -L * 0.04, -W / 2 - 6 - age * 20);
      }
    }];
  },

  // Arthur Anderson: a right-angled triangle on wheels, chalk proofs, a calculator the size of a door
  hypotenuse(ctx, m, L, W, o) {
    return [() => {
      ctx.fillStyle = 'rgba(10,10,20,0.28)';
      ctx.beginPath(); ctx.moveTo(-L / 2 + 3, -W / 2 + 4); ctx.lineTo(L / 2 + 3, W / 2 + 4); ctx.lineTo(-L / 2 + 3, W / 2 + 4); ctx.closePath(); ctx.fill();
      // three wheels: where would a fourth even go?
      wheels(ctx, L, W, [-0.32], o, 15, 8);
      ctx.save(); ctx.translate(L * 0.26, W / 2); ctx.rotate((o.wheel || 0) * 0.5); ctx.fillStyle = '#18181c'; rrect(ctx, -7.5, -4, 15, 8, 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#22282a';
      ctx.strokeStyle = '#f2f2ea';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-L / 2, -W / 2); ctx.lineTo(L / 2, W / 2); ctx.lineTo(-L / 2, W / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      // the right-angle mark, of course
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-L / 2 + 2, W / 2 - 9, 7, 7);
      // chalk proofs
      ctx.fillStyle = 'rgba(240,240,230,0.85)';
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('a²+b²=c²', -L / 2 + 12, W / 2 - 6);
      ctx.fillText('∫π dx', -L / 2 + 6, 2);
      ctx.fillText('QED', L * 0.06, W / 2 - 5);
      ctx.fillText('√2', -L * 0.32, -W * 0.18);
      ctx.fillStyle = o.lit ? '#fff6c0' : '#e8e0b0';
      ctx.fillRect(L / 2 - 8, W / 2 - 6, 6, 5);
      ctx.fillStyle = o.braking ? '#ff3a2a' : '#a8241c';
      ctx.fillRect(-L / 2, -W / 2 + 2, 3, 6); ctx.fillRect(-L / 2, W / 2 - 8, 3, 6);
      // the protractor spoiler
      ctx.strokeStyle = '#c8d0d8';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-L / 2, 0, W * 0.32, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
      for (let i = 1; i < 6; i++) { const a = Math.PI / 2 + (i * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(-L / 2 + Math.cos(a) * W * 0.28, Math.sin(a) * W * 0.28); ctx.lineTo(-L / 2 + Math.cos(a) * W * 0.32, Math.sin(a) * W * 0.32); ctx.stroke(); }
    }, () => {
      // the calculator on the roof, showing the speed to five places
      const cx = -L * 0.28;
      const cy = W * 0.12;
      ctx.fillStyle = '#3a3e44';
      rrect(ctx, cx - 14, cy - 12, 28, 24, 3); ctx.fill();
      ctx.fillStyle = '#9ec88a';
      ctx.fillRect(cx - 12, cy - 10, 24, 7);
      ctx.fillStyle = '#1a2a14';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(o.moving > 5 ? (o.moving / 7.5).toFixed(3) : '3.14159', cx, cy - 6.4);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = c === 3 ? '#d86a2a' : '#c8ccd2'; ctx.fillRect(cx - 12 + c * 6.2, cy - 1 + r * 4.2, 4.8, 3.2); }
      ctx.fillStyle = '#7fa4b8';
      ctx.beginPath(); ctx.moveTo(L * 0.02, W * 0.06); ctx.lineTo(L * 0.2, W * 0.34); ctx.lineTo(L * 0.02, W * 0.34); ctx.closePath(); ctx.fill(); // the windscreen, triangular
    }];
  },

  // Lucas Eastrise: a tinfoil half-track with dishes, antennas and a periscope
  paranoia(ctx, m, L, W, o) {
    const t = o.time || 0;
    const s = seed('paranoia');
    const tread = ((o.odo || 0) / 2) % 6;
    return [() => {
      shadow(ctx, L, W, 5);
      // tracks at the back, wheels at the front
      ctx.fillStyle = '#1e1e20';
      for (const sy of [-1, 1]) {
        rrect(ctx, -L / 2 + 2, sy * (W / 2) - 5, L * 0.55, 10, 4); ctx.fill();
      }
      ctx.strokeStyle = '#4a4a4c';
      ctx.lineWidth = 1;
      for (const sy of [-1, 1]) for (let k = -L / 2 + 4 + tread; k < -L / 2 + L * 0.55; k += 6) { ctx.beginPath(); ctx.moveTo(k, sy * (W / 2) - 4); ctx.lineTo(k, sy * (W / 2) + 4); ctx.stroke(); }
      wheels(ctx, L, W, [0.32], o, 14, 9);
      // the tinfoil
      const foil = ctx.createLinearGradient(-L / 2, -W / 2, L / 2, W / 2);
      foil.addColorStop(0, '#e8ecf0'); foil.addColorStop(0.5, '#a8b0b8'); foil.addColorStop(1, '#d8dde2');
      ctx.fillStyle = foil;
      ctx.strokeStyle = '#6a7078';
      ctx.lineWidth = 1.2;
      rrect(ctx, -L / 2, -W / 2 + 2, L, W - 4, 5); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 26; i++) {
        const px = (((s >>> (i % 24)) + i * 37) % 100) / 100 - 0.5;
        const py = ((((s >>> ((i * 3) % 24)) + i * 53) % 100) / 100 - 0.5) * 0.85;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(80,90,100,0.35)';
        ctx.beginPath(); ctx.moveTo(px * L, py * W); ctx.lineTo(px * L + 5, py * W + 2); ctx.lineTo(px * L + 1, py * W + 5); ctx.fill();
      }
      ctx.fillStyle = '#2a2e2a';
      ctx.font = 'bold 5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NOT A SURVEILLANCE VAN', 0, -W / 2 + 5);
      ctx.fillText('NOT A SURVEILLANCE VAN', 0, W / 2 - 5);
      lights(ctx, L, W, o, 7);
    }, () => {
      ctx.fillStyle = '#1a1c1e';
      ctx.fillRect(L * 0.3, -W / 2 + 8, 6, W - 16); // blacked-out windscreen
      // two satellite dishes, slowly scanning
      for (const [dx, dy, ph] of [[-L * 0.32, -W * 0.16, 0], [-L * 0.08, W * 0.18, 2]]) {
        const a = Math.sin(t * 0.8 + ph) * 0.8;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(a);
        ctx.fillStyle = '#e8ecef';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a9098';
        ctx.stroke();
        ctx.fillStyle = '#5a6068';
        ctx.fillRect(2, -1, 6, 2);
        ctx.restore();
      }
      // the antenna forest
      ctx.strokeStyle = '#3a3e44';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const ax = -L * 0.44 + i * 6;
        const ay = (i % 2 ? 1 : -1) * (W * 0.3);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 6, ay + (i % 2 ? 4 : -4)); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 5 + i) > 0.6 ? '#ff4040' : '#5a1a1a';
        ctx.fillRect(ax - 7, ay + (i % 2 ? 4 : -4) - 1, 2, 2);
      }
      // the "turret" — a periscope
      ctx.fillStyle = '#4a504a';
      ctx.beginPath(); ctx.arc(L * 0.1, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(L * 0.1, 0);
      ctx.rotate(Math.sin(t * 0.5) * 1.4);
      ctx.fillStyle = '#2a2e2a';
      ctx.fillRect(0, -2.5, 14, 5);
      ctx.fillStyle = '#9fd0ff';
      ctx.fillRect(12, -2, 2, 4);
      ctx.restore();
    }];
  },

  // Captain Ober: his old pilot launch on tractor wheels — figurehead, mast, a sail that fills
  landlubber(ctx, m, L, W, o) {
    const fill = Math.min(1, (o.moving || 0) / 260);
    const wet = o.onWater;
    return [() => {
      if (!wet) shadow(ctx, L * 0.9, W, 14);
      if (wet) {
        // a bow wave
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L / 2 + 4, 0); ctx.lineTo(L / 2 - 18, -W / 2 - 6 - fill * 6); ctx.moveTo(L / 2 + 4, 0); ctx.lineTo(L / 2 - 18, W / 2 + 6 + fill * 6); ctx.stroke();
      } else wheels(ctx, L, W, [-0.28, 0.24], o, 22, 11, '#1e1e1a', 3);
      // the hull, pointed at the bow
      ctx.fillStyle = '#7a4a26';
      ctx.strokeStyle = '#3e2410';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L / 2 + 6, 0);
      ctx.quadraticCurveTo(L * 0.3, -W / 2, 0, -W / 2);
      ctx.lineTo(-L / 2 + 6, -W / 2 + 2); ctx.quadraticCurveTo(-L / 2, 0, -L / 2 + 6, W / 2 - 2);
      ctx.lineTo(0, W / 2); ctx.quadraticCurveTo(L * 0.3, W / 2, L / 2 + 6, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // planks
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(40,20,8,0.45)';
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-L / 2, k * W * 0.18); ctx.lineTo(L / 2, k * W * 0.08); ctx.stroke(); }
      ctx.restore();
      // the deck and gunwale
      ctx.fillStyle = '#c8a070';
      ctx.beginPath(); ctx.ellipse(-L * 0.04, 0, L * 0.38, W / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8e0c8';
      ctx.fillRect(-L * 0.2, -W / 2 + 1.5, L * 0.3, 2.5); ctx.fillRect(-L * 0.2, W / 2 - 4, L * 0.3, 2.5); // the name boards
      // the figurehead
      ctx.fillStyle = '#e8c8a0';
      ctx.beginPath(); ctx.arc(L / 2 + 6, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c84a2a';
      ctx.beginPath(); ctx.arc(L / 2 + 4.5, 0, 2.5, Math.PI / 2, -Math.PI / 2); ctx.fill();
      // the ship's wheel aft
      ctx.strokeStyle = '#4a2a10';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-L * 0.34, 0, 6, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + (o.wheel || 0); ctx.beginPath(); ctx.moveTo(-L * 0.34, 0); ctx.lineTo(-L * 0.34 + Math.cos(a) * 8.5, Math.sin(a) * 8.5); ctx.stroke(); }
      ctx.fillStyle = o.lit ? '#fff6c0' : '#e8d080';
      ctx.beginPath(); ctx.arc(L * 0.3, -W / 2 + 6, 2.5, 0, Math.PI * 2); ctx.fill(); // a lantern
    }, () => {
      // the mast, the boom and a sail that fills as you go
      ctx.fillStyle = '#5a3418';
      ctx.beginPath(); ctx.arc(L * 0.08, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(L * 0.08, 0); ctx.lineTo(-L * 0.3, W * 0.1); ctx.stroke();
      ctx.fillStyle = 'rgba(244,236,214,0.95)';
      ctx.strokeStyle = '#a89a78';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L * 0.08, 0); ctx.quadraticCurveTo(-L * 0.12, -W * (0.25 + fill * 0.55), -L * 0.3, W * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      // the crow's nest, with a flag
      ctx.fillStyle = '#7a4a26';
      ctx.beginPath(); ctx.arc(L * 0.08, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8b070';
      ctx.beginPath(); ctx.arc(L * 0.08, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a3a6a';
      ctx.beginPath(); ctx.moveTo(L * 0.08, -2); ctx.lineTo(L * 0.08 - 10, -4 + Math.sin((o.time || 0) * 8) * 1.5); ctx.lineTo(L * 0.08 - 10, 2); ctx.fill();
    }];
  },

  // Farmer Chuckie: a wedge of cheddar on monster-truck wheels, with longhorns
  bigcheese(ctx, m, L, W, o) {
    return [() => {
      shadow(ctx, L, W, 10);
      // monster wheels with cow-print hubcaps
      for (const sx of [-0.3, 0.28]) for (const sy of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * L, sy * (W / 2 + 2));
        ctx.rotate(sx > 0 ? (o.wheel || 0) * 0.5 : 0);
        ctx.fillStyle = '#141414';
        rrect(ctx, -12, -7, 24, 14, 4); ctx.fill();
        ctx.fillStyle = '#f4f2ea';
        ctx.fillRect(-6, -3, 12, 6);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(1, 0, 4, 2);
        ctx.restore();
      }
      // the wedge: a wide rind at the back, coming to a point at the nose
      ctx.fillStyle = '#f2c440';
      ctx.strokeStyle = '#b8862a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L / 2, 0);
      ctx.lineTo(-L / 2 + 6, -W / 2);
      ctx.quadraticCurveTo(-L / 2 - 4, 0, -L / 2 + 6, W / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // the rind
      ctx.strokeStyle = '#e09a30';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-L / 2 + 6, -W / 2 + 2); ctx.quadraticCurveTo(-L / 2 - 2, 0, -L / 2 + 6, W / 2 - 2); ctx.stroke();
      // the holes
      ctx.fillStyle = '#d8a428';
      for (const [hx, hy, r] of [[-0.3, -0.18, 5], [-0.14, 0.12, 4], [0.02, -0.06, 3.5], [-0.34, 0.24, 3], [0.16, 0.04, 2.5], [-0.2, -0.32, 2.5]]) { ctx.beginPath(); ctx.arc(hx * L, hy * W, r, 0, Math.PI * 2); ctx.fill(); }
      // the milk-churn exhaust
      ctx.fillStyle = '#b8bcc0';
      ctx.fillRect(-L / 2 - 6, W * 0.18, 9, 8);
      ctx.fillStyle = '#8a8e92';
      ctx.fillRect(-L / 2 - 8, W * 0.2, 3, 4);
      ctx.fillStyle = o.braking ? '#ff3a2a' : '#a8241c';
      ctx.fillRect(-L / 2 + 2, -W / 2 + 6, 3, 5); ctx.fillRect(-L / 2 + 2, W / 2 - 11, 3, 5);
    }, () => {
      // the cab: a little window in the cheese
      ctx.fillStyle = '#7fa4b8';
      ctx.beginPath(); ctx.ellipse(-L * 0.06, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8962a';
      ctx.fillRect(-L * 0.06 - 2, -8, 4, 16);
      // longhorns on the nose
      ctx.strokeStyle = '#f0e6d0';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L * 0.34, 0); ctx.quadraticCurveTo(L * 0.42, -W * 0.6, L * 0.52, -W * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L * 0.34, 0); ctx.quadraticCurveTo(L * 0.42, W * 0.6, L * 0.52, W * 0.72); ctx.stroke();
      ctx.strokeStyle = '#4a3a2a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L * 0.49, -W * 0.68); ctx.lineTo(L * 0.53, -W * 0.73); ctx.moveTo(L * 0.49, W * 0.68); ctx.lineTo(L * 0.53, W * 0.73); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath(); ctx.arc(L * 0.34, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.lit ? '#fff6c0' : '#f0e4b0';
      ctx.beginPath(); ctx.arc(L * 0.4, -3, 2, 0, Math.PI * 2); ctx.arc(L * 0.4, 3, 2, 0, Math.PI * 2); ctx.fill();
    }];
  },
  // v0.52.0 — Octavius Thomas Phonograph: nine metres of black and gold, a gramophone horn on the roof,
  // aerials, a screen in every window
  longdistance(ctx, m, L, W, o) {
    const t = o.time || 0;
    return [() => {
      shadow(ctx, L, W, 10);
      wheels(ctx, L, W, [-0.36, -0.2, 0.34], o, 15, 8, '#101014');
      // the body: gloss black, a gold pinstripe all the way round
      const body = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
      body.addColorStop(0, '#3a3a44'); body.addColorStop(0.3, '#16161c'); body.addColorStop(1, '#08080a');
      ctx.fillStyle = body;
      rrect(ctx, -L / 2, -W / 2, L, W, 10); ctx.fill();
      ctx.strokeStyle = '#d9b24a';
      ctx.lineWidth = 1.5;
      rrect(ctx, -L / 2 + 3, -W / 2 + 3, L - 6, W - 6, 8); ctx.stroke();
      // gold bumpers and a grille
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(L / 2 - 4, -W / 2 + 6, 4, W - 12);
      ctx.fillRect(-L / 2, -W / 2 + 8, 3, W - 16);
      ctx.fillStyle = '#a8862a';
      for (let k = -W / 2 + 9; k < W / 2 - 9; k += 3) ctx.fillRect(L / 2 - 3, k, 2, 1);
      lights(ctx, L, W, o, 5);
    }, () => {
      // the long roof with a row of lit screens for windows
      ctx.fillStyle = '#1e1e26';
      rrect(ctx, -L * 0.36, -W / 2 + 6, L * 0.62, W - 12, 6); ctx.fill();
      for (let k = 0; k < 6; k++) {
        const x = -L * 0.33 + k * L * 0.095;
        const glow = 0.55 + 0.45 * Math.sin(t * 2 + k);
        ctx.fillStyle = `rgba(106,200,240,${glow.toFixed(2)})`;
        ctx.fillRect(x, -W / 2 + 7, L * 0.07, 3);
        ctx.fillRect(x, W / 2 - 10, L * 0.07, 3);
      }
      // the windscreen
      ctx.fillStyle = '#4a6a80';
      ctx.fillRect(L * 0.22, -W / 2 + 8, 6, W - 16);
      // the gramophone horn: a golden bell on a stem, turning slowly
      const hx = -L * 0.08;
      ctx.fillStyle = '#8a6a1a';
      ctx.fillRect(hx - 2, -2, 4, 4);
      ctx.save();
      ctx.translate(hx, 0);
      ctx.rotate(Math.sin(t * 0.7) * 0.4);
      const bell = ctx.createRadialGradient(10, 0, 2, 12, 0, 18);
      bell.addColorStop(0, '#fff0a0'); bell.addColorStop(0.5, '#e8c35a'); bell.addColorStop(1, '#8a6a1a');
      ctx.fillStyle = bell;
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(14, -14); ctx.quadraticCurveTo(22, 0, 14, 14); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2a0a';
      ctx.beginPath(); ctx.ellipse(16, 0, 3, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // a forest of aerials, blinking
      ctx.strokeStyle = '#c9c9d0';
      ctx.lineWidth = 1;
      for (const [ax, ay, hh] of [[-0.3, -0.3, 10], [-0.26, 0.28, 14], [0.12, -0.32, 8], [0.16, 0.3, 12], [-0.34, 0, 16]]) {
        ctx.beginPath(); ctx.moveTo(ax * L, ay * W); ctx.lineTo(ax * L - hh * 0.3, ay * W - hh * 0.6); ctx.stroke();
        if (Math.sin(t * 5 + ax * 20) > 0.6) { ctx.fillStyle = '#ff4a4a'; ctx.fillRect(ax * L - hh * 0.3 - 1, ay * W - hh * 0.6 - 1, 2, 2); }
      }
      // the ringtone, visible: when the horn sounds, rings of gold spread from the bell
      if ((o.hornAge ?? 99) < 1) {
        const k = o.hornAge;
        ctx.strokeStyle = `rgba(232,195,90,${(1 - k).toFixed(2)})`;
        ctx.lineWidth = 2;
        for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(hx + 18, 0, 8 + k * 40 + r * 8, -0.7, 0.7); ctx.stroke(); }
      }
    }];
  },
  // v0.52.0 — Morganius Spade: a black glass-sided coach, purple lamps, silver suits on the panels, a
  // spade on the bonnet, a candelabra on the roof that never goes out, and nobody at the reins
  lasttrick(ctx, m, L, W, o) {
    const t = o.time || 0;
    return [() => {
      shadow(ctx, L, W, 6);
      // big carriage wheels with silver spokes, turning
      for (const sx of [-0.3, 0.3]) for (const sy of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * L, sy * (W / 2 + 1));
        ctx.rotate(sx > 0 ? (o.wheel || 0) * 0.5 : 0);
        ctx.fillStyle = '#0c0a10';
        rrect(ctx, -11, -4, 22, 8, 3); ctx.fill();
        ctx.fillStyle = '#9a9aa8';
        const spin = (o.odo || 0) * 0.08;
        for (let k = 0; k < 4; k++) ctx.fillRect(-10 + ((k * 5 + spin * 3) % 20), -3, 1, 6);
        ctx.restore();
      }
      ctx.fillStyle = '#16121c';
      rrect(ctx, -L / 2, -W / 2 + 2, L, W - 4, 4); ctx.fill();
      ctx.strokeStyle = '#8a8a98';
      ctx.lineWidth = 1;
      rrect(ctx, -L / 2 + 2, -W / 2 + 4, L - 4, W - 8, 3); ctx.stroke();
      // the suits along the sides, in silver
      ctx.fillStyle = '#b8b8c4';
      ctx.font = '8px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ['♠', '♥', '♦', '♣'].forEach((ch, k) => { ctx.fillText(ch, -L * 0.3 + k * L * 0.18, -W / 2 + 6); ctx.fillText(ch, -L * 0.3 + k * L * 0.18, W / 2 - 6); });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      // purple coach lamps
      const lamp = 0.7 + 0.3 * Math.sin(t * 3);
      ctx.fillStyle = `rgba(176,90,240,${lamp.toFixed(2)})`;
      ctx.fillRect(L / 2 - 6, -W / 2 + 2, 4, 5); ctx.fillRect(L / 2 - 6, W / 2 - 7, 4, 5);
      ctx.fillStyle = o.braking ? '#ff3a2a' : '#6a1a2a';
      ctx.fillRect(-L / 2, -W / 2 + 6, 3, 5); ctx.fillRect(-L / 2, W / 2 - 11, 3, 5);
    }, () => {
      // the glass sides: a velvet-lined compartment with a single card floating in it
      ctx.fillStyle = '#2a1e3a';
      rrect(ctx, -L * 0.34, -W / 2 + 7, L * 0.56, W - 14, 3); ctx.fill();
      ctx.fillStyle = 'rgba(176,90,240,0.25)';
      ctx.fillRect(-L * 0.32, -W / 2 + 8, L * 0.52, W - 16);
      ctx.save();
      ctx.translate(-L * 0.06, Math.sin(t * 2) * 2);
      ctx.rotate(Math.sin(t) * 0.3);
      ctx.fillStyle = '#f4f0e6';
      ctx.fillRect(-3, -4, 6, 8);
      ctx.fillStyle = '#1b1a24';
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      // the black canopy, its fringe, and the candelabra on top
      ctx.strokeStyle = '#0a080e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-L * 0.34, -W / 2 + 7, L * 0.56, W - 14);
      ctx.fillStyle = '#c9c9d0';
      ctx.fillRect(-L * 0.1 - 1, -6, 2, 12);
      ctx.fillRect(-L * 0.1 - 5, -1, 10, 2);
      for (const dy of [-6, 0, 6]) {
        ctx.fillStyle = '#f0e8d0';
        ctx.fillRect(-L * 0.1 - 1, dy - 3, 2, 3);
        ctx.fillStyle = `rgba(255,${180 + Math.floor(Math.sin(t * 9 + dy) * 40)},90,0.95)`;
        ctx.fillRect(-L * 0.1 - 1, dy - 5 + Math.sin(t * 11 + dy) * 0.6, 2, 2);
      }
      // the driver's box: empty, the reins hanging in the air
      ctx.fillStyle = '#0c0a10';
      ctx.fillRect(L * 0.24, -W / 2 + 9, 10, W - 18);
      ctx.strokeStyle = '#6a5a3a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L * 0.3, -5); ctx.quadraticCurveTo(L * 0.4, -3 + Math.sin(t * 3) * 2, L * 0.46, -6); ctx.moveTo(L * 0.3, 5); ctx.quadraticCurveTo(L * 0.4, 3 + Math.sin(t * 3) * 2, L * 0.46, 6); ctx.stroke();
      // the spade on the bonnet
      ctx.fillStyle = '#d0d0dc';
      ctx.font = '12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♠', L * 0.45, 0);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }];
  },
};

/** Draw a signature car centred on (x, y), nose along `angle`. */
export function drawSignatureCar(ctx, model, x, y, angle, opts = {}) {
  const fn = DRAW[model.sig];
  if (!fn) return false;
  const [ground, top] = fn(ctx, model, model.len, model.wid, opts);
  pass(ctx, x, y, angle, 0, ground);
  pass(ctx, x, y, angle, 5 * (model.wid / 30), top);
  return true;
}

/** What a signature car leaves behind it (game.vehicles.trail), drawn on the ground layer. */
export function drawTrail(ctx, list, mapId, now) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of list) {
    if (p.map !== mapId) continue;
    const age = now - p.t;
    const a = Math.max(0, 1 - age / 4);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    switch (p.kind) {
      case 'coins': {
        const w = Math.abs(Math.cos(age * 6 + p.r * 6)) * 4 + 0.6;
        ctx.fillStyle = '#f2c230';
        ctx.beginPath(); ctx.ellipse(p.x, p.y - age * 4, w, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff2a0';
        ctx.fillRect(p.x - 0.5, p.y - age * 4 - 2, 1, 4);
        break;
      }
      case 'dust':
        ctx.fillStyle = 'rgba(200,184,150,0.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + age * 6, 0, Math.PI * 2); ctx.fill();
        break;
      case 'maths':
        ctx.fillStyle = '#f2f2e8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('+−×÷=π√∑∞%'[Math.floor(p.r * 10)], p.x, p.y - age * 10);
        break;
      case 'static':
        ctx.strokeStyle = p.r > 0.5 ? '#9fe0ff' : '#e8f0ff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x - 1, p.y - 3); ctx.lineTo(p.x + 1, p.y + 3); ctx.lineTo(p.x + 4, p.y); ctx.stroke();
        break;
      case 'spray':
        ctx.fillStyle = 'rgba(240,250,255,0.8)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + age * 3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'cheese':
        ctx.fillStyle = '#f2c440';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 3); ctx.lineTo(p.x + 3, p.y + 2); ctx.lineTo(p.x - 3, p.y + 2); ctx.closePath(); ctx.fill();
        break;
      case 'cards': {
        // v0.52.0: the Last Trick sheds playing cards, fluttering, face up and face down
        ctx.save();
        ctx.translate(p.x + Math.sin(age * 4 + p.r * 9) * 3, p.y - age * 3);
        ctx.rotate(p.r * 6 + age * 3);
        ctx.scale(Math.max(0.1, Math.abs(Math.cos(age * 7 + p.r * 5))), 1);
        ctx.fillStyle = p.r > 0.5 ? '#f6f2e8' : '#4a1e6a';
        ctx.fillRect(-2.5, -3.5, 5, 7);
        ctx.fillStyle = p.r > 0.5 ? (p.r > 0.75 ? '#c8242c' : '#1b1a24') : '#d9b24a';
        ctx.fillRect(-0.75, -1, 1.5, 2);
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

