// Keyboard input. Movement is polled each frame; actions are queued so a quick
// tap is never lost between frames. Bindings are documented in README.md.
const MOVE = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const ACTIONS = {
  KeyE: 'interact', Space: 'interact', Enter: 'confirm',
  Escape: 'pause', KeyP: 'pause',
  KeyI: 'inventory', Tab: 'inventory',
  KeyJ: 'journal', KeyQ: 'journal',
  KeyM: 'map',
  KeyC: 'status',
  KeyF: 'attack', KeyR: 'reload', KeyX: 'nextWeapon', KeyZ: 'holster', KeyG: 'surrender', KeyB: 'build', KeyH: 'horn',
  F5: 'quicksave', F9: 'quickload',
  Backquote: 'debug',
};

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.queue = [];
    this.enabled = true;
    target.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (MOVE[e.code] || e.code === 'Space' || e.code === 'Tab' || e.code === 'F5' || e.code === 'F9') e.preventDefault();
      if (!e.repeat && ACTIONS[e.code]) this.queue.push(ACTIONS[e.code]);
      if (!e.repeat && /^Digit[1-9]$/.test(e.code)) this.queue.push(`choice${e.code.slice(5)}`);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }
  movement() {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const m = MOVE[code];
      if (m) { x += m[0]; y += m[1]; }
    }
    return { x: Math.sign(x), y: Math.sign(y), sprint: this.down.has('ShiftLeft') || this.down.has('ShiftRight') };
  }
  take() {
    const q = this.queue;
    this.queue = [];
    return q;
  }
  clear() {
    this.queue = [];
    this.down.clear();
  }
}
