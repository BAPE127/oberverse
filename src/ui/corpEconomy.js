// The Economy app (v0.75.0): the wars, embargoes and restrictions that are on, what they do to each sector, who is exposed, and the rest of the
// news. Read from game.corp.geo.overview(); nothing here moves money, and nothing says what will happen next.
import { h } from './panels.js';

const pc = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`;
const pc2 = (v) => `${(v * 100).toFixed(2)}%`;

export function economyFull(ui, body) {
  const g = ui.game;
  const O = g.corp.geo.overview();
  O.banks = Object.values(g.robbery.view()); O.bankNews = g.robbery.news(); O.robberyPremium = g.robbery.premium(); // the banks' security is the public's business, not the economy's: read straight from the robbery record
  const none = (t) => h('p', { class: 'muted' }, t);
  const sev = (e) => (e.severity >= 0.7 ? 'severe' : e.severity >= 0.4 ? 'serious' : 'limited');
  const effect = (x) => `${x.sector} ${x.kind === 'cost' ? 'costs' : 'demand'} ${pc(x.pct)}`;
  const event = (e) => h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
    h('div', { class: 'name' }, e.kind === 'war' ? `⚔️ ${e.names.join(' – ')}` : `🚫 ${e.names[0]}: arms embargo`, h('span', { class: `tag${e.status === 'active' ? ' neg' : ' good'}` }, e.status === 'active' ? sev(e) : 'ended'), h('span', { class: 'tag' }, e.id)),
    h('div', { class: 'desc' }, e.kind === 'war'
      ? `Since day ${e.start}${e.age >= 60 ? ' (prolonged)' : ''} · ${e.status === 'active' ? `${Math.round(e.phase * 100)}% of its full effect so far` : `ended day ${e.end}, ${Math.round(e.phase * 100)}% of its effect left`}`
      : `Imposed by ${e.imposer} on day ${e.start}${e.cause ? ` after ${e.cause}` : ''} · restricts ${e.goods.join(', ')} · ${e.status === 'active' ? `${Math.round(e.phase * 100)}% in force` : `lifted day ${e.end}`}`),
    e.effects.length ? h('div', { class: 'desc' }, `Now: ${e.effects.map(effect).join(' · ')}`) : null,
    h('div', { class: 'desc muted' }, e.timeline.slice(-2).map((t) => `Day ${t.day}: ${t.text}`).join(' — '))));

  body.append(h('p', { class: 'doc' }, '🌐 What the world\'s quarrels do to business. Each war and embargo is kept as a record; its effects build up over ten days and fade over thirty after it ends, are bounded, and fall unevenly: a sector, a company\'s own exposure, and whether it is from a country involved all matter. This is what has happened and what it costs now — never a forecast.'));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Wars'), O.wars.length ? h('div', { class: 'list' }, ...O.wars.map(event)) : none('No war is on.'));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Embargoes and restrictions'), O.embargoes.length ? h('div', { class: 'list' }, ...O.embargoes.map(event)) : none('No embargo is in force.'));
  if (O.ended.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Ceasefires and lifted restrictions'), h('div', { class: 'list' }, ...O.ended.map(event)));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Commodities, materials and demand'));
  if (!O.sectors.length) body.append(none('No sector is being moved by events.'));
  else body.append(h('div', { class: 'list' }, ...O.sectors.map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, r.sector), h('div', { class: 'desc' }, [Math.abs(r.demand) >= 0.05 ? `customers' demand ${pc(r.demand)}` : null, Math.abs(r.cost) >= 0.05 ? `costs ${pc(r.cost)}` : null].filter(Boolean).join(' · ')))))));

  const co = (r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `${r.ticker} · ${r.name}`, h('span', { class: `tag ${r.sentiment > 0 ? 'good' : 'neg'}` }, `${pc(r.sentiment * 100)} expected`)), h('div', { class: 'desc' }, `${r.sector} · ${r.price.toFixed(2)}${r.change != null ? ` (${pc(r.change * 100)} on the day)` : ''}`)));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Who is exposed'));
  if (!O.lifted.length && !O.pressed.length) body.append(none('No listed company is moved by events today.'));
  else body.append(h('div', { class: 'list' }, ...O.lifted.map(co), ...O.pressed.map(co)));
  body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'The figure is how much the market is pricing a company\'s earnings up or down because of events, on top of what its books already show (bounded at 12%).'));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Central bank and bonds'),
    h('div', { class: 'list' }, h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `Policy rate ${pc2(O.rate)}`), h('div', { class: 'desc' }, `${O.premium > 0 ? `Wars and embargoes add ${pc2(O.premium)} to government bond yields · ` : ''}Government bond yields: ${O.yields.map((y) => `${y.years}-year ${pc2(y.yield)}`).join(' · ')}`))),
      ...O.bank.map((d) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `Day ${d.day}: ${d.to > d.from ? 'raised' : d.to < d.from ? 'lowered' : 'held'} at ${pc2(d.to)}`), h('div', { class: 'desc' }, d.text))))));

  if (O.sovereign.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Foreign government bonds'), h('div', { class: 'list' }, ...O.sovereign.map((s) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, s.name, h('span', { class: `tag${s.rating === 'AA' || s.rating === 'A' ? ' good' : s.rating === 'CCC' || s.status === 'delayed' ? ' neg' : ''}` }, s.status === 'delayed' ? `${s.rating} · delayed` : s.rating)), h('div', { class: 'desc' }, `Yield ${pc2(s.yield)}`))))),
    ...(O.bondNews.length ? [h('div', { class: 'list' }, ...O.bondNews.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`)))))] : []));
  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Banks and security'), h('div', { class: 'list' }, ...O.banks.map((b) => h('div', { class: 'item-row' }, h('div', { class: 'grow' },
    h('div', { class: 'name' }, b.name, h('span', { class: `tag${b.state === 'normal' ? ' good' : ' neg'}` }, { normal: 'open for business', alert: 'security alert', robbery: 'robbery in progress', police: 'police on the scene', recovery: `closed to day ${b.closedUntil}`, reopening: 'reopening' }[b.state])),
    h('div', { class: 'desc' }, `Vault: ${b.stock.cash.toLocaleString()} obols in notes and ${b.stock.gold} gold bars of ${b.full.cash.toLocaleString()} and ${b.full.gold}${b.last ? ` · robbed on day ${b.last.day}: ${b.last.cash.toLocaleString()} obols and ${b.last.gold} bars taken` : ''}`))))),
    ...(O.bankNews.length ? [h('div', { class: 'list' }, ...O.bankNews.slice(0, 4).map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.text}`)))))] : []),
    h('p', { class: 'muted', style: 'font-size:12px' }, `A robbery of the First Bank is a loss of physical notes and gold only; it never touches anyone's credit, loans, ratings or valuations.${O.robberyPremium > 0 ? ` Its market reaction adds ${pc2(O.robberyPremium)} to government bond yields for now, fading over ten days; lenders do not count it.` : ''}`));
  if (O.movers.length) body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Biggest moves on the exchange today'), h('div', { class: 'list' }, ...[...O.movers.slice(0, 3), ...O.movers.slice(-3).reverse()].filter((r, i, a) => a.findIndex((x) => x.ticker === r.ticker) === i).map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, `${r.ticker} · ${r.name}`, h('span', { class: `tag ${r.change > 0 ? 'good' : 'neg'}` }, pc(r.change * 100))), h('div', { class: 'desc' }, `${r.price.toFixed(2)} · ${r.sector}`))))));

  body.append(h('h3', { style: 'margin:10px 0 4px' }, 'Headlines'));
  if (!O.headlines.length) body.append(none('Nothing reported yet.'));
  else body.append(h('div', { class: 'list' }, ...O.headlines.map((n) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${n.day} · ${n.text}`))))));
}
