// The Phonograph Grand (v0.52.0). Octavius and Vera change chips at the cage (effect
// { panel: { name: 'cashier' } } — src/ui/cashier.js; the exchange itself is
// src/systems/casino.js exchange). Morganius tells you the odds, exactly, and smiles.
const CAGE = { activity: 'cashier' };

export const dlgMorganius = {
  id: 'dlg_morganius',
  greetings: [
    { if: { firstMeeting: true }, say: ['Ahh. A new face. A fresh deck. A blank card! Welcome, welcome, welcome to the Phonograph Grand, my friend.', 'Morganius Spade, at your service — magician, host and keeper of the tables. Yes, I am floating. No, there are no wires. Yes, I can tell you how. No, I won\'t.'] },
    { if: { activity: 'sleep' }, say: ['*hovering a foot above the bed, snoring in perfect rhythm; a deck of cards shuffles itself on the pillow*'] },
    { if: { activity: 'host' }, variants: [['The table is yours, my friend. The cards are mine. The luck — well. The luck is anybody\'s.'], ['Sit, sit! I\'ve warmed the deck.']] },
    { if: { activity: 'practice' }, variants: [['*a fan of cards hangs in the air in front of him* Ah — careful. That\'s a rehearsal. You\'ll spoil the ending.'], ['You\'ve caught me practising. Nobody catches me practising. I shall have to make you vanish. …Joking. Mostly.']] },
    { if: { rel: { affection: '>=40' } }, variants: [['My favourite guest! The cards have been asking after you.'], ['There you are! I knew you\'d come. The Queen of Hearts told me. She\'s a terrible gossip.']] },
    { if: {}, variants: [['Good evening, good evening, good evening! Whatever the hour, my friend, it is always evening on the casino floor.'], ['*a card flips out of his sleeve, spins once and lands in his palm* Ah. The Seven of Clubs. It means you\'re about to ask me something.'], ['Welcome back to the Grand. Pick a table. Any table.']] },
  ],
  farewells: [{ if: {}, variants: [['Go well, my friend. Come back luckier.'], ['Until the next hand.'], ['*bows so low his hat brim brushes the carpet* The house thanks you.']] }],
  topics: [
    {
      id: 't_ms_games', label: '"What can I play here?"', tag: 'quest', keywords: ['games', 'play', 'tables', 'gamble', 'roulette', 'blackjack', 'poker', 'casino'],
      say: ['Three games tonight, my friend, and one more coming. Roulette: a single zero, thirty-seven pockets — a number pays thirty-five to one. Blackjack: six decks, the dealer stands on every seventeen, blackjack pays three to two. And Texas Hold\'em, once Octavius has finished dressing the tables.', 'Chips at the cage, one obol each. Sit at any table — and I\'ll be along. I always am.'],
    },
    {
      id: 't_ms_odds', label: '"Are the games fair?"', keywords: ['fair', 'odds', 'cheat', 'rigged', 'edge', 'honest', 'house'],
      say: ['Perfectly fair, and perfectly against you. Cards on the table: the roulette wheel keeps one chip in thirty-seven — that is the zero, and the zero is the house. Blackjack, played well, keeps about half a chip in a hundred. Played badly, a good deal more.', 'I never cheat, my friend. I have never needed to. The odds do my cheating for me — and they\'re honest about it.'],
    },
    {
      id: 't_ms_float', label: '"How are you floating?"', keywords: ['float', 'floating', 'fly', 'levitate', 'wires', 'magic', 'how'],
      say: ['Floating? Am I? *looks down* Good heavens. So I am.', 'A magician never tells, my friend. But I\'ll give you a hint: it\'s the same way the cards stay up. Confidence, mostly. And about forty years of practice.'],
    },
    {
      id: 't_ms_self', label: '"Who are you, really?"', keywords: ['who', 'you', 'yourself', 'morganius', 'spade', 'magician', 'wizard', 'past'],
      say: ['I have been a card sharp, a stage magician, a fortune-teller, a dealer on three riverboats and a hat. Briefly. Don\'t ask.', 'Octavius found me working a street corner in the rain, turning a single deck into a flock of doves for anyone with a coin. He said: "Mm. Do that in my building." So here I am, forty floors under his bed, doing that in his building.'],
    },
    {
      id: 't_ms_trick', label: '"Show me a trick."', keywords: ['trick', 'show', 'card trick', 'magic trick', 'pick a card'],
      say: ['A trick! Very well. Pick a card. Any card. *a fan of fifty-two cards blooms from nowhere* …Remember it. Don\'t tell me.', '*the fan snaps shut, the deck spirals up his arm and over his shoulders and back into his palm* Is THIS your card? *he holds up a card with a small, perfect portrait of your face on it*', 'No? Then it must be in your pocket. …Check later. It always is.'],
      effects: [{ rel: { affection: 2 } }],
    },
    {
      id: 't_ms_table', label: '"What\'s the table on your stage?"', keywords: ['your table', 'stage', 'spade table', 'his table', 'special', 'roguelike'],
      say: ['Ahh. My table. The Spade\'s Gambit, my friend — a game of my own. You play poker hands from your own deck, and each hand scores Pips times Gasps. Three Acts, three Tricks each; reach the target, or the curtain falls.', 'Between the Tricks you visit my Cabinet: Curios, Inks for your cards, Rehearsals, Vanishings. And every Finale, I change the rules a little. Twenty-five chips to sit. Clear an Act and you\'ll see them again; clear all three and you\'ll see a great many more.'],
    },
    {
      id: 't_ms_octavius', label: '"What\'s Octavius like?"', keywords: ['octavius', 'phonograph', 'owner', 'boss'],
      say: ['Octavius Thomas Phonograph. Richest man in Halvermouth — on Tuesdays. On Wednesdays it is Sir Moneybucks. They take it in turns and neither of them knows.', 'He owns the building, the casino, the chips and, I suspect, several governments. He has not looked up from that telephone since the year the tower opened. I find him restful.'],
    },
  ],
  askAbout: [
    { keywords: ['moneybucks', 'oil'], say: ['Sir Moneybucks plays a mean hand of cards. He offered me a fortune once to "fix" a game against a rival. I told him the only thing I fix is my hat. He has never forgiven the hat.'] },
    { keywords: ['vera', 'cage', 'cashier', 'chips'], say: ['Vera keeps the cage — the most honest woman in the city. Obols in, chips out; chips in, obols out. One for one. She has never lost a chip. I tested her. She caught it in mid-air.'] },
    { keywords: ['brock', 'security'], say: ['Brock is the Grand\'s security. Built like a vault door and twice as discreet. Don\'t make him chase you. He gets so sad about it.'] },
    { keywords: ['lucky star', 'bar', 'lounge'], say: ['The Lucky Star stood here for sixty years. When Octavius bought it he meant to tear it down. I talked him round. The bar lives on in the lobby, and the star over the door is the same star. I polished it myself.'] },
    { keywords: ['slots', 'slot machines', 'machines'], say: ['Disenchanted, every one. A slot machine is a game with no one at the other end of it, my friend. Where is the art in that?'] },
    { keywords: ['gambit', 'curio', 'curios', 'pips', 'gasps', 'cabinet'], say: ['My Curios are the finest wonders I own, my friend, and I lend them only to people who are losing to me. Hold five at most. The order you hold them in is the order they work — remember that.'] },
    { keywords: ['zero', 'green'], say: ['The zero is green, single and entirely the house\'s. When the ball lands there, every outside bet loses. Only a bet on zero itself wins — thirty-five to one.'] },
  ],
  unknown: [['The cards are silent on that one, my friend.'], ['Ah. That card stays face down.']],
  gift: { loved: [['For me? *it vanishes, and reappears in his hat* Kept safe. Thank you, my friend.']], liked: [['How kind! *it spins once in the air and lands in his pocket*']], neutral: [['*makes it disappear, politely*']], disliked: [['Ah. I shall make this disappear. Permanently.']], tooMany: [['My hat is full, my friend. Truly — I checked.']], ownStolen: [['That was mine! …Was it? Funny. I could have sworn it was in my hat.']] },
  barks: {
    greet: ['Good evening, my friend!', 'Pick a card!', 'The tables await!'],
    perform: ['*a fan of cards opens and closes in his hand*', 'Ladies and gentlemen — the Queen of Hearts! *she vanishes*', '*cards orbit his fingers like little moons*', 'Is THIS your card?', '*bows to nobody in particular*', 'Thirty-seven pockets, one zero. The odds, my friends, are posted!'],
    host: ['*shuffles without touching the cards*', 'Place your bets!', 'Ahh. Interesting.'],
    practice: ['*mutters* …up the left arm, over the shoulder, and — no.', '*a card flies off and hits the mirror*'],
    eat: ['*eats one grape at a time, from a card*', 'Mm. Shuffled eggs.'],
    sleep: ['…the Seven of Clubs… *snore*'],
    chat: ['Ahh!', 'Delicious.', 'Cards on the table —'],
    argue: ['Ah-ah-ah.', 'Let\'s not.'],
  },
};

