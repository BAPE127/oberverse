// The armourer's workbench (v0.19.0): hand-make one weapon, or a box of its
// ammunition, for yourself, from parts on the loading dock. See
// BENCH_RECIPES in src/content/arms.js and Arms.benchCraft.
import { h, itemIcon } from './panels.js';

export function armsBenchPanel(ui, body, opts) {
  const g = ui.game;
  const A = g.arms;
  const wh = opts.warehouse;
  const items = g.content.items;
  const dock = g.world.containers[A.def(wh).inBay]?.items || {};
  const go = (msg) => ui.openPanel('armsbench', { warehouse: wh, msg });
  body.append(h('p', { class: 'muted' }, 'Make ONE weapon or a box of ammo for yourself, straight from parts on the loading dock — no staff needed, but it takes your time. For export, staffed stations make whole crates.'));
  if (opts.msg) body.append(h('p', {}, h('b', {}, opts.msg)));
  const section = (title, ids) => {
    body.append(h('h3', { style: 'margin:12px 0 6px' }, title));
    const list = h('div', { class: 'list' });
    for (const rid of ids) {
      const r = A.cfg.bench[rid];
      const it = items[r.out];
      const locked = !A.benchUnlocked(rid);
      const short = locked ? {} : A.benchShort(wh, rid);
      const parts = Object.entries(r.in).map(([id, n]) => {
        const have = dock[id] || 0;
        return h('span', { class: `tag${have < n ? ' bad' : ''}` }, `${items[id].name} ${Math.min(have, n)}/${n}`);
      });
      const buttons = locked
        ? [h('span', { class: 'tag' }, `🔒 ${A.cfg.research[r.requires].name}`)]
        : [
          h('button', { class: 'small primary', disabled: Object.keys(short).length > 0, onclick: () => { const res = A.benchCraft(wh, rid); ui.audio.sfx(res.ok ? 'sfx_pickup' : 'sfx_fail'); go(res.text); } }, `Make (${r.minutes} min)`),
          Object.keys(short).length ? h('button', { class: 'small', onclick: () => {
            let cost = 0;
            for (const [id, n] of Object.entries(short)) { const res = A.order(wh, id, n); if (!res.ok) { go(res.text); return; } cost += A.partPrice(id) * n; }
            ui.audio.sfx('sfx_coin');
            go(`Ordered the missing parts (${cost} obols). They'll be on the dock within the hour.`);
          } }, 'Order missing') : null,
        ];
      list.append(h('div', { class: 'item-row' }, h('div', { class: 'icon' }, itemIcon(it)),
        h('div', { class: 'grow' }, h('div', { class: 'name' }, `${r.count > 1 ? `${r.count}× ` : ''}${it.name}`), h('div', { class: 'desc' }, ...parts)),
        ...buttons.filter(Boolean)));
    }
    body.append(list);
  };
  const all = Object.keys(A.cfg.bench);
  section('Weapons', all.filter((rid) => items[A.cfg.bench[rid].out].category !== 'ammo'));
  section('Ammunition', all.filter((rid) => items[A.cfg.bench[rid].out].category === 'ammo'));
  return { title: 'Armourer\'s Workbench' };
}
