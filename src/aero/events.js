// Reputation and events (v0.57.0): what happens at the Park because of how a company is run.
// Nothing here is a random interruption. Each event has a trigger in the company's own record
// (its reputation, its bottleneck, its failed inspections, its research), a stable hash of the
// day to decide *which* of the days that qualify it comes on, a cool-down, and an effect that goes
// through the simulation's checked methods (src/systems/aerospace.js) — so a reload, or a rival
// reading the same board, can't see it differently. The functions take the Aerospace system `A`.
import { hashUnit } from './config.js';
import { makeTender } from './tenders.js';
import { quantityError, baysFor, fmtMoney } from './catalog.js';

const cooled = (A, co, kind, days) => (A.day - (co.cool?.[kind] ?? -1e9)) >= days;
const stamp = (A, co, kind) => { (co.cool ||= {})[kind] = A.day; };

/** Each morning, for the player's company: expire what has run out, then see what the books and the floor say. */
export function eventsMorning(A, co) {
  const E = A.cfg.events;
  expireEvents(A, co);
  trackPressure(A, co);
  governmentOrder(A, co, E.government);
  constellation(A, co, E.constellation);
  expansionOffer(A, co, E.expansion);
  audit(A, co, E.audit);
}

// ---------------------------------------------------------------- major orders (real tenders on the shared board)
/** Post a tender for a customer's named product; the customer's budget is committed like any tender's. */
export function postEventTender(A, customerId, product, qty, kind, E) {
  const C = A.cfg;
  const st = A.state.customers[customerId];
  const t = makeTender(C, A.rng, { id: A.nextId('T'), customerId, state: st, day: A.day, embargoed: A.embargoed(customerId), force: { product, qty } });
  if (!t) return null;
  t.event = kind;
  t.ceiling = Math.round((t.ceiling * (E.ceilingBoost || 1)) / 100) * 100;
  t.deposit = E.deposit;
  t.days = Math.ceil(t.days * E.daysBoost);
  t.closes = A.day + E.closeDays;
  if (E.minReputation) t.minReputation = E.minReputation;
  st.budget -= t.ceiling * t.qty;
  A.state.tenders.push(t);
  A.syncRng();
  return t;
}

/** A government or defence buyer, flush with budget, places a major order — if Roost has the standing and could build it. */
function governmentOrder(A, co, G) {
  if (!cooled(A, co, 'government', G.cooldown) || co.reputation < G.minReputation) return;
  if (hashUnit(`gov|${co.id}|${A.day}`) >= G.chance) return;
  const C = A.cfg;
  const buyers = Object.entries(C.customers).filter(([id, cu]) => G.kinds.includes(cu.kind) && !A.embargoed(id)).sort(([a], [b]) => (a < b ? -1 : 1));
  if (!buyers.length) return;
  const start = Math.floor(hashUnit(`govbuyer|${A.day}`) * buyers.length);
  for (let k = 0; k < buyers.length; k++) {
    const [cid, cu] = buyers[(start + k) % buyers.length];
    const wants = Object.keys(cu.wants).filter((pid) => C.products[pid] && A.canBuild(co, C.products[pid]) && C.products[pid].line !== 'satellite');
    if (!wants.length) continue;
    const pid = wants[Math.floor(hashUnit(`govprod|${A.day}|${cid}`) * wants.length)];
    const p = C.products[pid];
    const qty = p.line === 'aircraft' ? 3 + Math.floor(hashUnit(`govqty|${A.day}`) * 3) : 1 + Math.floor(hashUnit(`govqty|${A.day}`) * 2);
    if (quantityError(C.aero, p, Math.min(qty, 5))) continue;
    const t = postEventTender(A, cid, pid, Math.min(qty, p.line === 'aircraft' ? C.aero.maxAircraftPerContract : qty), 'government', G);
    if (!t) continue;
    stamp(A, co, 'government');
    const text = `🏛 A major government order: ${cu.name} wants ${t.qty} × ${p.name} (up to ${fmtMoney(t.ceiling)} each, ${Math.round(t.deposit * 100)}% deposit, within ${t.days} days). Reputation ${t.minReputation}+ to bid.`;
    A.news(text, 'good');
    A.report(co, 'event', text, 'good');
    return;
  }
}

/** A comms or space customer wants a whole constellation — if Roost can build, launch and commission satellites. */
function constellation(A, co, K) {
  if (!cooled(A, co, 'constellation', K.cooldown) || co.reputation < K.minReputation) return;
  if (hashUnit(`con|${co.id}|${A.day}`) >= K.chance) return;
  const C = A.cfg;
  const buyers = Object.entries(C.customers).filter(([, cu]) => K.kinds.includes(cu.kind)).sort(([a], [b]) => (a < b ? -1 : 1));
  const start = Math.floor(hashUnit(`conbuyer|${A.day}`) * Math.max(1, buyers.length));
  for (let k = 0; k < buyers.length; k++) {
    const [cid, cu] = buyers[(start + k) % buyers.length];
    const wants = Object.keys(cu.wants).filter((pid) => C.products[pid]?.line === 'satellite' && A.canBuild(co, C.products[pid]));
    if (!wants.length) continue;
    const pid = wants[Math.floor(hashUnit(`conprod|${A.day}|${cid}`) * wants.length)];
    const p = C.products[pid];
    const qty = K.qty[0] + Math.floor(hashUnit(`conqty|${A.day}`) * (K.qty[1] - K.qty[0] + 1));
    if (quantityError(C.aero, p, qty)) continue;
    const t = postEventTender(A, cid, pid, qty, 'constellation', K);
    if (!t) continue;
    stamp(A, co, 'constellation');
    const text = `🛰 A constellation contract: ${cu.name} wants ${t.qty} × ${p.name} launched and commissioned (up to ${fmtMoney(t.ceiling)} each, within ${t.days} days).`;
    A.news(text, 'good');
    A.report(co, 'event', text, 'good');
    return;
  }
}

