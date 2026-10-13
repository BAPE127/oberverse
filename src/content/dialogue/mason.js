// Dialogue for Mason Nails and the Mason's Os crew. Mason is always friendly:
// no line here lowers his regard for the player below friendly, and he never
// insults anyone. Every topic carries a pun; the Pun of the Day changes daily.

/** The pun bank. Game.dailyPun() picks one per in-game day. Add freely. */
export const PUNS = [
  { setup: 'Why did the scarecrow get promoted?', punchline: 'He was outstanding in his field!' },
  { setup: 'What do you call a builder who loses his tools?', punchline: 'A-wall-ing!' },
  { setup: 'I used to hate facial hair…', punchline: '…but then it grew on me.' },
  { setup: 'Why don\'t skeletons ever build houses?', punchline: 'They don\'t have the guts — or the permits!' },
  { setup: 'I\'m reading a book about anti-gravity.', punchline: 'It\'s impossible to put down!' },
  { setup: 'What did the wall say to the other wall?', punchline: '"Meet you at the corner!"' },
  { setup: 'Why did the brick go to therapy?', punchline: 'It had too many layers of issues. Mortar-fying!' },
  { setup: 'How does a carpenter make friends?', punchline: 'He nails the first impression!' },
  { setup: 'I told my excavator a joke.', punchline: 'It really dug it.' },
  { setup: 'What do you call a sleeping bulldozer?', punchline: 'A dozer!' },
  { setup: 'Why are concrete mixers so wise?', punchline: 'They\'ve seen it all go round!' },
  { setup: 'Did you hear about the fire at the circus?', punchline: 'It was in tents!' },
  { setup: 'I only know twenty-five letters of the alphabet.', punchline: 'I don\'t know y.' },
  { setup: 'What\'s a roof\'s favourite drink?', punchline: 'Anything on the house!' },
  { setup: 'Why did the gull fly over the bay?', punchline: 'Because if it flew over the bagel, it\'d be a bagull!' },
  { setup: 'What did the drill say to the plank?', punchline: '"I\'m boring you, aren\'t I?"' },
];

const gift = (loved, liked, neutral, disliked) => ({
  loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]],
  tooMany: [['That\'s plenty, really — you\'re too kind.']], ownStolen: [['Hey, that one\'s mine!']],
});

