// Influence (v0.95.0): who will see you, what you may ask, what it costs, and what happens when it is found out. Pure data.
//
// Fictional game mechanics. Four things are kept apart and none converts into another: the money you hold, your reputation (the Civic Guild's
// opinion of you), your relationships (each person's own view of you) and your political support (what you have given to a party in the open).
// A door needs the right mix. Money alone does not open one. Every offer is recorded, successful or not.

export const INFLUENCE = {
  /** Donations to a party are public, recorded and capped per donor per term. They are the party's money (a transfer), they buy support and a hearing, never a vote. */
  donation: { min: 1000, cap: 50000, supportPer: 1000, favourPer: 12000, favourCap: 4, trustPer: 6000, trustCap: 10 },
  /** How standing reads: a score from reputation, support, relationships and exposure. */
  tiers: [{ id: 'unknown', label: 'Unknown', from: -999 }, { id: 'known', label: 'Known', from: 12 }, { id: 'trusted', label: 'Trusted', from: 35 }, { id: 'inner', label: 'Inner circle', from: 70 }],

  /** The contacts. `side` says whose people they are; `needs` is what opens the door: a relationship of `rel`, OR support of `support` for the party together with a reputation of `rep`. */
  contacts: {
    president: { id: 'president', side: 'gov', role: 'The President', needs: { rel: 25, support: 40, rep: 5 }, integrity: 0.30, likes: 'A good reason, from someone who is known.', issues: null, price: 1.6, favours: 2 },
    chief: { id: 'npc_hh_chief', side: 'gov', role: 'Chief of Staff to the President', needs: { rel: 8, support: 10, rep: 0 }, integrity: 0.12, likes: 'Tidy requests, made in good time.', issues: null, price: 1, favours: 3 },
    npc_min_treasury: { id: 'npc_min_treasury', side: 'gov', role: 'Minister of the Treasury', needs: { rel: 12, support: 20, rep: 0 }, integrity: 0.22, likes: 'Savings. Anything that arrives with a way to pay for it.', issues: ['public_spending'], price: 1.2, favours: 2 },
    npc_min_defence: { id: 'npc_min_defence', side: 'gov', role: 'Minister of Defence & Security', needs: { rel: 12, support: 20, rep: 0 }, integrity: 0.30, likes: 'Readiness; a shipyard that delivers on time.', issues: ['defence_budget', 'intervention', 'surveillance'], price: 1.4, favours: 2 },
    npc_min_interior: { id: 'npc_min_interior', side: 'gov', role: 'Minister of the Interior & Police', needs: { rel: 12, support: 20, rep: 0 }, integrity: 0.25, likes: 'Order. A quiet word before a loud one.', issues: ['police_funding', 'enforcement'], price: 1.2, favours: 2 },
    npc_min_agriculture: { id: 'npc_min_agriculture', side: 'gov', role: 'Minister of Agriculture & Trade', needs: { rel: 10, support: 15, rep: 0 }, integrity: 0.35, likes: 'Farmers, and anyone who has been near a cow.', issues: ['farm_inspection', 'regulation'], price: 1, favours: 2 },
    opposition: { id: 'opposition', side: 'opp', role: 'Leader of the opposition', needs: { rel: 10, support: 15, rep: 0 }, integrity: 0.30, likes: 'A promise she can repeat on the steps.', issues: null, price: 1.3, favours: 2 },
    opposition_chief: { id: 'opposition_chief', side: 'opp', role: 'Opposition chief of staff', needs: { rel: 6, support: 8, rep: 0 }, integrity: 0.14, likes: 'Anything that makes the government look worse.', issues: null, price: 0.9, favours: 3 },
  },

  /**
   * What you may ask. `worth` is what it is worth to the asker (obols); a bribe's price is worth × the contact's price × (1 + repeats). `legit` requests are lobbying (they cost favours, not money); `illicit` ones are offers.
   */
  requests: {
    meeting: { name: 'Ask for a meeting', blurb: 'Costs nothing. May be refused; a refusal is explained.', legit: true, illicit: false, worth: 0, favours: 0, sides: ['gov', 'opp'] },
    push: { name: 'Ask them to take up a policy', blurb: 'The cabinet is asked to weigh it at its next window. It will not take up what the party stands against.', legit: true, illicit: true, worth: 60000, favours: 1, sides: ['gov'], needsPolicy: true },
    stall: { name: 'Ask for a delay', blurb: 'A policy on its way waits a while longer: two weeks, or one.', legit: true, illicit: true, worth: 40000, favours: 1, sides: ['gov'], needsPolicy: true },
    quiet: { name: 'Have a scandal kept quiet', blurb: 'The government\'s worst story of the moment gets less attention. Never legitimate.', legit: false, illicit: true, worth: 50000, favours: 0, sides: ['gov'] },
    leak: { name: 'Pass them something on the government', blurb: 'A story, passed to the opposition, about the party in office. Never legitimate; nobody can say how true it is.', legit: false, illicit: true, worth: 30000, favours: 0, sides: ['opp'] },
  },

  /** The odds of an offer (see src/politics/influence.js). Every figure bounded. */
  odds: { base: 0.58, perRel: 0.004, perSupport: 0.003, perRep: 0.003, repeat: 0.30, pressure: 0.28, gatekeeper: 0.14, floor: 0.06, ceiling: 0.88, favour: 0.06, lobbyBase: 0.50 },
  /** Of those who take it: accepted / half done / delayed. Of those who do not: refused / counter-offer / reported (a bribe only). */
  split: { take: { accepted: 0.55, half: 0.25, delayed: 0.20 }, refuse: { refused: 0.55, counter: 0.25, reported: 0.20 }, counterRise: 1.5, counterDays: 3 },

  /** What is remembered, and what is found. */
  ledger: { kept: 60 },
  heat: { illicit: 4, reported: 7, decay: 0.35, exposeFrom: 5, chancePer: 0.035, cap: 0.5, after: 0.4 },
  exposure: { fineTimes: 2, fineMin: 5000, repLoss: 8, trustLoss: 10, severity: { taken: 0.6, tried: 0.35 }, attention: 0.8 },
  repeatWindow: 60, repeatCap: 3,
  meeting: { rel: 2, daysOpen: 2 },
  obligation: { days: 30, extend: 20 },
  /** The faction whose opinion is your reputation in the capital. */
  repFaction: 'fac_civic',
};
