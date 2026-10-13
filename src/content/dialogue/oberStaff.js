// Dialogue for the ten Ober's Oil employees. Each voice is distinct; each has
// at least one hook into a system (invitation, shares, shifts, the mystery,
// the strike, gossip, the feud).
import { USEFUL } from './moneybucks.js';

const basicGift = (loved, liked, neutral, disliked) => ({
  loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]],
  tooMany: [['That\'s plenty, really.']], ownStolen: [['Hey — that one\'s mine.']],
});

export const dlgCrisp = {
  id: 'dlg_crisp',
  greetings: [
    { if: { firstMeeting: true }, say: ['Good day. Bartholomew Crisp, butler to Sir Moneybucks. May I ask the nature of your business — and whether it is the kind of business one wipes one\'s feet for?'] },
    { if: { activity: 'polish' }, say: ['Forgive me. The silver does not polish itself. Sir Moneybucks has asked it to, repeatedly.'] },
    { if: { rel: { trust: '>=25' } }, variants: [['Ah, it\'s you. A pleasure, and I do not say that to everyone. I do not say that to anyone, as a rule.']] },
    { if: {}, variants: [['Good day.'], ['May I help you? I ask professionally, not personally.'], ['The house is, as ever, at Sir Moneybucks\'s disposal. As am I. Regrettably.']] },
  ],
  farewells: [{ if: {}, variants: [['Good day.'], ['Mind the step. It is older than I am. Barely.']] }],
  topics: [
    {
      id: 't_crisp_invite', label: '"I\'d like to call on Sir Moneybucks."', tag: 'quest', keywords: ['call', 'visit', 'invite', 'manor', 'house', 'in'],
      if: { notFlag: 'manor_invited' },
      say: ['Callers are received by invitation. Invitations are extended to persons of means or of business.'],
      choices: [
        {
          id: 'c_crisp_business', label: '"I\'m a person of business." (Show your standing)',
          require: USEFUL,
          lockedHint: 'Crisp admits people of means or business: 40+ obols in wealth, a refinery job, or Ober\'s Oil shares.',
          say: ['Very good. Your name is entered in the book of callers. The house receives from eight in the morning until nine at night. Do knock. Sir Moneybucks dislikes surprises, unless he is the one causing them.'],
          effects: [{ flag: { manor_invited: true } }, { rel: { respect: 2 } }],
        },
        {
          id: 'c_crisp_tip', label: 'Slip him 10 obols.',
          if: { money: '>=10' },
          say: ['…I see nothing. I have seen nothing for thirty years.', 'Your name appears to be in the book of callers. How fortunate. Eight until nine.'],
          effects: [{ money: -10 }, { flag: { manor_invited: true } }, { rel: { trust: 3 } }, { memory: { text: 'Accepted a gratuity from the newcomer. Entered in the other ledger.', tag: 'tip', importance: 4 } }],
        },
      ],
    },
    {
      id: 't_crisp_master', label: '"What\'s it like, working for Sir Moneybucks?"', keywords: ['moneybucks', 'master', 'work', 'job'],
      say: [
        'An honour.',
        { if: { rel: { trust: '<20' } }, text: 'That is the entire answer, and I shall be giving it again if asked again.' },
        { if: { rel: { trust: '>=20' } }, text: '…Between us. I keep a ledger. Every slight, every "hat stand", every soufflé he blamed on me that was in fact Mrs. Quince\'s. Four thousand one hundred and six entries. One day the books will balance.', effects: [{ learn: 'fact_crisp_insult_ledger' }] },
      ],
    },
    {
      id: 't_crisp_house', label: '"Tell me about the household."', keywords: ['household', 'staff', 'house'],
      say: ['Mrs. Quince runs the kitchen with an iron ladle. Miss Thornbury keeps the books in the study. Mr. Grimmer keeps the gate, and the peace, and occasionally the opposite of the peace.', 'And I keep everything else.'],
    },
  ],
  askAbout: [
    { keywords: ['vault', 'safe'], say: ['There is a vault in the study. It is locked. I have never been curious about it. Professionally.'] },
    { keywords: ['agnes', 'thornbury'], say: ['Miss Thornbury is the only person in this house who says thank you. I have entered her in the other ledger. The good one.'] },
  ],
  unknown: [['I could not say.'], ['That is beyond my purview.']],
  gift: basicGift('How very kind. I shall put these in a vase Sir Moneybucks will not notice.', 'Thank you. Truly.', 'Ah. Thank you.', 'I shall dispose of it discreetly.'),
  barks: { greet: ['Good day.', 'Wipe your feet.'], work: ['Callers by invitation.', 'Everything in its place.'], polish: ['Polish, polish.'], sleep: ['…the hat stand… *snore*'], chat: ['Indeed.', 'Quite so.', 'One hears things.'], argue: ['I beg your pardon.'] },
};

