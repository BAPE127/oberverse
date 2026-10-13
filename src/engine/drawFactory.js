// Drawing for warehouse fittings and factory entities (v0.12.0): the input
// bay, output crate, workbench, conveyor belts (with the items they carry),
// inserter arms, machines and generators. Called from drawProp.
const ITEM_COLORS = {
  item_part_casing: '#d8d2c4', item_part_keypad: '#3a3a40', item_part_screen: '#9fb48a', item_part_board: '#2a7a3a', item_part_battery: '#c9c6c0',
  item_calc_core: '#3a8a4a', item_calc_shell: '#e8e2d4', item_calc_blank: '#6a6a72',
  item_calc_charm: '#f08ab0', item_calc_wits: '#9aa0a8', item_calc_grit: '#2a2a2e', item_calc_finesse: '#e2e6ea', item_calc_health: '#5ac87a', item_calc_energy: '#f2d23a',
};
const MACHINE = {
  solderer: { body: '#4a6a8a', label: 'SOLDER', glow: '#ffb84a' },
  press: { body: '#7a5a3a', label: 'PRESS', glow: '#e8e2d4' },
  assembler: { body: '#3a6a5a', label: 'ASSEMBLE', glow: '#7ad0b0' },
  tuner: { body: '#6a3a6a', label: 'TUNE', glow: '#f08ab0' },
};
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

export function itemColor(id) {
  return ITEM_COLORS[id] || '#c9a24a';
}

/** A little item on a belt or in a hand. */
function drawItem(ctx, id, cx, cy, s = 1) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - 5 * s, cy - 3 * s, 11 * s, 9 * s);
  ctx.fillStyle = itemColor(id);
  ctx.fillRect(cx - 5 * s, cy - 6 * s, 10 * s, 10 * s);
  if (id.startsWith('item_calc_') && !/core|shell|blank/.test(id)) {
    ctx.fillStyle = '#9fb48a';
    ctx.fillRect(cx - 3.5 * s, cy - 4.5 * s, 7 * s, 2.5 * s);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 5 * s + 0.5, cy - 6 * s + 0.5, 10 * s - 1, 10 * s - 1);
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

