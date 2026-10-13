// Dialogue for Halvermouth Precinct 1. Chief Lawrence Order is careless, not
// cruel: he would rather you paid than made him fill in a form. Bribes and fines
// run through the 'police' effect (src/systems/police.js).

const gift = (loved, liked, neutral, disliked) => ({
  loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]],
  tooMany: [['Easy. People will think I\'m being bribed. With pastries.']], ownStolen: [['That\'s evidence. Put it back.']],
});

export const dlgLawrence = {
  id: 'dlg_lawrence',
  greetings: [
    { if: { firstMeeting: true }, say: ['*doesn\'t look up* Chief Lawrence Order. Yes, really. My parents were optimists.', 'If you\'re reporting a crime, the form\'s on the noticeboard. If you\'re confessing to one, could you not? I\'m on my break. I\'m always on my break.'] },
    { if: { activity: 'sleep' }, say: ['*one eye opens* …I\'m reviewing case files. With my eyes closed. It\'s a technique.'] },
    { if: { activity: 'eat' }, say: ['*mouth full of doughnut* Mm. Whatever it is, it can wait till I\'ve finished. I eat slowly. On purpose.'] },
    { if: { police: { wanted: '>=1' } }, say: ['Oh, it\'s you. There\'s a warrant out with your face on it. Not a good likeness. Want to make it go away? It\'s cheaper than the alternative, which is me standing up.'] },
    { if: { police: { bribed: true } }, say: ['My favourite taxpayer! Relax. Nobody\'s seen anything. Nobody ever sees anything.'] },
    { if: { police: { record: '>=8' } }, say: ['You again. Your file\'s so thick I\'ve started using it as a doorstop. I\'m watching you now. Well — Tee is. I\'m delegating.'] },
    { if: {}, variants: [['*yawns* Chief Order. What.'], ['Is it an emergency? Please say no.'], ['Precinct 1. We\'re open. Spiritually.']] },
  ],
  farewells: [{ if: {}, variants: [['Close the door on your way out. Quietly.'], ['Don\'t do any crimes. Or do, but far away from me.'], ['Mm-hm. Bye.']] }],
  topics: [
    {
      id: 't_lawrence_who', label: '"Lawrence Order? Seriously?"', keywords: ['name', 'who', 'chief', 'lawrence'],
      say: ['Law-rence. Order. Law and Order. Everyone thinks they\'re the first to notice.', 'Thirty years on the force. Chief for twelve. Do you know how I became Chief? I outlasted everyone who cared.'],
    },
    {
      id: 't_lawrence_crime', label: '"Is there much crime in Halvermouth?"', keywords: ['crime', 'criminals', 'safe', 'city'],
      say: [
        'Officially? Crime\'s down forty percent. Unofficially, reporting\'s down forty percent. Same thing if you squint, and I squint a lot.',
        'Little stuff — a bit of trespassing, a pinched bun — I don\'t chase that. Life\'s too short. Shoot somebody and it\'s different. Shoot a cop and it\'s very different.',
        { if: { police: { record: '>=8' } }, text: 'And you, friend, are getting a reputation. A reputation means I have to care. I hate caring.' },
      ],
    },
    {
      id: 't_lawrence_bribe', label: '"Is there a way to make the police… less attentive?"', tag: 'quest', keywords: ['bribe', 'deal', 'attentive', 'look away', 'money'],
      say: ['*leans back* Hypothetically? A generous donation to the Policemen\'s Ball might mean my officers are… busy. For three days. Calls come in, and somehow they all take the long way round.', 'Hypothetically it\'s {bribe} obols. It goes up the more you\'ve done. Inflation.'],
      choices: [
        {
          id: 'c_lawrence_bribe', label: 'Slide {bribe} obols across the desk.', if: { police: { canAffordBribe: true, killedOfficer: false } },
          say: ['*the money vanishes into a drawer that\'s labelled "PENS"* Lovely. Three days. Nobody\'s coming to anything. Unless you kill someone — then I have to at least look. That\'s in the contract.'],
          effects: [{ police: { bribe: true } }, { rel: { trust: 4, affection: 3 } }],
        },
        {
          id: 'c_lawrence_bribe_cant', label: '"I don\'t have that kind of money."', if: { police: { canAffordBribe: false } },
          say: ['Then I don\'t have that kind of attention span. Oh wait, I do. Shame for you.'],
        },
        {
          id: 'c_lawrence_bribe_cop', label: '"What about a really big donation?"', if: { police: { killedOfficer: true } },
          say: ['*for once, he sits up* You killed one of mine. There isn\'t a drawer big enough. Get out of my office.'],
          effects: [{ rel: { trust: -10, affection: -10 } }],
        },
        { id: 'c_lawrence_bribe_no', label: '"Just asking."', say: ['Course you were. Just asking\'s free. Everything else costs money.'] },
      ],
    },
    {
      id: 't_lawrence_fine', label: '"About that warrant…"', tag: 'quest', keywords: ['warrant', 'fine', 'wanted', 'pay'],
      if: { police: { wanted: '>=1' } },
      say: ['Ah, the warrant. Paperwork. I hate paperwork. If the fine — {fine} obols — were paid, the paperwork would just… evaporate.'],
      choices: [
        {
          id: 'c_lawrence_fine', label: 'Pay the {fine}-obol fine.', if: { police: { canAffordFine: true } },
          say: ['*stamps something without reading it* There. You\'re a model citizen. Model. Like a small plastic one.'],
          effects: [{ police: { payFine: true } }, { rel: { affection: 2 } }],
        },
        { id: 'c_lawrence_fine_no', label: '"I can\'t pay."', if: { police: { canAffordFine: false } }, say: ['Then my officers will be along. Eventually. Take your time. They do.'] },
      ],
    },
    {
      id: 't_lawrence_jail', label: '"What happens if I\'m arrested?"', keywords: ['jail', 'arrest', 'cell', 'prison', 'sentence'],
      say: [
        'Cells downstairs. You serve your time, you\'re out. Hours, mostly. Days, if you\'ve been busy. Your things go in the evidence cabinet and come back when you leave. Mostly.',
        'Nobody\'s ever escaped. Well. Nobody\'s escaped on a day I was in. I\'m not in very often.',
        'If you get in trouble out there, put your hands up — press G — near an officer. Saves everybody a run. Running\'s for people without desks.',
      ],
    },
    {
      id: 't_lawrence_officers', label: '"Tell me about your officers."', keywords: ['officers', 'cops', 'team', 'justin', 'warren', 'bailey', 'miranda', 'hugh'],
      say: ['Five of them. Sergeant Case does the Plaza and Bank Row — worrier. Tee walks the Sumps and the docks — by the book, God help him. Bond takes Lanternside — smooth operator. Wright\'s the rookie, out in Westbrook. Jury goes out to the Ober Fields, then guards the cells at night.', 'They walk the whole coast so I don\'t have to. That\'s called leadership.'],
    },
    {
      id: 't_lawrence_moneybucks', label: '"What do you think of Sir Moneybucks?"', keywords: ['moneybucks', 'oil', 'ober'],
      say: ['Sir Moneybucks is a pillar of the community. A very wealthy pillar. He funds the Policemen\'s Ball. We have one every Friday now.', '*quieter* If you\'re thinking of making a complaint about him — don\'t. Not because it\'s dangerous. Because it\'s paperwork.'],
    },
  ],
  askAbout: [
    { keywords: ['doughnut', 'doughnuts', 'food'], say: ['These are evidence. I\'m examining them. Thoroughly. One at a time.'] },
    { keywords: ['osric', 'civic'], say: ['Osric Vane wrote me a letter about a parking violation in 1998. I\'m still not reading it.'] },
  ],
  unknown: [['Not my department.'], ['*yawns* Ask Tee. Tee knows everything. It\'s exhausting.']],
  gift: gift('A honey bun? For me? I\'ll have you know that this is DEFINITELY not a bribe. *eats it* Definitely not.', 'Oh, nice. Thanks.', 'Huh. I\'ll file it.', 'I\'ll put that with the evidence. Forever.'),
  barks: {
    greet: ['Mm.', 'Chief Order. What.', '*yawn*'],
    work: ['*stamps something without reading it*', 'Later. Everything is later.', 'Filed under "pending".'],
    eat: ['Mm. Glazed.', 'This is my lunch. All of this is my lunch.'],
    leisure: ['This counts as a patrol.', 'Lovely evening for doing nothing.'],
    sleep: ['…zzz… not my department… zzz…'],
    chat: ['Sure.', 'Fascinating. Truly.', 'Can it wait?'],
    argue: ['Do NOT make me stand up.'],
  },
};

