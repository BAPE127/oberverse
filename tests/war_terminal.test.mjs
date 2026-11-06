// The company's command terminal (v0.103.2): it stands in the site office at Hollowmoor Lot, opens the terminal panel, and the tablet no longer carries the business.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warGame, build } from './war_helpers.mjs';

test('the site office has a command terminal in its top row; using it opens the terminal panel, and its label says so', () => {
  const g = warGame(951); build(g, ['site_office']);
  const room = g.maps.get('hollowmoor_lot__hm_office');
  assert.ok(room, 'the site office has a room');
  const t = room.props.find((p) => p.type === 'terminal');
  assert.ok(t, 'a terminal stands in it'); assert.equal(t.y, 1); assert.equal(t.interact.kind, 'war');
  const others = g.maps.get('hollowmoor_lot__hm_bunk'); assert.ok(!others.props.some((p) => p.type === 'terminal'), 'only the site office has one');
  assert.equal(g.propLabel(t), 'Use the command terminal');
  g.changeMap('hollowmoor_lot__hm_office', 'entry');
  assert.deepEqual(g.interact({ kind: 'prop', id: t.id }), { type: 'panel', panel: 'militaryterminal' });
  const free = room.props.filter((p) => p !== t).every((p) => !(p.x <= t.x && p.x + (p.w || 1) > t.x && p.y <= 1 && p.y + (p.h || 1) > 1));
  assert.ok(free, 'it stands where nothing else does');
});