export const dlgAgnes = {
  id: 'dlg_agnes',
  greetings: [
    { if: { firstMeeting: true }, say: ['Agnes Thornbury. Secretary, bookkeeper, and the reason anything at Ober\'s Oil adds up. Are you here about shares, wages, or a complaint? Complaints are a separate queue. It does not move.'] },
    { if: { recalls: { tag: 'caught_snooping', withinMinutes: 2880 } }, say: ['You were reading my ledgers. Don\'t. I count the pages.'] },
    { if: { rel: { trust: '>=25' } }, variants: [['Oh — hello. Sit, if you like. Nobody sits with me. They\'re afraid I\'ll tell them how much they owe.']] },
    { if: {}, variants: [['Yes? Make it quick, I\'m mid-column.'], ['Good day. Accounts, shares, or trouble?']] },
  ],
  farewells: [{ if: {}, variants: [['Good day.'], ['Mind how you go. And how you spend.']] }],
  topics: [
    {
      id: 't_agnes_shares', label: '"I\'d like to buy shares."', tag: 'quest', keywords: ['shares', 'invest', 'stock'],
      say: [
        { if: { map: 'manor' }, text: 'Shares are priced each evening at six from actual output. Dividends paid the same hour. I keep the register; it is accurate. That is more than I can say for the rest of the building.', effects: [{ action: 'invest' }] },
        { if: { not: { map: 'manor' } }, text: 'The share register is in the study. Come by during office hours — half eight to half five.' },
      ],
    },
    {
      id: 't_agnes_books', label: '"What\'s really in the company books?"', keywords: ['books', 'ledger', 'accounts'],
      say: ['Figures. Accurate ones. Rarer than you\'d think.', { if: { rel: { trust: '>=15' } }, text: 'Wages "deferred". Safety "deferred". Cigars, paid promptly. You draw your own conclusions; I only draw columns.', effects: [{ learn: 'fact_workers_grievances' }] }],
    },
    {
      id: 't_agnes_m', label: '"I\'m trying to find out who \'M.\' was."', tag: 'quest', keywords: ['m.', 'seal', 'harbourmaster', 'auction'],
      if: { playerKnows: 'fact_keeper_log', not: { playerKnows: 'fact_moneybucks_bought_seal' }, notFlag: 'agnes_refused_today' },
      say: ['…Why are you asking me?'],
      choices: [
        {
          id: 'c_agnes_truth', label: '"Someone darkened that lighthouse with a stolen seal. Your books could prove who."',
          check: { stat: 'charm', base: 0.35, relScale: { trust: 0.01, affection: 0.004 }, mods: [{ if: { playerKnows: 'fact_harbourmaster_seal' }, add: 0.15 }] },
          say: [
            '…Lot fourteen. Twelve years ago. "Harbourmaster\'s seal and effects." Paid. Authorised R.E.M.',
            'I copied the page the week I started. I don\'t know why. Yes I do. Take it. If anyone asks, I was adding.',
            { if: { rel: { trust: '>=20' } }, text: 'And — a crate came in that same month. "Lighthouse, effects." It went into the vault in the study. It hums. Don\'t tell anyone I said it hums.', effects: [{ learn: 'fact_lens_in_vault' }] },
          ],
          effects: [{ give: 'item_ledger_page' }, { learn: 'fact_moneybucks_bought_seal' }, { learn: 'fact_night_tankers' }, { rel: { trust: 5 } }, { memory: { text: 'Gave the newcomer the Lot 14 page. No going back.', tag: 'gave_page', importance: 9 } }],
          fail: { say: ['I have a position. I intend to keep it. Good day.'], effects: [{ flag: { agnes_refused_today: '$day' } }, { rel: { trust: -2 } }] },
        },
      ],
    },
    {
      id: 't_agnes_vault', label: '"Is there a way into the vault?"', tag: 'quest', keywords: ['vault', 'key'],
      if: { playerKnows: 'fact_lens_in_vault', rel: { trust: '>=25' }, not: { hasItem: 'item_vault_key' }, notFlag: 'agnes_gave_key' },
      say: ['…I keep a copy of everything. It is a professional failing.', 'Here. If anyone asks, you found it in a bun.'],
      effects: [{ give: 'item_vault_key' }, { flag: { agnes_gave_key: true } }, { memory: { text: 'Gave the newcomer my copy of the vault key.', tag: 'gave_key', importance: 9 } }],
    },
  ],
  askAbout: [
    { keywords: ['otto', 'union'], say: ['Mr. Brandt reads his contract. That alone makes him dangerous, apparently.'] },
    { keywords: ['dividend', 'price'], say: ['Price: twenty, plus an eighth of a barrel-day, minus a little panic. Dividends: one obol per share per hundred barrels. It is all in the register.'] },
  ],
  unknown: [['I don\'t have a column for that.'], ['Not in my books.']],
  gift: basicGift('Flowers. For me. Nobody… thank you.', 'Oh, that\'s thoughtful. Thank you.', 'Thank you. I\'ll — log it.', 'I\'ll put that somewhere. Away.'),
  barks: { greet: ['Good day.', 'Mid-column, sorry.'], work: ['Carry the two…', 'That does not add up.', 'Deferred. Deferred. Paid.'], leisure: ['Fresh air. Unaudited.'], sleep: ['…balance… *snore*'], chat: ['Off the record…', 'The figures say otherwise.'], argue: ['Check your arithmetic!'] },
};

