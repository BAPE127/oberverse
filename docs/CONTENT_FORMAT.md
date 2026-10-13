# Content Format Reference

All authored content lives in `src/content/` as plain JavaScript data and is registered in `src/content/index.js`. Run `npm run validate` after any change.

## Identifiers

Prefixes: `npc_` characters, `dlg_` dialogues, `item_`, `fact_`, `doc_`, `ct_` containers, `shop_`, `fac_` factions, `q_` quests, `job_` repeatable jobs, `ev_` events, `mus_`/`motif_`/`sfx_`/`amb_` audio, `area_` map areas. IDs are permanent once released.

## Conditions (`if`, `require`, `when`, `hiddenUnless`)

An object; **all** keys must hold. Unknown keys fail closed (and the validator reports them).

| Key | Value | True when |
| --- | --- | --- |
| `all` / `any` | `[cond, …]` | all / any sub-conditions hold |
| `not` | `cond` | sub-condition fails |
| `firstMeeting` / `met` | bool | NPC has (not) met the player |
| `rel` | `{trust: '>=20', …}` | NPC's relationship to the player (`>= <= > < == !=`) |
| `mood` | id or `[ids]` | NPC's current mood |
| `activity` | id or `[ids]` | NPC's current activity |
| `arrived` | bool | NPC is at their destination (not travelling) |
| `hasItem` | id or `{id, count}` | player has the item |
| `hasItemTag` | tag | player has any item with the tag |
| `stolen` | item id | player holds that item illegally |
| `money` | `'>=10'` | player money |
| `quest` | `{id, state?, stage?, outcome?}` | state ∈ not_started/active/completed/failed (string or array) |
| `jobDoneToday` | quest id | job completed/failed today |
| `flag` / `notFlag` | name | world flag truthy / falsy |
| `flags` | `{name: value}` | exact flag values |
| `flagToday` | name | flag value equals today's day number (set with `'$day'`) |
| `knows` | fact id | NPC knows the fact (fact or rumour) |
| `playerKnows` | fact id | player knows it |
| `recalls` | `{tag, withinMinutes?}` | NPC has a memory with that tag |
| `time` | `{from:'HH:MM', to:'HH:MM'}` | current time in window (wraps midnight) |
| `day` | `'>=2'` | day number |
| `rep` | `{fac_civic: '>=8'}` | player reputation |
| `map` | id or `[ids]` | player's current map |
| `npcAt` | `{npc, map?, activity?}` | another NPC's location/activity |
| `npcMood` | `{npc, mood}` | another NPC's mood |
| `stock` | `{shop, item, count:'>=1'}` | shop stock |
| `containerHas` | `{container, item, count?}` | container contents |
| `propState` | `{id, key: value}` | prop state |
| `arrived` | bool | NPC has reached its destination (not travelling) |
| `wealth` | `'>=40'` | player money + value of Ober's Oil shares |
| `oil` | `{strike: true, morale: '<30', sharesOwned: '>=10', derricks: '>=1', pipeline: true, risk: '>=2'}` | Ober's Oil company state (`world.oil`) |
| `site` | `{goodwill: '>=15'}` | Mason's Os crew state (`world.construction`) |
| `property` | `{plot: 'plot_x', state: 'building'}`, `{plot, state: ['permit','building']}`, `{plot, blueprint: 'home'}`, `{state: 'permit'}`, `{surveyed: true}` | property plots (docs/PROPERTIES.md); `'none'` = unowned |

## Effects (`effects`, `onArrive`, `onExamine`, outcome `effects`)

An array of objects, applied in order. `{ if, then, else }` and `{ chance, then, else }` branch.

