// Dialogue for Osric Vane. Voice: formal, precise, dry; cites form numbers;
// qualifies everything; sentiment leaks out sideways and is immediately denied.
const PERMISSION_GRANTED = [
  { flag: { lighthouse_permission: true } },
  {
    if: { containerHas: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } },
    then: [
      { containerTake: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } },
      { give: 'item_lighthouse_key' },
      { notify: 'Received: Lighthouse Key (with permission)' },
      { memory: { text: 'Granted the newcomer supervised access to the lighthouse. Unsupervised.', tag: 'granted_access', importance: 7 } },
    ],
    else: [
      { bark: 'The key is... not in my drawer. Why is the key not in my drawer?' },
      { npcLearn: 'fact_key_missing' },
      { mood: { id: 'flustered', minutes: 240 } },
    ],
  },
];

export default {
  id: 'dlg_osric',
  greetings: [
    {
      if: { firstMeeting: true },
      say: [
        'Good day. Osric Vane, Clerk of the Lanternside Civic Office.',
        'If this is about the patio permit, Mrs. Pell has already filed four. If it is not, please state your business. Clearly. In order of importance.',
      ],
    },
    {
      if: { any: [{ knows: 'fact_player_suspected_key' }, { recalls: { tag: 'suspects_player', withinMinutes: 4320 } }], not: { flag: 'key_returned' } },
      say: ['You. I would like it noted that I am watching you. I have, in fact, made a note.'],
    },
    {
      if: { knows: 'fact_player_trespassed_lighthouse', notFlag: 'osric_trespass_discussed' },
      say: ['I have received a report that you were on Lighthouse Point. Inside the tower. The Point is closed. "Closed" is not a suggestion; it is a state.'],
    },
    {
      if: { mood: 'irritable' },
      variants: [
        ['Yes? Make it brief. There were no honey buns at lunch. I am operating at a deficit.'],
        ['I am not in the mood. I am rarely in the mood, but today I am specifically not in it.'],
      ],
    },
    { if: { mood: 'flustered' }, say: ['Not now— well. Now, I suppose, since you are here. Quickly.'] },
    { if: { mood: 'affronted' }, say: ['Oh. It\'s you. I am still composing a memorandum about our last encounter.'] },
    {
      if: { rel: { trust: '>=30' } },
      variants: [
        ['Ah. {player}. A pleasure — which I do not say lightly. I do not say anything lightly.'],
        ['{player}. Good. I was hoping for someone competent, and here you are, adjacent to it.'],
      ],
    },
    {
      if: { not: { activity: ['work', 'citation'] } },
      variants: [
        ['I am off duty. Which means I am merely a citizen with an encyclopaedic knowledge of bylaws.'],
        ['Good evening. If you require the Civic Office, it reopens at half past eight. Sharp. I do not do blunt.'],
      ],
    },
    {
      if: {},
      variants: [
        ['Good day. State your business.'],
        ['Ah. You again. Is this regarding a form?'],
        ['Civic Office. That is to say, Osric. Proceed.'],
      ],
    },
  ],
  farewells: [
    { if: { rel: { trust: '>=30' } }, variants: [['Good day, {player}. Do stay out of trouble. Or at least, document it.']] },
    { if: {}, variants: [['Good day.'], ['That will be all.'], ['Mind the step. It is not up to code. I have filed a report.']] },
  ],
  topics: [
    {
      id: 't_osric_lighthouse', label: '"Why is the lighthouse closed?"', keywords: ['lighthouse', 'point', 'lamp', 'closed'],
      say: [
        'Decommissioned. Eleven years ago, by instruction from the city. The paperwork is... incomplete. I find that personally offensive.',
        'No one goes up the Point. That is the rule. I do not make the rules. I merely keep them alphabetised.',
      ],
      effects: [{ learn: 'fact_lighthouse_dark' }, { if: { quest: { id: 'q_dark_lamp', state: 'not_started' } }, then: [{ quest: { id: 'q_dark_lamp', start: true } }] }],
      repeat: [['As I said: decommissioned, incompletely. It keeps me up at night. Ten fifteen, specifically.']],
    },
    {
      id: 't_osric_request', label: '"I\'d like permission to enter the lighthouse."', tag: 'quest', keywords: ['permission', 'access', 'key'],
      if: { quest: { id: 'q_dark_lamp', stage: ['find_way_in', 'search'] }, notFlag: 'lighthouse_permission', not: { hasItem: 'item_lighthouse_key' } },
      say: ['Permission. To enter a decommissioned structure on a closed headland. I see.', 'On what basis?'],
      choices: [
        {
          id: 'c_formal', label: '"I wish to file a formal access request."',
          require: { any: [{ rel: { trust: '>=25' } }, { rep: { fac_civic: '>=8' } }] },
          lockedHint: 'Osric needs to trust you more — or you need standing with the Civic Office.',
          say: [
            '...Very well. Form 12-C, Temporary Access, Supervised (Unsupervised). Sign here. And here. Initial there.',
            'The key is to be returned. Polished.',
          ],
          effects: [...PERMISSION_GRANTED, { rel: { respect: 3 } }],
        },
        {
          id: 'c_persuade', label: '"The public deserves to know why the light went out."',
          if: { not: { flagToday: 'osric_persuade_failed' } },
          check: { stat: 'wits', base: 0.32, relScale: { trust: 0.006, respect: 0.004, suspicion: -0.006 }, mods: [{ if: { mood: 'content' }, add: 0.1 }] },
          say: ['...That is, annoyingly, a coherent argument. The public record IS incomplete.', 'Form 12-C. Sign. Return the key polished. I will be checking.'],
          effects: [...PERMISSION_GRANTED, { rel: { respect: 5 } }],
          fail: {
            say: ['No. And I will thank you not to use the word "public" at me in that tone. Come back tomorrow, with a better tone.'],
            effects: [{ rel: { respect: -2 } }, { flag: { osric_persuade_failed: '$day' } }],
          },
        },
        {
          id: 'c_bribe', label: 'Slide 10 obols across the desk.',
          if: { money: '>=10' },
          say: [
            'Is that... money? On my DESK?',
            'Put that away before it becomes evidence. I am going to pretend this did not happen, and then I am going to write down that it did.',
          ],
          effects: [{ rel: { trust: -8, respect: -10 } }, { npcLearn: 'fact_player_bribed_osric' }, { mood: { id: 'affronted', minutes: 300 } }],
        },
        {
          id: 'c_bun', label: '"Would a honey bun help my application?"',
          if: { hasItem: 'item_honey_bun' },
          say: ['A bun is not a bribe. A bun is a bun. Applications are assessed on merit.', '...Leave the bun. For unrelated reasons.'],
          effects: [{ take: 'item_honey_bun' }, { rel: { affection: 8, trust: 6 } }, { mood: { id: 'content', minutes: 180 } }],
          stay: true,
        },
      ],
    },
    {
      id: 't_osric_coffee', label: '"Coffee delivery from the Kettle & Crumb."', tag: 'quest', keywords: ['coffee', 'delivery'],
      if: { hasItem: 'item_coffee_order', quest: { id: 'job_cafe_delivery', state: 'active' } },
      variants: [
        ['Black. No nonsense. Correct.', 'Six obols, as per the standing arrangement. Count them. I did.'],
        ['Ah. On time. Within tolerance, at least.', 'Six obols. Please convey my regards to Mrs. Pell. Formally.'],
      ],
      effects: [
        { take: 'item_coffee_order' },
        { rel: { trust: 4, respect: 1 } },
        { npcLearn: 'fact_player_reliable_courier' },
        { quest: { id: 'job_cafe_delivery', complete: 'delivered' } },
      ],
    },
    {
      id: 't_osric_return_stolen', label: '"I have your lighthouse key."', tag: 'quest', keywords: ['return', 'key'],
      if: { hasItem: 'item_lighthouse_key', stolen: 'item_lighthouse_key' },
      say: ['...That is the lighthouse key. That is MY lighthouse key. Explain.'],
      choices: [
        {
          id: 'c_confess', label: '"I took it from your desk. I\'m sorry."',
          say: ['Honesty. Belatedly. I shall file it under "Mitigating".', 'The key goes back in the drawer. You go back to being a person I am watching — but less closely.'],
          effects: [
            { take: 'item_lighthouse_key' }, { containerPut: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } }, { clearStolen: 'item_lighthouse_key' },
            { rel: { trust: 5, suspicion: -25, respect: 4 } }, { flag: { key_returned: true } },
            { memory: { text: 'The newcomer confessed to taking the lighthouse key and returned it.', tag: 'key_confession', importance: 7 } },
          ],
        },
        {
          id: 'c_found', label: '"I found it lying on the Point."',
          check: { stat: 'wits', base: 0.4, relScale: { suspicion: -0.008 } },
          say: ['On the Point. Lying there. Hm. Then someone has been careless, and it was not me. Thank you for returning it.'],
          effects: [
            { take: 'item_lighthouse_key' }, { containerPut: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } }, { clearStolen: 'item_lighthouse_key' },
            { rel: { suspicion: -15, trust: 2 } }, { flag: { key_returned: true } },
          ],
          fail: {
            say: ['You are lying. Your left eyebrow has filed a confession on your behalf.', 'The key. Now.'],
            effects: [
              { take: 'item_lighthouse_key' }, { containerPut: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } }, { clearStolen: 'item_lighthouse_key' },
              { rel: { trust: -8, suspicion: 10 } }, { flag: { key_returned: true } }, { npcLearn: 'fact_player_stole_from_osric' },
            ],
          },
        },
      ],
    },
    {
      id: 't_osric_return_key', label: '"Returning the lighthouse key."', keywords: ['return', 'key'],
      if: { hasItem: 'item_lighthouse_key', flag: 'lighthouse_permission', not: { stolen: 'item_lighthouse_key' } },
      say: ['Polished? ...Adequately. Thank you. The Office appreciates citizens who return things.'],
      effects: [{ take: 'item_lighthouse_key' }, { containerPut: { container: 'ct_civic_desk', item: 'item_lighthouse_key' } }, { rel: { respect: 4, trust: 2 } }, { flag: { key_returned: true } }],
    },
    {
      id: 't_osric_logbook', label: '"I found the keeper\'s log."', tag: 'quest', keywords: ['log', 'logbook', 'keeper'],
      if: { quest: { id: 'q_dark_lamp', stage: 'decide' }, playerKnows: 'fact_keeper_log' },
      say: [
        { if: { flag: 'lighthouse_permission' }, text: 'You read it? Show me. ...Removed for safekeeping. By "M". Under the old seal.' },
        { if: { notFlag: 'lighthouse_permission' }, text: 'You went in without permission. That is a matter for Form 9. But this... this is a matter for me.' },
        'There is no record of this order. None. Someone has been keeping the Civic Office in the dark — which is, I note, the lighthouse\'s job.',
        'I am opening a file. I will need a new drawer.',
      ],
      effects: [
        { npcLearn: 'fact_keeper_log' },
        { rel: { trust: 8, respect: 6 } },
        { memory: { text: 'The keeper\'s log names a mysterious "M". The Office was never told.', tag: 'told_logbook', importance: 9 } },
        { quest: { id: 'q_dark_lamp', complete: 'told_osric' } },
      ],
    },
    {
      id: 't_osric_trespass', label: '"About the lighthouse report..."', keywords: ['trespass', 'report', 'sorry'],
      if: { knows: 'fact_player_trespassed_lighthouse', notFlag: 'osric_trespass_discussed' },
      say: ['Yes?'],
      choices: [
        {
          id: 'c_apologise', label: '"I shouldn\'t have gone in. I apologise."', check: { stat: 'charm', base: 0.5, relScale: { trust: 0.005 } },
          say: ['...An apology. In person. Without being asked twice. That is rarer than you would think.', 'Noted. Favourably. Do not do it again — or if you must, do it with a form.'],
          effects: [{ rel: { trust: 6, respect: 2 } }, { flag: { osric_trespass_discussed: true } }],
          fail: { say: ['Noted. Unfavourably, but noted.'], effects: [{ rel: { trust: 2 } }, { flag: { osric_trespass_discussed: true } }] },
        },
        {
          id: 'c_justify', label: '"Someone had to find out what happened."', check: { stat: 'wits', base: 0.35, relScale: { respect: 0.006 } },
          say: ['...I cannot fault the conclusion. Only the method, the hour, the route, and the absence of paperwork.'],
          effects: [{ rel: { respect: 5 } }, { flag: { osric_trespass_discussed: true } }],
          fail: { say: ['"Someone" is not a legal category.'], effects: [{ rel: { respect: -2 } }, { flag: { osric_trespass_discussed: true } }] },
        },
      ],
    },
    {
      id: 't_osric_job', label: '"What does a clerk actually do?"', keywords: ['clerk', 'job', 'office', 'work'],
      say: ['Everything nobody else wants to do, in triplicate.', 'Permits, complaints, keys, notices, complaints about notices. I am the only employee of the Lanternside Civic Office. I am also its union representative. We are in dispute.'],
      repeat: [['As previously stated: everything, in triplicate.']],
    },
    {
      id: 't_osric_register', label: '"Is there anything I should sign?"', keywords: ['sign', 'register', 'form'],
      if: { notFlag: 'signed_register', map: 'civic_office' },
      say: ['There is a Visitors\' Register on the lectern. Everyone who visits signs it. Nobody does. You could be the exception.'],
    },
  ],
  askAbout: [
    { keywords: ['gull', 'gulls'], variants: [['The gulls are not, legally, a nuisance. I have tried. The relevant bylaw defines nuisance as "a person". I am lobbying for amendment.']] },
    { keywords: ['honey', 'bun', 'sweet'], say: ['I have no idea what you are referring to. ...Mrs. Pell talks too much.'] },
    { keywords: ['form', 'forms', 'paperwork'], say: ['There is a form for everything. If there is not, there is Form 0: Request for a Form.'] },
    { keywords: ['m.', 'signed m', ' m '], if: { knows: 'fact_keeper_log' }, say: ['"M". The old seal was the Harbourmaster\'s. The Harbourmaster\'s office was abolished twelve years ago. One year BEFORE that letter. You see the problem.'] },
    { keywords: ['obermere', 'city'], say: ['Obermere City Council sends us a memorandum every quarter. It is always the same memorandum. I reply to it anyway.'] },
  ],
  askPrompt: [['Please phrase your enquiry concisely.']],
  unknown: [
    ['I have no record of that.'],
    ['That falls outside the jurisdiction of this office. And, I suspect, of reality.'],
    ['If you wish to pursue that, there is a form. There is not, actually. But there should be.'],
  ],
  gift: {
    loved: [['Is this— a Kettle & Crumb honey bun? This is highly irregular.', '...Thank you. I shall eat it at precisely the correct moment, which is now.']],
    liked: [['How unexpectedly considerate. I shall log it under "Goodwill, Received".']],
    neutral: [['Thank you. I am... not certain what to do with this. I shall file it.']],
    disliked: [['A gull feather. You have brought a gull feather into a civic building. Remove it. With dignity, if possible.']],
    tooMany: [['Please. Further gifts may constitute an inducement under section four.']],
    ownStolen: [['This is MY stamp. From MY drawer. Explain. No — do not explain. I have a form for this.']],
  },
  barks: {
    greet: ['Good day.', 'Citizen.', 'Hm.'],
    work: ['Form 12-C, Form 12-C…', 'Alphabetical. As nature intended.', 'Who stamped this in green?'],
    eat: ['The bun is acceptable.', 'Black coffee. No nonsense.'],
    patrol: ['Closed means closed.', 'Gate secure. Probably.', 'Hm. Footprints?'],
    home: ['A quiet morning. As per schedule.'],
    leisure: ['Bylaws, volume six. Riveting.'],
    sleep: ['…in triplicate… *snore*'],
    citation: ['Mr. Hollow! A word about decibels.', 'Form 7-B. Sign here.'],
    chat: ['As per regulations…', 'I could not possibly comment.', 'Hm. Indeed.', 'That is… noted.'],
    argue: ['That is a violation!', 'I will be filing a report.'],
    moods: { irritable: ['No buns. No patience.'], flustered: ['The key… where is the key…'], content: ['Hm. A satisfactory day.'] },
  },
};
