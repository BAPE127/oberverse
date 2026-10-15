// Lariat (v0.29.0): Farmer Chuckie and the townsfolk. Chuckie's lines follow
// the lead-cow quest (q_lost_herd): the problem, the lasso, where the girls
// were last seen (only the ones still loose), the round-up, and afterwards.
// Effects { dairy: … } go to src/systems/dairy.js; { panel: { name: 'exchange' } }
// opens the stock exchange on Chuckie's Cheese.
const Q = 'q_lost_herd';
const notStarted = { quest: { id: Q, state: 'not_started' } };
const active = { quest: { id: Q, state: 'active' } };
const done = { quest: { id: Q, state: 'completed' } };
const loose = (id) => ({ dairy: { cow: id, status: 'loose' } });

const basicGift = (loved, liked, neutral, disliked) => ({
  loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]],
  tooMany: [['That\'s plenty, hon. Really.']], ownStolen: [['Hey now — that\'s mine.']],
});

export const dlgChuckie = {
  id: 'dlg_chuckie',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*from under the cow quilt* …Bessie… no, Bessie, that\'s a pie… *snore*'] },
    { if: done, variants: [['Partner! The hero of Lariat! The girls ask after you, you know. Well — Duchess asks if you\'re a government agent. Same thing, from her.'], ['Milk\'s up, cheese is up, and my blood pressure\'s down. All thanks to you, friend.'], ['Howdy, partner! Pull up a hay bale. Have some cheddar. Have two.']] },
    { if: { firstMeeting: true }, say: ['Well, howdy, partner! Welcome to Lariat — population four hundred and twelve, cows two hundred and forty-five. Well. Two hundred and forty. That\'s the trouble.', 'Name\'s Chuckie. Farmer Chuckie. Chuckie\'s Cheese — that\'s me! Best cheddar in the state, and the only one you\'ll ever need. You hungry? You look hungry. Everybody looks hungry to a cheesemaker.'] },
    { if: active, variants: [['Any sign of my girls, partner? I left the paddock gate open. On purpose this time. In case they want to come home on their own.'], ['Howdy! How\'s the round-up going? Don\'t tell me if it\'s bad. Tell me if it\'s good. Tell me slowly.']] },
    { if: {}, variants: [['Howdy, partner! Beautiful day for cheese.'], ['Well, I\'ll be — it\'s you! Come on over.'], ['Mornin\'! Or afternoon. Cows don\'t wear watches and neither do I.']] },
  ],
  farewells: [{ if: {}, variants: [['Y\'all come back now!'], ['Happy trails, partner. Mind the cattle guard.'], ['See ya! And remember: life\'s short — eat the cheese.']] }],
  topics: [
    {
      id: 't_chuckie_cows', label: '"You said you\'re missing some cows?"', tag: 'quest', keywords: ['cows', 'cow', 'missing', 'escaped', 'lost', 'herd', 'problem', 'trouble'],
      if: notStarted,
      say: [
        'Five of \'em, partner. Not just any five — my lead cows. Bessie Mae, Dr. Clementine, Duchess, Patsy and Little Daisy.',
        'Now here\'s the thing, and I\'ll just say it plain: they talk. In English. Always have. Don\'t ask me how — I asked their mothers and got "moo". They\'re the bosses of the herd. The other girls follow them to the parlour, to the feed, to bed.',
        'Three nights back somebody left the paddock gate open — I\'m not saying Wade, I\'m not NOT saying Wade — and they took off. Without \'em the herd just mills about. Milk\'s down by near half. Rosa\'s vats are half empty, and the folks on the exchange have noticed. CHZ ain\'t what it was.',
        'Would you bring \'em home? You\'ll need a lasso — Opal\'s got \'em at the Mercantile on Main Street. Walk up to a girl, throw the rope, and walk her back to the lead cows\' paddock here by the barns. She\'ll follow you. Complain, mostly. But follow.',
        'Bring all five home and I\'ll make it worth your while: two and a half thousand obols, and a wheel of my finest. Deal?',
      ],
      choices: [
        { id: 'c_chuckie_yes', label: '"Deal. I\'ll round them up."', say: ['Well, I\'ll be! Shake on it, partner. *a handshake like a hay baler*', 'Lasso\'s at the Mercantile. The girls\'ll be somewhere they like — ask me where folks have seen \'em. And go gentle. They bruise. Emotionally.'], effects: [{ quest: { id: Q, start: true } }, { learn: 'fact_lead_cows_escaped' }, { dairy: 'accept' }, { rel: { affection: 3 } }] },
        { id: 'c_chuckie_later', label: '"Maybe later."', say: ['No rush, partner. Well — some rush. But no pressure. Well — some pressure. Come back when you\'re ready. The girls ain\'t going anywhere. Well. They are. That\'s the problem.'], effects: [{ learn: 'fact_lead_cows_escaped' }] },
      ],
    },
    {
      id: 't_chuckie_where', label: '"Where have your cows been seen?"', keywords: ['where', 'seen', 'find', 'hint', 'location', 'hiding'],
      if: { any: [active, { all: [notStarted, { playerKnows: 'fact_lead_cows_escaped' }] }] },
      say: [
        'Let me think who\'s still out. Folks have been telling me all week:',
        { if: loose('cow_bessie'), text: 'Bessie Mae\'s been seen out behind the Mesquite Diner, eyeing Lupe\'s pie window. That girl would sell her own bell for a slice of pecan.' },
        { if: loose('cow_clementine'), text: 'Dr. Clementine\'s up by the old windmill on Windmill Lane, north-west. Thinking. She does that. Bring a chair.' },
        { if: loose('cow_duchess'), text: 'Duchess is out on a sandbar in Caddo Creek, north-east past the Hollister place. Keeping watch, she says. For what, she won\'t say.' },
        { if: loose('cow_patsy'), text: 'Patsy\'s by the Co-op grain elevator east of town. Singing. You\'ll hear her before you see her. You\'ll wish you hadn\'t.' },
        { if: loose('cow_daisy'), text: 'Little Daisy\'s way out in the east fields, south-east, the land that\'s for sale. Having an adventure, she told Earl. She\'s six.' },
        { if: { dairy: { loose: 0 } }, text: 'Well — nobody! They\'re all roped or home. Bring \'em on in, partner.' },
        'They\'re marked on your map, too. Opal put up posters.',
      ],
    },
    {
      id: 't_chuckie_lasso', label: '"How do I catch a talking cow?"', keywords: ['lasso', 'rope', 'catch', 'how', 'wrangle'],
      if: { not: done },
      say: [
        'With a lasso and good manners, partner. Opal sells \'em at the Mercantile — forty-five obols, and worth every one. She always keeps one on the peg for this kind of thing.',
        'Walk right up to the girl, talk to her, throw the rope. She\'ll fuss. They always fuss. Then she\'ll follow you along. Lead her back here into the lead cows\' paddock — the fenced bit by the barns — and she\'s home.',
        'If you go indoors she\'ll wait outside — they\'re cows, not cats. And if you wander off too far she\'ll just stand there looking hurt till you come back for her. Rope stays on.',
      ],
    },
    {
      id: 't_chuckie_progress', label: '"How\'s the herd now?"', keywords: ['herd', 'milk', 'production', 'progress', 'how many'],
      if: { any: [active, done] },
      say: [
        { if: { dairy: { home: 5 } }, text: 'All five lead cows home, partner, and the whole herd\'s walking into the parlour like it\'s Sunday. Milk\'s back where it ought to be.' },
        { if: { dairy: { home: '<5' } }, text: 'Every lead cow home puts a bit more milk in the tank — the girls follow their own boss, see. Each one\'s worth near a tenth of the parlour.' },
        'Rosa can tell you what that means in cheese. The fellas on the exchange can tell you what it means in money. I can tell you what it means in sleep: some.',
      ],
      effects: [{ dairy: 'report' }],
    },
    {
      id: 't_chuckie_company', label: '"Tell me about Chuckie\'s Cheese."', keywords: ['company', 'cheese', 'stock', 'shares', 'business', 'chz', 'invest'],
      say: [
        'Started with three cows and a bucket, partner. Now it\'s two hundred and forty-five head, a parlour, a cheese plant, and a ticker symbol: CHZ, on the Halvermouth exchange. Folks can buy a piece of the place. Even you!',
        'Now I\'ll tell you what I tell everybody: a share in a dairy goes up and down with the milk, the weather and the price of cheese. Ain\'t no sure thing. Cows are honest; markets ain\'t.',
      ],
      effects: [{ panel: { name: 'exchange', company: 'chz' } }],
    },
    {
      id: 't_chuckie_ober', label: '"You know Captain Ober?"', keywords: ['ober', 'captain', 'friend', 'sea', 'ships', 'shipping'],
      say: [
        'Know him? Forty years, partner! When I had three cows and a dream, the Captain shipped my very first wheel down the coast on that old tug of his. Paid him in cheese. He still talks about it. Mostly about the smell.',
        'Tell him Chuckie says howdy, and that he still owes me a crate of Gouda from ninety-one. He\'ll know.',
      ],
    },
    {
      id: 't_chuckie_town', label: '"What\'s Lariat like?"', keywords: ['lariat', 'town', 'here', 'place'],
      say: [
        'Best little town in the county. The Mercantile\'s got everything, the Mesquite Diner\'s got pie, and the Co-op\'s got grain. Feed store\'s getting a new seed truck, and Red Dirt\'s waiting on tractors.',
        'There\'s land coming up for sale east of FM 38, too — good black dirt. If you ever fancy farming, the Land Office\'ll sort you out once Mr. Haskins\'s done surveying.',
      ],
    },
    {
      id: 't_chuckie_after', label: '"Do the cows really talk?"', keywords: ['talk', 'english', 'speak', 'how', 'why'],
      say: ['Every day, partner. Sometimes I wish they wouldn\'t. Duchess has opinions about the government. Clementine has opinions about Duchess.', 'The rest of the herd just say "moo". I reckon the five of \'em do all the talking for everybody. Somebody\'s got to.'],
    },
  ],
  askAbout: [
    { keywords: ['wade'], say: ['Good hand, Wade. Quiet. I\'d trust him with my life. With a gate, less so.'] },
    { keywords: ['rosa', 'cheesemaker'], say: ['Rosa\'s the genius. I just pay the light bill and taste things.'] },
    { keywords: ['opal', 'mercantile', 'store'], say: ['Opal\'s Mercantile, on Main. Lassos, hats, jerky, gossip. Mostly gossip.'] },
    { keywords: ['lupe', 'diner', 'pie'], say: ['Lupe\'s pecan pie. That\'s it. That\'s the whole recommendation.'] },
    { keywords: ['moneybucks', 'oil'], say: ['Sir Moneybucks wanted to "optimise" my girls once. I sent him a cheese and a polite letter. Mostly polite.'] },
  ],
  unknown: [['Couldn\'t tell you, partner. Ask Opal — she knows everything and some things besides.'], ['Well, that\'s one for the cellar. I don\'t know it.']],
  gift: { loved: [['Well, I\'ll be! For me? Partner, you\'re all right.']], liked: [['That\'s mighty kind of you.']], neutral: [['Thank you kindly.']], disliked: [['…Is that processed cheese? Partner. Partner, no.']], tooMany: [['Steady on! I\'ll need a bigger barn.']], ownStolen: [['Well, now — that\'s from my kitchen! …Keep it. Call it a sample.']] },
  barks: {
    greet: ['Howdy, partner!', 'Well, I\'ll be!', 'Mornin\'!'],
    work: ['*counts the herd, twice*', 'Come on, girls…', '*taps the milk gauge, sighs*', 'Bessie? BESSIE?'],
    leisure: ['*sips sweet tea*', 'Sun\'s goin\' down on another fine day of cheese.', '*hums "Home on the Range"*'],
    eat: ['*a slice of cheddar on a slice of cheddar*', 'Mmm. Aged twelve months.'],
    sleep: ['…moo… *snore*'],
    chat: ['Well, I\'ll be!', 'Now that\'s a fine thing.', 'Cheese, partner. Always cheese.'],
    argue: ['Now hold your horses!', 'Partner, that ain\'t right.'],
  },
};

