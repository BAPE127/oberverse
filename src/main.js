// Entry point: wires content, settings, saves, audio, input and UI, then runs
// the frame loop. Everything runs locally; no network access is required.
import { CONTENT } from './content/index.js';
import { SaveManager, loadSettings } from './save/saveManager.js';
import { AudioEngine } from './audio/audioEngine.js';
import { Assets } from './engine/assets.js';
import { Input } from './core/input.js';
import { UI } from './ui/ui.js';
import { GAME_VERSION } from './core/version.js';

function boot() {
  const settings = loadSettings();
  const saves = new SaveManager();
  const audio = new AudioEngine(CONTENT, settings);
  const input = new Input(window);
  const ui = new UI({ content: CONTENT, settings, saves, audio, assets: new Assets(), canvas: document.getElementById('game'), input });
  ui.applySettings();
  // Preload character portraits/sprites so the first conversation shows them.
  for (const c of Object.values(CONTENT.characters)) {
    ui.assets.image(c.appearance.portrait);
    ui.assets.image(c.appearance.sprite);
  }
  ui.showTitle();

  const unlock = () => {
    audio.unlock();
    document.getElementById('audio-hint')?.classList.add('hidden');
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    for (const action of input.take()) ui.handleAction(action);
    try {
      ui.frame(dt);
    } catch (err) {
      console.error('[oberverse] frame error', err);
      ui.game?.warn?.(`frame error: ${err.message}`);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Exposed for debugging and automated smoke tests only.
  window.oberverse = { ui, version: GAME_VERSION };
  console.info(`The Oberverse v${GAME_VERSION} started.`);
}

boot();
