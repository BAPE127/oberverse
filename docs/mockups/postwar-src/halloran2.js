// Saint Halloran v2: a curved harbour town: coast, river, a diagonal boulevard into a roundabout, winding Old Town lanes. 170 x 110. Mock only.
import { organic, smooth } from './organic.js';
const coast = (x) => 86 + 5 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3);
const dpath = (path, x, y) => { let m = 1e9; for (const p of path) m = Math.min(m, Math.hypot(p[0] - x, p[1] - y)); return m; };
const river = smooth([[170, 26], [152, 32], [140, 48], [130, 68], [122, 84]], 10);
const quay = []; for (let x = 0; x <= 170; x += 12) quay.push([x, coast(x) - 6]);
export const CFG = {
  id: 'halloran', name: 'Saint Halloran', W: 170, H: 110, start: [92, 60], ground: ',', lampStep: 11, reach: 16, glass: '#9cc0d2', sidewalkProps: ['hydrant', 'trashbarrel', 'bench', 'plant', 'barrel'],
  isWater: (x, y) => dpath(river, x + 0.5, y + 0.5) < 3.8,
  paint(T) { T.where((x, y) => y > coast(x), '~'); T.stroke(river, 7, '~'); T.disc(88, 56, 9, 'm'); T.disc(150, 74, 6, 'm');
    for (const x0 of [12, 28, 46, 62, 78, 98, 112, 138, 154]) for (let y = Math.floor(coast(x0)) - 1; y < coast(x0) + 8 + (x0 % 7); y++) for (let dx = 0; dx < 3; dx++) T.set(x0 + dx, y, 'p'); },
  roads: [
    { name: 'Velvet Strip', w: 4, pts: [[18, 4], [44, 20], [68, 40], [88, 56]] }, { name: 'Halloran Avenue', w: 4, pts: [[0, 64], [28, 68], [58, 64], [88, 56], [116, 58], [142, 62], [169, 60]] },
    { name: 'Courthouse Road', w: 4, pts: [[88, 56], [110, 36], [135, 18], [168, 10]] }, { name: 'Pier Row', w: 4, pts: [[88, 56], [93, 70], [90, 82]] }, { name: 'Hush Lane Road', w: 4, pts: [[88, 56], [62, 72], [32, 78], [0, 76]] },
    { name: 'Quay Road', w: 4, pts: quay }, { name: 'Old Town Lane', w: 3, pts: [[10, 20], [26, 26], [38, 34], [52, 46], [66, 58]] }, { name: 'Lantern Row', w: 3, pts: [[6, 40], [22, 44], [36, 52], [50, 62]] },
    { name: 'Tea Alley', w: 3, pts: [[30, 8], [34, 22], [28, 34], [22, 46]] }, { name: 'Ledger Lane', w: 3, pts: [[96, 20], [104, 30], [100, 42], [92, 52]] }, { name: 'Maple Walk', w: 3, pts: [[116, 58], [124, 74], [136, 76], [150, 74]] },
    { name: 'Dock Spur', w: 3, pts: [[28, 68], [34, 80], [46, 84]] }, { name: 'North Row', w: 3, pts: [[44, 20], [70, 14], [96, 20]] },
  ],
  seeds: [
    { x: 28, y: 24, style: 'r_lan', wmin: 4, wmax: 8, dmin: 6, dmax: 9 }, { x: 52, y: 34, style: 'r_lan', wmin: 4, wmax: 8, dmin: 6, dmax: 9 }, { x: 12, y: 50, style: 'r_ten', shabby: true, wmin: 4, wmax: 7, dmin: 6, dmax: 9 },
    { x: 76, y: 30, style: 'r_van', towers: 0.1, wmin: 6, wmax: 11, dmin: 7, dmax: 10 }, { x: 98, y: 44, style: 'r_van', wmin: 6, wmax: 10, dmin: 7, dmax: 9 },
    { x: 138, y: 26, style: 'r_civ', columns: true, wmin: 7, wmax: 12, dmin: 7, dmax: 11 }, { x: 150, y: 48, style: 'r_mhe', wmin: 5, wmax: 9, dmin: 6, dmax: 9 },
    { x: 44, y: 76, style: 'r_kes', wmin: 9, wmax: 16, dmin: 7, dmax: 10 }, { x: 100, y: 78, style: 'r_kes', wmin: 9, wmax: 16, dmin: 7, dmax: 10 }, { x: 64, y: 82, style: 'r_kes', wmin: 9, wmax: 14, dmin: 7, dmax: 9 }, { x: 140, y: 74, style: 'r_mhe', wmin: 5, wmax: 9, dmin: 6, dmax: 9 },
  ],
  plazas: [{ cx: 88, cy: 56, r: 9, fountain: true, trees: 4 }, { cx: 150, cy: 74, r: 6, trees: 5 }],
  landmarks: [
    { key: 'casino', name: 'GILDED ACE CASINO', style: 'r_van', x: 70, y: 22, w: 17, h: 14, o: { wall: '#8a3a44', roof: '#2e1a1e', trim: '#1a0c10', neon: '#ffc846', awning: '#c8a030' } },
    { key: 'verona', name: 'CLUB VERONA', style: 'r_van', x: 88, y: 28, w: 9, h: 11, o: { wall: '#7a3a54', neon: '#ff8aa8', awning: '#a82a5a' } },
    { key: 'lantern', name: 'LANTERN HALL', style: 'r_lan', x: 26, y: 20, w: 15, h: 12, o: { wall: '#8a5a36', roof: '#3a2a22', trim: '#2a1c14', neon: '#ffc846', awning: '#b83a2a' } },
    { key: 'cityhall', name: 'CITY HALL', style: 'r_civ', x: 132, y: 22, w: 14, h: 13, o: { wall: '#a6a6b6', roof: '#4a4c58', neon: '#dce6ff', columns: true } },
    { key: 'police', name: 'STATION 6 POLICE', style: 'r_civ', x: 148, y: 12, w: 10, h: 11, o: { wall: '#8a96aa', roof: '#3a4252', neon: '#8ab4ff' } },
    { key: 'union', name: 'KESTREL UNION HALL', style: 'r_kes', x: 40, y: 72, w: 15, h: 10, o: { wall: '#4a6a84', neon: '#6ec0f0', awning: '#2a6a9a' } },
    { key: 'pier3', name: 'PIER 3 WAREHOUSE', style: 'r_kes', x: 96, y: 72, w: 16, h: 10, o: { wall: '#566a7a', roof: '#222c36', neon: '#ff5a5a' } },
    { key: 'reyes', name: "MAMA REYES' GROCERY", style: 'r_ten', x: 16, y: 56, w: 9, h: 8, o: { wall: '#80604a', neon: '#8aff9a', awning: '#2a7a3a' } },
    { key: 'station', name: 'CENTRAL RAIL STATION', style: 'r_civ', x: 140, y: 64, w: 13, h: 10, o: { wall: '#9a9aaa', roof: '#44444e', neon: '#ffe9a0', columns: true } },
  ],
  passes: [{ tries: 60000, shrink: 0 }, { tries: 80000, shrink: 1 }, { tries: 100000, shrink: 2 }],
  props: [{ type: 'statue', x: 90, y: 59 }, { type: 'barrelfire', x: 36, y: 60 }, { type: 'crane', x: 58, y: 84, o: { w: 3, h: 2 } }, { type: 'crane', x: 106, y: 84, o: { w: 3, h: 2 } }, { type: 'crate', x: 62, y: 85 }, { type: 'crate', x: 64, y: 85 }, { type: 'barrel', x: 110, y: 85 }],
};
export const build = () => organic(CFG);