export const dlgGideon = {
  id: 'dlg_gideon',
  greetings: [
    { if: { firstMeeting: true }, say: ['Gideon Slate, foreman. You\'re either here to work or in the way. Which?'] },
    { if: { oil: { strike: true } }, say: ['Line\'s dead. Half my crew\'s at the gate with signs. I\'m not on either side. I\'m on the side of the stopwatch.'] },
    { if: { quest: { id: 'job_refinery_shift', stage: 'report' } }, say: ['Finished? Let\'s see the work.'] },
    { if: {}, variants: [['Clock\'s running.'], ['What?'], ['Make it quick. Every minute\'s a barrel.']] },
  ],
  farewells: [{ if: {}, variants: [['Back to it.'], ['Six sharp tomorrow.']] }],
  topics: [
    {
      id: 't_gideon_job', label: '"Any work going?"', tag: 'quest', keywords: ['work', 'job', 'shift', 'hire'],
      if: { not: { quest: { id: 'job_refinery_shift', state: 'active' } } },
      say: [
        { if: { oil: { strike: true } }, text: 'During a strike? You\'d be crossing a picket line. Your funeral. Literally, if Hank sees you.' },
        { if: { jobDoneToday: 'job_refinery_shift' }, text: 'You\'ve done your shift. Come back tomorrow.' },
        { if: { not: { jobDoneToday: 'job_refinery_shift' }, time: { from: '14:00', to: '06:00' } }, text: 'Shift\'s over. Six sharp tomorrow, and not a minute after.' },
        {
          if: { not: { jobDoneToday: 'job_refinery_shift' }, time: { from: '06:00', to: '14:00' }, oil: { strike: false } },
          text: 'Day labour. Three jobs: valve bank, gauge panel, barrel line. Do \'em, report to me, get paid. Five obols. Don\'t argue, it\'s in the contract. The contract also says I can dock you for arguing.',
          effects: [{ quest: { id: 'job_refinery_shift', start: true } }, { flag: { refinery_hired: true } }],
        },
      ],
    },
    {
      id: 't_gideon_report', label: '"Shift\'s done."', tag: 'quest', keywords: ['done', 'finished', 'report', 'pay'],
      if: { quest: { id: 'job_refinery_shift', stage: 'report' } },
      say: [
        'Valves, gauges, barrels. All done. Huh.',
        { if: { flagToday: 'shift_corners_day' }, text: 'Quick, too. Quicker than proper. I won\'t ask. Bonus for speed — company policy. Calder\'ll have opinions.' },
        { if: { not: { flagToday: 'shift_corners_day' } }, text: 'Done right, too. Don\'t let it go to your head.' },
      ],
      effects: [{ payWages: true }, { quest: { id: 'job_refinery_shift', complete: 'paid' } }, { rel: { respect: 2 } }],
    },
    {
      id: 't_gideon_store', label: '"What\'s in the company store?"', keywords: ['store', 'buy', 'shop'],
      if: { map: 'refinery' },
      say: ['Coffee, bandages, the boss\'s cigars. Prices set by head office. Head office is upstairs in a top hat.'],
      effects: [{ openShop: 'shop_company' }],
    },
    {
      id: 't_gideon_otto', label: '"What do you make of Otto?"', keywords: ['otto', 'brandt', 'union'],
      say: ['Good fitter. Talks too quiet, to too many people. When a man talks quiet, he\'s planning loud.'],
    },
  ],
  askAbout: [{ keywords: ['wages', 'scrip'], say: ['Wages are paid. Partly. In scrip. Don\'t look at me like that, I don\'t set them.'] }],
  unknown: [['No idea. Not my department.'], ['Ask someone on salary.']],
  gift: basicGift('One of the boss\'s Imperials! Don\'t tell him.', 'Ta.', 'Uh. Ta.', 'What am I supposed to do with that?'),
  barks: { greet: ['Clock\'s running.', 'Shift starts at six.'], work: ['Move it, move it.', 'That\'s a barrel you\'re not filling.', 'Breaks are a state of mind.'], eat: ['Five minutes. Four.'], sleep: ['…six sharp… *snore*'], chat: ['Hm.', 'Production\'s up.', 'Production\'s down.'], argue: ['Docking you for that!'] },
};

