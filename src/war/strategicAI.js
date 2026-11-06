// The nations at war (v0.103.1): the other side's army, and the employer's own. Each country in the theatre has a mobile reserve (from its income) and puts formations in the field at three levels:
//   1 a probe: a few men at the weakest point, often;
//   2 a counter-attack: to retake what it lost, after its reaction time;
//   3 an offensive: a large force, by an aggressive country or one that sees an opportunity.
// How well it chooses depends on the country (src/content/strategic.js COUNTRY_AI): a blunt one goes for the nearest ground whatever the odds; a methodical one takes the best prize it can beat and never
// attacks at poor odds; a cunning one does that and hunts what is weak (an empty province, a battalion of yours low on supply or organisation). A formation marches by the hour like a battalion. Where it
// meets a battalion of yours it opens an engagement with you DEFENDING (play it, give it to a general, or give the ground up); everywhere else the two armies fight it out by the `exchange` below, hour by hour.
//
//   exchange(att, def, key)        the hourly fight of two forces (pure, deterministic): who broke, and what is left
//   profileOf(country)             { skill, doctrine, aggression, pool }
// Nothing is spawned for free: a formation is paid for out of its country's pool, and what survives goes back to it.
import { hooks } from './hooks.js';
import { provinces, provinceById } from '../world/provinces.js';
import { COUNTRIES } from '../content/arms.js';
import { AI, EXCHANGE, COUNTRY_AI, COUNTRY_AI_DEFAULT, TERRAIN_FX, WEAKEN } from '../content/strategic.js';
import { warOf, controllerOf, setControl, garrisonOf, marchHours, defend, statsOf, supplyAt, theatreOf, inTheatre, countryName, note, unit as hash, nowHour, ensureEmployer } from './strategic.js';
import { estimate } from './supply.js';

export function profileOf(country) {
  const c = COUNTRIES[country]; const a = COUNTRY_AI[country] || COUNTRY_AI_DEFAULT; const income = c?.income ?? 3000;
  return { country, skill: a.skill, doctrine: a.doctrine, text: a.text, aggression: c?.aggression ?? 0.1, poolMax: Math.max(12, Math.round(income / AI.poolPer)) };
}

// ---- the hourly exchange
const power = (f) => (f.troops + f.armour * EXCHANGE.armour) * (f.skill ?? 1) * (0.4 + 0.6 * f.org / 100);
/**
 * Two forces fight by the hour until one breaks (its organisation falls to `breakAt`) or `hours` pass. `att` and `def` are { troops, armour, org, skill }; `def` may also carry { fort, entrench, terrain }.
 * Each hour each side loses a share of what it started with, more the worse its odds, with a little luck from a hash of the key; organisation falls with the losses. The attacker wins if the defender breaks first,
 * or at the end if it has the defender down to two fifths and is still standing. Returns { won, att, def, hours }.
 */
export function exchange(att, def, key) {
  const A = { troops: att.troops, armour: att.armour, org: att.org ?? 100, skill: att.skill ?? 1 }; const D = { troops: def.troops, armour: def.armour, org: def.org ?? 100, skill: def.skill ?? 1 };
  const a0 = Math.max(1, A.troops); const d0 = Math.max(1, D.troops); const mult = (TERRAIN_FX[def.terrain]?.def ?? 1) * (1 + EXCHANGE.fort * (def.fort || 0) + EXCHANGE.entrench * (def.entrench || 0));
  let hours = 0; let won = false;
  for (let h = 1; h <= EXCHANGE.hours; h++) {
    hours = h; const Pa = Math.max(0.5, power(A)); const Pd = Math.max(0.5, power(D) * mult); const r = Pa / Pd;
    const la = a0 * EXCHANGE.rate * Math.sqrt(1 / r) * (1 - EXCHANGE.luck + 2 * EXCHANGE.luck * hash(`${key}|a|${h}`)); const ld = d0 * EXCHANGE.rate * Math.sqrt(r) * (1 - EXCHANGE.luck + 2 * EXCHANGE.luck * hash(`${key}|d|${h}`));
    const fa = Math.min(A.troops, la) / Math.max(1, A.troops); const fd = Math.min(D.troops, ld) / Math.max(1, D.troops);
    A.troops = Math.max(0, A.troops - la); D.troops = Math.max(0, D.troops - ld); A.armour = Math.max(0, A.armour * (1 - fa * 0.7)); D.armour = Math.max(0, D.armour * (1 - fd * 0.7));
    A.org = Math.max(0, A.org - (la / a0) * 160); D.org = Math.max(0, D.org - (ld / d0) * 160);
    if (D.org <= EXCHANGE.breakAt || D.troops < 1) { won = true; break; } if (A.org <= EXCHANGE.breakAt || A.troops < 1) break;
  }
  if (!won && hours >= EXCHANGE.hours && A.org > EXCHANGE.breakAt && D.troops < d0 * 0.4) won = true;
  return { won, att: { troops: Math.round(A.troops), armour: Math.round(A.armour * 10) / 10, org: Math.round(A.org) }, def: { troops: Math.round(D.troops), armour: Math.round(D.armour * 10) / 10, org: Math.round(D.org) }, hours };
}

