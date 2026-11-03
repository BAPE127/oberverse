// Neumina v2: a hub-and-spoke city (radial avenues, a ring road, a canal) rather than a grid. 170 x 110 tiles. Mock only.
import { organic, smooth } from './organic.js';
const dpath = (path, x, y) => { let m = 1e9; for (const p of path) m = Math.min(m, Math.hypot(p[0] - x, p[1] - y)); return m; };
const canal = smooth([[0, 84], [22, 76], [44, 88], [64, 96], [92, 108]], 10);
const ring = []; for (let a = 0; a < 13; a++) { const t = a / 12 * 6.283; ring.push([85 + 38 * Math.cos(t) + Math.sin(t * 3) * 2, 56 + 25 * Math.sin(t) + Math.cos(t * 2) * 2]); }
export const CFG = {
  id: 'neumina', name: 'Neumina', W: 170, H: 110, start: [100, 70], ground: 'g', lampStep: 11, reach: 16, glass: '#a8f0ff',
  isWater: (x, y) => dpath(canal, x + 0.5, y + 0.5) < 3.2,
  paint(T) { T.stroke(canal, 6, '~'); T.disc(85, 56, 10, 'm'); T.disc(30, 91, 7, 'm'); T.disc(128, 40, 5, 'm'); },
  roads: [
    { name: 'Spire Way', w: 4, pts: [[85, 56], [110, 40], [135, 22], [166, 8]] }, { name: 'Kiln Road', w: 4, pts: [[85, 56], [115, 58], [145, 66], [168, 64]] },
    { name: 'Meridian Run', w: 4, pts: [[85, 56], [100, 78], [120, 96], [140, 108]] }, { name: 'Seam Run', w: 4, pts: [[85, 56], [62, 76], [40, 92], [18, 106]] },
    { name: 'Stackhaven Way', w: 4, pts: [[85, 56], [55, 52], [28, 44], [2, 46]] }, { name: 'Halcyon Road', w: 4, pts: [[85, 56], [70, 34], [55, 14], [40, 1]] },
    { name: 'Ring Road', w: 4, pts: ring.concat(ring.slice(0, 3)) }, { name: 'North Link', w: 3, pts: [[55, 14], [85, 12], [110, 14], [135, 22]] }, { name: 'South Link', w: 3, pts: [[40, 92], [70, 100], [100, 98], [120, 96]] },
    { name: 'Glass Mile', w: 3, pts: [[100, 78], [112, 70], [126, 74], [145, 66]] }, { name: 'Lane A', w: 3, pts: [[28, 44], [38, 30], [50, 26], [55, 14]] }, { name: 'Lane B', w: 3, pts: [[18, 70], [30, 62], [46, 66], [62, 76]] },
  ],
  seeds: [
    { x: 112, y: 38, style: 'n_corp', towers: 0.6, wmin: 7, wmax: 12, dmin: 8, dmax: 12 }, { x: 136, y: 30, style: 'n_corp', towers: 0.5, wmin: 7, wmax: 12, dmin: 8, dmax: 12 }, { x: 150, y: 14, style: 'n_lab', wmin: 6, wmax: 11, dmin: 7, dmax: 10 },
    { x: 100, y: 70, style: 'n_ent', towers: 0.3, wmin: 5, wmax: 9, dmin: 6, dmax: 9 }, { x: 70, y: 66, style: 'n_ent', towers: 0.3, wmin: 5, wmax: 9, dmin: 6, dmax: 9 },
    { x: 45, y: 34, style: 'n_res', towers: 0.3, wmin: 5, wmax: 8, dmin: 6, dmax: 9 }, { x: 28, y: 62, style: 'n_res', towers: 0.3, wmin: 5, wmax: 8, dmin: 6, dmax: 9 }, { x: 62, y: 20, style: 'n_res', towers: 0.25, wmin: 5, wmax: 8, dmin: 6, dmax: 9 },
    { x: 26, y: 98, style: 'n_seam', shabby: true, wmin: 4, wmax: 7, dmin: 5, dmax: 8 }, { x: 56, y: 100, style: 'n_seam', shabby: true, wmin: 4, wmax: 7, dmin: 5, dmax: 8 },
    { x: 140, y: 84, style: 'n_ind', wmin: 9, wmax: 16, dmin: 8, dmax: 13 }, { x: 156, y: 52, style: 'n_ind', wmin: 9, wmax: 15, dmin: 8, dmax: 12 }, { x: 120, y: 100, style: 'n_ind', wmin: 9, wmax: 15, dmin: 8, dmax: 12 },
    { x: 92, y: 92, style: 'n_tran', towers: 0.15, wmin: 6, wmax: 11, dmin: 7, dmax: 10 },
  ],
  plazas: [{ cx: 85, cy: 56, r: 10, fountain: true, trees: 6 }, { cx: 30, cy: 91, r: 7 }],
  landmarks: [
    { key: 'tower', name: 'ORRIN-VOSS TOWER', style: 'n_corp', x: 112, y: 30, w: 13, h: 13, tower: 32, o: { wall: '#4c5ea8', glass: '#a8f0ff', trim: '#151c40', neon: '#ffd75e', helipad: true } },
    { key: 'kade', name: 'KADE LOGISTICS', style: 'n_corp', x: 130, y: 22, w: 13, h: 12, tower: 24, o: { wall: '#3f5a96', trim: '#101a38', neon: '#5ee6ff', helipad: true } },
    { key: 'lab', name: 'HALCYON WORKS', style: 'n_lab', x: 148, y: 14, w: 17, h: 14, o: { wall: '#7a3a6e', roof: '#341a30', trim: '#1c0c1a', neon: '#ff5a6a', awning: '#b03a4a' } },
    { key: 'lotus', name: 'NEON LOTUS CLUB', style: 'n_ent', x: 96, y: 62, w: 15, h: 10, o: { wall: '#8a3fa6', roof: '#40205c', trim: '#221034', neon: '#ff5ec8', awning: '#d03aa8' } },
    { key: 'station', name: 'MERIDIAN LOOP STATION', style: 'n_tran', x: 84, y: 86, w: 20, h: 12, o: { wall: '#3f7aa0', roof: '#1e3a52', trim: '#102232', neon: '#5ee6ff', awning: '#2f9ab8' } },
    { key: 'noodles', name: 'NOODLE BAR 24', style: 'n_res', x: 44, y: 38, w: 8, h: 8, o: { wall: '#6a5a96', roof: '#2c2450', trim: '#1c1634', neon: '#8aff9a', awning: '#2fb470' } },
    { key: 'mast', name: 'RELAY MAST PLANT', style: 'n_ind', x: 140, y: 80, w: 13, h: 11, o: { wall: '#4a6a80', roof: '#222c38', trim: '#141a22', neon: '#ffffff' } },
    { key: 'synth', name: 'SYNTH RECORDS', style: 'n_ent', x: 68, y: 62, w: 10, h: 8, o: { wall: '#7a3f96', neon: '#5ee6ff' } },
  ],
  passes: [{ tries: 60000, shrink: 0 }, { tries: 80000, shrink: 1 }, { tries: 100000, shrink: 2 }],
  props: [{ type: 'monitor_wall', x: 82, y: 47, o: { w: 4, h: 1 } }, { type: 'statue', x: 88, y: 60 }, { type: 'tent', x: 27, y: 88 }, { type: 'tent', x: 31, y: 88 }, { type: 'tent', x: 27, y: 93 }, { type: 'tent', x: 31, y: 93 }, { type: 'crate', x: 29, y: 91 }, { type: 'busstop', x: 78, y: 62 }],
};
export const build = () => organic(CFG);
export { underground } from './neumina.js';