export const dlgOctavius = {
  id: 'dlg_octavius',
  greetings: [
    { if: { firstMeeting: true }, say: ['*on the phone* — no, sell. Sell. …Hm? Oh. Hi. Octavius Phonograph. I own this. All of it.', '*back to the phone* No, not you. Someone. Buy the other one.'] },
    { if: { activity: 'sleep' }, say: ['*asleep, sitting up, phone in hand; the screen lights his face* …sell…'] },
    { if: CAGE, variants: [['Chips? Mm.'], ['*holding up one finger* — Cage is open. Go.'], ['*on the phone* — yeah. Yeah. …You want chips? Fine.']] },
    { if: {}, variants: [['Mm.'], ['*doesn\'t look up* Busy.'], ['*on the phone* — tell them no. …What?'], ['Hi. Quick.'], ['*scrolling* Yeah?'], ['*holds up one finger* …Okay. Go.']] },
  ],
  farewells: [{ if: {}, variants: [['Mm.'], ['*already on the phone*'], ['Bye.'], ['Yep.']] }],
  topics: [
    {
      id: 't_otp_chips', label: '"I\'d like to change some money."', tag: 'quest', keywords: ['chips', 'change', 'exchange', 'cash', 'buy', 'money', 'cash out'],
      if: CAGE,
      say: [{ if: { flag: 'otp_chips_once' }, text: 'Mm. Usual rate.' }, { if: { notFlag: 'otp_chips_once' }, text: 'One obol, one chip. No fee. Don\'t haggle. — No, not you. Hold on.' }],
      effects: [{ flag: { otp_chips_once: true } }, { panel: { name: 'cashier' } }],
    },
    {
      id: 't_otp_chips_away', label: '"Can I buy chips from you?"', keywords: ['chips', 'change', 'exchange', 'cash', 'buy'],
      if: { not: CAGE },
      say: ['Cage. Downstairs. Vera. — I\'m on a call.'],
    },
    {
      id: 't_otp_casino', label: '"Nice place."', keywords: ['casino', 'grand', 'hotel', 'tower', 'place', 'building'],
      say: [{ if: { rel: { respect: '>=20' } }, text: 'Forty-two floors. Bought the Lucky Star, built up. Spade talked me out of knocking down the bar. Good call. Don\'t tell him.' }, { if: { rel: { respect: '<20' } }, text: 'I know.' }],
    },
    {
      id: 't_otp_moneybucks', label: '"Are you richer than Sir Moneybucks?"', keywords: ['moneybucks', 'rich', 'richer', 'wealth', 'oil', 'money'],
      say: ['*looks up. For the first time. For one second.* …Depends how you count.', '*back to the phone* He counts oil. I count everything else.'],
    },
    {
      id: 't_otp_phone', label: '"Who are you always talking to?"', keywords: ['phone', 'call', 'who', 'talking'],
      say: ['Tokyo. Zurich. A man about a horse. — No, YOU hold. — Everyone.'],
    },
    {
      id: 't_otp_spade', label: '"What about Morganius?"', keywords: ['morganius', 'spade', 'magician', 'wizard'],
      say: ['Spade? Draws a crowd. Crowds buy chips. Mm. — He turned my accountant into a pigeon once. Temporarily. Best quarter we ever had.'],
    },
    {
      id: 't_otp_job', label: '"Got any work for me?"', keywords: ['work', 'job', 'business', 'deal', 'invest', 'partner'],
      say: [{ if: { wealth: '>=50000' }, text: 'Mm. Maybe. Come back richer. — No, that\'s a compliment.' }, { if: { wealth: '<50000' }, text: 'No. — Not you. …Also not you.' }],
    },
  ],
  askAbout: [
    { keywords: ['penthouse', '42', 'upstairs'], say: ['Mine. Private. Keycard.'] },
    { keywords: ['vera', 'cage', 'cashier'], say: ['Vera. Best cage in the city.'] },
    { keywords: ['brock', 'security'], say: ['Brock. Big. Good.'] },
    { keywords: ['lucky star', 'bar', 'lounge'], say: ['Kept the bar. Spade\'s idea. Mm.'] },
    { keywords: ['lawyers', 'lawyer', 'sue'], say: ['Eleven. On retainer. They\'re bored. Don\'t give them something to do.'] },
  ],
  unknown: [['Mm. No idea.'], ['Ask someone else.'], ['*doesn\'t look up*']],
  gift: { loved: [['*glances at it* …Huh. Thanks.']], liked: [['Mm. Thanks.']], neutral: [['*puts it down without looking*']], disliked: [['No.']], tooMany: [['Stop.']], ownStolen: [['That\'s mine. — Brock?']] },
  barks: {
    greet: ['Mm.', 'Busy.', '*on the phone*'],
    work: ['Sell.', 'Buy.', 'No — the OTHER one.', '*three phones, one ear*', 'Put him on hold.', 'Tokyo, then Zurich.'],
    cashier: ['*counts chips without looking*', 'Next.', '*on the phone, sliding chips across*'],
    leisure: ['*scrolling, walking, not colliding with anything*', 'Mm. Full tonight.'],
    eat: ['*eats one-handed*', 'Mm.'],
    sleep: ['…sell… *snore*'],
    chat: ['Mm.', 'Yep.', 'Quick.'],
    argue: ['No.', 'Lawyers.'],
  },
};

