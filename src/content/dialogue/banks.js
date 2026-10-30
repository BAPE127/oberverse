// The banks' staff (v0.78.0). Voices: the Governor is measured and allergic to being quoted; Prudence is exact and kind; Cyrus is thrilled
// by bonds; Bertram says little; Hollis is slow to say yes; Dottie hums; Clint is laconic. Nobody here ever says a clerk can change a rate
// or a credit record: the rate is the economy's, and a loan is what the borrower holds and repays.
// Effects { panel: { name: 'tablet', opts: { tab } } } open the tablet at that app.
const open = (tab) => ({ panel: { name: 'tablet', opts: { tab } } });
const gifts = (loved, liked, neutral, disliked) => ({ loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]], tooMany: [['That is plenty. Truly.']], ownStolen: [['That is — ahem — ours. Or rather, mine.']] });

export const dlgAugustus = {
  id: 'dlg_augustus',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep upright in an armchair, a ledger open on his chest, the page turned to "Unchanged"*'] },
    { if: { firstMeeting: true }, say: ['Ah. A visitor in the public hours. Augustus Prime, Governor of the First Bank of Halvermouth.', 'I should say at once that the rate is not mine. I merely read what the economy has done and write it down. Quarter-point at a time. Do sit, if there is something to sit on.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['Good to see you. The figures are, on the whole, unchanged. That is a compliment.']] },
    { if: {}, variants: [['Good day. The Bank is open. The rate is as the board says.'], ['Yes? Please be brief and do not quote me.'], ['Ah. The public. Welcome, welcome. Mind the vault; it minds you.']] },
  ],
  farewells: [{ if: {}, variants: [['Good day. Do read the board on your way out.'], ['Unchanged, as ever. Good day.']] }],
  topics: [
    { id: 't_aug_rate', label: '"Who sets the rate?"', keywords: ['rate', 'interest', 'policy', 'who', 'sets'], say: ['Nobody, strictly. Once a month, from the fourth month of the game, I look at how busy the companies are, how fast their sales are growing and how many are in distress. If the economy is running hot, the rate goes up a quarter-point. If it is cold, down. If it is neither, I write "unchanged" and go to lunch.', 'I record why. It is on the board in the hall and in the tablet\'s Bank app. If a rate ever looks arbitrary, I have written the record badly.'], effects: [open('Bank')] },
    { id: 't_aug_wars', label: '"Do wars change the rate?"', keywords: ['war', 'wars', 'embargo', 'sanctions', 'conflict'], say: ['The rate? Not directly. Wars make things dearer and make markets nervous, and the bonds we sell carry a premium for it: a few basis points while a war is on, fading after. That premium is not the rate. It is the price of uncertainty, and I have learnt to keep them apart.'] },
    { id: 't_aug_credit', label: '"Does the Bank decide who gets loans?"', keywords: ['loan', 'loans', 'lend', 'credit', 'borrow'], say: ['The First Bank is not a lender; it sets a benchmark and sells the government\'s bonds. Loans come from Lariat State Bank, and its rule is simple: what you hold, what you owe, and whether you pay. Nothing else enters into it. Nothing. I would be the first to say so.'] },
  ],
  askPrompt: [['Ask what you like. I reserve the right to say "unchanged".']],
  unknown: [['The Bank has no view.'], ['I could not possibly say. I could not possibly say that either.']],
  gift: gifts('Coffee. Properly strong. You understand the Bank.', 'Thank you. Noted. In ink.', 'Thank you. It will be logged.', 'I... will place it with the lost property.'),
  barks: { greet: ['Good day.', 'Mm.'], work: ['Unchanged.', 'Noted.'], chat: ['Hm. Interesting.'], argue: ['That is not the Bank\'s view.'], sleep: ['zzz… unchanged… zzz'], moods: {} },
};

export const dlgPrudence = {
  id: 'dlg_prudence',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep, one hand tucked under her cheek; a half-finished scarf on the chair, eight stitches wrong and marked in pencil*'] },
    { if: { firstMeeting: true }, say: ['Good morning, dear. Prudence Tally, chief teller. I should tell you at once that this counter does not do much any more.', 'The Bank has been reorganised: the bond desk is on your left, the rate board on your right, and I count the money that comes in and out of both. Do ask if you are lost.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['There you are, dear! Tea\'s on. The tellers\' tea, I mean — which is bank policy.']] },
    { if: {}, variants: [['Good morning. How may the First Bank help?'], ['Yes, dear? One moment — I\'m totting a column.'], ['Welcome. Mind the step; it has been done by seven customers.']] },
  ],
  farewells: [{ if: {}, variants: [['Good day, dear.'], ['Mind how you go, and mind your purse.']] }],
  topics: [
    { id: 't_pru_counter', label: '"What do you do here?"', keywords: ['do', 'counter', 'teller', 'work', 'job'], say: ['I count, dear. The bonds are bought at the bond desk and the rate is posted on the board, but every obol of it has to be counted by somebody who is not pleased to be wrong, and that is me.', 'And I correct the Governor in pencil. That is unofficial. It is also the most important thing I do.'] },
    { id: 't_pru_safe', label: '"Is my money safe in here?"', keywords: ['safe', 'money', 'vault', 'secure', 'deposit'], say: ['The vault is round, a metre thick and time-locked. Mr Locke stands by it from eight until half past five. I have no reason to think anybody could take a thing from it. I have, also, no reason to say so to a stranger.'] },
    { id: 't_pru_history', label: '"How long have you worked here?"', keywords: ['long', 'years', 'history', 'started'], say: ['Twenty-six years in March. I began on the bond desk when it was a card table with a lamp. We sold three bonds that year and I remember each of them.'] },
  ],
  askPrompt: [['Ask, dear. The counter is quiet.']],
  unknown: [['That one I would have to check, dear.'], ['I haven\'t a notion. Isn\'t that lovely?']],
  gift: gifts('Wildflowers! In a bank! You\'ll have me undone.', 'How thoughtful, dear. Thank you.', 'Thank you. I will put it by the lamp.', 'Oh. Well. It\'s the thought.'),
  barks: { greet: ['Good morning.'], work: ['Seven, eight, nine…', 'Mm, and carry the one.'], chat: ['Is that right?'], argue: ['That is quite wrong, dear.'], sleep: ['…stitch… stitch…'], moods: {} },
};

