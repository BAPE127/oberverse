// The fleet in orbit (v0.59.0): what a company's satellites earn and what becomes of them. Like
// events.js, these functions take the Aerospace system `A` and go through its checked methods
// (A.pay, A.receive, A.repChange…), so nothing here moves money or standing any other way.
//
//   activateSatellite  a commissioned satellite joins the registry (service, price, book value)
//   orderSatellite     build one of your own: no customer, a network instead
//   satelliteDay       every morning: ageing, losses, revenue, fees, running costs, insurance, events
//   networkReport      for the Orbit page: each role's network, market and today's takings
//   fleetOf            a company's own satellites, those it supports for customers, and the orders in hand
import { hashUnit, configError, cleanConfig } from './config.js';
import { newUnit } from './pipeline.js';
import { marketAt, networkOf, sell, hazardOf, lostToday, daysLeft, forecast, roleOf, orbitOf, look } from './orbit.js';
import { fmtMoney, missingTech, unitCost } from './catalog.js';
import { postEventTender, milestone } from './events.js';

const DAY = 1440;
const live = (s) => s.status === 'operational' || s.status === 'degraded';

// ---------------------------------------------------------------- research effects on the fleet
const researchSum = (A, co, key) => co.research.reduce((a, id) => a + (A.cfg.research[id]?.effect?.[key] || 0), 0);
/** Extra service units a company's research adds to a role (a share: 0.1 = +10%). */
export const serviceBonus = (A, co, role) => co.research.reduce((a, id) => { const e = A.cfg.research[id]?.effect?.service; return a + (e ? (e[role] || 0) + (e.all || 0) : 0); }, 0);
/** Extra price a company's research earns on a role. */
export const priceBonus = (A, co, role) => co.research.reduce((a, id) => { const e = A.cfg.research[id]?.effect?.price; return a + (e ? (e[role] || 0) + (e.all || 0) : 0); }, 0);
export const hazardResearch = (A, co) => researchSum(A, co, 'hazard');
export const opsMult = (A, co) => Math.max(0.3, 1 + researchSum(A, co, 'opsCost'));

// ---------------------------------------------------------------- the registry
/** A commissioned satellite joins the registry: owned by its customer (built and supported by the company) or by the company itself. */
export function activateSatellite(A, co, u) {
  const s = A.state;
  const p = A.pOf(u);
  const c = A.contract(u.contract);
  const own = u.purpose === 'own';
  const id = A.nextId('SAT');
  const partial = Boolean(u.commissioning?.partial);
  const sat = {
    id, name: `${p.name.split(' ')[0]}-${String(Object.keys(s.satellites).length + 1).padStart(2, '0')}`, product: u.product, role: roleOf(p), kind: p.role, service: { ...(p.service || {}) },
    owner: c?.customer || co.id, manufacturer: co.id, contract: u.contract, unit: u.id, rocket: u.rocket, own,
    launched: A.state.units[u.rocket]?.launch?.at ?? A.now, commissioned: A.now, status: partial ? 'degraded' : 'operational',
    capability: partial ? 0.5 : 1, lifeDays: p.life, endsAt: A.now + p.life * DAY, price: c ? c.unitPrice : p.price, opex: p.opex || 0,
    hardened: u.config?.sat_hardened === 'hardened', config: { ...(u.config || {}) },
    revenueTotal: 0, supportTotal: 0,
  };
  if (own) {
    sat.value = Math.round(u.cost.materials + u.cost.freight + (u.cost.freightInt || 0));
    sat.book = sat.value;
    co.books.fleet = (co.books.fleet || 0) + sat.value;
  }
  s.satellites[id] = sat;
  u.satellite = id;
  milestone(A, co, 'first_satellite', p.name);
  if (own) milestone(A, co, 'first_own_satellite', p.name);
  return sat;
}

/** Every satellite of a company: its own, and those it built and supports for customers. */
export function fleetOf(A, co) {
  const all = Object.values(A.state.satellites);
  const mine = all.filter((x) => x.manufacturer === co.id);
  const orders = A.unitsOf(co).filter((u) => u.purpose === 'own');
  return {
    own: mine.filter((x) => x.own),
    supported: mine.filter((x) => !x.own),
    orders,
    live: mine.filter((x) => x.own && live(x)),
    all: mine,
  };
}