const officerGift = (good, ok) => gift(good, ok, 'Thanks. I\'ll have to log it.', 'I can\'t accept that. Regulations.');

const officerDlg = (id, o) => ({
  id,
  farewells: [{ if: {}, variants: o.bye }],
  askAbout: o.askAbout || [],
  unknown: [['Not something I can help with, citizen.'], ['Ask at the precinct.']],
  gift: officerGift(o.loved, 'Appreciated.'),
  ...o.rest,
  greetings: [
    { if: { police: { wanted: '>=1' } }, say: o.wanted },
    ...o.greetings,
  ],
  topics: [
    {
      id: `t_${id}_crime`, label: '"Any trouble around here?"', keywords: ['trouble', 'crime', 'patrol', 'beat'],
      say: o.beat,
    },
    {
      id: `t_${id}_chief`, label: '"What\'s the Chief like?"', keywords: ['chief', 'lawrence', 'order'],
      say: o.chief,
    },
    ...(o.topics || []),
  ],
});

export const dlgJustin = officerDlg('dlg_justin', {
  wanted: ['You\'re — you\'re on the list! Hands where I can see them! Please. Just in case.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Sergeant Justin Case. I have a first aid kit, a whistle, a spare whistle, and a rain poncho. Do you need any of those? You might. You never know.'] },
    { if: {}, variants: [['Stay safe, citizen. Statistically, today is risky.'], ['Afternoon. Mind the kerb. Kerbs are dangerous.']] },
  ],
  bye: [['Stay alert!'], ['Be careful. Of everything.']],
  beat: ['The Plaza\'s quiet, Bank Row is quiet, which is exactly what it would look like right before something terrible happened.', 'If you see a crime, tell an officer. If you DO a crime, tell an officer — press G — and come quietly. Running only makes us chase you. I\'m not a good runner. I have too much equipment.'],
  chief: ['The Chief is… very relaxed. It\'s fine. I\'m anxious enough for both of us.'],
  loved: 'Bandages! You can never have too many. I have forty.',
});

