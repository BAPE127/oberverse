// Dialogue for the Sums of Anarchy and their customers. Arthur Anderson is
// always angry (owner's brief), maths-obsessed, fiercely protective of the
// Sumps and his crew, petty and vengeful: he keeps a grudge ledger.
// Gang effects: { gang: { sample | deliver | tribute | split } } (src/systems/gang.js).

const gift = (loved, liked, neutral, disliked) => ({
  loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]],
  tooMany: [['ENOUGH. Gifts are a liability on the balance sheet.']], ownStolen: [['That\'s OURS.']],
});

export const dlgArthur = {
  id: 'dlg_arthur',
  greetings: [
    { if: { firstMeeting: true }, say: ['*doesn\'t look up from the ledger* WHAT. Who let you in? DEE! — Fine. Arthur Anderson. Sums of Anarchy. This is my bar, my Sumps, my numbers.', 'You\'ve got thirty seconds. That\'s half a minute. That\'s one forty-eighth of an hour I will never get back.'], effects: [{ learn: 'fact_sums_of_anarchy' }] },
    { if: { gang: { tier: '>=3' } }, say: ['YOU. You\'ve got a nerve walking in here. I\'ve done the maths on you, and the answer is a very small number. Talk fast.'] },
    { if: { gang: { tier: '>=2' } }, say: ['*slams the ledger* You are in RED INK. Do you know what red ink means? It means I underline you. Twice.'] },
    { if: { gang: { tier: '>=1' } }, say: ['You. Al told you. Stay off my corners. Every customer you take is a number I have to cross out, and I HATE crossing out.'] },
    { if: { gang: { truce: true } }, say: ['*grunts* Truce holds. For now. I\'m counting the days. I\'m counting EVERYTHING.'] },
    { if: { activity: 'sleep' }, say: ['*snores furiously* …carry the one… CARRY THE ONE…'] },
    { if: {}, variants: [['WHAT.'], ['Make it quick. Time is margin.'], ['*glares* Speak.'], ['Is this about money? It had better be about money.']] },
  ],
  farewells: [{ if: {}, variants: [['Door\'s there. USE it.'], ['Go. And don\'t touch anything on the way out.'], ['*already back in the ledger* Mm.']] }],
  topics: [
    {
      id: 't_arthur_who', label: '"What are the Sums of Anarchy?"', keywords: ['sums', 'anarchy', 'gang', 'who', 'crew'],
      say: [
        'We\'re the only thing in the Sumps that adds up. The city forgot this place. The cops won\'t come in. Moneybucks wants to bulldoze it. So we run it. We keep the fires lit, the soup coming, and the calculators flowing.',
        'Al, Percy, Minnie, Dee, Tony, Max. Six. Seven with me. Prime number. On purpose. Touch any of them and I will find out, I will write it down, and I will come for you.',
      ],
      effects: [{ learn: 'fact_sums_of_anarchy' }],
    },
    {
      id: 't_arthur_calc', label: '"Why calculators?"', keywords: ['calculators', 'calculator', 'why', 'product'],
      say: ['Because people down here need an edge, and a four-function calculator is the purest edge there is. Plus, minus, times, divide. Nothing fancy. Nothing wasted. Charm, wits, grit, a steady hand. A bit of health. A kick of energy.', 'Six products. Minnie sells them at the counter. Exact change. I do not do change.'],
    },
    {
      id: 't_arthur_buy', label: '"I want to buy some."', tag: 'quest', keywords: ['buy', 'purchase', 'shop'],
      say: [
        { if: { gang: { tier: '<2' } }, text: 'Talk to Minnie. At the counter. I don\'t touch stock. I touch NUMBERS.' },
        { if: { gang: { tier: '>=2' } }, text: 'Buy? From US? After what you did? NO. Zero. Nought. Nil. Get out of my sight before I find a larger number to be angry with.' },
      ],
    },
    {
      id: 't_arthur_cops', label: '"What about the police?"', keywords: ['police', 'cops', 'lawrence', 'order'],
      say: ['Lawrence Order is a rounding error in a hat. His officers come through here and look at us like we\'re a smell.', 'The Sumps doesn\'t talk to cops. Nobody down here will ever call them on you. That\'s not a favour. That\'s a principle. Mind you — if they see you dealing with their own eyes, that\'s your problem.'],
    },
    {
      id: 't_arthur_sumps', label: '"You care about this place."', keywords: ['sumps', 'slum', 'home', 'care'],
      say: ['*very quietly, which is somehow worse* I grew up three shacks from here. My mum did the books for the Mission for thirty years. By hand. Every penny.', '*loud again* So yes. I CARE. And anyone who comes into MY Sumps and takes from MY people goes in the ledger.'],
    },
    {
      id: 't_arthur_ledger', label: '"What\'s in the ledger?"', keywords: ['ledger', 'grudge', 'book', 'list'],
      say: [
        'Grudges. Alphabetical. Cross-referenced. Interest compounding daily.',
        { if: { gang: { anger: '<1' } }, text: 'You\'re not in it. Yet. I\'ve left a space. I always leave a space.' },
        { if: { gang: { anger: '>=1' }, not: { gang: { anger: '>=50' } } }, text: 'You\'re in it. Page forty. Small writing. For now.' },
        { if: { gang: { anger: '>=50' } }, text: 'You have your OWN PAGE. In RED.' },
      ],
    },
    {
      id: 't_arthur_truce', label: '"Can we sort this out?"', tag: 'quest', keywords: ['truce', 'deal', 'peace', 'sort', 'tribute'],
      if: { gang: { anger: '>=25' } },
      say: ['*leans back. Breathes. Fails to calm down.* Sort it out. Right. Two options. Do the maths.', 'One: tribute. {tribute} obols, now, and I take you down a page. Two: you hand back half the customers you took. Half. Rounded UP. And we call it a truce for a week.'],
      choices: [
        { id: 'c_arthur_tribute', label: 'Pay the tribute ({tribute} obols).', if: { gang: { canAffordTribute: true } }, say: ['*counts it. Counts it again. Counts it a third time.* …Fine. You\'re down a page. Don\'t make me turn it back.'], effects: [{ gang: { tribute: true } }, { rel: { respect: 3 } }] },
        { id: 'c_arthur_tribute_cant', label: '"I can\'t afford that."', if: { gang: { canAffordTribute: false } }, say: ['THEN STOP TAKING MY CUSTOMERS. That\'s free.'] },
        { id: 'c_arthur_split', label: 'Hand back half your customers for a week\'s truce.', if: { gang: { customers: '>=1' } }, say: ['*writes something down with great satisfaction* Half. Rounded up. A week. If you so much as look at one of mine before then, it\'s WAR.'], effects: [{ gang: { split: true } }, { rel: { trust: 4 } }] },
        { id: 'c_arthur_truce_no', label: '"I\'ll take my chances."', say: ['*underlines something* Noted.'], effects: [{ rel: { affection: -3 } }] },
      ],
    },
  ],
  askAbout: [
    { keywords: ['moneybucks', 'regeneration', 'bulldoze'], say: ['Moneybucks wants to "regenerate" the Sumps. That means bulldozers. That means no Sumps. Over my dead — over HIS — over SOMEBODY\'s dead body.'] },
    { keywords: ['maths', 'math', 'numbers'], say: ['Numbers don\'t lie. People lie. Numbers just sit there being RIGHT, which is more than I can say for anyone in this city.'] },
  ],
  unknown: [['I don\'t know and I\'m ANGRY that I don\'t know.'], ['Ask Percy. Percy knows things. Percy charges for things.']],
  gift: gift('*stares at it* …That\'s… thoughtful. I HATE that it\'s thoughtful.', 'Hm. Fine. It goes on the asset side.', 'What is this. Why is this.', 'This is a LIABILITY.'),
  barks: {
    greet: ['WHAT.', 'Speak.', '*glares*'],
    work: ['WHO ROUNDED THIS?!', 'Carry the one… CARRY THE ONE!', 'Fourteen percent. FOURTEEN.', 'That\'s not a margin, that\'s an INSULT.'],
    patrol: ['My Sumps.', 'Anyone giving you trouble? Tell me. I\'ll do the maths.', '*kicks a can furiously*'],
    eat: ['*eats aggressively*', 'This sandwich is 40% crust. FORTY.'],
    leisure: ['*glares at the jukebox*', 'Who put on "99 Problems"? It\'s TOO ACCURATE.'],
    sleep: ['…carry the one… *snore*…'],
    chat: ['WRONG.', 'Do the maths!', 'Hmph.'],
    argue: ['DON\'T. TEST. ME.'],
  },
};