export const dlgRuby = {
  id: 'dlg_ruby',
  greetings: [
    { if: { firstMeeting: true }, say: ['Ruby Calder, engineer. Rule one: don\'t touch anything red. Rule two: everything here is red eventually.'] },
    { if: { knows: 'fact_player_cut_corners', notFlag: 'ruby_corners_discussed' }, say: ['You cut corners on my floor. People lose fingers that way. Mine are spoken for.'] },
    { if: { oil: { strike: true } }, say: ['We\'re out. Not my call alone — but I\'m not crossing it either.'] },
    { if: { mood: 'flustered' }, say: ['Not now — that column nearly took the roof off. Everybody\'s fine. This time.'] },
    { if: {}, variants: [['Goggles on, or go away.'], ['Column\'s holding. For now. What do you need?']] },
  ],
  farewells: [{ if: {}, variants: [['Count your fingers on the way out.'], ['Stay off the red pipes.']] }],
  topics: [
    {
      id: 't_ruby_safety', label: '"Is this place safe?"', keywords: ['safe', 'safety', 'accident', 'risk'],
      say: [
        'Define safe. Define place.',
        { if: { oil: { risk: '>=2' } }, text: 'Honestly? No. Too many shortcuts lately. Something\'s going to give. If you\'ve got money in this outfit, fund a safety refit before it gives on its own.' },
        { if: { oil: { risk: '<2' } }, text: 'Right now? Holding. Keep corners square and valves bled and it stays that way.' },
      ],
    },
    {
      id: 't_ruby_corners', label: '"About the corners I cut…"', keywords: ['corners', 'sorry'],
      if: { knows: 'fact_player_cut_corners', notFlag: 'ruby_corners_discussed' },
      say: ['Go on.'],
      choices: [
        { id: 'c_ruby_sorry', label: '"It was stupid. I\'ll do it properly."', check: { stat: 'charm', base: 0.55 }, say: ['…Fine. Everyone\'s stupid once. Twice is a pattern.'], effects: [{ rel: { trust: 6 } }, { flag: { ruby_corners_discussed: true } }], fail: { say: ['Words are cheap. Show me.'], effects: [{ flag: { ruby_corners_discussed: true } }] } },
        { id: 'c_ruby_bonus', label: '"Gideon pays a bonus for speed."', say: ['Gideon pays a bonus for speed because Gideon doesn\'t stand next to the column.'], effects: [{ rel: { respect: -3 } }, { flag: { ruby_corners_discussed: true } }] },
      ],
    },
    {
      id: 't_ruby_otto', label: '"You and Otto are close?"', keywords: ['otto', 'brandt'],
      say: ['Otto\'s the best fitter on the coast and the only one who reads the contracts. If he ever asks the crew to stand up, I\'ll be standing.'],
    },
  ],
  askAbout: [{ keywords: ['column', 'distillation'], say: ['Column cracks crude into things people buy. If it cracks, it cracks us into things people sweep.'] }],
  unknown: [['Not my area.'], ['Ask Delphine. She knows weird things.']],
  gift: basicGift('Oh, proper kit. Thanks.', 'Ta, that\'s kind.', 'Thanks, I guess.', 'What would I do with that?'),
  barks: { greet: ['Goggles!', 'Mind the red pipes.'], work: ['Pressure\'s up…', 'Who left this valve open?', 'Not today, column.'], picket: ['Fair pay!', 'We built it, we can stop it.'], sleep: ['…bleed the valves… *snore*'], chat: ['Heard that.', 'Pressure\'s fine. People aren\'t.'], argue: ['Do it properly!'] },
};

