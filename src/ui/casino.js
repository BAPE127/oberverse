// The Phonograph Grand's screens (v0.52.0): the cage, and the tables.
//
// The tables are a first-person scene: you're sitting at the felt, the table runs away from you
// in perspective to Morganius Spade on the far side, floating, his cards about him. It is drawn
// on a canvas (a pinhole projection of the table's plane — `proj` and its inverse `unproj`, which
// is also how a click finds the square of the layout under it) with the controls as buttons over
// it. Nothing here decides anything: every bet, spin, deal and settlement is src/systems/casino.js,
// and the scene animates what that has already decided — the wheel is turned so the ball stops in
// the pocket the system drew; the cards are the round's cards, dealt in the round's order.
import { h } from './panels.js';
import { drawCard, magicCircle, EFFECTS, PURPLE } from '../engine/cardMagic.js';
import { drawPerson } from '../engine/drawPeople.js';
import { WHEEL, colourOf, betName } from '../casino/roulette.js';
import { handValue, legalActions, RULES } from '../casino/blackjack.js';

// ------------------------------------------------------------------ the cage
export function cashierPanel(ui, body) {
  const g = ui.game;
  const C = g.casino;
  const who = C.cashier();
  let amount = 50;
  const render = (msg) => {
    body.innerHTML = '';
    const s = C.state;
    const input = h('input', { type: 'number', min: 1, step: 1, value: amount, class: 'cage-input', oninput: (e) => { amount = Math.max(0, Math.floor(Number(e.target.value) || 0)); } });
    const quick = [10, 50, 100, 500, 1000].map((n) => h('button', { class: 'small', onclick: () => { amount = n; render(); } }, String(n)));
    const act = (dir, n) => {
      const r = C.exchange(dir, n ?? amount);
      ui.audio.sfx(r.ok ? 'sfx_chip' : 'sfx_fail');
      render(r);
    };
    body.append(
      h('div', { class: 'cage' },
        h('p', { class: 'muted' }, who ? `${who.profile.name} slides the ledger across. One obol buys one chip; one chip buys back one obol. No fee.` : 'Nobody is behind the cage.'),
        h('div', { class: 'grid2', style: 'margin:10px 0' },
          h('div', { class: 'stat' }, h('span', {}, 'Obols'), h('b', {}, String(g.player.money))),
          h('div', { class: 'stat' }, h('span', {}, 'Chips'), h('b', {}, String(s.chips))),
        ),
        h('div', { class: 'cage-row' }, input, ...quick),
        h('div', { class: 'cage-row' },
          h('button', { class: 'primary', disabled: !who, onclick: () => act('buy') }, `Buy ${amount} chips (${amount * g.content.casino.chipRate} obols)`),
          h('button', { disabled: !who || !s.chips, onclick: () => act('cash') }, `Cash ${amount} chips`),
          h('button', { disabled: !who || !s.chips, onclick: () => act('cash', s.chips) }, `Cash all (${s.chips})`),
        ),
        msg?.text ? h('p', { class: msg.ok ? 'good' : 'warn' }, msg.text) : null,
        h('h4', {}, 'Your account'),
        h('table', { class: 'ledger' },
          h('tr', {}, h('th', {}, 'When'), h('th', {}, 'What'), h('th', {}, 'Chips'), h('th', {}, 'Balance')),
          ...s.ledger.slice(-8).reverse().map((e) => h('tr', {}, h('td', {}, `Day ${e.day} ${e.time}`), h('td', {}, { buy: 'Bought chips', cash: 'Cashed chips', bet: 'Bet', win: 'Paid', refund: 'Bet returned' }[e.kind] || e.kind), h('td', { class: e.amount >= 0 ? 'good' : 'warn' }, `${e.amount >= 0 ? '+' : ''}${e.amount}`), h('td', {}, String(e.chips)))),
        ),
        h('p', { class: 'muted small' }, `Bought ${s.stats.bought} · cashed ${s.stats.cashed} · staked ${s.stats.staked} · won back ${s.stats.returned}`),
      ),
    );
  };
  render();
  return { title: 'The Cage — The Phonograph Grand' };
}