export const dlgOpal = {
  id: 'dlg_opal',
  greetings: [
    { if: { firstMeeting: true }, say: ['Well, hey there, stranger! Opal Haskins — this is my Mercantile. If we don\'t have it, you don\'t need it, and if you need it anyway I can order it by Tuesday.'] },
    { if: { activity: 'sleep' }, say: ['*mumbling* …we close at eight… *snore*'] },
    { if: {}, variants: [['Hey, hon! What\'ll it be?'], ['Well, look what the wind blew in!'], ['Back again? Must be my charm. Or my jerky.']] },
  ],
  farewells: [{ if: {}, variants: [['Bye now!'], ['Y\'all come back!'], ['Tell Chuckie I said hey.']] }],
  topics: [
    { id: 't_opal_shop', label: '"What do you sell?"', keywords: ['shop', 'buy', 'sell', 'store', 'lasso', 'rope'], say: ['Everything a body needs, hon: rope, lassos, hats, jerky, sweet tea, bag balm. Have a look.'], effects: [{ openShop: 'shop_mercantile' }] },
    { id: 't_opal_lasso', label: '"Chuckie says I need a lasso."', keywords: ['lasso', 'cows', 'chuckie'], if: { not: { hasItem: 'item_lasso' } }, say: ['Course he does. Forty-five obols — that\'s a good braided rope, not that nylon junk. I always keep one on the peg for Chuckie\'s girls. They get out more than he lets on.'], effects: [{ openShop: 'shop_mercantile' }] },
    { id: 't_opal_town', label: '"What\'s the news in Lariat?"', keywords: ['news', 'gossip', 'town', 'lariat'], say: ['Well! Chuckie\'s lost his talking cows, Earl\'s cotton\'s got the boll weevil or a bad attitude, Lupe\'s got a new pie, and the Land Office is surveying the east fields for sale. And Red Dirt\'s still waiting on tractors. Feed store\'s waiting on seed. Everybody\'s waiting on something, hon.'] },
    { id: 't_opal_land', label: '"Is there land for sale?"', keywords: ['land', 'farm', 'sale', 'buy land', 'property'], say: ['East of FM 38, three good parcels and some scrub. My cousin\'s surveying for the Land Office. Soon as the papers are drawn up you can buy yourself a farm. Ain\'t that something?'] },
  ],
  askAbout: [{ keywords: ['chuckie', 'cheese'], say: ['Chuckie\'s the best man in the county and the worst at closing gates.'] }],
  unknown: [['Hon, even I don\'t know that one.']],
  gift: basicGift('Oh, you shouldn\'t have! …Give it here.', 'Well, ain\'t that sweet.', 'Thank you, hon.', 'Hm. I\'ll find a use for it. Somewhere.'),
  barks: { greet: ['Hey, hon!'], work: ['*rings up a sale*', '*straightens the hats*'], leisure: ['*gossips*'], eat: ['*pie*'], sleep: ['*snore*'], chat: ['Well, I never!', 'You don\'t say!'], argue: ['Now listen here!'] },
};

