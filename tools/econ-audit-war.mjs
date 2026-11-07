// Prints the mercenary company's income rules (v0.103.5): what the bare minimum and the full base earn in 5 days at the figures in src/content/income.js `war`.
// Run: node tools/econ-audit-war.mjs   (the rule itself is held by tests/war_income.test.mjs)
import { INCOME } from '../src/content/income.js';
import { RETAINER } from '../src/content/strategic.js';
import { ENGAGE } from '../src/content/generals.js';
import { RISK } from '../src/content/contracts.js';
import { FACILITIES } from '../src/content/facilities.js';

const W = INCOME.war; const D = W.target.days; const f = (n) => Math.round(n).toLocaleString('en-US');
const beds = (ids) => ids.reduce((a, id) => a + (FACILITIES[id].capacity.beds || 0), 0);
const fleet = [['tank', 4], ['helicopter', 2], ['artillery', 2], ['carrier', 2]];
const vehicles = fleet.reduce((a, [c, q]) => a + RETAINER.perVehicle[c] * q, 0);
const bare = beds(['bunkhouse']); const full = beds(['bunkhouse', 'barracks_a', 'barracks_b', 'barracks_c']);
console.log(`A soldier in a theater earns ${f(W.soldierDay)} a day (retainer); an engagement pays ${f(ENGAGE.payPerTroopDay)} per troop-day; a guard on a contract ${f(RISK.low.rate)}-${f(RISK.high.rate)} a day.`);
console.log(`Vehicles (retainer a day): tank ${f(RETAINER.perVehicle.tank)}, helicopter ${f(RETAINER.perVehicle.helicopter)}, artillery ${f(RETAINER.perVehicle.artillery)}, carrier ${f(RETAINER.perVehicle.carrier)}.`);
console.log(`Bare minimum (site office, bunkhouse, range, cage): ${bare} soldiers -> ${f(bare * W.soldierDay * D)} in ${D} days (floor ${f(W.target.bare)}).`);
console.log(`Everything built: ${full} soldiers + 4 tanks, 2 helicopters, 2 guns, 2 carriers -> ${f((full * W.soldierDay + vehicles) * D)} in ${D} days (aim ${f(W.target.full)}).`);
console.log(`Biggest engagement offered (60 troops, 6 tanks, 4 helicopters, 20 days): pays ${f((60 * ENGAGE.payPerTroopDay + 6 * ENGAGE.payTank + 4 * ENGAGE.payHelicopter) * 20)} -- ${f((60 * ENGAGE.payPerTroopDay + 6 * ENGAGE.payTank + 4 * ENGAGE.payHelicopter))} a day.`);
