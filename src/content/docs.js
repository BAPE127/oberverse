// Readable documents. `effects` run every time the document is read; use
// flags in conditions for one-time consequences.
export const DOCS = {
  doc_welcome_letter: {
    title: 'A letter on the desk',
    body: [
      'Welcome to Lanternside!',
      'Number 9 is yours for the season. The heating knocks, the window sticks, and the gulls are not your friends.',
      'You said in your letter you were looking for "work, people, and something worth finding out". Lanternside has all three. Start at the Kettle & Crumb on Canal Row — Mags Pell knows everyone and everything, and usually has odd jobs going.',
      'Rent is cheap because the borough is quiet. Some say too quiet since the lighthouse went dark.',
      'If it\'s steady wages you\'re after, follow Gullwing Road east out of town to the Ober Fields. Ober\'s Oil is always hiring — Sir Moneybucks just isn\'t always paying.',
      '— The Obermere Housing Bureau',
      'P.S. Your spare change is in the wardrobe.',
    ],
    effects: [{ if: { notFlag: 'read_welcome' }, then: [{ flag: { read_welcome: true } }, { learn: 'fact_lighthouse_dark' }] }],
  },
  doc_permits_ledger: {
    title: 'Ledger of Keys & Permits',
    body: [
      'CIVIC PROPERTY — KEYS HELD',
      'Fountain pump room ........ Desk, middle drawer',
      'Notice board padlock ...... Desk, middle drawer',
      'LIGHTHOUSE (decommissioned) ...... Desk, TOP drawer. Access by written permission of the Clerk ONLY.',
      'Permits issued for Lighthouse access, last eleven years: 0',
    ],
    effects: [{ learn: 'fact_osric_has_key' }],
  },
  doc_visitor_register: {
    title: 'Visitors\' Register',
    body: [
      'Please sign in. All visits are recorded. — O. Vane, Clerk',
      'Signatures this month: "M. Pell (re: patio permit, AGAIN)", "T. Hollow (re: the noise thing)", "A Gull" (in crayon).',
    ],
    signable: true,
    effects: [
      {
        if: { notFlag: 'signed_register' },
        then: [{ flag: { signed_register: true } }, { rep: { fac_civic: 2 } }, { notify: 'You sign the register in your neatest hand. (Civic Office +2)' }],
      },
    ],
  },
  doc_company_ledger: {
    title: 'Ober\'s Oil — General Ledger',
    body: [
      'Columns of figures in Agnes Thornbury\'s immaculate hand. Wages: "deferred". Safety: "deferred". Sir Moneybucks\'s cigars: paid, promptly.',
      'An old volume is wedged at the back. Twelve years ago: "Dissolution auction, Obermere Harbour Board. Lot 14 — Harbourmaster\'s seal & effects. PAID. Authorised: R.E.M."',
      'A week later: "Night shipments, bay crossing — lamps extinguished per instruction. Bonus to crews for discretion."',
    ],
    effects: [{ learn: 'fact_moneybucks_bought_seal' }, { learn: 'fact_night_tankers' }],
  },
  doc_union_pamphlet: {
    title: 'A pamphlet under a teacup',
    body: [
      'WORKERS OF OBER\'S OIL! Three months\' back pay owed. Double shifts. Wages in company scrip, good only at the company store — where coffee costs four obols!',
      'We built his fortune. We can stop it. Ask a friend who wears a blue thread on his cuff.',
      'Someone has written in the margin: "Not yet, Otto. Not until they\'re ready."',
    ],
    effects: [{ learn: 'fact_workers_grievances' }],
  },
  doc_keeper_log: {
    title: 'The Keeper\'s Log',
    body: [
      'The final entries are cramped and hurried.',
      '"14th Thornmonth. Light steady. Gulls restless."',
      '"15th. A letter by night, signed only M. The great lens is to be removed for safekeeping. I do not like it, but the letter bears the old seal."',
      '"16th. Lens taken down. The Point is dark. I have oiled the clockwork so it may turn again the moment the lens returns. It WILL return."',
      'The rest of the pages are blank.',
    ],
    effects: [{ learn: 'fact_keeper_log' }],
  },
};