export const dlgLupe = {
  id: 'dlg_lupe',
  greetings: [
    { if: { firstMeeting: true }, say: ['Sit anywhere, mijo. I\'m Lupe. Chicken-fried steak\'s the special, pecan pie\'s the reason, coffee\'s the law.'] },
    { if: { activity: 'sleep' }, say: ['*asleep* …order up… *snore*'] },
    { if: {}, variants: [['What can I get you?'], ['Coffee? I\'m pouring you coffee.'], ['You look like you need pie.']] },
  ],
  farewells: [{ if: {}, variants: [['Come back hungry.'], ['Drive safe.']] }],
  topics: [
    { id: 't_lupe_menu', label: '"What\'s good?"', keywords: ['menu', 'food', 'eat', 'pie', 'steak', 'buy'], say: ['All of it. But the pie.'], effects: [{ openShop: 'shop_diner' }] },
    { id: 't_lupe_bessie', label: '"Seen a cow around here?"', keywords: ['cow', 'bessie', 'pie window'], if: loose('cow_bessie'), say: ['A cow with a pink ribbon has been standing behind my kitchen for two days asking for pie. Asking. In English. Very politely. I gave her a slice. She said it needed more pecans.', 'Tell Chuckie she\'s out back. And tell her the pecans are fine.'] },
  ],
  askAbout: [{ keywords: ['chuckie'], say: ['Chuckie\'s in that booth every day at noon. Tips in cheese.'] }],
  unknown: [['No idea, mijo. Have some pie.']],
  gift: basicGift('Ay, for me? Gracias!', 'That\'s sweet, thank you.', 'Thanks.', 'Mm. Okay.'),
  barks: { greet: ['Sit anywhere!'], work: ['Order up!', '*flips a steak*'], leisure: ['*feet up*'], eat: ['*coffee*'], sleep: ['*snore*'], chat: ['Mm-hm.', 'Ay, no.'], argue: ['Not in my diner!'] },
};