export const dlgCyrus = {
  id: 'dlg_cyrus',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep, murmuring "a hundred-and-three at par… at par…"*'] },
    { if: { firstMeeting: true }, say: ['Welcome, welcome, welcome! Cyrus Coupon, bond clerk! You are standing at the finest desk in the First Bank — oh, the only desk, but still, THE FINEST.', 'Government bonds: one-year, three-year, five-year, at par, coupons every thirty days, face at the end. Ask me anything. I will answer for forty minutes.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['My favourite customer! I have a five-year with your name on it. Figuratively. They are bearer instruments.']] },
    { if: {}, variants: [['Good day, good day! Interested in a bond?'], ['Ah, a yield enthusiast! Or a lost soul. Either is welcome.'], ['Step up, step up! The three-year has been quite lively.']] },
  ],
  farewells: [{ if: {}, variants: [['Come again when the yields have moved!'], ['Hold to maturity, my friend!']] }],
  topics: [
    { id: 't_cy_bonds', label: '"Tell me about the bonds."', keywords: ['bond', 'bonds', 'buy', 'yield', 'coupon', 'government'], say: ['Three terms: one, three and five years. The coupon is the policy rate plus a premium for the term — and, while a war is on, a little more for the nerves. It is fixed on the day you buy. You get a month\'s coupon every thirty days and the face at the end.', 'Sell any time at what it is worth at today\'s yield, less half a percent. When rates rise, the bond you hold is worth less; when they fall, more. It\'s a see-saw. A government see-saw!'], effects: [open('Bonds')] },
    { id: 't_cy_foreign', label: '"Can I buy other countries\' bonds?"', keywords: ['foreign', 'countries', 'varnistan', 'teshvar', 'caldera', 'sovereign'], say: ['You can, in the tablet — Bonds, down the page — and I can tell you nothing about them, because we do not sell them here. They are rated on their own finances: debt, wars, embargoes, the treasury. A country in trouble for weeks delays its payments, then restructures. Nothing random. Exciting, isn\'t it? Miss Tally says I shouldn\'t say "exciting".'] },
    { id: 't_cy_loan', label: '"Can I borrow against my bonds?"', keywords: ['borrow', 'loan', 'collateral', 'pledge'], say: ['Lariat State Bank will — nine tenths of a government bond\'s value, for you personally. You keep the bond and the coupons. The only catch is you can\'t sell it while you owe more than the rest would secure. Ask Mr Marsh in Lariat; he\'s a lovely man and a slow signer.'] },
  ],
  askPrompt: [['Ask me about yield. Go on. I dare you.']],
  unknown: [['Oh, that one I\'d have to look up! Don\'t tell the Governor.'], ['Not my desk, I\'m afraid!']],
  gift: gifts('A honey bun! You have saved my afternoon and possibly my yield curve.', 'Lovely, thank you!', 'Thank you! I\'ll file it under "thanks".', 'Oh. Well. It\'s very… generous.'),
  barks: { greet: ['Good day!'], work: ['Par, par, par…', 'Three-year, three-year…'], chat: ['Did you know the term premium…'], argue: ['That is NOT how a yield works!'], sleep: ['…at par…'], moods: {} },
};

export const dlgBertram = {
  id: 'dlg_bertram',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep on his back, hands folded, a book of poetry on his chest; he hums, even now*'] },
    { if: { firstMeeting: true }, say: ['Bertram. Guard.', '*nods towards the vault* Nineteen years. Haven\'t looked in it once.'] },
    { if: {}, variants: [['*nods*'], ['Mm.'], ['*hums a bar of something and stops, embarrassed*']] },
  ],
  farewells: [{ if: {}, variants: [['Mm. Mind the step.'], ['*nods*']] }],
  topics: [
    { id: 't_ber_vault', label: '"What\'s in the vault?"', keywords: ['vault', 'inside', 'door', 'safe'], say: ['Don\'t know. Not my job.', 'Round. Thick. Shut. Time-locked. The brass plate says no one is ever alone with it. That\'s why I\'m here. And the Governor. And a clock.'] },
    { id: 't_ber_job', label: '"Nice work if you can get it?"', keywords: ['job', 'work', 'guard', 'boring', 'nineteen'], say: ['It\'s quiet. That\'s the job. If it\'s ever loud, I did it wrong.'] },
    { id: 't_ber_poem', label: '"You read poetry?"', keywords: ['poetry', 'book', 'read', 'poem'], say: ['Evenings. Wasn\'t meant to be known. Miss Tally told. Mm.', 'Don\'t tell Coupon. He\'d want to hear it.'] },
  ],
  askPrompt: [['Mm?']],
  unknown: [['Don\'t know.'], ['Not mine to say.']],
  gift: gifts('Coffee. Mm. Strong. Thank you.', 'Thank you.', 'Mm.', 'Mm. No.'),
  barks: { greet: ['Mm.'], work: ['*hums*'], chat: ['Mm.'], argue: ['Step back.'], sleep: ['…mm…'], moods: {} },
};

