// Dialogue for Marguerite "Mags" Pell. Voice: warm, chatty, nosy; endearments
// (petal, duck, love); rhetorical questions; drifts into tangents.
export default {
  id: 'dlg_mags',
  greetings: [
    {
      if: { firstMeeting: true },
      say: [
        'Well now! A new face! You\'ll be the one who took Number 9 — don\'t look so surprised, petal. Lanternside has about four secrets and I keep all of them.',
        'I\'m Mags. Marguerite if you\'re the tax office. You look like you need a bun and a job, in that order.',
      ],
    },
    {
      if: { knows: 'fact_player_trespassed_lighthouse', not: { quest: { id: 'q_dark_lamp', state: 'completed' } } },
      variants: [[
        'So. A little bird — a big gull, really — says you\'ve been up the Point. Mm-hm. I\'m not judging, duck. I\'m *listening*.',
      ]],
    },
    {
      if: { mood: ['irritable', 'flustered', 'grumpy'] },
      variants: [
        ['Mind the floor, love, I\'ve just— oh, it\'s you. Sorry. It\'s been a day and a half and it\'s only the one day.'],
        ['Don\'t mind me, petal. Somebody\'s bought all my buns and I\'ve got a clerk to placate.'],
      ],
    },
    {
      if: { recalls: { tag: 'delivery_failed', withinMinutes: 2880 } },
      say: ['Oh. Hello. Osric rang about his coffee. Rang! He hates the telephone. You can imagine.'],
    },
    {
      if: { rel: { affection: '>=35' } },
      variants: [
        ['There\'s my favourite newcomer! Sit, sit. Well — stand, the chairs are wobbly.'],
        ['{player}! I was just saying to the kettle, I said, where\'s {player} got to?'],
      ],
    },
    {
      if: { activity: 'socialize' },
      variants: [
        ['Pull up some bench, duck. I\'m on my break, which means I\'m working twice as hard at noticing things.'],
        ['Afternoon! Don\'t tell anyone I sit down. It ruins the mystique.'],
      ],
    },
    {
      if: { time: { from: '20:00', to: '05:00' } },
      variants: [['We\'re nearly closed, love, but the kettle\'s never fully off. Like me.']],
    },
    {
      if: {},
      variants: [
        ['Hello again, petal. What\'ll it be?'],
        ['Back again? Good. The scones were getting lonely.'],
        ['Ah, {player}! Just in time. I need someone to tell something to.'],
        ['Morning, noon or night, the Kettle\'s on. What can I do you for?'],
      ],
    },
  ],
  farewells: [
    { if: { rel: { affection: '>=30' } }, variants: [['Off you pop. Come back and tell me everything.'], ['Mind the gulls, duck. They\'ve got your number.']] },
    { if: {}, variants: [['Ta-ra, petal.'], ['Bye now. Don\'t be a stranger — strangers get the stale scones.'], ['Go on then. Shoo, with love.']] },
  ],
  topics: [
    {
      id: 't_mags_menu', label: '"What\'s good today?"', keywords: ['menu', 'food', 'buy', 'bun', 'coffee', 'scone'],
      if: { activity: 'work', map: 'cafe' },
      variants: [
        ['Buns, scones, coffee. Everything else is gossip, and that\'s free.'],
        ['The honey buns are famous, the scones are infamous, and the coffee is legally a beverage.'],
      ],
      effects: [{ openShop: 'shop_kettle' }],
    },
    {
      id: 't_mags_menu_away', label: '"Can I buy something?"', keywords: ['menu', 'buy'],
      if: { not: { all: [{ activity: 'work' }, { map: 'cafe' }] } },
      say: ['Not out here, love — I don\'t keep buns in my apron. Usually. Come by the counter when I\'m working.'],
    },
    {
      id: 't_mags_lighthouse', label: '"What happened to the lighthouse?"', keywords: ['lighthouse', 'lamp', 'point'],
      if: { quest: { id: 'q_dark_lamp', state: 'not_started' } },
      say: [
        'Eleven years dark. One night lit, next night not, and nobody\'s said why. Osric — he\'s the Civic clerk — says it\'s "decommissioned". Decommissioned! Like a tea urn!',
        'You\'ve the look of someone who finds things out. Go and have a peek, would you? Quietly. I want to know before the Gazette does.',
      ],
      effects: [{ learn: 'fact_lighthouse_dark' }, { quest: { id: 'q_dark_lamp', start: true } }],
    },
    {
      id: 't_mags_lighthouse_help', label: '"How would I get into the lighthouse?"', keywords: ['key', 'get in', 'inside', 'enter'],
      if: { quest: { id: 'q_dark_lamp', stage: 'find_way_in' } },
      say: [
        'Osric keeps the key. He\'s a stickler, but he\'s soft as butter underneath — especially butter with honey on it.',
        'Bring him a honey bun and ask him properly. Very properly. With forms.',
        { if: { knows: 'fact_hatch_exists' }, text: 'And Tibbs was going on about some hatch round the side of the tower. Don\'t tell Osric I said.', effects: [{ learn: 'fact_hatch_exists' }] },
      ],
      effects: [{ learn: 'fact_osric_sweet_tooth' }],
    },
    {
      id: 't_mags_logbook', label: '"I found the keeper\'s log."', tag: 'quest', keywords: ['log', 'logbook', 'keeper'],
      if: { quest: { id: 'q_dark_lamp', stage: 'decide' }, playerKnows: 'fact_keeper_log' },
      say: [
        '...Signed "M"? Well, it wasn\'t me, petal. I can\'t keep a secret eleven minutes, let alone eleven years.',
        'Oh, everyone is going to want to hear this. Here — for your trouble. And for the story, which I\'m about to tell very badly to absolutely everyone.',
      ],
      effects: [
        { npcLearn: 'fact_keeper_log' },
        { rel: { affection: 10, trust: 6 } },
        { memory: { text: '{player} brought me the keeper\'s log. A real mystery!', tag: 'told_logbook', importance: 8 } },
        { quest: { id: 'q_dark_lamp', complete: 'told_mags' } },
      ],
    },
    {
      id: 't_mags_job', label: '"Got any work going?"', keywords: ['job', 'work', 'money'],
      if: { activity: 'work', not: { quest: { id: 'job_cafe_delivery', state: 'active' } } },
      say: [
        { if: { jobDoneToday: 'job_cafe_delivery' }, text: 'You\'ve done today\'s run, love. Same time tomorrow?' },
        { if: { not: { jobDoneToday: 'job_cafe_delivery' }, time: { from: '16:00', to: '07:00' } }, text: 'Osric shuts up shop at five, so not today. Come in the morning, there\'s always a coffee needs carrying.' },
        {
          if: { not: { jobDoneToday: 'job_cafe_delivery' }, time: { from: '07:00', to: '16:00' } },
          text: 'Funny you should ask. Osric\'s coffee — black, no nonsense — needs to reach the Civic Office. He pays six obols on delivery and grumbles for free.',
          effects: [{ quest: { id: 'job_cafe_delivery', start: true } }, { give: 'item_coffee_order' }, { notify: 'Received: Coffee Order (for Osric)' }],
        },
      ],
    },
    {
      id: 't_mags_osric', label: '"Tell me about Osric."', keywords: ['osric', 'clerk', 'vane'],
      say: [
        'Osric Vane. Clerk of the Civic Office, which is him and a filing cabinet with ambitions.',
        'Lunches here every day at noon, regular as a tide. Honey bun, black coffee, no eye contact. If I\'ve sold out of buns by noon, heaven help the borough.',
      ],
      effects: [{ learn: 'fact_osric_sweet_tooth' }],
    },
    {
      id: 't_mags_tibbs', label: '"Tell me about Tibbs."', keywords: ['tibbs', 'hollow', 'mechanic'],
      say: [
        'Tibbs Hollow, down at the Quay. Fixes boats, breaks toasters, and once built a kettle that could whistle the anthem.',
        'Breakfast here most mornings — well, most late mornings. Heart of gold, brakes of tissue paper.',
      ],
    },
    {
      id: 't_mags_herself', label: '"How long have you run the café?"', keywords: ['cafe', 'yourself', 'history', 'kettle'],
      say: [
        'Twenty-two years this autumn. My mother had it before me, and her father had it when it was a chandlery and the "coffee" was mostly tar.',
        'People think a café sells food. It doesn\'t, petal. It sells somewhere to be. The food\'s just the excuse.',
      ],
      repeat: [['I\'ve told you, duck — twenty-two years, three ovens, one very patient roof.']],
    },
    {
      id: 't_mags_delivery_sorry', label: '"About Osric\'s coffee — I\'m sorry."', keywords: ['sorry', 'apolog'],
      if: { recalls: { tag: 'delivery_failed', withinMinutes: 4320 } }, once: true,
      say: ['Hmph. Go on then.'],
      choices: [
        {
          id: 'c_mags_sincere', label: '"I let you down. It won\'t happen again."', check: { stat: 'charm', base: 0.6, relScale: { affection: 0.004 } },
          say: ['...Oh, come here. Nobody\'s perfect — I once served Osric decaf and he wrote me a letter about it. A *letter*.'],
          effects: [{ rel: { trust: 6, affection: 2 } }],
          fail: { say: ['Mm. We\'ll see, won\'t we.'], effects: [{ rel: { trust: 2 } }] },
        },
        { id: 'c_mags_excuse', label: '"A gull got it."', say: ['A gull. Got the coffee. In a lidded cup.', '...Actually, that tracks. Fine. Forgiven. Mostly.'], effects: [{ rel: { trust: 3 } }] },
      ],
    },
  ],
  askAbout: [
    { keywords: ['gull', 'gulls', 'bird'], variants: [['Never feed them, never trust them, never turn your back on them with a bun in your hand.'], ['Gulls? Tibbs thinks they\'re organised. I think they\'re just hungry. Same thing, really.']] },
    { keywords: ['weather', 'rain', 'sun'], variants: [['Weather? We\'re by the sea, petal. It\'s weather all the time.']] },
    { keywords: ['m.', ' m ', 'signed m'], if: { knows: 'fact_keeper_log' }, say: ['M! I\'ve been through every M in the borough. Mayor Merriwether? Dead before then. Mrs. Mallow? Can\'t write. It\'s a puzzle, duck.'] },
    { keywords: ['obermere', 'city'], say: ['Obermere\'s the big city up the river. All towers and trams. We\'re the bit they forgot to finish, and we like it that way.'] },
  ],
  askPrompt: [['Ask away, petal. I know everything. Well — most things. Well — some.']],
  unknown: [
    ['Ooh, you\'ve stumped me. Write it down and I\'ll find out by Thornday.'],
    ['Never heard of it, duck. And I hear of everything, so that\'s saying something.'],
  ],
  gossipEmpty: [['Quiet week. Suspiciously quiet. Go on — you tell me something!'], ['Nothing new, petal. Bring me something juicy and I\'ll owe you one.']],
  gossipThanks: [['No! Really? Oh, that\'s going straight on the menu.'], ['Ooh. Ooh! I knew it. Well, I didn\'t, but I *felt* it.']],
  gift: {
    loved: [['For me? Oh, you absolute duck. I\'m putting these by the till where everyone can see.']],
    liked: [['Aren\'t you thoughtful! Ta, love.']],
    neutral: [['Oh! Well, that\'s... a thing. Thank you, petal.']],
    disliked: [['A gull feather. In my café. Out. Out it goes. (She is smiling, but only slightly.)']],
    tooMany: [['Petal, you\'ll spoil me. Save some kindness for the rest of the borough.']],
    ownStolen: [['That\'s from my shelf, love. I count everything.']],
  },
  barks: {
    greet: ['Hello, petal!', 'Morning, duck!', 'There you are!', 'Mind the step!'],
    work: ['Buns! Warm buns!', 'Kettle\'s on, always.', 'Who left a spoon in the sugar?', 'Patio permit number five, here we go…'],
    bake: ['Flour, butter, honey, patience.', 'Up before the gulls. Take THAT, gulls.'],
    socialize: ['Lovely afternoon for nosiness.', 'Ooh, who\'s that with Osric?'],
    leisure: ['Feet up. Five minutes. Four.'],
    sleep: ['Mm… more honey… *snore*'],
    chat: ['Did you hear about…', 'No! Really? Go on.', 'Well I never.', 'Don\'t say I told you.'],
    argue: ['Now you listen here—', 'Don\'t you "Mrs. Pell" me!'],
    moods: { irritable: ['Sold out. SOLD OUT.'], cheerful: ['What a day! What a day.'] },
  },
};