// ---------------------------------------------------------------- orders
/** Build satellites for yourself. They go through the same floor, the same stores and the same launches as a customer's. */
export function orderSatellite(A, co, pid, qty = 1, config = null) {
  const C = A.cfg;
  const p = C.products[pid];
  if (!p || p.line !== 'satellite') return { ok: false, text: 'That is not a satellite.' };
  const role = C.services.roles[roleOf(p)];
  if (!role) return { ok: false, text: 'Nobody buys what that does.' };
  qty = Math.max(1, Math.min(6, Math.floor(qty) || 1));
  if (role.needs === 'cleared' && !A.cleared(co)) return { ok: false, text: 'Leasing to a government needs a secure hall and clearance.' };
  const miss = missingTech(C, co, p);
  if (miss.length) return { ok: false, text: `It needs research you don't have yet: ${miss.map((id) => C.research[id].name).join(', ')}.` };
  if (!A.canBuild(co, p)) return { ok: false, text: 'You can\'t build and launch that yet (a clean room, a pad and a rocket of your own).' };
  const cfg = cleanConfig(config);
  const err = configError(C, p, cfg, pid);
  if (err) return { ok: false, text: err };
  const open = A.unitsOf(co).filter((u) => u.purpose === 'own').length;
  if (open + qty > C.services.maxOpenOrders) return { ok: false, text: `At most ${C.services.maxOpenOrders} of your own satellites can be on the floor at once.` };
  for (let n = 0; n < qty; n++) {
    const u = newUnit(C, { id: A.nextId('U'), company: co.id, contract: null, productId: pid, n: n + 1, purpose: 'own', rng: A.rng, at: A.now });
    if (Object.keys(cfg).length) u.config = cfg;
    A.state.units[u.id] = u;
  }
  A.syncRng();
  A.report(co, 'orbit', `🛰 ${co.name} orders ${qty} × ${p.name} for its own network.`, co.kind === 'player' ? 'info' : null);
  return { ok: true, text: `${qty} × ${p.name} on the floor. They are built, launched and commissioned like anyone's; then they earn.` };
}

/** Stop an order before the satellite has flown: what has been used is lost, the rest goes back to stores. */
export function cancelOrder(A, co, unitId) {
  const u = A.state.units[unitId];
  if (!u || u.company !== co.id || u.purpose !== 'own' || u.finished) return { ok: false, text: 'No such order.' };
  if (u.launch || A.stageOf(u)?.id === 'launch' || u.rocket && A.state.units[u.rocket]?.seq) return { ok: false, text: 'It is already on its way up.' };
  if (u.rocket) { const r = A.state.units[u.rocket]; if (r?.payload) r.payload = r.payload.filter((id) => id !== u.id); }
  A.retire(u, 'cancelled');
  return { ok: true, text: 'The order is cancelled.' };
}

/** Take a satellite out of service (it stops costing, and stops earning). */
export function decommission(A, co, satId) {
  const sat = A.state.satellites[satId];
  if (!sat || sat.manufacturer !== co.id || !sat.own || !live(sat)) return { ok: false, text: 'No such satellite of yours in service.' };
  sat.status = 'decommissioned';
  sat.decommissioned = A.now;
  co.books.fleet = Math.max(0, (co.books.fleet || 0) - (sat.book || 0));
  sat.book = 0;
  A.report(co, 'orbit', `🛰 ${sat.name} is taken out of service and de-orbited.`, co.kind === 'player' ? 'info' : null);
  return { ok: true, text: `${sat.name} is de-orbited.` };
}

export function setPolicy(A, co, key, on) {
  if (!['insured', 'autoReplace'].includes(key)) return { ok: false, text: 'No such policy.' };
  co[key] = Boolean(on);
  return { ok: true, text: key === 'insured' ? (on ? 'The fleet is insured.' : 'The fleet is no longer insured.') : (on ? 'Satellites near the end of their lives will be replaced automatically.' : 'No automatic replacements.') };
}