export const dlgMason = {
  id: 'dlg_mason',
  greetings: [
    { if: { firstMeeting: true }, say: ['Well hey there, buddy! Mason Nails — of Mason\'s Os. That\'s O plural! Because we never stop at one!', 'New in town? Welcome to Lanternside. If you need anything built, fixed, or groaned at, I\'m your man.'], effects: [{ learn: 'fact_masons_os' }] },
    { if: { activity: 'excavate' }, say: ['*leans out of the cab* Hey, pal! Don\'t mind me, just digging in. Get it? Dig? I\'ll stop. I won\'t stop.'] },
    { if: { activity: 'eat', map: 'cafe' }, say: ['Morning! Mags just charged me double for the pun I paid her with. Worth it.'] },
    { if: { activity: 'business' }, say: ['Hey, buddy! Just filing a permit with Osric. Twelve pages. I\'ve read it so many times I\'m practically a form-er expert.'] },
    { if: { quest: { id: 'job_construction_shift', stage: 'report' } }, say: ['Look at you, all done! Go see Dee and get paid — you\'ve earned it, bricks and mortar!'] },
    { if: { rel: { affection: '>=40' } }, variants: [['There\'s my favourite pal! You\'re the cornerstone of my day.'], ['Hey, it\'s you! Things just got a whole lot more level around here.']] },
    { if: {}, variants: [['Hey, buddy! How\'s it hanging? Plumb, I hope!'], ['Well if it isn\'t my pal! What can I build for you today?'], ['Howdy! Just nailing the day, one board at a time.'], ['Hey hey! You look like someone who appreciates a solid foundation.']] },
  ],
  farewells: [{ if: {}, variants: [['See you later, builder-gator!'], ['Take care, pal — and keep it level!'], ['Bye now! Don\'t be a stranger — be a stranger with a building contract!']] }],
  topics: [
    {
      id: 't_mason_pun', label: '"Got a pun for me?"', keywords: ['pun', 'joke', 'funny'],
      say: [
        { if: { flagToday: 'mason_pun_day' }, text: 'You\'ve had today\'s, pal! Puns are like concrete — they need a day to set. Come back tomorrow!' },
        { if: { not: { flagToday: 'mason_pun_day' } }, text: 'Pun of the Day! Ahem. {pun}' },
        { if: { not: { flagToday: 'mason_pun_day' } }, text: '…{punchline}' },
      ],
      choices: [
        {
          id: 'c_mason_groan', label: 'Groan loudly.', if: { not: { flagToday: 'mason_pun_day' } },
          say: ['THERE it is! The groan! Music to my ears, buddy. A groan is just a laugh that went through the proper channels.'],
          effects: [{ flag: { mason_pun_day: '$day' } }, { rel: { affection: 2 } }, { flag: { mason_puns_heard: true } }],
        },
        {
          id: 'c_mason_laugh', label: 'Laugh. Genuinely.', if: { not: { flagToday: 'mason_pun_day' } },
          say: ['Ha! See, Dee? SOMEBODY gets it! You\'ve got a good sense of humour, pal. Solid. Load-bearing.'],
          effects: [{ flag: { mason_pun_day: '$day' } }, { rel: { affection: 3, trust: 1 } }, { flag: { mason_puns_heard: true } }],
        },
        {
          id: 'c_mason_fire_back', label: 'Fire one back.', if: { not: { flagToday: 'mason_pun_day' } },
          check: { stat: 'wits', base: 0.45 },
          say: ['You say: "I\'d tell you a construction joke, but I\'m still working on it."', '…', 'OH! Oh, that\'s GOOD. Dee! DEE! Write that one down! Buddy, you\'re a natural. A natural-born pun-dit!'],
          effects: [{ flag: { mason_pun_day: '$day' } }, { rel: { affection: 3, respect: 4 } }, { flag: { mason_puns_heard: true } }, { memory: { text: 'The newcomer out-punned me. Respect.', tag: 'out_punned', importance: 5 } }, { npcLearn: 'fact_player_punned_mason' }],
          fail: { say: ['You try something about a hammer and a nail and lose the thread halfway.', 'Ha! Hey, it\'s the thought that counts. And I counted it — that\'s at least a half-pun! Keep at it, pal.'], effects: [{ flag: { mason_pun_day: '$day' } }, { rel: { affection: 1 } }] },
        },
      ],
    },
    {
      id: 't_mason_who', label: '"What\'s Mason\'s Os?"', keywords: ['company', 'masons', 'os', 'construction', 'name'],
      say: ['Mason\'s Os — that\'s O plural! Because we never stop at one!', 'Construction, renovation, repairs, foundations, and free puns with every invoice. Just me and my crew: Dee runs the site, Barnaby\'s our muscle and Quinn draws the plans. We all live right next door at the Plumb Line. Short commute — it\'s a real con-venience. Con-struction. Eh?'],
      effects: [{ learn: 'fact_masons_os' }],
    },
    {
      id: 't_mason_work', label: '"Any work going?"', tag: 'quest', keywords: ['work', 'job', 'shift', 'hire'],
      say: ['Always, pal! Dee handles hiring — she\'s the one at the site gate with the clipboard. Mornings, seven till one. Trench, bricks, mixer, six obols, fair and square. Squarer than fair, even.', 'And do it properly, yeah? Good work makes the crew happy, and a happy crew builds faster and cheaper — for you, when the time comes.'],
    },
    {
      id: 't_mason_contracts', label: '"I\'d like to have something built."', tag: 'quest', keywords: ['build', 'property', 'house', 'home', 'contract', 'plot', 'land'],
      say: [
        'Now you\'re talking my language! Homes, rental flats, a shopfront — you pay, we build, you own it. Simple as brick.',
        { if: { property: { surveyed: false } }, text: 'Only thing is, there\'s no land surveyed for building just yet. Quinn\'s on it. The minute a plot\'s ready, it goes on the contracts board in the office. Here, let me show you the board anyway — it\'s very aspirational.' },
        { if: { property: { surveyed: true } }, text: 'Let\'s take a look at the board, buddy.' },
      ],
      effects: [{ action: 'contracts' }],
    },
    {
      id: 't_mason_permits', label: '"How do building permits work?"', keywords: ['permit', 'form', '22-b', 'osric'],
      say: ['Every build needs a Form 22-B from the Civic Office. Osric\'s the man. Ten obols and a lot of signing. You sign the contract with me, then you pop over to Osric for the permit, and then we break ground. And then we fix the ground. That\'s the job!'],
    },
    {
      id: 't_mason_moneybucks', label: '"Do you work for Sir Moneybucks?"', keywords: ['moneybucks', 'oil', 'ober', 'exclusive'],
      say: ['I work for anybody who pays fair and lets me build it right! Sir Moneybucks wants me building only for him. Even offered a pile of cash.', 'I told him: "Sir, I don\'t take sides — I take measurements!" He didn\'t laugh. Tough crowd. Rich crowd. Tough rich crowd.'],
      effects: [{ learn: 'fact_moneybucks_wants_mason' }],
    },
    {
      id: 't_mason_excavator', label: '"Tell me about the excavator."', keywords: ['excavator', 'digger', 'machine'],
      say: ['Isn\'t she a beauty? I call her Shovel-ina. Mornings I\'m in the cab from ten till noon. Best seat in Lanternside — the view is ground-breaking.'],
    },
    {
      id: 't_mason_crew', label: '"Tell me about your crew."', keywords: ['crew', 'dee', 'barnaby', 'quinn', 'employees', 'apartments'],
      say: ['Best crew on the coast! Dee — foreman, runs a tight ship, laughs at my jokes when she thinks I\'m not looking. Barnaby — strong as an ox, gentle as a lamb, sworn protector of the gulls. Quinn — our surveyor, nervous as a cat on a scaffold but draws the straightest lines you\'ll ever see.', 'We all live at the Plumb Line Apartments, right next to the site. I\'m the landlord. Rent\'s cheap and the puns are free. Some say that\'s why the rent\'s cheap.'],
    },
  ],
  askAbout: [
    { keywords: ['mags', 'cafe', 'kettle'], say: ['Mags! I trade her a pun every morning for a coffee. She says the exchange rate\'s terrible. I think she\'s brewing up trouble.'] },
    { keywords: ['tibbs', 'gull', 'gulls'], say: ['Barnaby and Tibbs have a… gull-related disagreement. Personally, I stay neutral. I\'m Switzerland. With a hard hat.'] },
    { keywords: ['lighthouse', 'lamp'], say: ['The old lighthouse? Solid bit of masonry, that. They don\'t build \'em like that anymore. Mostly because I haven\'t been asked!'] },
  ],
  unknown: [['Hmm, that one\'s over my hard hat, pal.'], ['No idea, buddy — but if you find out, let me know. I\'ll build a pun around it.']],
  gift: gift('A honey bun?! Buddy, you\'re the BEST. This is the yeast you could do!', 'Aw, thanks pal! You\'re a real brick.', 'Hey, thanks! Every little bit helps build the pile!', 'Ha — well, I\'ll find a use for it. Everything\'s building material if you believe!'),
  barks: {
    greet: ['Hey, buddy!', 'Howdy, pal!', 'Looking sharp — like a fresh-cut two-by-four!'],
    work: ['Measure twice, cut once!', 'That\'s plumb! Plumb-tastic!', 'Nailed it!', 'Level with me, Dee — is that level?'],
    excavate: ['Diggin\' it!', '*whistles a little tune*', 'Ground-breaking work!'],
    eat: ['Lunch break — or as I call it, a brick-fast!', 'Mm! Sand-wich. No sand. Good.'],
    business: ['Form 22-B… B for Builder!'],
    leisure: ['Who wants to hear a joke? Anyone? …Barnaby?'],
    sleep: ['…foundations… *snore*… heh… load-bearing…'],
    chat: ['Ha! Good one!', 'You know what this conversation needs? Scaffolding.', 'I\'m all ears. And a hard hat.'],
    argue: ['Hey now, let\'s keep it level!'],
  },
};

