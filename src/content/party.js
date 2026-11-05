// Your own party (v0.97.0): what it takes to found one, and what it is. Pure data. A foundation, not a destination: the party is a record with a name, colours, a platform, funds
// of its own, staff and a registration. It is kept entirely out of the election and the opinion model (candidacy is a later release), so it can change no result.
// Its funds come only from what you put in; wages come out of its funds; the registration fee is paid to the state.

export const PARTY = {
  name: { taken: ['the Order Party', 'the Liberty League', 'Order Party', 'Liberty League', 'Order', 'Liberty'] },
  colours: ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#2aa198'],
  /** The five founding needs. The office is the company's own headquarters (the Corporate Centre or the Tower), shared. */
  needs: { offices: ['mid', 'tower'], reputation: 10, priorities: 3, staff: 3, fee: 50000 },
  platform: { maxIssues: 4 },
  /** Staff are records, not people on the map: a role, a name, a wage out of the party's funds, a fee to take them on. */
  staff: { hire: 5000, wage: 120, roles: [
    { id: 'campaign_manager', name: 'Campaign manager' }, { id: 'polling', name: 'Pollster' }, { id: 'fundraising', name: 'Fundraiser' }, { id: 'legal', name: 'Legal adviser' }, { id: 'organiser', name: 'Organiser' },
  ], names: ['Ines Harrow', 'Caspian Vole', 'Marta Quill', 'Osric Teal', 'Beatrix Lund', 'Joachim Fenn', 'Wilhelmina Cray', 'Tobias Marl', 'Odette Brandt', 'Ansel Pike', 'Greta Voss', 'Lucan Ashe'] },
  give: { min: 1000 },
  /** How many would consider the party (a share of voters, at most this): from how well its platform suits each bloc. Read-only; never enters an election. */
  consider: { max: 0.25 },
  candidacy: 'Standing for election is a later release. A registered party with a platform, staff and funds is the foundation it will need.',
};