// ---------------------------------------------------------------- the report the Orbit page reads
/** For each role: the company's network, the market it sells into, and what it would take today. */
export function networkReport(A, co) {
  const S = A.cfg.services;
  const now = A.now;
  const day = A.day;
  const f = fleetOf(A, co);
  const platform = networkOf(S, f.live, 'platform', now, day).n > 0;
  const out = [];
  for (const [role, R] of Object.entries(S.roles)) {
    const net = networkOf(S, f.live, role, now, day, { bonus: serviceBonus(A, co, role) });
    const market = marketAt(S, role, day);
    const mult = A.state.orbit?.mult?.[role] && A.state.orbit.mult[role].untilDay >= day ? A.state.orbit.mult[role].m : 1;
    const barred = R.needs === 'cleared' && !A.cleared(co);
    const sold = barred ? { sold: 0, revenue: 0, utilisation: 0, price: R.price, share: 0 } : sell(S, role, net, market, { mult, priceBonus: priceBonus(A, co, role) });
    out.push({ role, def: R, net, market, mult, sold, barred, platform });
  }
  return out;
}

/** The ordering sheet's forecast for a product: what one more would add today, against what it costs to build and launch. */
export function orderForecast(A, co, pid) {
  const C = A.cfg;
  const p = C.products[pid];
  const f = fleetOf(A, co);
  const build = unitCost(C, p).total;
  const launch = A.launchShare(p);
  const role = roleOf(p);
  const mult = A.state.orbit?.mult?.[role] && A.state.orbit.mult[role].untilDay >= A.day ? A.state.orbit.mult[role].m : 1;
  return { build, launch, ...forecast(C.services, p, f.live, A.now, A.day, { cost: build + launch, bonus: serviceBonus(A, co, role), mult: { [role]: mult }, priceBonus: { [role]: priceBonus(A, co, role) } }) };
}

// ---------------------------------------------------------------- the day
/** Every morning: the sky, then each company's fleet. */
export function satelliteDay(A) {
  const s = A.state;
  const S = A.cfg.services;
  const day = A.day;
  const now = A.now;
  s.orbit ||= { mult: {}, cool: {} };
  for (const [r, m] of Object.entries(s.orbit.mult)) if (m.untilDay < day) delete s.orbit.mult[r];
  skyEvents(A, S);
  for (const co of A.companies()) fleetDay(A, co, S, now, day);
}

