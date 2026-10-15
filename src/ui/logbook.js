// A ship's logbook (v0.27.0), read at the chart table below decks: her
// particulars, then every voyage and mission in the captain's hand.
import { h } from './panels.js';

export function logbookPanel(ui, body, opts) {
  const g = ui.game;
  const Lg = g.logistics;
  const v = Lg.vessel(opts.vessel);
  if (!v) { body.append(h('p', {}, 'The pages are blank.')); return { title: 'Logbook' }; }
  const m = Lg.model(v.model);
  const st = Lg.stats(v);
  const port = (id) => Lg.port(id)?.name || '—';
  const row = (k, val) => h('tr', {}, h('th', {}, k), h('td', {}, val));
  body.classList.add('logbook');
  body.append(
    h('div', { class: 'logbook-head' }, h('b', {}, v.name), h('span', {}, `${m.name} · ${Lg.className(m)}${m.custom ? ' · built at your own yard' : ''}`)),
    h('table', { class: 'logbook-table' },
      row('Home port', port(v.port)),
      row('In service since', `Day ${v.bought}`),
      row('Sea miles', `${Math.round(v.sailedKm || 0).toLocaleString()} km`),
      row('Hull', `${Math.round(v.condition)}%`),
      row('Speed · range', `${st.speed} knots · ${Math.round(st.range).toLocaleString()} km`),
      st.capacity ? row('Hold', `${v.cargo?.units || 0} of ${st.capacity} units`) : null,
      row('Abilities', [...st.tags, ...st.bonuses.map((b) => `★ ${Lg.cfg.bonuses[b]?.name || b}`)].join(', ') || '—')),
    h('h3', {}, 'Entries'));
  if (!v.log.length) body.append(h('p', { class: 'logbook-line' }, `Day ${v.bought}. Came into the company's service. "Nothing to report but the smell of new paint." — Master`));
  for (const l of v.log) {
    let text;
    if (l.mission) text = `${Lg.cfg.missionTypes[l.mission]?.name || 'Mission'}: ${l.result}.`;
    else {
      const days = l.arrived && l.departed ? ((l.arrived - l.departed) / 1440).toFixed(1) : '?';
      text = `${port(l.from)} to ${port(l.to)}, ${Math.round(l.km || 0).toLocaleString()} km in ${days} days${l.cargo ? `, carrying ${l.cargo}` : ''}.${l.delays ? ` Delayed ${l.delays}×.` : ''}${(l.incidents || []).length ? ` Trouble: ${l.incidents.join(', ')}.` : ' Fair passage.'}`;
    }
    body.append(h('p', { class: 'logbook-line' }, h('i', {}, l.arrived ? Lg.when(l.arrived) : ''), ' ', text));
  }
  return { title: `📖 Log of the ${v.name}`, className: 'logbook-panel' };
}
