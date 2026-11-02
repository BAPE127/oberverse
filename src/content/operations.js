// What managers do to run a business, and how careful they are (v0.91.1). Data only: src/systems/operations.js carries it out.
export const OPS = {
  reserveDays: 7, // cash a manager always leaves in the business: this many days of its running costs
  shipping: {
    perPass: 6, // contracts sent in one hour, at most
    minProfit: 150, // obols a voyage must clear, at the least
    minMargin: 0.25, // ...and this share of what it costs to send
    maxRisk: 0.12, // the chance of trouble a manager will accept without being told
    insureAbove: 0.04, // above this chance of trouble, the voyage is insured
  },
  arms: {
    wholesaleDaily: 1500, // obols of the cage's output a manager sells to Lucas in a day, after export orders are filled (you, at his counter, can sell up to his own limit)
  },
  farming: {
    priceSoftening: 0.88, // a harvest sold into the Co-op fetches about this share of the day's price (the price softens as the bins fill)
    turnaroundDays: 1, // days a field stands empty between crops
    labourPerTile: 2.5, // field hands: obols per tile per job (tilling and planting are two jobs, harvest one), before the cost factor
    fertiliseIfGainOver: 2.5, // fertilise when the extra yield is worth this many times the fertiliser
    feedDays: 4, // days of feed a manager keeps in a feeder
  },
};