function fleetDay(A, co, S, now, day) {
  const f = fleetOf(A, co);
  const platform = networkOf(S, f.live, 'platform', now, day).n > 0;
  // ageing, losses, the end of a life — for everything this company built that is still up there
  for (const sat of f.all) {
    if (!live(sat)) continue;
    const p = hazardOf(S, sat, { platform: platform && sat.own, research: hazardResearch(A, co), now, quality: A.qualityOf(co) });
    if (lostToday(sat, day, p)) { lose(A, co, sat, 'lost to a fault'); continue; }
    if (now >= sat.endsAt) {
      sat.status = 'decommissioned';
      sat.decommissioned = now;
      if (sat.own) { co.books.fleet = Math.max(0, (co.books.fleet || 0) - (sat.book || 0)); sat.book = 0; }
      A.report(co, 'orbit', `🛰 ${sat.name} has reached the end of its life and is de-orbited.`, co.kind === 'player' ? 'info' : null);
    }
  }
  const nowLive = fleetOf(A, co);
  // what the networks sell
  const mult = (r) => (A.state.orbit.mult[r] && A.state.orbit.mult[r].untilDay >= day ? A.state.orbit.mult[r].m : 1);
  let revenue = 0;
  co.orbit = { day, roles: {} };
  for (const [role, R] of Object.entries(S.roles)) {
    const net = networkOf(S, nowLive.live, role, now, day, { bonus: serviceBonus(A, co, role) });
    if (!net.n) continue;
    if (R.needs === 'cleared' && !A.cleared(co)) { co.orbit.roles[role] = { revenue: 0, sold: 0, capacity: net.capacity, barred: true }; continue; }
    const r = sell(S, role, net, marketAt(S, role, day), { mult: mult(role), priceBonus: priceBonus(A, co, role) });
    co.orbit.roles[role] = { revenue: r.revenue, sold: r.sold, capacity: net.capacity, coverage: net.coverage, n: net.n, utilisation: r.utilisation };
    revenue += r.revenue;
    for (const sat of net.sats) sat.revenueTotal = (sat.revenueTotal || 0) + Math.round(r.revenue / net.n);
    if (role === 'science') discovery(A, co, S, net);
  }
  if (revenue) A.receive(co, revenue, 'rev_services');
  // support fees: what a customer pays to have its satellite kept working
  let fees = 0;
  for (const sat of nowLive.supported) {
    if (!live(sat)) continue;
    const fee = Math.round(sat.price * S.support.rate * (sat.capability ?? 1));
    sat.supportTotal = (sat.supportTotal || 0) + fee;
    fees += fee;
  }
  if (fees) A.receive(co, fees, 'rev_services');
  co.orbit.fees = fees;
  // what it costs: the controllers, the links, the electricity — and the book value wearing away
  const ops = Math.round(([...nowLive.live, ...nowLive.supported.filter(live)].reduce((a, x) => a + (x.opex || 0), 0) + (nowLive.live.length ? S.centre.cost : 0)) * opsMult(A, co));
  if (ops) A.pay(co, ops, 'sat_ops');
  let depr = 0;
  for (const sat of nowLive.live) {
    const d = Math.min(sat.book || 0, Math.round((sat.value || 0) / Math.max(1, sat.lifeDays)));
    sat.book = Math.max(0, (sat.book || 0) - d);
    depr += d;
  }
  if (depr) {
    A.postExpense(co, 'depreciation', depr);
    co.books.fleet = Math.max(0, (co.books.fleet || 0) - depr);
  }
  if (co.insured && nowLive.live.length) {
    const premium = Math.round(nowLive.live.reduce((a, x) => a + (x.book || 0), 0) * S.insurance.premium);
    if (premium) A.pay(co, premium, 'insurance');
  }
  co.orbit.ops = ops;
  co.orbit.revenue = revenue;
  // replacements: a customer's satellite nearing its end is a new tender; your own may be replaced for you
  for (const sat of nowLive.supported) if (live(sat) && daysLeft(sat, now) <= S.support.replaceDays && !sat.replaceTender) replacementTender(A, co, S, sat);
  if (co.autoReplace) for (const sat of nowLive.live) if (daysLeft(sat, now) <= S.autoReplaceDays && !sat.replaced) {
    sat.replaced = true;
    const r = orderSatellite(A, co, sat.product, 1, sat.config);
    if (r.ok) A.report(co, 'orbit', `🛰 ${sat.name} is nearing the end of its life: a replacement is on the floor.`, co.kind === 'player' ? 'info' : null);
  }
}

/** A satellite is gone: its customer is told, the warranty bites, an insured fleet is paid. */
export function lose(A, co, sat, why) {
  sat.status = 'failed';
  sat.failedAt = A.now;
  sat.failure = why;
  const S = A.cfg.services;
  const age = (A.now - sat.commissioned) / Math.max(1, sat.lifeDays * DAY);
  if (sat.own) {
    const book = sat.book || 0;
    co.books.fleet = Math.max(0, (co.books.fleet || 0) - book);
    sat.book = 0;
    let text = `💥 ${sat.name} is ${why}: ${fmtMoney(book)} of book value written off.`;
    if (co.insured && book) { const paid = Math.round(book * S.insurance.payout); A.receive(co, paid, 'rev_claims'); text += ` The insurers pay ${fmtMoney(paid)}.`; }
    else if (book) A.postExpense(co, 'depreciation', book);
    A.report(co, 'orbit', text, co.kind === 'player' ? 'bad' : null);
  } else {
    const who = A.cfg.customers[sat.owner]?.name || 'its owner';
    if (age < S.support.warrantyShare) { A.repChange(co, S.support.warrantyRep, `${sat.name} for ${who} failed under warranty`); }
    A.report(co, 'orbit', `💥 ${sat.name}, which you built for ${who}, is ${why}${age < S.support.warrantyShare ? ' — inside its warranty' : ''}.`, co.kind === 'player' ? 'bad' : null);
  }
  if (co.kind === 'player') A.news(`💥 ${sat.name} is lost.`, 'warn');
}