export const dlgDee = {
  id: 'dlg_dee',
  greetings: [
    { if: { firstMeeting: true }, say: ['Dolores Rivera — Dee. Site foreman. If you\'re here for a shift, you\'re in luck. If you\'re here to tell me a pun, Mason\'s already got the market cornered.'] },
    { if: { quest: { id: 'job_construction_shift', stage: 'report' } }, say: ['All three done? Let\'s have a look.'] },
    { if: { knows: 'fact_player_rushed_site', notFlag: 'dee_rush_talked' }, say: ['I saw that wall. Rushed work comes down eventually — usually on someone\'s foot. No hard feelings. Just slower hands next time.'], effects: [{ flag: { dee_rush_talked: true } }] },
    { if: {}, variants: [['Morning. Hard hat\'s by the gate.'], ['Yeah? What do you need?'], ['Mind the trench. Seriously.']] },
  ],
  farewells: [{ if: {}, variants: [['See you on site.'], ['Keep your boots laced.']] }],
  topics: [
    {
      id: 't_dee_job', label: '"Any work going?"', tag: 'quest', keywords: ['work', 'job', 'shift', 'hire'],
      if: { not: { quest: { id: 'job_construction_shift', state: 'active' } } },
      say: [
        { if: { jobDoneToday: 'job_construction_shift' }, text: 'You did your shift. Go home, rest your back. Tomorrow, seven.' },
        { if: { not: { jobDoneToday: 'job_construction_shift' }, time: { from: '13:00', to: '07:00' } }, text: 'Hiring\'s seven till one. Come back in the morning.' },
        {
          if: { not: { jobDoneToday: 'job_construction_shift' }, time: { from: '07:00', to: '13:00' } },
          text: 'Day shift: dig the trench, lay a course at the brick stack, and run a batch in the mixer. Then come back to me. Six obols, paid in coin, no scrip, no nonsense. Do it right and the whole crew remembers.',
          effects: [{ quest: { id: 'job_construction_shift', start: true } }, { flag: { site_hired: true } }],
        },
      ],
    },
    {
      id: 't_dee_report', label: '"Shift\'s done."', tag: 'quest', keywords: ['done', 'finished', 'report', 'pay'],
      if: { quest: { id: 'job_construction_shift', stage: 'report' } },
      say: [
        { if: { not: { flagToday: 'site_rushed' } }, text: 'Trench is square, course is level, mix is right. Nice work. That\'s six — and the crew noticed.' },
        { if: { flagToday: 'site_rushed' }, text: 'It\'s done. Some of it\'s… done-ish. Here\'s your six. Next time, slower — the crew notices that too.' },
      ],
      effects: [{ payWages: 'construction' }, { quest: { id: 'job_construction_shift', complete: 'paid' } }, { rel: { respect: 2 } }],
    },
    {
      id: 't_dee_goodwill', label: '"How\'s the crew think of me?"', keywords: ['crew', 'goodwill', 'reputation'],
      say: [
        { if: { site: { goodwill: '<5' } }, text: 'Honestly? You\'re new. Work a few shifts properly and that changes.' },
        { if: { site: { goodwill: '>=5' }, not: { site: { goodwill: '>=15' } } }, text: 'You\'re all right. Barnaby likes you. Quinn\'s stopped hiding when you come in.' },
        { if: { site: { goodwill: '>=15' } }, text: 'You\'re one of us now. When you sign a contract with Mason, we\'ll build it faster and cheaper. That\'s how crews say thank you.' },
      ],
    },
    {
      id: 't_dee_tally', label: '"Do you actually like Mason\'s puns?"', keywords: ['puns', 'tally', 'jokes', 'secret'],
      say: [
        'I tolerate them.',
        { if: { rel: { trust: '<20' } }, text: 'That\'s all you\'re getting.' },
        { if: { rel: { trust: '>=20' } }, text: '…Fine. I keep a tally. In the back of my site book. Every pun that actually got me. Two hundred and twelve. Tell him and I will bury you in a footing.', effects: [{ learn: 'fact_dee_pun_tally' }, { rel: { trust: 3 } }] },
      ],
    },
  ],
  askAbout: [{ keywords: ['wage', 'pay', 'scrip'], say: ['Six obols. Coin, not scrip. Mason won\'t do scrip. Says it\'s "not worth the paper it\'s written on", and then laughs for a minute.'] }],
  unknown: [['Not my department.'], ['Ask Quinn. Quinn knows everything to four decimal places.']],
  gift: gift('…Oh. That\'s nice. Thanks. Really.', 'Thanks.', 'Huh. Thanks.', 'I\'ll put it with the scrap.'),
  barks: { greet: ['Morning.', 'Hard hat.'], work: ['That\'s not level.', 'Check it again.', 'Good. Next.'], eat: ['Ten minutes. Then back to it.'], leisure: ['Off the clock.'], build: ['Footings first!'], sleep: ['…two hundred and thirteen… *snore*'], chat: ['Mm.', 'Fair.', 'Don\'t tell Mason.'], argue: ['Not on my site!'] },
};

