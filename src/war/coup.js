// The coup (v0.106.0; owner's decisions of 2026-11-08 and 2026-11-15): a campaign on the strategic map. You stage it from the command terminal;
// Sund's own provinces become a theatre with your company as the side and the government as the enemy; your battalions march on the capital;
// the government fights back with the provinces' garrisons and a field army whose size is Fort Gullcrest's stock (the defence budget). Every
// engagement is the ordinary strategic one: played as a battle, given to a general, or given up. While the coup is on, your base is not
// protected (the one flag, src/war/protection.js) and you are hunted (the 4th star).
//
//   coupNeeds(game)        what staging needs, each { ok, text }: a licensed company, enough battalions at home, none abroad, a government with an exposed flank
//   stageCoup(game)        stage it: the flag goes to 'staged', the theatre opens, the Army is raised against you
//   surrenderCoup(game)    give up: terms are imposed
//   coupDay(game)          once a day: has it been won (the capital is yours) or lost (no battalion left in the field, or your home province taken)?
//   coupView(game)         what the terminal shows
// Won: the flag goes to 'ended', a settlement "you govern" restores protection, and you rule by decree (world.politics.junta). Lost or surrendered:
// 'ended', then the settlement "terms": a fine from the company, the licence suspended, the battalions stood down; the company survives.
import { ensureMilitary, peekMilitary } from './state.js';
import { setCoupState, settle } from './protection.js';
import { warOf, note, controllerOf, setControl, nowHour, countryName } from './strategic.js';
import { provinces, provinceById } from '../world/provinces.js';
import { hooks } from './hooks.js';
import { aiState } from './strategicAI.js';
import { COUP } from '../content/coup.js';
import { view as damageView, apply as damageApply } from './damage.js';


export const COUP_SIDE = 'coup';
export const HOME = 'sund';
const capital = () => provinces().find((p) => p.country === HOME && p.capital);
const homeStates = () => [...new Set(provinces().filter((p) => p.country === HOME).map((p) => p.state))];

export const coupOf = (game) => peekMilitary(game)?.coupRun || null;
export const coupOn = (game) => coupOf(game)?.state === 'on';

/** The theatre a coup fights in (added to the strategic theatres while one is on). */
export function coupTheatre(game) {
  const r = coupOf(game); if (!r || r.state !== 'on') return null;
  return { id: 'coup', name: 'The Coup', between: [COUP_SIDE, HOME], kind: 'land', note: 'Your company against the government of Sund.', states: homeStates(), hot: true, coup: true };
}

/** What staging a coup needs: each { ok, text }. */
export function coupNeeds(game) {
  const m = peekMilitary(game); const C = m?.company; const w = warOf(game);
  const home = (w?.battalions || []).filter((b) => b.status === 'home'); const away = (w?.battalions || []).filter((b) => b.status !== 'home');
  const pol = game.politics?.peek?.(); const approval = pol ? game.politics.approval(pol) : 0.5; const unrest = (pol?.unrest?.level ?? 0);
  const flank = approval < COUP.flank.approval || unrest >= COUP.flank.unrest;
  return [
    { ok: Boolean(C?.identity && C.licensed), text: 'A licensed military company' },
    { ok: home.length >= COUP.battalions, text: `${COUP.battalions} battalions raised and at home (you have ${home.length})` },
    { ok: !away.length && !w?.employer, text: 'No contract abroad: every battalion home, nobody\'s flag but your own' },
    { ok: flank, text: `A government with an exposed flank: approval under ${Math.round(COUP.flank.approval * 100)}% (now ${Math.round(approval * 100)}%) or unrest at ${COUP.flank.unrest} or more` },
    { ok: (m?.coup?.state ?? 'none') === 'none', text: 'No coup has been staged before without a settlement' },
  ];
}

export function stageCoup(game) {
  const need = coupNeeds(game).filter((n) => !n.ok); if (need.length) return { ok: false, text: `Not yet: ${need.map((n) => n.text).join('; ')}.` };
  const m = ensureMilitary(game); const w = warOf(game); const day = game.clock.day;
  const r = setCoupState(game, 'staged', 'you marched on the capital'); if (!r.ok) return r;
  const home = w.battalions.find((b) => b.status === 'home')?.home;
  m.coupRun = { state: 'on', since: day, home, battles: 0, won: 0, lost: 0 };
  w.employer = { theatre: 'coup', side: COUP_SIDE, enemy: HOME, since: day, staging: home, coup: true };
  w.ai = null; w.lost = []; w.flipped = {};
  // the government's field army is what Fort Gullcrest has: the Army's stock, in the strategic pool
  const ai = aiState(game, w); const st = game.army?.state?.stock || { soldiers: 30, heavy: 4 };
  ai.pool[HOME] = Math.round(st.soldiers + st.heavy * COUP.heavyAsTroops); ai.pool[COUP_SIDE] = 0;
  // your battalions muster where they are: no sealift, they are already in the country
  for (const b of w.battalions) if (b.status === 'home') { b.status = 'theatre'; b.pos = home; b.order = { type: 'hold' }; b.org = Math.max(b.org || 0, 80); }
  note(w, game, 'The coup: your battalions march on the capital.');
  game.army?.raise('a coup has been staged', true);
  game.notify?.(`The coup has begun. Take ${capital()?.name || 'the capital'} to win. Your base is no longer protected.`, 'warn');
  return { ok: true, text: `The coup has begun. Take ${capital()?.name || 'the capital'}.` };
}