export const dlgHank = {
  id: 'dlg_hank',
  greetings: [
    { if: { firstMeeting: true }, say: ['HANK DORSEY. Derrick rigger, wrestler of pipes, survivor of the Great Gusher of Thornmonth! You\'ll have heard of me. If not — you\'re about to.'] },
    { if: { activity: 'fish' }, variants: [['Shh! They\'re biting. They\'re not biting. Hi!'], ['Tibbs reckons fish can hear you. I reckon fish can hear HIM.']] },
    { if: { oil: { strike: true } }, say: ['Downed tools! First time in nine years I\'ve had my hands empty. Feels weird. Feels good.'] },
    { if: {}, variants: [['Hoo! Hello there!'], ['You look like someone who appreciates a story.'], ['Mind the derrick, she kicks.']] },
  ],
  farewells: [{ if: {}, variants: [['See you on the rigs!'], ['Go on, I\'ve got a pipe to wrestle.']] }],
  topics: [
    {
      id: 't_hank_tales', label: '"Got any stories?"', keywords: ['story', 'stories', 'tale', 'gusher'],
      variants: [
        ['The Great Gusher! Derrick No. 1 blew so high it rained crude on Obermere for a week. The boss had it bottled and sold it back to \'em as "Authentic Weather".'],
        ['There\'s a shark in the number two tank. Big one. Oil shark. Pip\'s seen it. Pip hasn\'t seen it. Pip believes it, which is the same thing.'],
        [
          'Back when I crewed the tankers — night runs across the bay — we sailed with every lamp out. Boss\'s orders. "Lighthouse ain\'t looking," he\'d say. Funny thing to say about a lighthouse.',
          { text: '…Huh. It was dark, too. The lighthouse. Every night we ran. Funny that.', if: {}, effects: [{ learn: 'fact_night_tankers' }] },
        ],
      ],
    },
    {
      id: 't_hank_tibbs', label: '"You know Tibbs?"', keywords: ['tibbs', 'fishing'],
      say: ['Tibbs! Best fishing buddy a man could want. Never catches anything. Neither do I. It\'s perfect.', 'He\'d make a fortune on the rigs. Boss keeps asking about him. I keep saying Tibbs has "creative differences" with authority.'],
    },
  ],
  askAbout: [
    { keywords: ['tanker', 'tankers', 'night'], say: ['Night runs, lamps out, pay in cash. Best money I ever made and the worst sleep I ever had.'], effects: [{ learn: 'fact_night_tankers' }] },
    { keywords: ['shark'], say: ['IT\'S REAL.'] },
  ],
  unknown: [['Never heard of it! Sounds made up. And I\'d know.'], ['Ha! No idea.']],
  gift: basicGift('FOOD! You beautiful soul.', 'Ta, mate!', 'Huh! Thanks!', 'I\'ll… use it as bait.'),
  barks: { greet: ['HOO!', 'Hello there!'], work: ['Heave!', 'She\'s gushing!', 'Mind your heads!'], fish: ['Here fishy.', 'That\'s a nibble. That\'s a rock.'], picket: ['Pay up, Moneybucks!', 'Not one barrel!'], sleep: ['…oil shark… *snore*'], chat: ['Now I swear this is true—', 'HA!', 'You won\'t believe this.'], argue: ['Say that to my derrick!'] },
};

export const dlgPip = {
  id: 'dlg_pip',
  greetings: [
    { if: { firstMeeting: true }, say: ['Hi! I\'m Pip! I\'m an apprentice! One day I\'ll be just like Sir Moneybucks! Except nicer! He says nice is for poor people, but I\'ll be rich AND nice. Is that allowed?'] },
    { if: { oil: { strike: true } }, say: ['Everyone stopped working! Hank says it\'s brave. Sir Moneybucks says it\'s theft. I\'m holding a sign but I can\'t read what it says.'] },
    { if: {}, variants: [['Hi! Hi!'], ['Did you know the boss has a vault that HUMS?'], ['I\'m running a message! It\'s very important! I forgot what it is!']] },
  ],
  farewells: [{ if: {}, variants: [['Bye! Good luck!'], ['See you! Don\'t tell Gideon I stopped!']] }],
  topics: [
    {
      id: 't_pip_dream', label: '"What do you want to do with your life?"', keywords: ['dream', 'future', 'rich'],
      say: ['Own a derrick! Then two derricks! Then a top hat! Sir Moneybucks started with ONE hole in a cabbage field. I\'ve got lots of holes. In my socks. It\'s a start!'],
    },
    {
      id: 't_pip_vault', label: '"A vault that hums?"', keywords: ['vault', 'hum', 'humming'],
      say: ['I took a message to the study once and I put my ear on the vault — don\'t tell — and it went "mmmmmm". Like a big glass bell thinking.', 'Hank says it\'s a ghost. Delphine says ghosts don\'t resonate. I don\'t know what resonate means but I think it\'s scarier.'],
    },
  ],
  askAbout: [{ keywords: ['moneybucks', 'boss'], say: ['He\'s the greatest man alive! He told me so himself!'] }],
  unknown: [['I don\'t know! Should I know? Oh no.'], ['No idea! Sorry!']],
  gift: basicGift('FOR ME? Nobody gives me things! I\'m keeping it forever! Or eating it!', 'Wow, thanks!', 'Ooh! What is it?', 'Oh! Um. Thank you anyway!'),
  barks: { greet: ['Hi!', 'Hello!'], work: ['Barrel! Barrel! Barrel!', 'Message coming through!'], leisure: ['One day…', 'Top hat. Monocle. Me.'], picket: ['Um. Fair… pay?'], sleep: ['…my derrick… *snore*'], chat: ['Really?!', 'Wow!', 'Can I tell people?'], argue: ['That\'s not fair!'] },
};

