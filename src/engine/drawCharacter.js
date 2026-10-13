// Procedural character rendering. Characters are described by an `appearance`
// object (see docs/CONTENT_FORMAT.md#appearance). If an appearance supplies a
// `sprite` image that has loaded, the renderer uses it instead (see
// assets.js) — this keeps art replaceable without touching the simulation.

const BUILD_WIDTH = { round: 21, average: 18, thin: 15, wiry: 16, broad: 22 };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw a character with feet at (x, y).
 * @param {object} a appearance
 * @param {object} s state: {facing, moving, animTime, activity, sleeping, scale}
 */
export function drawCharacter(ctx, a, s) {
  const facing = s.facing || 'down';
  const scale = (s.scale || 1) * (a.height || 1);
  const t = s.animTime || 0;
  const walk = s.moving ? Math.sin(t * 11) : 0;
  const bob = s.moving ? Math.abs(Math.sin(t * 11)) * 1.6 : Math.sin((s.idleTime || 0) * 2.2) * 0.5;
  const bw = BUILD_WIDTH[a.build] || 18;
  const outline = 'rgba(30,24,40,0.55)';

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(scale, scale);

  // shadow
  ctx.fillStyle = 'rgba(20,20,35,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, bw * 0.55, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const side = facing === 'left' || facing === 'right';
  const dir = facing === 'left' ? -1 : 1;

  // legs
  const legColor = a.legs || shade(a.outfit, -45);
  ctx.fillStyle = legColor;
  const legSwing = walk * 3;
  if (side) {
    rrect(ctx, -3 + legSwing * dir * 0.6, -12, 5, 12, 2); ctx.fill();
    rrect(ctx, -2 - legSwing * dir * 0.6, -12, 5, 12, 2); ctx.fill();
  } else {
    rrect(ctx, -6, -12 - (walk > 0 ? walk * 1.5 : 0), 5, 12, 2); ctx.fill();
    rrect(ctx, 1, -12 + (walk < 0 ? walk * 1.5 : 0), 5, 12, 2); ctx.fill();
  }
  // shoes
  ctx.fillStyle = a.shoes || '#2b2430';
  if (side) {
    ctx.fillRect(-3 + legSwing * dir * 0.6 + (dir > 0 ? 1 : -1), -2.5, 6, 2.5);
  } else {
    ctx.fillRect(-6.5, -2.5 - (walk > 0 ? walk * 1.5 : 0), 6, 2.5);
    ctx.fillRect(0.5, -2.5 + (walk < 0 ? walk * 1.5 : 0), 6, 2.5);
  }

  ctx.translate(0, -bob);

  // arms (behind body when side-on)
  const armColor = a.sleeves || a.outfit;
  const drawArm = (ax, swing) => {
    ctx.fillStyle = armColor;
    rrect(ctx, ax - 2.5, -25 + swing, 5, 12, 2.5);
    ctx.fill();
    ctx.fillStyle = a.skin;
    ctx.beginPath();
    ctx.arc(ax, -13 + swing, 2.6, 0, Math.PI * 2);
    ctx.fill();
  };
  if (side) drawArm(-dir * 3, -walk * 2);

  // torso
  const tw = side ? bw * 0.72 : bw;
  ctx.fillStyle = a.outfit;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  rrect(ctx, -tw / 2, -27, tw, 17, 5);
  ctx.fill();
  ctx.stroke();
  // outfit details
  if (a.accessory === 'apron' || a.apron) {
    ctx.fillStyle = a.apron || '#f4efe6';
    rrect(ctx, -tw / 2 + 2.5, -21, tw - 5, 12, 3);
    ctx.fill();
  }
  if (a.undershirt && facing !== 'up') {
    ctx.fillStyle = a.undershirt;
    ctx.fillRect(-tw / 2 + 3, -27, tw - 6, 5);
    ctx.fillStyle = a.outfit;
    ctx.fillRect(-tw / 2 + 3, -27, 2.5, 8);
    ctx.fillRect(tw / 2 - 5.5, -27, 2.5, 8);
  }
  if (a.tie && facing === 'down') {
    ctx.fillStyle = '#efe9dc';
    ctx.beginPath();
    ctx.moveTo(-3.5, -27); ctx.lineTo(0, -22); ctx.lineTo(3.5, -27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = a.tie;
    ctx.beginPath();
    ctx.moveTo(-1.5, -26); ctx.lineTo(1.5, -26); ctx.lineTo(2, -16); ctx.lineTo(0, -14); ctx.lineTo(-2, -16); ctx.closePath(); ctx.fill();
  }
  if (a.accessory === 'scarf' && facing !== 'up') {
    ctx.fillStyle = a.accent || '#f2c14e';
    rrect(ctx, -tw / 2 + 1, -28.5, tw - 2, 4.5, 2);
    ctx.fill();
    if (facing === 'down') ctx.fillRect(2, -25, 3.5, 7);
  }
  // belt line
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-tw / 2, -12.5, tw, 2);

  if (!side) {
    drawArm(-tw / 2 - 1.5, walk * 2);
    drawArm(tw / 2 + 1.5, -walk * 2);
  } else {
    drawArm(dir * 2, walk * 2);
  }

  // head
  const hy = -36;
  ctx.fillStyle = a.skin;
  ctx.strokeStyle = outline;
  ctx.beginPath();
  ctx.arc(0, hy, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawHair(ctx, a, facing, hy);

  // face
  if (facing !== 'up') {
    const eyeY = hy + 1;
    ctx.fillStyle = '#2a2230';
    if (s.sleeping) {
      ctx.strokeStyle = '#2a2230';
      ctx.lineWidth = 1.2;
      for (const ex of side ? [dir * 4] : [-3.6, 3.6]) {
        ctx.beginPath(); ctx.moveTo(ex - 1.8, eyeY); ctx.lineTo(ex + 1.8, eyeY); ctx.stroke();
      }
    } else if (side) {
      ctx.beginPath(); ctx.ellipse(dir * 4.5, eyeY, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(-3.6, eyeY, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3.6, eyeY, 1.3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,110,110,0.28)';
      ctx.beginPath(); ctx.arc(-6, eyeY + 3.5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, eyeY + 3.5, 2, 0, Math.PI * 2); ctx.fill();
    }
    drawFaceAccessory(ctx, a, facing, eyeY, dir);
  }
  if (a.accessory === 'goggles') {
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(-9.5, hy - 6, 19, 3);
    if (facing !== 'up') {
      ctx.fillStyle = a.accent || '#5b7f9a';
      ctx.strokeStyle = '#3a3030';
      for (const gx of side ? [dir * 3.5] : [-4, 4]) {
        ctx.beginPath(); ctx.arc(gx, hy - 5, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawHair(ctx, a, facing, hy) {
  const c = a.hair || '#333';
  ctx.fillStyle = c;
  const style = a.hairStyle || 'short';
  ctx.beginPath();
  if (facing === 'up') {
    ctx.arc(0, hy, 9.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // cap of hair over the top of the head
    ctx.arc(0, hy - 1, 10, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(6, hy - 4, 0, hy - 5);
    ctx.quadraticCurveTo(-6, hy - 4, -9.8, hy - 1.5);
    ctx.fill();
  }
  if (style === 'bun') {
    ctx.beginPath();
    ctx.arc(0, hy - 10.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(c, 25);
    ctx.beginPath();
    ctx.arc(-1.5, hy - 12, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'parted') {
    if (facing !== 'up') {
      ctx.strokeStyle = shade(c, 35);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, hy - 9.5); ctx.lineTo(-1.5, hy - 4.5); ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(-8.5, hy - 1, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8.5, hy - 1, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (style === 'messy') {
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2.2 - 2, hy - 7);
      ctx.lineTo(i * 2.4, hy - 13 - (i % 2 ? 1.5 : 0));
      ctx.lineTo(i * 2.2 + 2, hy - 7);
      ctx.fill();
    }
  } else if (style === 'long' || style === 'ponytail') {
    if (facing !== 'up') {
      ctx.fillRect(-10, hy - 3, 4, 14);
      ctx.fillRect(6, hy - 3, 4, 14);
    } else {
      ctx.fillRect(-9, hy, 18, 12);
    }
    if (style === 'ponytail' && facing !== 'down') {
      ctx.beginPath(); ctx.ellipse(facing === 'left' ? 9 : facing === 'right' ? -9 : 0, hy + 2, 3, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (style === 'curly') {
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI + (i / 8) * Math.PI;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * 9, hy - 1 + Math.sin(ang) * 9, 3.6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (style === 'hat') {
    ctx.fillStyle = a.hatColor || a.accent || '#444';
    ctx.fillRect(-12, hy - 8, 24, 3);
    rrect(ctx, -7.5, hy - 17, 15, 10, 3);
    ctx.fill();
  }
}

function drawFaceAccessory(ctx, a, facing, eyeY, dir) {
  if (a.accessory !== 'glasses') return;
  ctx.strokeStyle = '#1e1b22';
  ctx.lineWidth = 1;
  if (facing === 'left' || facing === 'right') {
    ctx.beginPath(); ctx.arc(dir * 4.5, eyeY, 2.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dir * 1.8, eyeY - 0.5); ctx.lineTo(-dir * 7, eyeY - 1.5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-3.7, eyeY, 2.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.7, eyeY, 2.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.8, eyeY); ctx.lineTo(0.8, eyeY); ctx.stroke();
  }
}

/** Head-and-shoulders portrait into a square canvas context of `size` px. */
export function drawPortrait(ctx, a, size, opts = {}) {
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, opts.bgTop || '#f7ecd8');
  g.addColorStop(1, opts.bgBottom || '#e3cfae');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const scale = size / 34;
  drawCharacter(ctx, { ...a, height: 1 }, { x: size / 2, y: size * 1.55, facing: 'down', scale, idleTime: opts.time || 0, sleeping: opts.sleeping });
}

export { shade, rrect };
