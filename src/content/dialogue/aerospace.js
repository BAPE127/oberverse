// Dialogue for the people of Starling Flats (v0.55.0). Billie sells Roost
// Aeroworks (effect { panel: { name: 'aerospace_sale' } } opens the sale sheet;
// the sale itself is src/systems/aerospace.js buyFirm). Flag owns_aerospace.
const OWNS = { flag: 'owns_aerospace' };
const NOT_OWNS = { notFlag: 'owns_aerospace' };

export const dlgBillie = {
  id: 'dlg_billie',
  greetings: [
    { if: { firstMeeting: true }, say: ['Well, hello, flyer! Billie Roost — Roost Aeroworks, the little hangar with the big trophies. Forty-one years building aeroplanes on the Flats, and forty of them before Meridian moved in next door and started counting everything.', 'Tea? It\'s stewed. Everything\'s stewed round here. Sit down before the wind takes you.'] },
    { if: { activity: 'sleep' }, say: ['*asleep in her flying jacket* …full throttle, Ailie… you\'ll never… *snore*'] },
    { if: OWNS, variants: [['There\'s my successor! How\'s my hangar? Wrenna says you haven\'t broken anything yet. Yet, flyer.'], ['Boss! Ha. You\'d think I\'d hate saying that. I don\'t. Well — a bit.'], ['Seen the tender board today? Meridian bid on everything again. Bid lower. Bid smarter. Bid like a racer.']] },
    { if: {}, variants: [['Afternoon, flyer! Fine flying weather, if you\'ve got anything to fly.'], ['Still thinking about my hangar? It\'s still for sale. I\'m still seventy-four.'], ['Wind\'s from the west. That\'s a racing wind. Not that anybody races any more.']] },
  ],
  farewells: [{ if: {}, variants: [['Blue skies, flyer!'], ['Keep your nose up and your bills paid.'], ['Off you go — and mind the propellers.']] }],
  topics: [
    {
      id: 't_billie_sale', label: '"I hear Roost Aeroworks is for sale."', tag: 'quest', keywords: ['sale', 'sell', 'buy', 'firm', 'business', 'roost', 'hangar', 'company', 'aerospace'],
      if: NOT_OWNS,
      say: ['It is, flyer. My eyes are going and my knees went years ago, and Meridian keeps winning the work. They\'ve got nine bays and a launch pad; I\'ve got one bay and Wrenna. Wrenna\'s worth the nine bays, mind.', 'Eighty-five thousand obols. You get the hangar and its light bay, the office and the terminal, thirty good people — Wrenna stays — a three-slot apron by the runway, and two Skylarks still on order for the Lariat co-op. The co-op paid me a deposit, and that\'s mine: you\'ll be paid the rest when you deliver.', 'And you get the land next door to grow on. It\'s a hard business, flyer. It costs a fortune before it makes one. But the people who stick at it… well. Look at Meridian. Then look at me. Then pick which one you want to be.'],
      effects: [{ panel: { name: 'aerospace_sale' } }],
    },
    {
      id: 't_billie_advice', label: '"Any advice for running the Aeroworks?"', keywords: ['advice', 'tips', 'help', 'run', 'tender', 'bid'],
      if: OWNS,
      say: ['Four things. One: don\'t bid on what you can\'t deliver on time. Late costs you money and it costs you your name, and your name wins the next tender.', 'Two: order your materials the day you sign. Titanium doesn\'t grow on the Flats and the good stuff comes by sea. Three: an empty bay still eats wages. Keep it busy.', 'Four: Meridian prices off its costs. Learn yours, and you\'ll know theirs. And if you ever own a shipping line, flyer — use it. Freight\'s the hidden tax on every aeroplane ever built.'],
    },
    {
      id: 't_billie_books', label: '"Can I use the terminal?"', keywords: ['terminal', 'books', 'tenders', 'production'],
      if: OWNS,
      say: ['It\'s yours, flyer. Password\'s on the sticky note. It\'s "SKYLARK". It was always "SKYLARK".'],
      effects: [{ panel: { name: 'aerospace', opts: { company: 'roost' } } }],
    },
    {
      id: 't_billie_story', label: '"How did you start?"', keywords: ['story', 'start', 'history', 'racing', 'race', 'trophies'],
      say: ['Built my first aeroplane in my mother\'s barn out of a bicycle, a bedsheet and a lawnmower engine. Flew it once, beautifully, into a hedge. The propeller\'s on my wall.', 'Then I raced. The Coast Cup, the Halvermouth Pylon, the Escarpment Dash — won the Dash eleven times. Twelve, if you don\'t count Ailie Ronn\'s "tailwind". Started building racers for other people, then trainers, then the Skylark. Seven hundred Skylarks. Every crop-duster in Lariat is mine.'],
    },
    {
      id: 't_billie_meridian', label: '"What do you make of Meridian?"', keywords: ['meridian', 'rival', 'competition', 'imogen', 'hale', 'mrdn'],
      say: ['Meridian builds good aircraft. Good rockets. Good satellites, even. They do it with spreadsheets and nine bays and a board of directors, and they win because they\'re never late. Imogen Hale runs it like a railway.', 'They\'re on the exchange — MRDN. If you can\'t beat them you can own a piece of them, I suppose. That\'s what the accountants say. I\'ve never trusted anything you can\'t fly.'],
    },
  ],
  askAbout: [
    { keywords: ['wrenna', 'mechanic'], say: ['Wrenna Torq. Came to me at sixteen with no tools and a bad attitude. Now she has tools. She comes with the hangar, flyer — she IS the hangar.'] },
    { keywords: ['ailie', 'ronn', 'pilot', 'test'], say: ['Ailie Ronn: Meridian\'s test pilot, and the second-best pilot on the Flats. I taught her everything she knows. She beat me with it once. Once.'] },
    { keywords: ['oil', 'refinery', 'moneybucks', 'cut'], say: ['The refinery\'s just down the Cut. Every drop of fuel and every can of paint on the Park comes up that road from Ober\'s Oil. Old Moneybucks loves us — we\'re his best customers. He\'s never once come to see a launch.'] },
    { keywords: ['shipping', 'ships', 'freight', 'ober'], say: ['Most of what we build with comes by sea to Mill Road and then up the Cut by truck. Freight\'s a killer, flyer. If you had your own ships…'] },
  ],
  unknown: [['No idea, flyer. Ask the windsock.'], ['Couldn\'t tell you. That\'s above my ceiling.']],
  gift: { loved: [['Oh, now — for me? Flyer, you\'ve made an old racer\'s week.']], liked: [['That\'s kind. That\'s very kind.']], neutral: [['Thank you. I\'ll put it with the trophies.']], disliked: [['Ah. Hm. Wrenna might like it.']], tooMany: [['Steady! I\'ll need a bigger hangar.']], ownStolen: [['That\'s MINE! …Keep it. Call it a sales incentive.']] },
  barks: {
    greet: ['Afternoon, flyer!', 'Blue skies!'],
    work: ['*squints at a blueprint*', 'Who moved my rivet gun?', '*taps a propeller* Lovely.'],
    leisure: ['*watches a jet take off* Show-off.', 'Full throttle…'],
    eat: ['*stewed tea*'],
    sleep: ['…throttle… *snore*'],
    chat: ['In my day…', 'Racing\'s about nerve, not engines.'],
    argue: ['Now listen here, flyer —'],
  },
};

