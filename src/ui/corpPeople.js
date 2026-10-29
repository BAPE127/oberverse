// The People app (v0.62.0): who could run your businesses, who does, and what they cost. Everything is read
// from game.corp.personnel and every button calls it; nothing is computed here but layout.
import { h } from './panels.js';
import { SKILLS, ROLES, GRADES, STYLES, MARKET, EFFECT_CAPS } from '../content/personnel.js';
import { grade, roleFit } from '../corp/people.js';

const P = { GRADES, ROLES };
const n = (x) => (x === null || x === undefined ? '—' : Math.round(x).toLocaleString());
const VIEWS = { openings: 'Openings', candidates: 'Candidates', staff: 'Staff', payroll: 'Payroll' };
const TIERS = { executive: 'Executives', manager: 'Managers', staff: 'Staff' };
const EFFECT_TEXT = { materials: 'materials cost', parts: 'parts cost', armsSpeed: 'arms output speed', upkeep: 'upkeep cost', farmPrice: 'farm sale prices', overhead: 'overhead' };
const pct = (v) => `${(v * 100).toFixed(1)}%`;

export function peopleApp(ui, body, open) {
  const g = ui.game;
  const K = g.corp;
  const Pe = K.personnel;
  const S = (ui.corpPeople ||= { view: 'openings', tier: '', role: '', sort: 'fit', sel: null, cmp: [], who: null });
  const go = (r) => { if (r?.text) ui.corpNote = r.text; ui.audio.sfx(r?.ok === false ? 'sfx_fail' : 'sfx_coin'); open('Personnel'); };
  const view = (patch) => { Object.assign(S, patch); open('Personnel'); };
  if (ui.corpNote) { body.append(h('p', {}, h('b', {}, ui.corpNote))); ui.corpNote = null; }
  const stat = (a, b) => h('div', { class: 'stat' }, h('span', {}, a), h('b', {}, b));
  const num = (v, w = 80) => h('input', { type: 'number', class: 'debug-qty', min: 0, step: 5, value: v, style: `width:${w}px` });
  const sel = (opts, cur) => h('select', { class: 'debug-input' }, ...opts.map(([v, t]) => h('option', { value: v, selected: v === cur }, t)));

  body.append(h('p', { class: 'doc' }, '🧑‍💼 People run the businesses you own. Hire executives for the parent company and managers and staff for each business. Each is paid every day from their employer\'s own cash. A good manager trims one real cost or lifts one real result, within a ceiling; they cannot do what needs a worker or a resource you do not have. Authority is recorded now and takes effect when managers begin to act on their own.'));
  body.append(h('div', { class: 'row', style: 'justify-content:flex-start;margin-bottom:6px;flex-wrap:wrap' }, ...Object.entries(VIEWS).map(([id, l]) => h('button', { class: `small${S.view === id ? ' primary' : ''}`, onclick: () => view({ view: id }) }, l))));

  if (S.view === 'openings') openings(); else if (S.view === 'candidates') candidates(); else if (S.view === 'staff') staff(); else payroll();

  // ---------------------------------------------------------------- openings
  function openings() {
    const list = Pe.openings();
    if (!list.length) { body.append(h('p', { class: 'muted' }, 'Nothing needs filling yet. Roles appear here when a business has grown enough to make a case for one.')); return; }
    body.append(h('div', { class: 'list' }, ...list.map((o) => {
      // someone of the job's own level first (an executive would cost far more than the job pays); anyone who suits it otherwise
      const fits = Pe.candidates().filter((c) => c.roles.includes(o.role));
      const own = fits.filter((c) => c.tier === ROLES[o.role].tier);
      const best = (own.length ? own : fits).sort((a, b) => roleFit(P, b, o.role) - roleFit(P, a, o.role))[0];
      const est = best ? Pe.benefit(best, o.role, o.employer) : null;
      const can = best ? K.canAfford(o.employer, best.floor * MARKET.fee) : false;
      return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, `${o.roleName} — ${o.employerName}`, h('span', { class: 'tag' }, `${n(o.pay[0])}–${n(o.pay[1])} a day`)),
        h('div', { class: 'desc' }, o.why),
        best ? h('div', { class: 'desc' }, `Best candidate today: ${best.name} (${Math.round(roleFit(P, best, o.role))}, ${grade(P, roleFit(P, best, o.role))}) at about ${n(best.floor)} a day. ${est.perDay > 0 ? `On today's figures they would save or earn about ${n(est.perDay)} a day${est.perDay < best.floor ? ` — less than their wage; the case is for later decisions, not passive savings` : ''}.` : 'Their direct effect on today\'s spending is nil; the value is in decisions they will make.'}${can ? '' : ` ${o.employerName} could not pay the recruiting fee yet.`}`) : h('div', { class: 'desc' }, 'No candidate in the market suits this job right now.'),
        best ? h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small', onclick: () => view({ view: 'candidates', sel: best.id, tier: '', role: o.role }) }, 'See candidates')) : null));
    })));
  }

  // ---------------------------------------------------------------- candidates
  function candidates() {
    let list = Pe.candidates();
    const tiers = h('select', { class: 'debug-input' }, h('option', { value: '' }, 'All levels'), ...Object.entries(TIERS).map(([v, t]) => h('option', { value: v, selected: v === S.tier }, t)));
    const roles = h('select', { class: 'debug-input' }, h('option', { value: '' }, 'Any job'), ...Object.entries(ROLES).map(([v, R]) => h('option', { value: v, selected: v === S.role }, R.name)));
    const sort = h('select', { class: 'debug-input' }, ...[['fit', 'Best fit'], ['cheap', 'Cheapest'], ['rep', 'Reputation'], ['soon', 'Available soonest']].map(([v, t]) => h('option', { value: v, selected: v === S.sort }, t)));
    const apply = () => view({ tier: tiers.value, role: roles.value, sort: sort.value });
    body.append(h('div', { class: 'row', style: 'justify-content:flex-start;flex-wrap:wrap;gap:6px' }, tiers, roles, sort, h('button', { class: 'small', onclick: apply }, 'Apply')));
    if (S.tier) list = list.filter((c) => c.tier === S.tier);
    if (S.role) list = list.filter((c) => c.roles.includes(S.role));
    const fit = (c) => (S.role ? roleFit(P, c, S.role) : roleFit(P, c, c.roles[0] || c.role));
    list.sort((a, b) => (S.sort === 'cheap' ? a.floor - b.floor : S.sort === 'rep' ? b.reputation - a.reputation : S.sort === 'soon' ? a.availableDay - b.availableDay : fit(b) - fit(a)));
    body.append(h('p', { class: 'muted', style: 'font-size:12px' }, `${list.length} candidates. The market refreshes weekly: some take other jobs, new people arrive. Pick up to three to compare.`));
    body.append(h('div', { class: 'list' }, ...list.map((c) => {
      const f = fit(c);
      const inCmp = S.cmp.includes(c.id);
      return h('div', { class: 'item-row', style: `align-items:flex-start;${S.sel === c.id ? 'outline:1px solid #8ab' : ''}` }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, c.name, h('span', { class: 'tag' }, c.tier), h('span', { class: 'tag' }, c.style), c.availableDay > g.clock.day ? h('span', { class: 'tag' }, `from day ${c.availableDay}`) : h('span', { class: 'tag good' }, 'available now')),
        h('div', { class: 'desc' }, `Suits ${c.roles.slice(0, 3).map((r) => ROLES[r].name).join(', ')} · fit ${Math.round(f)} (${grade(P, f)}) · age ${c.age}, ${c.experience} years · asks about ${n(c.expects)} a day, will not go below ${n(c.floor)}`),
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' },
          h('button', { class: 'small', onclick: () => view({ sel: S.sel === c.id ? null : c.id }) }, S.sel === c.id ? 'Close' : 'Details & offer'),
          h('button', { class: `small${inCmp ? ' primary' : ' ghost'}`, onclick: () => view({ cmp: inCmp ? S.cmp.filter((x) => x !== c.id) : [...S.cmp, c.id].slice(-3) }) }, inCmp ? 'Comparing' : 'Compare')),
        S.sel === c.id ? detail(c) : null));
    })));
    const picks = S.cmp.map((id) => Pe.candidates().find((c) => c.id === id)).filter(Boolean);
    if (picks.length >= 2) body.append(compare(picks));
  }

  function detail(c) {
    const top = Object.entries(c.skills).sort((a, b) => b[1] - a[1]);
    const jobs = c.roles.map((r) => [r, ROLES[r].name]);
    const roleSel = sel(jobs, S.role && c.roles.includes(S.role) ? S.role : c.roles[0]);
    const empBox = h('select', { class: 'debug-input' });
    const pay = num(c.expects, 90);
    const info = h('div', { class: 'desc' });
    const refill = () => {
      const R = ROLES[roleSel.value];
      empBox.replaceChildren();
      for (const e of R.employers) {
        if (!Pe.employerOk(e)) continue;
        if (Pe.holders(e, roleSel.value).length >= R.limit) continue;
        empBox.append(h('option', { value: e }, Pe.employerName(e)));
      }
      if (!empBox.options.length) { info.textContent = 'No business of yours has room for this job.'; return; }
      const b = Pe.benefit(c, roleSel.value, empBox.value);
      const fee = Number(pay.value) * MARKET.fee;
      const fx = Object.entries(b.effects).filter(([, v]) => v > 0).map(([k, v]) => `${pct(v)} off ${EFFECT_TEXT[k] || k}`.replace('off farm sale prices', 'on farm sale prices').replace('off arms output speed', 'on arms output speed'));
      info.textContent = `${fx.length ? `Effect: ${fx.join(', ')} (ceilings: ${Object.entries(EFFECT_CAPS).map(([k, v]) => `${EFFECT_TEXT[k]} ${pct(v)}`).join(', ')}). ` : 'No direct effect on spending from this job. '}Worth about ${n(b.perDay)} a day on today's figures. Fee ${n(fee)} (${MARKET.fee} days' wage), ${K.canAfford(empBox.value, fee) ? 'which they can pay' : 'which they cannot pay yet'}. Notice: starts day ${c.availableDay}.`;
    };
    roleSel.addEventListener('change', refill); empBox.addEventListener('change', refill); pay.addEventListener('input', refill);
    refill();
    return h('div', { style: 'margin-top:6px;padding:6px;border:1px solid #556;border-radius:4px' },
      h('div', { class: 'desc' }, `${c.education}. ${STYLES[c.style]} Work ethic ${c.workEthic}, reliability ${c.reliability}, leadership ${c.leadership}, negotiation ${c.negotiation}, discipline ${c.financialDiscipline}, risk appetite ${c.riskTolerance}. Reputation ${c.reputation}.`),
      h('div', { class: 'desc' }, `Before: ${c.history.map((x) => `${x.role} at ${x.employer} (${x.years} yr)`).join('; ')}.`),
      h('div', { class: 'desc' }, 'Skills: ', ...top.slice(0, 8).map(([k, v]) => `${SKILLS[k].name} ${v} (${grade(P, v)})`).join(' · ')),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:6px;flex-wrap:wrap;gap:6px' }, roleSel, empBox, h('span', { class: 'muted' }, 'a day'), pay,
        h('button', { class: 'small primary', onclick: () => go(Pe.offer(c.id, { role: roleSel.value, employer: empBox.value, pay: Number(pay.value) })) }, 'Make an offer')),
      info);
  }

  function compare(picks) {
    const keys = Object.keys(SKILLS);
    const th = (t) => h('th', { style: 'text-align:right;padding:2px 6px' }, t);
    const rowOf = (label, f, best = null) => h('tr', {}, h('td', { style: 'padding:2px 6px' }, label), ...picks.map((c) => { const v = f(c); const top = best !== null && v === best(picks.map(f)); return h('td', { style: `text-align:right;padding:2px 6px;${top ? 'font-weight:700;color:#7c7' : ''}` }, typeof v === 'number' ? String(v) : v); }));
    const hi = (a) => Math.max(...a); const lo = (a) => Math.min(...a);
    return h('div', { style: 'margin-top:10px;overflow-x:auto' }, h('h4', { style: 'margin:4px 0' }, 'Side by side'),
      h('table', { style: 'width:100%;border-collapse:collapse;font-size:12px' },
        h('thead', {}, h('tr', {}, h('th', {}), ...picks.map((c) => th(c.name)))),
        h('tbody', {},
          rowOf('Level', (c) => c.tier), rowOf('Floor pay a day', (c) => c.floor, lo), rowOf('Reputation', (c) => c.reputation, hi), rowOf('Experience (years)', (c) => c.experience, hi),
          rowOf('Reliability', (c) => c.reliability, hi), rowOf('Negotiation', (c) => c.negotiation, hi), rowOf('Leadership', (c) => c.leadership, hi), rowOf('Starts on day', (c) => c.availableDay, lo),
          ...keys.map((k) => rowOf(SKILLS[k].name, (c) => c.skills[k], hi)))));
  }

  // ---------------------------------------------------------------- staff
  function staff() {
    const mine = Pe.all().filter((x) => !x.floor);
    const floor = Pe.all().filter((x) => x.floor);
    if (!mine.length) body.append(h('p', { class: 'muted' }, 'You have hired nobody through here yet. See Openings for where a hire would help, or Candidates to browse.'));
    body.append(h('div', { class: 'list' }, ...mine.map((x) => {
      const R = ROLES[x.role];
      const fit = roleFit(P, x, x.role);
      const open$ = S.who === x.id;
      const chk = Pe.promoteCheck(x.id, Object.keys(ROLES).find((r) => ROLES[r].tier === (x.tier === 'staff' ? 'manager' : 'executive') && roleFit(P, x, r) >= 45) || '');
      return h('div', { class: 'item-row', style: 'align-items:flex-start' }, h('div', { class: 'grow' },
        h('div', { class: 'name' }, x.name, h('span', { class: 'tag' }, R.name), h('span', { class: 'tag' }, Pe.employerName(x.employer)), x.startDay > g.clock.day ? h('span', { class: 'tag' }, `starts day ${x.startDay}`) : null, x.unpaid ? h('span', { class: 'tag neg' }, 'UNPAID') : null),
        h('div', { class: 'desc' }, `${n(x.salary)} a day · loyalty ${Math.round(x.loyalty)} · fit ${Math.round(fit)} (${grade(P, fit)}) · hired day ${x.hiredDay}${x.reviews.length ? ` · last review ${x.reviews[x.reviews.length - 1].good ? 'good' : 'flat'}` : ''}`),
        Object.entries(Pe.effects(x.employer)).some(([, v]) => v > 0) && x.startDay <= g.clock.day ? h('div', { class: 'desc' }, `${Pe.employerName(x.employer)} now gets: ${Object.entries(Pe.effects(x.employer)).filter(([, v]) => v > 0).map(([k, v]) => `${pct(v)} ${EFFECT_TEXT[k]}`).join(', ')}`) : null,
        h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small', onclick: () => view({ who: open$ ? null : x.id }) }, open$ ? 'Close' : 'Manage')),
        open$ ? manage(x, chk) : null));
    })));
    if (floor.length) body.append(h('h4', { style: 'margin:10px 0 4px' }, 'Arms works floor staff (managed at the works)'), h('div', { class: 'list' }, ...floor.map((x) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, x.name, h('span', { class: 'tag' }, 'station worker')), h('div', { class: 'desc' }, `${n(x.salary)} a day · morale ${x.loyalty} · ${x.unpaid ? 'UNPAID' : 'paid'}. Hired, paid and let go at the works themselves; listed here as they are.`))))));
  }

  function manage(x, chk) {
    const R = ROLES[x.role];
    const raise = num(x.salary + 10, 90);
    const rank = { staff: 0, manager: 1, executive: 2 };
    const places = (r) => ROLES[r].employers.filter((e) => Pe.employerOk(e));
    // the employers a job can be at follow the job chosen: a chief executive is the parent's, never an arms works'
    const empFor = (roleBox, empBox, keep) => {
      const fill = () => { empBox.replaceChildren(...places(roleBox.value).map((e) => h('option', { value: e, selected: e === keep }, Pe.employerName(e)))); };
      roleBox.addEventListener('change', fill); fill();
    };
    const higher = Object.keys(ROLES).filter((r) => rank[ROLES[r].tier] > rank[x.tier] && places(r).length);
    const promo = sel(higher.map((r) => [r, ROLES[r].name]), higher[0]);
    const promoEmp = h('select', { class: 'debug-input' });
    if (higher.length) empFor(promo, promoEmp, x.employer);
    const jobs = Object.keys(ROLES).filter((r) => ROLES[r].tier === x.tier && places(r).length);
    const mv = sel(jobs.map((r) => [r, ROLES[r].name]), x.role);
    const mvEmp = h('select', { class: 'debug-input' });
    empFor(mv, mvEmp, x.employer);
    const a = x.authority;
    const spend = num(a.spendLimit, 90); const above = num(a.approvalAbove, 90);
    const flags = ['canHire', 'canBorrow', 'canTransfer', 'canContract', 'canExpand'].map((k) => ({ k, el: h('input', { type: 'checkbox', checked: a[k] }) }));
    const FL = { canHire: 'hire', canBorrow: 'borrow', canTransfer: 'transfer', canContract: 'sign contracts', canExpand: 'expand' };
    const why = promoteWhy(x);
    return h('div', { style: 'margin-top:6px;padding:6px;border:1px solid #556;border-radius:4px' },
      h('div', { class: 'desc' }, `${R.text} Skills: ${Object.entries(x.skills).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([k, v]) => `${SKILLS[k].name} ${v}${x.skills0[k] !== undefined && v > x.skills0[k] ? ` (+${v - x.skills0[k]})` : ''}`).join(' · ')}`),
      x.log.length ? h('div', { class: 'desc' }, `Lately: ${x.log.slice(-3).map((l) => `day ${l.day} ${l.text}`).join(' / ')}`) : null,
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap;gap:6px' }, raise, h('button', { class: 'small', onclick: () => go(Pe.raise(x.id, Number(raise.value))) }, 'Give a raise')),
      higher.length ? h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap;gap:6px' }, promo, promoEmp, h('button', { class: 'small', onclick: () => go(Pe.promote(x.id, promo.value, promoEmp.value)) }, 'Promote'), h('span', { class: 'muted' }, why)) : null,
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap;gap:6px' }, mv, mvEmp, h('button', { class: 'small', onclick: () => go(Pe.reassign(x.id, { role: mv.value, employer: mvEmp.value })) }, 'Move')),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px;flex-wrap:wrap;gap:6px' }, h('span', { class: 'muted' }, 'May spend up to'), spend, h('span', { class: 'muted' }, 'and must ask above'), above, ...flags.map((f) => h('label', { class: 'muted' }, f.el, ` ${FL[f.k]}`)),
        h('button', { class: 'small', onclick: () => go(Pe.setAuthority(x.id, { spendLimit: Number(spend.value), approvalAbove: Number(above.value), ...Object.fromEntries(flags.map((f) => [f.k, f.el.checked])) })) }, 'Set authority')),
      h('div', { class: 'desc' }, 'Recorded now; managers act within it from the autonomous-management update.'),
      h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:4px' }, h('button', { class: 'small ghost', onclick: () => go(Pe.dismiss(x.id)) }, `Dismiss (severance ${n(x.salary * MARKET.severance)})`)));
  }

  function promoteWhy(x) {
    for (const r of Object.keys(ROLES)) {
      const rank = { staff: 0, manager: 1, executive: 2 };
      if (rank[ROLES[r].tier] <= rank[x.tier]) continue;
      const w = Pe.promoteCheck(x.id, r);
      if (!w) return `Ready for ${ROLES[r].name}.`;
    }
    return Pe.promoteCheck(x.id, Object.keys(ROLES).find((r) => ({ staff: 0, manager: 1, executive: 2 }[ROLES[r].tier] > { staff: 0, manager: 1, executive: 2 }[x.tier])) || '') || '';
  }

  // ---------------------------------------------------------------- payroll
  function payroll() {
    const s = Pe.payrollSummary();
    body.append(h('div', { class: 'grid2' }, stat('Wages paid here, a day', `${n(s.total)} obols`), stat('Arms floor staff (paid by the works)', `${n(s.armsFloorPerDay)} a day`), stat('Aerospace crews (paid by Roost)', `${n(s.aerospaceCrewsPerDay)} a day`), stat('Your wallet', `${n(g.player.money)} obols`)));
    if (s.rows.length) body.append(h('div', { class: 'list', style: 'margin-top:6px' }, ...s.rows.map((r) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, r.name), h('div', { class: 'desc' }, `${r.people} ${r.people === 1 ? 'person' : 'people'} · ${n(r.perDay)} a day · ${K.account(r.employer).funded ? `account holds ${n(K.cashOf(r.employer))}` : 'not funded: paid from your wallet'}${K.account(r.employer).funded && K.cashOf(r.employer) < r.perDay * 5 ? ' — under five days of wages' : ''}`))))));
    else body.append(h('p', { class: 'muted' }, 'No wages from here yet.'));
    body.append(h('p', { class: 'muted', style: 'font-size:12px' }, 'Wages are paid once a day at 19:05, from each employer\'s own cash (an employer you have not funded draws on your wallet, as the rest of it does). Unpaid twice and a person resigns. Arms floor staff and aerospace crews keep their own wage systems and are shown here for information; they are not paid twice.'));
    const log = (Pe.peek()?.log || []).slice(-12).reverse();
    if (log.length) body.append(h('h4', { style: 'margin:8px 0 4px' }, 'Recent'), h('div', { class: 'list' }, ...log.map((l) => h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'desc' }, `Day ${l.day} · ${l.name}: ${l.text}`))))));
  }
}