/** The customer whose satellite is nearly spent asks for another. */
function replacementTender(A, co, S, sat) {
  sat.replaceTender = true;
  const cu = A.cfg.customers[sat.owner];
  if (!cu || A.embargoed(sat.owner) || !A.cfg.products[sat.product]) return;
  const t = postEventTender(A, sat.owner, sat.product, 1, 'replacement', { ceilingBoost: 1.05, deposit: 0.25, daysBoost: 1.2, closeDays: 3 });
  if (!t) return;
  const text = `🛰 ${cu.name}'s ${sat.name} is nearing the end of its life: they have put out a tender for its replacement (${fmtMoney(t.ceiling)}).`;
  A.report(co, 'event', text, co.kind === 'player' ? 'info' : null);
}

/** A science network now and then finds something: a payment, a paper, a line in the news. */
function discovery(A, co, S, net) {
  const D = S.events.discovery;
  const cool = (A.day - (co.cool?.discovery ?? -1e9)) >= D.cooldown;
  if (!cool || hashUnit(`disc|${co.id}|${A.day}`) >= D.perPoint * net.units) return;
  (co.cool ||= {}).discovery = A.day;
  const reward = Math.round(D.reward * (1 + net.units / 4));
  A.receive(co, reward, 'rev_services');
  A.repChange(co, D.rep, 'A discovery from orbit');
  const text = `🔭 Your science satellites have found something: a paper, a prize and ${fmtMoney(reward)}.`;
  A.report(co, 'event', text, co.kind === 'player' ? 'good' : null);
  if (co.kind === 'player') A.news('🔭 A discovery from orbit: your science network publishes.', 'good');
  milestone(A, co, 'first_discovery', '');
}

