// The political system's content (v0.93.0): the constitution, the two parties and the issues they differ on. Pure data; every figure that a later
// release tunes lives here (the same idea as src/content/income.js). The rules are in src/politics/*.js and the service is src/systems/politics.js.
//
// Sund is a constitutional monarchy. The king (eleven) is head of state; an elected President is head of government; one Assembly gives a
// yes/no on bills (a tally of seats, not a simulated chamber). A term is 120 game days and the election falls in its last 30.

export const POLITICS = {
  /** A term lasts `termDays`; its election is in the last `electionDays` of it (the last day is polling day). */
  constitution: {
    termDays: 120,
    electionDays: 30,
    assemblySeats: { order: 46, liberty: 44, other: 10 },
    king: { name: 'the King of Sund', age: 11, seat: 'Kingsfjord Castle', note: 'Head of state: opens the Assembly, signs laws, reviews the fishing fleet on Mondays.' },
    president: { seat: 'Halver House', note: 'Head of government, elected for one term at a time.' },
  },

  /** The issues the parties differ on. Each stance is -2 (strongly against) … +2 (strongly for). A policy later moves a named variable; the stance is only what the party leans to. */
  issues: {
    police_funding: { name: 'Police funding', blurb: 'Staffing, training and equipment for the police.' },
    enforcement: { name: 'Enforcement strictness', blurb: 'Penalties, and how hard minor offences are chased.' },
    surveillance: { name: 'Surveillance powers', blurb: 'What the state may watch.' },
    defence_budget: { name: 'Defence spending', blurb: 'Procurement, readiness and the arms industry.' },
    intervention: { name: 'Foreign intervention', blurb: 'Military commitments abroad; how sharp the foreign policy is.' },
    regulation: { name: 'Business regulation', blurb: 'Inspections, licences and compliance.' },
    farm_inspection: { name: 'Farm inspection', blurb: 'How often and how hard farms are inspected.' },
    public_spending: { name: 'Public spending', blurb: 'The size of the state and how it is paid for.' },
  },

  /** The two parties. The leaders keep exactly the names the owner gave. Party names are working names the player may rename later. */
  parties: {
    order: {
      name: 'the Order Party', short: 'Order', colour: '#3a5a9a', leader: 'npc_vegas',
      blurb: 'Strict law enforcement, public order, national security and a strong executive.',
      platform: { police_funding: 2, enforcement: 2, surveillance: 1, defence_budget: 2, intervention: 1, regulation: 1, farm_inspection: 1, public_spending: 0 },
    },
    liberty: {
      name: 'the Liberty League', short: 'Liberty', colour: '#c8803a', leader: 'npc_susan',
      blurb: 'Lighter enforcement, individual freedom, less regulation and less intervention abroad.',
      platform: { police_funding: -1, enforcement: -2, surveillance: -2, defence_budget: -1, intervention: -2, regulation: -1, farm_inspection: -1, public_spending: 1 },
    },
  },

  /** The roles a party's staff fill (ten; some are combined in a small party). Records exist from the start; people arrive with the People release. */
  staffRoles: [
    { id: 'chief_of_staff', name: 'Chief of staff' },
    { id: 'campaign_manager', name: 'Campaign manager' },
    { id: 'policy_adviser', name: 'Policy adviser' },
    { id: 'communications', name: 'Communications director' },
    { id: 'press_secretary', name: 'Press secretary' },
    { id: 'fundraising', name: 'Fundraising director' },
    { id: 'polling', name: 'Polling and research adviser' },
    { id: 'legal', name: 'Legal adviser' },
    { id: 'security', name: 'Security coordinator' },
    { id: 'organiser', name: 'Political organiser' },
  ],

  /** Starting funds of each party, in obols (a party's own money, never the player's). */
  funds: { order: 180000, liberty: 150000 },
};