export const dlgWarren = officerDlg('dlg_warren', {
  wanted: ['There is an active warrant in your name. Pay the fine at the precinct or submit to arrest. Those are the options. There are no other options.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Officer Warren Tee. Badge 0041. I am required to tell you that this conversation may be noted. It will be noted.'] },
    { if: {}, variants: [['Citizen.'], ['Move along. Unless you\'re reporting something. Then stop. Then move along.']] },
  ],
  bye: [['Noted.'], ['Move along.']],
  beat: ['The Sumps. Pickpockets, unlicensed trading, a man who sells "soup". The docks — smuggling, I\'d bet my badge. No warrant yet. Everything in its proper order.'],
  chief: ['The Chief is my commanding officer and I respect the chain of command.', '*very quietly* I have a folder. It is not about anyone in particular. It is quite thick.'],
  loved: 'Coffee. Black. Logged as a gift under 2 obols, within regulations. Thank you.',
});

export const dlgBailey = officerDlg('dlg_bailey', {
  wanted: ['Hey, friend — you\'ve got a warrant out. Between us? The Chief takes cash. Me, I take bail. Either way, see the Chief before somebody keen sees you.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Bailey Bond. Lanternside beat. And if you ever need bailing out — that\'s my side business. Bond, Bailey Bond. Licensed to bail.'] },
    { if: {}, variants: [['Hey, friend!'], ['Lovely day for it. Whatever "it" is. I didn\'t see it.']] },
  ],
  bye: [['Stay out of trouble — or call me if you don\'t.'], ['See you around, friend.']],
  beat: ['Lanternside? Sleepy. Coffee\'s good, folks are nice, the gulls are the real criminals. Little things I let slide. Big things… well, it depends how big, and on what day it is.'],
  chief: ['The Chief\'s a businessman, same as me. He\'ll make a warrant disappear if you ask nicely. With money. Asking nicely means money.'],
  loved: 'An Ober Imperial? Oh, you know how to make friends.',
});

