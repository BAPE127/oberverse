// Dialogue for Tibbs Hollow. Voice: short bursts, exclamations, invented
// words, changes subject mid-sentence, cheerfully overshares.
export default {
  id: 'dlg_tibbs',
  greetings: [
    {
      if: { firstMeeting: true },
      say: [
        'Oh! Hi! Hello! You\'re new! I\'m Tibbs!',
        'That\'s Duchess — don\'t touch Duchess — she bites. Engines can bite. Did you know engines can bite? They can if you build them right.',
      ],
    },
    { if: { mood: 'grumpy', knows: 'fact_osric_citation' }, say: ['Another citation. ANOTHER. Form 7-B! Who even HAS a form 7-B?! Osric, that\'s who.'] },
    { if: { mood: 'grumpy' }, say: ['Nngh. No coffee this morning. Mags ran out. Brain\'s running on fumes. Actual fumes, I was welding.'] },
    { if: { mood: 'sheepish' }, variants: [['That bang? Wasn\'t me. Was Duchess. Mostly Duchess.'], ['If anyone asks, that smoke is *intentional*.']] },
    { if: { quest: { id: 'q_lucky_spanner', state: 'completed', outcome: 'returned' }, rel: { affection: '>=20' } }, variants: [['My spanner-finding hero! What\'s up? What\'s new? What\'s that? Is that a cog?'], ['{player}! Perfect timing, I need someone to hold this. Don\'t ask what it is.']] },
    { if: { activity: 'fish' }, variants: [['Shh! Fish can hear you. Well — they can feel you. Vibrations. I read it. Hi!'], ['Haven\'t caught anything. Don\'t want to, really. It\'s thinking time.']] },
    { if: { activity: 'tinker' }, variants: [['Can\'t stop, mid-idea! Okay I can stop. What\'s up?']] },
    {
      if: {},
      variants: [
        ['Hey hey! What\'s broken? Something\'s always broken.'],
        ['Oh, hi! You smell like the café. Jealous.'],
        ['{player}! Hi! I invented a word today. "Splonk." It\'s the noise Duchess makes before she explodes.'],
      ],
    },
  ],
  farewells: [
    { if: {}, variants: [['Bye! Watch out for gulls!'], ['Later! If you hear a bang, it\'s fine. Probably.'], ['See ya! Bring junk!']] },
  ],
  topics: [
    {
      id: 't_tibbs_shop', label: '"What\'ve you got for sale?"', keywords: ['buy', 'sell', 'shop', 'crowbar', 'tools'],
      if: { map: 'workshop' },
      variants: [['Tools! Bolts! A crowbar with a story! Also I buy junk. Bring me junk. I love junk.']],
      effects: [{ openShop: 'shop_hollow' }],
    },
    {
      id: 't_tibbs_shop_away', label: '"Can I buy something?"', keywords: ['buy', 'shop'],
      if: { not: { map: 'workshop' } },
      say: ['Not here — everything good is back at the workshop. Pop by Hollow Fixings, on the Quay!'],
    },
    {
      id: 't_tibbs_spanner', label: '"You look worried."', keywords: ['spanner', 'worried', 'lost'],
      if: { quest: { id: 'q_lucky_spanner', state: 'not_started' } },
      say: [
        'My lucky spanner! Gone! I was chasing a gull — it had my SANDWICH — and I tripped up in the park, over by the pines on the east side, and now: no spanner.',
        'Without it Duchess won\'t start. Probably. Spiritually. Could you look? I\'d go, but the gull might still be there and we have history.',
      ],
      effects: [{ learn: 'fact_tibbs_lost_spanner' }, { quest: { id: 'q_lucky_spanner', start: true } }],
    },
    {
      id: 't_tibbs_spanner_return', label: '"Is this your spanner?"', tag: 'quest', keywords: ['spanner', 'found'],
      if: { hasItem: 'item_lucky_spanner', quest: { id: 'q_lucky_spanner', state: 'active' } },
      say: ['THAT\'S MY SPANNER! Where— no, doesn\'t matter! You found it!'],
      choices: [
        {
          id: 'c_give_spanner', label: '"Here you go."',
          say: [
            'I could kiss you. I won\'t. I\'ve been welding. Here — take my spare crowbar. No, I insist. Spare crowbars are a sign of a well-lived life.',
            'And — psst — since we\'re mates now? The lighthouse has a maintenance hatch on the east side. Rusted shut. Crowbar job. LOUD crowbar job. You didn\'t hear it from me. You heard it from a gull.',
          ],
          effects: [
            { take: 'item_lucky_spanner' }, { give: 'item_crowbar' }, { learn: 'fact_hatch_exists' },
            { rel: { trust: 14, affection: 12 } }, { npcLearn: 'fact_player_helped_tibbs' },
            { memory: { text: '{player} found my lucky spanner!', tag: 'spanner_returned', importance: 7 } },
            { quest: { id: 'q_lucky_spanner', complete: 'returned' } },
          ],
        },
        {
          id: 'c_sell_spanner', label: '"What\'s it worth to you?"',
          say: [
            'Oh. Oh, a negotiator. Okay. Okay! Eight obols. It\'s all I\'ve got. Duchess is expensive.',
            '...And the hatch thing. East side of the lighthouse, rusted shut. Just — you know. Seemed like you\'d want to know things.',
          ],
          effects: [
            { take: 'item_lucky_spanner' }, { money: 8 }, { learn: 'fact_hatch_exists' },
            { rel: { trust: 4, affection: -2, respect: 3 } }, { npcLearn: 'fact_player_helped_tibbs' },
            { memory: { text: '{player} found my spanner. Charged me for it, though.', tag: 'spanner_returned', importance: 6 } },
            { quest: { id: 'q_lucky_spanner', complete: 'returned' } },
          ],
        },
      ],
    },
    {
      id: 't_tibbs_lighthouse', label: '"Know anything about the lighthouse?"', keywords: ['lighthouse', 'hatch', 'point', 'tower'],
      say: [
        'The tower? Love it. Gorgeous clockwork in there. Haven\'t been inside. Officially.',
        { if: { any: [{ rel: { trust: '>=12' } }, { rel: { affection: '>=20' } }] }, text: 'Unofficially? Maintenance hatch, east side, rusted shut. Crowbar job. LOUD crowbar job. Osric walks the Point around five, so, y\'know. Don\'t.', effects: [{ learn: 'fact_hatch_exists' }] },
        { if: { not: { any: [{ rel: { trust: '>=12' } }, { rel: { affection: '>=20' } }] } }, text: 'Ask me again when we\'re mates. I\'ve got, like, two secrets and I\'m rationing them.' },
      ],
    },
    {
      id: 't_tibbs_duchess', label: '"What is Duchess?"', keywords: ['duchess', 'engine', 'boat'],
      say: [
        'Best boat engine on the Quay! Or will be. She\'s got the heart of a lion and the carburettor of a much smaller lion.',
        'Once she runs, I\'m going to sail round the whole coast. Or to the end of the pier. Baby steps.',
      ],
      repeat: [['Duchess is fine! She\'s FINE. Don\'t look at her, she\'s shy.']],
    },
    {
      id: 't_tibbs_gulls', label: '"What\'s the deal with the gulls?"', keywords: ['gull', 'gulls', 'bird'],
      say: [
        'Okay. Okay okay okay. Listen. They have a LEADER. Big one, one leg, looks at you like you owe it money.',
        'They took my sandwich, my spanner — indirectly — and three of Mags\'s buns last week. Organised. Crime.',
      ],
      effects: [{ learn: 'fact_gulls_organised' }],
    },
    {
      id: 't_tibbs_lens', label: '"What do you make of this glass?"', tag: 'mystery', keywords: ['glass', 'shard', 'lens'],
      if: { hasItem: 'item_lens_shard' },
      say: [
        '...Hold on. Hold ON. That\'s lens glass. Lighthouse lens glass. Fresnel ridges, see? And it\'s humming. Glass doesn\'t hum!',
        'Where did— no, don\'t tell me. Actually, do. No. Don\'t. ...Okay, keep it safe. Something about that is very, very interesting.',
      ],
      effects: [{ learn: 'fact_lens_missing' }, { rel: { affection: 2 } }],
    },
    {
      id: 't_tibbs_osric', label: '"You and Osric don\'t get along?"', keywords: ['osric', 'citation', 'clerk'],
      say: [
        { if: { knows: 'fact_osric_citation' }, text: 'He gave me a CITATION. For "excessive bang". Is there a correct amount of bang? There is not.' },
        'He\'s alright, really. He just thinks the world should be quiet and in order. The world\'s loud! That\'s the best bit!',
      ],
    },
  ],
  askAbout: [
    { keywords: ['mags', 'cafe'], say: ['Mags! Best human. Feeds me. Doesn\'t ask what the smell is.'] },
    { keywords: ['junk', 'scrap', 'cog'], say: ['Junk is just future stuff that hasn\'t happened yet. Bring me cogs. I pay in obols and gratitude. Mostly gratitude.'] },
    { keywords: ['m.', ' m ', 'signed m'], if: { knows: 'fact_keeper_log' }, say: ['"M"? Mysterious! Maybe it\'s a gull. I\'m not saying it\'s a gull. I\'m saying nobody\'s ruled it out.'] },
    { keywords: ['fish', 'fishing'], say: ['I don\'t catch fish. I *visit* them.'] },
  ],
  askPrompt: [['Ask me anything! Except about the toaster.']],
  unknown: [
    ['No idea! Sounds fun though. Is it mechanical?'],
    ['Never heard of it. Should I invent it? I could invent it.'],
  ],
  gift: {
    loved: [['A COG! Brass! You absolute legend! Duchess, look! Somebody loves us!']],
    liked: [['Ooh, for me? Ta! I\'ll find a use for it. Or several. Or one dangerous one.']],
    neutral: [['Oh — thanks! I\'ll put it on the pile. The pile is sacred.']],
    disliked: [['Uh. Thanks? I\'ll… use it as a doorstop. Everything\'s a doorstop if you believe.']],
    tooMany: [['You\'re too good to me! Stop! Don\'t stop. Okay maybe stop.']],
    ownStolen: [['Hey… this is from my crate. I count my cogs! I have exactly seven— six. SIX cogs.']],
  },
  barks: {
    greet: ['Hiya!', 'Oh, hi!', 'Hey hey!'],
    work: ['Where\'s my 10mm…', 'Hold still, you beautiful disaster.', 'Splonk!'],
    tinker: ['What if… MORE springs?', 'Duchess, be brave.', 'Stand back! Further! Bit further!'],
    wander: ['Gull. Gull. Suspicious gull.', 'Nice day for a breakdown.'],
    fish: ['Hello, fish.', 'Thinking time…'],
    eat: ['Coffee! Coffee coffee.', 'Mm, toast.'],
    sleep: ['…more… springs… *snore*'],
    chat: ['Okay so get this—', 'No way!', 'Ha! Classic.', 'Wanna see a thing?'],
    argue: ['That\'s not fair!', 'Noise is MUSIC!'],
    moods: { grumpy: ['Form 7-B…', 'Hmph.'], cheerful: ['Great day for engines!'] },
  },
};