const crewGift = (loved) => gift(loved, 'Cheers.', 'Right.', 'What\'s this rubbish?');
const crewDlg = (id, o) => ({
  id,
  farewells: [{ if: {}, variants: o.bye }],
  askAbout: o.askAbout || [],
  unknown: [['Ask Arthur.'], ['Dunno.']],
  gift: crewGift(o.loved),
  greetings: [
    { if: { gang: { tier: '>=2' } }, say: o.hostile },
    ...o.greetings,
  ],
  topics: [
    { id: `t_${id}_arthur`, label: '"What\'s Arthur like?"', keywords: ['arthur', 'boss', 'leader'], say: o.arthur },
    ...(o.topics || []),
  ],
  barks: o.barks,
});

export const dlgAl = crewDlg('dlg_al', {
  hostile: ['You were told. Now we settle it.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Al. Al Gebra. I solve for X.', '*cracks knuckles* X is usually someone who took something that wasn\'t theirs.'] },
    { if: { gang: { tier: '>=1' } }, say: ['You got the message. Good. Don\'t make me deliver a second one.'] },
    { if: {}, variants: [['Mm.'], ['Keep walking.'], ['Arthur\'s inside. If you\'re smart, you aren\'t.']] },
  ],
  bye: [['Mm.'], ['Go.']],
  arthur: ['Shouts. Always right. Those are related. He took me in when I was twelve. I don\'t let anyone near him.'],
  loved: 'A cigar. …Respect.',
  topics: [{ id: 't_al_rules', label: '"What are the rules round here?"', keywords: ['rules', 'turf', 'corners'], say: ['Three. Don\'t bring cops. Don\'t touch the crew. Don\'t sell on our corners.', 'Break the third one and I come and find you. Break it enough and we ALL come and find you.'] }],
  barks: { greet: ['Mm.', 'Keep walking.'], patrol: ['*watches the street*', 'All quiet.', '*cracks knuckles*'], eat: ['*eats in silence*'], leisure: ['*pots the eight ball without looking*'], sleep: ['…zzz…'], chat: ['Mm.', 'Right.'], argue: ['Careful.'] },
});

