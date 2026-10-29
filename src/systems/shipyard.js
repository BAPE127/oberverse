// The shipyard and the custom shipbuilder (v0.24.0).
//
// 1. Mason's Os builds a SHIPYARD at one of your ports (commercial or
//    bigger): you pay once (less the crew's goodwill discount), they work
//    for a few days (fewer with goodwill), it's ready.
// 2. In the shipyard you DESIGN a ship: a hull, parts (components) in its
//    slots, paint and a name. Every rule — slots, weight, power, weapon
//    mounts, required parts for the class, technology, the port it needs —
//    is checked here, in the simulation, not just on screen.
// 3. Parts are bought into your parts store; a build RESERVES and consumes
//    them (once). You pay the hull and the labour when you commission; the
//    yard works for a few days; the ship launches into your fleet. Cancel a
//    build and its parts go back to the store, with half the hull and labour.
//
// A custom ship's vessel record points at a saved DESIGN (its inputs only);
// its numbers and its look are always computed from content by spec(), so a
// loaded ship is identical to the one you launched.
//
// State (in world.logistics): stock {componentId: n}, tech {id: day},
// designs {d1: design}, nextDesign, builds [], nextBuild; each owned port's
// `shipyard` field holds the yard's own construction record.
import { clamp } from '../core/util.js';

const FAMILIES = ['propulsion', 'power', 'cargo', 'navigation', 'defense', 'weapons', 'sensors', 'support'];
/** Which part technologies a hull of each technology takes. */
const FITS = { sail: ['sail', 'any'], modern: ['modern', 'any'], advanced: ['modern', 'advanced', 'any'] };

export class Shipyard {
  constructor(logistics) {
    this.L = logistics;
    this.specCache = new Map();
  }

  get game() {
    return this.L.game;
  }

  get cfg() {
    return this.L.cfg;
  }

  get rules() {
    return this.cfg.shipyard;
  }

  get state() {
    const s = this.L.state;
    if (!s.builds) Object.assign(s, { stock: {}, tech: {}, designs: {}, nextDesign: 1, builds: [], nextBuild: 1 });
    return s;
  }

  // ------------------------------------------------------------- the yard (Mason's Os)
  yard(portId) {
    return this.L.state.ports[portId]?.shipyard || null;
  }

  /** Ports with a working shipyard. */
  yards() {
    return this.L.ownedPorts().filter((id) => this.yard(id)?.status === 'ready');
  }

  yardQuote(portId) {
    const g = this.game;
    const p = this.L.port(portId);
    const reasons = [];
    if (!this.L.ownsPort(portId)) reasons.push('you don\'t own that port');
    if (p && !this.rules.eligible.includes(p.type)) reasons.push(`a ${this.cfg.portTypes[p.type].name.toLowerCase()} is too small for a shipyard`);
    if (this.yard(portId)) reasons.push(this.yard(portId).status === 'ready' ? 'it already has a shipyard' : 'Mason\'s Os is already building one there');
    const base = this.rules.cost[p?.type] || 0;
    const discount = g.construction.discount();
    const cost = Math.round(base * (1 - discount));
    const days = Math.max(2, this.rules.days - g.construction.speedup());
    return { ok: reasons.length === 0, reasons, cost, discount, days };
  }

  /** Commission Mason's Os to build a shipyard at a port. Paid once. */
  commissionYard(portId) {
    const g = this.game;
    const q = this.yardQuote(portId);
    if (!q.ok) return { ok: false, text: `Can't: ${q.reasons[0]}.` };
    if (!g.corp.canAfford('shipping', q.cost)) return { ok: false, text: `Mason's Os quote ${q.cost} obols for a shipyard. You're a little short, pal.` };
    this.L.spend(q.cost, 'shipyard');
    this.L.state.ports[portId].shipyard = { status: 'building', commissioned: g.clock.total, days: q.days, start: g.clock.total, end: g.clock.total + q.days * 1440, paid: q.cost, lastNote: g.clock.day };
    this.flags(portId);
    this.L.report('shipyard', `🏗 Mason's Os have signed on to build a shipyard at ${this.L.port(portId).name}: ${q.cost} obols, ${q.days} days. "We'll have it ship-shape — and that's the only boat pun we know. That's a lie."`, 'good');
    return { ok: true, text: `Mason's Os are on it: ${q.days} days.` };
  }