export const dlgWade = {
  id: 'dlg_wade',
  greetings: [
    { if: { firstMeeting: true }, say: ['…Howdy. Wade. I work the dairy. Milkin\', feedin\'. Mostly milkin\'.'] },
    { if: {}, variants: [['…Howdy.'], ['Mornin\'.'], ['*nods*']] },
  ],
  farewells: [{ if: {}, variants: [['…Bye.'], ['*nods*']] }],
  topics: [
    { id: 't_wade_gate', label: '"Did you leave the paddock gate open?"', keywords: ['gate', 'open', 'escaped', 'cows'], say: ['…', '…Might\'ve.', 'Bessie asked real nice. Said she wanted to see the town. I didn\'t think she meant all five of \'em and for good.'] },
    { id: 't_wade_cows', label: '"What are the lead cows like?"', keywords: ['lead', 'cows', 'herd'], say: ['Good girls. Bessie\'s fancy. Clementine\'s smart, knows it. Duchess thinks I\'m a spy. Patsy sings. Daisy\'s just a baby.', 'The rest of the herd won\'t go in the parlour without \'em. Stand in the yard bawlin\'. Breaks your heart. And your schedule.'] },
  ],
  askAbout: [],
  unknown: [['…Dunno.']],
  gift: basicGift('…Thanks. Real nice.', '…Thanks.', '*nods*', '…Huh.'),
  barks: { greet: ['…Howdy.'], work: ['Come on, girl.', '*whistles to the cows*'], leisure: ['*leans on the gate*'], eat: ['*eats*'], sleep: ['*snore*'], chat: ['Yep.', 'Nope.'], argue: ['…Fine.'] },
};

