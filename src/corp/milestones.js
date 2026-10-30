// Corporate milestones (v0.80.0). Pure functions — no game state, no DOM, no RNG.
//
//   MILESTONES            the list: id, name, what it asks, and `check(rec)` → { met, have }
//   evaluate(rec, earned) the ones not yet earned, each with whether it is met and a progress line
//
// A milestone is met by something that is in the game's own records: a business owned, an ownership edge, a person employed, a decision a manager
// made, a month's consolidated result, a place in a sector's table, a share held, a loan repaid. Opening a screen, clicking a button or hiring
// someone is never enough on its own — and none of them promises a profit from a war or an embargo.
//
// rec: { established: [ids], parent: bool, subs: [ids], staff: [{ role, employer, skill, status }], budgets: { employer: n }, decided: { employer: n },
//        ranks: { id: [{ m, rank, of }] }, months: [{ net, decisions }] (closed months, newest first), portfolio: { tickers, sectors, value, gain, since },
//        loans: [{ principal, status, missed }], contracts: [{ value }], expandedInWar: bool, day }
const have = (n, of) => `${n}/${of}`;
const best = (rec, id, n) => { const h = rec.ranks[id] || []; return h.length >= n && h.slice(-n).every((x) => x.rank !== null && x.rank !== undefined) ? Math.max(...h.slice(-n).map((x) => x.rank)) : null; };