  /** Flags that show the slipway at the Yards (Mill Road Docks only). */
  flags(portId) {
    const y = this.yard(portId);
    if (portId !== this.L.L.homePort) return;
    this.game.setFlag('shipyard_home_building', y?.status === 'building');
    this.game.setFlag('shipyard_home_ready', y?.status === 'ready');
  }

  // ------------------------------------------------------------- parts and licences
  buyComponent(id, n = 1) {
    const g = this.game;
    const c = this.cfg.components[id];
    if (!c) return { ok: false, text: 'No such part.' };
    if (!this.L.owned) return { ok: false, text: 'You need a shipping company first.' };
    if (c.tech === 'advanced' && !this.state.tech.advanced) return { ok: false, text: `Advanced parts need the ${this.cfg.tech.advanced.name}.` };
    const have = this.state.stock[id] || 0;
    if (have + n > this.rules.maxStock) return { ok: false, text: `The store holds at most ${this.rules.maxStock} of each part.` };
    const cost = c.price * n;
    if (!g.corp.canAfford('shipping', cost)) return { ok: false, text: `${n}× ${c.name} costs ${cost} obols.` };
    this.L.spend(cost, 'parts');
    this.state.stock[id] = have + n;
    return { ok: true, text: `Bought ${n}× ${c.name}.` };
  }

  buyTech(id) {
    const g = this.game;
    const t = this.cfg.tech[id];
    if (!t) return { ok: false, text: 'No such licence.' };
    if (this.state.tech[id]) return { ok: false, text: 'You already hold it.' };
    if (!g.corp.canAfford('shipping', t.price)) return { ok: false, text: `The ${t.name} costs ${t.price} obols.` };
    this.L.spend(t.price, 'licence');
    this.state.tech[id] = g.clock.day;
    this.L.report('shipyard', `📜 You hold the ${t.name}.`, 'good');
    return { ok: true, text: `You hold the ${t.name}.` };
  }

  // ------------------------------------------------------------- designs
  /** Can this part go on this hull at all? (null = yes; else why not) */
  fits(hullId, compId) {
    const H = this.cfg.hulls[hullId];
    const c = this.cfg.components[compId];
    if (!H || !c) return 'unknown';
    if (!c.kinds.includes(H.kind)) return `${H.kind === 'cargo' ? 'cargo ships' : 'warships'} can't take it`;
    if (!FITS[H.tech].includes(c.tech)) return `a ${H.tech} hull can't take ${c.tech} technology`;
    if (c.minSize && H.size < c.minSize) return `needs a size-${c.minSize} hull`;
    return null;
  }

  /**
   * Where each part sits (v0.26.0): design.layout[i] is the slot of
   * design.components[i] — the side-profile builder lets you leave gaps. It
   * only changes the look; a missing or broken layout means "in order".
   */
  layoutOf(design) {
    const H = this.cfg.hulls[design.hull];
    const n = (design.components || []).length;
    const l = design.layout;
    const ok = Array.isArray(l) && l.length === n && new Set(l).size === n && l.every((i) => Number.isInteger(i) && i >= 0 && i < (H?.slots || 0));
    return ok ? [...l] : Array.from({ length: n }, (_, i) => i);
  }

