// What the milestones read (v0.80.0): the game's own records gathered into one plain object. Nothing here is computed from a screen or a click;
// each line names the record it comes from.
const COMPANY_IDS = ['arms', 'shipping', 'aerospace', 'farming']; // (not imported from corporate.js, which imports this chain)

export function recordsOf(K) {
  const g = K.game;
  const day = g.clock.day;
  const cur = Math.floor((day - 1) / 30);
  const pe = K.personnel.peek();
  const M = K.management.peek();
  const staff = Object.values(pe?.staff || {}).map((x) => ({ role: x.role, employer: x.employer, status: x.status }));
  const furnished = Object.values(K.game.hq?.peek()?.style || {}).some((t) => Object.keys(t).length > 0);
  const done = (M?.log || []).filter((l) => l.type === 'done' || l.type === 'approved');
  const decided = {};
  for (const l of done) decided[l.employer] = (decided[l.employer] || 0) + 1;
  const ranks = {};
  for (const id of COMPANY_IDS) if (K.state.rankHistory?.[id]) ranks[id] = K.state.rankHistory[id].map((x) => ({ ...x }));
  // closed months, newest first: the consolidated result and the decisions managers made in each
  const months = [];
  if (K.group.parent) {
    for (let m = cur - 1; m >= Math.max(0, cur - 3); m--) {
      const c = K.group.consolidated('month', [m]);
      months.push({ net: c.consolidated.net, decisions: done.filter((l) => Math.floor((l.day - 1) / 30) === m).length });
    }
  }
  // shares: what is held, in how many sectors, what it is worth, the gain on those whose cost is kept, and the first trade
  const P = K.exchange.portfolio();
  const trades = K.exchange.trades();
  const portfolio = { tickers: P.rows.length, sectors: new Set(P.rows.map((r) => r.sector).filter(Boolean)).size, value: P.value, gain: P.gain, since: trades.length ? trades[0].day : null };
  const loans = [...K.lending.loans(true), ...K.business.loans(null, true)].map((l) => ({ principal: l.principal, status: l.status, missed: l.missed || 0 }));
  const contracts = g.aero.owned ? g.aero.contractsOf(g.aero.roost).filter((c) => c.status !== 'cancelled').map((c) => ({ value: c.unitPrice * c.qty })) : [];
  const wars = K.geo.events().filter((e) => e.kind === 'war');
  const expandedInWar = done.some((l) => l.kind === 'expand' && wars.some((w) => l.day >= w.start && l.day <= (w.end ?? Infinity)));
  return { established: COMPANY_IDS.filter((id) => K.established(id)), parent: Boolean(K.state.parent), subs: K.group.subs(), staff, furnished, decided, ranks, months, portfolio, loans, contracts, expandedInWar, day };
}