export const dlgImogen = {
  id: 'dlg_imogen',
  greetings: [
    { if: { firstMeeting: true }, say: ['Good afternoon. Imogen Hale, chief executive of Meridian Aerospace. Welcome to Starling Flats.', 'You\'re new. Visitors usually come to see the rockets, or to sell us something, or — occasionally — to compete. Which are you?'] },
    { if: { activity: 'sleep' }, say: ['*asleep; the phone on the pillow lights up with the overnight numbers*'] },
    { if: OWNS, variants: [['Ah. The new owner of Roost. Noted. Welcome to the Flats — I mean that. Competition improves us.'], ['Good to see you. We bid on the Skyward tender this morning; I assume you did too. May the best price win. It will be ours.'], ['Dr. Hale. You have two minutes; I have a board meeting in three.']] },
    { if: {}, variants: [['Good afternoon.'], ['Dr. Hale. Can I help you?'], ['We\'re rather busy. We\'re always rather busy. That\'s the point.']] },
  ],
  farewells: [{ if: {}, variants: [['Good afternoon.'], ['Noted. Thank you.'], ['Do keep an eye on MRDN.']] }],
  topics: [
    {
      id: 't_imogen_meridian', label: '"Tell me about Meridian."', keywords: ['meridian', 'company', 'business', 'history', 'aerospace'],
      say: ['Forty-one years ago Meridian was three engineers and a hangar at the Meridian Free Port. Today: nine bays, a launch pad, a ground station, some eleven hundred people and an order book I\'d show you if it weren\'t confidential.', 'We build airliners, business jets, trainers and fighters, bombers for those who need them, launch vehicles, satellites, and — for defence agencies — certain strategic products. We are never late. That is the whole secret, and nobody believes it.'],
    },
    {
      id: 't_imogen_stock', label: '"Can anyone buy shares in Meridian?"', keywords: ['shares', 'stock', 'mrdn', 'exchange', 'invest', 'dividend'],
      say: ['Anyone can. MRDN, on the Halvermouth exchange — your tablet\'s Stocks app will do. Two million shares; one investor may hold up to five percent. We pay a dividend on Moondays out of the week\'s earnings, when there are earnings.', 'The price is what the market thinks of our books and our order book. It goes up when we deliver. I recommend it, naturally.'],
    },
    {
      id: 't_imogen_compete', label: '"What if I compete with you?"', keywords: ['compete', 'rival', 'roost', 'tender', 'win'],
      say: ['Then you\'ll bid against us on the tender board, and the customer will choose. Price, delivery, quality, reputation — every customer weighs them differently. The airlines love a low price. The agencies love a good record. The Teshvar royal flight loves gold leaf.', 'We will bid what our costs say we should, and we know our costs to the obol. If you know yours better, you\'ll win. I\'d genuinely like to see it. Once.'],
    },
    {
      id: 't_imogen_board', label: '"How is Meridian doing?"', keywords: ['doing', 'numbers', 'profit', 'results', 'books', 'backlog'],
      say: ['The board in the lobby has the day\'s numbers, and the order book. I won\'t embellish them.'],
      effects: [{ panel: { name: 'aerospace', opts: { tab: 'Meridian', readonly: true } } }],
    },
  ],
  askAbout: [
    { keywords: ['billie', 'roost'], say: ['Billie Roost taught half the Flats to fly. Her Skylark is a lovely aeroplane. Her accounts are a work of fiction.'] },
    { keywords: ['oil', 'refinery', 'moneybucks'], say: ['Ober\'s Oil supplies our fuel, our propellant\'s kerosene and our chemicals, through the Cut. Sir Moneybucks invoices promptly and attends nothing. An ideal supplier.'] },
    { keywords: ['rocket', 'launch', 'satellite', 'tina'], say: ['Ask Tina Minus. She runs launch control. I merely pay for it.'] },
  ],
  unknown: [['I couldn\'t say.'], ['That\'s outside my remit.']],
  gift: { loved: [['How thoughtful. Thank you.']], liked: [['Thank you. Noted.']], neutral: [['Thank you.']], disliked: [['…Thank you.']], tooMany: [['Please. That\'s quite enough.']], ownStolen: [['That came from my house. I\'ll assume there\'s an explanation.']] },
  barks: { greet: ['Good afternoon.'], work: ['*reads a spreadsheet as if it were a novel*', 'Noted.', 'Quarter on quarter…'], leisure: ['*on the phone* Yes. No. Tuesday.'], eat: ['*coffee, black*'], sleep: ['…margins… *sleeps*'], chat: ['Noted.'], argue: ['Let\'s be precise.'] },
};