export const dlgMiranda = officerDlg('dlg_miranda', {
  wanted: ['Stop! You have the right to remain silent! Anything you say can — oh, I always get nervous at this part. Please just come with me?'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Officer Miranda Wright! I\'m new. I mean — I\'m fully trained. I know all your rights. Would you like to hear them? All of them?'] },
    { if: {}, variants: [['Hi! I mean — good day, citizen.'], ['Everything okay? You have the right to say no!']] },
  ],
  bye: [['Stay lawful!'], ['Bye! Remember your rights!']],
  beat: ['Westbrook\'s all scrubland and survey stakes — I mostly read the gulls their rights. Gullwing Park is lovely. Nothing happens. Sergeant Case says that\'s when to worry.'],
  chief: ['The Chief says our procedure is "lunch". I\'m almost sure he\'s joking. Ninety percent. Sixty.'],
  loved: 'A honey bun! Is that allowed? Sergeant Case says gifts have to be logged. I\'ll log it after I eat it.',
});

export const dlgHugh = officerDlg('dlg_hugh', {
  wanted: ['You. Warrant. Don\'t make me chase you. I won\'t. I\'ll shoot.'],
  greetings: [
    { if: { firstMeeting: true }, say: ['Jury. Officer. Thirty-one years. Don\'t.'] },
    { if: { police: { jailed: true } }, say: ['Lights out at ten. No talking. No singing. Tell Larson, no singing.'] },
    { if: { activity: 'sleep' }, say: ['…zzz… *snort* …I\'m awake. I was resting my eyes. On duty.'] },
    { if: {}, variants: [['Hm.'], ['What.'], ['No.']] },
  ],
  bye: [['Hm.'], ['Go.']],
  beat: ['Fields. Oil gate. Cows. Nobody does crime in a field. Then nights in the cells. Quiet. I like quiet.'],
  chief: ['Order\'s all right. Leaves me alone. I leave him alone. It\'s a system.'],
  loved: 'Coffee. …Thanks. Long nights.',
});