export const dlgHollis = {
  id: 'dlg_hollis',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep with a pencil behind his ear and a ledger on the floor, open to a page headed "NOTES — SLOW TO SIGN"*'] },
    { if: { firstMeeting: true }, say: ['Howdy, friend. Hollis Marsh, manager of the Lariat State Bank, est. 1911.', 'We lend to farmers, ranchers and anybody holding shares worth the paper. Against what you hold, at a fixed rate, paid back monthly. I don\'t rush. Neither does the ledger.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['Good to see you, friend. Pull up a chair; there\'s coffee, and I haven\'t signed anything yet.']] },
    { if: {}, variants: [['Howdy. Something I can do for you?'], ['Morning, friend. Loans, deposits, or the weather?'], ['Come on in. The coffee\'s fresh. Clint\'s been at the other pot.']] },
  ],
  farewells: [{ if: {}, variants: [['Come back any time. Bring the rain.'], ['Take care, friend.']] }],
  topics: [
    { id: 't_hol_loans', label: '"How do I get a loan?"', keywords: ['loan', 'loans', 'borrow', 'lend', 'money', 'credit'], say: ['We lend to you personally, against shares and bonds you hold: half the value of shares, nine tenths of a government bond, corporate and foreign bonds by rating. The rate is fixed on the day you sign — the policy rate plus a spread for how much of your limit you use. Pay a month at a time.', 'If you miss one, it\'s arrears at a higher rate. We don\'t take your stock and we don\'t take your land. What we do is not lend you more until you\'re square, and keep you from selling what\'s pledged till the loan is covered.'], effects: [open('Loans')] },
    { id: 't_hol_business', label: '"Do you lend to my companies?"', keywords: ['company', 'business', 'companies', 'firm', 'subsidiary', 'guarantee'], say: ['Yes, if it holds cash of its own. We judge the company on its own books: what it owns and what it\'s earning. You can guarantee a loan for a lower rate — if the company misses, your own record takes a knock. A parent can guarantee a subsidiary the same way. All in writing, before you sign.'], effects: [open('Loans')] },
    { id: 't_hol_fair', label: '"Is it fair? Does anything else count?"', keywords: ['fair', 'record', 'score', 'reputation', 'crime', 'police', 'wanted'], say: ['It\'s fair because it\'s plain. What you hold, what you owe, and whether you pay. Your record with us moves only with how you repay. What you do outside this door — I don\'t ask, and the ledger doesn\'t know.', 'That\'s the whole rule. I\'ve never wanted another.'] },
  ],
  askPrompt: [['Ask away. I\'m slow, not deaf.']],
  unknown: [['Can\'t say, friend. Haven\'t the paperwork.'], ['I\'d have to think on that. A week or so.']],
  gift: gifts('Pecan pie! You\'ve done it. You\'ve bought the bank. Metaphorically.', 'Why, thank you, friend.', 'Appreciate it.', 'Hm. I\'ll… think on it.'),
  barks: { greet: ['Howdy.'], work: ['Let me think on that.', '*turns a page*'], chat: ['Well now.'], argue: ['That, friend, is a poor idea.'], sleep: ['…fixed rate… fixed…'], moods: {} },
};