| Key | Value | Effect |
| --- | --- | --- |
| `give` / `take` | id or `{id, count}` | player inventory |
| `takeTag` | tag | remove one item with that tag |
| `money` | number | change player money |
| `rel` | `{trust: +5}` | this NPC → player |
| `relNpc` | `{from, to, affection: -2}` | between characters (`to` may be `player`) |
| `flag` | `{name: value}` | set flags (`'$day'` = today) |
| `quest` | `{id, start? , stage?, complete?, fail?}` | quest state |
| `learn` | fact id | player learns (source: this NPC or observed) |
| `npcLearn` | fact id | this NPC learns |
| `tell` | `{npc, fact, kind?}` | another NPC learns |
| `memory` | `{text, tag, importance, about?}` | this NPC remembers (`{player}` interpolated) |
| `npcMemory` | `{npc, text, tag, importance, about}` | another NPC remembers |
| `rep` | `{fac: n}` | reputation |
| `mood` / `npcMood` | `{id, minutes}` / `{npc, id, minutes}` | set a temporary mood |
| `openShop` | shop id | dialogue opens the shop panel |
| `endDialogue` | true | close dialogue |
| `sfx` | sfx id | play a sound |
| `notify` (+`notifyKind`) | text | toast |
| `bark` / `npcBark` | text / `{npc, text}` | speech bubble |
| `consume` | `{shop, item, then, else}` | NPC uses shop stock (lunch) |
| `restock` | shop id | restock shop to base |
| `containerPut` / `containerTake` | `{container, item, count?}` | container contents |
| `clearStolen` | item id | the item is no longer "stolen" |
| `noise` | `{sources:['map:spot'], radius, fact, sfx?, text?}` | everyone awake in range hears; player too |
| `errand` | `{npc?, spot, activity, minutes}` | send an NPC somewhere |
| `oil` | `{add: {morale: -10, sharesOwned: 5}, set: {strike: true, accidentDay: '$day'}}` | change Ober's Oil state |
| `payWages` | true / `'construction'` | pay today's refinery wages (`OilCompany.wagesOwed`) or a Mason's Os shift (`Construction.payShift`: 6 obols, goodwill) |
| `site` | `{goodwill: 2}` | change Mason's Os crew goodwill (0–30) |
| `permit` | true | the Civic Office grants every pending building permit |
| `schedule` | `{event, at: 'HH:MM'}` or `{event, delayMinutes}` | queue a chained event |
| `action` | `'invest'` / `'ledger'` | open a UI panel from dialogue |

## Characters (`src/content/characters/*.js`)

See `docs/templates/character.template.js` for a complete annotated example. Key fields: `id`, `name`, `shortName`, `tier`, `origin` (`original`|`imported`), `role`, `faction`, `dialogue`, `shop?`, `motif`, `voice {wave, pitch, variance, rate}`, `appearance` (see below), `personality` (numbers 0–1 that systems read: sociability, conscientiousness, impulsiveness, curiosity, discretion, …; plus `traits`, `values`, `likes`, `dislikes`), `speech` (`rumorPrefix`, `factPrefix`, `refuse` and descriptive habits), `mechanics` flags, `punctuality` (minutes early, negative = late), `walkSpeed`, `schedule` (blocks covering 24 h; `spot: 'map:spot'`; optional `onArrive` effects), `impulses`, `relationships`, `knowledge`, `giftPrefs` (item → value, `tags` → value), `reactions` (fact → `{rel, relOverride, mood, bark}`), `notices` (`{map, tag, text, importance}`), `opinions` (`npcId → {warm, cool}`).

### Appearance

`skin`, `hair`, `hairStyle` (`short|bun|parted|messy|long|ponytail|curly|hat|tophat|hardhat|cap`), `outfit`, optional `apron`, `undershirt`, `tie`, `legs`, `shoes`, `sleeves`, `accent`, `hatColor`, `hatBand`, `beard` (colour), `moustache` (`plain|handlebar`), `pattern` (`pinstripe`), `holding` (`cigar|clipboard|wrench`), `vestColor`, `accessory` and/or `accessories: []` (`apron|glasses|goggles|scarf|monocle|watchchain|vest`), `build` (`round|average|thin|wiry|broad`), `height` (≈0.9–1.1). Optional `sprite` and `portrait` images (paths, or data URIs from `src/content/portraits.js` so they work in the single-file build) replace the procedural drawing when they load. Add portraits with `node tools/embed-portraits.mjs`.

## Dialogue (`src/content/dialogue/*.js`)

```js
{
  id, greetings: [{ if, say: [...] } | { if, variants: [[...], [...]] }],  // first match wins; last must be unconditional
  farewells: [...same],
  topics: [{ id, label, if, once?, tag?, keywords?, say|variants, repeat?, effects?, end?,
             choices?: [{ id, label, if?, require?, lockedHint?, check?: {stat, base, relScale, mods}, say, effects, fail?: {say, effects}, next?, stay?, end? }] }],
  askAbout: [{ keywords, if?, say|variants, effects? }],
  askPrompt, unknown, gossipEmpty, gossipThanks,
  gift: { loved, liked, neutral, disliked, tooMany, ownStolen },
  barks: { greet, <activity>, chat, argue, sleep, moods: { <mood>: [...] } },
}
```

A "say" is an array of pages; a page is a string or `{ if, text, effects }`. `{player}`, `{name}`, `{time}`, `{day}` are interpolated.