// ---- the record
const state = (game, w) => (w.ai ||= { formations: [], pool: {}, cool: {}, week: 0, next: 0, made: { 1: 0, 2: 0, 3: 0 } });
export const aiState = state;
const poolOf = (ai, country) => (ai.pool[country] ??= Math.round(profileOf(country).poolMax * AI.startShare));
const countryOfSide = (w, side) => (side === 'enemy' ? w.employer.enemy : w.employer.side);
const other = (side) => (side === 'enemy' ? 'ally' : 'enemy');
const fPower = (f) => power(f);
const speedOf = (f) => (f.armour >= Math.max(1, f.troops / 4) ? AI.speedArmour : AI.speedFoot);
const bnPower = (game, bn) => { const s = statsOf(game, bn); return (s.people + s.vehicles * 5.5 * 0.6) * (0.4 + 0.6 * bn.org / 100) * (1 + 0.05 * bn.entrench); };

/** What stands in a province against an attacker from `attSide`: its garrison, formations of the defending side, and (for the enemy attacking) a battalion of yours. */
export function defenders(game, w, to, attSide) {
  const ai = state(game, w); const defSide = other(attSide); const g = garrisonOf(game, to);
  const fs = ai.formations.filter((f) => f.side === defSide && f.prov === to.id && !f.moving);
  const bn = attSide === 'enemy' ? w.battalions.find((b) => b.status === 'theatre' && b.pos === to.id) : null;
  const troops = g.troops + fs.reduce((a, f) => a + f.troops, 0); const armour = g.armour + fs.reduce((a, f) => a + f.armour, 0);
  const mult = (TERRAIN_FX[to.terrain]?.def ?? 1) * (1 + EXCHANGE.fort * to.fort + EXCHANGE.entrench * (bn ? bn.entrench : 0));
  const pw = (troops + armour * EXCHANGE.armour) + (bn ? bnPower(game, bn) : 0);
  return { garrison: g, formations: fs, bn, troops, armour, power: pw * mult, empty: troops === 0 && !bn, weak: Boolean(bn && (bn.org < 60 || supplyAt(game, to) < 40)) };
}

export function front(game, w, side) { // [from, to] pairs: ground of this side next to ground of the other
  const e = w.employer; const th = theatreOf(game, e.theatre); const P = provinces(); const mine = countryOfSide(w, side); const out = [];
  for (const p of P) { if (!inTheatre(th)(p) || controllerOf(game, p) !== mine) continue; for (const n of p.neighbours) { const q = P[n]; if (inTheatre(th)(q) && controllerOf(game, q) === countryOfSide(w, other(side))) out.push([p, q]); } }
  return out;
}
const value = (game, w, to, side) => 1 + to.vp * 3 + (to.capital ? 6 : 0) + (to.port ? 2 : 0) + (side === 'enemy' && to.id === w.employer.staging ? 10 : 0) + (w.lost.some((l) => l.pid === to.id && l.from === countryOfSide(w, side) && game.clock.day - l.day <= 12) ? 5 : 0);

/** Choose the target for a force of `size` (and skill) that could attack from any of `pairs`: [from, to]. Returns { from, to, odds } or null. */
export function choose(game, w, side, prof, size, armour, pairs) {
  const f = { troops: size, armour, org: 100, skill: prof.skill }; let best = null;
  for (const [from, to] of pairs) {
    const d = defenders(game, w, to, side); const odds = fPower(f) / Math.max(1, d.power); const v = value(game, w, to, side);
    if (odds < AI.odds[prof.doctrine]) continue;
    let score;
    if (prof.doctrine === 'blunt') score = 1000 - Math.hypot(from.lat - to.lat, from.lon - to.lon) * 10 + v * 0.01;
    else if (prof.doctrine === 'methodical') score = v * odds ** 1.5;
    else score = v * odds ** 1.5 * (1 + (d.weak ? 0.5 : 0) + (d.empty ? 0.8 : 0));
    if (!best || score > best.score || (score === best.score && to.id < best.to.id)) best = { from, to, odds, score };
  }
  return best;
}

