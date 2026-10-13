// The car dealers (v0.16.0). Both open the dealership panel (effect
// { dealer: id }): buy a car, sell one parked on the lot, and — at Marty's
// only — "fresh plates" for a stolen car.
export const dlgMarty = {
  id: 'dlg_marty',
  greetings: [
    { if: { firstMeeting: true }, say: ['HEY! Hey hey hey. There they are! My new best customer! Marty Fender, Fender\'s Pre-Loved Motors. Every car a bargain.*', '*Not a guarantee. Not a legal statement. Not technically a sentence.'] },
    { if: { flag: 'owns_car' }, variants: [['Back for another? I knew it. You\'ve got the look. The "I need a second car" look.'], ['How\'s she running? Don\'t answer that. Legally I can\'t hear it.']] },
    { if: {}, variants: [['Step right up! Kick a tyre! Not that one.'], ['Every car on this lot has a story. Most of them are true!'], ['Looking to buy? Looking to sell? Looking to make a problem go away? Ha! Joke! Mostly!']] },
  ],
  farewells: [{ if: {}, variants: [['Drive safe! Or don\'t! Not my business once you\'ve left the lot!'], ['Tell your friends! Don\'t tell the police!'], ['Sold as seen!']] }],
  topics: [
    {
      id: 't_marty_buy', label: '"I\'m looking for a car."', tag: 'quest', keywords: ['car', 'buy', 'cars', 'motor', 'vehicle', 'pipit', 'dray', 'mule'],
      say: ['Course you are! Three beauties on the forecourt. The Pipit — economical. The Dray — spacious. The Mule — structural rust, very fashionable. Have a look. Fall in love. Sign here.'],
      effects: [{ dealer: 'fender' }],
    },
    {
      id: 't_marty_sell', label: '"Do you buy cars?"', keywords: ['sell', 'trade', 'trade-in', 'buy back'],
      say: ['Do I buy cars! I buy ANY car. Park it on the lot and I\'ll make you an offer. Forty percent of list, which sounds low, because it is.', 'And if it\'s the kind of car that comes with… a complicated past? Thirty percent. No questions. I don\'t even know what a question is.'],
      effects: [{ dealer: 'fender' }],
    },
    {
      id: 't_marty_plates', label: '"What are \'fresh plates\'?"', keywords: ['plates', 'stolen', 'paperwork', 'hot', 'respray', 'clean'],
      say: ['Fresh plates! Say you\'ve got a car. Say it\'s yours, spiritually, but on paper it belongs to some bloke. Park it on my lot, hundred and fifty obols, and by teatime it\'s got new plates, new papers and a brand-new history. Very moving history. The police love it.', 'I don\'t know what you\'re talking about. I never said any of that. Lovely weather.'],
      effects: [{ dealer: 'fender' }],
    },
    {
      id: 't_marty_warranty', label: '"Do your cars come with a warranty?"', keywords: ['warranty', 'guarantee', 'refund', 'broken', 'reliable'],
      say: ['Every Fender car comes with the Fender Promise: if it breaks down within the first thirty seconds, I will personally feel bad about it.'],
    },
    {
      id: 't_marty_self', label: '"How did you get into selling cars?"', keywords: ['marty', 'you', 'yourself', 'history', 'how'],
      say: ['Born on a forecourt! Well — near one. Me mum sold boats. Me dad sold boats that had been other people\'s boats. I\'m the first Fender to go into land vehicles. Proudest day of their lives. Still waiting for them to say so.'],
    },
  ],
  askAbout: [
    { keywords: ['julian', 'beaumont', 'gallery', 'luxury'], say: ['Beaumont! Halvermouth, East End. Sells the same thing I sell — four wheels and a dream — at forty times the price. Wouldn\'t let me in the door. I wasn\'t even TRYING to sell him anything. Much.'] },
    { keywords: ['police', 'lawrence', 'law', 'cops'], say: ['The police and I have an understanding. I don\'t understand them and they don\'t understand me. Works beautifully.'] },
    { keywords: ['steal', 'stealing', 'hotwire', 'theft'], say: ['Stealing cars is a crime and I would never encourage it. However. If one did. Hypothetically. The lot is open till seven.'] },
    { keywords: ['bus', 'buses', 'public transport'], say: ['The bus?! Why would anybody take the bus? Don\'t answer that. I\'ve got a Pipit that says you won\'t have to.'] },
  ],
  unknown: [['Couldn\'t tell you! Could sell you something, though.'], ['No idea! But have you considered a hatchback?']],
  gift: { loved: [['For ME? You\'re a treasure. I\'ll knock… nothing off. But I\'ll FEEL like knocking something off.']], liked: [['Ta very much!']], neutral: [['Lovely. I\'ll put it in the boot of something.']], disliked: [['Ah. Hm. I\'ll re-gift it to a customer.']], tooMany: [['Steady! People will think I\'m being bribed!']], ownStolen: [['Here, that\'s mine! …Where did you — never mind. Never mind.']] },
  barks: {
    greet: ['Step right up!', 'Every car a bargain!', 'You look like a Pipit person!'],
    work: ['*polishes a dent*', 'Low mileage! …For a submarine!', 'Sold as seen!', '*sticks a SALE sign over a rust patch*', 'Test drives available! Insurance not!'],
    relax: ['*counts notes, twice*', '*hums the theme from an advert he made up*'],
    sleep: ['…ninety-nine, ninety-nine… *snore*'],
    chat: ['Ha! Lovely!', 'Between you and me —'],
    argue: ['Sold as seen! SOLD AS SEEN!'],
  },
};

