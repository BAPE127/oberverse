# The Wrath

"The Oberverse Protects Its Own." The cutscene that answers any direct attack on an imported (protected) character. This document describes what exists; it was written for the isometric-view work (RENDERING.md 2.5, phase 5) and changes nothing. Tests: `tests/wrath.test.mjs`.

## Trigger

`isProtected(npc)` (`src/systems/combat.js`): `profile.origin === 'imported'` and not `killable: true`. `Combat.smite(npc, weapon)` is called from:

- a melee swing aimed at a protected character in reach (`attack`, generous reach and line of sight);
- a bullet that so much as passes one (`fire`), including the ray test;
- `hitNpc` on a protected character (any weapon, fists included);
- a rocket or missile that actually touches one (`src/systems/heavy.js`). Explosions never hurt them and drones never target them.

`attack()` returns `busy` while `combat.wrath` is set, so a second Wrath cannot start.

## State (`combat.wrath`, runtime only, not saved)

`{ npcId, start (g.realTime), seed, color, theme, line, weapon, over, struck }`. `color`, `theme`, `line` come from `profile.wrath` (`theme` default `arcane`, `color` `#b98cff`; `banner`, `subtitle`, `after` are read at draw or end time). `smite` also: cancels a reload, empties `combat.fx`, clears every NPC's `hostile`, turns the victim to face the player, records a memory, adjusts the relationship (trust -10, respect -5, suspicion +20), teaches `fact_player_smitten` to the victim and witnesses, increments the flag `smitten_by_<id>`, and emits `combat:wrath`.

## Phases (`WRATH` in `combat.js`, real seconds since `start`)

| t | Beat |
| --- | --- |
| 0.0 | impact: camera push-in, sky darkens, white flash |
| 0.3 | the aura unfolds; the victim rises (`wrathLift`, up to 16 px) |
| 1.0 | banner and subtitle |
| 3.0 | the aura converges on the player |
| 3.4, 3.62, 3.86, 4.25, 4.7 | five strikes; each emits `combat:lightning` (UI plays the strike sound for the theme) |
| 5.0 | the finale; the player fades out over 1.2 s (`wrathPlayerAlpha`) |
| 6.6 | fade to black; the victim's last word (`line`) |
| 9.6 | `end`: `updateWrath` sets `over` and emits `combat:wrathEnd` |

`Game.update` while the Wrath is set: only `realTime += dt` and `combat.update` (which runs `updateWrath`). The world clock, NPCs, vehicles, pursuit, police and gangs do not advance (the `pursuit`, `police` and `gang` updates also return early). The player cannot move or attack.

## Ending

The UI opens the `struckDown` panel on `combat:wrathEnd`; its button calls `Combat.riseAgain()`: `wrath = null`, health 100, then either jail (`profile.wrath.after === 'jail'`, Chief Lawrence: `police.sendToJail('wrath')`) or: half the player's money lost, back to the starting flat, time skipped to 08:00 the next morning, `combat:risen`, a notice. The victim is never hurt.

## Themes (`THEMES` in `src/engine/wrath.js`; `profile.wrath.theme`)

| Theme | Character | Look |
| --- | --- | --- |
| arcane (default) | any without a theme | runes, sigils, lightning |
| oil | Sir Moneybucks | coins, derricks, gushers, burning crude |
| construction | Mason | blueprints, hazard tape, tools, I-beams, wrecking ball, brick wall |
| law | Chief Lawrence Order | sirens, searchlights, badges, cuffs, squad cars, gavel, GUILTY paperwork, cell bars |
| maths | Arthur Anderson | graph paper, calculator keys, bad sums, giant calculator reading ERROR |
| arms | Lucas Eastrise | showroom spotlight, guns, price tags, crates, missile strike, drones, SOLD |
| kraken | Captain Ober | seawater, tentacles, whirlpool, the eye, dragged under |
| stampede | Farmer Chuckie | dust, lasso, stampede, giant cheddar wheel |
| cards | Morganius Spade | runic circle, card storm, thrown cards, giant Ace of Spades (`cardMagic.js`) |
| security | Octavius Thomas Phonograph | spotlights, ringing phones, security detail, lawyers, SETTLED stamp |

Each theme has `banner`, `sky`, `flash` and the drawing hooks `ground`, `after`, `aura`, `strike(I, i, age)`, `finale`.

## Rendering (the only part that draws)

`src/engine/wrath.js` is pure drawing. `drawWrath(renderer, g, w)` runs at full canvas resolution after the world and lighting, in three layers: the dark sky gradient, the world-plane art under the camera transform (`zoom`, `cam`), then screen-space flashes, letterbox, banner and the last word. `wrathCamera` pushes in on the victim and player and shakes with the strikes. `wrathLift` and `wrathPlayerAlpha` are read by the renderer to lift the victim and fade the player. The art treats -y as up and positions everything relative to the player's and victim's feet.

Top-down: the plane is the world. Isometric (v0.104.0, phase 5): `wrathActors(g, w, iso)` hands the cutscene copies of the player and victim whose `x, y` are their `iso.project` positions, so the plane is the iso screen plane (up is still -y); the art is unchanged. `renderIso` draws the world (low-resolution pass, upscaled) at the cutscene's camera, lifts the victim with `setBill(..., z = lift)`, fades the player, then calls `drawWrath`. No overlays, highlight or crosshair while it plays (as before). The set `WRATH_TOPDOWN` in `renderer.js` lists themes that would fall back to the old top-down pass; it is empty unless the checks in this file's history say otherwise.

## Dependencies

- Player and NPC: `g.player`, the victim `g.npcs.get(npcId)`; position, `facing`, `profile.appearance`, `profile.wrath`, `profile.name`.
- Combat: `smite`, `updateWrath`, `riseAgain`, `WRATH`, `isProtected`; `heavy.js` for rockets.
- Camera: `renderer.updateCamera` replaces the follow camera with `wrathCamera` for the duration and snaps back afterwards.
- Audio (`ui.js`): `combat:wrath` ducks the music and plays `sfx_wrath` (themed score); `combat:lightning` plays a per-theme strike sound.
- UI lock: `combat:wrath` closes panels and dialogue and adds the HUD class `cinematic`; mouse aim and autosave are off while `combat.wrath` is set; `combat:wrathEnd` opens `struckDown`.

## Rendering-only vs. simulation

Simulation (never touched by drawing): `combat.wrath` fields, `smite`, `updateWrath`, `riseAgain`, the frozen world, relationships, memory, flags, money, jail. Rendering only: everything in `wrath.js` and `cardMagic.js`, the lift and fade, the camera, the sky, letterbox, banner and last word.