export function spawn(game, w, side, prof, level, size, from, to) {
  const ai = state(game, w); const country = countryOfSide(w, side); ai.pool[country] = poolOf(ai, country) - size;
  const armour = size >= 24 ? Math.floor(size / 24) : 0; ai.next += 1;
  const f = { id: `F${ai.next}`, side, country, prov: from.id, troops: size, armour, org: 100, skill: prof.skill, level, born: game.clock.day, order: 'attack', moving: { to: to.id, left: marchHours(game, armour >= Math.max(1, size / 4) ? AI.speedArmour : AI.speedFoot, from, to) , attack: true }, engaged: null, idle: null };
  ai.formations.push(f); ai.made ||= { 1: 0, 2: 0, 3: 0 }; ai.made[level]++; return f;
}

function lostFor(game, w, country) { return w.lost.filter((l) => l.from === country && game.clock.day - l.day <= AI.counter.expireDays && controllerOf(game, provinceById(l.pid)) === l.to); }

function think(game, w, side) {
  const ai = state(game, w); const country = countryOfSide(w, side); const prof = profileOf(country); const day = game.clock.day; const h = nowHour(game);
  const mine = ai.formations.filter((f) => f.side === side); const cd = (k) => day - (ai.cool[`${country}|${k}`] ?? -99) >= AI[k].cooldownDays;
  // idle formations: an offensive goes on to the next target; the rest go home after a day and their men return to the pool
  for (const f of mine) {
    if (f.engaged || f.moving) continue; f.idle ??= h;
    if (f.level === 3 && f.troops >= 8 && f.org >= 40) { const pairs = front(game, w, side).filter(([from]) => from.id === f.prov); const c = choose(game, w, side, prof, f.troops, f.armour, pairs); if (c) { f.moving = { to: c.to.id, left: marchHours(game, speedOf(f), c.from, c.to), attack: true }; f.idle = null; continue; } }
    if (h - f.idle >= AI.idleHours || f.troops < 4) { ai.pool[country] = poolOf(ai, country) + Math.round(f.troops * 0.7); ai.formations = ai.formations.filter((x) => x !== f); }
  }
  const active = ai.formations.filter((f) => f.side === side).length; if (active >= AI.maxFormations) return;
  const pool = poolOf(ai, country); const pairs = front(game, w, side); if (!pairs.length) return;
  // level 2: retake what was lost, after the country's reaction time
  const lost = lostFor(game, w, country).filter((l) => nowHour(game) - l.hour >= AI.react[prof.doctrine]);
  if (lost.length && cd('counter') && pool >= AI.counter.min) {
    const L = lost[lost.length - 1]; const to = provinceById(L.pid); const from = pairs.filter(([, t]) => t.id === to.id).sort((a, b) => b[0].infra - a[0].infra || (a[0].id < b[0].id ? -1 : 1))[0]?.[0];
    if (from) {
      const d = defenders(game, w, to, side); const size = Math.min(Math.round(pool * AI.counter.share), Math.max(AI.counter.min, Math.round((d.troops + d.armour * EXCHANGE.armour) * AI.counter.factor / prof.skill + (prof.doctrine === 'blunt' ? 2 : 6))));
      const ok = prof.doctrine === 'blunt' || (size * prof.skill) / Math.max(1, d.power) >= AI.odds[prof.doctrine] * 0.9;
      if (ok && size <= pool) { spawn(game, w, side, prof, 2, size, from, to); ai.cool[`${country}|counter`] = day; note(w, game, `${countryName(country)} counter-attacks at ${to.name}.`); return; }
    }
  }
  // level 3: an offensive, by an aggressive country, or one that sees a chance
  if (cd('offensive') && pool >= prof.poolMax * AI.offensive.poolShare && pool >= 20) {
    const local = pairs.reduce((a, [, t]) => a + defenders(game, w, t, side).power, 0) / Math.max(1, new Set(pairs.map(([, t]) => t.id)).size);
    const chance = prof.aggression >= AI.offensive.aggression ? AI.offensive.chance : 0; const roll = hash(`${game.world.salt || 0}|off|${country}|${h}`);
    const opportunist = prof.doctrine !== 'blunt' && pool / Math.max(1, local * Math.min(4, new Set(pairs.map(([, t]) => t.id)).size)) >= AI.offensive.ratio && (prof.doctrine === 'cunning' ? pairs.some(([, t]) => { const d = defenders(game, w, t, side); return d.empty || d.weak; }) : prof.aggression >= AI.offensive.aggression * 0.7);
    if ((roll < chance && prof.doctrine === 'blunt') || (prof.aggression >= AI.offensive.aggression && roll < chance * 1.3) || opportunist) {
      const size = Math.min(AI.offensive.max, Math.round(pool * AI.offensive.share)); const c = choose(game, w, side, prof, size, size >= 24 ? Math.floor(size / 24) : 0, pairs);
      if (c) { spawn(game, w, side, prof, 3, size, c.from, c.to); ai.cool[`${country}|offensive`] = day; note(w, game, `${countryName(country)} opens an offensive toward ${c.to.name}.`); if (side === 'enemy') game.notify?.(`${countryName(country)} has opened an offensive toward ${c.to.name}.`, 'warn'); return; }
    }
  }
  // level 1: a probe, now and then, at the weakest point
  if (cd('probe') && pool >= AI.probe.min && hash(`${game.world.salt || 0}|probe|${country}|${h}`) < AI.probe.base + AI.probe.perAggression * prof.aggression) {
    const size = Math.max(AI.probe.min, Math.min(AI.probe.max, Math.round(pool * AI.probe.share))); const c = choose(game, w, side, prof, size, 0, pairs);
    if (c) { spawn(game, w, side, prof, 1, size, c.from, c.to); ai.cool[`${country}|probe`] = day; }
  }
}