export const dlgRosa = {
  id: 'dlg_rosa',
  greetings: [
    { if: { firstMeeting: true }, say: ['Hairnet. Hands washed. Don\'t touch the vats. I\'m Rosa — I make the cheese here. Chuckie owns the building; the cheese is mine.'] },
    { if: {}, variants: [['Don\'t touch the vats.'], ['Hm. You again. Hands washed?'], ['Busy. Talk while I stir.']] },
  ],
  farewells: [{ if: {}, variants: [['Out. Mind the curds.'], ['Bye.']] }],
  topics: [
    { id: 't_rosa_cheese', label: '"How\'s the cheese?"', keywords: ['cheese', 'vats', 'production', 'milk'], say: [{ if: { dairy: { home: '<5' } }, text: 'Half-empty vats. I can\'t make cheddar out of excuses. Every one of those lead cows home is another ten percent in my vats.' }, { if: { dairy: { home: 5 } }, text: 'Full vats. Full presses. Full racks. Finally. Now the cheese can take its time, like it should.' }, 'Twelve months for the good cheddar. Nobody rushes my cheddar.'], effects: [{ dairy: 'report' }] },
    { id: 't_rosa_chuckie', label: '"What\'s Chuckie like to work for?"', keywords: ['chuckie', 'boss'], say: ['He gave me the plant and said "make it sing". He also sells it before it\'s aged. We have words. Good words, mostly.'] },
  ],
  askAbout: [],
  unknown: [['Trade secret.']],
  gift: basicGift('…This is very kind. Thank you.', 'Thank you.', 'Hm. Thanks.', 'No. Not in my plant.'),
  barks: { greet: ['Hairnet.'], work: ['*stirs the curd*', 'Not yet. Not yet…', '*turns a wheel*'], leisure: ['*sighs contentedly*'], eat: ['*eats standing up*'], sleep: ['*snore*'], chat: ['Hm.', 'Exactly.'], argue: ['Don\'t touch that!'] },
};

export const dlgEarl = {
  id: 'dlg_earl',
  greetings: [
    { if: { firstMeeting: true }, say: ['Hollister. Earl. Cotton. You\'re standin\' on my shadow and it\'s the only shade for a mile.'] },
    { if: {}, variants: [['Hot one.'], ['Gonna rain. Won\'t, but gonna.'], ['Afternoon.']] },
  ],
  farewells: [{ if: {}, variants: [['Mind the irrigation ditch.'], ['Yep.']] }],
  topics: [
    { id: 't_earl_cotton', label: '"How\'s the cotton?"', keywords: ['cotton', 'crop', 'farm', 'harvest'], say: ['Cotton\'s cotton. Needs heat, gets it. Needs rain, don\'t. Fourth generation of Hollisters standing in this field complainin\' about it.', 'If you ever farm, son, grow something you can sell to somebody who ain\'t the government. Co-op takes grain. Chuckie takes feed. Nobody takes complaints.'] },
    { id: 't_earl_duchess', label: '"Seen any of Chuckie\'s cows?"', keywords: ['cow', 'duchess', 'creek'], if: loose('cow_duchess'), say: ['One of \'em\'s out on the sandbar in Caddo Creek, past my place. Called me a "government plant". Told her I\'m a cotton plant, at best. She didn\'t laugh.'] },
  ],
  askAbout: [],
  unknown: [['Ain\'t your business, friend. Nor mine.']],
  gift: basicGift('Well. That\'s decent of you.', 'Thanks.', 'Hm.', 'Don\'t need it.'),
  barks: { greet: ['Afternoon.'], work: ['*squints at the sky*', '*chops weeds*'], leisure: ['Gonna rain.'], eat: ['*eats*'], sleep: ['*snore*'], chat: ['Yep.', 'Nope.'], argue: ['Now look here.'] },
};


// ------------------------------------------------------------------- the cows
// The five lead cows talk (the other 240 say "moo"). Each has lines for when
// she's loose, on your rope and home; the lasso topic only appears while she's
// loose, and throws the rope only if you're carrying one.
const isLoose = { dairy: { cow: 'self', status: 'loose' } };
const isRoped = { dairy: { cow: 'self', status: 'roped' } };
const isHome = { dairy: { cow: 'self', status: 'home' } };
const lasso = { hasItem: 'item_lasso' };