  /** The numbers and look of a design (pure; cached per saved design). */
  compute(design) {
    const H = this.cfg.hulls[design.hull];
    const parts = (design.components || []).map((id) => this.cfg.components[id]).filter(Boolean);
    const b = H.base;
    const sum = (k) => parts.reduce((a, c) => a + (c.mods[k] || 0), 0);
    const weight = parts.reduce((a, c) => a + c.weight, 0);
    const load = clamp(weight / H.maxWeight, 0, 2);
    const cap = (v) => clamp(Math.round(v), 0, 100);
    const price = H.price + parts.reduce((a, c) => a + c.price, 0);
    const opex = Math.max(10, b.opex + sum('opex'));
    return {
      name: design.name || H.name, kind: H.kind, cls: H.cls, custom: true, hull: design.hull,
      price,
      capacity: Math.max(0, (b.capacity || 0) + sum('capacity')),
      speed: Math.max(4, Math.round((sum('speed')) * (1 - 0.35 * load))),
      range: b.range + sum('range'),
      reliability: clamp(b.reliability + sum('reliability'), 0.5, 0.995),
      opex, upkeep: Math.round(b.upkeep + weight * 0.5),
      size: H.size,
      needsPortType: H.tech === 'advanced' ? (H.kind === 'warship' ? ['advanced', 'naval'] : ['advanced']) : null,
      combat: { attack: cap((b.attack || 0) + sum('attack')), defense: cap((b.defense || 0) + sum('defense')), detection: cap((b.detection || 0) + sum('detection')), stealth: cap((b.stealth || 0) + sum('stealth')), mounts: parts.reduce((a, c) => a + c.mounts, 0) },
      tags: [...new Set([...parts.flatMap((c) => c.tags), ...(H.kind === 'warship' && parts.some((c) => c.family === 'weapons') ? ['escort', 'patrol'] : []), ...(H.kind === 'warship' && parts.some((c) => c.family === 'sensors') ? ['recon'] : [])])],
      bonuses: [...new Set(parts.flatMap((c) => c.bonuses))],
      look: { ...H.look, color: design.appearance?.color || '#4a4a52', trim: design.appearance?.trim || '#e8e2d4', parts: parts.filter((c) => c.part).map((c) => c.part), slots: H.slots, fit: this.fitOf(design) },
      blurb: `A custom ${H.name.toLowerCase().replace(' hull', '')} from your own yard.`,
      weight, maxWeight: H.maxWeight,
    };
  }

  /** The design's parts by slot (null where empty), for the side-profile drawings. */
  fitOf(design) {
    const H = this.cfg.hulls[design.hull];
    const fit = Array(Math.max(H?.slots || 0, (design.components || []).length)).fill(null);
    const lay = this.layoutOf(design);
    (design.components || []).forEach((id, i) => { if (this.cfg.components[id]) fit[lay[i]] = id; });
    return fit;
  }

  /** A saved design's spec, for Logistics.model(). */
  spec(designId) {
    const d = this.state.designs?.[designId];
    if (!d) return null;
    if (!this.specCache.has(designId)) this.specCache.set(designId, this.compute(d));
    return this.specCache.get(designId);
  }