// ---- arrival: an attack goes in
function strike(game, w, f) {
  const ai = state(game, w); const to = provinceById(f.moving.to); const from = provinceById(f.prov); const attSide = f.side; const mine = countryOfSide(w, attSide);
  const prof = profileOf(f.country); const d = defenders(game, w, to, attSide);
  if (controllerOf(game, to) === mine) { f.prov = to.id; f.moving = null; return; } // someone else already took it
  if (d.bn && d.bn.engaged) { f.moving.left = 1; return; } // the battalion is in another fight: it waits an hour
  if (prof.doctrine !== 'blunt' && fPower(f) / Math.max(1, d.power) < AI.abort) { f.moving = null; f.order = 'hold'; f.idle = nowHour(game); return; } // a careful army turns back from a bad fight
  f.moving = null;
  if (d.bn) { const id = defend(game, w, d.bn, to, f); if (id) { f.engaged = id; return; } }
  const r = exchange({ troops: f.troops, armour: f.armour, org: f.org, skill: f.skill }, { troops: d.troops, armour: d.armour, org: 100, skill: profileOf(controllerOf(game, to)).skill, fort: to.fort, terrain: to.terrain, entrench: 0 }, `${f.id}|${to.id}|${nowHour(game)}`);
  f.troops = r.att.troops; f.armour = r.att.armour; f.org = Math.max(10, r.att.org);
  for (const x of d.formations) { x.troops = r.def.troops ? Math.max(0, Math.round(x.troops * r.def.troops / Math.max(1, d.troops))) : 0; x.armour = r.def.troops ? x.armour : 0; }
  if (r.won) {
    setControl(game, to.id, mine); f.prov = to.id; ai.formations = ai.formations.filter((x) => !(x.side !== attSide && x.prov === to.id && !x.moving && !x.engaged));
    const near = w.battalions.some((b) => b.status === 'theatre' && (provinceById(b.pos).neighbours.includes(to.n) || b.pos === to.id)); const text = `${countryName(f.country)} takes ${to.name}${d.garrison.troops || d.formations.length ? ' after a fight' : ' unopposed'}.`;
    note(w, game, text); if (attSide === 'enemy' && (near || w.lost.some((l) => l.pid === to.id && l.from === w.employer.side && l.to === w.employer.enemy && l.day === game.clock.day))) game.notify?.(text, 'warn');
    ensureEmployer(game);
  } else { f.org = Math.min(f.org, 40); }
  if (f.troops < 4 || (!r.won && f.org <= EXCHANGE.breakAt + 5)) ai.formations = ai.formations.filter((x) => x !== f);
}