export const dlgVera = {
  id: 'dlg_vera',
  greetings: [
    { if: { firstMeeting: true }, say: ['Good evening. Vera Lusk, the cage. Obols to chips, chips to obols, one for one, no fee. Count them at the window — once you walk away, they\'re yours to lose.'] },
    { if: { activity: 'sleep' }, say: ['*asleep; her glasses folded on the pillow, exactly square*'] },
    { if: CAGE, variants: [['Evening. Chips?'], ['Window\'s open.'], ['Buying or cashing?']] },
    { if: {}, variants: [['I\'m off shift. The cage opens at ten and again at eight.'], ['Hello. Off duty — try Mr Phonograph at the cage, four till eight.']] },
  ],
  farewells: [{ if: {}, variants: [['Good luck.'], ['Count your chips.'], ['Evening.']] }],
  topics: [
    {
      id: 't_vera_chips', label: '"I\'d like to change some money."', tag: 'quest', keywords: ['chips', 'change', 'exchange', 'cash', 'buy', 'money', 'cash out'],
      if: CAGE,
      say: ['Of course. How many?'],
      effects: [{ panel: { name: 'cashier' } }],
    },
    {
      id: 't_vera_hours', label: '"When is the cage open?"', keywords: ['hours', 'open', 'when', 'cage', 'closed'],
      say: ['I\'m on ten till four and eight till two. Mr Phonograph does four till eight himself — he says it keeps him "close to the product". Between two and ten in the morning the cage is shut, and so are the tables, for anyone without chips.'],
    },
    {
      id: 't_vera_rules', label: '"How does the cage work?"', keywords: ['rules', 'rate', 'fee', 'how'],
      say: ['One obol buys one chip; one chip buys back one obol. No fee either way. Minimum purchase five chips. You can\'t cash out with chips still on a table — finish your game first.', 'Every exchange is in the ledger. Every chip. I\'ve never been out by one, and I don\'t intend to start with you.'],
    },
    {
      id: 't_vera_spade', label: '"What\'s it like working with a wizard?"', keywords: ['morganius', 'spade', 'wizard', 'magic'],
      say: ['Mr Spade is lovely. He once made my whole float vanish, and it came back with interest. That is not how a float works. I had to write a report. The report also vanished.'],
    },
  ],
  askAbout: [
    { keywords: ['octavius', 'phonograph', 'boss'], say: ['Mr Phonograph pays on time, on his phone. He has never once looked at the cage. He looks at its numbers, which is fairer, really.'] },
    { keywords: ['brock', 'security'], say: ['Brock walks me to the lift every night after the late shift. Never says a word. Eats my biscuits.'] },
  ],
  unknown: [['That\'s not a cage matter.'], ['Couldn\'t say.']],
  gift: { loved: [['Oh! That\'s very kind. I\'ll log it. As a gift. Not a bribe.']], liked: [['Thank you.']], neutral: [['…Thank you. Logged.']], disliked: [['I\'ll have to decline that. Policy.']], tooMany: [['This is starting to look like a bribe.']], ownStolen: [['That\'s from my locker.']] },
  barks: {
    greet: ['Evening.', 'Window\'s open.'],
    cashier: ['*counts a stack twice*', 'Next, please.', '*stamps the ledger*', 'One for one.'],
    relax: ['*does a crossword in pen*', '*counts something*'],
    eat: ['*a biscuit, carefully*'],
    sleep: ['…ninety-eight, ninety-nine… *a tidy snore*'],
    chat: ['Mm-hm.', 'Indeed.'],
    argue: ['That\'s not policy.'],
  },
};

