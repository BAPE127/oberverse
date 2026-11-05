// The war update's service (v0.98.0): game.war. A thin facade over the record (src/war/state.js), the protection gate (protection.js), the damage gate (damage.js) and the
// checker (check.js). Later releases add the company, construction, transfers and battles here; none of them may write what the gates guard.
import { ensureMilitary, peekMilitary } from './state.js';
import { baseProtected, setCoupState, settle } from './protection.js';
import { register as registerStructure, apply as applyDamage, repair as repairStructure, view as structureView } from './damage.js';
import { found as foundCompany, rename as renameCompany, fund as fundCompany, take as takeFromCompany, pay as companyPay, buyLicence as licenceBuy, buyLot as lotBuy, view as companyView, cash as companyCash } from './company.js';
import { offers as transferOffers, transfer as transferIn, giveBack as transferBack } from './transfers.js';
import { buyVehicle as vehicleBuy, buySupply as supplyBuy } from './purchase.js';
import { housing as housingOf } from './equipment.js';
import { runDay } from './day.js';
import { hire as hireGeneral, dismiss as dismissGeneral, view as generalsView } from './generals.js';
import { assess as assessEngagement, delegate as delegateEngagement, play as playEngagement, decline as declineEngagement, view as engagementsView, get as engagementOf, lacks as engagementLacks } from './engagements.js';
import { tick as bodiesStep, sync as bodiesSync } from './bodies.js';
import { hire as hireIn, dismiss as dismissOut } from './people.js';
import { order as orderUnit, cancel as cancelOrder, setShifts as setLineShifts, upgrade as upgradeWorks, maintain as maintainWorks, view as productionView } from './production.js';
import { accept as acceptJob, decline as declineJob, view as contractsView, missing as jobMissing } from './contracts.js';
import { equip as equipPerson, equipClass as equipTheClass, setTier as setClassTier, setArmour as setPersonArmour } from './loadout.js';
import { create as createSquad, assign as assignSquad, unassign as unassignSquad, setLeader as leadSquad, assignVehicle as squadGetsVehicle, disband as disbandSquad, setLook as lookSquad, view as squadsView } from './squads.js';
import { view as baseViewOf } from './base.js';
import { checkMilitary } from './check.js';
import { commission as commissionFacility, facilityState as facilityStateOf, lotOwned as lotOwnedOf, capacity as baseCapacity, view as facilityView, repair as repairFacility, repairCost as facilityRepairCost, quote as facilityQuote } from './facilities.js';

export class War {
  constructor(game) { this.game = game; }
  get g() { return this.game; }

  /** The record, made on first use. */
  state() { return ensureMilitary(this.g); }
  peek() { return peekMilitary(this.g); }

  baseProtected() { return baseProtected(this.g); }
  setCoup(state, why) { return setCoupState(this.g, state, why); }
  settle(how) { return settle(this.g, how); }

  register(id, o) { return registerStructure(this.g, id, o); }
  hit(id, amount, source) { return applyDamage(this.g, id, amount, source); }
  repair(id, amount, source) { return repairStructure(this.g, id, amount, source); }
  structures() { return structureView(this.g); }

  check() { return checkMilitary(this.peek()); }

  // ---- the company's construction (v0.98.0). `pay` is the company's way of paying; stage 3 makes it the company's own account.
  company() { return this.peek()?.company || null; }
  lotOwned() { return lotOwnedOf(this.g); }
  facilityState(id) { return facilityStateOf(this.g, id); }
  facilities() { return facilityView(this.g); }
  quote(id) { return facilityQuote(this.g, id); }
  commission(id) { return commissionFacility(this.g, id, (amount, note) => this.pay(amount, note)); }
  repairFacility(id) { return repairFacility(this.g, id, (amount, note) => this.pay(amount, note)); }
  repairCost(id) { return facilityRepairCost(this.g, id); }
  capacity(kind) { return baseCapacity(this.g, kind); }
  dailyTick() { runDay(this.g); }
  /** Every game minute: the soldiers drawn on Hollowmoor Lot follow the books (src/war/bodies.js). */
  bodiesTick() { this._bodies ||= {}; bodiesStep(this.g, this._bodies); }
  afterLoad() { this._bodies = {}; if (this.peek()?.company?.identity) bodiesSync(this.g); }
  bodies() { return [...this.g.npcs.values()].filter((n) => n.profile?.warStaff); }
  // ---- the company (v0.98.0 stage 3): its own account (game.corp 'security'); the wallet is touched only by fund() and take(), the two acts of the owner
  found(name) { return foundCompany(this.g, name); }
  rename(name) { return renameCompany(this.g, name); }
  fund(amount) { return fundCompany(this.g, amount); }
  take(amount) { return takeFromCompany(this.g, amount); }
  cash() { return companyCash(this.g); }
  buyLicence() { return licenceBuy(this.g); }
  buyLot() { return lotBuy(this.g); }
  companyView() { return companyView(this.g); }
  /** Pay for something the company buys: from the company's own account only. */
  pay(amount, note) { return companyPay(this.g, amount, note); }