export const dlgBarnaby = {
  id: 'dlg_barnaby',
  greetings: [
    { if: { firstMeeting: true }, say: ['Oh — hello. Sorry, didn\'t see you down there. Barnaby. Barnaby Cole. I mix the cement and lay the bricks. And I watch the gulls. Mostly the gulls.'] },
    { if: { activity: 'leisure', map: 'lanternside' }, say: ['Shh — see that one? Herring gull, third winter. I call her Margaret.'] },
    { if: {}, variants: [['Hello again.'], ['Oh, hi. Mind your step.'], ['Afternoon. Lovely day for gulls.']] },
  ],
  farewells: [{ if: {}, variants: [['Bye now.'], ['Take care. Say hello to the gulls.']] }],
  topics: [
    {
      id: 't_barnaby_gulls', label: '"What\'s so special about gulls?"', keywords: ['gull', 'gulls', 'bird', 'birds'],
      say: ['Everyone thinks they\'re pests. They\'re clever! They remember faces. They drop shellfish on rocks to open them. They\'re the best engineers on the coast. Apart from Mason. And Dee. And — well, they\'re very good.', 'Bring me a gull feather sometime, if you find one. I keep a collection.'],
    },
    {
      id: 't_barnaby_tibbs', label: '"You and Tibbs don\'t get along?"', keywords: ['tibbs', 'mechanic', 'feud'],
      say: ['He threw a spanner at Margaret. A SPANNER. He says she stole his sandwich. She did. That is not the point.'],
      effects: [{ learn: 'fact_gull_feud' }],
    },
    {
      id: 't_barnaby_mason', label: '"What\'s Mason like to work for?"', keywords: ['mason', 'boss'],
      say: ['Kindest man I know. Nobody would hire me — too big, they said, I\'d break things. Mason said, "Big guy, big heart, big wall." Then he laughed at "big wall" for quite a while.'],
    },
  ],
  askAbout: [{ keywords: ['cement', 'mix', 'mixer'], say: ['Three sand, one cement, water till it holds a peak. Like making a cake. A very heavy cake.'] }],
  unknown: [['Sorry, I don\'t know.'], ['Hm. You could ask Quinn.']],
  gift: gift('A gull feather! Oh — oh, that\'s a lovely one. Thank you. Thank you.', 'That\'s kind of you.', 'Oh, thank you.', 'Oh… thanks. I\'ll — find a place for it.'),
  barks: { greet: ['Hello.', 'Oh, hi.'], work: ['Three sand, one cement…', '*hums*', 'Steady… steady…'], leisure: ['Hello, Margaret.', 'Look at that wingspan.'], build: ['Lift with the legs!'], sleep: ['…Margaret… *snore*'], chat: ['Mm-hm.', 'That\'s nice.', 'Did you see the gulls today?'], argue: ['Leave the gulls out of it!'] },
};