export const dlgDelphine = {
  id: 'dlg_delphine',
  greetings: [
    { if: { firstMeeting: true }, say: ['Delphine Moreau. Chemist. You are standing in my light, and also in my sample of naphtha.'] },
    { if: { hasItem: 'item_lens_shard', not: { playerKnows: 'fact_shard_matches' } }, say: ['…What are you carrying? Something in your pocket is resonating at a frequency I have never measured. Show me.'] },
    { if: {}, variants: [['Yes?'], ['Be brief. Be precise. Preferably both.'], ['I am observing a reaction. It is more interesting than you. No offence is intended. Some is implied.']] },
  ],
  farewells: [{ if: {}, variants: [['Close the door. Gently. Things are volatile.'], ['Goodbye.']] }],
  topics: [
    {
      id: 't_delphine_shard', label: '"Can you look at this glass shard?"', tag: 'quest', keywords: ['shard', 'glass', 'lens'],
      if: { hasItem: 'item_lens_shard' },
      say: [
        'Fresnel ridges. Annealed crown glass. Old. And it hums when light falls on it — a sympathetic vibration, as if it were part of something larger that is still… ringing.',
        'Here is the interesting part. When I held it by the north window, toward the manor, the pitch rose. Sympathy needs a partner. Its partner is close. In the manor, if I had to guess, and I never guess.',
      ],
      effects: [{ learn: 'fact_shard_matches' }, { learn: 'fact_lens_missing' }, { rel: { respect: 5, affection: 3 } }],
      repeat: [['As I said: its partner is in the manor. I would very much like to meet it.']],
    },
    {
      id: 't_delphine_work', label: '"What do you do here?"', keywords: ['lab', 'chemist', 'work'],
      say: ['I turn crude into twenty-seven useful substances and three useless ones that Sir Moneybucks sells as "tonic".', 'He funds the lab. In exchange, I don\'t ask what the money is for. It is an arrangement that works perfectly until it doesn\'t.'],
    },
  ],
  askAbout: [{ keywords: ['moneybucks'], say: ['He is a reagent that turns everything it touches into money and smoke.'] }],
  unknown: [['Insufficient data.'], ['I do not speculate.']],
  gift: basicGift('Coffee. Correctly black. You are less irrelevant than I assumed.', 'Acceptable.', 'Hm.', 'Inert. Like most gifts.'),
  barks: { greet: ['Mm.', 'Step back.'], work: ['Fascinating.', 'Do not inhale.', 'Note: smells of pennies.'], leisure: ['The fountain is dry. Like most metaphors.'], sleep: ['…titration… *snore*'], chat: ['Empirically, no.', 'Interesting.'], argue: ['That is chemically illiterate.'] },
};

