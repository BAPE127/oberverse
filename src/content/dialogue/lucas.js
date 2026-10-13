// Lucas Eastrise of Pipecreek Armory: sleazy, creepy, conspiratorial. His
// rants mix the game's fictional nations with generic real-world-flavoured
// conspiracy talk — no real people, parties or countries (owner's choice:
// "mix in real-world-style takes").
// Flags: bought_gun_lucas (set when you buy a gun here), arms_pitch_accepted,
// arms_licence. Effects: { arms: { licence: true } }.

const RANTS = [
  ['Everything\'s a supply chain with a flag on it. Wars? Supply chains. Elections? Supply chains. Love? You\'d be amazed.'],
  ['You know why the news is always bad? Because good news doesn\'t sell ad space. And who sells ad space? *taps nose* People who also sell… other things.'],
  ['Varnistan\'s been "about to have elections" for nineteen years. That\'s not a country, that\'s a waiting room with an army.'],
  ['The Ostmark Union has seven provinces and one parliament and they can\'t agree on lunch. Know what they CAN agree on? Procurement. *wink*'],
  ['Caldera\'s built on a volcano. Literally. You know who sells fire insurance there? Nobody. You know who sells fire? Somebody should.'],
  ['The moon landing was real. The MOON, though? Think about it. Who\'s ever been there and come back and NOT sold a book?'],
  ['Every five years they tell you the economy\'s "recovering". From what? Name the injury. They can\'t. Because it\'s you. You\'re the injury.'],
  ['The Free State of Pallas is free the way a sample is free. You pay later, with interest, and with a coup.'],
  ['Weather reports are just suggestions from people who own umbrellas. Follow the umbrella money.'],
  ['The Morrow Isles have two hundred islands and two hundred navies. That\'s not a country, darling, that\'s a CUSTOMER BASE.'],
  ['Neutral countries are the scariest. The Grand Duchy of Lirre hasn\'t picked a side in four hundred years. You know what that means? They\'re buying from EVERYONE.'],
  ['They put the expiry dates on food so you\'ll keep buying food. I\'ve had the same tin of beans since I was nine. Still good. Probably.'],
  ['Politicians don\'t start wars. Spreadsheets start wars. Politicians just read them out loud in a serious voice.'],
  ['Teshvar\'s sheikh owns a yacht shaped like a smaller yacht. That\'s not wealth, that\'s a nesting doll of tax strategies.'],
];

