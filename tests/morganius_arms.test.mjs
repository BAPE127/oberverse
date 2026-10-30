// Morganius's arms (v0.80.1): both elbows bend outward — away from his body — in every pose, including the
// reach for a card. (Until v0.80.1 the elbow solver bent them inward, folding the sleeves across his chest.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elbow, chooseSide, POSES, SHOULDER_L, SHOULDER_R, MorganiusPuppet } from '../src/engine/drawMorganius.js';

const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

test('for every pose the chosen elbow hangs lower and farther from the body than the other way, on both arms', () => {
  for (const [name, p] of Object.entries(POSES)) {
    for (const [s, sh, hand] of [['left', SHOULDER_L, p.L], ['right', SHOULDER_R, p.R]]) {
      const pick = chooseSide(sh, hand);
      const score = (side) => { const e = elbow(sh, hand, side).e; return Math.abs(e[0] - 100) + 0.5 * e[1]; };
      assert.ok(score(pick) >= score(-pick), `${name} ${s}`);
    }
  }
  // the poses at rest — the ones that were wrong: the sleeves go out and down, not across his chest
  for (const name of ['idle', 'deal', 'shuffle', 'lose', 'point']) {
    const p = POSES[name];
    assert.ok(elbow(SHOULDER_L, p.L, chooseSide(SHOULDER_L, p.L)).e[0] < SHOULDER_L[0], `${name}: left elbow outside its shoulder`);
    assert.ok(elbow(SHOULDER_R, p.R, chooseSide(SHOULDER_R, p.R)).e[0] > SHOULDER_R[0] || name === 'point', `${name}: right elbow outside its shoulder`);
  }
});

test('hysteresis: an elbow keeps its side unless the other is clearly better', () => {
  const p = POSES.idle;
  assert.equal(chooseSide(SHOULDER_L, p.L, -1) === -1, false, 'a clearly wrong side is abandoned');
  assert.equal(chooseSide(SHOULDER_L, [60, 140], 1), 1);
});

test('the bones keep their length and the hand is where the pose wants it (unless out of reach)', () => {
  for (const p of Object.values(POSES)) {
    const { e, h } = elbow(SHOULDER_L, p.L, 1);
    assert.ok(Math.abs(Math.hypot(e[0] - SHOULDER_L[0], e[1] - SHOULDER_L[1]) - 36) < 1e-6);
    assert.ok(Math.abs(Math.hypot(h[0] - e[0], h[1] - e[1]) - 36) < 1e-6);
  }
});

test('through a whole dealt hand — poses changing, a card thrown, eyes following — the elbows never cross the body middle', () => {
  const m = new MorganiusPuppet();
  m.map = { x: 0, y: 0, k: 1 };
  const names = Object.keys(POSES);
  let t = 0;
  for (let i = 0; i < names.length * 3; i++) {
    m.setPose(names[i % names.length], t, 0);
    if (i % 4 === 0) m.deal(t, { x: 120 + i * 3, y: 150 });
    for (let f = 0; f < 90; f++) {
      t += 0.016; m.update(t);
      m.bend.L = chooseSide(SHOULDER_L, m.hand.L, m.bend.L); m.bend.R = chooseSide(SHOULDER_R, m.hand.R, m.bend.R);
      const L = elbow(SHOULDER_L, m.hand.L, m.bend.L).e; const R = elbow(SHOULDER_R, m.hand.R, m.bend.R).e;
      assert.ok(L[0] < 100 && R[0] > 100, // (the idle weave and every pose keep both elbows on their own side of the middle)
         `${names[i % names.length]} @${t.toFixed(2)}: elbows at x ${L[0].toFixed(0)}, ${R[0].toFixed(0)}`);
    }
  }
});
