// Naval missions (v0.23.0): work for your warships, offered at your ports —
// patrols, piracy deterrence, escorts for hire, distress calls, port
// protection, reconnaissance and special transport. Templates live in
// content (MISSION_TYPES); state lives in world.logistics.missions.
//
// A mission is staged at one of your ports: its ships must be docked there,
// go "on station" (vessel status 'mission') for the mission's hours, and come
// back to the same berth. Its outcome is rolled when it starts and stored —
// shown beforehand only as an estimate — so a reload can't change it.
// Success pays and may change the world: deterrence halves a pirate water's
// danger for a while; protection makes voyages leaving that port safer.
//
// Which stats matter depends on the mission (weights), so the biggest,
// dearest warship is not the best at everything: a battleship is a poor
// scout; a skiff is a poor bodyguard.
import { clamp } from '../core/util.js';
import { gcKm } from '../world/globe.js';

export class Missions {
  constructor(logistics) {
    this.L = logistics;
  }

  get game() {
    return this.L.game;
  }

  get types() {
    return this.L.cfg.missionTypes;
  }

  get state() {
    const s = this.L.state;
    if (!s.missions) Object.assign(s, { missions: [], nextMission: 1, lastMissionDay: 0, suppressed: {}, protected: {} });
    return s;
  }

  list(status = null) {
    return this.state.missions.filter((m) => !status || (Array.isArray(status) ? status.includes(m.status) : m.status === status));
  }

  get(id) {
    return this.state.missions.find((m) => m.id === id) || null;
  }

