// Mission Control (v0.103.4): every job the company can take or has taken, in one list with five states (available, active, completed, failed, archived). The missions are the real ones:
// security contracts (src/war/contracts.js), engagements (src/war/engagements.js: briefing, choosing squads and a general, estimate, result and after-action report) and battalions standing in a theatre.
// The engagement screens are the existing, tested ones drawn inside the terminal; nothing here invents a status or a result.
import { h, panel, stats, stat, btn, chip, empty, kv, tabs, fmt } from './kit.js';
import { engagementScreen, generalsScreen } from '../militaryGenerals.js';

const TABS = [['open', 'Available'], ['active', 'Active'], ['done', 'Completed'], ['failed', 'Failed'], ['archived', 'Archived']];
const state = (S) => (S.mis ||= {});
const prio = { low: 'ok', medium: 'warn', high: 'bad', urgent: 'bad', routine: '' };

export function renderMissions(cx, box) {
  const { W, S, ui } = cx; const M = W.missions(); const st = state(S);
  const tab = S.tab && (TABS.some(([id]) => id === S.tab) || S.tab === 'generals') ? S.tab : 'open';
  const sel = S.mission ? (M.open.concat(M.active, M.done, M.failed, M.archived)).find((m) => m.kind === S.mission.kind && m.id === S.mission.id) : null;
  box.append(tabs([...TABS.map(([id, label]) => ({ id, label, badge: M[id].length || null })), { id: 'generals', label: 'Generals' }], tab, (t) => { S.tab = t; S.mission = null; cx.refresh(); }));
  if (tab === 'generals') { ui.milPaged = true; ui.milSub = null; const wrap = h('div', {}); generalsScreen(ui, wrap, (r) => cx.go(r), () => cx.refresh()); box.append(panel('Generals', wrap, { sub: 'A general fights an engagement for you with the squads you choose.' })); return; }
  const list = M[tab];
  box.append(stats(stat('Available', String(M.open.length), { tone: M.open.length ? 'ok' : '' }), stat('Active', String(M.active.length), { tone: M.active.length ? 'ok' : '' }), stat('Completed', String(M.done.length)), stat('Failed', String(M.failed.length), { tone: M.failed.length ? 'warn' : '' })));
  box.append(h('div', { style: 'height:8px' }));
  const cards = list.length ? list.map((m) => h('div', { class: `osx-row tap${sel && sel.kind === m.kind && sel.id === m.id ? ' on' : ''}`, onclick: () => { S.mission = { kind: m.kind, id: m.id }; cx.refresh(); } },
    h('div', {}, h('b', {}, m.title), h('small', {}, `${m.type} · ${m.place || '—'}${m.client ? ` · ${m.client}` : ''}`), h('small', {}, m.forces ? `Forces: ${m.forces}` : m.needs ? `Needs: ${m.needs}` : ''), h('small', {}, (m.text || '').split(/(?<=[.!?])\s/)[0] || '')),
    h('div', { style: 'display:flex;flex-direction:column;gap:4px;align-items:flex-end' }, m.priority ? chip(m.priority, prio[m.priority]) : null, m.status ? chip(m.status, 'bl') : null, m.risk ? chip(`${m.risk} risk`, prio[m.risk]) : null, m.pay ? h('span', { class: 'osx-mono' }, `${fmt(m.pay)} ◎`) : null)))
    : [empty({ open: 'No offers just now. Clients call now and then; a good name brings more.', active: 'No missions under way.', done: 'No completed missions yet.', failed: 'No failed missions.', archived: 'Nothing archived: expired and declined offers appear here.' }[tab])];
  box.append(h('div', { class: 'osx-grid osx-gs' }, h('div', { class: 'osx-side', style: 'overflow:visible' }, panel(TABS.find(([id]) => id === tab)[1], cards)), h('div', { class: 'osx-side' }, sel ? detail(cx, sel) : panel('Mission detail', [empty('Select a mission to read its briefing, assign forces and follow it.')]))));
  void st;
}

function detail(cx, m) {
  const { W, ui, g } = cx; const raw = m.raw;
  if (m.kind === 'battalion') return panel(m.title, [kv('Type', m.type), kv('Status', m.status), kv('Location', String(m.place)), kv('Forces', m.forces), h('div', { class: 'osx-sub', style: 'padding:0' }, 'Battalions are commanded on the operational map: orders, supply and the front.'), btn('Open the operational map', () => ui.openPanel('strategic'), { kind: 'pri' })]);
  if (m.kind === 'engagement') {
    const wrap = h('div', {});
    ui.milPaged = true; ui.milEng = m.id; ui.milSub = 'Engagement';
    engagementScreen(ui, wrap, (r) => { ui.milSub = null; cx.go(r); }, () => { ui.milSub = null; cx.S.mission = null; cx.refresh(); });
    ui.milSub = null;
    return panel(`${m.title}`, wrap, { right: chip(m.type), sub: `${m.client || ''} · ${m.place || ''}` });
  }
  // a security contract
  const rows = [kv('Type', m.type), kv('Client', m.client), kv('Location', m.place || '—'), m.pay ? kv('Reward', `${fmt(m.pay)} ◎`) : null];
  const lines = [h('div', { class: 'osx-sub', style: 'padding:0' }, m.text || '')];
  if (raw.state === 'open') {
    rows.push(kv('Duration', `${m.days} days`), kv('Needs', m.needs), kv('Offer closes', `day ${m.expires}`), kv('Risk', m.priority || '—', prio[m.priority] === 'bad' ? 'bad' : ''));
    if (m.lacks?.length) lines.push(h('div', { class: 'osx-note bad', style: 'margin:0' }, `Your forces do not meet this one. Needs ${m.lacks.join(', ')}.`));
    lines.push(h('div', { style: 'display:flex;gap:6px' }, btn('Take the contract', () => cx.go(W.accept(m.id)), { kind: 'pri', disabled: m.lacks?.length > 0 }), btn('Decline', () => cx.go(W.decline(m.id)))));
  } else if (raw.state === 'active') {
    const crew = W.people().filter((p) => p.post === `contract:${m.id}`);
    rows.push(kv('Status', 'In progress'), kv('Assigned', `${crew.length} guards`), kv('Time left', `${m.daysLeft} days`), kv('Chance of ending well', `${Math.round((m.chance || 0) * 100)}%`, m.risk === 'high' ? 'bad' : m.risk === 'medium' ? 'warn' : 'ok'));
    lines.push(h('div', { class: 'osx-sub', style: 'padding:0' }, crew.map((p) => p.name).join(', ')));
  } else {
    rows.push(kv('Outcome', raw.state === 'done' ? 'Completed' : raw.state === 'failed' ? 'Failed' : String(raw.state)), kv('Ended', `day ${m.day ?? '—'}`));
    if (raw.state === 'done') lines.push(h('div', { class: 'osx-note', style: 'margin:0' }, `After-action: the job ended well and ${fmt(m.pay)} ◎ was paid to the company.`));
    else if (raw.state === 'failed') lines.push(h('div', { class: 'osx-note bad', style: 'margin:0' }, `After-action: it went wrong. The client was lost for a while${raw.fine ? ` and ${fmt(raw.fine)} ◎ was fined` : ''}.`));
    else lines.push(h('div', { class: 'osx-sub', style: 'padding:0' }, 'The offer lapsed or was declined; nothing was fought and nothing paid.'));
  }
  void g; return panel(m.title, [...rows.filter(Boolean), ...lines]);
}