export const dlgPercy = crewDlg('dlg_percy', {
  hostile: ['I— I\'m not involved in the, ah, enforcement side. Please talk to Al. No — please DON\'T talk to Al.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Percy Ntage. Bookkeeper. I take a small percentage of everything. A modest percentage. A… reasonable percentage.'] },
    { if: {}, variants: [['Yes? I\'m reconciling.'], ['Mind the ledgers.'], ['Is this billable?']] },
  ],
  bye: [['Good day.'], ['Mind the ledgers on the way out.']],
  arthur: ['An excellent manager. Volatile, but excellent. Margins are up fourteen percent year on year. He wanted fifteen. He was very loud about the one percent.'],
  loved: 'Coffee! Fuel for reconciliation. Thank you.',
  topics: [{ id: 't_percy_numbers', label: '"How\'s business?"', keywords: ['business', 'money', 'takings', 'numbers'], say: [
    'Steady. Twelve regulars across the Sumps, mostly. Overclocks for the night shifts, Bricks for the boxers, Rose-Gold Sums for the buskers.',
    { if: { gang: { customers: '>=1' } }, text: 'Well. Fewer regulars than there were. Someone has been… diverting. Arthur has a page about it.' },
  ] }],
  barks: { greet: ['Yes?', 'Ahem.'], work: ['*scribbles*', 'Point-oh-four… point-oh-four…', 'That doesn\'t balance.'], patrol: ['Collection time.', '*counts coins*'], eat: ['*eats over the ledger*'], sleep: ['…debits… credits… *snore*'], chat: ['Indeed.', 'Hm.'], argue: ['That\'s not in the budget!'] },
});