export const dlgAilie = {
  id: 'dlg_ailie',
  greetings: [
    { if: { firstMeeting: true }, say: ['Hey! Ailie Ronn, chief test pilot. If it flies on the Flats, I flew it first — usually before the paint was dry. You fly?'] },
    { if: { activity: 'sleep' }, say: ['*asleep, one hand flying a little loop in the air*'] },
    { if: {}, variants: [['Hey hey! Great flying weather.'], ['Ailie Ronn, at your service. Want to watch a go-around?'], ['Can\'t stop — well, I can, I\'m a pilot. Stopping\'s the hard part.']] },
  ],
  farewells: [{ if: {}, variants: [['Blue side up!'], ['Clear skies!'], ['See you on the flight line.']] }],
  topics: [
    {
      id: 't_ailie_testing', label: '"What does a test pilot do?"', keywords: ['test', 'pilot', 'flying', 'fly', 'job'],
      say: ['Every new aircraft gets flown before it\'s handed over: engine runs, a climb, stalls, a few things the brochure doesn\'t mention. I fly it, I write it up, Rudy fixes what I break.', 'Then the customer\'s crew comes, signs for it, and flies it home off runway 27. Best part of the job: watching one go and knowing it\'s right.'],
    },
    {
      id: 't_ailie_billie', label: '"Billie says you cheated in the Escarpment Dash."', keywords: ['billie', 'race', 'dash', 'escarpment', 'cheat'],
      say: ['It was a TAILWIND. A completely legal tailwind! She\'s been saying that for twenty-eight years. I\'ve got the trophy on my shelf to prove it, right next to my twelve losing ribbons. All from her.'],
    },
    {
      id: 't_ailie_runway', label: '"Tell me about the runway."', keywords: ['runway', 'airfield', 'tower', 'taxi', 'apron'],
      say: ['Runway 09/27, four and a half thousand feet of it, plenty for anything we build short of the big bombers — they use the whole thing and a prayer. Taxiway Alpha along the north, both aprons off it. Tower\'s south of the field. Wind\'s mostly west, so we take off on 27 and land on 27, and watch the refinery flare for gusts.'],
    },
  ],
  askAbout: [
    { keywords: ['imogen', 'hale'], say: ['Dr. Hale\'s never been up with me. I keep offering. She keeps scheduling it for next quarter.'] },
    { keywords: ['tina', 'launch', 'rocket'], say: ['I fly chase on every launch — up alongside the rocket for the first minute, filming. Tina times me too.'] },
  ],
  unknown: [['No idea! Ask the tower.'], ['That\'s over my head, and I\'ve been very high.']],
  gift: { loved: [['For me? Brilliant!']], liked: [['Ta!']], neutral: [['Thanks!']], disliked: [['Uh… thanks?']], tooMany: [['I\'ll be overweight for takeoff!']], ownStolen: [['Hey, that\'s mine!']] },
  barks: { greet: ['Hey hey!', 'Clear skies!'], work: ['*walks round the Kestrel, patting it*', 'Tyres, good. Tanks, good. Me, great.'], leisure: ['*watches the sunset traffic*'], eat: ['*eats standing up*'], sleep: ['…flaps… *snore*'], chat: ['Copy that!'], argue: ['Negative!'] },
};

