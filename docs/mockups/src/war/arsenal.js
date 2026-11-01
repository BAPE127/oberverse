// TARGET ART / CONTENT SKETCH (mock-up only). Five weapon tiers for every troop class. Tiers 1 and 2 are weapons the Arms works already makes; 3 is a new recipe on the existing
// research tree; 4 and 5 are future research. stat = [damage, range, rate] on a 1-5 scale; "look" is chosen separately from the weapon.
const G = (spec) => spec;
export const CLASSES = [
  { id: 'rifleman', name: 'Rifleman', role: 'the line', tiers: [
    ['Service rifle', G({ real: 'rifle' }), [2, 3, 2], 'Reliable and cheap.'],
    ['Assault rifle', G({ real: 'ar' }), [3, 3, 4], 'Automatic fire; good all round.'],
    ['Assault rifle + launcher', G({ kind: 'ballistic', len: 18, body: '#4a4a52', gl: true, mag: 6, scope: 6 }), [3, 3, 4], 'Underbarrel launcher: smoke or HE every 20 s.'],
    ['Pulse rifle', G({ kind: 'energy', len: 18, body: '#8e96a6', glow: '#4ad8e8' }), [4, 4, 4], 'No ammunition; heat limits long bursts.'],
    ['Plasma rifle', G({ kind: 'heavy', len: 20, body: '#6a7284', glow: '#ff8a3a' }), [5, 3, 3], 'Burns cover; each shot hits everything in a line.'] ] },
  { id: 'mg', name: 'Machine gunner', role: 'suppression', tiers: [
    ['Light machine gun', G({ real: 'lmg' }), [3, 3, 5], 'Suppresses what it points at.'],
    ['Belt MG on bipod', G({ kind: 'ballistic', len: 20, body: '#3a3a42', belt: true, bipod: true, barrel: 6 }), [3, 4, 5], 'Deploy: +40% accuracy and suppression.'],
    ['Heavy MG', G({ kind: 'ballistic', len: 24, body: '#3a3a42', belt: true, drum: true, barrel: 8, brake: true }), [4, 4, 5], 'Punches light armour; slow to move.'],
    ['Pulse repeater', G({ kind: 'energy', len: 22, body: '#8e96a6', glow: '#4ad8e8' }), [4, 4, 5], 'Cools between bursts; never reloads.'],
    ['Heavy plasma repeater', G({ kind: 'heavy', len: 24, body: '#5a6274', glow: '#ff8a3a' }), [5, 4, 5], 'Shreds infantry; needs a power-armour frame.'] ] },
  { id: 'at', name: 'Anti-tank', role: 'armour killers', tiers: [
    ['RPG launcher', G({ real: 'rpg' }), [4, 2, 1], 'One rocket, then reload.'],
    ['Guided launcher', G({ kind: 'launcher', len: 20, guided: true }), [4, 4, 1], 'Locks on; hits the top armour.'],
    ['Twin-tube launcher', G({ kind: 'launcher', len: 22, tubes: 2, guided: true }), [5, 4, 2], 'Two missiles before reloading.'],
    ['Plasma launcher', G({ kind: 'launcher', len: 22, glow: '#ff8a3a' }), [5, 3, 2], 'Melts armour; no back-blast.'],
    ['Lance cannon', G({ kind: 'launcher', len: 26, tubes: 2, glow: '#ff5a3a', guided: true }), [5, 5, 2], 'Kills a tank in two hits at long range.'] ] },
  { id: 'marksman', name: 'Marksman', role: 'precision', tiers: [
    ['Sniper rifle', G({ real: 'sniper' }), [5, 5, 1], 'One shot, one target.'],
    ['Marksman rifle', G({ kind: 'ballistic', len: 22, body: '#3a3a42', scope: 10, barrel: 8 }), [4, 4, 2], 'Semi-automatic; spots for the squad.'],
    ['Anti-materiel rifle', G({ kind: 'ballistic', len: 26, body: '#3a3a42', scope: 12, barrel: 10, brake: true, bipod: true }), [5, 5, 1], 'Breaks engines and light armour.'],
    ['Rail marksman', G({ kind: 'energy', len: 24, body: '#8e96a6', glow: '#7fe8ff', scope: true }), [5, 5, 2], 'Hits through light cover.'],
    ['Ion lance', G({ kind: 'heavy', len: 26, body: '#5a6274', glow: '#c58aff' }), [5, 5, 1], 'Disables a vehicle with one shot.'] ] },
  { id: 'medic', name: 'Medic', role: 'keeps people alive', tiers: [
    ['Pistol and kit', G({ real: 'pistol' }), [1, 1, 2], 'Stops bleeding; slow.'],
    ['SMG and kit', G({ real: 'smg' }), [2, 2, 4], 'Heals faster; can defend itself.'],
    ['Carbine and auto-injector', G({ kind: 'ballistic', len: 14, body: '#e8e6dc', mag: 5 }), [2, 3, 4], 'Injector: instant stabilise.'],
    ['Med-beam', G({ kind: 'energy', len: 12, body: '#e8e6dc', glow: '#5fe08a' }), [1, 3, 5], 'Heals a squad over time at range.'],
    ['Field regeneration unit', G({ kind: 'energy', len: 14, body: '#e8e6dc', glow: '#5fe08a', scope: true }), [1, 4, 5], 'Revives the fallen within 10 s.'] ] },
  { id: 'engineer', name: 'Combat engineer', role: 'builds and breaks', tiers: [
    ['Shotgun and tools', G({ real: 'shotgun' }), [3, 1, 2], 'Builds sandbags; clears rubble.'],
    ['Breacher shotgun and charges', G({ kind: 'ballistic', len: 14, body: '#4a4a52', barrel: 4, brake: true }), [4, 1, 2], 'Charges open walls and doors.'],
    ['Cutting torch rig', G({ kind: 'energy', len: 10, body: '#c8a02a', glow: '#ff9a2a' }), [3, 1, 4], 'Cuts armour plate; repairs vehicles faster.'],
    ['Fusion cutter', G({ kind: 'energy', len: 12, body: '#c8a02a', glow: '#ff9a2a', scope: true }), [4, 2, 4], 'Opens a bunker; repairs under fire.'],
    ['Siege rig', G({ kind: 'heavy', len: 18, body: '#c8a02a', glow: '#ff9a2a' }), [5, 1, 3], 'Builds a turret in 20 s.'] ] },
  { id: 'signaller', name: 'Signaller', role: 'sees and calls', tiers: [
    ['SMG and field radio', G({ real: 'smg' }), [2, 2, 4], 'Calls support; radio range 12.'],
    ['Carbine and long-range set', G({ kind: 'ballistic', len: 14, body: '#4a4a52', mag: 5, sil: true }), [2, 3, 4], 'Range 20; unjammable once.'],
    ['Carbine and sensor pack', G({ kind: 'ballistic', len: 14, body: '#4a4a52', mag: 5, scope: 6 }), [2, 3, 4], 'Marks targets for artillery.'],
    ['Drone controller', G({ kind: 'energy', len: 10, body: '#8e96a6', glow: '#7fe8ff' }), [1, 4, 3], 'Flies a scout drone; reveals the map.'],
    ['Command uplink', G({ kind: 'energy', len: 12, body: '#8e96a6', glow: '#e8c84a', scope: true }), [1, 5, 3], 'Links vision to every squad.'] ] },
  { id: 'officer', name: 'Officer', role: 'leads', tiers: [
    ['Pistol', G({ real: 'pistol' }), [2, 1, 2], 'Morale aura 8 tiles.'],
    ['Command SMG', G({ real: 'smg' }), [2, 2, 4], 'Rally: broken squads return.'],
    ['Heavy pistol and baton', G({ kind: 'ballistic', len: 11, body: '#4a4a52', barrel: 3 }), [3, 1, 2], 'Aura 10 tiles; steadier under fire.'],
    ['Plasma pistol', G({ kind: 'energy', len: 11, body: '#8e96a6', glow: '#e8c84a' }), [4, 2, 3], 'Command: squads act faster.'],
    ['Command blade and plasma pistol', G({ kind: 'energy', len: 13, body: '#6a7284', glow: '#e8c84a', scope: true }), [5, 2, 3], 'Inspire: whole battalion steadier.'] ] },
  { id: 'recon', name: 'Recon', role: 'eyes ahead', tiers: [
    ['Suppressed SMG', G({ kind: 'ballistic', len: 14, body: '#3a3a42', mag: 5, sil: true }), [2, 2, 4], 'Quiet; hard to hear.'],
    ['Suppressed carbine', G({ kind: 'ballistic', len: 18, body: '#3a3a42', mag: 5, sil: true, scope: 6 }), [3, 3, 3], 'Sees farther in the dark.'],
    ['Scout rifle', G({ kind: 'ballistic', len: 22, body: '#3a3a42', scope: 10, sil: true }), [3, 4, 2], 'Marks targets for the whole force.'],
    ['Pulse carbine and cloak', G({ kind: 'energy', len: 14, body: '#4a5058', glow: '#4ad8e8', scope: true }), [3, 4, 3], 'Cloak: invisible while still.'],
    ['Stalker rifle', G({ kind: 'energy', len: 22, body: '#3a3f48', glow: '#7fe8ff', scope: true }), [4, 5, 2], 'Silent, cloaked, one-shot on light targets.'] ] },
];
export const UNLOCK = ['Arms works: stock item', 'Arms works: stock item', 'Arms works: new recipe on the research tree', 'Future research: energy weapons', 'Future research: heavy energy (costly)'];
