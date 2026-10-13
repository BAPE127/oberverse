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

  q_seal_of_m: {
    title: 'The Seal of M.',
    summary: 'The keeper\'s log names "M.", who ordered the lens removed under "the old seal". Who was M. — and where is the lens now?',
    start: 'investigate',
    stages: {
      investigate: {
        journal: 'Someone signed "M." used an old seal to darken the lighthouse. Find out who — and where the great lens went.',
        objectives: [
          { id: 'o_who', text: 'Find out who used the old seal.', if: { not: { playerKnows: 'fact_moneybucks_bought_seal' } } },
          { id: 'o_where', text: 'Find out where the great lens went.', if: { not: { any: [{ playerKnows: 'fact_lens_in_vault' }, { hasItem: 'item_great_lens' }] } } },
        ],
        hints: [
          { if: { not: { playerKnows: 'fact_harbourmaster_seal' } }, text: 'Osric knows every seal and stamp in the borough. Ask him about "M." or the seal.' },
          { if: { playerKnows: 'fact_harbourmaster_seal', not: { playerKnows: 'fact_moneybucks_bought_seal' } }, text: 'The Harbourmaster\'s office was abolished — someone acquired its seal. Ober\'s Oil has been here a long time, and Agnes Thornbury keeps its books.' },
          { if: { hasItem: 'item_lens_shard', not: { playerKnows: 'fact_shard_matches' } }, text: 'The lens shard hums. A chemist might know why — Delphine works at the refinery.' },
          { if: { playerKnows: 'fact_shard_matches', not: { playerKnows: 'fact_lens_in_vault' } }, text: 'Something in Moneybucks Manor resonates with the shard. Pip mentioned a vault that hums.' },
          { if: { playerKnows: 'fact_night_tankers' }, text: 'Ober\'s Oil tankers once crossed the bay at night "when the lighthouse wasn\'t looking".' },
        ],
      },
      decide: {
        journal: 'Sir Moneybucks is "M." He bought the Harbourmaster\'s seal and darkened the bay so his tankers could run untaxed. The great lens is in his vault.',
        objectives: [{ id: 'o_decide', text: 'Expose him to Osric, confront Sir Moneybucks yourself, or take the lens back to the lighthouse.' }],
        hints: [
          { if: {}, text: 'Osric will want proof — and will act on it. Sir Moneybucks will want to negotiate. The lens itself needs only its cradle.' },
          { if: { not: { hasItem: 'item_vault_key' } }, text: 'The vault key is kept in Sir Moneybucks\'s desk. Agnes may have a copy, if she trusts you.' },
        ],
      },
    },
    triggers: [
      { event: 'quest:completed', where: { id: 'q_dark_lamp' }, notStarted: true, start: true },
      { event: 'fact:learned', where: { who: 'player', factId: 'fact_harbourmaster_seal' }, notStarted: true, start: true },
      { event: 'fact:learned', where: { who: 'player', factId: 'fact_moneybucks_bought_seal' }, notStarted: true, start: true },
      { event: 'item:acquired', where: { id: 'item_great_lens' }, effects: [{ learn: 'fact_lens_in_vault' }] },
      { event: 'fact:learned', where: { who: 'player', factId: 'fact_moneybucks_bought_seal' }, stage: 'investigate', if: { playerKnows: 'fact_lens_in_vault' }, advance: 'decide' },
      { event: 'fact:learned', where: { who: 'player', factId: 'fact_lens_in_vault' }, stage: 'investigate', if: { playerKnows: 'fact_moneybucks_bought_seal' }, advance: 'decide' },
    ],
    outcomes: {
      exposed: {
        journal: 'You brought the proof to Osric. The Civic Office — all one of it — opened proceedings against Ober\'s Oil. The lens is coming home.',
        effects: [{ money: 20 }, { notify: 'Quest complete: The Seal of M. (exposed)' }],
      },
      restored: {
        journal: 'You carried the great lens back up the Point yourself and set it in its cradle. The old clockwork turned. Lanternside has a lighthouse again.',
        effects: [{ rep: { lanternside: 8 } }, { notify: 'Quest complete: The Seal of M. (restored)' }],
      },
      blackmailed: {
        journal: 'You sold your silence to Sir Moneybucks for 150 obols. The bay stays dark. He will not forget.',
        effects: [{ notify: 'Quest complete: The Seal of M. (blackmail)' }],
      },
      bargained: {
        journal: 'You took fifteen shares and a seat at Sir Moneybucks\'s table. The lens stays in the vault. The bay stays dark.',
        effects: [{ notify: 'Quest complete: The Seal of M. (partner)' }],
      },
    },
  },

  job_refinery_shift: {
    title: 'Job: Refinery Shift',
    kind: 'job',
    giver: 'npc_gideon',
    summary: 'Day labour at Ober\'s Oil Refinery No. 1. Three stations, one foreman, five obols.',
    start: 'work',
    expires: { at: '20:00' },
    stages: {
      work: {
        journal: 'Work the valve bank, the gauge panel and the barrel line inside the refinery. Properly — or quickly.',
        objectives: [
          { id: 'o_valves', text: 'Work the valve bank.', if: { not: { flagToday: 'shift_valves' } } },
          { id: 'o_gauges', text: 'Work the gauge panel.', if: { not: { flagToday: 'shift_gauges' } } },
          { id: 'o_barrels', text: 'Work the barrel line.', if: { not: { flagToday: 'shift_barrels' } } },
        ],
        marker: 'ober_fields:refinery_door_out',
      },
      report: {
        journal: 'All three stations done. Report to Gideon Slate to get paid.',
        objectives: [{ id: 'o_report', text: 'Report to Gideon at the foreman\'s desk.' }],
        marker: 'ober_fields:refinery_door_out',
      },
    },
    outcomes: { paid: { journal: 'Paid. Your hands smell of crude and your pockets of… slightly more crude.', effects: [{ rep: { fac_oil: 1 } }] } },
    failures: { expired: { journal: 'The shift ended before you finished. Gideon docked the lot.', effects: [{ notify: 'Refinery shift not finished — no pay today.', notifyKind: 'warn' }] } },
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
