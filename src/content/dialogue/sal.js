// Sal Vage: parts, machinery (once you've proven you can build by hand), and
// daily delivery contracts. Effects: { factory: { contract: 'small'|'large'|null } }.
export const dlgSal = {
  id: 'dlg_sal',
  greetings: [
    { if: { firstMeeting: true }, say: ['Welcome, welcome! Sal Vage, Sal\'s Surplus. If it beeps, I\'ve got it. If it doesn\'t beep, I\'ve probably still got it.', 'No questions asked. No answers given. What\'ll it be?'] },
    { if: { factory: { owns: true } }, variants: [['My favourite warehouse owner!'], ['How\'s production? Don\'t tell me. I don\'t want to know. Tell me what you need.']] },
    { if: {}, variants: [['What\'ll it be?'], ['Welcome back!'], ['Everything must go! Except the stuff that mustn\'t.']] },
  ],
  farewells: [{ if: {}, variants: [['Come back soon!'], ['Mind the batteries on the floor.']] }],
  topics: [
    {
      id: 't_sal_parts', label: '"I need calculator parts."', tag: 'quest', keywords: ['parts', 'buy', 'casing', 'keypad', 'screen', 'board', 'battery'],
      say: ['Casings, button pads, screens, boards, batteries. Five parts make one calculator. Hypothetically.'],
      effects: [{ openShop: 'shop_surplus' }],
    },
    {
      id: 't_sal_how', label: '"How are calculators made?"', keywords: ['how', 'make', 'build', 'recipe', 'craft'],
      say: [
        'Three steps and a twist. Solder a board to a battery — that\'s your core. Press a casing, a keypad and a screen together — that\'s your shell. Put core in shell — that\'s a blank. Then tune the blank, and it\'s whatever you need it to be. Charm, wits, the lot.',
        'You can do it all by hand at a workbench. Slow, mind. Get yourself a warehouse — there\'s three for sale on this quay — and once you\'ve shown me you can make a few by hand, I\'ll sell you the machinery to do it properly.',
      ],
    },
    {
      id: 't_sal_machines', label: '"I want machinery."', tag: 'quest', keywords: ['machines', 'machinery', 'belt', 'inserter', 'generator', 'automation'],
      say: [
        { if: { factory: { made: '<5' } }, text: 'Machinery is for professionals. Make me five calculators by hand first — any kind — and come back. You\'ve made {made}.' },
        { if: { factory: { made: '>=5' } }, text: 'A real producer! Soldering stations, case presses, assemblers, tuning benches, belts, arms and generators. Place them in your warehouse — press B in there to build.' },
      ],
      effects: [{ if: { factory: { made: '>=5' } }, then: [{ openShop: 'shop_machines' }] }],
    },
    {
      id: 't_sal_deliveries', label: '"Can you deliver parts?"', tag: 'quest', keywords: ['deliver', 'delivery', 'contract', 'crate'],
      say: [
        { if: { factory: { owns: false } }, text: 'Deliver where? You need a warehouse first. Three for sale on this quay.' },
        { if: { factory: { owns: true, made: '<10' } }, text: 'Deliveries are for regulars. Ten calculators made — by hand or machine — and we\'ll talk. You\'re at {made}.' },
        { if: { factory: { owns: true, made: '>=10' } }, text: 'Every morning at seven, straight into your input bay at {deliveryTo}. Paid on delivery. Small crate: five of each part, {smallPrice} obols. Large crate: fifteen of each, {largePrice} obols. Current order: {contract}.' },
      ],
      choices: [
        { id: 'c_sal_small', label: 'Small crate every morning ({smallPrice} obols).', if: { factory: { owns: true, made: '>=10' } }, say: ['Small it is. Seven sharp.'], effects: [{ factory: { contract: 'small' } }] },
        { id: 'c_sal_large', label: 'Large crate every morning ({largePrice} obols).', if: { factory: { owns: true, made: '>=10' } }, say: ['Large! A professional. Seven sharp.'], effects: [{ factory: { contract: 'large' } }] },
        { id: 'c_sal_cancel', label: 'Cancel deliveries.', if: { factory: { contract: true } }, say: ['Cancelled. No hard feelings. Some soft ones.'], effects: [{ factory: { contract: null } }] },
        { id: 'c_sal_nvm', label: '"Never mind."', say: ['Suit yourself.'] },
      ],
    },
    {
      id: 't_sal_sell', label: '"Do you buy calculators?"', keywords: ['sell', 'buy back', 'surplus'],
      say: ['I buy anything that beeps. Finished calculators, seven obols. Blanks, three. It\'s not a lot. It\'s surplus. That\'s the name of the shop.'],
      effects: [{ openShop: 'shop_surplus' }],
    },
  ],
  askAbout: [
    { keywords: ['warehouse', 'warehouses', 'cannery', 'pier'], say: ['Warehouse 7, three hundred. Pier 9 Shed, seven-fifty. The Old Cannery, fifteen hundred — smells of sardines, but you can fit a whole production line in there. Signs by the doors.'] },
    { keywords: ['arthur', 'sums', 'gang'], say: ['The Sums buy elsewhere. Arthur says my margins are an insult to arithmetic. If you\'re thinking of competing with them… I didn\'t hear that. I don\'t hear anything. It\'s the batteries. Tinnitus.'] },
  ],
  unknown: [['No questions asked. No answers given.'], ['Couldn\'t say. Wouldn\'t say. Both.']],
  gift: { loved: [['For me? Sal\'s Surplus thanks you!']], liked: [['Ta!']], neutral: [['Into the bin it goes. The keeping bin.']], disliked: [['I\'ll… find a shelf for it.']], tooMany: [['Steady on.']], ownStolen: [['That\'s mine, that is.']] },
  barks: { greet: ['Welcome!', 'What\'ll it be?'], work: ['*tests a screen: 8.8.8.8*', 'Everything must go!', '*counts batteries*'], sleep: ['…beep… *snore*'], chat: ['Hypothetically!', 'Ha!'], argue: ['No refunds!'] },
};

export default [dlgSal];