export const dlgQuinn = {
  id: 'dlg_quinn',
  greetings: [
    { if: { firstMeeting: true }, say: ['Oh! Um. Hi. Quinn Abernathy. Apprentice surveyor. And draftsperson. Apprentice draftsperson. I draw the plans. Sorry. Hi.'] },
    { if: { rel: { trust: '>=20' } }, variants: [['Oh, it\'s you! Hi! I mean — hello. Good to see you.']] },
    { if: {}, variants: [['Oh — hi.'], ['Sorry — I was measuring. Hi.'], ['Um. Hello.']] },
  ],
  farewells: [{ if: {}, variants: [['Bye! Sorry. Bye.'], ['See you. Mind the stakes.']] }],
  topics: [
    {
      id: 't_quinn_plots', label: '"Are there any building plots yet?"', tag: 'quest', keywords: ['plot', 'plots', 'land', 'lots', 'survey'],
      say: [
        { if: { property: { surveyed: false } }, text: 'Not yet. I\'m surveying the lots south of the canal — every stake to four decimal places — but nothing\'s cleared for building. When it is, it goes on the board in the office. You\'ll be the first to know. Well — second. After me.' },
        { if: { property: { surveyed: true } }, text: 'Yes! They\'re on the board in the office. I drew every one. Please look at them. Please like them.' },
      ],
    },
    {
      id: 't_quinn_plans', label: '"What kind of buildings do you design?"', keywords: ['plans', 'blueprints', 'design', 'house'],
      say: ['Three so far: a cottage — that\'s a home for you, with a bed and a chest that locks; a pair of rental flats, tenants pay every evening; and a shopfront for a business. Mason named them. He wanted to call the cottage "the Hut Dog". Dee said no.'],
    },
    {
      id: 't_quinn_nerves', label: '"You seem nervous."', keywords: ['nervous', 'anxious', 'confidence'],
      if: { notFlag: 'quinn_encouraged' },
      say: ['I— is it obvious? Mr. Vane sent back my last permit drawing. For a smudge. A smudge!'],
      choices: [
        {
          id: 'c_quinn_encourage', label: '"Your plans are the best in town. Mason says so."',
          check: { stat: 'charm', base: 0.55 },
          say: ['…He does say that. He says "drawn to perfection" and then he waits. But he does say it.', 'Thank you. Really.'],
          effects: [{ rel: { trust: 8, affection: 5 } }, { flag: { quinn_encouraged: true } }, { site: { goodwill: 1 } }],
          fail: { say: ['You\'re just being nice. Which is — nice. Thank you.'], effects: [{ rel: { affection: 2 } }] },
        },
      ],
    },
  ],
  askAbout: [{ keywords: ['osric', 'vane', 'permit'], say: ['Mr. Vane is the most thorough person I\'ve ever met. I want to be him when I grow up. Except less… Mr. Vane.'] }],
  unknown: [['I— I\'d have to check.'], ['I don\'t know that one. I\'ll look it up. Twice.']],
  gift: gift('Coffee! You — thank you, I was running on fumes and graphite.', 'Oh! Thanks.', 'Oh — thank you.', 'Oh… um. Thank you?'),
  barks: { greet: ['Oh! Hi.', 'Sorry — hi.'], work: ['Point-three-seven-five…', 'Measure twice…', 'Is that a smudge? That\'s a smudge.'], leisure: ['*sketches quietly*'], build: ['Check the string line!'], sleep: ['…four decimal places… *snore*'], chat: ['Um.', 'Interesting!', 'Sorry — go on.'], argue: ['P-please don\'t shout.'] },
};

export default [dlgMason, dlgDee, dlgBarnaby, dlgQuinn];