export const dlgMinnie = crewDlg('dlg_minnie', {
  hostile: ['Out. We don\'t sell to rats. Arthur\'s orders.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Minnie. Minnie Mus. I run the counter. You want calculators, you come to me. You want trouble, you go to Dee.'] },
    { if: {}, variants: [['What\'ll it be?'], ['Counter\'s open.'], ['Exact change, love.']] },
  ],
  bye: [['Come back soon.'], ['Don\'t spend it all at once.']],
  arthur: ['Arthur took me in when nobody else would. He shouted the whole time. Still counts.'],
  loved: 'A honey bun! You\'re all right, you are.',
  topics: [
    {
      id: 't_minnie_buy', label: '"I\'d like some calculators."', tag: 'quest', keywords: ['buy', 'calculators', 'shop', 'counter'],
      if: { gang: { tier: '<2' } },
      say: ['Here\'s what we\'ve got. Arthur sets the prices. Don\'t haggle — he\'ll hear about it.'],
      effects: [{ openShop: 'shop_sums' }],
    },
    {
      id: 't_minnie_how', label: '"How do these work?"', keywords: ['how', 'work', 'effects', 'use'],
      say: ['Press a few buttons. Feel it kick in. Rose-Gold Sum for Charm, Big Brain 9000 for Wits, The Brick for Grit, Featherkey for Finesse. Each one, a few hours. Then you come down for a bit.', 'Plus Pack patches you up. Overclock wakes you up — then drops you later. And don\'t go mad. Use too many of one kind and they stop working till you lay off a day or two.'],
    },
  ],
  barks: { greet: ['What\'ll it be?', 'Counter\'s open.'], work: ['Next!', '*wipes the counter*', 'Exact change!'], eat: ['Break. Five minutes.'], sleep: ['…zzz…'], chat: ['Ha!', 'Yeah?'], argue: ['Oi!'] },
});

export const dlgDeeNom = crewDlg('dlg_dee_nom', {
  hostile: ['*cracks neck* Bottom line.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Dee. Dee Nominator. I\'m the bottom line.'] },
    { if: {}, variants: [['Mm.'], ['In or out.'], ['*stares*']] },
  ],
  bye: [['Mm.']],
  arthur: ['Boss is fair. Boss is loud. Both true.'],
  loved: 'Scone. Good.',
  barks: { greet: ['Mm.', 'In or out.'], work: ['*crosses arms*', 'No cops.', 'Members only. You\'re a member? No.'], eat: ['*chews*'], sleep: ['…zzz…'], chat: ['Mm.'], argue: ['Bottom line.'] },
});

export const dlgTony = crewDlg('dlg_tony', {
  hostile: ['It\'s — oh no, it\'s you, Arthur said — I\'m supposed to — HEY GUYS!'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Tony! Tony Tangent. I watch for cops. And pigeons. Mostly cops. Did you know pigeons can — anyway. Cops.'] },
    { if: {}, variants: [['Oh hey! I was just — what was I —'], ['Seen any cops? Seen any pigeons? Either.'], ['Hi! So, right, so —']] },
  ],
  bye: [['See ya! Watch for — you know.'], ['Bye! Wait, did I —']],
  arthur: ['Arthur\'s like a dad. A dad who\'s — you know when a kettle — yeah. That.'],
  loved: 'A honey bun! You know honey never goes off? There\'s honey in — anyway thanks!',
  topics: [{ id: 't_tony_cops', label: '"Any cops about?"', keywords: ['cops', 'police', 'watch'], say: ['Sergeant Case comes round the Plaza side mornings. Tee does the Sumps — Tee\'s the one to watch, Tee writes EVERYTHING down. If you\'re selling, do it where Tee isn\'t. Or — where was I — oh! Pigeon.'] }],
  barks: { greet: ['Oh hey!', 'Hi! So —'], patrol: ['Clear! I think!', 'Is that a — no, pigeon.', 'COP! …no, postman.'], eat: ['*eats while talking*'], leisure: ['*misses an easy shot*'], sleep: ['…pigeons… *snore*'], chat: ['Right, right, so —', 'Ha!'], argue: ['Hey! HEY!'] },
});