  // ---- procurement (v0.99.0 stage 4): free transfers from your other companies, and what suppliers sell
  offers() { return transferOffers(this.g); }
  transfer(spec) { return transferIn(this.g, spec); }
  giveBack(spec) { return transferBack(this.g, spec); }
  buyVehicle(id) { return vehicleBuy(this.g, id); }
  buySupply(id, qty) { return supplyBuy(this.g, id, qty); }
  housing() { return housingOf(this.g); }
  equipment() { return this.peek()?.company?.equipment || []; }
  stock() { return this.peek()?.company?.stock || {}; }
  transfers() { return this.peek()?.transfers || []; }

  // ---- people and the works (v0.99.0 stages 5 and 6)
  hire(role) { return hireIn(this.g, role); }
  dismiss(id) { return dismissOut(this.g, id); }
  people() { return this.peek()?.company?.personnel || []; }
  order(model, qty) { return orderUnit(this.g, model, qty); }
  cancelOrder(id) { return cancelOrder(this.g, id); }
  shifts(lineId, n) { return setLineShifts(this.g, lineId, n); }
  upgrade(works) { return upgradeWorks(this.g, works); }
  maintain(works) { return maintainWorks(this.g, works); }
  production() { return productionView(this.g); }

  baseView() { return baseViewOf(this.g); }

  // ---- people, squads and loadouts (v0.100.0 stage 7)
  equip(pid) { return equipPerson(this.g, pid); }
  equipClass(role) { return equipTheClass(this.g, role); }
  setTier(role, tier) { return setClassTier(this.g, role, tier); }
  armour(pid, era) { return setPersonArmour(this.g, pid, era); }
  armourClass(role, era) {
    const C = this.peek()?.company;
    if (!C) return { ok: false, text: 'You have no company.' };
    const people = C.personnel.filter((p) => p.role === role && p.status !== 'dead');
    if (!people.length) return { ok: false, text: 'No one of that class.' };
    let done = 0; let last = null;
    for (const p of people) { const r = setPersonArmour(this.g, p.id, era); if (r.ok) done++; else last = r; }
    return done ? { ok: true, text: `${done} changed their armour.${last ? ` ${last.text}` : ''}` } : last;
  }
  squads() { return squadsView(this.g); }
  squadCreate(name) { return createSquad(this.g, name); }
  squadAssign(squadId, pid) { return assignSquad(this.g, squadId, pid); }
  squadRemove(pid) { return unassignSquad(this.g, pid); }
  squadLeader(squadId, pid) { return leadSquad(this.g, squadId, pid); }
  squadVehicle(squadId, eid) { return squadGetsVehicle(this.g, squadId, eid); }
  squadDisband(squadId) { return disbandSquad(this.g, squadId); }
  squadLook(squadId, look) { return lookSquad(this.g, squadId, look); }

  // ---- generals and engagements (v0.100.0 stage 9)
  generals() { return generalsView(this.g); }
  hireGeneral(id) { return hireGeneral(this.g, id); }
  dismissGeneral(id) { return dismissGeneral(this.g, id); }
  engagements() { return engagementsView(this.g); }
  engagement(id) { return engagementOf(this.g, id); }
  engagementLacks(id, squads) { const e = engagementOf(this.g, id); return e ? engagementLacks(this.g, e, squads) : []; }
  assess(id, squads, general) { return assessEngagement(this.g, id, squads, general); }
  delegate(id, order) { return delegateEngagement(this.g, id, order); }
  playEngagement(id) { return playEngagement(this.g, id); }
  declineEngagement(id) { return declineEngagement(this.g, id); }

  contracts() { return contractsView(this.g); }
  accept(id) { return acceptJob(this.g, id); }
  decline(id) { return declineJob(this.g, id); }

  summary() {
    const m = this.peek();
    if (!m) return 'No military record yet (nothing has made one). The base is protected.';
    const s = this.structures();
    return `Coup: ${m.coup.state}. Base ${baseProtected(this.g) ? 'PROTECTED' : 'VULNERABLE'} (${m.protection.reason}). ${s.length} structures (${s.filter((x) => x.state !== 'intact').length} hurt). ${this.check().length} problems.`;
  }
}
