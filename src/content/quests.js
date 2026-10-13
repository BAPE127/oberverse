// Quests and jobs. Objectives describe outcomes, not mandatory steps; hints
// appear in the journal only once the player knows the relevant fact.
export const QUESTS = {
  q_dark_lamp: {
    title: 'The Dark Lamp',
    giver: 'npc_mags',
    summary: 'The Lanternside lighthouse has been dark for eleven years. Nobody official seems to want to talk about why.',
    start: 'find_way_in',
    stages: {
      find_way_in: {
        journal: 'Mags wants to know why the lighthouse went dark. The tower on Lighthouse Point is locked and off-limits.',
        objectives: [{ id: 'o_enter', text: 'Get inside the old lighthouse on Lighthouse Point.' }],
        marker: 'lanternside:lighthouse_door_out',
        hints: [
          { if: { playerKnows: 'fact_osric_has_key' }, text: 'The key is in the top drawer of the Civic Office desk.' },
          { if: { playerKnows: 'fact_osric_sweet_tooth' }, text: 'Osric Vane guards the key — and has a weakness for honey buns.' },
          { if: { playerKnows: 'fact_hatch_exists' }, text: 'A rusted maintenance hatch on the east side might open with the right tool.' },
          { if: { not: { playerKnows: 'fact_osric_has_key' } }, text: 'The Civic Office is responsible for the Point. Its clerk, Osric Vane, would know about access.' },
        ],
      },
      search: {
        journal: 'You are inside the lighthouse. Dust, salt, and a lectern with a logbook.',
        objectives: [{ id: 'o_search', text: 'Look for clues about why the light went out.' }],
        marker: 'lighthouse:entry',
        hints: [],
      },
      decide: {
        journal: 'The keeper\'s log says the lens was removed "for safekeeping" on the orders of someone signed "M."',
        objectives: [{ id: 'o_report', text: 'Decide who should hear about the logbook: Mags, Osric — or nobody yet.' }],
        hints: [
          { if: {}, text: 'Mags will tell the whole borough by supper. Osric will want it done properly.' },
        ],
      },
    },
    triggers: [
      { event: 'map:entered', where: { map: 'lighthouse' }, stage: 'find_way_in', advance: 'search' },
      { event: 'map:entered', where: { map: 'lighthouse' }, notStarted: true, start: true },
      { event: 'fact:learned', where: { who: 'player', factId: 'fact_keeper_log' }, stage: ['find_way_in', 'search'], advance: 'decide' },
    ],
    outcomes: {
      told_mags: {
        journal: 'You told Mags about the keeper\'s log. Within the hour, half of Canal Row was speculating about "M."',
        effects: [{ money: 12 }, { rep: { fac_merchants: 5, lanternside: 3 } }, { notify: 'Quest complete: The Dark Lamp (+12 obols)' }],
      },
      told_osric: {
        journal: 'You brought the keeper\'s log to Osric. He went very quiet, then opened a new file marked "M."',
        effects: [{ money: 12 }, { rep: { fac_civic: 6, lanternside: 2 } }, { notify: 'Quest complete: The Dark Lamp (+12 obols)' }],
      },
    },
  },

  q_lucky_spanner: {
    title: 'The Lucky Spanner',
    giver: 'npc_tibbs',
    summary: 'Tibbs Hollow lost his lucky spanner in Gullwing Park. He suspects a gull.',
    start: 'find',
    stages: {
      find: {
        journal: 'Tibbs dropped his lucky spanner somewhere in Gullwing Park, chasing a gull "with intent".',
        objectives: [{ id: 'o_find', text: 'Search Gullwing Park for Tibbs\'s spanner.' }],
        marker: 'lanternside:park_pond',
        hints: [{ if: {}, text: 'He mentioned the pines on the east side of the park.' }],
      },
      return: {
        journal: 'You found the spanner under the pines.',
        objectives: [{ id: 'o_return', text: 'Return the lucky spanner to Tibbs at Hollow Fixings.' }],
        marker: 'lanternside:workshop_door_out',
        hints: [],
      },
    },
    triggers: [
      { event: 'item:acquired', where: { id: 'item_lucky_spanner' }, stage: 'find', advance: 'return' },
    ],
    outcomes: {
      returned: {
        journal: 'Tibbs nearly cried. He pressed his spare crowbar into your hands and told you a secret about the lighthouse.',
        effects: [{ rep: { fac_quay: 4 } }, { notify: 'Quest complete: The Lucky Spanner' }],
      },
      kept: {
        journal: 'You kept the spanner. Tibbs still thinks the gull has it.',
        effects: [],
      },
    },
  },

  job_cafe_delivery: {
    title: 'Job: Coffee for the Clerk',
    kind: 'job',
    giver: 'npc_mags',
    summary: 'Mags sends a coffee to the Civic Office every working day. Osric pays on delivery.',
    start: 'deliver',
    expires: { at: '17:00' },
    stages: {
      deliver: {
        journal: 'Deliver Osric\'s coffee order to the Civic Office before it closes at 17:00.',
        objectives: [{ id: 'o_deliver', text: 'Hand the coffee order to Osric Vane (Civic Office, until 17:00).' }],
        marker: 'lanternside:civic_door_out',
        hints: [],
      },
    },
    outcomes: {
      delivered: {
        journal: 'Delivered. Osric inspected the lid, nodded once, and paid exactly.',
        effects: [{ money: 6 }, { rep: { fac_merchants: 1 } }, { notify: 'Job done: +6 obols' }],
      },
    },
    failures: {
      expired: {
        journal: 'The Civic Office closed before the coffee arrived. Mags will hear about it.',
        effects: [
          { take: 'item_coffee_order' },
          { npcMemory: { npc: 'npc_mags', text: 'The newcomer never delivered Osric\'s coffee.', tag: 'delivery_failed', about: 'player', importance: 5 } },
          { relNpc: { from: 'npc_mags', to: 'player', trust: -6 } },
          { notify: 'Job failed: the coffee never reached Osric.', notifyKind: 'warn' },
        ],
      },
    },
  },
};
