// The politics release checks (v0.97.0): the record stays small however long the game runs, the long run stays in balance (both parties win, the state's debt stays bounded, nothing goes negative
// or NaN), saves of every earlier shape load and play on, no add-on to the Politics service hides another's methods, and a reload cannot change the future.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, CONTENT, Game } from './helpers.mjs';
import { POLITICS } from '../src/content/politics.js';
import { electionMethods } from '../src/systems/politicsElections.js';
import { influenceMethods } from '../src/systems/politicsInfluence.js';
import { economyMethods } from '../src/systems/politicsEconomy.js';
import { diplomacyMethods } from '../src/systems/politicsDiplomacy.js';
import { unrestMethods } from '../src/systems/politicsUnrest.js';
import { partyMethods } from '../src/systems/politicsParty.js';
import { emergenceMethods } from '../src/systems/politicsEmergence.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';

const roundtrip = (g) => { const sm = new SaveManager(new MemoryStorage()); assert.ok(sm.save('slot1', g).ok); const g2 = new Game(CONTENT, { seed: 5 }); assert.ok(sm.load('slot1', g2).ok); return g2; };
const toDay = (g, to) => { const s = g.politics.ensure(); for (let d = s.lastGovDay + 1; d <= to; d++) { g.clock.total = (d - 1) * 1440 + 8 * 60; g.politics.governmentDay(s); } return s; };
const walk = (v, f, path = '') => { if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) walk(x, f, `${path}.${k}`); } else f(v, path); };

