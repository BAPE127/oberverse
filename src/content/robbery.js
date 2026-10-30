// Bank robbery (v0.79.0). Data only: src/corp/robbery.js holds the state machine, src/systems/robbery.js carries it out.
//
// The loot is a *defined* quantity of physical valuables — banknotes and gold bars in a vault stock — and nothing else. It is never the bank's
// balance sheet, its bonds, its customers' balances or any record. The vault stock is refilled after a robbery over the recovery.
// A robbery changes nothing about anyone's credit, loan terms, ratings, valuations or rankings: see docs/CORPORATE.md and tests/robbery_separation.test.mjs.
export const BAR_VALUE = 2000; // what a gold bar is worth (item_gold_bar's price)

export const ROBBERY = {
  banks: {
    first: {
      name: 'First Bank of Halvermouth', street: 'halvermouth', building: 'b_bank', hall: 'first_bank', vault: 'bank_vault', counter: 'bank_tellers',
      hours: { from: '09:00', to: '17:00' }, staff: ['npc_augustus', 'npc_prudence', 'npc_cyrus', 'npc_bertram'], guards: ['npc_bertram'],
      stock: { cash: 400000, gold: 40 }, // what the vault holds when full
      haul: { cash: 250000, gold: 25 }, // the most one robbery can take (the owner's answer: large)
      closeDays: 4, restockPerDay: { cash: 100000, gold: 10 }, press: 'the central bank',
    },
    lariat: {
      name: 'Lariat State Bank', street: 'lariat', building: 'b_bank', hall: 'lariat_bank', vault: 'lb_vault', counter: 'lb_teller',
      hours: { from: '09:00', to: '16:00' }, staff: ['npc_hollis', 'npc_dottie', 'npc_clint'], guards: ['npc_clint'],
      stock: { cash: 90000, gold: 8 },
      haul: { cash: 40000, gold: 4 }, // smaller, as the owner asked
      closeDays: 3, restockPerDay: { cash: 30000, gold: 3 }, press: 'the county bank',
    },
  },
  warnMinutes: 2, // a gun drawn in the hall: this long to put it away or leave before it is a hold-up in all but name
  complyMinutes: 3, // a hold-up: how long the staff take to open the vault under the gun
  crackMinutes: 12, // a break-in: how long the time-lock takes to work through
  breakInAlarm: 10, // minutes after you are inside a closed bank that the silent alarm reaches the police
  holdupAlarm: 1, // minutes after a hold-up begins that someone hits the alarm
  policeWindow: 30, // minutes the police stay on the scene before the bank is sealed for the investigation
  openMinutes: 8, // a vault left open stays open this long after it is opened
  // a robbery's market reaction: a premium on Halvermouth's government bond yields, only for the First Bank (the central bank), fading over ten days
  premium: { max: 0.0015, days: 10 },
};
