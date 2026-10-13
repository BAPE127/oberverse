// Generates a representative save for the current schema into tests/fixtures/.
// Run once per schema version and COMMIT the result; never regenerate old fixtures.
import { writeFileSync } from 'node:fs';
import { CONTENT } from '../src/content/index.js';
import { Game } from '../src/game/game.js';
import { SaveManager, MemoryStorage } from '../src/save/saveManager.js';
import { GAME_VERSION, SAVE_SCHEMA_VERSION } from '../src/core/version.js';

const g = new Game(CONTENT, { seed: 2026 });
g.newGame({ playerName: 'Fixture', seed: 2026 });
const step = (min) => { for (let i = 0; i < min * 2; i++) g.update(0.5, { x: 0, y: 0 }); };
g.quests.start('q_dark_lamp');
g.quests.start('q_lucky_spanner');
g.inventory.add('item_honey_bun', 2);
g.inventory.add('item_lucky_spanner');
g.player.money = 31;
g.relationships.adjust(g.npcs.get('npc_osric'), 'player', { trust: 12, affection: 9 });
g.npcs.get('npc_mags').met = true;
g.knowledge.learn(g.player, 'fact_osric_sweet_tooth', { kind: 'rumor', source: 'told:npc_mags', at: g.clock.total });
g.setFlag('read_welcome', true);
g.changeMap('lanternside', 'flat_door_out');
step(300);
const sm = new SaveManager(new MemoryStorage());
sm.save('slot1', g);
const out = `tests/fixtures/save-schema${SAVE_SCHEMA_VERSION}-v${GAME_VERSION}.json`;
writeFileSync(out, JSON.stringify(JSON.parse(sm.storage.getItem('oberverse.save.slot1')), null, 1));
console.log(`wrote ${out}`);