// ------------------------------------------------------------------ Morganius's lines
const LINES = {
  first: ['Welcome, welcome, welcome! Sit. Breathe. The cards have been expecting you.', 'Ahh, a new player. The best kind. They still believe in luck.'],
  again: ['Back again, my friend! The table remembers you.', 'You return! The cards are delighted. I am… intrigued.', 'Sit, sit. I kept your seat warm. Metaphorically.'],
  roulette: ['Place your bets, my friend. Thirty-seven pockets. One zero. Infinite possibilities.', 'The wheel has no memory. Fortunately, I do.'],
  blackjack: ['Twenty-one, my friend. No more. Rather less, usually.', 'Six decks, all honest. I checked them myself. Twice.'],
  spin: ['And… away she goes!', 'Round and round and round…', 'No more bets!'],
  win: ['Ahh! The cards smile on you!', 'Splendid! Do it again. I dare you.', 'A winner! The house weeps. Quietly.'],
  big_win: ['MAGNIFICENT! Ladies and gentlemen — a winner!', 'Oh, my friend. OH, my friend. Look at that!'],
  lose: ['Ah. The house thanks you.', 'A small donation to the arts.', 'Not this time. But the night is young.', 'Hmm. The zero sends its regards.'],
  push: ['A draw! Everyone keeps their dignity.', 'Even. How very civilised.'],
  blackjack_win: ['BLACKJACK! Three to two, my friend — beautifully done.'],
  bust: ['Twenty-two. So close. So very far.', 'Over. The cards were greedy, not you.'],
  leave: ['Until next time, my friend.', 'Go well. Come back luckier.'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ------------------------------------------------------------------ the scene's geometry
// The table's plane: u across (-1 left … 1 right), v away from you (0 the near edge … 1 the far
// edge). A pinhole camera sitting just above the near edge.
const DEPTH = 1.6; // how much farther the far edge is than the near one
function camera(W, H) {
  return { W, H, cx: W / 2, horizon: H * 0.3, near: H * 0.86, half: W * 0.6 };
}
function proj(c, u, v) {
  const z = 1 + v * DEPTH;
  return { x: c.cx + (u * c.half) / z, y: c.horizon + (c.near - c.horizon) / z, s: 1 / z };
}
function unproj(c, x, y) {
  if (y <= c.horizon + 1) return null;
  const z = (c.near - c.horizon) / (y - c.horizon);
  return { u: ((x - c.cx) * z) / c.half, v: (z - 1) / DEPTH };
}
function quad(ctx, c, u0, v0, u1, v1) {
  const a = proj(c, u0, v0);
  const b = proj(c, u1, v0);
  const d = proj(c, u1, v1);
  const e = proj(c, u0, v1);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
}

// ------------------------------------------------------------------ the roulette layout
// Twelve columns of three across the table, the zero at the left, the 2-to-1 column bets at the
// right, the dozens nearer you, the even-money bets nearest.
const LAY = { u0: -0.86, u1: 0.78, rows: [0.44, 0.34, 0.24, 0.14], dozen: [0.14, 0.08], outside: [0.08, 0.015] };
function layoutCells() {
  const cells = [];
  const cw = (LAY.u1 - LAY.u0) / 14; // zero + 12 + the 2:1 column
  const [vTop, , , vBot] = LAY.rows;
  cells.push({ bet: { type: 'straight', value: 0 }, u0: LAY.u0, u1: LAY.u0 + cw, v0: vBot, v1: vTop, label: '0', colour: 'green' });
  for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) {
    const n = c * 3 + (r + 1); // r 0 nearest: 1, 4, 7 …
    const v0 = LAY.rows[3 - r];
    const v1 = LAY.rows[2 - r];
    cells.push({ bet: { type: 'straight', value: n }, u0: LAY.u0 + cw * (c + 1), u1: LAY.u0 + cw * (c + 2), v0, v1, label: String(n), colour: colourOf(n) });
  }
  for (let r = 0; r < 3; r++) cells.push({ bet: { type: 'column', value: r + 1 }, u0: LAY.u0 + cw * 13, u1: LAY.u1, v0: LAY.rows[3 - r], v1: LAY.rows[2 - r], label: '2:1', colour: 'felt' });
  for (let d = 0; d < 3; d++) cells.push({ bet: { type: 'dozen', value: d + 1 }, u0: LAY.u0 + cw * (1 + d * 4), u1: LAY.u0 + cw * (5 + d * 4), v0: LAY.dozen[1], v1: LAY.dozen[0], label: ['1st 12', '2nd 12', '3rd 12'][d], colour: 'felt' });
  const outs = [['low', '1–18'], ['even', 'EVEN'], ['red', '◆'], ['black', '◆'], ['odd', 'ODD'], ['high', '19–36']];
  outs.forEach(([type, label], i) => cells.push({ bet: { type }, u0: LAY.u0 + cw * (1 + i * 2), u1: LAY.u0 + cw * (3 + i * 2), v0: LAY.outside[1], v1: LAY.outside[0], label, colour: type === 'red' ? 'red' : type === 'black' ? 'black' : 'felt' }));
  return cells;
}
const sameBet = (a, b) => a.type === b.type && (a.value ?? null) === (b.value ?? null);
const CHIP_COLOURS = { 1: '#e8e2d0', 5: '#d83a3a', 25: '#3aa84a', 100: '#1e1e24', 500: '#a84ad8', 1000: '#e8c35a', 5000: '#3a6ad8' };

function drawChip(ctx, x, y, r, amount, squash = 0.55) {
  const den = [5000, 1000, 500, 100, 25, 5, 1].find((d) => amount >= d) || 1;
  const col = CHIP_COLOURS[den];
  const stack = Math.min(6, 1 + Math.floor(Math.log2(Math.max(1, amount / den))));
  for (let i = 0; i < stack; i++) {
    const yy = y - i * r * 0.22;
    ctx.fillStyle = '#14121a';
    ctx.beginPath(); ctx.ellipse(x, yy + r * 0.12, r, r * squash, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, yy, r, r * squash, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.setLineDash([r * 0.35, r * 0.35]);
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath(); ctx.ellipse(x, yy, r * 0.82, r * 0.82 * squash, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (r > 7) {
    ctx.fillStyle = den === 100 || den === 5000 ? '#ffffff' : '#14121a';
    ctx.font = `bold ${Math.round(r * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(amount >= 1000 ? `${Math.round(amount / 100) / 10}k` : String(amount), x, y - (stack - 1) * r * 0.22);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

// ------------------------------------------------------------------ the scene
export function casinoTablePanel(ui, body) {
  const g = ui.game;
  const C = g.casino;
  const sess = C.state.session;
  if (!sess) { setTimeout(() => ui.closePanel(), 0); return { title: '' }; }
  const tableId = sess.table;
  const T = C.table(tableId);
  const host = g.npcs.get('npc_morganius');
  const look = host?.profile.appearance;
  body.classList.add('ct');
  const canvas = h('canvas', { class: 'ct-canvas' });
  const hud = h('div', { class: 'ct-hud' });
  const bar = h('div', { class: 'ct-bar' });
  const speech = h('div', { class: 'ct-speech hidden' });
  const banner = h('div', { class: 'ct-banner hidden' });
  body.append(canvas, hud, speech, banner, bar);
  const ctx = canvas.getContext('2d');
  const t0 = performance.now() / 1000;
  const now = () => performance.now() / 1000 - t0;
  const S = {
    intro: { at: 0, dur: C.state.visits <= 1 ? 2.4 : 1.0 },
    chip: [25, 5, 1, 100, 500, 1000, 5000].find((c) => c >= T.min && c <= T.max) || T.min,
    hover: null,
    // roulette
    spin: null, shownBets: null, lastResult: null,
    // blackjack
    bet: T.min, deal: null, msgUntil: 0,
    host: { state: 'arrive', at: 0 },
    alive: true,
  };
  if (casinoTablePanel.live) casinoTablePanel.live.alive = false; // a re-render replaces the old scene's loop
  casinoTablePanel.live = S;
  const say = (text, secs = 4) => {
    if (!text) return;
    speech.innerHTML = '';
    if (look?.portrait) speech.append(h('img', { src: look.portrait, alt: '' }));
    speech.append(h('div', {}, h('b', {}, 'Morganius Spade'), h('span', {}, text)));
    speech.classList.remove('hidden');
    clearTimeout(say.t);
    say.t = setTimeout(() => speech.classList.add('hidden'), secs * 1000);
  };
  const flash = (text, kind) => {
    banner.textContent = text;
    banner.className = `ct-banner ${kind || ''}`;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => banner.classList.add('hidden'), 3200);
  };
  const react = (kind) => { S.host = { state: kind, at: now() }; };
  say(C.state.visits <= 1 ? pick(LINES.first) : `${pick(LINES.again)} ${pick(LINES[T.game] || [''])}`, 5);
  ui.audio.sfx('sfx_magic');

  // ---------------------------------------------------------------- input
  const cells = T.game === 'roulette' ? layoutCells() : [];
  const busy = () => now() < S.intro.dur || (S.spin && now() < S.spin.end) || (S.deal && now() < S.deal.end);
  const cellAt = (mx, my) => {
    const c = camera(canvas.width, canvas.height);
    const p = unproj(c, mx, my);
    if (!p) return null;
    return cells.find((k) => p.u >= k.u0 && p.u < k.u1 && p.v >= k.v0 && p.v < k.v1) || null;
  };
  const toCanvas = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height }; };
  canvas.addEventListener('pointermove', (e) => { const p = toCanvas(e); S.hover = cellAt(p.x, p.y); });
  canvas.addEventListener('pointerdown', (e) => {
    if (now() < S.intro.dur) { S.intro.dur = now(); return; } // skip the flourish
    if (T.game !== 'roulette' || busy()) return;
    const p = toCanvas(e);
    const cell = cellAt(p.x, p.y);
    if (!cell) return;
    if (e.button === 2) { removeBet(cell); return; }
    placeBet(cell);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  const placeBet = (cell) => {
    if (S.lastResult && !S.spin) S.lastResult = null;
    const r = C.placeBet({ ...cell.bet, amount: S.chip });
    if (!r.ok) { flash(r.text, 'bad'); ui.audio.sfx('sfx_fail'); } else ui.audio.sfx('sfx_chip');
    render();
  };
  const removeBet = () => {
    // a right-click takes the whole layout back (bets are one pile per square; clearing is exact)
    const back = C.clearBets(tableId);
    if (back) { ui.audio.sfx('sfx_chip'); flash(`${back} chips back.`); }
    render();
  };
  const onKey = (e) => {
    if (!S.alive) return;
    if (now() < S.intro.dur && (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E')) { S.intro.dur = now(); e.preventDefault(); return; }
    const chips = chipList();
    if (/^[1-7]$/.test(e.key) && chips[Number(e.key) - 1]) { S.chip = chips[Number(e.key) - 1]; render(); return; }
    if (T.game === 'roulette') {
      if (e.key === ' ') { e.preventDefault(); doSpin(); }
      else if (e.key === 'Backspace' || e.key === 'c' || e.key === 'C') removeBet();
    } else if (T.game === 'blackjack') {
      const k = e.key.toLowerCase();
      if (k === 'enter' || k === ' ') { e.preventDefault(); if (!roundLive()) doDeal(); }
      else if (k === 'h') doAct('hit');
      else if (k === 's') doAct('stand');
      else if (k === 'd') doAct('double');
      else if (k === 'p') doAct('split');
      else if (k === '+' || k === '=') { S.bet = Math.min(T.max, S.bet + S.chip); render(); }
      else if (k === '-') { S.bet = Math.max(T.min, S.bet - S.chip); render(); }
    }
  };
  window.addEventListener('keydown', onKey);
  const chipList = () => [1, 5, 25, 100, 500, 1000, 5000].filter((c) => c <= T.max && c <= Math.max(T.min, C.chips) * 2).slice(0, 7);

  // ---------------------------------------------------------------- roulette
  const doSpin = () => {
    if (busy()) return;
    const ts = C.tableState(tableId);
    const bets = ts.bets.map((b) => ({ ...b }));
    const r = C.spin();
    if (!r.ok) { flash(r.text, 'bad'); ui.audio.sfx('sfx_fail'); return; }
    S.shownBets = bets;
    const t = now();
    // the wheel turns one way, the ball the other; both are set so the ball ends in pocket r.n
    const idx = WHEEL.indexOf(r.n);
    const wheelEnd = t * 0.3 + 6 + Math.random() * 2;
    S.spin = { start: t, end: t + 5.2, result: r, idx, wheelEnd, wheelStart: S.wheelAngle || 0, ballTurns: 4 + Math.floor(Math.random() * 2) };
    S.lastResult = null;
    react('roulette');
    say(pick(LINES.spin), 3);
    ui.audio.sfx('sfx_wheel');
    render();
  };
  const finishSpin = () => {
    const r = S.spin.result;
    S.lastResult = { ...r, bets: S.shownBets };
    S.spin = null;
    const net = r.returned - r.staked;
    const name = `${r.n} ${r.colour === 'green' ? 'GREEN' : r.colour.toUpperCase()}`;
    if (net > 0) { flash(`${name} — you win ${r.returned} (net +${net})`, 'good'); ui.audio.sfx('sfx_win'); react(net >= r.staked * 5 ? 'big_win' : 'win'); say(pick(LINES[net >= r.staked * 5 ? 'big_win' : 'win'])); }
    else if (r.returned > 0) { flash(`${name} — ${r.returned} back of ${r.staked}`, ''); react('push'); say(pick(LINES.push)); }
    else { flash(`${name} — the house takes ${r.staked}`, 'bad'); react('lose'); say(pick(LINES.lose)); }
    render();
  };

  // ---------------------------------------------------------------- blackjack
  const round = () => C.tableState(tableId).round;
  const roundLive = () => round()?.phase === 'player';
  /** How many cards of each hand and the dealer's the scene has dealt so far (it catches up). */
  const shown = { hands: [], dealer: 0, hole: true };
  const allCards = (r) => r.hands.reduce((a, x) => a + x.cards.length, 0) + r.dealer.length;
  const seenCount = () => shown.hands.reduce((a, x) => a + x, 0) + shown.dealer;
  const doDeal = () => {
    if (busy()) return;
    const r = C.deal(S.bet);
    if (!r.ok) { flash(r.text, 'bad'); ui.audio.sfx('sfx_fail'); return; }
    shown.hands = r.round.hands.map(() => 0);
    shown.dealer = 0;
    shown.hole = true;
    S.order = dealOrder(r.round, true);
    S.lastBJ = null;
    startDealing();
    react('blackjack');
    if (r.round.reshuffled) say('A fresh shoe, my friend. Six decks, freshly shuffled — watch.', 3);
    render();
  };
  const doAct = (a) => {
    if (busy() || !roundLive()) return;
    const before = round().hands.length;
    const r = C.act(a);
    if (!r.ok) { flash(r.text, 'bad'); ui.audio.sfx('sfx_fail'); return; }
    if (r.round.hands.length > before) {
      // a split: the second card moves across, both hands are dealt one more
      shown.hands = [1, 1];
    }
    S.order = dealOrder(r.round, false);
    startDealing();
    render();
  };
  /** The order the cards reach the table: on the deal, player-dealer-player-dealer; then whatever's new. */
  const dealOrder = (r, fresh) => {
    const out = [];
    if (fresh) {
      out.push({ hand: 0 }, { dealer: true }, { hand: 0 }, { dealer: true });
    }
    r.hands.forEach((hd, i) => { const have = (shown.hands[i] || 0) + out.filter((o) => o.hand === i).length; for (let k = have; k < hd.cards.length; k++) out.push({ hand: i }); });
    const dHave = shown.dealer + out.filter((o) => o.dealer).length;
    if (r.phase === 'done' && (r.hands.length > 0)) out.push({ reveal: true });
    for (let k = dHave; k < r.dealer.length; k++) out.push({ dealer: true });
    return out;
  };
  const startDealing = () => {
    const t = now();
    S.deal = { start: t, step: 0.42, end: t + S.order.length * 0.42 + 0.3 };
    S.dealt = 0;
  };
  const stepDealing = (t) => {
    if (!S.deal) return;
    while (S.dealt < S.order.length && t >= S.deal.start + S.dealt * S.deal.step) {
      const o = S.order[S.dealt++];
      if (o.reveal) { shown.hole = false; ui.audio.sfx('sfx_card'); continue; }
      if (o.dealer) shown.dealer++;
      else shown.hands[o.hand] = (shown.hands[o.hand] || 0) + 1;
      ui.audio.sfx('sfx_card');
    }
    if (t >= S.deal.end) {
      S.deal = null;
      const r = round();
      if (r && r.phase === 'done' && !S.lastBJ) {
        shown.hole = false;
        S.lastBJ = r;
        const ret = r.results.reduce((a, x) => a + x.returned, 0);
        const staked = r.results.reduce((a, x) => a + x.bet, 0);
        const net = ret - staked;
        const words = r.results.map((x) => ({ blackjack: 'Blackjack!', win: 'Win', push: 'Push', lose: 'Lose', bust: 'Bust' }[x.outcome])).join(' · ');
        if (net > 0) { flash(`${words} — +${net}`, 'good'); ui.audio.sfx('sfx_win'); react(net >= staked * 1.5 ? 'big_win' : 'win'); say(pick(r.results.some((x) => x.outcome === 'blackjack') ? LINES.blackjack_win : LINES.win)); }
        else if (net === 0) { flash(`${words}`, ''); react('push'); say(pick(LINES.push)); }
        else { flash(`${words} — ${net}`, 'bad'); react('lose'); say(pick(r.results.every((x) => x.outcome === 'bust') ? LINES.bust : LINES.lose)); }
      }
      render();
    }
  };

  // ---------------------------------------------------------------- the controls
  const btn = (label, fn, opts = {}) => h('button', { class: opts.cls || '', disabled: opts.disabled || false, title: opts.title || '', onclick: () => { ui.audio.sfx('sfx_ui_click'); fn(); } }, label);
  const render = () => {
    const s = C.state;
    hud.innerHTML = '';
    hud.append(
      h('div', { class: 'ct-title' }, h('b', {}, T.name), h('span', {}, `Bets ${T.min}–${T.max} · ${T.game === 'roulette' ? 'single zero' : RULES[0]}`)),
      h('div', { class: 'ct-chips' }, h('span', {}, 'Chips'), h('b', {}, String(s.chips))),
    );
    if (T.game === 'roulette') {
      const hist = s.history[tableId] || [];
      hud.append(h('div', { class: 'ct-hist' }, ...hist.slice(0, 12).map((n) => h('span', { class: colourOf(n) }, String(n)))));
    }
    bar.innerHTML = '';
    const chips = chipList();
    bar.append(h('div', { class: 'ct-chipset' }, ...chips.map((c, i) => h('button', { class: `chip c${c}${S.chip === c ? ' on' : ''}`, title: `${i + 1}`, onclick: () => { S.chip = c; render(); } }, String(c)))));
    if (T.game === 'roulette') {
      const ts = C.tableState(tableId);
      const on = ts.bets.reduce((a, b) => a + b.amount, 0);
      bar.append(
        h('div', { class: 'ct-info' }, on ? `${on} on the layout · ${ts.bets.length} bet${ts.bets.length === 1 ? '' : 's'}` : 'Click the layout to bet · right-click to take it back'),
        btn('Clear (C)', removeBet, { disabled: !on || Boolean(S.spin) }),
        btn('Spin (Space)', doSpin, { cls: 'primary', disabled: !on || Boolean(S.spin) }),
      );
    } else if (T.game === 'blackjack') {
      const r = round();
      const live = r?.phase === 'player';
      const legal = live ? legalActions(r) : [];
      const dealing = Boolean(S.deal);
      if (!live) {
        bar.append(
          h('div', { class: 'ct-info' }, `Bet ${S.bet}`),
          btn('−', () => { S.bet = Math.max(T.min, S.bet - S.chip); render(); }, { disabled: dealing }),
          btn('+', () => { S.bet = Math.min(T.max, S.bet + S.chip); render(); }, { disabled: dealing }),
          btn(`Deal ${S.bet} (Enter)`, doDeal, { cls: 'primary', disabled: dealing || s.chips < S.bet }),
        );
      } else {
        bar.append(
          h('div', { class: 'ct-info' }, r.hands.length > 1 ? `Hand ${r.active + 1} of ${r.hands.length}` : `Bet ${r.hands[0].bet}`),
          btn('Hit (H)', () => doAct('hit'), { cls: 'primary', disabled: dealing || !legal.includes('hit') }),
          btn('Stand (S)', () => doAct('stand'), { disabled: dealing || !legal.includes('stand') }),
          btn('Double (D)', () => doAct('double'), { disabled: dealing || !legal.includes('double') }),
          btn('Split (P)', () => doAct('split'), { disabled: dealing || !legal.includes('split') }),
        );
      }
    }
    bar.append(btn('Leave', () => tryLeave(), { cls: 'ct-leave', disabled: !C.canLeave() || Boolean(S.spin) }));
  };
  const tryLeave = () => {
    if (S.spin || !C.canLeave()) { flash('Finish the hand first, my friend.', 'bad'); return; }
    ui.closePanel();
  };

  // ---------------------------------------------------------------- drawing
  const drawRoom = (c, t) => {
    const { W, H } = c;
    const bg = ctx.createLinearGradient(0, 0, 0, c.horizon + H * 0.1);
    bg.addColorStop(0, '#0c0810'); bg.addColorStop(1, '#2a1420');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // the casino behind him, out of focus: warm lights, a gold rail, the glow of other tables
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137.5) % 1) * W + ((i * 977) % W);
      const y = c.horizon * (0.15 + ((i * 53) % 70) / 100);
      const r = 8 + ((i * 31) % 22);
      const a = 0.08 + 0.06 * Math.sin(t * 0.7 + i);
      const gr = ctx.createRadialGradient(x % W, y, 0, x % W, y, r * 2.4);
      gr.addColorStop(0, `rgba(255,${180 + (i % 5) * 12},${110 + (i % 3) * 40},${a * 2})`);
      gr.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gr;
      ctx.fillRect((x % W) - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    }
    ctx.fillStyle = 'rgba(201,162,74,0.35)';
    ctx.fillRect(0, c.horizon - H * 0.035, W, Math.max(2, H * 0.004));
    // a chandelier
    const cx = W * 0.78;
    ctx.fillStyle = 'rgba(255,230,170,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, H * 0.05, W * 0.12, H * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(255,240,200,${0.5 + 0.3 * Math.sin(t * 2 + i)})`; ctx.fillRect(cx - W * 0.08 + i * W * 0.02, H * 0.06 + Math.sin(i) * 4, 3, 3); }
  };
  const drawHost = (c, t) => {
    if (!look) return;
    const { W, H } = c;
    const intro = Math.min(1, t / Math.max(0.01, S.intro.dur));
    const scale = Math.max(3, Math.round(H / 150));
    const bob = Math.sin(t * 2.1) * scale * 1.5;
    const x = W * 0.5;
    const y = c.horizon + H * 0.07 + bob;
    const hs = now() - S.host.at;
    // the arrival: a circle in the air, cards bursting out and snapping into his hands
    if (t < S.intro.dur + 0.4) {
      magicCircle(ctx, x, y - 6 * scale, 26 * scale * Math.min(1, intro * 2), t * 1.5, { squash: 0.35, alpha: 1 - Math.max(0, (t - S.intro.dur) / 0.4) });
      EFFECTS.scatter(ctx, { x, y: y - 16 * scale, n: 26, r: 60 * scale, h: 6 * scale, k: 0.5 + intro * 0.5, seed: 4, glow: true }, t);
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, intro * 1.6);
    ctx.imageSmoothingEnabled = false;
    drawPerson(ctx, look, { x, y, facing: 'down', scale, idleTime: t });
    ctx.restore();
    // his hands, and the cards about them — which trick depends on what just happened
    const lh = { x: x - 8 * scale, y: y - 11 * scale };
    const rh = { x: x + 8 * scale, y: y - 11 * scale };
    const cardH = 5 * scale;
    const st = S.host.state;
    if (st === 'win' || st === 'big_win') {
      EFFECTS.fan(ctx, { x: rh.x, y: rh.y, n: st === 'big_win' ? 9 : 6, h: cardH * 1.4, spread: 2.2, open: Math.min(1, hs * 2), rot: -0.2, glow: true, cards: [12, 25, 38, 51, 11, 24, 37, 50, 10] }, t);
      if (st === 'big_win') EFFECTS.spiral(ctx, { x, y: y + 2 * scale, height: 46 * scale, r: 22 * scale, n: 18, h: cardH, speed: 0.5, glow: true }, t);
    } else if (st === 'lose') {
      // the cards run up one arm, across his shoulders and down the other
      EFFECTS.path(ctx, { pts: [lh, { x: x - 7 * scale, y: y - 15 * scale }, { x, y: y - 14 * scale }, { x: x + 7 * scale, y: y - 15 * scale }, rh], n: 7, h: cardH, speed: 0.5, gap: 0.7 }, t);
    } else if (st === 'roulette' && hs < 2) {
      EFFECTS.spiral(ctx, { x: rh.x, y: rh.y + 6 * scale, height: 18 * scale, r: 6 * scale, n: 8, h: cardH * 0.8, speed: 1.4, glow: true }, t);
    } else {
      EFFECTS.orbit(ctx, { x: lh.x, y: lh.y, r: 4 * scale, n: 3, h: cardH, speed: 2.2 }, t);
      EFFECTS.orbit(ctx, { x: rh.x, y: rh.y, r: 4 * scale, n: 3, h: cardH, speed: -1.9 }, t);
    }
    // the purple light of his magic on the felt below him
    const gr = ctx.createRadialGradient(x, c.horizon + H * 0.06, 0, x, c.horizon + H * 0.06, W * 0.25);
    gr.addColorStop(0, 'rgba(176,90,240,0.18)');
    gr.addColorStop(1, 'rgba(176,90,240,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - W * 0.25, c.horizon, W * 0.5, H * 0.2);
    S.hands = { lh, rh, scale };
  };
  const drawTable = (c, felt) => {
    // the rail all round, the felt inside it
    ctx.fillStyle = '#2a1410';
    quad(ctx, c, -1.25, -0.2, 1.25, 1.06); ctx.fill();
    ctx.fillStyle = '#4a2418';
    quad(ctx, c, -1.18, -0.2, 1.18, 1.02); ctx.fill();
    const a = proj(c, 0, 0);
    const b = proj(c, 0, 1);
    const fg = ctx.createLinearGradient(0, b.y, 0, a.y);
    fg.addColorStop(0, felt[0]); fg.addColorStop(1, felt[1]);
    ctx.fillStyle = fg;
    quad(ctx, c, -1.1, -0.2, 1.1, 0.98); ctx.fill();
    // the gold edge of the far rail
    ctx.strokeStyle = '#c9a24a';
    ctx.lineWidth = 2;
    const l = proj(c, -1.18, 1.02);
    const r = proj(c, 1.18, 1.02);
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
  };
  const drawLayout = (c, t) => {
    const ts = C.tableState(tableId);
    const bets = S.spin ? S.shownBets : S.lastResult && !ts.bets.length ? S.lastResult.bets : ts.bets;
    const win = S.lastResult?.n;
    for (const k of cells) {
      quad(ctx, c, k.u0, k.v0, k.u1, k.v1);
      ctx.fillStyle = k.colour === 'red' ? '#b8202a' : k.colour === 'black' ? '#16141c' : k.colour === 'green' ? '#1e8a3a' : 'rgba(0,0,0,0.08)';
      if (k.label === '◆') ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fill();
      const lit = (S.lastResult && k.bet.type === 'straight' && k.bet.value === win) || (S.hover === k && !S.spin);
      ctx.strokeStyle = lit ? '#fff0a0' : 'rgba(240,232,208,0.85)';
      ctx.lineWidth = lit ? 3 : 1.2;
      ctx.stroke();
      if (S.lastResult && k.bet.type === 'straight' && k.bet.value === win) { ctx.fillStyle = `rgba(255,240,160,${0.25 + 0.2 * Math.sin(t * 6)})`; ctx.fill(); }
      const m = proj(c, (k.u0 + k.u1) / 2, (k.v0 + k.v1) / 2);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.scale(1, 0.75);
      ctx.fillStyle = '#f4ecd8';
      const fs = Math.max(9, Math.round(c.H * 0.034 * m.s * 1.6));
      ctx.font = `bold ${fs}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (k.label === '◆') { ctx.fillStyle = k.colour === 'red' ? '#d83a3a' : '#16141c'; ctx.fillText('◆', 0, 0); }
      else ctx.fillText(k.label, 0, 0);
      ctx.restore();
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // the chips on it
    for (const b of bets || []) {
      const k = cells.find((x) => sameBet(x.bet, b));
      if (!k) continue;
      const m = proj(c, (k.u0 + k.u1) / 2, (k.v0 + k.v1) / 2);
      drawChip(ctx, m.x, m.y, Math.max(6, c.H * 0.024 * m.s * 1.7), b.amount);
    }
    if (S.hover && !S.spin && !busy()) {
      const k = S.hover;
      const m = proj(c, (k.u0 + k.u1) / 2, (k.v0 + k.v1) / 2);
      ctx.globalAlpha = 0.5;
      drawChip(ctx, m.x, m.y - 6, Math.max(6, c.H * 0.024 * m.s * 1.7), S.chip);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10,6,14,0.75)';
      const tip = `${betName(k.bet)} · pays ${{ straight: 35, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1, dozen: 2, column: 2 }[k.bet.type]} to 1`;
      ctx.font = `${Math.round(c.H * 0.022)}px system-ui, sans-serif`;
      const tw = ctx.measureText(tip).width;
      ctx.fillRect(m.x - tw / 2 - 8, m.y - c.H * 0.08, tw + 16, c.H * 0.036);
      ctx.fillStyle = '#f4ecd8';
      ctx.fillText(tip, m.x - tw / 2, m.y - c.H * 0.08 + c.H * 0.026);
    }
  };
  const drawWheel = (c, t) => {
    // the wheel sits in the table's far left corner, seen at the table's angle
    const m = proj(c, -0.62, 0.78);
    const R = c.H * 0.28 * m.s * 1.9;
    const squash = 0.42;
    let wheelA = S.wheelAngle || 0;
    let ballA = 0;
    let ballR = R * 0.92;
    let ballVisible = Boolean(S.spin || S.lastResult);
    const pocketA = (i) => (i / 37) * Math.PI * 2;
    if (S.spin) {
      const sp = S.spin;
      const k = Math.min(1, (t - sp.start) / (sp.end - sp.start));
      const e = 1 - (1 - k) ** 3;
      wheelA = sp.wheelStart + (sp.wheelEnd - sp.wheelStart) * e;
      // the ball runs the other way round the rim, slows, spirals in and settles into the pocket
      const finalA = wheelA + pocketA(sp.idx);
      ballA = finalA - (1 - e) * Math.PI * 2 * sp.ballTurns;
      ballR = R * (0.92 - 0.26 * Math.min(1, Math.max(0, (k - 0.55) / 0.4)));
      if (k >= 1) finishSpin();
    } else if (S.lastResult) {
      ballA = wheelA + pocketA(WHEEL.indexOf(S.lastResult.n));
      ballR = R * 0.66;
    }
    S.wheelAngle = S.spin ? wheelA : wheelA + 0.004;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(1, squash);
    // the bowl
    ctx.fillStyle = '#2a140c';
    ctx.beginPath(); ctx.arc(0, 0, R * 1.12, 0, Math.PI * 2); ctx.fill();
    const wood = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * 1.05);
    wood.addColorStop(0, '#9a5a32'); wood.addColorStop(1, '#4a2414');
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    // the pockets
    for (let i = 0; i < 37; i++) {
      const a0 = wheelA + pocketA(i) - Math.PI / 37;
      const a1 = a0 + (Math.PI * 2) / 37;
      const n = WHEEL[i];
      ctx.fillStyle = n === 0 ? '#1e8a3a' : colourOf(n) === 'red' ? '#b8202a' : '#16141c';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.86, a0, a1); ctx.arc(0, 0, R * 0.6, a1, a0, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9a24a';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (R > 60) {
        const am = (a0 + a1) / 2;
        ctx.save();
        ctx.rotate(am);
        ctx.translate(R * 0.78, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#f4ecd8';
        ctx.font = `bold ${Math.round(R * 0.07)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(n), 0, R * 0.025);
        ctx.restore();
      }
    }
    // the cone and the gold turret
    const cone = ctx.createRadialGradient(-R * 0.15, -R * 0.15, 0, 0, 0, R * 0.58);
    cone.addColorStop(0, '#c08a52'); cone.addColorStop(1, '#5a2e18');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8c35a';
    ctx.lineWidth = Math.max(2, R * 0.04);
    for (let i = 0; i < 4; i++) { const a = wheelA * 1 + (i * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32); ctx.stroke(); }
    ctx.fillStyle = '#e8c35a';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (ballVisible) {
      const bx = m.x + Math.cos(ballA) * ballR;
      const by = m.y + Math.sin(ballA) * ballR * squash;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(bx + 2, by + 2, R * 0.04, R * 0.025, 0, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createRadialGradient(bx - R * 0.012, by - R * 0.015, 0, bx, by, R * 0.04);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c8c8c0');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(bx, by, Math.max(3, R * 0.036), 0, Math.PI * 2); ctx.fill();
    }
  };
  /** A card lying on the felt at (u, v): drawn at the table's angle. `from` makes it fly there. */
  const tableCard = (c, u, v, card, faceUp, fly) => {
    const p = proj(c, u, v);
    const hh = c.H * 0.2 * p.s * 1.4;
    let x = p.x;
    let y = p.y;
    let flat = 0.62;
    let rot = 0;
    if (fly && fly.k < 1 && S.hands) {
      // out of his hand, over in an arc, turning as it comes
      const k = fly.k;
      const e = 1 - (1 - k) ** 2;
      const sx = S.hands.rh.x;
      const sy = S.hands.rh.y;
      x = sx + (p.x - sx) * e;
      y = sy + (p.y - sy) * e - Math.sin(k * Math.PI) * c.H * 0.08;
      flat = 0.62 + (1 - e) * 0.38;
      rot = (1 - e) * 2.4;
      ctx.save();
      ctx.shadowColor = PURPLE;
      ctx.shadowBlur = 14 * (1 - k);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, flat);
    drawCard(ctx, 0, 0, hh * (fly && fly.k < 1 ? 0.7 + 0.3 * fly.k : 1), rot, { card: faceUp ? card : null, flip: faceUp ? 1 : -1 });
    ctx.restore();
    if (fly && fly.k < 1 && S.hands) ctx.restore();
  };
  const drawBlackjack = (c, t) => {
    // the printed arc on the felt
    ctx.save();
    ctx.strokeStyle = 'rgba(232,195,90,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const a = Math.PI * (i / 40); const p = proj(c, Math.cos(a) * 0.75, 0.62 - Math.sin(a) * 0.3); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    ctx.stroke();
    const lab = proj(c, 0, 0.46);
    ctx.fillStyle = 'rgba(232,195,90,0.85)';
    ctx.font = `bold ${Math.round(c.H * 0.026)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('BLACKJACK PAYS 3 TO 2', lab.x, lab.y);
    ctx.font = `${Math.round(c.H * 0.018)}px Georgia, serif`;
    ctx.fillText('Dealer stands on all 17s', lab.x, lab.y + c.H * 0.03);
    ctx.restore();
    // the shoe
    const sh = proj(c, 0.82, 0.86);
    ctx.fillStyle = '#2a1a12';
    ctx.fillRect(sh.x - c.H * 0.05, sh.y - c.H * 0.03, c.H * 0.1, c.H * 0.05);
    ctx.fillStyle = '#4a1e6a';
    ctx.fillRect(sh.x - c.H * 0.045, sh.y - c.H * 0.025, c.H * 0.06, c.H * 0.03);
    const r = round();
    if (!r) {
      const b = proj(c, 0, 0.12);
      drawChip(ctx, b.x, b.y, c.H * 0.03, S.bet);
      return;
    }
    const dealing = S.deal;
    const flyK = dealing ? Math.min(1, (t - (dealing.start + (S.dealt - 1) * dealing.step)) / dealing.step) : 1;
    const lastO = dealing ? S.order[S.dealt - 1] : null;
    // the dealer's cards, across the far side of the arc
    const dn = shown.dealer;
    for (let i = 0; i < dn; i++) {
      const face = !(i === 1 && shown.hole);
      const isLast = lastO?.dealer && i === dn - 1;
      tableCard(c, -0.18 + i * 0.16, 0.7, r.dealer[i], face, isLast ? { k: flyK } : null);
    }
    if (dn && (!shown.hole || dn > 2)) {
      const v = handValue(r.dealer.slice(0, dn)).total;
      const p = proj(c, -0.18 + dn * 0.16 + 0.06, 0.7);
      label(p.x, p.y, `Dealer ${v}`, c);
    } else if (dn) {
      const p = proj(c, 0.2, 0.7);
      label(p.x, p.y, `Dealer shows ${handValue(r.dealer.slice(0, 1)).total}`, c);
    }
    // your hands, near you
    r.hands.forEach((hd, hi) => {
      const n = shown.hands[hi] || 0;
      const baseU = r.hands.length === 1 ? -0.1 : hi === 0 ? -0.5 : 0.18;
      for (let i = 0; i < n; i++) {
        const isLast = lastO && lastO.hand === hi && i === n - 1;
        tableCard(c, baseU + i * 0.12, 0.2 - i * 0.012, hd.cards[i], true, isLast ? { k: flyK } : null);
      }
      const chipAt = proj(c, baseU + 0.05, 0.05);
      drawChip(ctx, chipAt.x, chipAt.y, c.H * 0.026, hd.bet);
      if (n) {
        const val = handValue(hd.cards.slice(0, n));
        const p = proj(c, baseU + n * 0.12 + 0.06, 0.2);
        const res = !dealing && r.phase === 'done' ? r.results[hi] : null;
        const tag = res ? ` · ${{ blackjack: 'BLACKJACK', win: 'WIN', push: 'PUSH', lose: 'LOSE', bust: 'BUST' }[res.outcome]}` : '';
        label(p.x, p.y, `${val.soft && val.total < 21 ? 'soft ' : ''}${val.total}${tag}`, c, r.phase === 'player' && r.active === hi && r.hands.length > 1);
      }
    });
  };
  const label = (x, y, text, c, hi = false) => {
    ctx.font = `bold ${Math.round(c.H * 0.024)}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width;
    ctx.fillStyle = hi ? 'rgba(176,90,240,0.85)' : 'rgba(10,6,14,0.78)';
    ctx.fillRect(x - 6, y - c.H * 0.028, w + 12, c.H * 0.038);
    ctx.fillStyle = '#f4ecd8';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  };
  const frame = () => {
    if (!S.alive) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(canvas.clientWidth * dpr);
    const bh = Math.round(canvas.clientHeight * dpr);
    if (bw && bh && (canvas.width !== bw || canvas.height !== bh)) { canvas.width = bw; canvas.height = bh; }
    const c = camera(canvas.width, canvas.height);
    const t = now();
    stepDealing(t);
    drawRoom(c, t);
    drawHost(c, t);
    drawTable(c, T.game === 'roulette' && T.max >= 2500 ? ['#163a5a', '#1e4a6e'] : T.max >= 2000 ? ['#4a1424', '#5e1a2e'] : ['#145a30', '#1e7a40']);
    if (T.game === 'roulette') { drawWheel(c, t); drawLayout(c, t); }
    else if (T.game === 'blackjack') drawBlackjack(c, t);
    // a vignette, for the room's light
    const vg = ctx.createRadialGradient(c.W / 2, c.H * 0.55, c.H * 0.3, c.W / 2, c.H * 0.55, c.W * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, c.W, c.H);
    if (t < S.intro.dur) {
      ctx.fillStyle = 'rgba(244,236,216,0.7)';
      ctx.font = `${Math.round(c.H * 0.02)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('click or press Space to skip', c.W / 2, c.H - 90);
      ctx.textAlign = 'left';
    }
    requestAnimationFrame(frame);
  };
  render();
  requestAnimationFrame(frame);
  return {
    title: '',
    className: 'casino-table',
    onClose: () => {
      S.alive = false;
      window.removeEventListener('keydown', onKey);
      clearTimeout(say.t);
      clearTimeout(flash.t);
      C.leave();
      ui.showCaption(pick(LINES.leave), 3);
    },
  };
}
