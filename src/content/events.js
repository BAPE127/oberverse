// Emergent event templates (see src/systems/eventDirector.js).
//   check: 'hourly' | 'onArrive' | 'chained' (only fires as a follow-up)
//   npc:   character whose perspective conditions/effects use ("self")
//   when:  conditions; chance: probability per check; cooldownMinutes; once
//   followUps: [{ id, delayMinutes? , at?: 'HH:MM' }]
export const EVENTS = {
  ev_workshop_bang: {
    name: 'A bang at Hollow Fixings',
    check: 'hourly',
    npc: 'npc_tibbs',
    when: { activity: 'tinker', arrived: true },
    chance: 0.45,
    cooldownMinutes: 480,
    effects: [
      { noise: { sources: ['workshop:engine', 'lanternside:workshop_door_out'], radius: 16, fact: 'fact_workshop_bang', sfx: 'sfx_bang', text: 'BANG! A puff of smoke rises from Hollow Fixings.' } },
      { mood: { id: 'sheepish', minutes: 120 } },
      { memory: { text: 'Duchess backfired. Loudly.', tag: 'bang', importance: 4, about: null } },
    ],
    followUps: [{ id: 'ev_noise_citation', at: '10:00' }],
  },
  ev_noise_citation: {
    name: 'The noise citation',
    check: 'chained',
    npc: 'npc_osric',
    when: { knows: 'fact_workshop_bang' },
    effects: [
      { errand: { spot: 'lanternside:workshop_door_out', activity: 'citation', minutes: 40 } },
      { npcLearn: 'fact_osric_citation' },
      { flag: { citation_posted: true } },
      { tell: { npc: 'npc_tibbs', fact: 'fact_osric_citation' } },
      { relNpc: { from: 'npc_tibbs', to: 'npc_osric', affection: -6 } },
      { relNpc: { from: 'npc_osric', to: 'npc_tibbs', respect: -3 } },
      { npcMood: { npc: 'npc_tibbs', id: 'grumpy', minutes: 600 } },
      { memory: { text: 'Issued Mr. Hollow a noise citation. Form 7-B, in triplicate.', tag: 'citation', importance: 5, about: 'npc_tibbs' } },
      { npcMemory: { npc: 'npc_tibbs', text: 'Osric slapped another citation on the door.', tag: 'citation', importance: 5, about: 'npc_osric' } },
    ],
  },
  ev_theft_discovered: {
    name: 'The missing key',
    check: 'onArrive',
    npc: 'npc_osric',
    activity: 'work',
    map: 'civic_office',
    when: { not: { containerHas: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } }, notFlag: 'lighthouse_permission' },
    effects: [
      {
        if: { not: { knows: 'fact_key_missing' } },
        then: [
          { npcLearn: 'fact_key_missing' },
          { flag: { key_missing_posted: true } },
          { mood: { id: 'flustered', minutes: 300 } },
          { bark: 'The key! The LIGHTHOUSE key! Who has been in my desk?' },
          { memory: { text: 'The lighthouse key is missing from my desk.', tag: 'key_missing', importance: 8, about: null } },
          {
            if: { recalls: { tag: 'saw_player_office', withinMinutes: 720 } },
            then: [
              { npcLearn: 'fact_player_suspected_key' },
              { rel: { trust: -10, suspicion: 25 } },
              { memory: { text: 'The newcomer was in the office today. Suspicious.', tag: 'suspects_player', importance: 7 } },
            ],
          },
        ],
      },
    ],
  },
  ev_cafe_sellout: {
    name: 'Out of honey buns',
    check: 'hourly',
    npc: 'npc_mags',
    when: { stock: { shop: 'shop_kettle', item: 'item_honey_bun', count: '<=0' }, activity: 'work' },
    cooldownMinutes: 600,
    effects: [{ npcLearn: 'fact_cafe_out_of_buns' }, { bark: 'Sold out of buns again! Osric will sulk.' }],
  },
  ev_gull_heist: {
    name: 'Gull heist',
    check: 'hourly',
    when: { map: 'lanternside', hasItemTag: 'food', time: { from: '07:00', to: '20:00' } },
    chance: 0.12,
    cooldownMinutes: 360,
    effects: [
      { sfx: 'sfx_gull' },
      { takeTag: 'food' },
      { notify: 'A gull swoops out of nowhere and makes off with your snack. Rude.', notifyKind: 'warn' },
      { learn: 'fact_gulls_organised' },
    ],
  },
};
