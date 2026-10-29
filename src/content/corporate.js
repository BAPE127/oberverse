// The companies of the wider world (v0.60.0): how many, of what kind, what a sector can sell in a
// day, and how a company in it is made and run. Numbers are obols and days. The generated
// companies are made ONCE from these (src/corp/generate.js) and then saved; changing this file
// never changes a company that already exists.
//
// A sector's POOL is what its customers buy in a day, whoever supplies it. Companies share it by
// capacity, standing and price; the player's own business and the already-existing companies
// (Meridian, Ober's Oil, Chuckie's Cheese) take what they really sell off the top, so a player
// who wins business leaves less for the rest — and the reverse.

export const CORP = {
  /** Most generated companies alive at once, and records kept in all (closed ones beyond the cap are forgotten, oldest first). */
  cap: { alive: 60, records: 90 },
  /** Days simulated before the game begins, so every company has a history to rank on. */
  warmupDays: 120,
  /** The benchmark rate (annual) until a central bank sets one. */
  baseRate: 0.05,
  /** Daily capacity of a new company by size, as a share of its sector's pool; sizes are drawn by weight. */
  sizes: { small: { w: 0.5, share: 0.02 }, mid: { w: 0.35, share: 0.05 }, large: { w: 0.15, share: 0.11 } },
  /** Plant: what one obol of daily capacity costs to build, the share of that cost the plant is worth on the books. */
  plantCost: 40,
  plantBook: 0.6,
  /** Fixed costs a day as a share of margin-earning capacity; a company breaks even at about this share of its capacity sold. */
  fixedOfMargin: 0.55,
  /** A company goes under when its cash has been below zero this many days in a row. */
  insolventDays: 45,
  /** Listed companies: the share of generated companies with a ticker, and the share counts. */
  listedShare: 0.38,
  shares: { small: [2e6, 6e6], mid: [6e6, 2e7], large: [2e7, 6e7] },
  /** A new entrant may appear in a sector whose companies are this busy (30-day utilisation), at most this many a month overall and one per sector in `cooldown` days. */
  entry: { busy: 0.95, chance: 0.35, perMonth: 2, cooldown: 120 },
  /** What a sector's companies are called: stems by country (flavour), then a suffix by sector. */
  stems: {
    home: ['Copperfield', 'Lantern', 'Northbank', 'Harbourline', 'Millrace', 'Gullwing', 'Tidewater', 'Brasswick', 'Fairhaven', 'Quillon'],
    varn: ['Kestrel', 'Varn', 'Tashkar', 'Orlov', 'Daghan', 'Ironmark'],
    ostmark: ['Hartmann', 'Brandt', 'Ostwerk', 'Kessler', 'Rheinholt', 'Falken'],
    caldera: ['Calder', 'Mesa', 'Horn', 'Corvane', 'Salto', 'Verdan'],
    sund: ['Sundholm', 'Fjell', 'Norrby', 'Skarn', 'Lindqvist', 'Vik'],
    pallas: ['Pallas', 'Aegir', 'Ionis', 'Thessal', 'Krios', 'Mylos'],
    teshvar: ['Teshvar', 'Zhan', 'Orun', 'Khoral', 'Bai-Dun', 'Sarkhan'],
    morrow: ['Morrow', 'Coralline', 'Tideline', 'Palmer', 'Reefgate', 'Kauri'],
    lirre: ['Lirre', 'Valmont', 'Duchess', 'Aubrac', 'Montclair', 'Lorrain'],
  },
  suffix: {
    arms: ['Arms', 'Ordnance', 'Defence Systems', 'Munitions', 'Armaments'],
    shipping: ['Lines', 'Shipping', 'Maritime', 'Freight', 'Marine'],
    aerospace: ['Aerospace', 'Aviation', 'Aeronautics', 'Aircraft'],
    agriculture: ['Agri', 'Farms', 'Grain Co.', 'Harvest', 'Growers'],
    energy: ['Petroleum', 'Power', 'Energy', 'Fuels'],
    industrial: ['Steelworks', 'Machinery', 'Industries', 'Foundry', 'Engineering'],
    transport: ['Rail', 'Haulage', 'Coaches', 'Transit'],
    communications: ['Telecom', 'Signals', 'Broadcast', 'Cable'],
    satellites: ['Orbital', 'Sky Networks', 'Satcom', 'Spaceworks'],
    finance: ['Bank', 'Trust', 'Mutual', 'Insurance', 'Capital'],
  },
  /**
   * The sectors with something to sell. count: how many generated at the start. pool: what the
   * customers buy a day at the start; growth: yearly drift; wave: the size of the cycle (a share
   * of the pool) and its length in days. pe: the multiple of a year's profit a company is worth (the player's businesses and the
   * listed ones are valued the same way). margin: what a company at par keeps of each obol sold
   * before fixed costs. specialities: what a company can be known for.
   */
  sectors: {
    arms: { count: 6, pe: 11, pool: 160000, growth: 0.04, wave: 0.12, period: 47, margin: 0.32, specialities: ['small arms', 'heavy weapons', 'missiles', 'drones', 'ammunition'] },
    shipping: { count: 6, pe: 10, pool: 95000, growth: 0.05, wave: 0.1, period: 61, margin: 0.18, specialities: ['bulk cargo', 'containers', 'tankers', 'roll-on/roll-off', 'refrigerated cargo'] },
    aerospace: { count: 5, pe: 14, pool: 210000, growth: 0.05, wave: 0.14, period: 83, margin: 0.2, specialities: ['light aircraft', 'airliners', 'launch services', 'components', 'helicopters'] },
    agriculture: { count: 6, pe: 11, pool: 125000, growth: 0.03, wave: 0.16, period: 90, margin: 0.14, specialities: ['grain', 'livestock', 'dairy', 'cotton', 'fruit and vegetables'] },
    energy: { count: 4, pe: 10, pool: 300000, growth: 0.03, wave: 0.12, period: 71, margin: 0.3, specialities: ['crude oil', 'refining', 'gas', 'power generation'] },
    industrial: { count: 5, pe: 10, pool: 260000, growth: 0.04, wave: 0.1, period: 77, margin: 0.16, specialities: ['steel', 'machine tools', 'vehicles', 'chemicals'] },
    transport: { count: 4, pe: 9, pool: 120000, growth: 0.04, wave: 0.08, period: 53, margin: 0.12, specialities: ['rail freight', 'road haulage', 'passenger rail', 'air charter'] },
    communications: { count: 3, pe: 12, pool: 140000, growth: 0.06, wave: 0.07, period: 67, margin: 0.28, specialities: ['telephony', 'broadcasting', 'undersea cable'] },
    satellites: { count: 3, pe: 14, pool: 90000, growth: 0.1, wave: 0.12, period: 59, margin: 0.35, specialities: ['communications', 'imaging', 'navigation'] },
    finance: { count: 4, pe: 9, pool: 200000, growth: 0.04, wave: 0.09, period: 73, margin: 0.4, specialities: ['commercial banking', 'insurance', 'trade finance', 'asset management'] },
  },
  /** How the arms pool is read from the real arms market: obols a day per obol of the countries' daily income, and what a war adds. */
  armsPool: { perIncome: 0.7, perWar: 0.06 },
  strategies: {
    aggressive: { name: 'Aggressive', invest: 0.85, debt: 1.4, price: -0.05 },
    steady: { name: 'Steady', invest: 0.93, debt: 1.0, price: 0 },
    conservative: { name: 'Conservative', invest: 0.98, debt: 0.6, price: 0.04 },
  },
};
