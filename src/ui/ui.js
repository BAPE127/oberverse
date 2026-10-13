// UI controller: title/new-game screens, HUD, modal panels, dialogue, and the
// glue between game events and feedback (toasts, sound). Owns the current Game.
import { Game } from '../game/game.js';
import { TILE } from '../core/util.js';
import { versionLabel } from '../core/version.js';
import { Renderer } from '../engine/renderer.js';
import { drawPortrait } from '../engine/drawCharacter.js';
import { DialogueUI } from './dialogueUI.js';
import { MapRenderer } from './maps.js';
import { PANELS, h } from './panels.js';
import { saveSettings } from '../save/saveManager.js';

export const LOOKS = [
  { skin: '#d9a77c', hair: '#2f2a35', hairStyle: 'short', outfit: '#3f7f8f', accent: '#f2c14e', accessory: 'scarf', build: 'average', height: 1 },
  { skin: '#f1c9a5', hair: '#c8743a', hairStyle: 'ponytail', outfit: '#7a4f8a', accent: '#9ad1c4', accessory: 'scarf', build: 'thin', height: 0.98 },
  { skin: '#7a4a32', hair: '#151217', hairStyle: 'curly', outfit: '#c0614a', accent: '#f4efe6', accessory: 'none', build: 'average', height: 1.02 },
  { skin: '#b98262', hair: '#5b5f66', hairStyle: 'hat', hatColor: '#3d4f6b', outfit: '#5f7d4a', accent: '#e8b64c', accessory: 'scarf', build: 'broad', height: 1.03 },
  { skin: '#e8b894', hair: '#e6d3a1', hairStyle: 'long', outfit: '#2f4a6b', accent: '#e07a8a', accessory: 'none', build: 'thin', height: 0.97 },
];

const AUTOSAVE_INTERVAL = 240; // real seconds