/** The end of it. `won`: you govern; otherwise terms are imposed. */
function finish(game, won, why) {
  const m = ensureMilitary(game); const w = warOf(game); const run = m.coupRun; if (!run || run.state !== 'on') return;
  run.state = won ? 'won' : 'lost'; run.ended = game.clock.day; run.why = why;
  setCoupState(game, 'ended', won ? 'the capital is taken' : why);
  for (const b of w.battalions) if (b.status === 'theatre') { b.status = 'home'; b.pos = b.home; b.engaged = null; b.moving = null; b.order = { type: 'hold' }; }
  w.employer = null; w.ai = null;
  game.army?.endHunt(won ? 'The Army stands down: it answers to you now.' : '');
  const pol = game.politics?.ensure?.();
  if (won) {
    if (pol) pol.junta = { since: game.clock.day, leader: game.player.name, company: m.company?.identity?.name || 'your company', decrees: [] };
    settle(game, 'you govern');
    note(w, game, 'The coup succeeds: you govern Sund.');
    game.notify?.('The capital is yours. You govern Sund by decree; the Assembly is suspended and there are no elections while you rule.', 'info');
  } else {
    const C = m.company; const fine = Math.round(COUP.terms.fine); try { game.corp.pay('security', fine, { cat: 'fine', owe: true }); } catch { /* no account */ }
    if (C) { C.licensed = false; C.licenceSuspendedUntil = game.clock.day + COUP.terms.licenceDays; }
    for (const b of [...w.battalions]) { w.battalions = w.battalions.filter((x) => x !== b); } // (stood down: the squads stay the company's)
    for (const pid of Object.keys(w.control)) if (provinceById(pid)?.country === HOME) setControl(game, pid, HOME);
    settle(game, 'terms');
    note(w, game, `The coup fails (${why}). Terms: a fine of ${fine.toLocaleString('en-US')} obols, the licence suspended for ${COUP.terms.licenceDays} days, the battalions stood down.`);
    game.notify?.(`The coup has failed (${why}). The company survives under terms: a fine, a suspended licence, its battalions stood down.`, 'warn');
  }
}

export function surrenderCoup(game) {
  if (!coupOn(game)) return { ok: false, text: 'There is no coup to give up.' };
  finish(game, false, 'you surrendered'); return { ok: true, text: 'You surrender. Terms are imposed.' };
}

/** Once a day (and after each engagement): won if the capital is yours; lost if your home province has fallen or nothing of yours is left in the field. */
export function coupDay(game) {
  if (!coupOn(game)) return;
  const w = warOf(game); const run = coupOf(game); const cap = capital();
  if (cap && controllerOf(game, cap) === COUP_SIDE) return finish(game, true, 'the capital is taken');
  const home = provinceById(run.home);
  if (home && controllerOf(game, home) !== COUP_SIDE && controllerOf(game, home) === HOME && w.flipped?.[home.id] !== undefined) return finish(game, false, 'your base was overrun');
  if (!w.battalions.some((b) => b.status === 'theatre')) return finish(game, false, 'nothing of yours is left in the field');
  if (game.clock.day - run.since > COUP.maxDays) return finish(game, false, 'it dragged on until the country turned against you');
  const ai = w.ai; if (ai) ai.pool[COUP_SIDE] = 0; // (you have no allies' army: only your battalions)
}

export function coupView(game) {
  const run = coupOf(game); const cap = capital();
  return { run, needs: coupNeeds(game), capital: cap ? { id: cap.id, name: cap.name, yours: controllerOf(game, cap) === COUP_SIDE } : null, flag: peekMilitary(game)?.coup?.state ?? 'none', junta: game.politics?.peek?.()?.junta || null, stock: game.army?.state?.stock || null };
}

// ---- hooks into the strategic war: the coup's own ground
const prevControl = hooks.controlChanged;
hooks.controlChanged = (game, p, old, now) => {
  prevControl?.(game, p, old, now);
  if (!coupOn(game)) return;
  const run = coupOf(game);
  // the government takes your home province: the base is attacked (it is not protected while the coup is on); every company structure there takes damage through the gate
  if (p.id === run.home && now === HOME) {
    for (const s of damageView(game)) if (s.owner === 'company') damageApply(game, s.id, COUP.baseDamage, 'strategic');
  }
  if (now === COUP_SIDE) run.won += 1; else if (old === COUP_SIDE) run.lost += 1;
  if (now === COUP_SIDE && p.id === capital()?.id) finish(game, true, 'the capital is taken'); // (won the moment it falls, not at midnight)
};
hooks.extraTheatres = (game) => { const t = coupTheatre(game); return t ? [t] : []; };
hooks.coupDay = (game) => {
  coupDay(game);
  const C = peekMilitary(game)?.company; // terms run out: the licence comes back
  if (C && !C.licensed && C.licenceSuspendedUntil && game.clock.day >= C.licenceSuspendedUntil) { C.licensed = true; C.licenceSuspendedUntil = null; game.notify?.('The suspension is over: your company\'s licence is restored.', 'info'); }
};
void nowHour; void countryName;
