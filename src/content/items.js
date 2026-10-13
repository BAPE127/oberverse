// Item registry. IDs are permanent — never rename an id that may be in a save.
// category: food | tool | key | quest | gift | junk | medical
export const ITEMS = {
  item_honey_bun: {
    name: 'Honey Bun', category: 'food', price: 4, tags: ['food', 'sweet', 'gift'], icon: 'bun',
    description: 'A sticky, glazed Kettle & Crumb honey bun. Lanternside currency in all but name.',
    use: { energy: 15, text: 'You eat the honey bun. Sticky fingers, happy heart. (+15 energy)' },
  },
  item_scone: {
    name: 'Cheese Scone', category: 'food', price: 3, tags: ['food', 'gift'], icon: 'scone',
    description: 'Dense, savoury, and still faintly warm.',
    use: { energy: 12, text: 'You eat the scone. Crumbs everywhere. (+12 energy)' },
  },
  item_coffee: {
    name: 'Coffee', category: 'food', price: 3, tags: ['food', 'drink', 'gift'], icon: 'cup',
    description: 'Strong canal-side coffee in a paper cup.',
    use: { energy: 20, text: 'You drink the coffee. Your thoughts sharpen to a point. (+20 energy)' },
  },
  item_coffee_order: {
    name: 'Coffee Order (for Osric)', category: 'quest', price: 0, tags: ['delivery', 'drink'], icon: 'cup',
    description: 'A lidded coffee labelled "O. VANE — BLACK, NO NONSENSE". It is for Osric at the Civic Office.',
    use: { energy: 20, text: 'You drink Osric\'s coffee. It tastes faintly of guilt. (+20 energy)' },
  },
  item_wildflowers: {
    name: 'Wildflowers', category: 'gift', price: 0, tags: ['gift', 'flowers'], icon: 'flower',
    description: 'A handful of sea-pinks and clover from Gullwing Park.',
  },
  item_bandage: {
    name: 'Bandage', category: 'medical', price: 5, tags: ['medical'], icon: 'bandage',
    description: 'A clean roll of bandage.',
    use: { health: 25, text: 'You patch yourself up. (+25 health)' },
  },
  item_crowbar: {
    name: 'Crowbar', category: 'tool', price: 18, tags: ['tool', 'pry'], icon: 'crowbar',
    description: 'Heavy, honest, and very good at opening things that would rather stay shut.',
  },
  item_lucky_spanner: {
    name: 'Lucky Spanner', category: 'quest', price: 0, tags: ['quest', 'tool'], icon: 'spanner',
    description: 'A battered spanner with "T.H." scratched into the handle. Tibbs swears it has never failed him.',
  },
  item_lighthouse_key: {
    name: 'Lighthouse Key', category: 'key', price: 0, tags: ['key'], icon: 'key',
    description: 'A heavy iron key on a tag stamped "LIGHTHOUSE — CIVIC PROPERTY".',
  },
  item_flat_key: {
    name: 'Flat Key', category: 'key', price: 0, tags: ['key'], icon: 'key',
    description: 'The key to Number 9, Gullwing Row. Home, for now.',
  },
  item_brass_cog: {
    name: 'Brass Cog', category: 'junk', price: 3, tags: ['junk', 'mechanical'], icon: 'cog',
    description: 'A small brass cog. Tibbs would probably pay for it.',
  },
  item_bolts: {
    name: 'Bag of Bolts', category: 'junk', price: 2, tags: ['junk', 'mechanical'], icon: 'bolts',
    description: 'Assorted bolts. None of them match.',
  },
  item_rubber_stamp: {
    name: 'APPROVED Stamp', category: 'junk', price: 1, tags: ['junk'], icon: 'stamp',
    description: 'Osric\'s spare rubber stamp. It says APPROVED. It has never been used.',
  },
  item_lens_shard: {
    name: 'Lens Shard', category: 'quest', price: 0, tags: ['quest', 'mystery'], icon: 'shard',
    description: 'A curved sliver of thick glass that throws tiny rainbows. It hums very faintly when held to the light.',
  },
  item_gull_feather: {
    name: 'Gull Feather', category: 'junk', price: 0, tags: ['junk', 'gift'], icon: 'feather',
    description: 'A long grey gull feather. A trophy, or a warning.',
  },
};
