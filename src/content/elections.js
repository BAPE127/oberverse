// Elections and campaigns (v0.95.0): every figure the election model uses, in one place (the same idea as src/content/income.js).
// Shares are fractions of the vote (0.01 = one point). The rules are in src/politics/election.js; the daily steps are in src/systems/politicsElections.js.
//
// Calibration: the figures were set by running hundreds of seeded elections (tests/elections.test.mjs): each side wins a healthy share,
// no side holds the presidency for ever, and no amount of money buys a win (the effect of spending is a saturating curve with a hard cap).

export const ELECTIONS = {
  /** A party's own money: it raises funds each day (the fundraising director raises more), and in the campaign it spends a share of what it holds every day. */
  funds: { perDay: 900, fundraiser: 700, governing: 300, spendRate: 0.045, split: { ads: 0.4, rallies: 0.3, ground: 0.3 } },

  /**
   * What spending buys. Each channel's effect is cap × (1 − e^(−spent ÷ scale)): the first obols count most, and no channel can pass its cap.
   * `staff` is the role that makes the channel work (a vacant role is a visible weakness: it works at `vacant` of its strength).
   */
  channels: {
    ads: { name: 'Advertising', scale: 70000, cap: 0.020, staff: ['communications', 'press_secretary'] },
    rallies: { name: 'Rallies and appearances', scale: 45000, cap: 0.014, staff: ['campaign_manager'] },
    ground: { name: 'Organisers on the ground', scale: 55000, cap: 0.016, staff: ['organiser', 'campaign_manager'] },
  },
  vacant: 0.6,

  /** The one debate, a few days before the vote: the leader's standing and the communications staff decide it; the winner gains a little. */
  debate: { daysBefore: 6, swing: 0.008 },

  /** How a result is worked out (see election.js). */
  weights: {
    undecidedToLeader: 0.35, // how far the undecided lean to the party already ahead among those who have decided
    fatigue: 0.011,          // a government loses this much (as a swing) for every term it has already held, on top of …
    fatigueLate: 0.012,      // … this much more for each term after the second
    promises: 0.020,         // a government that kept its manifesto gains up to this; one that broke it loses as much
    scandal: 0.060,          // a scandal's full weight (severity × credibility × attention) moves the vote by this much at most
    national: 0.010,         // a seeded national swing (sd), fixed by the election's id
    regional: 0.012,         // a seeded swing in each state (sd)
    swingCap: 0.12,          // however it adds up, no one is moved more than this
  },
  turnout: { base: 0.58, campaign: 0.08, close: 0.06, noise: 0.015 },
  seats: 100,

  /** Scandals: the press find one now and then (chance per party per day); each has a severity and credibility, fades with a half-life, and the press secretary shortens it. */
  scandals: { chance: 0.006, severity: [0.25, 0.85], credibility: [0.45, 1], attention: [0.4, 1], halfLife: 16, pressCut: 0.45, kept: 24 },

  /** The party manifesto: how many policies each party promises, taken from the ones it likes best. */
  manifesto: 3,

  /** Election night: results are announced at this hour on polling day; the leaders gather at the fountain in Sovereign Square, each party's staff on its own side of it. */
  night: { announce: '22:00', gather: '19:30', crowdMinutes: 210, spots: { leaders: 'crown_quarter:square_fountain', order: 'crown_quarter:demonstration', liberty: 'crown_quarter:press_line' } },
  logKept: 12,
};