/** A formation that attacked a battalion of yours: the result of the engagement decides what is left of it. */
hooks.aiDefenceEnd = (game, fid, held, obj, provId) => {
  const w = warOf(game); const ai = w?.ai; const f = ai?.formations.find((x) => x.id === fid); if (!f) return; f.engaged = null; f.moving = null;
  if (held) { f.troops = Math.round(f.troops * (obj >= 3 ? 0.2 : 0.5)); f.org = 30; if (f.troops < 4) ai.formations = ai.formations.filter((x) => x !== f); else f.idle = nowHour(game); }
  else { f.prov = provId; f.troops = Math.round(f.troops * 0.8); f.org = Math.max(30, f.org - 25); f.idle = nowHour(game); ensureEmployer(game); }
};

hooks.aiHour = (game, w, h) => {
  if (w.aiOff) return; // (a debug and test switch: the nations stand still)
  const ai = state(game, w);
  for (const f of ai.formations.slice()) {
    if (f.engaged || !f.moving) continue; f.moving.left -= 1; if (f.moving.left > 0) continue;
    if (f.moving.attack) strike(game, w, f); else { f.prov = f.moving.to; f.moving = null; }
  }
  if (h % AI.thinkHours === 0) { think(game, w, 'enemy'); think(game, w, 'ally'); }
};
hooks.aiDay = (game, w) => {
  if (w.aiOff) return;
  const ai = state(game, w); const day = game.clock.day;
  if (day - ai.week >= 7) { ai.week = day; for (const side of ['enemy', 'ally']) { const c = countryOfSide(w, side); const p = profileOf(c); ai.pool[c] = Math.min(p.poolMax, poolOf(ai, c) + Math.round(p.poolMax * AI.regen)); } }
  for (const f of ai.formations) if (!f.moving && !f.engaged) f.org = Math.min(100, f.org + 8);
};
hooks.presentForce = (game, prov) => { const ai = warOf(game)?.ai; const fs = (ai?.formations || []).filter((f) => f.side === 'enemy' && f.prov === prov.id && !f.moving); return { troops: fs.reduce((a, f) => a + f.troops, 0), armour: fs.reduce((a, f) => a + f.armour, 0) }; };
hooks.attackWon = (game, prov) => { const ai = warOf(game)?.ai; if (ai) ai.formations = ai.formations.filter((f) => !(f.side === 'enemy' && f.prov === prov.id && !f.moving && !f.engaged)); };
hooks.attackFailed = (game, prov, obj) => { const ai = warOf(game)?.ai; for (const f of ai?.formations || []) if (f.side === 'enemy' && f.prov === prov.id && !f.moving) f.troops = Math.max(2, Math.round(f.troops * (obj === 1 ? 0.75 : 0.9))); };
hooks.allySources = (game) => (warOf(game)?.ai?.formations || []).filter((f) => f.side === 'ally').map((f) => ({ n: provinceById(f.prov).n, known: 0, spotted: 1 }));
/** What the map may show of the armies: your ally's formations as they are; the enemy's only where you can see, and as a report (a number that is off by what your intelligence there allows). */
hooks.formationsView = (game, intel) => {
  const w = warOf(game); const ai = w?.ai; if (!ai) return [];
  return ai.formations.map((f) => {
    const p = provinceById(f.prov); const lvl = f.side === 'ally' ? 2 : intel[p.n]; if (f.side === 'enemy' && lvl < 1) return null;
    const to = f.moving ? provinceById(f.moving.to) : null; const k = `${f.id}|${Math.floor(nowHour(game) / 12)}`;
    return { id: f.id, side: f.side, country: f.country, name: countryName(f.country), prov: f.prov, to: lvl >= 1 && to ? to.id : null, attack: Boolean(f.moving?.attack), level: lvl >= 2 ? f.level : null, troops: f.side === 'ally' ? f.troops : estimate(f.troops, lvl, `${k}t`), armour: f.side === 'ally' ? f.armour : estimate(f.armour, lvl, `${k}a`), org: lvl >= 2 ? Math.round(f.org) : null, known: lvl };
  }).filter(Boolean);
};
hooks.aiProfile = (game) => { const w = warOf(game); if (!w?.employer) return null; const ai = state(game, w); const mk = (side) => { const c = countryOfSide(w, side); const p = profileOf(c); return { side, country: c, name: countryName(c), skill: p.skill, doctrine: p.doctrine, text: p.text, aggression: p.aggression, pool: poolOf(ai, c), poolMax: p.poolMax, formations: ai.formations.filter((f) => f.side === side).length }; }; return { enemy: mk('enemy'), ally: mk('ally') }; };
void WEAKEN;
