// The dealership panel (v0.16.0): opened by talking to Marty Fender or Julian
// Beaumont. Buy a car (choose a colour), sell one you've parked on the lot,
// and at Fender's, buy "fresh plates" for a stolen car. See src/systems/vehicles.js.
import { h } from './panels.js';
import { drawCar } from '../engine/drawVehicles.js';

const STYLE = {
  fender: { cls: 'dealer-fender', tag: 'EVERY CAR A BARGAIN!*', fine: '*Not a guarantee. Sold as seen. No refunds.' },
  reddirt: { cls: 'dealer-fender', tag: 'FARM TOUGH · TEXAS BUILT', fine: 'Delivered to the lot, fuelled and ready. Park it by your field and it does the work.' },
  beaumont: { cls: 'dealer-beaumont', tag: 'Est. in the age of carriages', fine: 'All vehicles delivered to the forecourt, keys in the ignition.' },
};

function preview(model, color) {
  const c = h('canvas', { width: 220, height: 120, class: 'dealer-car' });
  const ctx = c.getContext('2d');
  const s = Math.min(1.9, 170 / model.len);
  ctx.save();
  ctx.translate(110, 64);
  ctx.scale(s, s);
  drawCar(ctx, model, 0, 0, -0.35, { color, id: model.name });
  ctx.restore();
  return c;
}

function bar(label, v) {
  return h('div', { class: 'dealer-stat' }, h('span', {}, label), h('div', { class: 'meter' }, h('i', { class: 'pos', style: `width:${Math.round(Math.max(0.05, Math.min(1, v)) * 100)}%` })));
}

export function dealerPanel(ui, body, opts) {
  const g = ui.game;
  const V = g.vehicles;
  const did = opts.dealer;
  const d = V.dealer(did);
  const st = STYLE[did] || STYLE.fender;
  const tab = opts.tab || 'Buy';
  const go = (extra) => ui.openPanel('dealer', { ...opts, msg: null, ...extra });
  body.classList.add(st.cls);
  body.append(h('div', { class: 'dealer-head' }, h('b', {}, d.name), h('span', {}, st.tag)));
  if (opts.msg) body.append(h('p', { class: 'dealer-msg' }, opts.msg));
  if (tab === 'Buy') {
    for (const id of d.models) {
      const m = V.cfg.models[id];
      const color = opts.colors?.[id] || m.colors[0];
      const swatches = h('div', { class: 'dealer-swatches' }, ...m.colors.map((c) => h('button', { class: `swatch${c === color ? ' on' : ''}`, style: `background:${c}`, title: 'Choose this colour', onclick: () => go({ colors: { ...(opts.colors || {}), [id]: c } }) })));
      const can = g.player.money >= m.price;
      body.append(h('div', { class: 'dealer-row' },
        preview(m, color),
        h('div', { class: 'grow' },
          h('div', { class: 'dealer-name' }, m.name, h('span', { class: 'dealer-price' }, `${m.price.toLocaleString()} obols`)),
          h('div', { class: 'desc' }, m.blurb),
          h('div', { class: 'dealer-pitch' }, `“${m.pitch}”`),
          h('div', { class: 'dealer-stats' }, bar('Top speed', m.top / 500), bar('Acceleration', m.accel / 520), bar('Handling', m.grip / 3.9)),
          h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' }, swatches,
            h('button', { class: 'small primary', disabled: !can, onclick: () => { const r = V.buy(did, id, color); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); go({ msg: r.text }); } }, can ? 'Buy' : `Need ${m.price - g.player.money} more`)))));
    }
  } else {
    const lot = V.onLot(did);
    body.append(h('p', { class: 'muted' }, did === 'fender'
      ? `Park a car on the lot and Marty will make an offer: ${Math.round(d.tradeIn * 100)}% of list, or ${Math.round(d.buysStolen * 100)}% if its past is "complicated". Fresh plates: ${d.plates} obols — a stolen car becomes yours on paper.`
      : `Park a car on the forecourt to have it appraised: ${Math.round(d.tradeIn * 100)}% of list. The Gallery does not handle vehicles of uncertain provenance.`));
    if (!lot.length) body.append(h('p', {}, h('b', {}, 'None of your cars is parked on the lot.')));
    for (const car of lot) {
      const m = V.model(car);
      const offer = V.offer(did, car);
      body.append(h('div', { class: 'dealer-row' }, preview(m, car.color),
        h('div', { class: 'grow' },
          h('div', { class: 'dealer-name' }, m.name, car.stolen ? h('span', { class: 'tag bad' }, 'stolen') : null),
          h('div', { class: 'desc' }, `Plate ${car.plate}. List price ${m.price}.`),
          h('div', { class: 'row', style: 'justify-content:flex-start;margin-top:6px' },
            h('button', { class: 'small primary', disabled: !offer, onclick: () => { const r = V.sell(did, car.id); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); go({ msg: r.text }); } }, offer ? `Sell for ${offer}` : 'Won\'t buy it'),
            car.stolen && d.plates ? h('button', { class: 'small', disabled: g.player.money < d.plates, onclick: () => { const r = V.replate(did, car.id); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); go({ msg: r.text }); } }, `Fresh plates (${d.plates})`) : null))));
    }
  }
  body.append(h('p', { class: 'muted dealer-fine' }, `${st.fine} · You have ${g.player.money} obols.`));
  return {
    title: d.name, className: `dealer ${st.cls}`, onClose: opts.onClose,
    tabs: ['Buy', 'Sell'].map((t) => ({ label: t === 'Sell' ? (did === 'fender' ? 'Sell / plates' : 'Part-exchange') : 'Buy', active: t === tab, onclick: () => ui.openPanel('dealer', { ...opts, tab: t, msg: null }) })),
  };
}
