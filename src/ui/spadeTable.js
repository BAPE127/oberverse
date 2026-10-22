// Morganius's Table — the Spade's Gambit (v0.53.0): the scene. The rules are src/casino/rogue.js,
// the money src/systems/casino.js (rogueAct, settleRun); this draws and animates what they decide.
//
// Every card on screen is a sprite that eases towards where it belongs — in your hand, raised
// when chosen, on the felt when played, off to the used pile, or flying in from Morganius's hand
// when dealt — so sorting, playing, redrawing and dealing all move by themselves. A play is then
// told step by step in the rules' own scoring order: each card pops with its Pips, each Ink and
// Curio flashes with what it adds, the running Pips × Gasps climbs, and the total bursts.
import { h } from './panels.js';
import { drawCard, EFFECTS, magicCircle, Sparks } from '../engine/cardMagic.js';
import { MorganiusPuppet } from '../engine/drawMorganius.js';
import { camera, quad, drawRoom, drawHost, pick } from './casino.js';
import { rank, suit, label as cardLabel, HAND_NAMES } from '../casino/cards.js';
import { scoreHand, peek, HANDS, INKS, CURIOS, TWISTS, TRICK_NAMES, ACTS, ENTRY, PAYOUT, MAX_CURIOS, isFinale, MARVELS, SPELLS, MAX_SPELLS } from '../casino/rogue.js';

const LINES = {
  welcome: ['Ahh. My table. Sit, my friend — this game I invented myself, and it has never once been fair to me.', 'The Spade\'s Gambit: your deck, my tricks, three acts. Shall we?'],
  start: ['Your deck, freshly shuffled. Let us begin with something small.', 'Curtain up!'],
  twist: ['The Finale — and a little twist, of course. I can\'t help myself.', 'Now, for the Finale, I change the rules. Slightly. Unfairly.'],
  big: ['Ohh! Now THAT is a hand!', 'Magnificent! Do that again!', 'The audience gasps!'],
  small: ['Modest. Elegant. Insufficient.', 'A start, my friend. A start.'],
  won: ['Applause! The Trick is yours.', 'Bravo! Into my Cabinet — spend your Sparks wisely.'],
  lost: ['And the curtain falls. Not tonight, my friend.', 'The house takes its bow. Come back with a better deck.'],
  champion: ['ALL THREE ACTS! My friend — I have nothing left up my sleeve. Take a bow.'],
};

const SPELL_LINES = {
  transmute: ['Hearts to spades, spades to hearts — the suits are merely suggestions.'],
  ascend: ['Up you go! Promotion, my friend. Everyone deserves one.'],
  doppel: ['Two of you now. Don\'t let it go to your head.'],
  vanishing: ['…and they\'re GONE. Don\'t look in my sleeve.'],
  gilding: ['A little gold leaf never hurt anyone. Except the leaf.'],
  encore_spell: ['The audience demands more! One more Play.'],
  sleight: ['Quick hands, my friend. Two more Redraws.'],
  rehearsal: ['Again, from the top! You\'ll do that hand better now.'],
  conjure: ['Out of thin air — a Marvel. Mind its manners.'],
  midas: ['Sparks, sparks! Everything you touch.'],
};
const cardName = (d) => (d.marvel === 'phantom' ? 'the Phantom' : `${cardLabel(d.c)}${d.marvel ? ` (${MARVELS[d.marvel].name})` : ''}`);

const SPARK = '#e8c35a';
const PIPS_C = '#5ac8ff';
const GASPS_C = '#ff7ac8';