export class UI {
  constructor({ content, settings, saves, audio, assets, canvas, input }) {
    this.content = content;
    this.settings = settings;
    this.saves = saves;
    this.audio = audio;
    this.assets = assets;
    this.canvas = canvas;
    this.input = input;
    this.state = 'title';
    this.panelStack = [];
    this.dialogue = new DialogueUI(this);
    this.lastAutosave = 0;
    this.lastMapAutosave = -999;
    this.time = 0;
    this.fps = 60;
    this.el = {
      hud: document.getElementById('hud'),
      clock: document.getElementById('hud-clock'),
      location: document.getElementById('hud-location'),
      money: document.getElementById('hud-money'),
      tracker: document.getElementById('hud-tracker'),
      prompt: document.getElementById('hud-prompt'),
      health: document.getElementById('bar-health'),
      energy: document.getElementById('bar-energy'),
      toasts: document.getElementById('toasts'),
      minimap: document.getElementById('minimap'),
      debug: document.getElementById('debug'),
      title: document.getElementById('screen-title'),
      titleMenu: document.getElementById('title-menu'),
      newScreen: document.getElementById('screen-new'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalTabs: document.getElementById('modal-tabs'),
      fade: document.getElementById('fade'),
    };
    this.caption = h('div', { id: 'caption', class: 'hidden', style: 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);max-width:min(640px,90vw);background:rgba(251,244,230,.96);border:2px solid #2d2433;border-radius:12px;padding:10px 16px;font-size:15px;box-shadow:0 6px 18px rgba(0,0,0,.3);pointer-events:none' });
    document.body.appendChild(this.caption);
    document.getElementById('modal-close').addEventListener('click', () => this.closePanel());
    this.el.modal.addEventListener('click', (e) => { if (e.target === this.el.modal) this.closePanel(); });
    document.getElementById('title-version').textContent = `${versionLabel()}`;
    window.addEventListener('beforeunload', () => { if (this.state === 'playing') this.autosave(); });
  }

  // ------------------------------------------------------------ screens
  showTitle() {
    this.state = 'title';
    this.closeAllPanels();
    if (this.dialogue.open) this.dialogue.close();
    this.el.hud.classList.add('hidden');
    this.el.newScreen.classList.add('hidden');
    this.el.title.classList.remove('hidden');
    // A living backdrop: a real simulation of Lanternside, viewed from Civic Square.
    const demo = new Game(this.content, { seed: Date.now() & 0xffff });
    demo.newGame({ playerName: 'Visitor' });
    demo.player.map = 'lanternside';
    demo.player.x = 46 * TILE;
    demo.player.y = 18 * TILE;
    demo.clock.total += 60 * 3;
    demo.afterLoad();
    this.setGame(demo, { demo: true });
    const menu = this.el.titleMenu;
    menu.innerHTML = '';
    const recent = this.saves.mostRecent();
    const btn = (label, fn, cls = '') => menu.appendChild(h('button', { class: cls, onclick: () => { this.audio.unlock(); this.audio.sfx('sfx_ui_click'); fn(); } }, label));
    if (recent) btn(`Continue — ${recent.meta.playerName}, Day ${recent.meta.day} ${recent.meta.time}`, () => this.loadFrom(recent.slot), 'primary');
    btn('New game', () => this.showNewGame(), recent ? '' : 'primary');
    btn('Load game', () => this.openPanel('saves', { mode: 'load' }));
    btn('Settings', () => this.openPanel('settings'));
    btn('About', () => this.openPanel('about'));
  }

  showNewGame() {
    this.state = 'new';
    this.el.title.classList.add('hidden');
    this.el.newScreen.classList.remove('hidden');
    const nameEl = document.getElementById('new-name');
    const looks = document.getElementById('new-look');
    const preview = document.getElementById('new-preview');
    let pick = 0;
    const draw = () => {
      drawPortrait(preview.getContext('2d'), LOOKS[pick], preview.width);
      [...looks.children].forEach((c, i) => c.classList.toggle('active', i === pick));
    };
    looks.innerHTML = '';
    LOOKS.forEach((l, i) => looks.appendChild(h('button', { class: 'swatch', style: `background:linear-gradient(135deg, ${l.outfit} 50%, ${l.hair} 50%)`, 'aria-label': `Look ${i + 1}`, onclick: () => { pick = i; this.audio.sfx('sfx_ui_click'); draw(); } })));
    draw();
    document.getElementById('new-back').onclick = () => this.showTitle();
    document.getElementById('new-start').onclick = () => {
      this.audio.unlock();
      this.startNewGame(nameEl.value, LOOKS[pick]);
    };
    setTimeout(() => nameEl.focus(), 50);
  }

  startNewGame(name, look) {
    const game = new Game(this.content, { seed: (Date.now() ^ 0x5eed) >>> 0 });
    game.newGame({ playerName: name, appearance: { ...look } });
    this.el.newScreen.classList.add('hidden');
    this.enterPlay(game);
    this.autosave();
    this.showCaption('You wake in your new flat. There is a letter on the desk. (Walk with WASD, interact with E.)', 7);
  }

  enterPlay(game) {
    this.state = 'playing';
    this.el.title.classList.add('hidden');
    this.el.newScreen.classList.add('hidden');
    this.closeAllPanels();
    this.setGame(game);
    this.el.hud.classList.remove('hidden');
    this.lastAutosave = this.time;
    this.flash();
  }

  setGame(game, { demo = false } = {}) {
    this.game = game;
    this.demo = demo;
    this.maps = new MapRenderer(game);
    this.renderer = new Renderer(this.canvas, game, this.assets);
    this.renderer.hidePlayer = demo;
    this.renderer.snapCamera();
    if (!demo) this.bindGame(game);
  }

  quitToTitle() {
    this.autosave();
    this.audio.stopAll();
    this.showTitle();
  }

  // ------------------------------------------------------------- saving
  saveTo(slot) {
    const r = this.saves.save(slot, this.game);
    if (r.ok) this.toast(`Game saved (${slot === 'auto' ? 'autosave' : slot}).`, 'good');
    else this.toast(r.error, 'warn');
    return r;
  }

  autosave() {
    if (this.state !== 'playing' || !this.game?.player || this.demo) return;
    const r = this.saves.save('auto', this.game);
    this.lastAutosave = this.time;
    if (!r.ok) this.toast(`Autosave failed: ${r.error}`, 'warn');
  }

  loadFrom(slot) {
    const game = new Game(this.content);
    const r = this.saves.load(slot, game);
    if (!r.ok) {
      this.toast(`Could not load: ${r.errors.join(' ')}`, 'warn');
      return false;
    }
    this.enterPlay(game);
    this.toast(`Loaded ${slot === 'auto' ? 'autosave' : slot}. Day ${game.clock.day}, ${game.clock.timeString}.`, 'good');
    for (const w of r.warnings || []) this.toast(`Save repaired: ${w}`, 'warn');
    for (const m of r.migrated || []) this.toast(`Save upgraded: ${m}`, 'info');
    return true;
  }

  exportSlot(slot) {
    const raw = this.saves.exportSlot(slot);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `oberverse-${slot}-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ------------------------------------------------------------- panels
  openPanel(name, opts = {}) {
    const fn = PANELS[name];
    if (!fn) return;
    if (this.state === 'playing' && this.game) this.game.paused = true;
    const top = this.panelStack[this.panelStack.length - 1];
    if (top && top.name === name) this.panelStack.pop();
    this.panelStack.push({ name, opts });
    this.renderPanel();
    this.audio.sfx('sfx_ui_open');
  }

  renderPanel() {
    const top = this.panelStack[this.panelStack.length - 1];
    if (!top) return;
    const { modalBody, modalTitle, modalTabs, modal } = this.el;
    modalBody.innerHTML = '';
    modalTabs.innerHTML = '';
    const res = PANELS[top.name](this, modalBody, top.opts) || {};
    top.onClose = res.onClose;
    modalTitle.textContent = res.title || '';
    for (const t of res.tabs || []) modalTabs.appendChild(h('button', { class: t.active ? 'active' : '', onclick: () => { this.panelStack.pop(); t.onclick(); } }, t.label));
    modal.classList.remove('hidden');
  }

  closePanel() {
    const top = this.panelStack.pop();
    this.audio.sfx('sfx_ui_close');
    top?.onClose?.();
    if (this.panelStack.length) this.renderPanel();
    else {
      this.el.modal.classList.add('hidden');
      this.afterModalClose();
    }
  }

  closeAllPanels() {
    while (this.panelStack.length) this.panelStack.pop()?.onClose?.();
    this.el.modal.classList.add('hidden');
  }

  get panelOpen() {
    return this.panelStack.length > 0;
  }

  afterModalClose() {
    if (this.state === 'playing' && this.game && !this.panelOpen && !this.dialogue.open) this.game.paused = false;
    this.input.clear();
  }

  // ----------------------------------------------------------- feedback
  toast(text, kind = 'info', seconds = 4.5) {
    const t = h('div', { class: `toast ${kind}` }, text);
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 6) this.el.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('fade'), seconds * 1000);
    setTimeout(() => t.remove(), seconds * 1000 + 700);
  }

  showCaption(text, seconds = 5) {
    this.caption.textContent = text;
    this.caption.classList.remove('hidden');
    clearTimeout(this.captionTimer);
    this.captionTimer = setTimeout(() => this.caption.classList.add('hidden'), seconds * 1000);
  }

  flash() {
    this.el.fade.classList.add('on');
    setTimeout(() => this.el.fade.classList.remove('on'), 180);
  }

  applySettings() {
    this.audio.applySettings(this.settings);
    this.el.debug.classList.toggle('hidden', !this.settings.showFps);
  }

  saveSettings() {
    saveSettings(this.settings);
  }

  bindGame(game) {
    const bus = game.bus;
    bus.on('notify', ({ text, kind }) => {
      this.toast(text, kind);
      if (kind === 'warn' || kind === 'event') return;
      this.audio.sfx('sfx_notify');
    });
    bus.on('sfx', ({ id }) => this.audio.sfx(id));
    bus.on('player:step', ({ surface }) => this.audio.sfx('sfx_step', { surface }));
    bus.on('item:acquired', ({ id, count, silent }) => {
      if (silent) return;
      this.audio.sfx('sfx_pickup');
      this.toast(`+${count} ${game.content.items[id]?.name}`, 'good', 3);
    });
    bus.on('money:changed', ({ delta }) => {
      this.audio.sfx('sfx_coin');
      if (delta > 0) this.toast(`+${delta} obols`, 'good', 3);
    });
    bus.on('quest:started', ({ title }) => { this.audio.sfx('sfx_quest'); this.toast(`New: ${title}`, 'quest', 6); });
    bus.on('quest:stage', ({ title, text }) => { this.audio.sfx('sfx_quest'); this.toast(`${title} — ${text}`, 'quest', 7); });
    bus.on('quest:completed', ({ title }) => { this.audio.sfx('sfx_quest'); this.toast(`Completed: ${title}`, 'quest', 6); });
    bus.on('quest:failed', ({ title, text }) => { this.audio.sfx('sfx_fail'); this.toast(`${title}: ${text || 'failed'}`, 'warn', 7); });
    bus.on('map:entered', () => {
      this.flash();
      this.renderer.snapCamera();
      if (this.time - this.lastMapAutosave > 90) {
        this.lastMapAutosave = this.time;
        this.autosave();
      }
    });
    bus.on('npc:gossip', ({ from }) => {
      const a = game.npcs.get(from);
      if (a && a.map === game.player.map) game.bark(a, 'Psst — did you hear…');
    });
  }

  // -------------------------------------------------------------- input
  handleAction(action) {
    this.audio.unlock();
    // Panels sit above the dialogue box (e.g. a shop opened mid-conversation), so they get input first.
    if (this.panelOpen) {
      if (action === 'pause' || action === this.panelStack[this.panelStack.length - 1].name) this.closePanel();
      return;
    }
    if (this.dialogue.handleAction(action)) return;
    if (this.state !== 'playing') return;
    switch (action) {
      case 'pause': this.openPanel('pause'); break;
      case 'inventory': this.openPanel('inventory'); break;
      case 'journal': this.openPanel('journal'); break;
      case 'map': this.openPanel('map'); break;
      case 'status': this.openPanel('journal', { tab: 'People' }); break;
      case 'interact': this.interact(); break;
      case 'quicksave': this.saveTo('slot1'); break;
      case 'quickload': this.loadFrom('slot1'); break;
      case 'debug':
        this.settings.showFps = !this.settings.showFps;
        this.applySettings();
        break;
      default: break;
    }
  }

  interact() {
    const g = this.game;
    const target = g.interactables()[0];
    if (!target) return;
    const act = g.interact(target);
    switch (act.type) {
      case 'dialogue': this.dialogue.start(act.npcId); break;
      case 'message': this.showCaption(act.text, Math.min(9, 3 + act.text.length / 40)); this.audio.sfx('sfx_ui_click'); break;
      case 'container': this.openPanel('container', { containerId: act.containerId }); break;
      case 'read': this.openPanel('read', { title: act.title, body: act.body }); break;
      case 'sleep': {
        const m = g.clock.minuteOfDay;
        const night = m >= 20 * 60 || m < 5 * 60;
        this.openPanel('message', {
          title: 'Bed',
          text: night ? 'Sleep until morning? Lanternside will carry on without you.' : 'Take a two-hour nap?',
          confirmLabel: night ? 'Sleep' : 'Nap',
          confirm: () => {
            this.closeAllPanels();
            this.el.fade.classList.add('on');
            setTimeout(() => {
              const text = g.sleep();
              this.el.fade.classList.remove('on');
              this.afterModalClose();
              this.showCaption(text, 5);
              this.autosave();
            }, 400);
          },
        });
        break;
      }
      default: break;
    }
  }

  // -------------------------------------------------------------- frame
  frame(dt) {
    this.time += dt;
    this.fps = this.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    const g = this.game;
    if (!g) return;
    if (this.state === 'playing') {
      const move = this.panelOpen || this.dialogue.open ? { x: 0, y: 0, sprint: false } : this.input.movement();
      g.update(dt, move);
      this.dialogue.update(dt);
      const target = !g.paused ? g.interactables()[0] : null;
      this.renderer.highlight = target || null;
      this.updateHud(target);
      if (this.time - this.lastAutosave > AUTOSAVE_INTERVAL) this.autosave();
    } else if (this.demo) {
      g.update(dt, { x: 0, y: 0 });
      // drift the camera target slowly around the borough
      g.player.x = (46 + Math.sin(this.time * 0.05) * 14) * TILE;
      g.player.y = (20 + Math.cos(this.time * 0.04) * 8) * TILE;
      this.renderer.highlight = null;
    }
    this.renderer.render(dt);
    this.audio.update(g);
  }

  updateHud(target) {
    const g = this.game;
    const p = g.player;
    const set = (el, text) => { if (el.textContent !== text) el.textContent = text; };
    set(this.el.clock, `Day ${g.clock.day} · ${g.clock.weekday} · ${g.clock.timeString}`);
    set(this.el.location, p.areaName || g.currentMap().name);
    set(this.el.money, `🪙 ${p.money} obols`);
    this.el.health.style.width = `${p.health}%`;
    this.el.energy.style.width = `${p.energy}%`;
    if (target) {
      const html = `<kbd>E</kbd>${escapeHtml(target.label)}`;
      if (this.el.prompt.innerHTML !== html) this.el.prompt.innerHTML = html;
      this.el.prompt.classList.remove('hidden');
    } else this.el.prompt.classList.add('hidden');
    if (Math.floor(this.time * 4) !== this.lastMiniTick) {
      this.lastMiniTick = Math.floor(this.time * 4);
      this.maps.drawMinimap(this.el.minimap);
      const active = g.quests.journal().filter((q) => q.state === 'active').slice(0, 2);
      const html = active.map((q) => `<div class="q-title">${escapeHtml(q.title)}</div>${q.objectives.map((o) => `<div class="q-obj">• ${escapeHtml(o.text)}</div>`).join('')}`).join('');
      if (this.el.tracker.innerHTML !== html) this.el.tracker.innerHTML = html;
      if (this.settings.showFps) {
        this.el.debug.textContent = [
          `FPS ${this.fps.toFixed(0)}  ${versionLabel()}`,
          `map ${p.map} tile ${Math.floor(p.x / TILE)},${Math.floor(p.y / TILE)}  t=${g.clock.total.toFixed(0)}`,
          ...g.npcSummary().map((n) => `${n.id.padEnd(10)} ${n.map.padEnd(13)} ${String(n.tile).padEnd(7)} ${n.activity.padEnd(9)} ${n.mood}${n.chat ? ' chat:' + n.chat : ''}${n.travelling ? ' →' : ''}`),
          ...g.warnings.slice(-4).map((w) => `! ${w}`),
          ...this.audio.failures.slice(-2).map((w) => `audio! ${w}`),
        ].join('\n');
      }
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
