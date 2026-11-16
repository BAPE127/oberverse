// The megacity tower (v0.107.0, Neumina): a building marked `neo: true` gets the dressing of a city of towers on top of the ordinary
// tower body: neon strips up its corners, lit bands round it every few storeys, a stepped crown with a glowing ring, a mast with a
// beacon, advertising panels on its faces, and (on the taller ones) a landing pad on a cantilever. Everything is built from the
// building record and its `glass` colour; the variety comes from a hash of its id, so the same tower always looks the same.
// The neon is lit day and night (emissive, not driven by the lamp curve): the city never switches off.
import { THREE, hash, box, cyl, mat, shade } from './lib3d.js';

// the city's advertisers (all invented): a name and a line, painted on a glowing panel
const ADS = [['VANTOR', 'NEW LUNGS IN AN HOUR'], ['ORREL', 'YOUR DATA, OUR CARE'], ['HALCYNE', 'LIVE ABOVE THE WEATHER'], ['KESSIN', 'ARCOLOGY UNITS LEASING'],
  ['STATIC', 'NOODLES 24/7'], ['LUMEN', 'FREIGHT THAT THINKS'], ['DREAMLEASE', 'SLEEP, SUBSCRIBED'], ['SYNTH COURT', 'BE SEEN'], ['MERIDIAN', 'THE LATTICE NEVER SLEEPS']];
const adCache = new Map();
/** A glowing advert: a gradient, a mark and the advertiser's name and line, painted once per colour and design. Null without a DOM. */
function adMaterial(c, k) {
  if (typeof document === 'undefined') return null;
  const key = `${c}|${k}`; if (adCache.has(key)) return adCache.get(key);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 128, 96); gr.addColorStop(0, shade(c, -90)); gr.addColorStop(1, shade(c, -30)); x.fillStyle = gr; x.fillRect(0, 0, 128, 96);
  x.strokeStyle = c; x.lineWidth = 3; x.strokeRect(3, 3, 122, 90);
  x.globalAlpha = 0.9; x.fillStyle = c;
  if (k % 3 === 0) { x.beginPath(); x.arc(96, 36, 20, 0, 6.3); x.fill(); } else if (k % 3 === 1) { x.beginPath(); x.moveTo(96, 14); x.lineTo(118, 56); x.lineTo(74, 56); x.fill(); } else x.fillRect(78, 18, 36, 36);
  x.globalAlpha = 1; x.fillStyle = '#ffffff'; x.font = 'bold 15px sans-serif'; x.fillText(ADS[k][0], 9, 76, 110);
  x.font = '9px sans-serif'; x.fillStyle = shade(c, 90); x.fillText(ADS[k][1], 9, 88, 110);
  for (let r = 0; r < 96; r += 3) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, r, 128, 1); } // (scan lines)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.keep = true; adCache.set(key, m);
  return m;
}

const NEON = ['#ff3fb4', '#4dfcff', '#b06bff', '#ffb347', '#5dff9c', '#ff5f5f'];

