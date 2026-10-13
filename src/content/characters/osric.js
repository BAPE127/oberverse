// Osric Vane — original Oberverse resident (not an imported character).
export default {
  id: 'npc_osric',
  name: 'Osric Vane',
  shortName: 'Osric',
  tier: 'major',
  origin: 'original',
  role: 'Clerk of the Lanternside Civic Office; keeper of keys, forms and grudges.',
  faction: 'fac_civic',
  dialogue: 'dlg_osric',
  motif: 'motif_osric',
  voice: { wave: 'square', pitch: 190, variance: 18, rate: 1.15 },
  appearance: {
    skin: '#f0d0b0', hair: '#3b3633', hairStyle: 'parted', outfit: '#3e4863', tie: '#8a2b2b',
    accent: '#c9c2b0', accessory: 'glasses', build: 'thin', height: 1.06,
    sprite: null, portrait: null,
  },
  personality: {
    traits: ['punctilious', 'principled', 'secretly sentimental', 'sweet tooth'],
    sociability: 0.3, patience: 0.7, confidence: 0.6, impulsiveness: 0.1, honesty: 0.95,
    curiosity: 0.45, competitiveness: 0.4, humor: 0.35, empathy: 0.5, riskTolerance: 0.1,
    conscientiousness: 0.95, discretion: 0.8,
    values: ['order', 'procedure', 'the public record'],
    likes: ['honey buns', 'correctly completed forms', 'punctuality'], dislikes: ['bribery', 'noise', 'trespass', 'improvisation'],
  },
  speech: {
    formality: 0.95, verbosity: 0.5,
    habits: ['cites form numbers', 'precise qualifications', 'dry understatement'],
    rumorPrefix: 'It has been reported — unofficially — that', factPrefix: 'It is a matter of record that', refuse: 'That information is restricted. I am sorry. I am not sorry. It is restricted.',
  },
  mechanics: {
    formalRequests: true, // access via formal request, persuasion, or reputation
  },
  punctuality: 15,
  walkSpeed: 1.0,
  schedule: [
    { from: '06:30', to: '08:30', activity: 'home', spot: 'osric_house:armchair' },
    { from: '08:30', to: '12:00', activity: 'work', spot: 'civic_office:desk_chair' },
    {
      from: '12:00', to: '13:00', activity: 'eat', spot: 'cafe:table_corner', label: 'lunch at the Kettle & Crumb',
      onArrive: [
        {
          consume: {
            shop: 'shop_kettle', item: 'item_honey_bun',
            then: [{ mood: { id: 'content', minutes: 180 } }],
            else: [
              { mood: { id: 'irritable', minutes: 240 } },
              { memory: { text: 'No honey buns at lunch. Again.', tag: 'no_buns', importance: 4, about: null } },
              { bark: 'No honey buns? This is a dereliction.' },
            ],
          },
        },
      ],
    },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'civic_office:desk_chair' },
    { from: '17:00', to: '18:30', activity: 'patrol', spot: 'lanternside:lighthouse_gate', label: 'inspecting the Point' },
    { from: '18:30', to: '22:00', activity: 'leisure', spot: 'osric_house:armchair' },
    { from: '22:00', to: '06:30', activity: 'sleep', spot: 'osric_house:bed' },
  ],
  impulses: [
    {
      id: 'overtime', activity: 'work', spot: 'civic_office:desk_chair', label: 'staying late over paperwork',
      trait: 'conscientiousness', weight: 0.75, duringActivity: ['patrol'], duration: 30,
    },
    {
      id: 'search_point', activity: 'patrol', spot: 'lanternside:lighthouse_gate', label: 'searching the Point for the missing key',
      trait: 'conscientiousness', weight: 1.6, duringActivity: ['work', 'leisure'], duration: 45,
      when: { knows: 'fact_key_missing', mood: 'flustered' },
    },
  ],
  relationships: {
    player: { trust: 0, affection: 0, respect: 0, suspicion: 5 },
    npc_mags: { trust: 25, affection: 20, respect: 15, suspicion: 0 },
    npc_tibbs: { trust: 5, affection: 0, respect: -5, suspicion: 10 },
  },
  knowledge: ['fact_lighthouse_dark', 'fact_osric_has_key'],
  giftPrefs: { item_honey_bun: 14, item_coffee: 4, item_wildflowers: 2, item_gull_feather: -6, tags: { sweet: 6 } },
  reactions: {
    fact_player_trespassed_lighthouse: { rel: { trust: -6, respect: -4 }, mood: { id: 'affronted', minutes: 240 } },
    fact_player_bribed_osric: { rel: { trust: -6 } },
    fact_player_reliable_courier: { rel: { respect: 2 } },
  },
  notices: [{ map: 'civic_office', tag: 'saw_player_office', text: 'The newcomer visited the office.', importance: 3 }],
  opinions: {
    npc_mags: {
      warm: 'Mrs. Pell is the closest thing Lanternside has to a newspaper, a heating system and a conscience. Do not tell her I said so.',
      cool: 'Mrs. Pell has filed four patio permits this month. Four. I have begun to dream in patio.',
    },
    npc_tibbs: {
      warm: 'Mr. Hollow is... enthusiastic. Enthusiasm is not a crime. Usually.',
      cool: 'Mr. Hollow and I have an ongoing correspondence regarding decibels. He does not reply. Duchess does, loudly.',
    },
  },
};