export const dlgLucas = {
  id: 'dlg_lucas',
  greetings: [
    { if: { firstMeeting: true }, say: ['*leans over the counter, much too close* Well, hi. Lucas Eastrise. Pipecreek Armory. I\'ve been watching you walk past. You\'ve got a good walk. A purposeful walk. A walk that needs a sidearm.', 'Look around. Touch things. Not those things. Well — fine, those things.'] },
    { if: { flag: 'bought_gun_lucas', notFlag: 'arms_pitch_accepted' }, say: ['*closes the shop door. Locks it. Smiles.* You. Yes. I had a feeling about you the second you paid. Can I tell you something? Something big? Sit. There\'s no chair. Lean, then.'] },
    { if: { activity: 'sleep' }, say: ['*mumbling* …follow the umbrella money… *snore*'] },
    { if: { flag: 'arms_licence' }, variants: [['My favourite manufacturer! How\'s the empire? Don\'t answer. I already know. I have ways.'], ['*whispers* The globe is turning in your favour. Literally. I watched it on my terminal.']] },
    { if: {}, variants: [['*appears beside you without walking* Hi again.'], ['There\'s my favourite customer. I mean that. I keep a list.'], ['Back so soon? I knew you would be. I dreamed it. Not in a weird way.'], ['Hey, you. Nice hands. Trigger hands.']] },
  ],
  farewells: [{ if: {}, variants: [['See you soon. Sooner than you think.'], ['Bye now! I\'ll be watching. The shop, I mean. I\'ll be watching the shop.'], ['Stay safe out there. Or don\'t, and come back for more stock.']] }],
  topics: [
    {
      id: 't_lucas_shop', label: '"Show me what you\'ve got."', tag: 'quest', keywords: ['buy', 'guns', 'shop', 'stock'],
      say: ['*spreads his arms over the counter like a game-show host* Revolvers, pistols, shotguns, rifles. Ammo by the box. All legal. Mostly. Legally mostly.'],
      effects: [{ openShop: 'shop_rook' }],
    },
    {
      id: 't_lucas_who', label: '"Who are you, exactly?"', keywords: ['who', 'lucas', 'eastrise', 'pipecreek'],
      say: ['Lucas Eastrise. I bought this place off the old owner, Rook. Lovely man. Moved away very suddenly. Very suddenly.', 'Pipecreek, because everything flows downhill eventually, darling. Money. Water. Weapons. Information. I just stand at the bottom of the creek with a bucket.'],
    },
    {
      id: 't_lucas_takes', label: '"What\'s your take on the state of the world?"', keywords: ['world', 'politics', 'take', 'opinion', 'news', 'conspiracy'],
      variants: RANTS,
    },
    {
      id: 't_lucas_pitch', label: '"What\'s this big idea of yours?"', tag: 'quest', keywords: ['business', 'idea', 'big', 'opportunity', 'manufacturing'],
      if: { flag: 'bought_gun_lucas', notFlag: 'arms_pitch_accepted' },
      say: [
        'Here it is. The world is on fire. Varnistan, Caldera, the Morrow Isles — everyone\'s fighting everyone, and nobody\'s making enough guns. Supply, demand, flags. You following?',
        'There\'s a yard at the end of Mill Road. Big sheds. Cheap. You buy one, you make weapons — pistols to start, then rifles, rockets, missiles, drones. You hire people. You research. You get a terminal with a lovely spinning globe, and you SELL TO THE WORLD.',
        'I take a little cut for setting you up. And until the international buyers come around, I\'ll buy everything you make myself. Wholesale. Half price. Still a fortune.',
      ],
      choices: [
        { id: 'c_lucas_yes', label: '"I\'m in."', say: ['*grabs your hand in both of his. Holds it for a long time.* I KNEW it. I knew it from your walk.', 'First thing: you need an arms licence. Without it the Yards won\'t sell to you, and the Hall of Justice gets… fussy. I know a guy. He\'s cheap. Five hundred obols, and he doesn\'t read what he stamps.'], effects: [{ flag: { arms_pitch_accepted: true } }, { rel: { affection: 5, trust: 4 } }] },
        { id: 'c_lucas_no', label: '"Not interested."', say: ['*doesn\'t blink* That\'s fine. That\'s fine. I\'ll ask again. I\'m very patient. I have so much time. I have your schedule.'] },
      ],
    },
    {
      id: 't_lucas_licence', label: '"About that arms licence…"', tag: 'quest', keywords: ['licence', 'license', 'permit', 'paperwork'],
      if: { flag: 'arms_pitch_accepted', notFlag: 'arms_licence' },
      say: ['Five hundred obols. My guy at the Hall of Justice stamps it, files it, forgets it. You\'ll be a licensed manufacturer and exporter. Exporting to embargoed countries is still a crime, technically — but who checks? *wink* Someone checks. Don\'t get caught.'],
      choices: [
        { id: 'c_lucas_licence_pay', label: 'Pay 500 obols for the licence.', if: { money: '>=500' }, say: ['*the money disappears into his jacket, which seems to have no bottom* Done. Welcome to the industry. The Yards are at the west end of Mill Road. Buy a shed. Call me. Don\'t call me. I\'ll know.'], effects: [{ arms: { licence: true } }, { rel: { affection: 3 } }] },
        { id: 'c_lucas_licence_cant', label: '"I don\'t have it yet."', if: { money: '<500' }, say: ['That\'s okay. I\'ll wait. I\'m good at waiting. I\'m doing it right now. Feel that?'] },
      ],
    },
    {
      id: 't_lucas_sell', label: '"I\'ve got weapons to sell you."', tag: 'quest', keywords: ['sell', 'wholesale', 'weapons'],
      if: { flag: 'arms_licence' },
      say: ['Wholesale. Half of what a buyer would pay, adjusted for your research — I\'m not a monster. I have a budget, though: {lucasBudget} obols left today. Bring them to the counter.'],
      effects: [{ openShop: 'shop_rook' }],
    },
    {
      id: 't_lucas_yards', label: '"How does the arms business work?"', keywords: ['how', 'work', 'yards', 'production', 'research', 'staff'],
      if: { flag: 'arms_pitch_accepted' },
      say: [
        'Buy a works in the Yards. Inside there\'s a terminal: parts, equipment, staff, research. Order parts — they land on the loading dock. Buy workstations — lathe, assembly bench, the fancy bays — and put them down. Press B, darling, like a builder.',
        'Hire people to staff the stations. They live on site. Pay them every day or they walk, and they\'ll tell everyone you\'re cheap. Belts and arms will carry parts between stations, if you\'re clever. Finished pieces go in the export cage, and you bring them to me.',
        'Research makes better weapons — better weapons, better prices. Put a scientist in a lab. Start with pistols. End with… well. Let\'s not say it in here. The walls have ears. I put them there.',
      ],
    },
  ],
  askAbout: [
    { keywords: ['rook', 'old owner'], say: ['Rook? Moved away. Very suddenly. Lovely man. Left his reading glasses. I wear them now. *taps them*'] },
    { keywords: ['moon'], say: ['Don\'t get me started on the moon. *gets himself started on the moon*'] },
    { keywords: ['countries', 'war', 'wars', 'varnistan', 'caldera', 'ostmark', 'morrow', 'pallas', 'teshvar', 'lirre', 'sund'], say: ['Eight countries worth knowing, and every one of them wants something that goes bang. The terminal in your works shows the lot. Spinning. Beautiful. Like a roulette wheel that pays in blood. And obols.'] },
  ],
  unknown: [['That\'s classified. By me.'], ['I don\'t know. Which means THEY don\'t want me to know.']],
  gift: { loved: [['For me? *sniffs it* You remembered. I never told you. You just knew. We\'re connected.']], liked: [['Ooh. Thank you. I\'ll keep it next to your photo.']], neutral: [['How thoughtful. I\'ll catalogue it.']], disliked: [['…I\'ll find a use for it. I always do.']], tooMany: [['Stop, stop. People will talk. Let them.']], ownStolen: [['That\'s mine, darling. I have the serial numbers. Of everything.']] },
  barks: {
    greet: ['Hi there.', 'Lovely to see you. Again.', '*winks*'],
    work: ['Everything must go! To a good war.', '*polishes a revolver very slowly*', 'Psst. Want to hear something they don\'t want you to know?'],
    eat: ['*eats a sandwich while reading forums*', 'Mm. Beans. Same tin.'],
    leisure: ['*pins a photo to the corkboard*', 'Red string… red string…', '*laughs at something on his screen*'],
    sleep: ['…the umbrella money… *snore*'],
    chat: ['Fascinating.', 'Wake up.', 'Exactly. EXACTLY.'],
    argue: ['You don\'t want to do this. I have a folder.'],
  },
};