export const dlgSilas = {
  id: 'dlg_silas',
  greetings: [
    { if: { firstMeeting: true }, say: ['Silas Grimmer. Security. You\'re on Ober\'s Oil land. Keep your hands where they can earn.'] },
    { if: { activity: 'strikebreak' }, say: ['Busy. Move.'] },
    { if: { recalls: { tag: 'saw_player_refinery', withinMinutes: 1440 } }, say: ['Saw you in the refinery. I see a lot.'] },
    { if: {}, variants: [['What.'], ['Moving along?'], ['Gate\'s open. That doesn\'t mean you\'re welcome.']] },
  ],
  farewells: [{ if: {}, variants: [['Go.'], ['I\'ll be watching.']] }],
  topics: [
    {
      id: 't_silas_gate', label: '"Can I come onto the estate?"', keywords: ['gate', 'estate', 'enter', 'in'],
      say: ['Grounds are open to the public between rich and very rich. You can walk the fields. Touch nothing. The manor\'s by invitation — that\'s Crisp\'s problem, not mine.'],
    },
    {
      id: 't_silas_boss', label: '"What\'s Sir Moneybucks like to work for?"', keywords: ['moneybucks', 'boss'],
      say: ['Clear instructions. Paid on time. I don\'t ask questions.', { if: { rel: { trust: '>=15' } }, text: '…He forgets my name, though. Thirty-one times this year. I counted.' }],
    },
  ],
  askAbout: [{ keywords: ['otto', 'union', 'strike'], say: ['I watch Brandt. Brandt knows I watch Brandt. It\'s a relationship.'] }],
  unknown: [['No.'], ['Don\'t know. Don\'t care.']],
  gift: basicGift('…Imperial. Huh. Thanks.', 'Hm. Thanks.', 'What\'s this for?', 'No.'),
  barks: { greet: ['What.', 'Move along.'], work: ['Hands visible.', 'Private property.'], patrol: ['All quiet.', 'Tanks secure.'], strikebreak: ['Back to work. Now.', 'Break it up.'], sleep: ['…watching… *snore*'], chat: ['Hm.', 'Noted.'], argue: ['Try it.'] },
};

export const dlgMabel = {
  id: 'dlg_mabel',
  greetings: [
    { if: { firstMeeting: true }, say: ['Mabel Quince, cook to Sir Moneybucks and three-time runner-up in the Harbour Fair bake-off. RUNNER-UP. Robbed. Have you eaten? You look like you\'ve been eating at the Kettle & Crumb. It shows.'] },
    { if: { activity: 'socialize' }, variants: [['Look at her. Mags Pell. Serving those buns like she invented flour.'], ['I\'m not glaring. This is my resting face. It rests on her.']] },
    { if: {}, variants: [['Out of my kitchen unless you\'re here to compliment it.'], ['Ooh, a visitor! Sit. Gossip. Eat.'], ['Did you hear about the soufflé? Nobody heard about the soufflé.']] },
  ],
  farewells: [{ if: {}, variants: [['Off you go, dear. Don\'t eat at the café.'], ['Ta-ra! Mind the gravy.']] }],
  topics: [
    {
      id: 't_mabel_mags', label: '"What\'s the feud with Mags?"', keywords: ['mags', 'feud', 'bake', 'fair'],
      say: [
        'Nine years ago, Harbour Fair, final round. My plum-and-cardamom twist against her "humble honey bun". The judges were bribed. With buns. HER buns.',
        'I have not spoken to Marguerite Pell since. I stand outside her café every afternoon not speaking to her. Very pointedly.',
      ],
      effects: [{ learn: 'fact_mabel_mags_feud' }],
    },
    {
      id: 't_mabel_gossip', label: '"Any gossip from the manor?"', keywords: ['gossip', 'manor', 'news'],
      variants: [
        ['The study hums at night. Crisp says it\'s the pipes. Crisp knows it isn\'t the pipes.'],
        ['Sir Moneybucks sent back my soufflé and then asked for seconds. That\'s men for you. Rich ones especially.'],
        ['Miss Thornbury\'s been working late with her door shut. A woman doesn\'t shut a door on figures unless the figures are scandalous.'],
      ],
    },
  ],
  askAbout: [{ keywords: ['vault', 'hum'], say: ['Haunted, I say. Something sad in there. Glassy-sad. Don\'t ask me how I know what glassy-sad sounds like.'] }],
  unknown: [['Haven\'t heard, dear. Yet.'], ['Ooh, no idea. Tell me when you find out!']],
  gift: basicGift('Flowers! Oh, you dear thing. Mags never got flowers like these.', 'How sweet! Ta!', 'Oh. Ta.', 'Is this from the CAFÉ? Get it out.'),
  barks: { greet: ['Hello, dear!', 'Mind the gravy!'], work: ['Stir, stir.', 'Who touched my stockpot?'], socialize: ['Hmph.', 'Look at her buns. LOOK at them.'], sleep: ['…runner-up… *snore*'], chat: ['Well!', 'You didn\'t hear it from me.', 'Ooh!'], argue: ['Shop-bought! SHOP-BOUGHT!', 'Your buns were bribed!'] },
};

