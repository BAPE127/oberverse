// The government's policy catalogue and budget (v0.94.0). Pure data. A policy is a move on one of the political issues (src/content/politics.js):
// it costs (or saves) money every month in the state's budget, the parties lean for or against it by their stance on its issue, and it names the
// variable it will move once the Economy release wires it in. In 0.94.0 a policy changes only the government's books and the public's opinion: it
// does not yet change any price, cost, the police or any war you play with. Neither direction is good: each has a cost and a risk.
//
// Costs are in thousands of obols a month of the STATE's money (never yours): positive spends, negative saves.
const P = (id, name, issue, dir, cost, opposes, blurb, moves, blocs) => ({ id, name, issue, dir, cost, opposes, blurb, moves, blocs });

export const POLICIES = {
  police_up: P('police_up', 'Raise police funding', 'police_funding', 1, 120, 'police_down', 'More officers, better training and equipment.', 'police staffing and response time', { public_servants: 1, workers: 0, civil_liberties: -1, business: 0 }),
  police_down: P('police_down', 'Cut police funding', 'police_funding', -1, -80, 'police_up', 'Fewer officers; the savings go to the treasury.', 'police staffing and response time', { public_servants: -1, civil_liberties: 1, business: 0 }),
  enforce_strict: P('enforce_strict', 'Stricter enforcement', 'enforcement', 1, 60, 'enforce_light', 'Tougher penalties and every offence chased.', 'which offences the police chase, and the penalties', { urban: 1, civil_liberties: -2, workers: -1 }),
  enforce_light: P('enforce_light', 'Lighter enforcement', 'enforcement', -1, -30, 'enforce_strict', 'Minor offences overlooked; resources kept for serious ones.', 'which offences the police chase, and the penalties', { urban: -1, civil_liberties: 2, workers: 1 }),
  surveil_up: P('surveil_up', 'Expand surveillance powers', 'surveillance', 1, 90, 'surveil_down', 'More cameras, more records, more warrants.', 'how much the state can watch (and the risk of exposure)', { urban: 1, civil_liberties: -2, business: 0 }),
  surveil_down: P('surveil_down', 'Limit surveillance powers', 'surveillance', -1, -20, 'surveil_up', 'Fewer cameras and a judge for every warrant.', 'how much the state can watch (and the risk of exposure)', { civil_liberties: 2, urban: -1 }),
  defence_up: P('defence_up', 'Raise defence spending', 'defence_budget', 1, 220, 'defence_down', 'Procurement, readiness and a busy arms industry.', 'defence procurement and arms-company demand', { defence: 2, public_servants: 1, workers: 0, business: 1 }),
  defence_down: P('defence_down', 'Cut defence spending', 'defence_budget', -1, -140, 'defence_up', 'A smaller forces budget and a smaller order book.', 'defence procurement and arms-company demand', { defence: -2, business: -1 }),
  abroad_up: P('abroad_up', 'More military commitments abroad', 'intervention', 1, 160, 'abroad_down', 'A sharper foreign policy: ships, advisers, guarantees.', 'the risk and intensity of conflicts abroad', { defence: 1, ports: 1, civil_liberties: -1 }),
  abroad_down: P('abroad_down', 'Fewer commitments abroad', 'intervention', -1, -60, 'abroad_up', 'Bring the ships home; send diplomats instead.', 'the risk and intensity of conflicts abroad', { defence: -1, ports: -1, civil_liberties: 1 }),
  reg_up: P('reg_up', 'More inspections and licences', 'regulation', 1, 40, 'reg_down', 'More compliance in selected industries.', 'compliance costs and risks for businesses', { business: -2, public_servants: 1, urban: 1 }),
  reg_down: P('reg_down', 'Cut business regulation', 'regulation', -1, -20, 'reg_up', 'Fewer forms, fewer inspectors, more risk.', 'compliance costs and risks for businesses', { business: 2, public_servants: -1 }),
  farm_up: P('farm_up', 'Stricter farm inspection', 'farm_inspection', 1, 30, 'farm_down', 'More inspections and licensing of farms.', 'farm running costs and compliance days', { farmers: -2, urban: 1, public_servants: 1 }),
  farm_down: P('farm_down', 'Lighter farm inspection', 'farm_inspection', -1, -10, 'farm_up', 'Fewer inspections; trust the farmers.', 'farm running costs and compliance days', { farmers: 2, urban: -1 }),
  spend_up: P('spend_up', 'Expand public spending', 'public_spending', 1, 250, 'spend_down', 'More schools, clinics and roads.', 'services, jobs and the deficit', { public_servants: 2, workers: 1, business: -1, urban: 1 }),
  spend_down: P('spend_down', 'Cut public spending', 'public_spending', -1, -200, 'spend_up', 'A leaner state, a smaller deficit.', 'services, jobs and the deficit', { public_servants: -2, workers: -1, business: 1 }),
};

export const GOVERNMENT = {
  /** The seven states of a policy, in order (the Assembly vote sits between review and approved). */
  states: ['proposed', 'review', 'approved', 'implementing', 'active', 'suspended', 'ended'],
  /** Days a policy waits in each state before it moves on (the Assembly votes when review ends). */
  days: { proposed: 3, review: 5, approved: 2, implementing: 6 },
  /** The cabinet meets every `cabinet` days (Thornday) and the budget every `budget` days (the monthly window); at most `proposals` new policies a cabinet. */
  cabinetEvery: 7, budgetEvery: 30, proposals: 1, maxActive: 7,
  /** Party discipline: the share of its seats the governing party can always count on, on top of how its members lean. */
  discipline: 0.15,
  /** The state's money: thousands of obols a month. Revenue is modelled from the country; it is never taken from the player's wallet. */
  budget: {
    revenue: 3000,
    standing: { administration: 700, services: 900, infrastructure: 600 },
    warPenalty: 0.04, embargoPenalty: 0.03,
    /** A government may run a deficit up to this much of a month's revenue before the administration must cut or raise revenue. */
    deficitLimit: 0.25,
    /** The state's debt stock at the start (thousands) and the premium its interest pays over the policy rate. */
    startingDebt: 9000, premium: 0.01,
  },
  /** How a government rates a candidate policy at a cabinet window (all bounded; see src/politics/policy.js). */
  weights: { fit: 1.0, affordability: 0.6, election: 0.4, approval: 0.5 },
  starting: 3,
};