/** Adds the dressing to `g` (the tower's group, origin at the footprint's centre at ground) and returns the new top (of the crown). */
export function dressNeoTower(b, g, deco, H, seed) {
  const accent = b.glass || NEON[Math.floor(hash(seed, 21) * NEON.length)];
  const second = NEON[Math.floor(hash(seed, 22) * NEON.length)];
  const lit = (c, ei = 1.8) => mat(c, { emissive: c, ei });
  const dark = mat('#14151d');
  const hw = b.w / 2; const hd = b.h / 2;
  // neon strips up the four corners
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) deco.add(box(0.14, H - 0.6, 0.14, lit(accent, 1.5), { x: sx * (hw + 0.02), z: sz * (hd + 0.02), y: 0.6, cast: false }));
  // lit bands round the tower every few storeys (the band above the street lobby brightest)
  const step = 5 + Math.floor(hash(seed, 23) * 4);
  for (let y = 3.2, i = 0; y < H - 1; y += step, i++) {
    const m = lit(i % 2 ? second : accent, i === 0 ? 2.2 : 1.3); const t = 0.16;
    deco.add(box(b.w + 0.12, t, 0.08, m, { y, z: hd + 0.04, cast: false }), box(b.w + 0.12, t, 0.08, m, { y, z: -hd - 0.04, cast: false }));
    deco.add(box(0.08, t, b.h + 0.12, m, { y, x: hw + 0.04, cast: false }), box(0.08, t, b.h + 0.12, m, { y, x: -hw - 0.04, cast: false }));
  }
  // advertising panels on the faces the camera sees (south and east), at a height that clears the levels below the Terraces
  const nAds = 1 + Math.floor(hash(seed, 24) * 2);
  for (let i = 0; i < nAds; i++) {
    const c = NEON[Math.floor(hash(seed, 30 + i) * NEON.length)];
    const ah = 2.6 + hash(seed, 31 + i) * 2.2; const ay = Math.min(H - ah - 1, 9 + hash(seed, 32 + i) * (H * 0.55));
    if (ay < 3) continue;
    const south = (i + Math.floor(hash(seed, 33) * 2)) % 2 === 0;
    const aw = Math.min(south ? b.w : b.h, 3.2 + hash(seed, 34 + i) * 2.4) - 0.6;
    const off = (hash(seed, 35 + i) - 0.5) * ((south ? b.w : b.h) - aw - 0.6);
    const face = adMaterial(c, Math.floor(hash(seed, 36 + i) * ADS.length)) || lit(c, 1.6); const frame = mat(shade(c, -140));
    if (south) deco.add(box(aw + 0.24, ah + 0.24, 0.12, frame, { x: off, y: ay - 0.12, z: hd + 0.08, cast: false }), box(aw, ah, 0.06, face, { x: off, y: ay, z: hd + 0.16, cast: false }));
    else deco.add(box(0.12, ah + 0.24, aw + 0.24, frame, { z: off, y: ay - 0.12, x: hw + 0.08, cast: false }), box(0.06, ah, aw, face, { z: off, y: ay, x: hw + 0.16, cast: false }));
  }
  // a landing pad on a cantilever, on the taller towers
  if (H > 40 && hash(seed, 25) > 0.25) {
    const py = H * (0.62 + hash(seed, 26) * 0.2); const east = hash(seed, 27) > 0.5; const r = 2.1;
    const px = east ? hw + r + 0.3 : 0; const pz = east ? 0 : hd + r + 0.3;
    deco.add(box(east ? r + 0.6 : 1.2, 0.5, east ? 1.2 : r + 0.6, dark, { x: east ? hw + (r + 0.6) / 2 - 0.3 : 0, z: east ? 0 : hd + (r + 0.6) / 2 - 0.3, y: py - 0.55 }));
    deco.add(cyl(r, 0.22, mat('#262833'), { x: px, z: pz, y: py - 0.2, seg: 24 }), cyl(r + 0.06, 0.06, lit(accent, 2), { x: px, z: pz, y: py - 0.02, seg: 24, cast: false }));
    deco.add(cyl(r * 0.55, 0.03, lit('#ffd36a', 1.2), { x: px, z: pz, y: py + 0.03, seg: 20, rt: r * 0.5, cast: false }));
  }
  // the crown: a narrower storey set back, a glowing ring, then a mast with a beacon
  const cw = b.w * (0.55 + hash(seed, 28) * 0.15); const cd = b.h * (0.55 + hash(seed, 29) * 0.15); const ch = 2.2 + hash(seed, 36) * 2.2;
  deco.add(box(cw, ch, cd, mat('#1d2030'), { y: H }));
  deco.add(box(cw + 0.1, 0.18, cd + 0.1, lit(accent, 2.4), { y: H + ch - 0.4, cast: false }));
  deco.add(box(cw * 0.6, 0.6, cd * 0.6, mat('#252838'), { y: H + ch }));
  const mh = 3 + hash(seed, 37) * 5;
  deco.add(cyl(0.12, mh, mat('#3a3d4a'), { y: H + ch + 0.6, rt: 0.05 }));
  deco.add(box(0.22, 0.22, 0.22, lit('#ff3a3a', 2.6), { y: H + ch + 0.6 + mh, cast: false }));
  return H + ch + 0.6; // (the mast is too thin to hide anyone: the top for the see-behind is the crown's)
}