// ---------------------------------------------------------------- expansion
/** Count the mornings a bay has been the bottleneck (aircraft waiting for a bay of a type). */
function trackPressure(A, co) {
  const byType = {};
  for (const u of A.unitsOf(co).filter((x) => x.blocker?.kind === 'bay')) { const t = baysFor(A.cfg, A.pOf(u))[0]; byType[t] = (byType[t] || 0) + 1; }
  const [type, n] = Object.entries(byType).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  co.pressure = n >= 1 ? { type, n, days: (co.pressure?.type === type ? co.pressure.days : 0) + 1 } : null;
}

/** The Park Authority offers a discount on the hall that would relieve the bottleneck. */
function expansionOffer(A, co, X) {
  if (!co.pressure || co.pressure.days < X.pressureDays || !cooled(A, co, 'expansion', X.cooldown)) return;
  if (co.offers?.some((o) => o.kind === 'hall_discount' && o.until >= A.day)) return;
  if (A.freeSlot(co, co.pressure.type)) return; // a slot is free: all it needs is a bay
  const next = A.hallFor(co, co.pressure.type);
  if (!next) return;
  const [hid, H] = next;
  (co.offers ||= []).push({ id: A.nextId('OF'), kind: 'hall_discount', hall: hid, pct: X.discount, until: A.day + X.window, reason: `${co.pressure.n} unit${co.pressure.n === 1 ? ' has' : 's have'} been waiting for a ${A.cfg.bays[co.pressure.type].name.toLowerCase()}` });
  stamp(A, co, 'expansion');
  A.report(co, 'event', `🏗 The Park Authority offers ${Math.round(X.discount * 100)}% off the ${H.name} for ${X.window} days: ${co.pressure.n} unit${co.pressure.n === 1 ? ' has' : 's have'} been waiting for a ${A.cfg.bays[co.pressure.type].name.toLowerCase()}.`, 'good');
}

/** The discount (a fraction) on a hall right now, and the offer it comes from. */
export function hallDiscount(A, co, hallId) {
  const o = (co.offers || []).find((x) => x.kind === 'hall_discount' && x.hall === hallId && x.until >= A.day);
  return o ? { pct: o.pct, offer: o } : { pct: 0, offer: null };
}

// ---------------------------------------------------------------- quality: the audit
function audit(A, co, U) {
  if (co.events?.some((e) => e.kind === 'audit' && !e.resolved)) return;
  if (!cooled(A, co, 'audit', U.cooldown)) return;
  const since = A.now - A.cfg.events.rep.failWindowDays * 1440;
  const fails = (co.qaLog || []).filter((e) => !e.pass && e.at >= since);
  if (fails.length < U.failures) return;
  const prog = U.programme + U.programmePerTech * co.workforce;
  const fine = U.fine + U.finePerTech * co.workforce;
  (co.events ||= []).push({
    id: A.nextId('EV'), kind: 'audit', at: A.now, expires: A.day + U.decideDays, resolved: null,
    title: 'The regulator is auditing your inspections',
    text: `${fails.length} failed inspections in ${A.cfg.events.rep.failWindowDays} days (${[...new Set(fails.map((f) => f.what.replace(/ #\d+$/, '')))].join(', ')}). The inspectors' office wants to see what you're doing about it — decide within ${U.decideDays} days or it will decide for you.`,
    choices: [
      { id: 'programme', label: `Fund a corrective programme · ${fmtMoney(prog)}`, text: `Retrain the floor: experience +${U.experience}, no fine, no mark against you.`, cost: prog },
      { id: 'fine', label: `Accept the fine · ${fmtMoney(fine)}`, text: `Pay up and carry on: reputation ${U.repFine}.`, cost: fine },
    ],
  });
  stamp(A, co, 'audit');
  A.report(co, 'event', `🔍 A regulator's audit: ${fails.length} failed inspections in ${A.cfg.events.rep.failWindowDays} days. Decide in the Standing page within ${U.decideDays} days.`, 'warn');
}