export const dlgMax = crewDlg('dlg_max', {
  hostile: ['FINALLY. MAXIMUM VIOLENCE.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['MAX. Max Imum. I go all the way. Every time. Ask anyone. Ask the fire barrel. I set it on fire.'] },
    { if: {}, variants: [['WHAT\'S UP.'], ['Looking for trouble? I\'m right here!'], ['Turn it UP.']] },
  ],
  bye: [['LATER.'], ['Don\'t be BORING.']],
  arthur: ['Arthur\'s the angriest man alive. RESPECT. He says I "overflow". I don\'t know what that means but I\'m PROUD.'],
  loved: 'A CIGAR. YES.',
  barks: { greet: ['WHAT\'S UP.', 'Oi!'], patrol: ['WHO WANTS IT?', '*kicks the fire barrel*', 'MAXIMUM!'], eat: ['*eats loudly*'], leisure: ['ANOTHER ROUND!', '*stokes the fire too much*'], sleep: ['…MAXIMUM… *snore*'], chat: ['HA!', 'YEAH!'], argue: ['COME ON THEN!'] },
});

// ----------------------------------------------------------------- customers
export const dlgCustomer = {
  id: 'dlg_customer',
  greetings: [
    { if: { gang: { customer: 'locked' } }, say: ['*eyes you up and down* Don\'t know you. Don\'t talk to people I don\'t know. Not round here.'] },
    { if: { gang: { order: 'due' } }, say: ['There you are. Got my {orderQty}× {orderName}?'] },
    { if: { gang: { order: 'pending' } }, say: ['Not yet — I said when and where. Don\'t make it obvious.'] },
    { if: { gang: { customer: 'player' } }, variants: [['Hey. You holding?'], ['Good to see you. Quietly.'], ['Not here. Well — fine, here.']] },
    { if: { firstMeeting: true }, say: ['Yeah? What? I\'m {name}. If you\'re selling something, Minnie\'s got the Sumps sewn up.'] },
    { if: {}, variants: [['What?'], ['Yeah?'], ['Spare change?']] },
  ],
  farewells: [{ if: {}, variants: [['Later.'], ['Keep your head down.'], ['See you around.']] }],
  topics: [
    {
      id: 't_cust_sample', label: '"Try this — on the house."', tag: 'quest', keywords: ['sample', 'free', 'try', 'calculator'],
      if: { gang: { customer: 'gang', hasCalc: true } },
      say: ['*glances around* …Go on then. What is it? I usually go for {favourite}.'],
      effects: [{ gang: { sample: true } }, { endDialogue: true }],
    },
    {
      id: 't_cust_deliver', label: '"Here\'s your order." ({orderQty}× {orderName}, {orderTotal} obols)', tag: 'quest', keywords: ['order', 'deliver', 'here'],
      if: { gang: { order: 'due' } },
      say: ['*quick look around* Nice doing business.'],
      effects: [{ gang: { deliver: true } }, { endDialogue: true }],
    },
    {
      id: 't_cust_fav', label: '"What do you usually take?"', keywords: ['favourite', 'usually', 'take', 'like'],
      if: { not: { gang: { customer: 'locked' } } },
      say: ['{favourite}. Every time. Get me one of those and we\'ll talk.'],
    },
    {
      id: 't_cust_minnie', label: '"Who do you buy from?"', keywords: ['buy', 'minnie', 'gang', 'sums'],
      if: { gang: { customer: 'gang' } },
      say: ['Minnie, at the Abacus. Everyone does. The Sums of Anarchy look after the Sumps — and they don\'t like people selling on their corners. Just so you know.'],
    },
  ],
  askAbout: [{ keywords: ['arthur', 'anderson'], say: ['Arthur? Angriest man in Halvermouth. Also the only one who fixed the Mission roof. Both true.'] }],
  unknown: [['Dunno.'], ['Couldn\'t say.']],
  gift: { loved: [['For me? …Thanks. Really.']], liked: [['Ta.']], neutral: [['Right. Thanks.']], disliked: [['What\'s this for?']], tooMany: [['That\'s plenty.']], ownStolen: [['Hey, that\'s mine!']] },
  barks: {
    greet: ['Yeah?', 'Alright.'],
    leisure: ['*warms their hands*', '*hums*', 'Cold one.'],
    wait: ['*checks the time*', 'Where are they…', '*looks around nervously*'],
    eat: ['*slurps soup*'],
    sleep: ['…zzz…'],
    chat: ['Yeah.', 'Mm.', 'True.'],
    argue: ['Back off!'],
  },
};

export default [dlgArthur, dlgAl, dlgPercy, dlgMinnie, dlgDeeNom, dlgTony, dlgMax, dlgCustomer];