export const dlgOtto = {
  id: 'dlg_otto',
  greetings: [
    { if: { firstMeeting: true }, say: ['Otto Brandt. Pipe fitter. I fix leaks. In pipes, and sometimes in other places.'] },
    { if: { knows: 'fact_player_broke_strike' }, say: ['You helped Grimmer clear the gate. I won\'t forget. I won\'t make a fuss either. I\'ll just not forget.'] },
    { if: { oil: { strike: true } }, say: ['We\'re out. Every hand. Nobody works until the back pay\'s paid. It\'s quiet, isn\'t it? Sounds like fairness.'] },
    { if: {}, variants: [['Evening.'], ['Mind the pipes. Mind the people, too.'], ['You look like you\'re asking questions. Good. Ask the right ones.']] },
  ],
  farewells: [{ if: {}, variants: [['Take care.'], ['Look after each other.']] }],
  topics: [
    {
      id: 't_otto_wages', label: '"How are the wages here?"', keywords: ['wages', 'pay', 'scrip'],
      say: ['Three months owed. Half of what\'s paid is company scrip, good only at the company store, where coffee costs four obols.', 'Moneybucks owes forty families. He can afford a gold monocle.'],
      effects: [{ learn: 'fact_workers_grievances' }],
    },
    {
      id: 't_otto_union', label: '"Is that a blue thread on your cuff?"', keywords: ['thread', 'union', 'blue', 'organising', 'organizing'],
      say: [
        { if: { rel: { trust: '<15' } }, text: 'It\'s a thread. On a cuff. Plenty of those about.' },
        { if: { rel: { trust: '>=15' } }, text: '…It means the person wearing it knows other people wearing it. That\'s all a union is, at first. People who know each other.', effects: [{ learn: 'fact_otto_organizing' }] },
        { if: { rel: { trust: '>=15' }, oil: { morale: '<40' } }, text: 'We\'re close. One more bad day and we stand up.' },
      ],
    },
    {
      id: 't_otto_strike', label: '"How can I help the strike?"', tag: 'quest', keywords: ['strike', 'help', 'fund'],
      if: { oil: { strike: true } },
      say: ['Help? Most people want to know when it\'s over.'],
      choices: [
        {
          id: 'c_otto_fund', label: 'Give 20 obols to the strike fund.',
          require: { money: '>=20' }, lockedHint: 'You need 20 obols.',
          say: ['That feeds four families for a week. Thank you. They\'ll know your name — for the right reasons.'],
          effects: [{ money: -20 }, { npcLearn: 'fact_player_backed_strike' }, { oil: { add: { morale: 8 } } }, { memory: { text: '{player} gave to the strike fund.', tag: 'strike_fund', importance: 7 } }],
        },
        {
          id: 'c_otto_back', label: '"Go back to work. You can\'t win this."',
          check: { stat: 'charm', base: 0.3, relScale: { trust: 0.008 } },
          say: ['…Maybe not today. We\'ll go back. But we\'re wearing the thread now, openly.'],
          effects: [{ oil: { set: { strike: false }, add: { morale: 5 } } }, { flag: { refinery_strike: false } }, { rel: { trust: -3 } }],
          fail: { say: ['Can\'t win? We built every barrel he owns. We\'ve already won. He just hasn\'t been told.'], effects: [{ rel: { respect: -2 } }] },
        },
        { id: 'c_otto_nothing', label: '"I just wanted to know how it\'s going."', say: ['Slowly. Fairly. Like most good things.'] },
      ],
    },
  ],
  askAbout: [{ keywords: ['collective', 'quay'], say: ['The Quay Collective has been at it longer than us. We meet by the water. They teach; we learn.'] }],
  unknown: [['Can\'t say I know.'], ['Not something I\'ve fitted a pipe to.']],
  gift: basicGift('Coffee, proper coffee, not company coffee. Thank you.', 'That\'s good of you.', 'Thanks.', 'Scrip? Keep it. It\'s worth what it\'s printed on.'),
  barks: { greet: ['Evening.', 'Mind yourself.'], work: ['Tighten. Check. Tighten.', 'Leak at joint six.'], picket: ['Back pay first!', 'Every barrel, every hand.'], socialize: ['Quiet now…', 'Pass it on.'], sleep: ['…solidarity… *snore*'], chat: ['Between us—', 'Pass it on.', 'Patience.'], argue: ['We built it!'] },
};

export default [dlgCrisp, dlgAgnes, dlgGideon, dlgRuby, dlgHank, dlgPip, dlgDelphine, dlgSilas, dlgMabel, dlgOtto];