export const MILESTONES = [
  { id: 'four', name: 'Four businesses', text: 'Own all four private businesses: arms, shipping, aerospace and farming.', check: (r) => ({ met: r.established.length === 4, have: have(r.established.length, 4) }) },
  { id: 'parent', name: 'A holding company', text: 'Form a parent company.', check: (r) => ({ met: r.parent, have: r.parent ? 'formed' : 'none' }) },
  { id: 'group', name: 'One group', text: 'Bring all four businesses under your parent company as subsidiaries.', check: (r) => ({ met: r.parent && r.subs.length === 4, have: have(r.subs.length, 4) }) },
  { id: 'hq', name: 'A staffed headquarters', text: 'Employ at least three people at the parent company, one of them a chief financial officer.', check: (r) => { const p = r.staff.filter((x) => x.employer === 'parent' && x.status === 'active'); return { met: p.length >= 3 && p.some((x) => x.role === 'cfo'), have: `${p.length} people, ${p.some((x) => x.role === 'cfo') ? 'a CFO' : 'no CFO'}` }; } },
  { id: 'cfo', name: 'A first-rate CFO', text: 'Employ a chief financial officer whose best skill is 80 or more.', check: (r) => { const c = r.staff.filter((x) => x.role === 'cfo' && x.status === 'active').sort((a, b) => b.skill - a.skill)[0]; return { met: Boolean(c && c.skill >= 80), have: c ? `best ${Math.round(c.skill)}` : 'none' }; } },
  { id: 'delegated', name: 'Delegation', text: 'Have every subsidiary run by a manager with a budget who has made a decision of their own.', check: (r) => { const ok = r.subs.filter((id) => r.staff.some((x) => x.employer === id && x.status === 'active') && (r.budgets[id] || 0) > 0 && (r.decided[id] || 0) > 0); return { met: r.subs.length === 4 && ok.length === 4, have: have(ok.length, 4) }; } },
  { id: 'top5', name: 'A top-five company', text: 'Stand in the top five of your sector by sales for two months running (with at least six companies in it).', check: (r) => { const ids = Object.keys(r.ranks).filter((id) => { const h = r.ranks[id].slice(-2); return h.length === 2 && h.every((x) => x.of >= 6 && x.rank !== null && x.rank <= 5); }); return { met: ids.length > 0, have: ids.length ? ids.join(', ') : 'no' }; } },
  { id: 'shipping_leader', name: 'The leading shipping company', text: 'Be first in the shipping sector by sales for two months running.', check: (r) => ({ met: best(r, 'shipping', 2) === 1 && (r.ranks.shipping.at(-1)?.of ?? 0) >= 6, have: r.ranks.shipping?.at(-1)?.rank ? `#${r.ranks.shipping.at(-1).rank}` : '—' }) },
  { id: 'arms_leader', name: 'A leading arms maker', text: 'Be first in the arms sector by sales for two months running.', check: (r) => ({ met: best(r, 'arms', 2) === 1 && (r.ranks.arms.at(-1)?.of ?? 0) >= 6, have: r.ranks.arms?.at(-1)?.rank ? `#${r.ranks.arms.at(-1).rank}` : '—' }) },
  { id: 'farm_major', name: 'A major producer', text: 'Stand in the top three of the farming sector by sales for two months running.', check: (r) => ({ met: (best(r, 'farming', 2) ?? 99) <= 3 && (r.ranks.farming.at(-1)?.of ?? 0) >= 6, have: r.ranks.farming?.at(-1)?.rank ? `#${r.ranks.farming.at(-1).rank}` : '—' }) },
  { id: 'aero_contract', name: 'A major contract', text: 'Win an aerospace contract worth 500,000 obols or more.', check: (r) => { const v = Math.max(0, ...r.contracts.map((c) => c.value)); return { met: v >= 500000, have: `best ${Math.round(v).toLocaleString()}` }; } },
  { id: 'cash_positive', name: 'In the black', text: 'Show a positive consolidated result for three months running.', check: (r) => { const m = r.months.slice(0, 3); return { met: m.length === 3 && m.every((x) => x.net > 0), have: `${m.filter((x) => x.net > 0).length}/3 months` }; } },
  { id: 'autonomous', name: 'Running itself', text: 'Make a positive consolidated result for three months running, with your managers deciding things for themselves in each.', check: (r) => { const m = r.months.slice(0, 3); return { met: m.length === 3 && m.every((x) => x.net > 0 && x.decisions > 0), have: `${m.filter((x) => x.net > 0 && x.decisions > 0).length}/3 months` }; } },
  { id: 'diversified', name: 'A diversified portfolio', text: 'Hold shares in five companies across at least three sectors, worth 50,000 obols or more.', check: (r) => ({ met: r.portfolio.tickers >= 5 && r.portfolio.sectors >= 3 && r.portfolio.value >= 50000, have: `${r.portfolio.tickers} companies, ${r.portfolio.sectors} sectors, ${Math.round(r.portfolio.value).toLocaleString()}` }) },
  { id: 'investor', name: 'A sound investor', text: 'Be ahead on the shares you hold, with a cost on record, two months after your first trade.', check: (r) => ({ met: r.portfolio.since !== null && r.day - r.portfolio.since >= 60 && r.portfolio.gain > 0, have: r.portfolio.since === null ? 'no trades' : `${r.day - r.portfolio.since} days, ${r.portfolio.gain >= 0 ? '+' : '−'}${Math.abs(Math.round(r.portfolio.gain)).toLocaleString()}` }) },
  { id: 'repaid', name: 'Debt cleared', text: 'Repay a loan of 100,000 obols or more, in full, without missing an instalment.', check: (r) => { const ok = r.loans.filter((l) => l.status === 'repaid' && l.principal >= 100000 && l.missed === 0); return { met: ok.length > 0, have: `${ok.length} repaid` }; } },
  { id: 'war_expansion', name: 'Building through a war', text: 'Have a manager expand a business while a war is on.', check: (r) => ({ met: r.expandedInWar, have: r.expandedInWar ? 'yes' : 'no' }) },
];

/** Every milestone not yet earned: whether the records now meet it, and how near it is. */
export function evaluate(rec, earned = {}) {
  return MILESTONES.filter((m) => !earned[m.id]).map((m) => { const c = m.check(rec); return { id: m.id, met: Boolean(c.met), have: c.have }; });
}