function cowDialogue(id, c) {
  return {
    id,
    greetings: [
      { if: { activity: 'sleep' }, say: [c.asleep] },
      { if: { all: [isLoose, { firstMeeting: true }] }, say: c.meetLoose },
      { if: isLoose, variants: c.loose },
      { if: isRoped, variants: c.roped },
      { if: {}, variants: c.home }, // home (or anything else)
    ],
    farewells: [{ if: {}, variants: c.bye }],
    topics: [
      { id: `${id}_who`, label: '"Who are you?"', keywords: ['who', 'name', 'you'], say: c.who },
      { id: `${id}_why`, label: '"Why did you run off?"', keywords: ['why', 'run', 'escape', 'left', 'gate'], if: { not: isHome }, say: c.why },
      {
        id: `${id}_rope`, label: '[Throw the lasso] "Time to go home."', tag: 'quest', keywords: ['lasso', 'rope', 'home', 'come'],
        if: { all: [isLoose, lasso] }, say: c.rope, effects: [{ dairy: { rope: 'self' } }, { rel: { trust: 2 } }],
      },
      { id: `${id}_norope`, label: '"Come home with me?"', keywords: ['home', 'come', 'chuckie'], if: { all: [isLoose, { not: lasso }] }, say: c.noRope },
      { id: `${id}_walk`, label: '"Come on, this way."', keywords: ['walk', 'come', 'follow', 'paddock'], if: isRoped, say: c.walk },
      { id: `${id}_home`, label: '"Glad to be home?"', keywords: ['home', 'paddock', 'glad'], if: isHome, say: c.glad },
      { id: `${id}_herd`, label: '"Do the other cows talk?"', keywords: ['cows', 'herd', 'talk', 'moo'], say: c.herd },
    ],
    askAbout: [{ keywords: ['chuckie', 'farmer'], say: c.chuckie }],
    unknown: [[c.unknown]],
    gift: { loved: [[c.loved]], liked: [['That\'s right kind of you.']], neutral: [['…Thank you, I suppose.']], disliked: [['I am a cow. What would I do with that?']], tooMany: [['I\'m full. And I have four stomachs.']], ownStolen: [['That\'s mine.']] },
    barks: { greet: ['Moo. I mean — hello.'], work: ['*chews*'], graze: ['*chews thoughtfully*', '*munch*'], idle: ['*swishes tail*', 'Are we nearly there?'], leisure: ['*chews*'], eat: ['*munch*'], sleep: ['*soft snoring moo*'], chat: c.chat, argue: ['Hmph.'] },
  };
}

export const dlgBessie = cowDialogue('dlg_bessie', {
  asleep: '*snoring daintily* …more pecans, Lupe… *snore*',
  meetLoose: ['Well, I declare! A visitor! Sugar, you have caught me without my good bell on.', 'Bessie Mae, of the Chuckie\'s Cheese Bessies. I\'m simply waitin\' on a slice of pie through that window, and then — well, we\'ll see where the evenin\' takes us.'],
  loose: [['Sugar, if you\'re not bringin\' pie, you\'re blockin\' the window.'], ['Lupe has been ignorin\' me for an hour. It\'s very hurtful.']],
  roped: [['Lead on, darlin\'. Slowly. A lady doesn\'t trot.'], ['If we pass that diner again I will be stoppin\', rope or no rope.']],
  home: [['Home sweet paddock, sugar. And Chuckie says there\'ll be pie on Sundays now. In writin\'.'], ['Darlin\'! My rescuer! Come give Bessie a scratch behind the ear.']],
  bye: [['Toodle-oo, sugar.'], ['Mind how you go, darlin\'.']],
  who: ['Bessie Mae. First in the parlour every mornin\' for eleven years. When I walk in, the girls walk in. When I don\'t — well. You\'ve seen the milk numbers.'],
  why: ['Sugar, a girl smells pecan pie on the wind every single day of her life, she\'s bound to go see about it eventually. Wade opened the gate. I simply… accepted the invitation.', 'And the others came too. They always do what I do. It\'s a burden.'],
  rope: ['*the rope settles around her neck* Oh! Well. That was rather forward of you.', 'Fine. Fine. I\'ll come. But we are walkin\' past that diner window on the way, and you\'re not to rush me.'],
  noRope: ['Without a proper lasso? Sugar, I\'m a lady. I\'m not just goin\' to follow any old body down the road. Opal sells a fine braided rope at the Mercantile.'],
  walk: ['I am comin\', sugar. Some of us have four legs and a reputation to keep.'],
  glad: ['Glad as a June bug, darlin\'. Though if you see any pie, you know where I live.'],
  herd: ['Only us five, sugar. The rest just say "moo". Lovely girls. Not much for conversation.'],
  chuckie: ['Chuckie\'s a gentleman. He sings to us in the parlour. Off-key, but with feelin\'.'],
  unknown: 'I couldn\'t say, sugar. I\'m a cow.',
  loved: 'Pie! Oh, you darlin\' thing!',
  chat: ['Well, I never!', 'Bless your heart.'],
});