## Maps

Outdoor maps use `MapBuilder` rectangles; interiors use `roomTiles(w, h, floor, doorX)`. Fields: `id, name, kind, music ('id' | {day, night}), ambience, tiles, areas[], buildings[{id, name, mapLabel, x, y, w, h, roof, wall, trim, sign?, awning?, columns?, round?, door:{x, y, to:{map, spot}, lock?:{key, owners?, hours?, trespass?, message?}}}], doors[], spots{name:{x, y, facing?}}, props[]`. Tile codes are in `src/world/tiles.js`. Preview with `npm run map -- <id>`.

Buildings: `{id, name, mapLabel?, x, y, w, h, roof, wall, trim, sign?, door?: {x, y, to?, lock?, gateway?}, columns?, awning?, round?, flatRoof?, dome?: colour, pediment?, shabby?, tower?: storeys, glass?, helipad?, signColor?}`. A door without `to` never opens and shows `lock.message`. `mapLabel: ''` hides the map label. Tiles include `m` (plaza stone) and `u` (mud).

Weapons are items with a `weapon` block: `{kind: 'melee'|'gun', damage, range (tiles), cooldown (s), lethal, held, sound}` plus melee `arc` (degrees), `knockback`; guns `ammo` (item id), `mag`, `reload` (s), `spread` (degrees), `pellets?`, `auto?`, `noise` (tiles). Ammo items have `bundle` (rounds per purchase). Character combat temperament: `combat: {fights?, defends?: true | [ids], never?, weapon?, maxHealth?}`. Imported characters are protected unless `killable: true`; their `wrath: {theme, color, banner, subtitle, line}` styles the Wrath cutscene (`theme` ∈ arcane | oil | construction; `{name}`/`{player}` are substituted in the line). Interact kind `shop: {shop}` opens a shop directly (unmanned shops have `owner: null` and may `restockAt: 'HH:MM'`); containers with `owner: null` are free to take from.

Props: `{id, type, x, y, w?, h?, solid?, examine?, onExamine?, interact?: {kind, …}, hiddenUnless?, animateWhen?, sortRow?, item?}` with `kind` ∈ `container | read | sleep | sit | noticeboard | obstacle | forage | stockcheck | workstation | useItem | contracts`. `animateWhen` is a condition (e.g. the excavator moves only while `{npcAt: {npc: 'npc_mason', activity: 'excavate'}}`); `sortRow` overrides the draw-order row so an actor can appear inside a prop.

- `read` may set `private: npcId` (+ `caughtBark`): if that character can see you, they stop you and grow suspicious.
- `workstation`: `{company?: 'oil'|'construction', station}` — shift tasks. Oil (default): `valves | gauges | barrels`; construction: `trench | bricks | mixer`.
- `contracts`: opens Mason's Os contracts panel (property plots).
- `useItem`: `{item, verb, effects, text, missingText, doneFlag, doneText}` — e.g. setting the lens in its cradle.

Doors: `keepTile: true` makes an invisible edge exit (map-to-map roads). Locks: `{key, owners, hours, flag, flagMessage, trespass, message}` — `flag` requires a world flag (an invitation) in addition to hours.

Containers: `lockedBy: itemId` (+`lockedText`) needs a key to open; `theftFact: factId` is reported to witnesses when you take from it.

Shops: optional `prices: {itemId: n}` override list prices (the company store gouges).

## Regions

`src/content/world.js`: `REGIONS = { id: { name, maps: { mapId: { x, y, fallbackSpot } } } }` (tile offsets). Put the eastern map at `x = western.x + western.width - 1` to share a seam column; seams are generated automatically on tiles walkable on both sides. `fallbackSpot` is used only if a seam position can't be mapped. Keep the shared column's terrain consistent on both maps.

## Quests

`{ title, kind?: 'job', giver, summary, start, expires?: {at}, stages: { id: { journal, objectives[{id, text, if?}], hints[{if, text}], marker?: 'map:spot', onEnter? } }, triggers: [{ event, where, stage?, notStarted?, if?, start?, advance?, complete?, effects? }], outcomes: { id: { journal, effects } }, failures: { id: { journal, effects } } }`. Trigger events: `map:entered`, `item:acquired`, `fact:learned`, `flag:set`, `npc:talked`, `prop:used`.

## Events

`{ name, check: 'hourly'|'onArrive'|'chained', npc?, activity?, map?, when?, chance?, cooldownMinutes?, once?, effects, followUps?: [{ id, delayMinutes? | at: 'HH:MM' }] }`.