  /** Everything about a design: is it seaworthy, what will it cost, how long. Nothing changes. */
  validate(design, portId = design.port) {
    const reasons = [];
    const H = this.cfg.hulls[design.hull];
    if (!H) return { ok: false, reasons: ['choose a hull'] };
    const comps = design.components || [];
    const parts = comps.map((id) => this.cfg.components[id]);
    if (parts.some((c) => !c)) reasons.push('an unknown part');
    if (comps.length > H.slots) reasons.push(`${comps.length} parts but only ${H.slots} slots`);
    const valid = parts.filter(Boolean);
    for (const id of new Set(comps)) {
      const c = this.cfg.components[id];
      if (!c) continue;
      const why = this.fits(design.hull, id);
      if (why) reasons.push(`${c.name}: ${why}`);
      const n = comps.filter((x) => x === id).length;
      if (n > c.max) reasons.push(`${c.name}: at most ${c.max}`);
      if (c.needs && !comps.includes(c.needs)) reasons.push(`${c.name} needs ${this.cfg.components[c.needs].name}`);
    }
    // the class's requirements
    for (const [family, min, tech] of H.requires) {
      const have = valid.filter((c) => c.family === family && (!tech || c.tech === tech)).length;
      if (have < min) reasons.push(`needs ${min > 1 ? `${min}× ` : ''}${tech ? `${tech} ` : ''}${family}`);
    }
    const weight = valid.reduce((a, c) => a + c.weight, 0);
    if (weight > H.maxWeight) reasons.push(`${weight} t of parts on a hull rated for ${H.maxWeight}`);
    const powerMade = H.power + valid.filter((c) => c.power > 0).reduce((a, c) => a + c.power, 0);
    const powerUsed = -valid.filter((c) => c.power < 0).reduce((a, c) => a + c.power, 0);
    if (powerUsed > powerMade) reasons.push(`needs ${powerUsed} power; makes ${powerMade}`);
    const mounts = valid.reduce((a, c) => a + c.mounts, 0);
    if (mounts > H.mounts) reasons.push(`${mounts} weapon mounts on a hull with ${H.mounts}`);
    // technology and the yard
    const advanced = H.tech === 'advanced' || valid.some((c) => c.tech === 'advanced');
    if (advanced && !this.state.tech.advanced) reasons.push(`needs the ${this.cfg.tech.advanced.name}`);
    if (portId) {
      if (this.yard(portId)?.status !== 'ready') reasons.push(`${this.L.port(portId)?.name || 'that port'} has no working shipyard`);
      if (this.slipBusy(portId)) reasons.push('its slip is busy with another build');
      const spec = this.compute(design);
      const need = [].concat(spec.needsPortType || []);
      if (need.length && !need.includes(this.L.port(portId).type)) reasons.push(`a futuristic hull is built at ${need.map((t) => this.cfg.portTypes[t].name.toLowerCase()).join(' or ')} shipyards`);
      if (spec.size > this.L.portType(portId).maxSize) reasons.push(`too big to launch at ${this.L.port(portId).name}`);
    } else reasons.push('choose a shipyard');
    // the bill
    const need = {};
    for (const id of comps) need[id] = (need[id] || 0) + 1;
    const missing = Object.entries(need).map(([id, n]) => ({ id, n: Math.max(0, n - (this.state.stock[id] || 0)) })).filter((x) => x.n > 0);
    const missingCost = missing.reduce((a, m) => a + (this.cfg.components[m.id]?.price || 0) * m.n, 0);
    const partsValue = valid.reduce((a, c) => a + c.price, 0);
    const labour = Math.round((H.price + partsValue) * this.rules.labourShare);
    const days = Math.round((this.rules.daysBase + H.size * this.rules.daysPerSize + comps.length * this.rules.daysPerComponent) * (advanced ? this.rules.futuristicDays : 1) * 10) / 10;
    const stats = this.compute(design);
    return { ok: reasons.length === 0, reasons, stats, weight, powerMade, powerUsed, mounts, missing, missingCost, cost: { hull: H.price, labour, parts: partsValue, now: H.price + labour }, days };
  }

  slipBusy(portId) {
    return this.state.builds.some((b) => b.port === portId && (b.status === 'building' || b.status === 'waiting'));
  }

  /** Buy whatever parts a design still needs. */
  buyMissing(design) {
    const v = this.validate(design, null);
    for (const m of v.missing) {
      const r = this.buyComponent(m.id, m.n);
      if (!r.ok) return r;
    }
    return { ok: true, text: v.missing.length ? 'Bought the missing parts.' : 'You have every part.' };
  }

  /** Lay down the keel: parts leave the store, the hull and labour are paid. */
  commission(design) {
    const g = this.game;
    const v = this.validate(design, design.port);
    if (!v.ok) return { ok: false, text: `Can't: ${v.reasons[0]}.` };
    if (v.missing.length) return { ok: false, text: `Missing parts: ${v.missing.map((m) => `${m.n}× ${this.cfg.components[m.id].name}`).join(', ')}.` };
    if (!g.corp.canAfford('shipping', v.cost.now)) return { ok: false, text: `The hull and labour come to ${v.cost.now} obols.` };
    this.L.spend(v.cost.now, 'shipbuilding');
    for (const id of design.components) this.state.stock[id] -= 1;
    const s = this.state;
    const b = {
      id: `b${s.nextBuild++}`, port: design.port, status: 'building', start: g.clock.total, end: g.clock.total + Math.round(v.days * 1440),
      paid: v.cost.now, design: { kind: design.kind, hull: design.hull, components: [...design.components], layout: this.layoutOf(design), name: String(design.name || '').trim().slice(0, 28) || `${this.cfg.hulls[design.hull].name.replace(/ hull$/i, '')} No. ${s.nextBuild - 1}`, appearance: { ...design.appearance } },
    };
    s.builds.push(b);
    this.L.report('shipyard', `🔨 Keel laid at ${this.L.port(b.port).name}: the ${b.design.name} (${this.cfg.hulls[b.design.hull].name.toLowerCase()}), launching ${this.L.when(b.end)}.`, 'info');
    return { ok: true, build: b, text: `The ${b.design.name} is on the slip — ${v.days} days.` };
  }

