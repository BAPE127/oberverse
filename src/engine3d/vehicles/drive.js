// The common life of a vehicle (phase 3D-3): wheels that roll with the speed and steer with `wheel`, brake lamps, headlamps at night, the
// police bar, and a little body roll and pitch on its springs. Purely visual: it reads the live vehicle (angle, wheel, speed, braking,
// chase ...) and never writes to it.
import { lampMats } from './geo.js';

const TILE = 32;
const k = (dt, rate) => Math.min(1, dt * rate);

/** Is this vehicle's driver out and about with the lamps on? Traffic, buses, the driven car and a car on a chase; parked cars are dark. */
export function lampsOn(v, ctx) {
  if (!ctx || !ctx.night) return false;
  if (v.kind || v.chase) return true;
  const p = ctx.game?.player;
  return Boolean(p && v.id !== undefined && p.driving === v.id);
}

/**
 * Give `root` (from geo.assemble) its standard update. `extra(v, ctx, dt, st)` runs after, for a signature car's own tricks.
 * opts: { roll: 0..1 (how much it leans), steerK: wheel angle factor }.
 */
export function bindDrive(root, extra = null, opts = {}) {
  const u = root.userData;
  const st = { pitch: 0, roll: 0, t: 0, lit: null, tail: null, siren: null, spin: 0 };
  const lean = opts.roll ?? 1;
  u.state = st;
  u.update = (v, ctx, dt) => {
    v = v || {};
    ctx = ctx || {};
    dt = dt > 0 ? Math.min(dt, 0.1) : 0;
    st.t += dt;
    const speed = Number.isFinite(v.speed) ? v.speed : 0; // px/s, signed
    const steer = Math.max(-1, Math.min(1, v.wheel || 0));
    st.spin += (speed / TILE) * dt;
    for (const w of u.wheels) {
      w.spin = (w.spin || 0) - ((speed / TILE) / w.r) * dt;
      w.mesh.rotation.z = w.spin;
      if (w.steer) w.pivot.rotation.y = -steer * (opts.steerK ?? 0.5);
    }
    // the springs: the nose dips under braking, lifts under power; the body leans out of a turn
    const sp = Math.min(1, Math.abs(speed) / 250);
    const pitchT = v.braking ? -0.035 * Math.max(0.4, sp) : 0;
    const rollT = steer * sp * 0.045 * lean;
    st.pitch += (pitchT - st.pitch) * k(dt, 8);
    st.roll += (rollT - st.roll) * k(dt, 6);
    u.body.rotation.z = st.pitch;
    u.body.rotation.x = st.roll;
    const P = u.parts;
    const on = lampsOn(v, ctx);
    if (P.lampF && st.lit !== on) { P.lampF.material = on ? lampMats.headOn() : lampMats.headOff(); st.lit = on; }
    if (P.lampR) {
      const tail = v.braking ? 2 : on ? 1 : 0;
      if (st.tail !== tail) { P.lampR.material = tail === 2 ? lampMats.tailBrake() : tail === 1 ? lampMats.tailDim() : lampMats.tailOff(); st.tail = tail; }
    }
    if (P.barR && P.barB) {
      const ph = v.chase || v.siren ? (Math.floor(((ctx.time || st.t) * 6)) % 2) + 1 : 0;
      if (st.siren !== ph) {
        P.barR.material = ph === 1 ? lampMats.sirenRedOn() : lampMats.sirenRedOff();
        P.barB.material = ph === 2 ? lampMats.sirenBlueOn() : lampMats.sirenBlueOff();
        st.siren = ph;
      }
    }
    if (extra) extra(v, ctx, dt, st);
  };
  return root;
}

/** Seconds since the horn sounded (99 when it never has), the way the 2D sigOpts reads it. */
export function hornAge(v, ctx) {
  const now = ctx?.game?.realTime;
  return v.hornAt == null || now == null ? 99 : now - v.hornAt;
}