export const dlgClementine = cowDialogue('dlg_clementine', {
  asleep: '*asleep, muttering* …the fence is a construct… *snore*',
  meetLoose: ['Ah. A biped. Do sit down. I am Dr. Clementine — the doctorate is honorary; I conferred it myself.', 'I came up to the windmill to think. Specifically: if a cow leaves the paddock, is she still a dairy cow? Or merely a cow, in the abstract?'],
  loose: [['I am approaching a breakthrough. Please stand out of the wind.'], ['The windmill turns, yet goes nowhere. I find that relatable.']],
  roped: [['Lead on. I shall philosophise as we walk. You may take notes.'], ['A rope. The oldest argument there is. Very well.']],
  home: [['I concluded that the paddock is not a prison but a premise. Also, the grass is better here.'], ['Ah, my liberator. Shall we discuss free will? No? Fair.']],
  bye: [['Go well, biped.'], ['Ponder something on the way. Anything.']],
  who: ['Dr. Clementine. Lead cow, philosopher, and the only member of the herd to have read a book. It was the feed catalogue. Twice.'],
  why: ['Bessie went for pie. I went for meaning. Duchess went for reasons she claims are classified. Patsy went for the acoustics and Daisy went because everyone else did.', 'I have now found meaning. It is, regrettably, back at the paddock.'],
  rope: ['*the rope drops over her horns* An argument from force. Crude, but persuasive.', 'Very well. I concede. Lead the way — and do try to keep to the shade; I am thinking.'],
  noRope: ['You propose I follow you on the strength of your word alone? I admire the optimism. Come back with a lasso — the Mercantile has them — and we\'ll talk.'],
  walk: ['Walking is just thinking with your legs. I am doing both.'],
  glad: ['Glad is a strong word. Content. Content is the word. Like a well-made cheese.'],
  herd: ['They say "moo". Whether they mean anything by it is one of the great open questions.'],
  chuckie: ['Chuckie is a good man and a poor debater. I win every argument. He wins every gate.'],
  unknown: 'Unknowable. Or at least, unknown to me.',
  loved: 'How thoughtful. I shall contemplate it, then eat it.',
  chat: ['Fascinating.', 'Hm. Consider, though…'],
});

export const dlgDuchess = cowDialogue('dlg_duchess', {
  asleep: '*one eye open, even asleep* …I see you… *snore*',
  meetLoose: ['Halt. State your business. Who sent you? Was it the government? Was it the cheese board?', 'I\'m Duchess. I picked this sandbar because you can see both banks and nobody sneaks up on a cow on a sandbar. Except, apparently, you.'],
  loose: [['Keep your voice down. They\'re listening.'], ['Did anyone follow you here? Look behind you. Slowly.']],
  roped: [['Fine, but we take the long way. In case of tails.'], ['If anyone asks, I was never here and you were never here.']],
  home: [['The paddock is secure. For now. I\'ve got my eye on Wade.'], ['You did good, agent. I mean — person. Forget I said agent.']],
  bye: [['Go. Don\'t look back.'], ['This conversation never happened.']],
  who: ['Duchess. Herd security. The others make milk. I make sure nobody makes off with the milk.'],
  why: ['Something was off at the dairy. A truck nobody recognised. A man in a hat asking about "yield optimisation". I took the herd\'s leadership to a secure location.', 'In hindsight the truck was the feed delivery. But you can\'t be too careful.'],
  rope: ['*the rope lands neat around her neck* …Clean throw. You\'ve done this before. Who trained you?', 'Fine. I\'ll come in. But I\'m walking behind you, where I can see you.'],
  noRope: ['Follow you? With no rope and no credentials? Nice try. Come back with a proper lasso from the Mercantile, then we\'ll talk.'],
  walk: ['Keep moving. Don\'t stop where there\'s cover.'],
  glad: ['Glad? I\'m vigilant. But… yes. It\'s good to be back.'],
  herd: ['They say "moo". That\'s what they WANT you to think.'],
  chuckie: ['Chuckie\'s clean. I checked.'],
  unknown: 'That\'s classified. Even to me.',
  loved: '…This had better not be a tracking device. …Thank you.',
  chat: ['Suspicious.', 'Noted.'],
});