export const dlgDottie = {
  id: 'dlg_dottie',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep, humming softly; a hymnbook on the night-stand, a pressed wildflower for a bookmark*'] },
    { if: { firstMeeting: true }, say: ['Morning, hon! Dottie Cain, teller. Deposits, withdrawals, change for the pay phone.', 'I count the cotton money twice. Once for the bank. Once for the farmer. Neither of us has ever been short.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['Well hey, you! Pull up a stool. The line\'s just two cows long.']] },
    { if: {}, variants: [['Morning, hon! What can I do you for?'], ['*humming* …oh! Didn\'t see you there.'], ['Step on up. Don\'t mind the humming.']] },
  ],
  farewells: [{ if: {}, variants: [['You take care, hon.'], ['Safe home!']] }],
  topics: [
    { id: 't_dot_work', label: '"What does a teller do here?"', keywords: ['teller', 'work', 'job', 'do', 'counter', 'window'], say: ['Counts. Smiles. Knows whose envelope has cotton on it and whose has cow. I don\'t tell a soul who deposited what — a teller never tells — but I can tell you who needs rain.'] },
    { id: 't_dot_hymn', label: '"What\'s that you\'re humming?"', keywords: ['hum', 'humming', 'hymn', 'song', 'music'], say: ['"Bringing in the Sheaves." Always. I know the cows like it. I\'ve seen one tap a hoof. Well — Chuckie\'s cow tapped a hoof. I\'m not saying she was keeping time.'] },
    { id: 't_dot_hours', label: '"When are you open?"', keywords: ['hours', 'open', 'close', 'closed', 'when'], say: ['Nine to four, hon. Closed for the afternoon after that — Clint puts up the sign himself. Come back at nine and the door\'s open.'] },
  ],
  askPrompt: [['Go on, hon. I\'ve got a minute and a half.']],
  unknown: [['Oh, I wouldn\'t know, hon.'], ['That one\'s above my window.']],
  gift: gifts('Wildflowers! Oh, hon — now I\'ll be humming for a week.', 'Well, thank you, hon!', 'Why, thank you.', 'Hm. Well. Kind of you.'),
  barks: { greet: ['Morning!'], work: ['*hums "Bringing in the Sheaves"*', 'One, two, three…'], chat: ['You don\'t say!'], argue: ['Now hold on a minute, hon.'], sleep: ['…sheaves… sheaves…'], moods: {} },
};

export const dlgClint = {
  id: 'dlg_clint',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep in a rocker, hat over his face, one hand on a revolver that is, thankfully, holstered*'] },
    { if: { firstMeeting: true }, say: ['Clint Brazos. I mind the door.', 'Fifty-one years. No robberies. Don\'t aim to start.'] },
    { if: {}, variants: [['Mornin\'.'], ['*tips hat*'], ['Hm.']] },
  ],
  farewells: [{ if: {}, variants: [['Ride safe.'], ['*tips hat*']] }],
  topics: [
    { id: 't_cli_door', label: '"Does anybody ever try the bank?"', keywords: ['robbery', 'rob', 'robbed', 'thief', 'thieves', 'crime', 'try', 'steal'], say: ['Once in a while somebody looks at the door a while. Then looks at me. Then goes to the diner.', 'Anybody who tries it is a fool and a bad shot, and I\'d rather be neither. Don\'t take it as advice.'] },
    { id: 't_cli_sheriff', label: '"Were you really a deputy?"', keywords: ['deputy', 'sheriff', 'law', 'badge', 'past'], say: ['Thirty years. Gave the badge back the day I took this job. Kept the coat.'] },
    { id: 't_cli_coffee', label: '"What about that coffee?"', keywords: ['coffee', 'pot', 'drink'], say: ['Black. A lot of it. Mr Marsh moves the pot. I find it.'] },
  ],
  askPrompt: [['Hm?']],
  unknown: [['Wouldn\'t know.'], ['Not my business.']],
  gift: gifts('Coffee. Black. Thank you, son.', 'Much obliged.', 'Hm. Thanks.', 'Hm. Don\'t much care for it.'),
  barks: { greet: ['Mornin\'.'], work: ['*watches the door*'], chat: ['Hm.'], argue: ['Back up.'], sleep: ['…zzz…'], moods: {} },
};

export default [dlgAugustus, dlgPrudence, dlgCyrus, dlgBertram, dlgHollis, dlgDottie, dlgClint];