export const dlgRudy = {
  id: 'dlg_rudy',
  greetings: [
    { if: { firstMeeting: true }, say: ['Rudy Durr. Production. If you\'re on my floor you\'re wearing a hard hat, and if you\'re not wearing a hard hat you\'re not on my floor.'] },
    { if: { activity: 'sleep' }, say: ['*asleep, a torque wrench on the bedside table*'] },
    { if: {}, variants: [['Durr.'], ['Floor\'s busy. Make it quick.'], ['Every airframe on time. Every airframe right.']] },
  ],
  farewells: [{ if: {}, variants: [['Mind the jigs.'], ['On time, every time.'], ['Durr.']] }],
  topics: [
    {
      id: 't_rudy_line', label: '"How does the assembly line work?"', keywords: ['line', 'assembly', 'production', 'build', 'floor', 'stage'],
      say: ['Every unit gets a bay and walks the stages: fuselage, wings, engines, avionics, systems, paint, inspection, acceptance. Materials have to be in stores before a stage starts — I don\'t let an airframe sit in a bay waiting for parts; it waits outside until the parts are here.', 'Inspection catches the mistakes. A failed inspection costs you rework — days in the bay again. Better jigs, better people, an engine test cell: fewer fails. That\'s quality. That\'s the whole job.'],
    },
    {
      id: 't_rudy_late', label: '"What happens if a delivery is late?"', keywords: ['late', 'penalty', 'deadline', 'delay'],
      say: ['The customer docks you four percent a day, up to forty. And they remember. Next tender, your reputation\'s lower and somebody else wins it. Late isn\'t a cost, it\'s a habit. Don\'t start it.'],
    },
  ],
  askAbout: [
    { keywords: ['wrenna', 'roost'], say: ['Wrenna Torq\'s the only mechanic on the Flats I\'d let near my jigs. She still has my torque wrench.'] },
    { keywords: ['titanium', 'materials', 'suppliers', 'shipping'], say: ['Titanium from Ostmark or Caldera, aluminium from Sund, composites from Lirre, avionics from Golden Quay. All by sea to Mill Road, then up the Cut. Freight\'s seven or eight percent of everything. If you had your own ships you\'d save most of that.'] },
  ],
  unknown: [['Not my department.'], ['Ask the drawing office.']],
  gift: { loved: [['…Well. Thanks.']], liked: [['Appreciated.']], neutral: [['Right.']], disliked: [['No.']], tooMany: [['Enough.']], ownStolen: [['That\'s from my house.']] },
  barks: { greet: ['Durr.'], work: ['Hard hat!', '*checks a torque wrench*', 'Not on my floor.'], leisure: ['*pint of tea*'], eat: ['*porridge*'], sleep: ['…torque… *snore*'], chat: ['On time.'], argue: ['Not on my floor.'] },
};