// ---------------------------------------------------------------- the sky's events (everyone's satellites feel them)
function skyEvents(A, S) {
  const E = S.events;
  const s = A.state;
  const day = A.day;
  const cool = (k, d) => day - (s.orbit.cool[k] ?? -1e9) >= d;
  const all = Object.values(s.satellites).filter(live);
  if (all.length && cool('storm', E.storm.cooldown) && hashUnit(`storm|${day}`) < E.storm.chance) {
    s.orbit.cool.storm = day;
    const hit = all.filter((x) => !x.hardened);
    const killed = [];
    for (const sat of hit) {
      sat.hit = { untilDay: day + E.storm.days, amount: E.storm.hit };
      if (hashUnit(`stormkill|${sat.id}|${day}`) < E.storm.kill) killed.push(sat);
    }
    for (const sat of killed) lose(A, A.company(sat.manufacturer), sat, 'burnt out by a solar storm');
    const mine = hit.filter((x) => A.company(x.manufacturer)?.kind === 'player').length;
    A.news(`☀ A solar storm: ${hit.length} unshielded satellite${hit.length === 1 ? '' : 's'} degraded for ${E.storm.days} days, ${all.length - hit.length} hardened ones untouched.`, 'warn');
    for (const co of A.companies()) if (co.kind === 'player' && hit.some((x) => x.manufacturer === co.id)) A.report(co, 'orbit', `☀ A solar storm hit ${mine} of your satellites: −${Math.round(E.storm.hit * 100)}% capability for ${E.storm.days} days${killed.length ? `; ${killed.length} lost` : ''}. Hardened buses shrug it off.`, 'warn');
  }
  if (cool('surge', E.surge.cooldown) && hashUnit(`surge|${day}`) < E.surge.chance) {
    s.orbit.cool.surge = day;
    for (const r of E.surge.roles) s.orbit.mult[r] = { m: E.surge.mult, untilDay: day + E.surge.days };
    A.news(`🌀 Hurricane season: ${E.surge.roles.map((r) => S.roles[r].short.toLowerCase()).join(' and ')} prices up ${Math.round((E.surge.mult - 1) * 100)}% for ${E.surge.days} days.`, 'info');
  }
  if (cool('priceWar', E.priceWar.cooldown) && hashUnit(`pwar|${day}`) < E.priceWar.chance) {
    s.orbit.cool.priceWar = day;
    const r = E.priceWar.roles[Math.floor(hashUnit(`pwarr|${day}`) * E.priceWar.roles.length)];
    s.orbit.mult[r] = { m: E.priceWar.mult, untilDay: day + E.priceWar.days };
    A.news(`📉 A rival operator slashes ${S.roles[r].short.toLowerCase()} prices: −${Math.round((1 - E.priceWar.mult) * 100)}% for ${E.priceWar.days} days.`, 'info');
  }
  // debris: the player's own satellites only, and a decision
  for (const co of A.companies()) {
    if (co.kind !== 'player') continue;
    if ((co.events || []).some((e) => e.kind === 'debris' && !e.resolved)) continue;
    if (!((co.cool?.debris ?? -1e9) + E.debris.cooldown <= day)) continue;
    const mine = fleetOf(A, co).live;
    if (!mine.length || hashUnit(`debris|${co.id}|${day}`) >= E.debris.chance) continue;
    const sat = mine[Math.floor(hashUnit(`debrissat|${day}`) * mine.length)];
    (co.cool ||= {}).debris = day;
    (co.events ||= []).push({
      id: A.nextId('EV'), kind: 'debris', sat: sat.id, at: A.now, expires: day + E.debris.decideDays, resolved: null,
      title: `A piece of debris is on course for ${sat.name}`,
      text: `The tracking network puts a fragment within a kilometre of ${sat.name} in a few days. A burn will keep it clear but costs fuel (${E.debris.lifeDays} days of its life); leave it alone and there is a ${Math.round(E.debris.risk * 100)}% chance of losing it.`,
      choices: [
        { id: 'manoeuvre', label: `Manoeuvre · ${E.debris.lifeDays} days of its life`, text: 'Burn clear. The satellite is safe and shorter-lived.', cost: 0 },
        { id: 'risk', label: `Leave it · ${Math.round(E.debris.risk * 100)}% risk`, text: 'Do nothing and hope.', cost: 0 },
      ],
    });
    A.report(co, 'event', `🛰 Debris is on course for ${sat.name}: decide on the Standing page within ${E.debris.decideDays} days.`, 'warn');
  }
}

/** The player's decision about a piece of debris; and what happens if nobody decides. */
export function resolveDebris(A, co, e, choiceId) {
  const E = A.cfg.services.events.debris;
  const sat = A.state.satellites[e.sat];
  e.resolved = { at: A.now, choice: choiceId };
  if (!sat || !live(sat)) return { ok: true, text: 'It no longer matters.' };
  if (choiceId === 'manoeuvre') {
    sat.endsAt -= E.lifeDays * DAY;
    A.report(co, 'event', `🛰 ${sat.name} burns clear of the debris (${E.lifeDays} days of life spent).`, 'good');
    return { ok: true, text: 'The burn is done: it is safe.' };
  }
  if (hashUnit(`debrisrisk|${e.id}`) < E.risk) { lose(A, co, sat, 'struck by debris'); return { ok: true, text: 'It was hit.' }; }
  A.report(co, 'event', `🛰 The debris missed ${sat.name} by a few hundred metres.`, 'good');
  return { ok: true, text: 'It missed.' };
}

// ---------------------------------------------------------------- the ground station
/** The satellite the dishes follow: whichever of all the live ones stands highest above the station's horizon (at least 8°). */
export function groundPass(A) {
  const S = A.cfg.services;
  const st = A.A.station;
  let best = null;
  for (const sat of Object.values(A.state.satellites)) {
    if (!live(sat)) continue;
    const l = look(orbitOf(S, sat), A.now, st);
    if (l.el > 8 && (!best || l.el > best.el)) best = { id: sat.id, name: sat.name, role: sat.role, own: Boolean(sat.own), el: l.el, az: l.az };
  }
  return best;
}
