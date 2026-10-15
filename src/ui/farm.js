// Farming panels (v0.30.0): the Land Office's listings (buy a plot), a plot's
// sign (till, plant, fertilise, harvest — with your tractor if it's parked
// by the field), and the Co-op scale (sell the harvest). See src/systems/farm.js.
import { h } from './panels.js';

const STAGES = ['just planted', 'sprouting', 'growing', 'ready to harvest'];

function plotStatus(F, id) {
  const st = F.plot(id);
  if (!st.owned) return 'for sale';
  if (st.state === 'fallow') return 'fallow — till it to plant';
  if (st.state === 'tilled') return 'tilled, ready to plant';
  const c = F.def.crops[st.crop];
  return `${c.name}: ${F.withered(id) ? 'spoiling in the field — harvest it!' : STAGES[st.stage]}${st.fertilized ? ' · fertilised' : ''}`;
}

export function farmlandPanel(ui, body, opts) {
  const g = ui.game;
  const F = g.farm;
  const render = (msg) => {
    body.innerHTML = '';
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    body.append(h('p', { class: 'muted' }, 'Lariat County Land Office. Deeds to the surveyed plots east of FM 38. Clean title; no cows included. Work a plot at its sign: till, plant, fertilise and harvest — by hand, or fast with your own tractor parked by the field (Red Dirt Tractor & Implement, Cotton Street).'));
    const list = h('div', { class: 'list' });
    for (const id of Object.keys(F.def.plots)) {
      const d = F.plotDef(id);
      const st = F.plot(id);
      list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, st.owned ? '🌾' : '📜'),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, d.name, h('span', { class: 'tag' }, `${d.tiles} tiles`), st.owned ? h('span', { class: 'tag good' }, 'yours') : null), h('div', { class: 'desc' }, plotStatus(F, id))),
        st.owned ? null : h('button', { class: 'small primary', disabled: g.player.money < d.price, onclick: () => { const r = F.buy(id); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, `Buy · ${d.price.toLocaleString()}`)));
    }
    body.append(list);
  };
  render();
  return { title: 'Land Office — Farmland', onClose: opts.onClose };
}

export function farmplotPanel(ui, body, opts) {
  const g = ui.game;
  const F = g.farm;
  const id = opts.plot;
  const render = (msg) => {
    body.innerHTML = '';
    const d = F.plotDef(id);
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    body.append(h('p', {}, h('b', {}, d.name), ` — ${d.tiles} tiles · ${plotStatus(F, id)}`));
    if (F.plot(id).owned) {
      const plan = F.workPlan(id);
      body.append(h('p', { class: 'muted' }, plan.byHand
        ? `No tractor of yours is parked by this field, so each job is done by hand: about ${Math.round(plan.minutes / 60)} hours, and it tires you out.`
        : `Your ${plan.tractor.model.name} is parked by the field: each job takes about ${plan.minutes < 90 ? `${plan.minutes} minutes` : `${Math.round(plan.minutes / 60)} hours`}.`));
    } else body.append(h('p', { class: 'muted' }, 'LAND FOR SALE — the deed is at the Land Office on Main Street (or buy it here and file the paperwork later; Lorna won\'t mind).'));
    const list = h('div', { class: 'list' });
    for (const a of F.actions(id)) {
      list.append(h('div', { class: 'item-row' }, h('div', { class: 'grow' }, h('div', { class: 'name' }, a.label), a.ok ? null : h('div', { class: 'desc' }, a.why)),
        h('button', { class: 'small primary', disabled: !a.ok, onclick: () => { const r = F.work(id, a.action, a.crop); ui.audio.sfx(r.ok ? 'sfx_quest' : 'sfx_fail'); render(r.text); } }, 'Do it')));
    }
    if (!F.actions(id).length) list.append(h('p', { class: 'muted' }, 'Nothing to do here today. Crops grow each morning at six.'));
    body.append(list);
  };
  render();
  return { title: 'Your Field', onClose: opts.onClose };
}

export function coopPanel(ui, body, opts) {
  const g = ui.game;
  const F = g.farm;
  const render = (msg) => {
    body.innerHTML = '';
    if (msg) body.append(h('p', {}, h('b', {}, msg)));
    body.append(h('p', { class: 'muted' }, `Lariat Co-op — today's bids (price index ${F.state.priceIndex.toFixed(2)}; chalked up at 06:00).`));
    const list = h('div', { class: 'list' });
    for (const c of Object.values(F.def.crops)) {
      const have = g.inventory.count(c.crop);
      const price = F.coopPrice(c.crop);
      list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, c.crop === 'item_crop_cotton' ? '🧺' : '🌾'),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, g.content.items[c.crop].name, h('span', { class: 'tag' }, `${price} obols`)), h('div', { class: 'desc' }, `You have ${have}.`)),
        h('button', { class: 'small', disabled: !have, onclick: () => render(F.sellAtCoop(c.crop, 1).text) }, 'Sell 1'),
        h('button', { class: 'small primary', disabled: !have, onclick: () => { const r = F.sellAtCoop(c.crop, have); ui.audio.sfx(r.ok ? 'sfx_coin' : 'sfx_fail'); render(r.text); } }, 'Sell all')));
    }
    body.append(list);
  };
  render();
  return { title: 'Lariat Co-op — Scale House', onClose: opts.onClose };
}