export const dlgTina = {
  id: 'dlg_tina',
  greetings: [
    { if: { firstMeeting: true }, say: ['Tina Minus, launch director. T-minus — yes, I know. Everyone knows. It\'s my actual name and I\'ve chosen to find it inspiring.'] },
    { if: { activity: 'sleep' }, say: ['*asleep; a stopwatch ticking on the pillow*'] },
    { if: {}, variants: [['Hello. We\'re green across the board.'], ['Tina Minus. Range is quiet today.'], ['If you hear the siren, you\'re standing too close.']] },
  ],
  farewells: [{ if: {}, variants: [['Clear range.'], ['Go for goodbye.'], ['Hold, hold… go.']] }],
  topics: [
    {
      id: 't_tina_launch', label: '"How does a launch work?"', keywords: ['launch', 'rocket', 'countdown', 'pad', 'orbit'],
      say: ['A launch vehicle\'s built in the integration building, certified, then it goes to the pad: stacked vertically, propellant loaded — the kerosene comes from Ober\'s Oil — final checks, countdown, and then up.', 'Satellites ride on top. They\'re integrated on the pad, and they only start working after commissioning in orbit — a satellite that\'s merely "built" is just very expensive furniture. One launch at a time; two days to refurbish the pad after each.'],
    },
    {
      id: 't_tina_failure', label: '"Do launches ever fail?"', keywords: ['fail', 'failure', 'explode', 'lost', 'risk'],
      say: ['Sometimes. A good vehicle built well fails rarely; a rushed one less rarely. When one goes, it takes its payload with it, and the customer isn\'t charged. Nobody\'s ever been hurt on my range. That\'s the number I care about.'],
    },
    {
      id: 't_tina_missiles', label: '"Do you launch the strategic products?"', keywords: ['missile', 'strategic', 'sentinel', 'bastion', 'defence'],
      say: ['Never. Those are a defence agency\'s procurement item: built in the secure hall and delivered inert by secure convoy to the agency\'s depot. They don\'t come near my pad. My pad is for satellites, and I like it that way.'],
    },
  ],
  askAbout: [
    { keywords: ['imogen', 'hale'], say: ['Dr. Hale has never overruled a scrub. Not once. That\'s why I work here.'] },
    { keywords: ['ailie', 'chase'], say: ['Ailie flies chase on every launch. She whistles in launch control, which is unforgivable, but she flies chase beautifully.'] },
  ],
  unknown: [['Negative on that.'], ['Not on my board.']],
  gift: { loved: [['Oh! That\'s lovely. Go for gift.']], liked: [['Thank you.']], neutral: [['Thanks.']], disliked: [['Hm. Scrubbed.']], tooMany: [['Hold, hold. That\'s plenty.']], ownStolen: [['That\'s mine. From my shelf. Hold.']] },
  barks: { greet: ['Clear range.'], work: ['T-minus…', '*checks a stopwatch*', 'Go for propellant.'], leisure: ['*watches a dish turn*'], eat: ['*timed sandwich*'], sleep: ['…ten… nine… *snore*'], chat: ['Copy.'], argue: ['Hold!'] },
};