// Your arms-works employees (generated; see src/systems/arms.js profileOf).
export const dlgStaff = {
  id: 'dlg_staff',
  greetings: [
    { if: { staff: { morale: '<30' } }, say: ['*doesn\'t look up* Boss. If this is about the overtime, I\'m not doing it. If it\'s about the pay, finally.'] },
    { if: { activity: 'sleep' }, say: ['*rolls over* …it\'s my sleep shift, boss…'] },
    { if: { staff: { morale: '>=70' } }, variants: [['Boss! Good to see you. The floor\'s humming.'], ['Morning, boss. Or evening. It\'s always the same in here.']] },
    { if: {}, variants: [['Boss.'], ['Need something?'], ['*wipes hands on overalls* Yeah?']] },
  ],
  farewells: [{ if: {}, variants: [['Back to it.'], ['Boss.']] }],
  topics: [
    {
      id: 't_staff_job', label: '"How\'s the work?"', keywords: ['work', 'job', 'station'],
      say: [
        'I\'m on {staffStation}. {staffMain} is my thing. {staffWage} obols a day, if anyone\'s counting. I\'m counting.',
        { if: { staff: { morale: '<30' } }, text: 'Honestly? I\'m fried. A bonus wouldn\'t hurt. Or pay. Pay on time would be nice.' },
        { if: { staff: { morale: '>=30' } }, not: { staff: { morale: '>=70' } }, text: 'It\'s fine. It\'s a job. The bunks are lumpy.' },
        { if: { staff: { morale: '>=70' } }, text: 'Best job I\'ve had. Don\'t tell anyone what we make, though. My mum thinks it\'s furniture.' },
      ],
    },
    { id: 't_staff_quirk', label: '"Tell me about yourself."', keywords: ['you', 'yourself', 'quirk'], variants: [['People say I\'m — what was it — "{staffQuirk}". Fair enough.'], ['Not much to tell. I work, I sleep, I work. {staffQuirk}, if you believe my last reference.']] },
    { id: 't_staff_lucas', label: '"What do you think of Lucas?"', keywords: ['lucas', 'eastrise'], variants: [['Lucas came by once. Stood behind me for twenty minutes. Didn\'t say anything. Then said "lovely welds" and left.'], ['He gave me a pamphlet about the moon. I didn\'t ask for a pamphlet about the moon.']] },
  ],
  askAbout: [],
  unknown: [['No idea, boss.'], ['Above my pay grade.']],
  gift: { loved: [['For me? Boss, you\'re all right.']], liked: [['Cheers, boss.']], neutral: [['Thanks.']], disliked: [['…Thanks?']], tooMany: [['That\'s plenty, boss.']], ownStolen: [['That\'s mine.']] },
  barks: {
    greet: ['Boss.', 'Hey.'],
    work: ['*welding*', '*measures twice*', 'Torque spec… torque spec…', '*whistles*', 'Mind the sparks!'],
    leisure: ['*plays cards with nobody*', '*reads a manual for fun*', 'Long shift.'],
    sleep: ['…zzz…'],
    chat: ['Yeah.', 'Mm.'],
    argue: ['Hey!'],
  },
};

export default [dlgLucas, dlgStaff];
