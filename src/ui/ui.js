// UI controller: title/new-game screens, HUD, modal panels, dialogue, and the
// glue between game events and feedback (toasts, sound). Owns the current Game.
import { renderHotbar } from './hotbar.js';
import { Game } from '../game/game.js';
import { TILE } from '../core/util.js';
import { versionLabel, GAME_VERSION } from '../core/version.js';
import { RELEASE_NOTES } from '../core/releaseNotes.js';
import { Renderer } from '../engine/renderer.js';
import { drawPortrait } from '../engine/drawCharacter.js';
import { DialogueUI } from './dialogueUI.js';
import { MapRenderer } from './maps.js';
import { PANELS, h } from './panels.js';
import { terminalPanel } from './terminal.js';
import { tabletPanel } from './tablet.js';
import { dealerPanel } from './dealer.js';
import { farmlandPanel, farmplotPanel, coopPanel, livestockPanel } from './farm.js';
import { armsBenchPanel } from './armsbench.js';
import { fleetPanel } from './fleetCommand.js';
import { logbookPanel } from './logbook.js';
import { cashierPanel, casinoTablePanel } from './casino.js';
import { spadeTablePanel } from './spadeTable.js';

PANELS.terminal = terminalPanel;
PANELS.tablet = tabletPanel;
PANELS.dealer = dealerPanel;
PANELS.farmland = farmlandPanel;
PANELS.farmplot = farmplotPanel;
PANELS.coop = coopPanel;
PANELS.livestock = livestockPanel;
PANELS.armsbench = armsBenchPanel;
PANELS.logistics = fleetPanel; // Fleet Command, full screen (v0.25.0)
PANELS.fleet = fleetPanel;
PANELS.logbook = logbookPanel;
PANELS.cashier = cashierPanel; // v0.52.0: the Phonograph Grand
PANELS.casinoTable = casinoTablePanel;
PANELS.spadeTable = spadeTablePanel; // v0.53.0: Morganius's table
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
    // Mouse aiming and firing (canvas only; panels and dialogue sit above it in the DOM).
    this.mouse = { x: 0, y: 0, movedAt: -1e9, down: false };
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.movedAt = this.time;
    });
    canvas.addEventListener('contextmenu', (e) => {
      if (!this.build) return;
      e.preventDefault();
      this.buildAction('remove');
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouse.down = true;
      this.mouse.movedAt = this.time;
      this.handleAction('attack');
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    this.el = {
      hud: document.getElementById('hud'),
      clock: document.getElementById('hud-clock'),
      location: document.getElementById('hud-location'),
      money: document.getElementById('hud-money'),
      buildBar: document.getElementById('build-bar'),
      wanted: document.getElementById('hud-wanted'),
      tracker: document.getElementById('hud-tracker'),
      prompt: document.getElementById('hud-prompt'),
      health: document.getElementById('bar-health'),
      energy: document.getElementById('bar-energy'),
      weapon: document.getElementById('hud-weapon'),
      hudBl: document.getElementById('hud-bl'),
      hotbar: document.getElementById('hotbar'),
      healthText: document.getElementById('bar-health-text'),
      toasts: document.getElementById('toasts'),
      minimap: document.getElementById('minimap'),
      debug: document.getElementById('debug'),
      title: document.getElementById('screen-title'),
      titleMenu: document.getElementById('title-menu'),
      newScreen: document.getElementById('screen-new'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modal-title'),
      modalPanel: document.getElementById('modal-panel'),
      keys: document.getElementById('hud-keys'),
      tabletBadge: document.getElementById('hud-tablet'),
      modalBody: document.getElementById('modal-body'),
      modalTabs: document.getElementById('modal-tabs'),
      fade: document.getElementById('fade'),
    };
    this.caption = h('div', { id: 'caption', class: 'hidden', style: 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);max-width:min(640px,90vw);background:rgba(22,22,48,.94);color:#f4f4fc;border:3px solid #4a4aa8;border-radius:3px;padding:10px 16px;font-size:15px;box-shadow:0 6px 18px rgba(0,0,0,.3);pointer-events:none' });
    document.body.appendChild(this.caption);
    document.getElementById('modal-close').addEventListener('click', () => this.closePanel());
    this.el.tabletBadge?.addEventListener('click', () => { if (this.state === 'playing' && !this.panelOpen && !this.dialogue.open) this.openPanel('tablet'); });
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
    this.renderer.mouse = this.mouse; // v0.44.0: the crosshair
    this.renderer.pixel = true; // v0.47.0: one art style (the old look is gone)
    this.renderer.resize();
    document.body.classList.add('pixel-ui');
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
    if (r.savedWith && r.savedWith !== GAME_VERSION) {
      const note = RELEASE_NOTES.find((n) => n.version === GAME_VERSION);
      if (note) this.toast(`Updated to v${GAME_VERSION} — ${note.title}: ${note.notes[0]}`, 'quest', 12);
    }
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
    this.caption?.classList.add('hidden'); // captions belong to the world, not to menus
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
    modalBody.className = ''; // v0.53.1: a panel's own classes (Marty's paper showroom, the full-screen scenes) leave with it
    modalTabs.innerHTML = '';
    const res = PANELS[top.name](this, modalBody, top.opts) || {};
    top.onClose = res.onClose;
    modalTitle.textContent = res.title || '';
    if (this.el.modalPanel) this.el.modalPanel.className = `panel${res.className ? ` ${res.className}` : ''}`;
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
    bus.on('sfx', ({ id, opts }) => this.audio.sfx(id, opts));
    bus.on('combat:playerHit', () => this.audio.sfx('sfx_hurt'));
    // The Wrath: an imported character was attacked (src/systems/combat.js, src/engine/wrath.js)
    bus.on('combat:wrath', ({ theme }) => {
      this.closeAllPanels();
      if (this.dialogue.open) this.dialogue.close();
      this.el.hud.classList.add('cinematic');
      this.caption.classList.add('hidden');
      this.audio.duck(12);
      this.audio.sfx('sfx_wrath', { theme });
    });
    // each strike sounds like what hits you
    bus.on('combat:lightning', ({ theme, index }) => this.audio.sfx({ oil: 'sfx_gusher', construction: 'sfx_beam', law: 'sfx_ram', maths: 'sfx_digit', arms: 'sfx_crate' }[theme] || 'sfx_thunder', { index }));
    bus.on('combat:wrathEnd', ({ npcId }) => {
      this.el.hud.classList.add('cinematic');
      const victim = game.npcs.get(npcId);
      this.openPanel('struckDown', { name: victim?.profile.name || 'them', after: victim?.profile.wrath?.after });
    });
    bus.on('combat:playerDown', () => {
      this.closeAllPanels();
      if (this.dialogue.open) this.dialogue.close();
      this.el.fade.classList.add('on');
      setTimeout(() => { this.el.fade.classList.remove('on'); this.renderer.snapCamera(); }, 900);
    });
    // the police (src/systems/police.js)
    bus.on('police:wanted', ({ level }) => { if (level > 0) this.audio.sfx('sfx_fail'); });
    bus.on('police:jailed', () => {
      if (game.combat.wrath) return; // the struck-down card handles the cut
      this.closeAllPanels();
      if (this.dialogue.open) this.dialogue.close();
      this.el.fade.classList.add('on');
      setTimeout(() => { this.el.fade.classList.remove('on'); this.renderer.snapCamera(); }, 900);
    });
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
    bus.on('map:entered', ({ seamless, from, map }) => {
      if (seamless) {
        // Walking across a seam between outdoor maps: no fade, no camera jump.
        this.renderer.seamlessShift(from, map);
        return;
      }
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
      const topName = this.panelStack[this.panelStack.length - 1].name;
      // v0.52.0: you can't walk away from a hand of blackjack in the middle of it (the scene says so)
      if (topName === 'spadeTable') { if (action === 'pause' && !spadeTablePanel.live?.anim) this.closePanel(); return; }
      if (topName === 'casinoTable') { if (action === 'pause' && this.game?.casino.canLeave() && !casinoTablePanel.live?.spin) this.closePanel(); return; }
      if (action === 'pause' || action === topName) this.closePanel();
      return;
    }
    if (this.casinoWait) {
      // Morganius is on his way: any key hurries him up
      if (action === 'interact' || action === 'attack' || action === 'pause') this.game.casino.skipArrival();
      return;
    }
    if (this.dialogue.handleAction(action)) return;
    if (this.state !== 'playing' || this.game?.combat.wrath) return;
    if (this.build && this.buildAction(action)) return;
    switch (action) {
      case 'build': if (!this.game.player.driving) this.toggleBuild(); break;
      case 'horn': {
        const g = this.game;
        if (!g.player.driving) break;
        const car = g.vehicles.driving();
        const hm = car && g.vehicles.model(car);
        if (car) car.hornAt = g.realTime; // v0.34.0: the Gavel's gavel comes down
        this.audio.sfx('sfx_horn', { kind: hm?.horn });
        if (hm?.horn === 'moo') for (const n of g.npcs.values()) if (n.map === g.player.map && Math.hypot(n.x - g.player.x, n.y - g.player.y) < 160 && g.rng.chance(0.3)) g.bark(n, g.rng.pick(['Did that car just MOO?', 'Was that a cow?', '…moo?']));
        // people nearby jump out of their skin
        for (const n of g.npcs.values()) if (n.map === g.player.map && Math.hypot(n.x - g.player.x, n.y - g.player.y) < 160 && g.rng.chance(0.4)) g.bark(n, g.rng.pick(['Oi!', 'Alright, alright!', 'I heard you the first time!', '*jumps*']));
        break;
      }
      case 'pause': this.openPanel('pause'); break;
      case 'inventory': this.openPanel('inventory'); break;
      case 'journal': this.openPanel('tablet'); break;
      case 'map': this.openPanel('map'); break;
      case 'status': this.openPanel('tablet', { tab: 'People' }); break;
      case 'interact': this.interact(); break;
      case 'attack': {
        const r = this.game.combat.attack();
        if (r.text) this.showCaption(r.text, 2);
        break;
      }
      case 'reload': {
        const r = this.game.combat.reload();
        if (r.text && !r.ok) this.toast(r.text, 'info', 2);
        break;
      }
      case 'nextWeapon': {
        const r = this.game.combat.cycle(1);
        if (r.text) this.toast(r.text, 'info', 2);
        break;
      }
      case 'surrender': {
        const r = this.game.police.surrender();
        if (r.text) this.toast(r.text, 'info', 2);
        break;
      }
      case 'holster': {
        const r = this.game.combat.equip(null);
        if (r.text) this.toast(r.text, 'info', 2);
        break;
      }
      case 'quicksave': this.saveTo('slot1'); break;
      case 'quickload': this.loadFrom('slot1'); break;
      case 'debug':
        this.openPanel('debug');
        break;
      default:
        if (action.startsWith('choice')) {
          const r = this.game.combat.select(Number(action.slice(6)));
          if (r.text) this.toast(r.text, 'info', 2);
        }
        break;
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
      case 'choices': this.openPanel('choices', act); break;
      case 'contracts': this.openPanel('contracts', {}); break;
      case 'shop': this.openPanel('shop', { shopId: act.shopId }); break;
      case 'terminal': this.openPanel('terminal', { warehouse: act.warehouse }); break;
      case 'armsbench': this.openPanel('armsbench', { warehouse: act.warehouse }); break;
      case 'panel': this.openPanel(act.panel, act.opts || {}); break;
      case 'casino': // v0.52.0: you've sat down; the host is coming (src/systems/casino.js summonHost)
        this.casinoWait = { table: act.table, readyAt: null };
        this.showCaption('Morganius Spade is on his way to your table…  (E to hurry him)', 3);
        break;
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

  /** v0.52.0: once the host has landed and bowed, the table scene opens. */
  updateCasinoWait() {
    const g = this.game;
    const w = this.casinoWait;
    if (!g.casino.state.session) { this.casinoWait = null; return; }
    if (!g.casino.hostReady) return;
    if (w.readyAt === null) {
      w.readyAt = this.time;
      const m = g.npcs.get('npc_morganius');
      if (m) m.anim = { state: 'flourish', t0: g.realTime };
      this.audio.sfx('sfx_magic');
    }
    if (this.time - w.readyAt < (g.casino.state.visits <= 1 ? 0.9 : 0.35) && !g.casino.arrival?.skipped) return;
    this.casinoWait = null;
    this.openPanel(g.casino.table(w.table)?.game === 'spade' ? 'spadeTable' : 'casinoTable', { table: w.table });
  }

  // ---------------------------------------------------- factory build mode
  /** B in a warehouse you own: place machinery on the floor grid (src/systems/factory.js). */
  toggleBuild() {
    const g = this.game;
    if (this.build) return this.exitBuild();
    const sys = [g.factory, g.arms].find((x) => x.warehouseForMap(g.player.map));
    const wh = sys?.warehouseForMap(g.player.map);
    if (!wh) { this.toast('You can only build inside a warehouse you own.', 'info', 3); return; }
    if (!sys.owns(wh)) { this.toast('This isn\'t your warehouse.', 'info', 3); return; }
    this.build = { sys, wh, tool: null, dir: 0 };
    this.build.tool = this.buildTools()[0] || 'remove';
    this.el.buildBar.classList.remove('hidden');
    this.buildBarKey = null;
    this.audio.sfx('sfx_ui_click');
  }

  exitBuild() {
    this.build = null;
    this.renderer.buildCursor = null;
    this.el.buildBar.classList.add('hidden');
  }

  buildTools() {
    const dom = this.build?.sys.domain;
    return this.game.inventory.list().filter((e) => e.def.build && (!dom || (e.def.build.domain || (e.def.build.type === 'machine' ? 'calc' : dom)) === dom)).map((e) => e.id);
  }

  /** Returns true if build mode used the action. */
  buildAction(action) {
    const g = this.game;
    const b = this.build;
    const c = this.renderer.buildCursor;
    if (action === 'build' || action === 'pause') { this.exitBuild(); return true; }
    if (action === 'reload') {
      // R: rotate the tool, or the belt/arm under the cursor when picking up
      if (b.tool === 'remove' && c) b.sys.rotate(b.wh, c.x, c.y);
      else b.dir = (b.dir + 1) % 4;
      return true;
    }
    const m = /^choice(\d)$/.exec(action);
    if (m) {
      const tools = [...this.buildTools(), 'remove'];
      const pick = tools[Number(m[1]) - 1];
      if (pick) b.tool = pick;
      return true;
    }
    if (action === 'remove' || (action === 'attack' && b.tool === 'remove')) {
      if (!c) return true;
      const r = b.sys.remove(b.wh, c.x, c.y);
      if (r.ok) this.audio.sfx('sfx_pickup'); else this.audio.sfx('sfx_fail');
      return true;
    }
    if (action === 'attack') {
      if (!c) return true;
      const r = b.sys.place(b.wh, b.tool, c.x, c.y, b.dir);
      if (r.ok) this.audio.sfx('sfx_door'); else { this.audio.sfx('sfx_fail'); this.toast(r.text, 'info', 2); }
      if (!g.inventory.count(b.tool)) b.tool = this.buildTools()[0] || 'remove';
      return true;
    }
    return false;
  }

  updateBuild() {
    const g = this.game;
    const b = this.build;
    if (g.player.map !== b.sys.def(b.wh).map) return this.exitBuild();
    const z = this.renderer.cam.zoom;
    const tx = Math.floor((this.renderer.cam.x + this.mouse.x / z) / TILE);
    const ty = Math.floor((this.renderer.cam.y + this.mouse.y / z) / TILE);
    const def = b.tool !== 'remove' ? g.content.items[b.tool]?.build : null;
    const w = def?.w || 1;
    const hh = def?.h || 1;
    const valid = def ? !b.sys.blockReason(b.wh, tx, ty, w, hh) : Boolean(b.sys.at(b.wh, tx, ty)?.fx);
    this.renderer.buildCursor = { x: tx, y: ty, w, h: hh, valid, dir: b.dir, arrow: def && (def.type === 'belt' || def.type === 'inserter' || def.type === 'sorter'), remove: !def };
    // the toolbar
    const tools = this.buildTools();
    const p = b.sys.power(b.wh);
    const key = JSON.stringify([tools.map((id) => [id, g.inventory.count(id)]), b.tool, b.dir, p]);
    if (key === this.buildBarKey) return;
    this.buildBarKey = key;
    const bar = this.el.buildBar;
    bar.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'tools';
    [...tools, 'remove'].forEach((id, i) => {
      const btn = document.createElement('button');
      btn.className = `small${b.tool === id ? ' on' : ''}`;
      btn.textContent = id === 'remove' ? `${i + 1} · Pick up` : `${i + 1} · ${g.content.items[id].name} ×${g.inventory.count(id)}`;
      btn.onclick = () => { b.tool = id; this.buildBarKey = null; };
      row.append(btn);
    });
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = `Click to place · Right-click to pick up · R rotate (${['→', '↓', '←', '↑'][b.dir]}) · B or Esc to finish · Power: ${p.machines}/${p.capacity} machines${tools.length ? '' : ' · You have no machinery — buy some from Sal'}`;
    bar.append(row, hint);
  }

  // -------------------------------------------------------------- frame
  frame(dt) {
    this.time += dt;
    this.fps = this.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    const g = this.game;
    if (!g) return;
    if (this.state === 'playing') {
      const move = this.panelOpen || this.dialogue.open || this.casinoWait ? { x: 0, y: 0, sprint: false } : this.input.movement();
      const busy = this.panelOpen || this.dialogue.open || g.combat.wrath;
      // aim at the mouse while it is being used; otherwise facing + auto-aim
      if (!busy && this.time - this.mouse.movedAt < 4 && this.renderer.cam) {
        const z = this.renderer.cam.zoom;
        const wx = this.renderer.cam.x + this.mouse.x / z;
        const wy = this.renderer.cam.y + this.mouse.y / z;
        g.player.aim = { x: wx - g.player.x, y: wy - (g.player.y - 18) };
      } else g.player.aim = null;
      // automatic weapons fire while the button is held
      if (!busy && !this.build && g.combat.equipped().weapon.auto && (this.mouse.down || this.input.down.has('KeyF'))) g.combat.attack();
      if (this.build) this.updateBuild();
      // v0.44.0: hit-stop — the world holds its breath for a blink when a blow lands
      if (g.combat.hitAt && g.combat.hitAt !== this.seenHit) { this.seenHit = g.combat.hitAt; this.freezeUntil = this.time + 0.05; }
      if (this.time >= (this.freezeUntil || 0)) g.update(dt, move);
      // the engine note follows your speed (src/audio/audioEngine.js)
      const car = g.vehicles.driving();
      this.audio.setEngine(car && !g.paused && !busy ? Math.min(1, Math.abs(car.speed || 0) / g.vehicles.model(car).top) : null);
      // sirens: louder the closer the nearest cruiser (src/systems/pursuit.js)
      let siren = null;
      if (!g.paused && !busy) for (const c of g.pursuit.active()) { // a cruiser heading home has its siren off
        const at = g.pursuit.playerIn(c.map);
        if (!at) continue;
        const k = 1 - Math.min(1, Math.hypot(c.x - at.x, c.y - at.y) / (30 * TILE));
        if (k > 0) siren = Math.max(siren ?? 0, k);
      }
      this.audio.setSiren(siren);
      this.dialogue.update(dt);
      if (this.casinoWait) this.updateCasinoWait();
      const target = !g.paused ? g.interactables()[0] : null;
      this.renderer.highlight = target || null;
      this.updateHud(target);
      if (this.time - this.lastAutosave > AUTOSAVE_INTERVAL && !g.combat.wrath) this.autosave();
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
    if (this.el.healthText) set(this.el.healthText, `Health ${Math.max(0, Math.ceil(p.health))} / 100`);
    renderHotbar(this);
    // the law: Wanted stars, a bribe running, time left inside
    const pol = g.world.police;
    let whtmlWanted = '';
    if (pol?.wanted > 0) whtmlWanted += `<span class="stars${pol.wanted >= 2 ? ' flash' : ''}">${'★'.repeat(pol.wanted)}<span class="off">${'★'.repeat(3 - pol.wanted)}</span></span> WANTED`;
    const cruisers = g.pursuit?.active().filter((c) => c.chase.mode === 'chase').length || 0;
    if (pol?.wanted > 0 && cruisers) whtmlWanted += ` <span class="tag">🚓 ×${cruisers} in pursuit</span>`;
    else if (pol?.wanted > 0 && g.pursuit?.active().length) whtmlWanted += ' <span class="tag">🔦 They\'re searching</span>';
    if (pol?.jail) whtmlWanted += `<span class="tag">⛓ In jail · ${g.police.hoursLeft()}h left</span>`;
    else if (g.police?.bribed()) whtmlWanted += `<span class="tag">🤝 Police paid off · until end of Day ${pol.bribedUntilDay}</span>`;
    // calculator highs and comedowns; the Sums of Anarchy's mood
    for (const b of g.calculators.active()) whtmlWanted += `<span class="tag ${b.delta > 0 ? 'high' : 'low'}">🧮 ${b.stat[0].toUpperCase()}${b.stat.slice(1)} ${b.delta > 0 ? '+' : ''}${b.delta} · ${b.minutesLeft >= 60 ? `${Math.floor(b.minutesLeft / 60)}h` : `${b.minutesLeft}m`}</span>`;
    const tier = g.gang.tier();
    if (tier > 0) whtmlWanted += `<span class="tag gang t${tier}">∑ Sums of Anarchy: ${['', 'warned you', 'HOSTILE', 'AT WAR'][tier]}</span>`;
    else if (g.gang.truce()) whtmlWanted += `<span class="tag">∑ Truce with the Sums · Day ${g.world.gang.truceUntilDay}</span>`;
    if (this.el.wanted.innerHTML !== whtmlWanted) this.el.wanted.innerHTML = whtmlWanted;
    this.el.wanted.classList.toggle('hidden', !whtmlWanted);
    this.el.energy.style.width = `${p.energy}%`;
    const w = g.combat.equipped();
    const ammo = g.combat.ammoStatus();
    const ammoHtml = ammo ? `<span class="ammo${ammo.loaded ? '' : ' empty'}">${ammo.reloading ? 'reloading…' : `${ammo.loaded}/${ammo.mag}`} · ${ammo.reserve}</span>` : '';
    const car = g.vehicles.driving();
    const riding = p.riding !== null && p.riding !== undefined ? g.transit.bus(p.riding) : null;
    const whtml = riding
      ? `<span>🚌 ${escapeHtml(g.transit.lineOf(riding).cfg.name)} ${escapeHtml(g.transit.heading(riding))}</span><span class="ammo">${g.transit.dwelling(riding) ? `at ${escapeHtml(g.transit.stopFor(riding).name)}` : `next: ${escapeHtml(g.transit.stopFor(riding, true).name)}`}</span>`
      : car
      ? `<span>🚗 ${escapeHtml(g.vehicles.model(car).name)}${car.stolen ? ' <span class="tag bad">stolen</span>' : ''}</span><span class="ammo">${Math.round(Math.abs(car.speed || 0) * 0.105)} mph</span>`
      : `<span>${w.id ? '⚔' : '✊'} ${escapeHtml(w.name)}</span>${ammoHtml}`;
    if (this.el.weapon.innerHTML !== whtml) this.el.weapon.innerHTML = whtml;
    if (p.hurtAt && g.realTime - p.hurtAt < 0.05) { this.el.hudBl.classList.remove('hurt'); void this.el.hudBl.offsetWidth; this.el.hudBl.classList.add('hurt'); }
    if (this.el.keys) {
      if (!this.walkKeys) this.walkKeys = this.el.keys.textContent;
      set(this.el.keys, riding ? 'Riding the bus · E get off when it stops · J tablet · M map' : car ? 'W / ↑ accelerate · S / ↓ brake & reverse · A D steer · Shift handbrake · H horn · E get out · M map' : this.walkKeys);
    }
    const hw = g.vehicles.hotwire || g.homes.picking;
    if (hw) {
      const k = Math.min(1, hw.t / hw.need);
      const html = `${g.homes.picking ? '🔓 Picking the lock…' : '🔧 Hotwiring…'} <span class="hotwire"><i style="width:${Math.round(k * 100)}%"></i></span> (stand still)`;
      if (this.el.prompt.innerHTML !== html) this.el.prompt.innerHTML = html;
      this.el.prompt.classList.remove('hidden');
    } else if (target) {
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
      const unread = g.tablet.unread;
      const badge = unread ? `📱 ${unread} new` : '';
      if (this.el.tabletBadge && this.el.tabletBadge.textContent !== badge) {
        this.el.tabletBadge.textContent = badge;
        this.el.tabletBadge.classList.toggle('hidden', !unread);
      }
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