export const dlgWrenna = {
  id: 'dlg_wrenna',
  greetings: [
    { if: { firstMeeting: true }, say: ['Wrenna. Mechanic. *wipes her hands on a rag that makes them dirtier* Billie\'s inside. Or out. Or somewhere she shouldn\'t be.'] },
    { if: { activity: 'sleep' }, say: ['*asleep, still holding a spark plug*'] },
    { if: OWNS, variants: [['Boss.'], ['Bay\'s busy. That\'s how I like it.'], ['If you want something built, say so. If you want it built on time, say so twice.']] },
    { if: {}, variants: [['Mm.'], ['Hangar\'s that way. Don\'t touch anything.'], ['Wrenna.']] },
  ],
  farewells: [{ if: {}, variants: [['Mm.'], ['Mind the cowling.'], ['See you.']] }],
  topics: [
    {
      id: 't_wrenna_bay', label: '"What are you working on?"', keywords: ['work', 'bay', 'build', 'skylark', 'hangar'],
      say: ['Whatever\'s in the bay. Right now? Look at the build board. Fuselage, wings, engine, avionics, the lot. One bay means one at a time. Two bays, two at a time. That\'s the maths.'],
    },
    {
      id: 't_wrenna_grow', label: '"How do we grow the business?"', keywords: ['grow', 'expand', 'bigger', 'bays', 'research', 'upgrade'],
      if: OWNS,
      say: ['More bays — there\'s land next door. A heavy bay for airliners. Research for the bigger stuff: turboprops first, then jets. Somebody in a suit would tell you to win the right tenders. I\'d tell you not to lose the easy ones.'],
    },
  ],
  askAbout: [
    { keywords: ['billie'], say: ['Took me on at sixteen. Best boss on the Flats. Worst mechanic.'] },
    { keywords: ['rudy', 'wrench', 'torque'], say: ['Rudy\'s wrench? *looks at her toolbox* What wrench.'] },
  ],
  unknown: [['Dunno. Ask the engine.'], ['Mm. No.']],
  gift: { loved: [['…Oh. That\'s good, that.']], liked: [['Ta.']], neutral: [['Mm.']], disliked: [['No ta.']], tooMany: [['Stop.']], ownStolen: [['Oi. Mine.']] },
  barks: { greet: ['Mm.', 'Boss.'], work: ['*clank*', '*whistles at a rivet*', 'Torque…'], leisure: ['*pokes at a wreck in the boneyard*'], eat: ['*coffee*'], sleep: ['…*snore*'], chat: ['Mm.'], argue: ['Oi.'] },
};

export default [dlgBillie, dlgImogen, dlgAilie, dlgRudy, dlgTina, dlgWrenna];
