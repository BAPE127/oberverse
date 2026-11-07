// The world as the Global Intelligence page shows it (v0.103.4): conflicts and countries, read from the geopolitical record (`game.corp.geo`, written only by src/systems/geo.js) and the atlas. Read-only.
import { atlasCountries, atlasMilitary, atlasPlaces, atlasStates, atlasTheatres } from '../world/atlas.js';
import { profileOf } from './strategicAI.js';

const events = (g) => g.corp?.geo?.peek?.()?.events || [];
const name = (g, c) => g.content.arms.countries[c]?.name || atlasCountries()[c]?.name || c;

/** Recorded wars, newest first, with the theatres they are fought in (the atlas theatre between the same two countries). */
export function conflicts(g) {
  const th = atlasTheatres().filter((t) => t.between.length === 2);
  return events(g).filter((e) => e.kind === 'war').map((e) => ({ id: e.id, kind: 'war', name: `${name(g, e.parties[0])} and ${name(g, e.parties[1])}`, parties: e.parties, names: e.parties.map((c) => name(g, c)), start: e.start, status: e.status, end: e.end, severity: e.severity, timeline: (e.timeline || []).slice().reverse(), theatres: th.filter((t) => t.between.includes(e.parties[0]) && t.between.includes(e.parties[1])).map((t) => ({ id: t.id, name: t.name })) }))
    .sort((a, b) => (a.status === b.status ? b.start - a.start : a.status === 'active' ? -1 : 1));
}

export function embargoesOf(g, country) { return events(g).filter((e) => e.kind === 'embargo' && e.status === 'active' && (e.target === country || e.imposer === country || (e.parties || []).includes(country))).map((e) => ({ id: e.id, text: (e.timeline || []).slice(-1)[0]?.text || 'Embargo in force.' })); }

/** What is known of a country. */
export function countryView(g, id) {
  const C = atlasCountries()[id]; if (!C) return null;
  const A = g.content.arms.countries[id] || {};
  return { id, name: C.name, gov: C.gov, capital: C.capital, pop: C.pop, color: C.color, income: A.income ?? null, profile: profileOf(id), states: atlasStates().filter((s) => s.country === id).length,
    wars: conflicts(g).filter((c) => c.parties.includes(id)), embargoes: embargoesOf(g, id),
    sites: atlasMilitary().filter((m) => m.country === id), cities: atlasPlaces().filter((p) => atlasStates().find((s) => s.id === p.state)?.country === id && (p.kind === 'c' || p.kind === 'p')).slice(0, 8) };
}

/** Search countries and named places and military sites. */
export function search(g, q) {
  const s = String(q || '').trim().toLowerCase(); if (s.length < 2) return [];
  const out = [];
  for (const [id, c] of Object.entries(atlasCountries())) if (c.name.toLowerCase().includes(s)) out.push({ type: 'country', id, name: c.name });
  for (const p of atlasPlaces()) if (p.name.toLowerCase().includes(s)) out.push({ type: 'place', name: p.name, lat: p.lat, lon: p.lon, kind: p.kind });
  for (const m of atlasMilitary()) if (m.name.toLowerCase().includes(s)) out.push({ type: 'site', name: m.name, lat: m.lat, lon: m.lon, kind: m.kind });
  return out.slice(0, 12);
}
