// Proposal tooling: writes the atlas tables for docs/WORLD_ATLAS_PROPOSAL.md from atlas.mjs and the sampled grid.
import { readFileSync, writeFileSync } from 'node:fs';
import { COUNTRIES, STATES, THEATRES, MIL } from './atlas.mjs';
const A = JSON.parse(readFileSync(new URL('./atlas-out.json', import.meta.url)));
const KIND = { c: 'capital', t: 'city', p: 'port', a: 'airfield', b: 'base', f: 'fort / pass', m: 'mine / oil', r: 'industry / research' };
const stats = JSON.parse(readFileSync(new URL('./base/world.stats.json', import.meta.url)));
const out = [];
const order = ['sund', 'ostmark', 'varn', 'teshvar', 'caldera', 'pallas', 'morrow', 'lirre', 'westreach', 'sunmouth', 'dunmere', 'free'];
let tot = { states: 0, places: 0 };
for (const c of order) {
  const C = COUNTRIES[c]; const ss = A.states.filter((s) => s.country === c);
  out.push(`### ${C.name}`, '', `*${C.gov}.* Capital: ${C.capital || '—'}${C.royal ? ` (royal seat: ${C.royal})` : ''}. Population: ${C.pop}. ${ss.length} ${c === 'free' ? 'regions' : 'states'}.`, '');
  out.push('| State | Main biomes | What it is for | Places |', '| --- | --- | --- | --- |');
  for (const s of ss) {
    const d = stats[s.id] || {}; const tot0 = Object.values(d).reduce((a, b) => a + b, 0) || 1;
    const bio = Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([b, n]) => `${b} ${Math.round((n / tot0) * 100)}%`).join(', ') || 'islands';
    const st = STATES.find((x) => x.id === s.id); const pl = (st.places || []).map((p) => { const [n, , k] = p.split('|'); return `${n} (${KIND[k]})`; }).join('; ');
    out.push(`| **${s.name}** | ${bio} | ${s.tag} | ${pl || '—'} |`); tot.states++; tot.places += (st.places || []).length;
  }
  out.push('');
}
out.push('### Military sites on the strategic map', '', '| Site | Owner | Kind |', '| --- | --- | --- |');
for (const [n, , , c, k] of MIL) out.push(`| ${n} | ${COUNTRIES[c].name} | ${k} |`);
out.push('', '### Theatres (where two rivals meet)', '', '| # | Theatre | Between | Kind | States | Note |', '| --- | --- | --- | --- | --- | --- |');
THEATRES.forEach((t, n) => out.push(`| ${n + 1} | **${t.name}** | ${t.between.map((x) => COUNTRIES[x]?.name || x).join(' / ')} | ${t.kind} | ${t.states.map((id) => STATES.find((s) => s.id === id).name).join(', ')} | ${t.note} |`));
out.push('', `Totals: ${tot.states} states and regions, ${tot.places} named places, ${MIL.length} military sites, ${THEATRES.length} theatres.`);
writeFileSync(new URL('./tables.md', import.meta.url), out.join('\n'));
console.log(tot);