export const dlgPatsy = cowDialogue('dlg_patsy', {
  asleep: '*humming in her sleep* …stand by your mooo… *snore*',
  meetLoose: ['*singing* ♪ I\'ve got friends in LOW places… ♪ — oh! An audience! Hi, hon! Patsy. The voice of Chuckie\'s Cheese.', 'This grain elevator has the best echo in the county. Listen: MOOOOOO-oo-oo-oo. See? Beautiful.'],
  loose: [['*warming up* Mi-mi-mi-MOOOO.'], ['You want a song? I\'ve got a song. I\'ve got eleven.']],
  roped: [['♪ Happy trails to youuu… ♪ Keep up, hon, I\'m settin\' the tempo.'], ['A road song! We need a road song!']],
  home: [['The parlour\'s got a nice echo too. I sing the girls in every mornin\' now. Milk\'s up. Coincidence? No.'], ['My number one fan! Want a song? You\'re gettin\' a song.']],
  bye: [['Bye, hon! Tell your friends!'], ['♪ Goodbye, so long, farewell… ♪']],
  who: ['Patsy! I lead the herd in by singin\'. The girls go where the music goes. No music, no milk — that\'s showbiz.'],
  why: ['Artistic differences, hon. The parlour\'s got a radio and it only plays the farm report. A girl needs to be heard.', 'Then I found this elevator and, well. The acoustics.'],
  rope: ['*the lasso loops around her neck* Ooh! A lasso! That\'s so country. I\'m writin\' a song about this.', '♪ Rope me in and lead me hooome… ♪ Okay, okay, I\'m comin\'.'],
  noRope: ['Aw, hon, I can\'t just wander off with a stranger. Get yourself a lasso from Opal — make it official — and I\'m all yours.'],
  walk: ['♪ Walkin\' after midnight… ♪ well, it\'s not midnight. Walkin\' after lunch.'],
  glad: ['Glad? Hon, I\'m about to sing about how glad I am. Brace yourself.'],
  herd: ['They hum along! Mostly in the wrong key. I love \'em.'],
  chuckie: ['Chuckie sings harmony. Badly. I let him.'],
  unknown: 'I don\'t know, hon, but it sounds like a song title.',
  loved: 'For me? Oh, I\'m gonna cry. ♪ Thank yooou… ♪',
  chat: ['♪ La la la ♪', 'Oh, I love that.'],
});

export const dlgDaisy = cowDialogue('dlg_daisy', {
  asleep: '*tiny snores* …adventure… *snore*',
  meetLoose: ['HI! I\'m Daisy! I\'m on an ADVENTURE! Are you on an adventure? Is this the ocean? Earl said it\'s not the ocean.', 'I followed everybody out the gate and then everybody went different ways and I went THIS way because there was a butterfly.'],
  loose: [['Did you see the butterfly? It went that way. Or that way.'], ['I\'m not lost. I\'m EXPLORING.']],
  roped: [['Are we going home? Can we go past the windmill? Can we go past the creek? Can we—'], ['This is the best adventure EVER.']],
  home: [['I\'m home! Mama Bessie said I was very brave. Was I very brave?'], ['When I\'m big I\'m gonna be a lead cow. Like Bessie. But with a hat. Like Clementine.']],
  bye: [['BYE!'], ['Bye! Come back tomorrow! And the day after!']],
  who: ['Little Daisy! I\'m six! Months! I\'m the newest lead cow. Mostly I lead the calves. They\'re very small.'],
  why: ['Everybody was going so I went too! And then there was a field and a butterfly and a really big sky. Is the sky always this big?', 'I miss Mama Bessie a little. Only a little. A medium amount.'],
  rope: ['*the lasso drops gently over her head* WHOA. Is this a game? Is this a rope game?', 'Okay! Let\'s go! Which way? This way? Let\'s go this way!'],
  noRope: ['Mama said never go with strangers unless they have a proper rope. Opal has ropes! At the store! You should get one!'],
  walk: ['I\'m following! I\'m following! Are we there yet?'],
  glad: ['SO glad. But I\'m gonna go on another adventure when I\'m older. With you!'],
  herd: ['They say moo. I say moo too sometimes. Moo! See?'],
  chuckie: ['Farmer Chuckie gives me apple slices. He\'s the best.'],
  unknown: 'I don\'t know! What\'s that?',
  loved: 'FOR ME? THANK YOU!',
  chat: ['Wow!', 'Really?!'],
});

export const COW_DIALOGUES = [dlgBessie, dlgClementine, dlgDuchess, dlgPatsy, dlgDaisy];

export default [dlgChuckie, dlgOpal, dlgLupe, dlgWade, dlgRosa, dlgEarl, ...COW_DIALOGUES];