  /** Stop a build: the parts go back to the store; half the hull and labour come back. */
  cancel(buildId) {
    const b = this.state.builds.find((x) => x.id === buildId);
    if (!b || !['building', 'waiting'].includes(b.status)) return { ok: false, text: 'Nothing to cancel.' };
    for (const id of b.design.components) this.state.stock[id] = (this.state.stock[id] || 0) + 1;
    const refund = Math.round(b.paid * this.rules.cancelRefund);
    this.L.earn(refund, 'refund');
    b.status = 'cancelled';
    this.L.report('shipyard', `✖ Build cancelled: the ${b.design.name}. Parts back in the store; ${refund} obols refunded.`, 'warn');
    return { ok: true, text: `Cancelled. ${refund} obols back; the parts are in the store.` };
  }

  /** Each minute: yards finishing, ships launching. Daily notes come from daily(). */
  tick() {
    const g = this.game;
    const now = g.clock.total;
    for (const id of this.L.ownedPorts()) {
      const y = this.yard(id);
      if (y?.status === 'building' && now >= y.end) {
        y.status = 'ready';
        y.ready = now;
        this.flags(id);
        this.L.report('shipyard', `⚓ Mason's Os have finished the shipyard at ${this.L.port(id).name}! "Ready to launch. Get it? LAUNCH. Okay, Dee's already groaning."`, 'good');
        g.bus.emit('shipyard:ready', { port: id });
      }
    }
    for (const b of this.state.builds) {
      if (!['building', 'waiting'].includes(b.status) || now < b.end) continue;
      this.launch(b);
    }
  }

  launch(b) {
    const s = this.state;
    const spec = this.compute(b.design);
    const probe = { model: null, status: 'docked', _spec: spec };
    if (this.L.berthCheck(probe, b.port)) {
      if (b.status !== 'waiting') this.L.report('shipyard', `⏸ The ${b.design.name} is finished but ${this.L.port(b.port).name} has no free berth. She'll launch when one frees up.`, 'warn');
      b.status = 'waiting';
      return;
    }
    const did = `d${s.nextDesign++}`;
    s.designs[did] = b.design;
    this.specCache.delete(did);
    const v = this.L.addVessel(did, b.port, b.design.name);
    b.status = 'done';
    b.vessel = v.id;
    b.designId = did;
    this.L.report('shipyard', `🍾 Launched at ${this.L.port(b.port).name}: the ${v.name}! Champagne on the bow; Mason's crew cheer from the quay.`, 'good');
    this.game.bus.emit('shipyard:launched', { vessel: v.id });
  }

  /** 06:00: Mason's crew report on the yard. */
  daily() {
    const g = this.game;
    for (const id of this.L.ownedPorts()) {
      const y = this.yard(id);
      if (y?.status !== 'building' || y.lastNote === g.clock.day) continue;
      y.lastNote = g.clock.day;
      const done = Math.min(99, Math.round(((g.clock.total - y.start) / (y.end - y.start)) * 100));
      const notes = ['slipway rails down', 'the gantry crane is up', 'the dry dock is pumping', 'paint shop roofed', 'Dee has inspected everything twice'];
      this.L.report('shipyard', `🏗 Shipyard at ${this.L.port(id).name}: ${done}% — ${notes[Math.min(notes.length - 1, Math.floor(done / 20))]}.`, 'info');
    }
  }

  /** Builds shown at a port (for the berth drawings). */
  buildsAt(portId) {
    return this.state.builds.filter((b) => b.port === portId && ['building', 'waiting'].includes(b.status));
  }
}

export { FAMILIES };
