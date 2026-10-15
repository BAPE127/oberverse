// Captain Ober of Ober & Sons Maritime: a jolly old salt, retiring. Sells you
// the company (effect { panel: { name: 'logistics' } } opens the sale sheet;
// the sale itself is src/systems/logistics.js buyCompany). Flag owns_shipping.
// He was a smuggler once and winks at your gun-running.
export const dlgOber = {
  id: 'dlg_ober',
  greetings: [
    { if: { firstMeeting: true }, say: ['Ahoy there, shipmate! Come aboard — well, come in, it\'s an office, but I run it like a ship. Captain Ober. Ober & Sons Maritime. Forty years at sea and nine behind this desk.', 'Kettle\'s on. Tide\'s turning. Wind\'s from the sou\'-west, which means rain by teatime or my knee\'s a liar. Sit, sit!'] },
    { if: { flag: 'owns_shipping' }, variants: [['There\'s the new owner! How\'s my old company treating you? Don\'t answer — I can tell by your walk. You walk like a ship that\'s been paid.'], ['Ahoy, boss! Ha — "boss". Never thought I\'d say that to anyone but the sea.'], ['Fair winds today, shipmate. The Gullwing Lass still pulling to port? She does that. Sulks, she does.']] },
    { if: { activity: 'sleep' }, say: ['*from the bunk* …batten down… bananas… NOT ON MY BOAT… *snore*'] },
    { if: {}, variants: [['Ahoy, shipmate! What brings you down to the water?'], ['Red sky this morning, shipmate. Means rain, or a fire at the refinery. Either way, wear a hat.'], ['There\'s salt on the wind today. Smell that? That\'s opportunity. And a little bit of fish.']] },
  ],
  farewells: [{ if: {}, variants: [['Fair winds and following seas, shipmate!'], ['Mind how you go — and never whistle indoors.'], ['Off you go. Keep one hand for yourself and one for the ship!']] }],
  topics: [
    {
      id: 't_ober_sale', label: '"I hear the company\'s for sale."', tag: 'quest', keywords: ['sale', 'sell', 'buy', 'company', 'business', 'shipping', 'retire'],
      if: { notFlag: 'owns_shipping' },
      say: ['Aye, it is. I\'m retiring, shipmate. One last voyage on the Salty Ober — round the Cape and nowhere in particular — and someone has to mind the shop while I\'m gone. Forever.', 'Forty thousand obols and she\'s yours: Ober & Sons Maritime, lock, stock and barnacle. Three ports — Mill Road Docks here, Sund Harbour and Port Lirre — and the Gullwing Lass, twenty units in her hold and a heart of gold. The terminal, the contracts, the brokers\' catalogue — all of it.', 'Have a look at the papers. No rush. Well — some rush. The tide waits for no one, and neither does my pension.'],
      effects: [{ panel: { name: 'logistics' } }],
    },
    {
      id: 't_ober_sons', label: '"Where are the Sons?"', keywords: ['sons', 'son', 'family', 'children', 'accountants'],
      say: ['*sighs like a bilge pump* Three boys. Raised \'em on salt and stories. All three became accountants. Accountants! I took them round the Cape at nine years old, and they spent the whole trip doing the books.', 'That\'s why it\'s for sale, shipmate. Nobody to hand the wheel to. Unless…' ],
    },
    {
      id: 't_ober_cargo', label: '"Would you carry… anything?"', keywords: ['guns', 'arms', 'crates', 'smuggle', 'smuggling', 'cargo', 'weapons'],
      say: ['*winks so hard his glasses slip* Cargo\'s cargo, shipmate. In my day we called it "agricultural machinery". Very pointy tractors. Very loud tractors.', 'You didn\'t hear that from me. You didn\'t hear anything. Sea\'s very noisy.'],
    },
    {
      id: 't_ober_advice', label: '"Any advice for a new shipowner?"', keywords: ['advice', 'tips', 'ships', 'routes', 'contracts', 'help'],
      if: { flag: 'owns_shipping' },
      say: ['Three things, and I\'ll only say them twice. One: a ship in port earns nothing — keep her busy. Two: take the job you can do on time over the job that pays most. Clients remember late. Three: mind your hull. A tired ship is a slow ship and a slow ship is a late ship.', 'Oh, and four: never rename a ship on a Friday. Bad luck. Terrible luck. I did it once and the ship became a submarine.'],
    },
    {
      id: 't_ober_books', label: '"Can I see the books?"', keywords: ['books', 'terminal', 'fleet', 'ledger'],
      if: { flag: 'owns_shipping' },
      say: ['Course you can — they\'re your books now! Here, use my old login. The password is still the name of the boat.'],
      effects: [{ panel: { name: 'logistics' } }],
    },
    {
      id: 't_ober_kraken', label: '"Is the sea really that dangerous?"', keywords: ['sea', 'danger', 'kraken', 'monster', 'storm', 'pirates'],
      say: ['Dangerous? The sea\'s the most honest thing there is, shipmate. She\'ll kill you, but she\'ll tell you first. It\'s people you\'ve to watch.', 'And the kraken, of course. Saw her once, off Southwind Isle. Big as a church, and twice as judgemental. She owes me a favour. Don\'t ask what for.'],
    },
    {
      id: 't_ober_tug', label: '"Tell me about the Salty Ober."', keywords: ['tug', 'boat', 'salty', 'home', 'ship'],
      say: ['My tug! Built in Lanternside, sixty years old, red as a pillar box. I live aboard. She hasn\'t left the quay in nine years — but she could. She COULD. She\'s just choosing not to.', 'When I retire, she\'s taking me round the world. Or round the harbour. Depends on the weather. And my knee.'],
    },
  ],
  askAbout: [
    { keywords: ['lucas', 'eastrise', 'pipecreek'], say: ['Young Eastrise! We ran "tractor parts" together, back when he still had hair and I still had knees. Good lad. Bit close-talking. Never trust his tide tables.'] },
    { keywords: ['mason', 'builder', 'shipyard', 'construction'], say: ['Mason\'s lot built my office, square and true, with a pun on every brick. If you ever want a shipyard of your own, he\'s your man. He\'ll tell you a boat\'s just "a building that floats". Ignore him.'] },
    { keywords: ['moneybucks', 'oil', 'ober\'s oil', 'refinery'], say: ['No relation! Everyone asks. I was Ober first — he only had oil. My grandfather used to say an Ober\'s place is on the water. His grandfather put his on a refinery. We don\'t speak.'] },
    { keywords: ['weather', 'forecast', 'rain', 'wind'], say: ['Mackerel sky and mares\' tails, tall ships carry low sails. Which means: bring a coat. Also, it means mackerel. Probably.'] },
    { keywords: ['bananas', 'banana', 'whistle', 'whistling', 'superstition'], say: ['NEVER bananas on a boat. Never! I lost a whole cargo of… well, bananas, once. Proves my point.'] },
  ],
  unknown: [['Couldn\'t tell you, shipmate. Ask the gulls — they see everything and tell nobody.'], ['That\'s beyond my charts, that is.']],
  gift: { loved: [['For me? Shipmate, you\'ve warmed an old sailor\'s heart. Tea\'ll taste sweeter for it!']], liked: [['Ah, that\'s kind. Very kind. Aye.']], neutral: [['Thank you kindly. I\'ll stow it in the chest.']], disliked: [['Ah… is that a banana? Get it off the quay!']], tooMany: [['Steady on! I\'ll have to buy a bigger boat.']], ownStolen: [['Here! That\'s from my sea chest! …Keep it. Call it a retirement present. From me. To you. Somehow.']] },
  barks: {
    greet: ['Ahoy, shipmate!', 'Fair winds!', 'Tide\'s turning!'],
    work: ['*stamps a manifest*', 'Port side, starboard side, inside…', '*taps the barometer* Falling. Lovely.', 'Who\'s been whistling?!'],
    leisure: ['*puffs his pipe at the sunset*', 'Red sky at night…', '*waves at a passing gull* Evening, Margaret.'],
    eat: ['*tea with suspiciously much rum*', 'Mmm. Kipper.'],
    sleep: ['…all hands… *snore*'],
    chat: ['Aye!', 'In my day…', 'Heave ho!'],
    argue: ['Belay that!', 'Now listen here, shipmate —'],
  },
};

export default [dlgOber];