  /** The pirate water nearest a port (what a patrol or sweep would target). */
  nearestZone(portId) {
    const p = this.L.port(portId);
    let best = null;
    let bd = Infinity;
    for (const [id, z] of Object.entries(this.L.cfg.pirateWaters)) {
      const d = gcKm([p.lat, p.lon], [z.lat, z.lon]);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  /** New offers: one a day per owned port, up to a cap. */
  post() {
    const g = this.game;
    const s = this.state;
    const R = g.rng;
    const rules = this.L.L;
    const types = Object.keys(this.types);
    for (const port of this.L.ownedPorts()) {
      for (let k = 0; k < rules.missionsPerPort; k++) {
        if (this.list('available').length >= rules.maxMissions) return;
        const type = types[Math.floor(R.next() * types.length)];
        const T = this.types[type];
        const d = T.difficulty[0] + R.next() * (T.difficulty[1] - T.difficulty[0]);
        const hours = Math.round(T.hours[0] + R.next() * (T.hours[1] - T.hours[0]));
        const reward = Math.round((T.reward[0] + (T.reward[1] - T.reward[0]) * ((d - T.difficulty[0]) / Math.max(0.01, T.difficulty[1] - T.difficulty[0]))) / 50) * 50;
        s.missions.push({ id: `m${s.nextMission++}`, type, port, zone: this.nearestZone(port), difficulty: Math.round(d * 100) / 100, hours, reward, status: 'available', offered: g.clock.day, expiresDay: g.clock.day + rules.missionOfferDays, vessels: [], start: null, end: null, outcome: null });
      }
    }
  }

  /** How well a group of ships suits a mission: 0–100 on its weighted stats (speed is scaled to 0–100 by 40 knots). */
  score(type, vids) {
    const W = this.types[type].weights;
    let best = 0;
    let sum = 0;
    for (const id of vids) {
      const st = this.L.stats(this.L.vessel(id));
      const c = { ...st.combat, speed: Math.min(100, (st.speed / 40) * 100) };
      const v = Object.entries(W).reduce((a, [k, w]) => a + (c[k] || 0) * w, 0) * (0.5 + this.L.vessel(id).condition / 200);
      best = Math.max(best, v);
      sum += v;
    }
    // the best ship counts in full; each extra ship adds a third of itself (diminishing returns)
    return Math.min(100, best + (sum - best) / 3);
  }

  /** Everything about sending ships on a mission, without doing it. */
  quote(mid, vids) {
    const m = this.get(mid);
    const reasons = [];
    if (!m || m.status !== 'available') return { ok: false, reasons: ['that mission isn\'t on offer'] };
    const T = this.types[m.type];
    if (!vids.length) reasons.push('pick at least one ship');
    if (vids.length > this.L.L.missionShips) reasons.push(`at most ${this.L.L.missionShips} ships`);
    if (new Set(vids).size !== vids.length) reasons.push('a ship is listed twice');
    let cost = 0;
    for (const id of vids) {
      const v = this.L.vessel(id);
      if (!v) { reasons.push('no such ship'); continue; }
      const st = this.L.stats(v);
      if (v.status !== 'docked' || v.contract || v.cargo) reasons.push(`the ${v.name} isn't free`);
      if (v.port !== m.port) reasons.push(`the ${v.name} is at ${this.L.port(v.port)?.name || 'sea'}, not ${this.L.port(m.port).name}`);
      if (v.condition < this.L.L.minSailCondition) reasons.push(`the ${v.name} needs repairs first`);
      cost += Math.ceil((m.hours / 24) * st.opex);
    }
    // requirements: at least one ship in the group must meet them
    const N = T.needs || {};
    const ships = vids.map((id) => this.L.vessel(id)).filter(Boolean);
    if (N.tag && !ships.some((v) => this.L.stats(v).tags.includes(N.tag))) reasons.push(`needs a ship rated for ${N.tag}`);
    if (N.minSpeed && !ships.some((v) => this.L.stats(v).speed >= N.minSpeed)) reasons.push(`needs a ship of ${N.minSpeed}+ knots`);
    if (N.capacity && !ships.some((v) => this.L.stats(v).capacity >= N.capacity)) reasons.push(`needs room aboard for ${N.capacity}+ units`);
    if (this.L.state.arrears > 0) reasons.push('your upkeep is in arrears');
    const score = ships.length ? this.score(m.type, vids) : 0;
    const p = clamp(0.5 + (score - m.difficulty * 100) / 70, 0.05, 0.95);
    const category = p >= 0.8 ? 'very likely' : p >= 0.6 ? 'likely' : p >= 0.4 ? 'even odds' : p >= 0.2 ? 'risky' : 'very risky';
    return { ok: reasons.length === 0, reasons, cost, score: Math.round(score), chance: p, category };
  }

  /** The team (up to the limit) that gives the best chance, from the ships free at the mission's port — greedily. */
  bestTeam(mid) {
    const m = this.get(mid);
    if (!m) return null;
    const free = this.L.vessels().filter((v) => v.status === 'docked' && v.port === m.port && !v.contract && !v.cargo);
    let team = [];
    let best = null;
    for (let k = 0; k < this.L.L.missionShips; k++) {
      let pick = null;
      for (const v of free) {
        if (team.includes(v.id)) continue;
        const q = this.quote(mid, [...team, v.id]);
        if (!q.ok) continue;
        // a ship has to earn its place: +3 points of chance for its running costs
        if (!pick || q.chance > pick.q.chance) pick = { id: v.id, q };
      }
      if (!pick || (best && pick.q.chance < best.chance + 0.03)) break;
      team = [...team, pick.id];
      best = pick.q;
    }
    return best ? { ships: team, quote: best } : null;
  }

  /** Send the ships. Costs paid now; the outcome is rolled now and kept. */
  start(mid, vids) {
    const g = this.game;
    const m = this.get(mid);
    const q = this.quote(mid, vids);
    if (!q.ok) return { ok: false, text: `Can't: ${q.reasons[0]}.` };
    if (!g.corp.canAfford('shipping', q.cost)) return { ok: false, text: `The mission costs ${q.cost} obols in running costs.` };
    this.L.spend(q.cost, 'mission');
    const r = g.rng.next();
    const outcome = r < q.chance ? 'success' : r < q.chance + 0.15 ? 'partial' : 'failure';
    const damage = vids.map(() => (outcome === 'failure' ? 10 + Math.round(g.rng.next() * 25) : outcome === 'partial' ? Math.round(g.rng.next() * 12) : Math.round(g.rng.next() * 5)));
    m.status = 'active';
    m.vessels = [...vids];
    m.start = g.clock.total;
    m.end = g.clock.total + m.hours * 60;
    m.outcome = { result: outcome, damage, chance: q.chance };
    for (const id of vids) {
      const v = this.L.vessel(id);
      this.L.setStatus(v, 'mission');
      v.mission = m.id;
    }
    this.L.report('mission', `⚔ ${vids.map((id) => `The ${this.L.vessel(id).name}`).join(' and ')} put${vids.length === 1 ? 's' : ''} to sea from ${this.L.port(m.port).name}: ${this.types[m.type].name.toLowerCase()} (${q.category}).`, 'info');
    return { ok: true, text: `Under way — back ${this.L.when(m.end)}.` };
  }

  /** Each minute: missions that have run their time come home and settle. */
  tick() {
    const g = this.game;
    for (const m of this.list('active')) {
      if (g.clock.total < m.end) continue;
      this.finish(m);
    }
  }

  finish(m) {
    const g = this.game;
    const T = this.types[m.type];
    const s = this.state;
    const res = m.outcome.result;
    m.vessels.forEach((id, i) => {
      const v = this.L.vessel(id);
      if (!v || v.status !== 'mission') return;
      this.L.setStatus(v, 'docked');
      delete v.mission;
      v.condition = Math.max(0, Math.round((v.condition - m.outcome.damage[i]) * 10) / 10);
      v.log.unshift({ from: m.port, to: m.port, km: 0, departed: m.start, arrived: g.clock.total, mission: m.type, result: res });
      v.log.length = Math.min(v.log.length, 10);
    });
    m.status = res === 'failure' ? 'failed' : res;
    const pay = res === 'success' ? m.reward : res === 'partial' ? Math.round(m.reward / 2) : 0;
    if (pay) this.L.earn(pay, 'mission');
    m.paid = pay;
    let effect = '';
    if (res === 'success' && T.effect?.suppress && m.zone) {
      s.suppressed[m.zone] = g.clock.total + T.effect.suppress * 1440;
      effect = ` ${this.L.cfg.pirateWaters[m.zone].name} is half as dangerous for ${T.effect.suppress} days.`;
    }
    if (res === 'success' && T.effect?.protect) {
      s.protected[m.port] = g.clock.total + T.effect.protect * 1440;
      effect = ` Voyages leaving ${this.L.port(m.port).name} face 30% less trouble for ${T.effect.protect} days.`;
    }
    const text = res === 'success' ? `✅ ${T.name} from ${this.L.port(m.port).name}: success — ${pay} obols.${effect}`
      : res === 'partial' ? `◐ ${T.name} from ${this.L.port(m.port).name}: a partial success — ${pay} obols.`
        : `✖ ${T.name} from ${this.L.port(m.port).name} failed. The ships came home battered.`;
    this.L.report('mission', text, res === 'failure' ? 'warn' : 'good');
  }

  /** Daily: offers lapse, new ones come in. */
  daily() {
    const g = this.game;
    const s = this.state;
    for (const m of s.missions) if (m.status === 'available' && m.expiresDay < g.clock.day) m.status = 'expired';
    s.missions = s.missions.filter((m) => ['available', 'active'].includes(m.status) || g.clock.day - m.offered < 7);
    if (s.lastMissionDay < g.clock.day) {
      s.lastMissionDay = g.clock.day;
      this.post();
    }
  }
}