export function drawFactoryProp(ctx, p, x, y, w, h, opts) {
  const t = opts.time || 0;
  switch (p.type) {
    case 'loadingbay': {
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      ctx.setLineDash([]);
      ctx.fillStyle = '#9a6b45';
      ctx.fillRect(x + 10, y + 16, w - 20, h - 24);
      for (const [bx, by, c] of [[14, 22, '#c8b08a'], [30, 20, '#b89a74'], [20, 34, '#d2bc96']]) { ctx.fillStyle = c; ctx.fillRect(x + bx, y + by, 14, 12); }
      ctx.fillStyle = '#f2c14e';
      ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('INPUT BAY', x + w / 2, y + 12);
      ctx.textAlign = 'left';
      break;
    }
    case 'outbin': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 4, y + h - 8, w - 8, 6);
      ctx.fillStyle = '#3a7a4a';
      rrect(ctx, x + 6, y + 8, w - 12, h - 14, 4); ctx.fill();
      ctx.fillStyle = '#2a5a3a';
      ctx.fillRect(x + 4, y + 6, w - 8, 6);
      ctx.fillStyle = '#e8f2e0';
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUT', x + w / 2, y + h / 2 + 6);
      ctx.textAlign = 'left';
      break;
    }
    case 'workbench': {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2, y + h - 6, w - 4, 6);
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(x + 1, y + 6, w - 2, h - 10);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(x + 1, y + h - 6, w - 2, 3);
      ctx.fillStyle = '#6a6e74'; // vice
      ctx.fillRect(x + 8, y + 2, 10, 8);
      ctx.strokeStyle = '#c9a24a'; // the soldering iron's cable
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 40, y + 10); ctx.quadraticCurveTo(x + 50, y + 2, x + 60, y + 12); ctx.stroke();
      ctx.fillStyle = '#e8e2d4'; // a blank calculator
      ctx.fillRect(x + 70, y + 8, 8, 11);
      ctx.fillStyle = '#9fb48a';
      ctx.fillRect(x + 71, y + 9, 6, 3);
      break;
    }
    case 'belt': {
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = '#2a2a2e';
      const dir = p.dir || 0;
      const horiz = dir % 2 === 0;
      if (horiz) { ctx.fillRect(x + 1, y + 1, w - 2, 3); ctx.fillRect(x + 1, y + h - 4, w - 2, 3); } else { ctx.fillRect(x + 1, y + 1, 3, h - 2); ctx.fillRect(x + w - 4, y + 1, 3, h - 2); }
      // chevrons crawl along the belt
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 2, y + 2, w - 4, h - 4); ctx.clip();
      ctx.strokeStyle = '#6a6a72';
      ctx.lineWidth = 2;
      const phase = (t * 16) % 12;
      for (let k = -12; k < 36; k += 12) {
        const o = k + phase;
        ctx.beginPath();
        if (dir === 0) { ctx.moveTo(x + o, y + 9); ctx.lineTo(x + o + 6, y + 16); ctx.lineTo(x + o, y + 23); }
        if (dir === 2) { ctx.moveTo(x + w - o, y + 9); ctx.lineTo(x + w - o - 6, y + 16); ctx.lineTo(x + w - o, y + 23); }
        if (dir === 1) { ctx.moveTo(x + 9, y + o); ctx.lineTo(x + 16, y + o + 6); ctx.lineTo(x + 23, y + o); }
        if (dir === 3) { ctx.moveTo(x + 9, y + h - o); ctx.lineTo(x + 16, y + h - o - 6); ctx.lineTo(x + 23, y + h - o); }
        ctx.stroke();
      }
      ctx.restore();
      if (p.carry) {
        // slide in from the previous tile over the minute it arrived
        const since = opts.clock !== undefined && p.arrived !== undefined ? opts.clock - p.arrived : 1;
        const back = since < 1 ? (1 - since) * w : 0;
        drawItem(ctx, p.carry, x + w / 2 - DX[dir] * back, y + h / 2 + 2 - DY[dir] * back);
      }
      break;
    }
    case 'inserter': {
      const dir = p.dir || 0;
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.fillStyle = '#4a4a50';
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      // the arm swings from behind to in front once a minute while busy
      const swing = p.busy ? Math.cos(((opts.clock || 0) % 1) * Math.PI) : 1;
      const ax = cx + DX[dir] * 13 * swing;
      const ay = cy + DY[dir] * 13 * swing;
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(ax - 3, ay - 3, 6, 6);
      // a direction tick so you can read which way it moves things
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(cx + DX[dir] * 14 + DY[dir] * 3, cy + DY[dir] * 14 - DX[dir] * 3);
      ctx.lineTo(cx + DX[dir] * 14 - DY[dir] * 3, cy + DY[dir] * 14 + DX[dir] * 3);
      ctx.lineTo(cx + DX[dir] * 18, cy + DY[dir] * 18);
      ctx.fill();
      break;
    }
    case 'machine': {
      const m = MACHINE[p.kind] || MACHINE.press;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 3, y + h - 6, w - 4, 6);
      ctx.fillStyle = m.body;
      rrect(ctx, x + 2, y - 10, w - 4, h + 4, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 2, y - 10, w - 4, 5);
      // the window: glows while working
      const working = p.progress > 0 && p.powered !== false;
      ctx.fillStyle = working ? m.glow : '#1e1e22';
      ctx.globalAlpha = working ? 0.6 + 0.4 * Math.sin(t * 8) : 1;
      ctx.fillRect(x + 12, y + 2, w - 24, 18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4efe6';
      ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.kind === 'tuner' ? (p.setting ? `TUNE:${p.setting.toUpperCase()}` : 'TUNE: ?') : m.label, x + w / 2, y - 1);
      ctx.textAlign = 'left';
      // progress bar and power light
      ctx.fillStyle = '#1e1e22';
      ctx.fillRect(x + 8, y + h - 16, w - 16, 5);
      ctx.fillStyle = '#7ad08a';
      ctx.fillRect(x + 8, y + h - 16, (w - 16) * Math.min(1, Math.max(0, (p.progress || 0) - 1) / (p.minutes || 4)), 5);
      ctx.fillStyle = p.powered === false ? '#ff4a3a' : '#5ae07a';
      ctx.beginPath(); ctx.arc(x + w - 9, y - 4, 3, 0, Math.PI * 2); ctx.fill();
      // output waiting
      const outN = Object.values(p.out || {}).reduce((a, b) => a + b, 0);
      if (outN) {
        const id = Object.keys(p.out).find((k) => p.out[k] > 0);
        drawItem(ctx, id, x + 10, y + h - 2, 0.8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
        ctx.fillText(`×${outN}`, x + 16, y + h);
      }
      break;
    }
    case 'generator': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 3, y + h - 6, w - 4, 6);
      ctx.fillStyle = '#c9a24a';
      rrect(ctx, x + 3, y - 4, w - 6, h - 2, 4); ctx.fill();
      ctx.fillStyle = '#2a2a2e';
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 + k * 12, y + 6, 6, 20);
      ctx.fillStyle = '#ffe24a';
      ctx.beginPath(); ctx.moveTo(x + w / 2 + 2, y + 30); ctx.lineTo(x + w / 2 - 6, y + 44); ctx.lineTo(x + w / 2, y + 44); ctx.lineTo(x + w / 2 - 2, y + 56); ctx.lineTo(x + w / 2 + 6, y + 40); ctx.lineTo(x + w / 2, y + 40); ctx.fill();
      // exhaust
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3) % 1;
        ctx.fillStyle = `rgba(200,200,200,${0.4 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(x + w - 10, y - 8 - ph * 20, 3 + ph * 5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    default:
  }
}