/** The player's decision on an open event. */
export function resolveEvent(A, co, eventId, choiceId) {
  const e = (co.events || []).find((x) => x.id === eventId);
  if (!e) return { ok: false, text: 'No such event.' };
  if (e.resolved) return { ok: false, text: 'That has already been decided.' };
  if (e.kind === 'debris') return A.resolveDebris(co, e, choiceId); // (the fleet's: src/aero/fleet.js)
  const U = A.cfg.events.audit;
  const ch = e.choices.find((c) => c.id === choiceId);
  if (!ch) return { ok: false, text: 'No such choice.' };
  if (!A.canAfford(co, ch.cost || 0)) return { ok: false, text: `That costs ${Math.round(ch.cost).toLocaleString()} obols.` };
  A.pay(co, ch.cost || 0, ch.id === 'programme' ? 'training' : 'penalties');
  e.resolved = { at: A.now, choice: ch.id };
  if (e.kind === 'audit') {
    if (ch.id === 'programme') { co.experience = Math.min(A.cfg.staff.experience.cap, co.experience + U.experience); A.report(co, 'event', `🔍 The audit closes: the corrective programme satisfied the regulator.`, 'good'); }
    else { A.repChange(co, U.repFine, 'Fined after a regulator\'s audit'); A.report(co, 'event', `🔍 The audit closes: a fine of ${fmtMoney(ch.cost)}.`, 'warn'); }
  }
  return { ok: true, text: e.kind === 'audit' && ch.id === 'programme' ? 'The corrective programme is under way.' : 'Decided.' };
}

/** Events nobody decided in time decide themselves, against you. */
function expireEvents(A, co) {
  const U = A.cfg.events.audit;
  for (const e of co.events || []) {
    if (e.resolved || e.expires >= A.day) continue;
    if (e.kind === 'debris') { A.resolveDebris(co, e, 'risk'); continue; } // nobody decided: the dice (a hash) decide
    const fine = U.fine + U.finePerTech * co.workforce;
    A.pay(co, fine, 'penalties');
    e.resolved = { at: A.now, choice: 'ignored' };
    A.repChange(co, U.repIgnored, 'Ignored a regulator\'s audit');
    A.report(co, 'event', `🔍 The audit decided without you: a fine of ${fmtMoney(fine)}.`, 'bad');
  }
  co.events = (co.events || []).filter((e) => !e.resolved || e.resolved.at > A.now - 20 * 1440);
  co.offers = (co.offers || []).filter((o) => o.until >= A.day - 3);
}

// ---------------------------------------------------------------- research breakthroughs (pre-rolled when the work begins)
/** Whether a research project will turn up something extra: fixed when it starts, by its own hash, better with a lab and engineers. */
export function rollBreakthrough(A, co, researchId) {
  const B = A.cfg.events.breakthrough;
  const chance = Math.min(0.4, B.base + (A.hallState(co, 'lab').state === 'built' ? B.lab : 0) + (co.engineers >= A.staffNeeded(co, 'engineer') * 1.2 ? B.engineers : 0));
  return hashUnit(`bt|${co.id}|${researchId}|${A.day}`) < chance;
}

export function applyBreakthrough(A, co, research) {
  const B = A.cfg.events.breakthrough;
  co.qualityBase += B.quality;
  A.repChange(co, B.reputation, `Research breakthrough: ${research.name}`);
  const text = `💡 A breakthrough in ${research.name.toLowerCase()}: the team found more than it was looking for (quality +${B.quality} for good).`;
  A.report(co, 'event', text, co.kind === 'player' ? 'good' : null);
  A.news(co.kind === 'player' ? `${co.name} announces a research breakthrough: ${research.name.toLowerCase()}.` : `Meridian announces a breakthrough: ${research.name.toLowerCase()}.`, co.kind === 'player' ? 'good' : 'info');
}

// ---------------------------------------------------------------- milestones (the firsts, once each)
export function milestone(A, co, key, detail = '') {
  const M = A.cfg.events.milestones[key];
  if (!M) return false;
  co.milestones ||= {};
  if (co.milestones[key]) return false;
  co.milestones[key] = { at: A.now, day: A.day, detail };
  if (M.rep) A.repChange(co, M.rep, `Milestone: ${M.name.toLowerCase()}`);
  A.report(co, 'event', `🏅 ${M.name}: ${M.text}${detail ? ` (${detail})` : ''}.`, co.kind === 'player' ? 'good' : null);
  if (co.kind === 'rival') A.news(`${co.name}: ${M.name.toLowerCase()}.`);
  return true;
}

/** An event contract (a government order, a constellation) is finished: the reward for delivering all of it, on time. */
export function eventContractDone(A, co, c) {
  if (!c.event || c.status !== 'complete') return;
  const E = A.cfg.events[c.event];
  if (!E) return;
  if (c.failed || c.penalties) { A.report(co, 'event', `The ${c.event === 'government' ? 'government order' : 'constellation'} for ${A.cfg.customers[c.customer].name} is complete — late or incomplete, so no standing to show for it.`, co.kind === 'player' ? 'warn' : null); return; }
  A.repChange(co, E.reward, c.event === 'government' ? `Government order delivered in full (${A.cfg.customers[c.customer].name})` : `Constellation delivered on time (${A.cfg.customers[c.customer].name})`);
  milestone(A, co, c.event === 'government' ? 'first_government' : 'first_constellation', A.cfg.customers[c.customer].name);
}
