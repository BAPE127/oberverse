// Containers: searchable storage. `owner` is a character or faction id; taking
// from a container you do not own is theft if witnessed (see game.takeFromContainer).
export const CONTAINERS = {
  ct_police_lockers: { name: 'Officers\' lockers', owner: 'fac_police', items: { item_baton: 1, item_bandage: 2 }, money: 0 },
  ct_evidence: { name: 'Evidence cabinet', owner: 'fac_police', items: { item_cigar: 1 }, money: 15, lockedText: 'Your confiscated belongings are filed in here. "Pending."' },
  ct_wh7_in: { name: 'Input bay', owner: 'player', items: {}, money: 0 },
  ct_wh7_out: { name: 'Output crate', owner: 'player', items: {}, money: 0 },
  ct_wh9_in: { name: 'Input bay', owner: 'player', items: {}, money: 0 },
  ct_wh9_out: { name: 'Output crate', owner: 'player', items: {}, money: 0 },
  ct_wh12_in: { name: 'Input bay', owner: 'player', items: {}, money: 0 },
  ct_wh12_out: { name: 'Output crate', owner: 'player', items: {}, money: 0 },
  ct_sumps_crate: { name: 'Rotten crate', owner: null, items: { item_bat: 1 }, money: 3 },
  ct_flat_wardrobe: { name: 'Wardrobe', owner: 'player', items: { item_bandage: 1, item_scone: 1 }, money: 8 },
  ct_civic_desk: { name: 'Clerk\'s desk', owner: 'npc_osric', theftFact: 'fact_player_stole_from_osric', items: { item_lighthouse_key: 1, item_rubber_stamp: 1 }, money: 0 },
  ct_workshop_crate: { name: 'Parts crate', owner: 'npc_tibbs', items: { item_bolts: 2, item_brass_cog: 1 }, money: 0 },
  ct_moneybucks_desk: { name: 'Sir Moneybucks\'s desk', owner: 'npc_moneybucks', items: { item_vault_key: 1, item_cigar: 2 }, money: 40 },
  ct_manor_vault: {
    name: 'The vault', owner: 'npc_moneybucks', items: { item_great_lens: 1 }, money: 250,
    lockedBy: 'item_vault_key', theftFact: 'fact_player_stole_lens', lockedText: 'A steel vault door with a dollar-sign keyhole. It does not care how politely you ask.',
  },
  ct_lighthouse_chest: { name: 'Keeper\'s chest', owner: 'fac_civic', items: { item_lens_shard: 1 }, money: 6 },
};
