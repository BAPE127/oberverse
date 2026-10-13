// Containers: searchable storage. `owner` is a character or faction id; taking
// from a container you do not own is theft if witnessed (see game.takeFromContainer).
export const CONTAINERS = {
  ct_flat_wardrobe: { name: 'Wardrobe', owner: 'player', items: { item_bandage: 1, item_scone: 1 }, money: 8 },
  ct_civic_desk: { name: 'Clerk\'s desk', owner: 'npc_osric', items: { item_lighthouse_key: 1, item_rubber_stamp: 1 }, money: 0 },
  ct_workshop_crate: { name: 'Parts crate', owner: 'npc_tibbs', items: { item_bolts: 2, item_brass_cog: 1 }, money: 0 },
  ct_lighthouse_chest: { name: 'Keeper\'s chest', owner: 'fac_civic', items: { item_lens_shard: 1 }, money: 6 },
};