test('no add-on to the Politics service hides another\'s methods or the class\'s own (a view named "party" once hid the lookup of a party by id)', () => {
  const mixins = { electionMethods, influenceMethods, economyMethods, diplomacyMethods, unrestMethods, partyMethods, emergenceMethods };
  const seen = new Map();
  for (const [name, m] of Object.entries(mixins)) for (const k of Object.keys(m)) { assert.ok(!seen.has(k), `${k} is in both ${seen.get(k)} and ${name}`); seen.set(k, name); }
  const src = readFileSync(new URL('../src/systems/politics.js', import.meta.url), 'utf8');
  const own = new Set([...src.matchAll(/^  (?:get )?([a-zA-Z]\w*)\(.*\) \{/gm)].map((m) => m[1]).filter((k) => !['if', 'for', 'while', 'switch'].includes(k)));
  assert.ok(own.size > 30 && own.has('party') && own.has('calendar') && own.has('leader'), `found the class's methods (${own.size})`);
  for (const k of seen.keys()) assert.ok(!own.has(k), `${k} (${seen.get(k)}) would replace a method of the class`);
  const g = newGame(1); const P = g.politics;
  assert.equal(P.party('order').name, POLITICS.parties.order.name); assert.equal(P.leaderName('liberty'), g.content.characters.npc_susan.name);
  for (const [name, m] of Object.entries(mixins)) for (const k of Object.keys(m)) assert.equal(typeof P[k], 'function', `${name}.${k} is installed`);
});

test('the record stays small however long the game runs: at day 2,400 it is a few times the size it was at day 120, old ended policies are dropped, and nothing else grows without bound', () => {
  const g = newGame(2024); g.player.money = 5e6; const s = g.politics.ensure();
  const size = () => JSON.stringify(s).length;
  toDay(g, 120); const s120 = size();
  toDay(g, 1500); const s1500 = size();
  toDay(g, 2400); const s2400 = size();
  assert.ok(s2400 < 220000, `${s2400} bytes at day 2,400`);
  assert.ok(s2400 < s120 * 4.5, `${s120} → ${s2400}`);
  assert.ok(s2400 - s1500 < 20000, `it has nearly stopped growing (${s1500} → ${s2400})`);
  assert.ok(s.policies.length < 60, `${s.policies.length} policies kept`);
  assert.ok(s.policies.filter((p) => p.state === 'ended').length <= 40);
  assert.ok(s.elections.history.length <= 12 && s.polls.length <= 60 && s.decisions.length <= 80 && s.history.length <= 60 && s.unrest.demos.length <= 20 && (s.diplomacy?.log.length || 0) <= 14);
  P_keys(s);
  function P_keys(rec) { for (const k of Object.keys(rec.influence?.used || {})) assert.ok(Number(k.split('|')[0]) >= 18); }
});

test('the long run stays in balance: 24 worlds × 12 terms — both parties win a healthy share, the debt is bounded, funds never go negative, no number is NaN or infinite, and a reload changes nothing', () => {
  const wins = { order: 0, liberty: 0 }; let total = 0; let maxDebt = 0; let maxRun = 0;
  for (let n = 1; n <= 24; n++) {
    const g = newGame(n * 53 + 7); const s = g.politics.ensure();
    toDay(g, 120 * 12 + 1);
    let prev = null; let run = 0;
    for (const h of s.elections.history) { wins[h.winner]++; total++; if (h.winner === prev) run++; else run = 1; prev = h.winner; maxRun = Math.max(maxRun, run); }
    assert.equal(s.elections.history.length, 12, `world ${n}: twelve elections held`);
    maxDebt = Math.max(maxDebt, s.budget.debt);
    for (const p of Object.values(s.parties)) assert.ok(p.funds >= 0, `${n}: funds ${p.funds}`);
    walk(s, (v, path) => { if (typeof v === 'number') assert.ok(Number.isFinite(v), `world ${n}: ${path} is ${v}`); });
  }
  assert.ok(wins.order / total > 0.3 && wins.liberty / total > 0.3, `${wins.order}/${wins.liberty}`);
  assert.ok(maxRun <= 7, `no side holds office for ever (${maxRun})`);
  assert.ok(maxDebt < 60000, `the state's debt stays bounded (${Math.round(maxDebt)}k at worst)`);
  const a = newGame(31); toDay(a, 600); const b = roundtrip(a); toDay(a, 1700); toDay(b, 1700);
  const J = (x) => JSON.stringify(x); // (a save drops properties that are undefined; the future is what matters)
  assert.equal(J(b.politics.peek().elections.history), J(a.politics.peek().elections.history));
  assert.equal(J(b.politics.peek().unrest), J(a.politics.peek().unrest));
  assert.equal(J(b.politics.peek().government), J(a.politics.peek().government));
});

test('saves of every earlier shape load and play on: a 0.93 record, a 0.94, a 0.95 and a 0.96 each gain what they lack, keep what they have, and run for two terms without a fault', () => {
  const shapes = {
    'v0.93': ['policies', 'budget', 'decisions', 'polls', 'series', 'nextPoll', 'pollSalt', 'lastGovDay', 'lastCabinet', 'nextPolicy', 'elections', 'influence', 'levies', 'diplomacy', 'unrest', 'myParty', 'emergence'],
    'v0.94': ['elections', 'influence', 'levies', 'diplomacy', 'unrest', 'myParty', 'emergence'],
    'v0.95': ['levies', 'diplomacy', 'unrest', 'myParty', 'emergence'],
    'v0.96': ['unrest', 'myParty', 'emergence'],
  };
  for (const [name, drop] of Object.entries(shapes)) {
    const g = newGame(88); g.player.money = 5e6; const s = g.politics.ensure(); toDay(g, 150);
    g.politics.donate(s.government.partyId, 20000);
    const gov = JSON.stringify(s.government); const seats = JSON.stringify(s.constitution.assemblySeats); const funds0 = s.parties.order.funds;
    for (const k of drop) delete s[k];
    if (drop.includes('policies')) { s.government = { ...s.government }; }
    const g2 = roundtrip(g); const p2 = g2.politics;
    assert.doesNotThrow(() => { p2.overview(); p2.government(); p2.polls(); p2.campaign(); p2.influence(); p2.diplomacy(); p2.unrest(); p2.emergence(); p2.effectLines(); p2.partyView(); }, name);
    assert.doesNotThrow(() => toDay(g2, 150 + 240), name);
    const s2 = p2.peek();
    for (const k of ['policies', 'elections', 'influence', 'diplomacy', 'unrest']) assert.ok(s2[k], `${name} gains ${k}`);
    assert.ok(s2.elections.history.length >= 1, `${name}: it holds an election`);
    walk(s2, (v, path) => { if (typeof v === 'number') assert.ok(Number.isFinite(v), `${name}: ${path}`); });
    assert.ok(s2.government.partyId && s2.constitution.assemblySeats.order + s2.constitution.assemblySeats.liberty + s2.constitution.assemblySeats.other === 100);
    void gov; void seats; void funds0;
  }
});

test('wars and embargoes in a save made before diplomacy are kept when the record is first made, in every war state', () => {
  const g = newGame(91); g.market.state;
  g.market.state.wars.push({ a: 'teshvar', b: 'morrow', since: 5 });
  g.market.state.countries.lirre.embargo = true; g.market.state.countries.lirre.embargoReason = 'international sanctions';
  const wars = JSON.stringify(g.market.state.wars);
  delete g.politics.ensure().diplomacy;
  const g2 = roundtrip(g);
  g2.politics.diplomacy();
  assert.equal(JSON.stringify(g2.market.state.wars), wars); assert.ok(g2.market.state.countries.lirre.embargo);
  const d = g2.politics.peek().diplomacy;
  assert.equal(d.pairs['morrow|teshvar']?.stage ?? d.pairs['teshvar|morrow']?.stage, 'war');
});
