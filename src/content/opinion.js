// Public opinion (v0.94.0): nine blocs of voters across the nine states of Sund (from the Atlas), never individual voters. Pure data.
//
// A bloc leans on each issue (-2 … +2: how strongly it wants the issue pushed in the + direction) and has a regional share of every state's people;
// a state has a weight (its share of Sund's people) and a small tilt towards one party (a local loyalty, from its character). Opinion is worked out
// from these, from the government's policies and from measured drivers (the deficit, wars, embargoes): see src/politics/opinion.js.
// Polls ask a sample of it, with a stated margin, a house effect and a reporting delay.

export const BLOCS = {
  workers: { name: 'Workers and tradespeople', lean: { police_funding: 0, enforcement: -1, surveillance: -1, defence_budget: -1, intervention: -1, regulation: 1, farm_inspection: 0, public_spending: 2 } },
  farmers: { name: 'Farmers and rural voters', lean: { police_funding: 0, enforcement: 0, surveillance: -1, defence_budget: 0, intervention: -1, regulation: -2, farm_inspection: -2, public_spending: 0 } },
  business: { name: 'Business owners', lean: { police_funding: 1, enforcement: 1, surveillance: 0, defence_budget: 1, intervention: 0, regulation: -2, farm_inspection: -1, public_spending: -2 } },
  ports: { name: 'Port and shipping workers', lean: { police_funding: 0, enforcement: 0, surveillance: -1, defence_budget: 1, intervention: 1, regulation: 0, farm_inspection: 0, public_spending: 1 } },
  defence: { name: 'Defence and arms workers', lean: { police_funding: 1, enforcement: 1, surveillance: 1, defence_budget: 2, intervention: 2, regulation: -1, farm_inspection: 0, public_spending: 0 } },
  public_servants: { name: 'Public servants', lean: { police_funding: 1, enforcement: 0, surveillance: 0, defence_budget: 0, intervention: 0, regulation: 1, farm_inspection: 1, public_spending: 2 } },
  urban: { name: 'Urban middle class', lean: { police_funding: 1, enforcement: 1, surveillance: 1, defence_budget: 0, intervention: 0, regulation: 1, farm_inspection: 1, public_spending: 0 } },
  civil_liberties: { name: 'Civil-liberties voters', lean: { police_funding: -1, enforcement: -2, surveillance: -2, defence_budget: -1, intervention: -2, regulation: 0, farm_inspection: 0, public_spending: 1 } },
  coastal: { name: 'Coastal and fishing communities', lean: { police_funding: 0, enforcement: 0, surveillance: -1, defence_budget: 1, intervention: 0, regulation: -1, farm_inspection: 0, public_spending: 0 } },
};

/** Sund's nine states (the Atlas ids): weight (share of the people), the blocs' shares there (sum 1), and a tilt (+ Order, − Liberty) in points of support. */
const R = (weight, tilt, shares) => ({ weight, tilt, shares });
export const REGIONS = {
  sd_crown: R(0.30, 0.00, { workers: 0.22, farmers: 0.01, business: 0.14, ports: 0.14, defence: 0.05, public_servants: 0.16, urban: 0.22, civil_liberties: 0.05, coastal: 0.01 }),
  sd_lariat: R(0.14, 0.03, { workers: 0.16, farmers: 0.36, business: 0.06, ports: 0.01, defence: 0.04, public_servants: 0.07, urban: 0.14, civil_liberties: 0.06, coastal: 0.10 }),
  sd_gullwing: R(0.07, -0.02, { workers: 0.14, farmers: 0.06, business: 0.06, ports: 0.18, defence: 0.02, public_servants: 0.05, urban: 0.08, civil_liberties: 0.07, coastal: 0.34 }),
  sd_hald: R(0.09, 0.04, { workers: 0.22, farmers: 0.12, business: 0.05, ports: 0.04, defence: 0.20, public_servants: 0.08, urban: 0.14, civil_liberties: 0.03, coastal: 0.12 }),
  sd_gull_isles: R(0.02, -0.03, { workers: 0.08, farmers: 0.04, business: 0.03, ports: 0.10, defence: 0.01, public_servants: 0.04, urban: 0.04, civil_liberties: 0.08, coastal: 0.58 }),
  sd_sundholm: R(0.13, 0.05, { workers: 0.16, farmers: 0.05, business: 0.09, ports: 0.16, defence: 0.14, public_servants: 0.11, urban: 0.15, civil_liberties: 0.04, coastal: 0.10 }),
  sd_fjords: R(0.12, -0.02, { workers: 0.18, farmers: 0.10, business: 0.05, ports: 0.08, defence: 0.03, public_servants: 0.08, urban: 0.07, civil_liberties: 0.10, coastal: 0.31 }),
  sd_skarn: R(0.08, 0.02, { workers: 0.40, farmers: 0.06, business: 0.07, ports: 0.01, defence: 0.12, public_servants: 0.05, urban: 0.06, civil_liberties: 0.08, coastal: 0.15 }),
  sd_kings: R(0.05, 0.06, { workers: 0.12, farmers: 0.05, business: 0.05, ports: 0.12, defence: 0.14, public_servants: 0.08, urban: 0.06, civil_liberties: 0.04, coastal: 0.34 }),
};

export const POLLSTERS = {
  courier: { name: 'The Halver Courier Poll', house: { order: 0.012, liberty: -0.008 }, sample: [900, 1300], every: 14, offset: 3, delay: 2 },
  research: { name: 'Sund Research Group', house: { order: -0.006, liberty: 0.01 }, sample: [1000, 1500], every: 14, offset: 10, delay: 3 },
  panel: { name: 'The Fishermen\'s Panel', house: { order: 0.004, liberty: 0.004 }, sample: [500, 800], every: 21, offset: 6, delay: 1 },
};

export const OPINION = {
  /** How strongly each thing moves approval and support; every figure bounded. */
  weights: { unrest: 0.05, affinityGov: 0.18, affinityOpp: 0.08, policy: 0.06, policyCap: 0.3, deficit: 0.5, war: 0.03, embargo: 0.015, tilt: 1, softmax: 2.2, mood: 2.5, other: 0.35, undecided: 0.5 },
  logKept: 60, seriesKept: 120,
};