export const dlgBrock = {
  id: 'dlg_brock',
  greetings: [
    { if: { firstMeeting: true }, say: ['*looks down at you from a considerable height* Evening. Brock. Security. Enjoy your visit. Don\'t make it interesting.'] },
    { if: { activity: 'sleep' }, say: ['*asleep, sitting perfectly upright, shades on*'] },
    { if: {}, variants: [['Evening.'], ['*nods*'], ['All quiet.'], ['Keep it friendly.']] },
  ],
  farewells: [{ if: {}, variants: [['Evening.'], ['*nods*']] }],
  topics: [
    {
      id: 't_brock_rules', label: '"Any rules I should know?"', keywords: ['rules', 'security', 'trouble', 'allowed'],
      say: ['Three. No fighting. No counting cards out loud. Floors forty-one and forty-two are private. You\'ll know if you break one.'],
    },
    {
      id: 't_brock_spade', label: '"Does Morganius really float?"', keywords: ['morganius', 'spade', 'float', 'wizard'],
      say: ['Yep. You get used to it. Don\'t walk under him.'],
    },
  ],
  askAbout: [
    { keywords: ['vera', 'cage'], say: ['Vera\'s good people.'] },
    { keywords: ['octavius', 'boss', 'phonograph'], say: ['Boss.'] },
  ],
  unknown: [['Can\'t say.'], ['*shrugs*']],
  gift: { loved: [['…Thanks. *almost smiles*']], liked: [['Thanks.']], neutral: [['*nods*']], disliked: [['No thanks.']], tooMany: [['That\'s enough.']], ownStolen: [['That\'s mine.']] },
  barks: {
    greet: ['Evening.', '*nods*'],
    work: ['*scans the room*', '*touches his earpiece*', 'All quiet.', '*cracks his knuckles, quietly*'],
    eat: ['*eats a sandwich in two bites*'],
    sleep: ['…all quiet… *snore*'],
    chat: ['Yep.', 'Nope.'],
    argue: ['Outside.'],
  },
};

export default [dlgMorganius, dlgOctavius, dlgVera, dlgBrock];