export const dlgPetty = {
  id: 'dlg_petty',
  greetings: [
    { if: { firstMeeting: true }, say: ['*through the crack in the wall* Psst! New neighbour! Petty Larson. Pickpocket, harmonica player, mother\'s pride. What you in for? Don\'t tell me — you looked at Chief Order funny.'] },
    { if: { police: { jailed: false } }, say: ['*through the crack* Oi — you got OUT? Respect. Bring me a bun sometime. I\'ll be here. I\'m always here.'] },
    { if: { flag: 'petty_vent_tip' }, say: ['Fork still in one piece? Vent, four screws, follow the draught. Smells of fish at the end. That\'s how you know it\'s working.'] },
    { if: {}, variants: [['Psst. Still here?'], ['*hums through the wall*']] },
  ],
  farewells: [{ if: {}, variants: [['Keep your chin up and your spoon hidden.'], ['Laters, neighbour.']] }],
  topics: [
    {
      id: 't_petty_out', label: '"Is there a way out of here?"', tag: 'quest', keywords: ['out', 'escape', 'way', 'break'],
      if: { notFlag: 'petty_vent_tip' },
      say: [
        'Ways out? Course. There\'s always ways out. One: old Jury dozes from one till four, keys on the back of his chair. Long arms, quick fingers.',
        'Two: the brick by your bed\'s rotten. Spoon from the breakfast tray, a few nights\' scraping, and you\'re in the old sewer. Do it while Jury snores.',
        'Three: Jury\'s honest. Mostly. Not if you\'ve got sixty-odd obols in your sock.',
        'And four… four is a secret. Four is MY way. It costs.',
      ],
      choices: [
        {
          id: 'c_petty_pay', label: 'Pay him 25 obols for the secret.', if: { money: '>=25' },
          say: ['*coins clink through the crack* Lovely. The vent above your bed. Four screws. You need a fork, bent just so — here, have mine. *a bent fork slides through the crack* Crawl till you smell fish. Docks. Don\'t tell Jury.'],
          effects: [{ police: { pettyDeal: 'money' } }, { rel: { trust: 5, affection: 5 } }],
        },
        {
          id: 'c_petty_cigar', label: 'Pass him an Ober Imperial cigar.', if: { hasItem: 'item_cigar' },
          say: ['Is that an IMPERIAL? Oh, you beauty. Mum\'ll never believe it. Right — the vent above your bed. Four screws. Take my fork, it\'s bent just right. *a fork slides through the crack* Crawl till you smell fish.'],
          effects: [{ police: { pettyDeal: 'item_cigar' } }, { rel: { trust: 6, affection: 8 } }],
        },
        { id: 'c_petty_no', label: '"I\'ll manage."', say: ['Suit yourself. Spoon\'s slow, mind.'] },
      ],
    },
    {
      id: 't_petty_who', label: '"What are you in for?"', keywords: ['who', 'crime', 'in for', 'petty'],
      say: ['Pinched Sir Moneybucks\'s pocket watch. Well — I pinched it, then I pinched it back to him, then he pinched me. Long story. Mostly pinching.', 'I could leave whenever I want, honestly. But it\'s free soup and Jury\'s good company. Don\'t tell him I said that.'],
    },
  ],
  askAbout: [{ keywords: ['hugh', 'jury', 'guard'], say: ['Jury snores from one till four. Like a foghorn. Regular as the tide.'] }],
  unknown: [['No idea, neighbour.'], ['Ask me something I can sell you.']],
  gift: gift('For ME? Nobody gives ME things. I\'m usually the one taking them.', 'Ta very much.', 'Cheers.', 'What am I supposed to do with that?'),
  barks: { greet: ['Psst!', 'Evening, neighbour.'], leisure: ['*plays a few bars on a hidden harmonica*', '*hums*'], sleep: ['…mum… *snore*'], chat: ['Straight up.', 'No word of a lie.'], argue: ['Oi!'] },
};

const officerBarks = (extra) => ({
  barks: {
    greet: ['Citizen.', 'Move along.', 'Stay safe.'],
    patrol: ['All quiet.', 'Nothing to see here.', '*checks notebook*'],
    work: ['*shuffles papers*', 'Next.'],
    eat: ['Coffee break.'],
    leisure: ['Off duty. Mostly.'],
    sleep: ['…zzz…'],
    chat: ['Mm.', 'Noted.'],
    argue: ['That\'s enough!'],
    ...extra,
  },
});
Object.assign(dlgJustin, officerBarks({ patrol: ['All clear! For now.', 'Just in case…', '*checks his poncho is still there*'] }));
Object.assign(dlgWarren, officerBarks({ patrol: ['Everything in order.', '*writes something down*', 'I saw that.'] }));
Object.assign(dlgBailey, officerBarks({ patrol: ['Lovely day!', 'Nothing to see, friend.', 'Bond. Bailey Bond.'] }));
Object.assign(dlgMiranda, officerBarks({ patrol: ['You have the right to a lovely day!', '*recites the rights under her breath*', 'All clear! I think!'] }));
Object.assign(dlgHugh, officerBarks({ patrol: ['Hm.', 'Cows.', '*grunts*'], work: ['Lights out.', 'Quiet.'], sleep: ['…zzz… *SNORT* …zzz…'] }));

export default [dlgLawrence, dlgJustin, dlgWarren, dlgBailey, dlgMiranda, dlgHugh, dlgPetty];