export const dlgJulian = {
  id: 'dlg_julian',
  greetings: [
    { if: { firstMeeting: true }, say: ['Good afternoon. Julian Beaumont. Welcome to the Gallery.', 'Do mind the Corsair. It is not a coat stand, whatever the last visitor believed.'] },
    { if: { wealth: '>=5000' }, variants: [['Ah — welcome back. Champagne? No? Very wise. One should never drink near a Tempest; it feels judged.'], ['How lovely to see you. The Gallery is, as ever, at your disposal.']] },
    { if: {}, variants: [['Good afternoon. Browsing, I take it.'], ['Welcome. Please don\'t touch the paintwork. Or the air near the paintwork.'], ['Ah. Yes. Hello.']] },
  ],
  farewells: [{ if: {}, variants: [['Good day.'], ['Do come again. When convenient.'], ['Mind the step. It\'s marble.']] }],
  topics: [
    {
      id: 't_julian_buy', label: '"I\'d like to see your cars."', tag: 'quest', keywords: ['car', 'buy', 'cars', 'motor', 'aurelia', 'tempest', 'corsair', 'regent', 'see'],
      say: [
        { if: { wealth: '<6500' }, text: 'Of course. Looking is, after all, free. The Aurelia, the Tempest, the Corsair and the Regent. Do let me know if anything… becomes affordable.' },
        { if: { wealth: '>=6500' }, text: 'Certainly. The Aurelia for comfort, the Tempest for distance, the Corsair for — let us say — character, and the Regent for when one has staff. Each is delivered to the forecourt, keys in the ignition.' },
      ],
      effects: [{ dealer: 'beaumont' }],
    },
    {
      id: 't_julian_trade', label: '"Would you take my car in part-exchange?"', keywords: ['sell', 'trade', 'part-exchange', 'trade-in', 'part exchange'],
      say: ['If it is parked on the forecourt, I shall have it appraised. Fifty-five percent of list, for anything with a clean history.', 'Anything with a… less clean history may try its luck on Westbrook Row. I\'m told the standards there are flexible.'],
      effects: [{ dealer: 'beaumont' }],
    },
    {
      id: 't_julian_fender', label: '"Have you heard of Fender\'s Pre-Loved Motors?"', keywords: ['fender', 'marty', 'used', 'westbrook'],
      say: ['Mr Fender came to the Gallery once, to "network". He tried to sell my doorman a Pipit. The doorman bought it. We do not speak of the doorman.'],
    },
    {
      id: 't_julian_self', label: '"How long has the Gallery been here?"', keywords: ['gallery', 'history', 'you', 'yourself', 'julian'],
      say: ['My grandfather opened the Gallery to sell carriages. My father sold the first motor cars in Halvermouth. I sell the last word in them. One likes to think the family has… progressed.'],
    },
  ],
  askAbout: [
    { keywords: ['moneybucks', 'oil', 'regent'], say: ['Sir Moneybucks is our most valued patron. He owns two Regents. He bought the second so the first would have company. That is the kind of client one dreams of.'] },
    { keywords: ['steal', 'stolen', 'theft', 'hotwire'], say: ['Every car in the Gallery is fitted with a discreet alarm, a tracking device, and the knowledge that I shall find you.'] },
    { keywords: ['bus', 'public transport'], say: ['I have heard of it.'] },
  ],
  unknown: [['I\'m afraid I couldn\'t say.'], ['That falls outside the remit of the Gallery.']],
  gift: { loved: [['How very thoughtful. I shall find it a suitable shelf.']], liked: [['Thank you. Quite unnecessary. Quite.']], neutral: [['…Thank you.']], disliked: [['Ah. One will… treasure it. Elsewhere.']], tooMany: [['Please. The Gallery is not a jumble sale.']], ownStolen: [['I believe that is mine.']] },
  barks: {
    greet: ['Good afternoon.', 'Welcome to the Gallery.'],
    work: ['*buffs a wing mirror with a silk cloth*', '*adjusts a price card by a millimetre*', 'Exquisite.', 'Please don\'t lean on the Aurelia.'],
    relax: ['*sips sherry*', '*reads the motoring column, disapprovingly*'],
    sleep: ['…walnut trim… *a dignified snore*'],
    chat: ['Quite.', 'Indeed.'],
    argue: ['I beg your pardon.'],
  },
};

export default [dlgMarty, dlgJulian];