export function spadeTablePanel(ui, body) {
  const g = ui.game;
  const C = g.casino;
  const look = g.npcs.get('npc_morganius')?.profile.appearance;
  body.classList.add('ct', 'sg');
  const canvas = h('canvas', { class: 'ct-canvas' });
  const hud = h('div', { class: 'sg-hud' });
  const curiosEl = h('div', { class: 'sg-curios' });
  const spellsEl = h('div', { class: 'sg-spells' });
  const preview = h('div', { class: 'sg-preview' });
  const bar = h('div', { class: 'ct-bar' });
  const speech = h('div', { class: 'ct-speech hidden' });
  const banner = h('div', { class: 'ct-banner hidden' });
  const overlay = h('div', { class: 'sg-overlay hidden' });
  body.append(canvas, hud, curiosEl, spellsEl, preview, speech, banner, bar, overlay);
  const ctx = canvas.getContext('2d');
  const t0 = performance.now() / 1000;
  const now = () => performance.now() / 1000 - t0;
  const S = {
    alive: true, introDur: C.state.visits <= 1 ? 2.2 : 0.9,
    sel: [], sort: 'rank', sprites: new Map(), anim: null, host: { state: 'idle', at: 0 },
    pops: [], hands: null, overlayFor: null, vanishPick: false, showHands: false,
    puppet: new MorganiusPuppet(), sparks: new Sparks(), spellFx: [], spawnFrom: new Map(),
  };
  if (spadeTablePanel.live) spadeTablePanel.live.alive = false;
  spadeTablePanel.live = S;
  const run = () => C.rogue.run;
  const say = (text, secs = 4) => {
    if (!text) return;
    speech.innerHTML = '';
    if (look?.portrait) speech.append(h('img', { src: look.portrait, alt: '' }));
    speech.append(h('div', {}, h('b', {}, 'Morganius Spade'), h('span', {}, text)));
    speech.classList.remove('hidden');
    S.puppet.talk(now() + Math.min(secs, 0.6 + text.length * 0.04));
    clearTimeout(say.t);
    say.t = setTimeout(() => speech.classList.add('hidden'), secs * 1000);
  };
  const flash = (text, kind, secs = 2.6) => {
    banner.textContent = text;
    banner.className = `ct-banner ${kind || ''}`;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => banner.classList.add('hidden'), secs * 1000);
  };
  const react = (mood) => { S.host = { state: mood, at: now() }; };
  const fail = (r) => { if (r && r.ok === false) { flash(r.text, 'bad'); ui.audio.sfx('sfx_fail'); return true; } return false; };

  // ---------------------------------------------------------------- where things go
  const geo = () => {
    const W = canvas.width;
    const H = canvas.height;
    const cardH = Math.min(H * 0.21, W * 0.11);
    return { W, H, cardH, handY: H - cardH * 0.62 - Math.max(96, H * 0.13), feltY: H * 0.53, usedX: W * 0.1, usedY: H * 0.5, deckX: W * 0.9, deckY: H * 0.5 };
  };
  const cardOf = (id) => run()?.deck.find((d) => d.id === id) || S.ghosts?.get(id);
  const sortedHand = () => {
    const r = run();
    if (!r) return [];
    const ids = [...r.hand];
    const key = (id) => { const d = cardOf(id); if (d.marvel === 'phantom') return -1000; return S.sort === 'rank' ? -(rank(d.c) * 4 + (3 - suit(d.c))) : suit(d.c) * 20 - rank(d.c); };
    return ids.sort((a, b) => key(a) - key(b));
  };
  /** Where each card in hand wants to be: a gentle fan, the chosen ones raised. */
  const handSlots = (ids) => {
    const G = geo();
    const n = ids.length;
    const gap = Math.min(G.cardH * 0.78, (G.W * 0.8) / Math.max(1, n));
    const out = new Map();
    ids.forEach((id, i) => {
      const k = n === 1 ? 0 : i / (n - 1) - 0.5;
      const sel = S.sel.includes(id);
      out.set(id, { x: G.W / 2 + (i - (n - 1) / 2) * gap, y: G.handY + Math.abs(k) * G.cardH * 0.12 - (sel ? G.cardH * 0.28 : 0), rot: k * 0.22, s: 1, a: 1 });
    });
    return out;
  };
  const spriteFor = (id, start) => {
    let sp = S.sprites.get(id);
    if (!sp) { sp = { x: start.x, y: start.y, rot: start.rot ?? 0, s: start.s ?? 0.5, a: start.a ?? 1, face: true }; S.sprites.set(id, sp); }
    return sp;
  };
  const fromHost = () => {
    const G = geo();
    const rh = S.hands?.rh || { x: G.W / 2 + 40, y: G.H * 0.28 };
    return { x: rh.x, y: rh.y, rot: -1.2, s: 0.3 };
  };

  /** Send a card flying somewhere on a magic arc (spinning, trailing sparks, landing in a burst). */
  const launch = (sp, tg, t, delay = 0) => {
    sp.target = tg;
    sp.fly = { from: { x: sp.x, y: sp.y }, at: t + delay, dur: 0.5, spin: (Math.random() < 0.5 ? -1 : 1) * Math.PI * 2 };
  };

  // ---------------------------------------------------------------- spells
  const castSpell = (i) => {
    const r = run();
    if (busy() || r?.phase !== 'play' || !r.spells[i]) return;
    const id = r.spells[i];
    const ids = [...S.sel];
    const G = geo();
    const before = new Map(ids.map((x) => [x, { ...cardOf(x) }]));
    const res = C.rogueAct('cast', { i, ids });
    if (fail(res)) return;
    const t = now();
    ui.audio.sfx('sfx_magic');
    S.puppet.setPose('conjure', t, 1.3);
    react('conjure');
    flash(`✦ ${SPELLS[id].name} ✦`, 'good', 1.8);
    // the spell takes: a circle and a burst on each card it touches; changed cards turn over to show their new face
    for (const x of res.changed || []) {
      const sp = S.sprites.get(x);
      if (!sp) continue;
      S.spellFx.push({ x: sp.x, y: sp.y, t, r: G.cardH * 0.7 });
      S.sparks.burst(sp.x, sp.y, t, { n: 22, size: G.cardH / 140 });
      const old = before.get(x);
      const now2 = cardOf(x);
      if (old && now2 && (old.c !== now2.c || old.ink !== now2.ink)) sp.turnAt = t;
    }
    for (const x of res.gone || []) {
      const sp = S.sprites.get(x);
      if (sp) { sp.target = { x: sp.x, y: sp.y - G.cardH * 1.4, rot: sp.rot + 2, s: 0.4, a: 0 }; sp.vanishing = true; S.sparks.burst(sp.x, sp.y, t, { n: 30, size: G.cardH / 120 }); }
    }
    // new cards (a Doppelgänger, a Conjuring) come out of the air between his hands
    for (const x of res.added || []) S.spawnFrom.set(x, { at: 'conjure' });
    S.sel = [];
    say(pick(SPELL_LINES[id] || ['Abracadabra. Literally.']), 3);
    render();
  };
  const dropSpell = (i) => {
    const r = C.rogueAct('dropSpell', i);
    if (!fail(r)) render();
  };

  // ---------------------------------------------------------------- actions
  const busy = () => Boolean(S.anim);
  const toggle = (id) => {
    if (busy() || run()?.phase !== 'play') return;
    const i = S.sel.indexOf(id);
    if (i >= 0) S.sel.splice(i, 1);
    else if (S.sel.length < 5) S.sel.push(id);
    else { flash('Five cards at most, my friend.', 'bad', 1.4); return; }
    ui.audio.sfx('sfx_card');
    render();
  };
  const doPlay = () => {
    const r = run();
    if (busy() || r?.phase !== 'play' || !S.sel.length) return;
    const ids = [...S.sel];
    const before = { act: r.act, trick: r.trick, hand: [...r.hand] };
    S.ghosts = new Map(ids.map((id) => [id, { ...cardOf(id) }])); // embers burn out of the deck: keep their faces for the show
    const res = C.rogueAct('play', ids);
    if (fail(res)) return;
    S.sel = [];
    const G = geo();
    // the played cards go to the felt in a row, in the order played
    ids.forEach((id, i) => { const sp = S.sprites.get(id); if (sp) launch(sp, { x: G.W / 2 + (i - (ids.length - 1) / 2) * G.cardH * 0.8, y: G.feltY, rot: 0, s: 0.92, a: 1 }, now(), i * 0.08); });
    S.puppet.setPose('point', now(), 0.8);
    const stepT = 0.32;
    S.anim = { kind: 'play', t: now(), ids, res, step: -1, stepT, before, scoreFrom: (run().score - res.total), done: 0.6 + res.steps.length * stepT + 1.1 };
    react('shuffle');
    render();
  };
  const doRedraw = () => {
    const r = run();
    if (busy() || r?.phase !== 'play' || !S.sel.length) return;
    const ids = [...S.sel];
    const res = C.rogueAct('redraw', ids);
    if (fail(res)) return;
    S.sel = [];
    const G = geo();
    for (const id of ids) { const sp = S.sprites.get(id); if (sp) sp.target = { x: G.usedX, y: G.usedY, rot: -0.4, s: 0.45, a: 0 }; }
    S.anim = { kind: 'redraw', t: now(), done: 0.55 };
    ui.audio.sfx('sfx_card');
    render();
  };
  const startGambit = () => {
    const r = C.startRun();
    if (fail(r)) return;
    S.sprites.clear();
    S.sel = [];
    ui.audio.sfx('sfx_magic');
    react('shuffle');
    say(pick(LINES.start), 3);
    overlay.classList.add('hidden');
    S.overlayFor = null;
    render();
  };
  const act = (a, arg) => {
    const res = C.rogueAct(a, arg);
    if (fail(res)) return res;
    if (a === 'buy' || a === 'vanish' || a === 'reroll' || a === 'release') ui.audio.sfx(a === 'vanish' ? 'sfx_magic' : 'sfx_chip');
    if (a === 'next') {
      S.sprites.clear();
      overlay.classList.add('hidden');
      S.overlayFor = null;
      const r = run();
      if (isFinale(r)) { say(`${pick(LINES.twist)} ${TWISTS[r.twist].name}: ${TWISTS[r.twist].text}`, 6); flash(`${TRICK_NAMES[r.trick]} — ${TWISTS[r.twist].name}`, '', 3); }
      else flash(`Act ${r.act + 1} · ${TRICK_NAMES[r.trick]}`, '', 2);
      react('shuffle');
      ui.audio.sfx('sfx_magic');
    }
    render();
    return res;
  };

  // ---------------------------------------------------------------- the overlay: start, Cabinet, result
  const rarityName = ['Common', 'Uncommon', 'Rare'];
  const renderOverlay = () => {
    const r = run();
    if (S.anim) { overlay.classList.add('hidden'); return; } // the show first, then the Cabinet
    const R = C.rogue;
    overlay.innerHTML = '';
    if (!r || r.settled || r.phase === 'won' || r.phase === 'lost') {
      const last = r && (r.phase === 'won' || r.phase === 'lost') ? r : null;
      overlay.append(h('div', { class: 'sg-card' },
        h('h2', {}, 'The Spade\'s Gambit'),
        last ? h('div', { class: `sg-result ${last.actsCleared ? 'good' : 'bad'}` },
          h('b', {}, last.phase === 'won' ? 'ALL THREE ACTS!' : last.actsCleared ? `${last.actsCleared} Act${last.actsCleared > 1 ? 's' : ''} cleared` : 'The curtain falls'),
          h('span', {}, `Chips back: ${PAYOUT[last.actsCleared]} · Best hand: ${last.best}`)) : null,
        h('p', {}, 'Play poker hands from your own deck to reach each Trick\'s target. A hand scores Pips × Gasps. Three Acts of three Tricks; every Finale has a Twist. Win a Trick and Morganius offers a Gift — a Marvel card for your deck, a Spell, or Sparks. Cast Spells on your cards mid-Trick (Q, W). Spend Sparks in his Cabinet on Curios, Inks, Marvels, Spells, Rehearsals and Vanishings.'),
        h('table', { class: 'sg-pay' }, h('tr', {}, h('th', {}, 'Acts cleared'), ...PAYOUT.map((_, i) => h('th', {}, String(i)))), h('tr', {}, h('td', {}, 'Chips back'), ...PAYOUT.map((p) => h('td', {}, String(p))))),
        h('p', { class: 'muted' }, `Buy-in ${ENTRY} chips. Your record: ${R.runs} Gambit${R.runs === 1 ? '' : 's'}, best ${R.bestActs} Act${R.bestActs === 1 ? '' : 's'}, ${R.wins} won outright.`),
        h('div', { class: 'sg-row' },
          h('button', { class: 'primary', disabled: C.chips < ENTRY, onclick: startGambit }, C.chips < ENTRY ? `You need ${ENTRY} chips` : `Buy in — ${ENTRY} chips`),
          h('button', { onclick: () => ui.closePanel() }, 'Leave the table')),
      ));
      overlay.classList.remove('hidden');
      return;
    }
    if (r.phase === 'gift') {
      const opt = (o, i) => {
        let tag; let title; let text; let face = null;
        if (o.kind === 'marvel') { tag = 'Marvel card'; title = o.marvel === 'phantom' ? 'The Phantom' : `${MARVELS[o.marvel].name} ${cardLabel(o.c)}`; text = `Joins your deck. ${MARVELS[o.marvel].text}`; face = o.marvel === 'phantom' ? '✦?✦' : cardLabel(o.c); }
        else if (o.kind === 'spell') { tag = 'Spell'; title = SPELLS[o.id].name; text = SPELLS[o.id].text; face = '✧'; }
        else { tag = 'Sparks'; title = `+${o.n} Sparks`; text = 'For the Cabinet.'; face = '✦'; }
        return h('div', { class: `sg-gift ${o.kind}`, style: `animation-delay:${i * 0.18}s` },
          h('div', { class: 'sg-gift-face' }, face), h('i', {}, tag), h('b', {}, title), h('span', {}, text),
          h('button', { class: 'primary', disabled: o.kind === 'spell' && r.spells.length >= MAX_SPELLS, title: o.kind === 'spell' && r.spells.length >= MAX_SPELLS ? 'Your spellbook is full' : '', onclick: () => { const res = act('gift', i); if (res?.ok !== false) { ui.audio.sfx('sfx_magic'); say(o.kind === 'marvel' ? 'A Marvel! Shuffle it in — it will surprise you.' : o.kind === 'spell' ? 'A spell from my grimoire. Cast it wisely. Or wildly. Both work.' : 'Sparks! Spend them in good health.', 3); } } }, 'Take it'));
      };
      overlay.append(h('div', { class: 'sg-card wide gift' },
        h('h2', {}, '✦ Morganius\'s Gift ✦'),
        h('p', { class: 'muted' }, 'Bravo! For a Trick well played, choose one — free. (Two spells at most in your spellbook.)'),
        h('div', { class: 'sg-gifts' }, ...r.gift.options.map(opt)),
        r.spells.length >= MAX_SPELLS ? h('div', { class: 'sg-owned' }, h('i', {}, 'Your spellbook (let one go to make room):'), ...r.spells.map((sp, i) => h('button', { class: 'small', title: SPELLS[sp].text, onclick: () => { C.rogueAct('dropSpell', i); S.overlayFor = null; render(); } }, `${SPELLS[sp].name} ✕`))) : null,
        h('div', { class: 'sg-row' }, h('button', { onclick: () => act('gift', null) }, 'No thank you → the Cabinet')),
      ));
      overlay.classList.remove('hidden');
      return;
    }
    if (r.phase === 'shop') {
      const sh = r.shop;
      const item = (it, i) => {
        let title; let text; let tag;
        if (it.kind === 'curio') { title = CURIOS[it.id].name; text = CURIOS[it.id].text; tag = `Curio · ${rarityName[CURIOS[it.id].rarity - 1]}`; }
        else if (it.kind === 'ink') { const d = r.deck.find((x) => x.id === it.card); title = `${INKS[it.ink].name} ${d ? cardLabel(d.c) : '—'}`; text = `Ink your ${d ? cardLabel(d.c) : 'card'}: ${INKS[it.ink].text}`; tag = 'Ink'; }
        else if (it.kind === 'spell') { title = SPELLS[it.id].name; text = SPELLS[it.id].text; tag = `Spell · ${r.spells.length}/${MAX_SPELLS} held`; }
        else if (it.kind === 'marvel') { title = it.marvel === 'phantom' ? 'The Phantom' : `${MARVELS[it.marvel].name} ${cardLabel(it.c)}`; text = `A Marvel card for your deck: ${MARVELS[it.marvel].text}`; tag = 'Marvel card'; }
        else { const lv = (r.levels[it.cat] || 0) + 1; title = `Rehearse: ${HAND_NAMES[it.cat]}`; text = `Level ${lv}: +${HANDS[it.cat].lp} Pips, +${HANDS[it.cat].lg} Gasps.`; tag = 'Rehearsal'; }
        return h('div', { class: `sg-item ${it.kind}${it.sold ? ' sold' : ''}` },
          h('i', {}, tag), h('b', {}, title), h('span', {}, text),
          h('button', { disabled: it.sold || it.cost > r.sparks, onclick: () => act('buy', i) }, it.sold ? 'Sold' : `${it.cost} ✦`));
      };
      overlay.append(h('div', { class: 'sg-card wide' },
        h('h2', {}, 'Morganius\'s Cabinet'),
        h('p', { class: 'muted' }, `Sparks: ${r.sparks} ✦ · Curios ${r.curios.length}/${MAX_CURIOS} · Spells ${r.spells.length}/${MAX_SPELLS} · Deck ${r.deck.length} cards · Next: Act ${r.trick === 2 ? r.act + 2 : r.act + 1}, ${TRICK_NAMES[(r.trick + 1) % 3]}${r.trick === 1 ? ` — Twist: ${TWISTS[r.twists[r.act]].name}` : ''}`),
        h('div', { class: 'sg-items' }, ...sh.items.map(item)),
        r.curios.length ? h('div', { class: 'sg-owned' }, h('i', {}, 'Your Curios (in order):'), ...r.curios.map((cu) => h('button', { class: 'small', title: CURIOS[cu].text, onclick: () => { if (confirm(`Part with ${CURIOS[cu].name}? Morganius keeps it.`)) act('release', cu); } }, `${CURIOS[cu].name} ✕`))) : null,
        S.vanishPick ? h('div', { class: 'sg-vanish' }, h('i', {}, `Choose a card to vanish (${sh.vanishCost} ✦):`),
          ...[0, 1, 2, 3].map((st) => h('div', {}, ...r.deck.filter((d) => suit(d.c) === st).sort((a, b) => rank(b.c) - rank(a.c)).map((d) => h('button', { class: `small card-btn ${st === 1 || st === 2 ? 'red' : ''}${d.ink || d.marvel ? ' inked' : ''}`, title: cardName(d), onclick: () => { S.vanishPick = false; act('vanish', d.id); } }, d.marvel === 'phantom' ? '✦?' : cardLabel(d.c))))),
          h('button', { class: 'small', onclick: () => { S.vanishPick = false; renderOverlay(); } }, 'Never mind')) : null,
        h('div', { class: 'sg-row' },
          h('button', { disabled: r.sparks < 1 + sh.rerolls, onclick: () => act('reroll') }, `New stock (${1 + sh.rerolls} ✦)`),
          h('button', { disabled: sh.vanished || r.sparks < sh.vanishCost, onclick: () => { S.vanishPick = true; renderOverlay(); } }, sh.vanished ? 'Vanished' : `Vanish a card (${sh.vanishCost} ✦)`),
          h('button', { class: 'primary', onclick: () => act('next') }, 'On with the show →')),
      ));
      overlay.classList.remove('hidden');
      return;
    }
    overlay.classList.add('hidden');
  };

  // ---------------------------------------------------------------- the HUD and the bar
  const render = () => {
    const r = run();
    hud.innerHTML = '';
    curiosEl.innerHTML = '';
    preview.innerHTML = '';
    bar.innerHTML = '';
    const btn = (label, fn, opts = {}) => h('button', { class: opts.cls || '', disabled: opts.disabled || false, title: opts.title || '', onclick: () => { ui.audio.sfx('sfx_ui_click'); fn(); } }, label);
    if (r && (r.phase === 'play' || S.anim)) {
      const shownScore = S.anim?.kind === 'play' ? Math.round(S.anim.scoreShown ?? S.anim.scoreFrom) : r.score;
      hud.append(
        h('div', { class: 'sg-stage' }, h('i', {}, `Act ${r.act + 1} of ${ACTS}`), h('b', {}, TRICK_NAMES[r.trick]), r.twist ? h('span', { class: 'twist', title: TWISTS[r.twist].text }, `${TWISTS[r.twist].name}: ${TWISTS[r.twist].text}`) : null),
        h('div', { class: 'sg-score' }, h('i', {}, 'Applause'), h('b', {}, `${shownScore}`), h('span', {}, `of ${r.target}`), h('div', { class: 'sg-meter' }, h('div', { style: `width:${Math.min(100, (shownScore / r.target) * 100)}%` }))),
        h('div', { class: 'sg-counts' }, h('span', {}, `Plays ${r.plays}`), h('span', {}, `Redraws ${r.redraws}`), h('span', { class: 'spark' }, `${r.sparks} ✦`), h('span', {}, `Deck ${r.draw.length}/${r.deck.length}`)),
      );
    }
    if (r && !r.settled) {
      for (const cu of r.curios) {
        const el = h('div', { class: `sg-curio${S.anim?.curioFlash === cu ? ' flash' : ''}`, title: CURIOS[cu].text }, h('b', {}, CURIOS[cu].name), h('span', {}, CURIOS[cu].text));
        curiosEl.append(el);
      }
      for (let i = r.curios.length; i < MAX_CURIOS; i++) curiosEl.append(h('div', { class: 'sg-curio empty' }, '·'));
    }
    spellsEl.innerHTML = '';
    if (r && !r.settled && (r.phase === 'play' || S.anim)) {
      spellsEl.append(h('i', {}, `Spellbook ${r.spells.length}/${MAX_SPELLS}`));
      r.spells.forEach((sp, i) => {
        const need = SPELLS[sp].need;
        const fits = S.sel.length >= need[0] && S.sel.length <= need[1];
        spellsEl.append(h('div', { class: `sg-spell${fits && !busy() ? ' ready' : ''}` },
          h('b', {}, SPELLS[sp].name), h('span', {}, SPELLS[sp].text),
          h('div', { class: 'sg-row' },
            h('button', { class: 'primary small', disabled: !fits || busy() || r.phase !== 'play', onclick: () => castSpell(i) }, `Cast (${'QW'[i]})`),
            h('button', { class: 'small', title: 'Let it go', onclick: () => dropSpell(i) }, '✕'))));
      });
      if (!r.spells.length) spellsEl.append(h('div', { class: 'sg-spell empty' }, 'No spells — Morganius gives them as Gifts, and sells them in his Cabinet.'));
    }
    if (r?.phase === 'play' && !busy()) {
      if (S.sel.length) {
        const sc = scoreHand(r, S.sel);
        const ph = Object.entries(sc.as || {}).find(([id]) => cardOf(Number(id))?.marvel === 'phantom');
        preview.append(h('b', {}, sc.name + (ph ? ` (the Phantom plays as ${['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][ph[1]]})` : '')), h('span', { class: 'pips' }, `${sc.steps[0].pips}`), h('span', {}, ' × '), h('span', { class: 'gasps' }, `${sc.steps[0].gasps}`), h('i', {}, ` → about ${sc.total}`));
      } else preview.append(h('i', {}, 'Choose up to five cards (click, or keys 1–9)'));
      bar.append(
        btn('Play (Enter)', doPlay, { cls: 'primary', disabled: !S.sel.length || r.plays <= 0 }),
        btn(`Redraw (R) · ${r.redraws}`, doRedraw, { disabled: !S.sel.length || r.redraws <= 0 }),
        btn(`Sort: ${S.sort === 'rank' ? 'rank' : 'suit'} (S)`, () => { S.sort = S.sort === 'rank' ? 'suit' : 'rank'; render(); }),
        btn('Hands', () => { S.showHands = !S.showHands; render(); }),
        btn('Give up', () => { if (confirm('Give up this Gambit? Acts you\'ve cleared still pay.')) { act('concede'); finishShow(); } }),
        btn('Leave (Esc)', () => ui.closePanel(), { cls: 'ct-leave', title: 'Your Gambit waits for you' }),
      );
      if (S.showHands) {
        preview.append(h('div', { class: 'sg-hands' }, ...Object.keys(HANDS).reverse().map((k) => { const H = HANDS[k]; const lv = r.levels[k] || 0; return h('div', {}, h('b', {}, HAND_NAMES[k]), h('span', {}, `${H.pips + lv * H.lp} × ${H.gasps + lv * H.lg}${lv ? ` (Lv ${lv + 1})` : ''}`)); })));
      }
    }
    if (S.overlayFor !== overlayKey()) { S.overlayFor = overlayKey(); renderOverlay(); }
  };
  const overlayKey = () => {
    const r = run();
    if (S.anim) return 'anim';
    if (!r || r.settled || r.phase === 'won' || r.phase === 'lost') return `start:${r?.id}:${r?.phase}`;
    if (r.phase === 'gift') return `gift:${JSON.stringify(r.gift)}:${r.spells.join()}`;
    if (r.phase === 'shop') return `shop:${JSON.stringify(r.shop)}:${r.sparks}:${r.curios.join()}:${r.spells.join()}:${S.vanishPick}`;
    return 'play';
  };
  const finishShow = () => {
    const r = run();
    if (!r) return;
    if (r.phase === 'won') { say(pick(LINES.champion), 6); flash(`ALL THREE ACTS! — ${PAYOUT[r.actsCleared]} chips`, 'good', 4); react('big_win'); ui.audio.sfx('sfx_win'); }
    else if (r.phase === 'lost') { say(pick(LINES.lost), 5); flash(r.actsCleared ? `${r.actsCleared} Act${r.actsCleared > 1 ? 's' : ''} cleared — ${PAYOUT[r.actsCleared]} chips back` : 'The curtain falls', r.actsCleared ? 'good' : 'bad', 4); react('lose'); }
    else if (r.phase === 'gift' || r.phase === 'shop') { say(pick(LINES.won), 4); react('big_win'); ui.audio.sfx('sfx_win'); const G = geo(); S.sparks.burst(G.W / 2, G.feltY, now(), { n: 60, size: G.cardH / 80 }); }
    S.overlayFor = null;
    render();
  };

  // ---------------------------------------------------------------- input
  const toCanvas = (e) => { const b = canvas.getBoundingClientRect(); return { x: ((e.clientX - b.left) / b.width) * canvas.width, y: ((e.clientY - b.top) / b.height) * canvas.height }; };
  canvas.addEventListener('pointerdown', (e) => {
    if (now() < S.introDur) { S.introDur = now(); return; }
    if (S.anim?.kind === 'play') { S.anim.fast = true; return; } // a click hurries the show
    const p = toCanvas(e);
    const G = geo();
    // the topmost card under the pointer (the rightmost drawn last)
    const ids = sortedHand();
    for (let i = ids.length - 1; i >= 0; i--) {
      const sp = S.sprites.get(ids[i]);
      if (!sp) continue;
      const w = G.cardH * 0.7 * sp.s;
      const hh = G.cardH * sp.s;
      if (Math.abs(p.x - sp.x) < w / 2 && Math.abs(p.y - sp.y) < hh / 2) { toggle(ids[i]); return; }
    }
  });
  const onKey = (e) => {
    if (!S.alive || !overlay.classList.contains('hidden')) return;
    if (now() < S.introDur && (e.key === ' ' || e.key === 'Enter')) { S.introDur = now(); e.preventDefault(); return; }
    if (S.anim?.kind === 'play' && (e.key === ' ' || e.key === 'Enter')) { S.anim.fast = true; e.preventDefault(); return; }
    const ids = sortedHand();
    if (/^[1-9]$/.test(e.key) && ids[Number(e.key) - 1] !== undefined) { toggle(ids[Number(e.key) - 1]); return; }
    const k = e.key.toLowerCase();
    if (k === 'enter') { e.preventDefault(); doPlay(); }
    else if (k === 'r') doRedraw();
    else if (k === 'q') castSpell(0);
    else if (k === 'w') castSpell(1);
    else if (k === 's') { S.sort = S.sort === 'rank' ? 'suit' : 'rank'; render(); }
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- drawing
  const drawFelt = (c) => {
    ctx.fillStyle = '#1a1018';
    quad(ctx, c, -1.25, -0.2, 1.25, 1.06); ctx.fill();
    ctx.fillStyle = '#2a1626';
    quad(ctx, c, -1.18, -0.2, 1.18, 1.02); ctx.fill();
    ctx.fillStyle = '#3a1858';
    quad(ctx, c, -1.1, -0.2, 1.1, 0.98); ctx.fill();
    ctx.strokeStyle = '#c9a24a';
    ctx.lineWidth = 2;
    quad(ctx, c, -1.1, -0.2, 1.1, 0.98); ctx.stroke();
    // the gold spade inlaid in the middle
    const G = geo();
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#e8c35a';
    ctx.font = `${Math.round(G.H * 0.3)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♠', G.W / 2, G.feltY + G.H * 0.03);
    ctx.restore();
  };
  const drawInk = (sp, d, G) => {
    if (!d?.ink) return;
    const w = G.cardH * 0.7 * sp.s;
    const hh = G.cardH * sp.s;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.rot);
    ctx.strokeStyle = INKS[d.ink].colour;
    ctx.lineWidth = Math.max(2, hh * 0.035);
    ctx.shadowColor = INKS[d.ink].colour;
    ctx.shadowBlur = 10;
    ctx.strokeRect(-w / 2 + 2, -hh / 2 + 2, w - 4, hh - 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INKS[d.ink].colour;
    ctx.font = `bold ${Math.round(hh * 0.11)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(INKS[d.ink].name.toUpperCase(), 0, hh / 2 - hh * 0.06);
    ctx.restore();
  };
  /** The Phantom: a card of purple smoke with a question at its heart and the four suits circling. */
  const drawPhantom = (x, y, hh, rot, t, sel) => {
    const w = hh * 0.7;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = '#b05af0';
    ctx.shadowBlur = sel ? 22 : 12;
    const gr = ctx.createLinearGradient(-w / 2, -hh / 2, w / 2, hh / 2);
    gr.addColorStop(0, '#2a0e44'); gr.addColorStop(0.5 + 0.2 * Math.sin(t * 2), '#6a2aa8'); gr.addColorStop(1, '#1a0830');
    ctx.fillStyle = gr;
    ctx.fillRect(-w / 2, -hh / 2, w, hh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e2b8ff';
    ctx.lineWidth = Math.max(1.5, hh * 0.02);
    ctx.strokeRect(-w / 2 + 3, -hh / 2 + 3, w - 6, hh - 6);
    ctx.fillStyle = '#f4e8ff';
    ctx.font = `bold ${Math.round(hh * 0.42)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 3);
    ctx.fillText('?', 0, 0);
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(hh * 0.13)}px Georgia, serif`;
    ['♠', '♥', '♦', '♣'].forEach((st, i) => { const a = t * 1.6 + (i * Math.PI) / 2; ctx.fillStyle = i === 1 || i === 2 ? '#ff8aa0' : '#e8e0ff'; ctx.fillText(st, Math.cos(a) * w * 0.3, Math.sin(a) * hh * 0.3); });
    ctx.font = `bold ${Math.round(hh * 0.09)}px system-ui, sans-serif`;
    ctx.fillStyle = '#e2b8ff';
    ctx.fillText('PHANTOM', 0, hh / 2 - hh * 0.08);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  };
  /** A Marvel's mark on its card: a crown, gold leaf, a lucky glow, a mirror's sheen, an hourglass. */
  const drawMarvel = (sp, d, G, t) => {
    if (!d?.marvel || d.marvel === 'phantom') return;
    const w = G.cardH * 0.7 * sp.s;
    const hh = G.cardH * sp.s;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.rot);
    ctx.globalAlpha = sp.a;
    const label = (txt, col) => { ctx.fillStyle = col; ctx.font = `bold ${Math.round(hh * 0.1)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(txt, 0, hh / 2 - hh * 0.06); };
    if (d.marvel === 'crown') {
      ctx.fillStyle = '#e8c35a';
      ctx.strokeStyle = '#8a6a1a';
      ctx.lineWidth = 1;
      const cy = -hh / 2 - hh * 0.02;
      ctx.beginPath(); ctx.moveTo(-w * 0.22, cy); ctx.lineTo(-w * 0.22, cy - hh * 0.1); ctx.lineTo(-w * 0.11, cy - hh * 0.04); ctx.lineTo(0, cy - hh * 0.13); ctx.lineTo(w * 0.11, cy - hh * 0.04); ctx.lineTo(w * 0.22, cy - hh * 0.1); ctx.lineTo(w * 0.22, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      label('CROWNED', '#b8862a');
    } else if (d.marvel === 'golden') {
      const g2 = ctx.createLinearGradient(-w / 2, -hh / 2, w / 2, hh / 2);
      const k = (t * 0.6) % 1.6 - 0.3;
      g2.addColorStop(0, 'rgba(232,195,90,0.18)'); g2.addColorStop(Math.max(0, Math.min(1, k)), 'rgba(255,245,200,0.55)'); g2.addColorStop(1, 'rgba(232,195,90,0.18)');
      ctx.fillStyle = g2;
      ctx.fillRect(-w / 2, -hh / 2, w, hh);
      ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = Math.max(2, hh * 0.035); ctx.strokeRect(-w / 2 + 1, -hh / 2 + 1, w - 2, hh - 2);
      label('GOLDEN', '#b8862a');
    } else if (d.marvel === 'lucky') {
      const charged = d.charged !== false;
      ctx.strokeStyle = charged ? `rgba(90,232,120,${0.6 + 0.4 * Math.sin(t * 5)})` : 'rgba(90,140,100,0.5)';
      ctx.lineWidth = Math.max(2, hh * 0.04);
      ctx.shadowColor = '#5ae878'; ctx.shadowBlur = charged ? 16 : 0;
      ctx.strokeRect(-w / 2 + 2, -hh / 2 + 2, w - 4, hh - 4);
      ctx.shadowBlur = 0;
      label(charged ? 'LUCKY ✦ ×3' : 'LUCKY (resting)', charged ? '#2a9a4a' : '#6a7a6a');
    } else if (d.marvel === 'mirror') {
      const k = (t * 0.5) % 1;
      const g2 = ctx.createLinearGradient(-w / 2, -hh / 2, w / 2, hh / 2);
      g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(k, 'rgba(220,235,255,0.6)'); g2.addColorStop(Math.min(1, k + 0.1), 'rgba(255,255,255,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(-w / 2, -hh / 2, w, hh);
      ctx.strokeStyle = '#c8d8e8'; ctx.lineWidth = Math.max(2, hh * 0.03); ctx.strokeRect(-w / 2 + 2, -hh / 2 + 2, w - 4, hh - 4);
      label('MIRRORED', '#6a8aa8');
    } else if (d.marvel === 'hourglass') {
      ctx.fillStyle = '#c9a24a';
      const x0 = w * 0.32;
      const y0 = -hh * 0.36;
      const s2 = hh * 0.07;
      ctx.beginPath(); ctx.moveTo(x0 - s2, y0 - s2); ctx.lineTo(x0 + s2, y0 - s2); ctx.lineTo(x0, y0); ctx.lineTo(x0 + s2, y0 + s2); ctx.lineTo(x0 - s2, y0 + s2); ctx.lineTo(x0, y0); ctx.closePath(); ctx.fill();
      label('HOURGLASS', '#a8822a');
    }
    ctx.restore();
  };
  const ease = (sp, tg, k) => {
    for (const key of ['x', 'y', 'rot', 's', 'a']) sp[key] += (tg[key] - sp[key]) * k;
  };
  let lastT = 0;
  const frame = () => {
    if (!S.alive) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(canvas.clientWidth * dpr);
    const bh = Math.round(canvas.clientHeight * dpr);
    if (bw && bh && (canvas.width !== bw || canvas.height !== bh)) { canvas.width = bw; canvas.height = bh; }
    const c = camera(canvas.width, canvas.height);
    const G = geo();
    const t = now();
    const dt = Math.min(0.05, t - lastT);
    lastT = t;
    const r = run();
    drawRoom(ctx, c, t);
    // he watches what you're choosing, or what's scoring
    if (!S.anim) {
      const chosen = S.sel.map((id) => S.sprites.get(id)).filter(Boolean);
      S.puppet.lookToward(chosen.length ? { x: chosen.reduce((a, p) => a + p.x, 0) / chosen.length, y: chosen[0].y } : null);
    }
    S.hands = drawHost(ctx, c, t, look, { introDur: S.introDur, mood: S.host.state, age: t - S.host.at, puppet: S.puppet });
    drawFelt(c);
    // the deck (with the Crystal Ball's peek) and the used pile
    if (r && r.phase === 'play') {
      for (let i = 0; i < Math.min(6, Math.ceil(r.draw.length / 8)); i++) drawCard(ctx, G.deckX - i * 1.5, G.deckY - i * 1.5, G.cardH * 0.55, 0.05, {});
      ctx.fillStyle = '#f4ecd8';
      ctx.font = `${Math.round(G.H * 0.02)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${r.draw.length} left`, G.deckX, G.deckY + G.cardH * 0.4);
      if (r.curios.includes('crystal_ball')) {
        peek(r, 3).forEach((id, i) => { const d = cardOf(id); if (d) drawCard(ctx, G.deckX - G.cardH * 0.5 - i * G.cardH * 0.3, G.deckY - G.cardH * 0.55, G.cardH * 0.36, 0, { card: d.c, alpha: 0.85 }); });
        ctx.fillText('the Crystal Ball sees…', G.deckX - G.cardH * 0.8, G.deckY - G.cardH * 0.8);
      }
      ctx.textAlign = 'left';
    }
    // where every card wants to be
    const anim = S.anim;
    const handIds = sortedHand();
    const shown = new Set();
    if (anim?.kind === 'play') {
      const k = t - anim.t;
      // the scoring, step by step
      const stepT = anim.fast ? 0.08 : anim.stepT;
      const si = Math.floor((k - 0.55) / stepT);
      if (si !== anim.step && si >= 0 && si < anim.res.steps.length) {
        anim.step = si;
        const st = anim.res.steps[si];
        anim.curioFlash = st.curio || null;
        const at = st.id != null ? S.sprites.get(st.id) : null;
        if (at) S.puppet.lookToward(at);
        if (at && (st.kind === 'marvel' || st.kind === 'ink')) S.sparks.burst(at.x, at.y, t, { n: 14, size: G.cardH / 160 });
        const x = at ? at.x : st.curio ? G.W * 0.12 : G.W / 2;
        const y = at ? at.y - G.cardH * 0.6 : st.curio ? G.H * 0.3 : G.feltY - G.cardH * 0.9;
        if (st.kind === 'card') { S.pops.push({ x, y, text: st.label, col: PIPS_C, t }); ui.audio.sfx('sfx_chip'); if (at) at.pop = t; }
        else if (st.kind === 'ink' || st.kind === 'curio' || st.kind === 'held' || st.kind === 'twist' || st.kind === 'marvel') { S.pops.push({ x, y, text: st.label, col: /Gasps|×/.test(st.label) ? GASPS_C : PIPS_C, t }); ui.audio.sfx('sfx_card'); if (at) at.pop = t; }
        else if (st.kind === 'total') {
          S.pops.push({ x: G.W / 2, y: G.feltY - G.cardH * 1.1, text: `${anim.res.name} — ${st.label} = ${st.total}`, col: '#fff0a0', t, big: true });
          ui.audio.sfx('sfx_magic');
          react(st.total >= (r?.target || 1e9) * 0.3 ? 'big_win' : st.total > 150 ? 'win' : 'idle');
          if (st.total >= 400) say(pick(LINES.big), 3);
        }
        anim.pips = st.pips;
        anim.gasps = st.gasps;
        render();
      }
      const totalAt = 0.55 + anim.res.steps.length * stepT;
      if (k > totalAt) anim.scoreShown = Math.min(anim.scoreFrom + anim.res.total, anim.scoreFrom + anim.res.total * Math.min(1, (k - totalAt) / 0.5));
      // after the show the played cards leave (Embers burn), and new ones are dealt
      if (k > totalAt + 0.6) for (const id of anim.ids) { const sp = S.sprites.get(id); if (sp) sp.target = anim.res.burnt?.includes(id) ? { x: sp.x, y: sp.y - G.cardH, rot: sp.rot + 1, s: 0.6, a: 0 } : { x: G.usedX, y: G.usedY, rot: -0.4, s: 0.45, a: 0 }; }
      if (k > totalAt + 0.6) render();
      for (const id of anim.ids) shown.add(id);
      if (k > (anim.fast ? totalAt + 0.7 : anim.done)) {
        for (const id of anim.ids) S.sprites.delete(id);
        S.anim = null;
        S.ghosts = null;
        finishShow();
      }
    } else if (anim?.kind === 'redraw' && t - anim.t > anim.done) {
      for (const [id] of S.sprites) if (!run()?.hand.includes(id)) S.sprites.delete(id);
      S.anim = null;
      render();
    }
    // the hand (new cards come out of his hand, one after another)
    const slots = handSlots(anim?.kind === 'play' && t - anim.t < 0.55 + anim.res.steps.length * (anim.fast ? 0.08 : anim.stepT) + 0.6 ? handIds.filter((id) => S.sprites.has(id)) : handIds);
    let newcomers = 0;
    for (const [id, tg] of slots) {
      const fresh = !S.sprites.has(id);
      const spawn = S.spawnFrom.get(id);
      const from = spawn && S.hands ? { x: (S.hands.lh.x + S.hands.rh.x) / 2, y: Math.min(S.hands.lh.y, S.hands.rh.y) - G.cardH * 0.4, rot: 0, s: 0.4 } : fromHost();
      const sp = spriteFor(id, { ...from, a: 0 });
      if (fresh) { sp.delay = t + newcomers * 0.16; newcomers++; sp.waiting = true; }
      if (sp.waiting && t >= sp.delay) {
        // he flicks it from his fingertips (or it appears between his hands) and it flies to your hand
        sp.waiting = false;
        const f = spawn ? from : fromHost();
        Object.assign(sp, { x: f.x, y: f.y, rot: f.rot, s: f.s, a: 1 });
        launch(sp, tg, t);
        if (spawn) { S.sparks.burst(f.x, f.y, t, { n: 30, size: G.cardH / 120 }); S.spawnFrom.delete(id); }
        else S.puppet.deal(t, tg);
        ui.audio.sfx('sfx_card');
      } else if (!sp.waiting) sp.target = tg;
      shown.add(id);
    }
    // move and draw: what's on the felt first, then the hand (left to right)
    const drawList = [...S.sprites.entries()].sort((a, b) => (slots.has(a[0]) ? 1 : 0) - (slots.has(b[0]) ? 1 : 0) || (a[1].x - b[1].x));
    for (const [id, sp] of drawList) {
      let spin = 0;
      if (sp.fly && sp.target) {
        // a magic flight: an arc, a spin, a trail of sparks, a burst where it lands
        const f = sp.fly;
        const k = Math.max(0, (t - f.at) / f.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
        const tg = sp.target;
        sp.x = f.from.x + (tg.x - f.from.x) * e;
        sp.y = f.from.y + (tg.y - f.from.y) * e - Math.sin(Math.min(1, k) * Math.PI) * G.cardH * 0.9;
        sp.s += (tg.s - sp.s) * Math.min(1, e);
        sp.rot = tg.rot;
        spin = (1 - Math.min(1, e)) * f.spin;
        if (k > 0 && k < 1) S.sparks.trail(sp.x, sp.y, t, G.cardH / 150);
        if (k >= 1) { sp.fly = null; sp.x = tg.x; sp.y = tg.y; S.sparks.burst(tg.x, tg.y, t, { n: 10, size: G.cardH / 170 }); }
      } else if (sp.target) ease(sp, sp.target, 1 - Math.pow(0.0005, dt));
      const d = cardOf(id);
      if (!d || sp.a < 0.02) continue;
      const pop = sp.pop && t - sp.pop < 0.3 ? 1 + 0.18 * Math.sin(((t - sp.pop) / 0.3) * Math.PI) : 1;
      const burnt = anim?.res?.burnt?.includes(id) && t - anim.t > 0.55 + anim.res.steps.length * anim.stepT + 0.6;
      const turn = sp.turnAt && t - sp.turnAt < 0.7 ? Math.cos(((t - sp.turnAt) / 0.7) * Math.PI * 2) : 1;
      ctx.save();
      ctx.globalAlpha = sp.a;
      if (d.marvel === 'phantom') drawPhantom(sp.x, sp.y, G.cardH * sp.s * pop, sp.rot + spin, t, S.sel.includes(id));
      else drawCard(ctx, sp.x, sp.y, G.cardH * sp.s * pop, sp.rot + spin, { card: d.c, glow: S.sel.includes(id) || pop > 1 || Boolean(sp.fly), flip: turn });
      ctx.restore();
      drawInk({ ...sp, rot: sp.rot + spin, s: sp.s * pop }, d, G);
      drawMarvel({ ...sp, rot: sp.rot + spin, s: sp.s * pop }, d, G, t);
      if (burnt) EFFECTS.spiral(ctx, { x: sp.x, y: sp.y + G.cardH * 0.4, height: G.cardH * 1.2, r: G.cardH * 0.25, n: 8, h: G.cardH * 0.12, speed: 1.6, glow: true }, t);
    }
    for (const [id] of S.sprites) if (!shown.has(id) && !anim) S.sprites.delete(id);
    // spells taking hold, and every spark in the air
    S.spellFx = S.spellFx.filter((f) => t - f.t < 1);
    for (const f of S.spellFx) magicCircle(ctx, f.x, f.y + G.cardH * 0.3, f.r * Math.min(1, (t - f.t) * 4), t * 3, { squash: 0.45, alpha: 1 - (t - f.t) });
    S.sparks.draw(ctx, t);
    // the running count during a play
    if (anim?.kind === 'play' && anim.step >= 0) {
      const x = G.W / 2;
      const y = G.feltY + G.cardH * 0.72;
      ctx.font = `bold ${Math.round(G.H * 0.045)}px Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = PIPS_C;
      ctx.fillText(String(anim.pips), x - G.W * 0.02, y);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f4ecd8';
      ctx.fillText('×', x, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = GASPS_C;
      ctx.fillText(String(anim.gasps), x + G.W * 0.02, y);
    }
    // the floating numbers
    S.pops = S.pops.filter((p) => t - p.t < (p.big ? 2.4 : 1.1));
    for (const p of S.pops) {
      const k = (t - p.t) / (p.big ? 2.4 : 1.1);
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${Math.round(G.H * (p.big ? 0.045 : 0.032))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,6,14,0.85)';
      ctx.strokeText(p.text, p.x, p.y - k * G.H * 0.06);
      ctx.fillStyle = p.col;
      ctx.fillText(p.text, p.x, p.y - k * G.H * 0.06);
      if (p.big && k < 0.4) EFFECTS.scatter(ctx, { x: p.x, y: p.y, n: 18, r: G.H * 0.25, h: G.cardH * 0.18, k: 0.5 * (k / 0.4), seed: 21, glow: true }, t);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    // the Trick won: a storm of cards round him
    if (S.host.state === 'big_win' && t - S.host.at < 2.5) magicCircle(ctx, G.W / 2, c.horizon + G.H * 0.06, G.W * 0.12, t, { squash: 0.3, alpha: 1 - (t - S.host.at) / 2.5 });
    const vg = ctx.createRadialGradient(G.W / 2, G.H * 0.55, G.H * 0.3, G.W / 2, G.H * 0.55, G.W * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, G.W, G.H);
    if (S.anim?.kind === 'play') render.tick = (render.tick || 0) + 1;
    if (S.anim?.kind === 'play' && render.tick % 6 === 0) {
      // keep the climbing score in the HUD
      const b = hud.querySelector('.sg-score b');
      if (b) b.textContent = String(Math.round(S.anim.scoreShown ?? S.anim.scoreFrom));
    }
    requestAnimationFrame(frame);
  };
  say(C.state.visits <= 1 || !C.rogue.runs ? pick(LINES.welcome) : run() && run().phase === 'play' ? 'Ah — your Gambit, just as you left it. Shall we?' : pick(LINES.welcome), 5);
  ui.audio.sfx('sfx_magic');
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
      ui.showCaption(run() && run().phase !== 'lost' && run().phase !== 'won' ? 'Morganius tucks your Gambit into his sleeve. "It\'ll keep."' : 'Go well. Come back luckier.', 3);
    },
  };
}
