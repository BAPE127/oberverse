// Dialogue box: typewriter text with per-character voice blips, numbered
// options, the "Ask about…" field, and hand-off to shops.
import { DialogueSession } from '../dialogue/dialogueEngine.js';
import { drawPortrait } from '../engine/drawCharacter.js';
import { faceToward } from '../sim/npcSystem.js';

const SPEEDS = { slow: 28, normal: 55, fast: 110, instant: 100000 };

export class DialogueUI {
  constructor(ui) {
    this.ui = ui;
    this.el = document.getElementById('dialogue');
    this.textEl = document.getElementById('dlg-text');
    this.optsEl = document.getElementById('dlg-options');
    this.nameEl = document.getElementById('dlg-name');
    this.metaEl = document.getElementById('dlg-meta');
    this.contEl = document.getElementById('dlg-continue');
    this.askForm = document.getElementById('dlg-ask');
    this.askInput = document.getElementById('dlg-ask-input');
    this.portrait = document.getElementById('dlg-portrait');
    this.open = false;
    this.askForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.session) return;
      const q = this.askInput.value;
      this.askInput.value = '';
      this.askInput.blur();
      this.ui.audio.sfx('sfx_ui_click');
      this.show(this.session.ask(q));
    });
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('form')) return;
      this.advance();
    });
  }

  get game() {
    return this.ui.game;
  }

  start(npcId) {
    const g = this.game;
    const npc = g.npcs.get(npcId);
    if (!npc) return;
    this.npc = npc;
    npc.inDialogue = true;
    npc.facing = faceToward(npc, g.player);
    g.player.facing = faceToward(g.player, npc);
    this.session = new DialogueSession(g, npcId);
    this.open = true;
    g.paused = true;
    this.el.classList.remove('hidden');
    this.nameEl.textContent = npc.profile.shortName;
    this.drawPortrait();
    this.ui.audio.motif(npc.profile.motif);
    this.show(this.session.start());
  }

  drawPortrait() {
    const ctx = this.portrait.getContext('2d');
    const a = this.npc.profile.appearance;
    const npcId = this.npc.id;
    const img = a.portrait ? this.ui.assets.image(a.portrait, () => { if (this.open && this.npc?.id === npcId) this.drawPortrait(); }) : null;
    if (img) {
      ctx.clearRect(0, 0, this.portrait.width, this.portrait.height);
      ctx.drawImage(img, 0, 0, this.portrait.width, this.portrait.height);
    } else drawPortrait(ctx, a, this.portrait.width);
  }

  show(node) {
    if (!node) return this.close();
    this.node = node;
    this.pages = [...node.pages];
    if (node.checkResult) {
      const c = node.checkResult;
      this.checkLine = `${c.success ? '✓' : '✗'} ${c.stat[0].toUpperCase() + c.stat.slice(1)} check ${c.success ? 'succeeded' : 'failed'} (${Math.round(c.chance * 100)}%)`;
      this.ui.audio.sfx(c.success ? 'sfx_success' : 'sfx_fail');
    } else this.checkLine = null;
    const mood = this.game.content.moods[node.mood];
    this.metaEl.textContent = `${node.relation}${mood && node.mood !== 'neutral' ? ` · ${mood.label}` : ''}`;
    this.optsEl.innerHTML = '';
    this.askForm.classList.add('hidden');
    if (!this.pages.length) this.pages.push('…');
    this.nextPage();
  }

  nextPage() {
    const text = this.pages.shift();
    this.fullText = text;
    this.shown = 0;
    this.typing = true;
    this.contEl.classList.add('hidden');
    this.optsEl.innerHTML = '';
    this.renderText();
  }

  renderText() {
    const prefix = this.checkLine ? `<div class="check-result ${this.checkLine.startsWith('✓') ? 'ok' : 'no'}">${this.checkLine}</div>` : '';
    const span = document.createElement('span');
    span.textContent = this.fullText.slice(0, Math.floor(this.shown));
    this.textEl.innerHTML = prefix;
    this.textEl.appendChild(span);
  }

  /** Per-frame typewriter update. */
  update(dt) {
    if (!this.open || !this.typing) return;
    const speed = SPEEDS[this.ui.settings.textSpeed] || SPEEDS.normal;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.fullText.length, this.shown + speed * dt);
    const after = Math.floor(this.shown);
    if (after > before) {
      const ch = this.fullText[after - 1];
      if (ch && /[A-Za-z0-9]/.test(ch) && after % 2 === 0) this.ui.audio.blip(this.npc.profile.voice);
      this.renderText();
    }
    if (this.shown >= this.fullText.length) this.finishTyping();
  }

  finishTyping() {
    this.typing = false;
    this.shown = this.fullText.length;
    this.renderText();
    if (this.pages.length) {
      this.contEl.classList.remove('hidden');
      return;
    }
    this.onPagesDone();
  }

  onPagesDone() {
    const node = this.node;
    if (node.action?.type === 'shop') {
      const { shopId } = node.action;
      node.action = null;
      this.ui.openPanel('shop', { shopId, onClose: () => this.renderOptions() });
      return;
    }
    if (node.action?.type === 'invest') {
      node.action = null;
      this.ui.openPanel('invest', { onClose: () => this.renderOptions() });
      return;
    }
    if (node.action?.type === 'contracts') {
      node.action = null;
      this.ui.openPanel('contracts', { onClose: () => this.renderOptions() });
      return;
    }
    if (node.action?.type === 'ledger') {
      node.action = null;
      this.close();
      this.ui.openPanel('ledger', {});
      return;
    }
    if (node.end) {
      this.contEl.classList.remove('hidden');
      return;
    }
    this.renderOptions();
  }

  renderOptions() {
    const node = this.node;
    this.optsEl.innerHTML = '';
    if (node.input === 'ask') {
      this.askForm.classList.remove('hidden');
      setTimeout(() => this.askInput.focus(), 30);
    }
    node.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="num">${i + 1}</span>`;
      b.appendChild(document.createTextNode(o.label));
      if (o.tag === 'quest') b.classList.add('quest');
      if (o.fresh && o.id.startsWith('topic:')) b.classList.add('fresh');
      b.disabled = Boolean(o.disabled);
      b.addEventListener('click', () => this.choose(i));
      this.optsEl.appendChild(b);
      if (o.hint) {
        const h = document.createElement('div');
        h.className = 'hint';
        h.textContent = o.hint;
        this.optsEl.appendChild(h);
      }
    });
  }

  choose(index) {
    const o = this.node?.options?.[index];
    if (!o || o.disabled || this.typing || this.pages.length) return;
    this.ui.audio.sfx('sfx_ui_click');
    this.show(this.session.choose(o.id));
  }

  advance() {
    if (!this.open) return;
    if (this.typing) return this.finishTyping();
    if (this.pages.length) return this.nextPage();
    if (this.node.end || this.session.ended) this.close();
  }

  /** Keyboard routing while dialogue is open. Returns true if consumed. */
  handleAction(action) {
    if (!this.open) return false;
    if (action === 'interact' || action === 'confirm') this.advance();
    else if (action.startsWith('choice')) this.choose(Number(action.slice(6)) - 1);
    else if (action === 'pause') {
      if (this.typing || this.pages.length) this.advance();
      else {
        const byeIndex = this.node.options.findIndex((o) => o.id === 'bye');
        const backIndex = this.node.options.findIndex((o) => o.id === 'back');
        if (backIndex >= 0) this.choose(backIndex);
        else if (byeIndex >= 0) this.choose(byeIndex);
        else this.close();
      }
    }
    return true;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.classList.add('hidden');
    if (this.npc) this.npc.inDialogue = false;
    this.session = null;
    this.game.paused = false;
    this.ui.afterModalClose();
  }
}
