// What the government's policies do to you and the economy (v0.96.0). Every figure is a bounded multiplier or a named levy, read where a price or a cost is
// already worked out; nothing is a new tax on your wallet. A levy you pay is the state's revenue (it reduces the state's debt: no money from nowhere), and every
// effect is shown to you as a named line (Politics → Government).
//
// Police, enforcement and surveillance reach the police and the influence ledger (v0.97.0); commitments abroad reach diplomacy (src/systems/politicsDiplomacy.js). The knob
// `enabled` switches the ECONOMY AND POLICE effects in this file off for a parity check (the farm fee, port fees, Sund's budgets, sentiment, the bond's debt premium, police delay, fines, sentences and heat). It does not undo diplomacy (the one writer of wars and embargoes, v0.96.0) or the merge of Sund's bond, which are not effects.

const off = typeof process !== 'undefined' && process.env && process.env.OBERVERSE_POLITICS === 'off';

export const EFFECTS = {
  enabled: !off,

  /** Per policy in force. Each key is a hook (see src/politics/effects.js); a sector map moves what the market expects the sector's companies to earn (a share of price). */
  policies: {
    farm_up: { farmFee: 0.04, line: 'Stricter farm inspection: a 4% inspection fee on what you sell from your farm and herds.' },
    farm_down: { line: 'Lighter farm inspection: no inspection fee on farm sales.', sentiment: { agriculture: 0.01 } },
    reg_up: { portFees: 0.15, sentiment: { _all: -0.01 }, line: 'More inspections and licences: port and licensing fees on your voyages are 15% higher, and companies expect slightly lower profits.' },
    reg_down: { portFees: -0.10, sentiment: { _all: 0.008 }, line: 'Less business regulation: port and licensing fees on your voyages are 10% lower, and companies expect slightly higher profits.' },
    defence_up: { sundArms: 0.5, sentiment: { arms: 0.03, aerospace: 0.01 }, line: 'Raised defence spending: Sund buys more from the arms trade (its arms budget refills 50% faster) and arms companies are expected to earn more.' },
    defence_down: { sundArms: -0.4, sentiment: { arms: -0.03, aerospace: -0.01 }, line: 'Cut defence spending: Sund buys less (its arms budget refills 40% slower) and arms companies are expected to earn less.' },
    abroad_up: { sundDisputes: 0.6, worldTension: 0.08, relations: -4, line: 'More commitments abroad: disputes that Sund is party to are 60% likelier to start, the world is a little tenser, and other countries think a little less of Sund.' },
    abroad_down: { sundDisputes: -0.5, worldTension: -0.05, relations: 6, line: 'Fewer commitments abroad: disputes that Sund is party to are half as likely to start, the world is a little calmer, and other countries think a little better of Sund.' },
    police_up: { policeDelay: -0.25, line: 'Raised police funding: a call to the police is answered about a quarter sooner, and a demonstration is policed more firmly.' },
    police_down: { policeDelay: 0.3, line: 'Cut police funding: a call to the police takes about 30% longer to be answered, and demonstrations are policed more lightly.' },
    enforce_strict: { fineFactor: 0.25, sentenceFactor: 0.25, line: 'Stricter enforcement: fines to get out of trouble are 25% higher and sentences 25% longer.' },
    enforce_light: { fineFactor: -0.2, sentenceFactor: -0.25, line: 'Lighter enforcement: fines are 20% lower and sentences 25% shorter.' },
    surveil_up: { heatFactor: 0.25, line: 'Expanded surveillance: illicit offers leave 25% more heat, so investigators find them sooner.' },
    surveil_down: { heatFactor: -0.2, line: 'Limited surveillance: illicit offers leave 20% less heat.' },
    spend_up: { publicBudgets: 0.4, sentiment: { industrial: 0.01, transport: 0.01 }, line: 'Expanded public spending: Sund\'s public customers (the Space Office, the Met Office) have 40% more to spend on tenders.' },
    spend_down: { publicBudgets: -0.3, sentiment: { industrial: -0.01, transport: -0.01 }, line: 'Cut public spending: Sund\'s public customers have 30% less to spend on tenders.' },
  },

  /** Bounds on the sum of every policy's effect, per hook. */
  bounds: { farmFee: [0, 0.08], portFees: [-0.2, 0.3], sundArms: [-0.6, 1], publicBudgets: [-0.5, 0.8], sundDisputes: [-0.6, 1], worldTension: [-0.2, 0.3], relations: [-15, 15], policeDelay: [-0.4, 0.5], fineFactor: [-0.3, 0.4], sentenceFactor: [-0.4, 0.5], heatFactor: [-0.3, 0.4], sentiment: 0.05 },

  /** The tender customers that are Sund's own public bodies. */
  publicCustomers: ['cu_sund_space', 'cu_halver_weather'],

  /** The state's debt moves the yield of its bond (the one bond, v0.96.0): over `debtFrom` of a year's revenue, and while the month closes in deficit; bounded. Rates, not obols. */
  debt: { debtFrom: 0.25, perYear: 0.012, deficitPerShare: 0.012, max: 0.015 },
};
