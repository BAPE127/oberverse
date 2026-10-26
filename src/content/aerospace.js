// Aerospace (v0.55.0): Starling Flats Aerospace Park, east of the Ober Fields
// through the Escarpment Cut. Two companies build aircraft, launch vehicles,
// strategic missile products and satellites here: Meridian Aerospace
// Corporation (MRDN on the Halvermouth exchange), established, and Roost
// Aeroworks — Billie Roost's failing little firm, for sale to the player.
//
// Every tunable number lives in this file; the rules are in src/aero/ (pure)
// and the simulation in src/systems/aerospace.js. Both companies run on the
// same engine: the same catalogue, tender board, suppliers, pipelines and
// books. See docs/AEROSPACE.md.
//
// Units: money in obols; time in game days (1 day = 1,440 game minutes);
// materials in lots (one lot = one cargo unit unless `volume` says more).
// Ids are permanent (saves refer to them).

/** The industry's rules and the two companies. */
export const AERO = {
  park: 'Starling Flats Aerospace Park',
  map: 'starling_flats',
  /** Owner's rule: no aircraft contract may be for more than five aircraft. Enforced in src/aero/catalog.js. */
  maxAircraftPerContract: 5,
  /** Morning decisions: tenders posted, bids opened, rival's plans, wages and upkeep. */
  decisionHour: 6,
  /** How long a tender stays open for bids (days), then the customer awards it. */
  tenderDays: 2,
  /** Customers post at most this many open tenders at once. */
  maxOpenTenders: 18,
  /** Days of history kept in the books (daily rows) and on the share chart. */
  historyDays: 30,
  /** A unit's inspection: chance of a failed inspection at quality = required (falls as quality rises). */
  inspectionFailAtRequired: 0.24,
  /** Rework after a failed inspection: this share of the product's days again. */
  reworkShare: 0.18,
  /** Late delivery: the customer withholds this share of the unit's price per day late (max `lateCap`). */
  latePerDay: 0.04, lateCap: 0.4,
  /** Cancelling an accepted contract forfeits the deposit and costs this share of its value. */
  cancelPenalty: 0.1,
  /** Reputation (0–100): on time +2, late −4, failed inspection −1, cancelled −8. */
  reputation: { onTime: 2, late: -4, failedInspection: -1, cancelled: -8 },

  /** Roost Aeroworks, the player's way in (bought from Billie Roost, like Ober & Sons from Captain Ober). */
  firm: {
    id: 'roost',
    name: 'Roost Aeroworks',
    seller: 'npc_billie',
    price: 85000,
    /** What comes with it. */
    bays: ['light_1'],
    workforce: 30,
    cash: 0, // the player's company spends from the player's own obols
    reputation: 38,
    quality: 52,
    research: ['light_airframes'],
    /** Billie's last order book: two Skylarks for the Lariat crop-dusting co-op, already half paid. */
    backlog: [{ customer: 'cu_lariat_coop', product: 'ap_skylark', qty: 2, unitPrice: 19500, depositPaid: 0.3, daysLeft: 5 }],
  },

  /** Meridian Aerospace Corporation: the incumbent. */
  meridian: {
    id: 'meridian',
    name: 'Meridian Aerospace Corporation',
    short: 'Meridian',
    ticker: 'MRDN',
    shares: 2000000,
    cash: 26000000,
    credit: 12000000, // a revolving credit line; drawing on it costs interest
    interest: 0.0004, // per day on drawn credit
    reputation: 72,
    quality: 72.8, // (its experience, 60, adds 1.2: 74)
    workforce: 1180,
    bays: ['light_1', 'light_2', 'heavy_1', 'heavy_2', 'wide_1', 'secure_1', 'rocket_1', 'clean_1', 'clean_2'],
    pad: true,
    research: ['light_airframes', 'turboprops', 'jet_engines', 'pressurised_cabins', 'widebody', 'military_airframes', 'supersonic', 'orbital_rockets', 'medium_lift', 'satellite_bus', 'earth_observation', 'navigation_payloads', 'secure_systems', 'strategic_systems', 'heavy_lift'],
    /** Its standing order book at the start of the game (a real backlog, with real materials owed). */
    backlog: [
      { customer: 'cu_skyward', product: 'ap_tern', qty: 3, unitPrice: 455000, depositPaid: 0.2, daysLeft: 16 },
      { customer: 'cu_ostmark_air', product: 'af_falcon', qty: 4, unitPrice: 560000, depositPaid: 0.25, daysLeft: 22 },
      { customer: 'cu_dunmere_post', product: 'ap_puffin', qty: 2, unitPrice: 196000, depositPaid: 0.2, daysLeft: 9 },
      { customer: 'cu_lyceum', product: 'st_lyceum', qty: 1, unitPrice: 410000, depositPaid: 0.3, daysLeft: 12 },
      { customer: 'cu_brightwave', product: 'st_relay', qty: 3, unitPrice: 238000, depositPaid: 0.2, daysLeft: 14 },
      { customer: 'cu_teshvar_air', product: 'ap_albatross', qty: 1, unitPrice: 280000, depositPaid: 0.3, daysLeft: 8 },
    ],
    /** How it prices: markup over its own estimated cost, higher when busy. */
    markup: [1.2, 1.5],
    /** It won't bid if the job would start more than this many days from now. */
    maxQueueDays: 14,
    /** Investment: when cash comfortably exceeds this, it buys a bay of its busiest type; it researches in order. */
    investAbove: 40000000,
    researchOrder: ['reusable_rockets', 'advanced_avionics', 'composite_structures', 'stealth', 'comms_constellations', 'deep_space', 'crew_vehicles', 'next_gen_airliners', 'space_power', 'futuristic_propulsion', 'experimental'],
    researchBudget: 0.06, // share of each day's revenue put into research
    overhead: 9000, // daily: headquarters, administration, insurance
    founded: 'Meridian Free Port, 41 years ago; headquartered at Starling Flats since the Park opened',
  },

  /** The Halvermouth exchange's rules for MRDN (the same exchange as OBRO and CHZ). */
  exchange: {
    fee: 0.01, // broker's commission each way
    maxPlayerShare: 0.05, // one investor may hold at most 5% (100,000 shares)
    pe: 9, // the market pays this many years of (normalised) earnings
    backlogWeight: 0.5, // + this share of the order backlog's expected margin (it's work in hand)
    priceAdjust: 0.12, // the price moves this share of the way to fair value each day
    noise: 0.02, // ± daily market mood
    payout: 0.35, // share of a week's positive earnings paid as a dividend (Moondays)
    startPrice: 41,
  },

  /** Wages and the cost of keeping facilities open (paid each morning). */
  wage: 70, // per worker per day
  hireCost: 120, // recruiting and training one worker
  layoffCost: 60,
};

/**
 * How things move on the field (v0.58.0). Distances are tiles, times game minutes (a minute is a
 * second of play at the usual speed), so a departure — pushback, taxi, hold, line-up, roll, climb
 * out — takes about a minute of watching. The take-off roll is the aircraft's own take-off run in
 * metres, compressed to the runway it has; the launch times are the countdown and the ascent.
 */
export const FLIGHT = {
  pushSpeed: 2.4, taxiSpeed: 3.6, lineupSpeed: 2.4,
  holdShort: 1.2, lineupHold: 0.7,
  rollTiles: 16, rollMin: 20, rollMargin: 24, metresPerTile: 30, rollMinutes: 3, rollPerTile: 0.09,
  exitTiles: 45, climbAlt: 6,
  vtolRise: 3, vtolAlt: 4, vtolSpeed: 16,
  touchdown: 14, finalTiles: 50, finalMin: 6, finalAlt: 7,
  stagger: 9, // minutes between one aircraft starting its movement and the next (one runway, one taxiway)
};

/**
 * The people (v0.57.0). Technicians crew the bays (the headcount the company always had);
 * engineers run the drawing office and research; inspectors are the testing and inspection
 * capacity. `share` is how many a company needs per technician its bays call for. Short of
 * either, that work slows (never below `minRate`); more inspectors than needed raise quality.
 * Experience (0–100) is the whole company's: new hires arrive green and dilute it, training
 * raises it slowly. Speed runs from `speedAt0` to `speedAt100`; quality ±`qualityPerPoint` per
 * point from 50.
 */
export const STAFF = {
  roles: {
    tech: { name: 'Technicians', one: 'technician', wage: 70, hire: 120, layoff: 60, batches: [10, 30, 100], text: 'Crew the bays: a bay works at full speed when its crew is all there.' },
    engineer: { name: 'Engineers', one: 'engineer', wage: 140, hire: 400, layoff: 200, share: 0.08, minRate: 0.4, batches: [1, 3, 10], text: 'The drawing office and research: short of them, engineering stages and research take longer.' },
    inspector: { name: 'Inspectors', one: 'inspector', wage: 100, hire: 250, layoff: 120, share: 0.04, minRate: 0.3, batches: [1, 3, 10], text: 'Testing and inspection capacity: short of them, inspections take longer; more than you need make fewer mistakes get through.' },
  },
  newHireExperience: 20,
  experience: { start: { roost: 50, meridian: 60 }, speedAt0: 0.8, speedAt100: 1.2, qualityPerPoint: 0.12, cap: 95 },
  training: {
    none: { name: 'None', perDay: 0, gain: 0.06, text: 'They learn on the job, slowly.' },
    standard: { name: 'Standard', perDay: 6, gain: 0.25, text: 'Evening classes and a mentor for every new hire.' },
    intensive: { name: 'Intensive', perDay: 14, gain: 0.6, text: 'A training school on the floor: the fastest way to turn hires into a crew.' },
  },
  /** Inspectors above need: +quality (up to `bonusMax` at double); below need: −quality up to `penalty`. */
  inspectors: { bonusMax: 8, penalty: 10 },
};

/**
 * Bays: what a production slot is. crew: workers it needs to run; upkeep: per
 * day while it exists; build: price and days to add one; lines: what it can
 * build. Launch pads, the apron and the runway are separate capacities.
 */
export const BAYS = {
  light: { name: 'Light assembly bay', crew: 30, upkeep: 700, build: 60000, buildDays: 3, lines: ['aircraft'], size: 1, text: 'Small aircraft: private planes, trainers, turboprops, light jets.' },
  heavy: { name: 'Heavy assembly bay', crew: 120, upkeep: 2600, build: 260000, buildDays: 6, lines: ['aircraft'], size: 2, text: 'Airliners, fighters and business jets with a long range.' },
  wide: { name: 'Widebody hall', crew: 220, upkeep: 4200, build: 640000, buildDays: 9, lines: ['aircraft'], size: 3, text: 'Long-haul airliners and heavy bombers: the biggest roof on the Flats.' },
  secure: { name: 'Secure integration hall', crew: 140, upkeep: 3200, build: 420000, buildDays: 8, lines: ['aircraft', 'missile'], size: 2, clearance: true, text: 'Fenced, guarded and cleared for defence work: military aircraft and strategic missile products.' },
  rocket: { name: 'Rocket integration building', crew: 180, upkeep: 3800, build: 520000, buildDays: 8, lines: ['rocket'], size: 3, text: 'Stage fabrication and horizontal integration of launch vehicles.' },
  clean: { name: 'Satellite clean room', crew: 60, upkeep: 1600, build: 280000, buildDays: 6, lines: ['satellite'], size: 1, text: 'Class-100 air, bunny suits and very small screwdrivers.' },
};

/**
 * Roost's halls (v0.57.0): the buildings its bays stand in. Hangar 1 comes with the firm; the rest
 * are plots on Starling Flats that you build (a building site becomes a hall, in a few days), and
 * every bay you fit goes into a free slot of a finished hall that suits it — so what you build, and
 * where, is on the map. `at` is the building's top-left tile, `w`×`h` its footprint and room (the
 * door is the middle of the bottom wall). A slot is where a bay stands inside (x, y, w, h in room
 * tiles); `fits` are the bay types it can take (a larger slot takes smaller bays).
 * src/content/maps/starling.js builds the buildings and rooms from this table.
 */
export const HALLS = {
  hangar1: { name: 'Hangar 1', short: 'Hangar 1', owned: true, upkeep: 0, text: 'Billie\'s hangar: the first light bay, the workbench, the parts racks.', slots: [{ id: 'h1_a', fits: ['light'] }] },
  hangar2: {
    name: 'Hangar 2 — light assembly annex', short: 'Hangar 2', build: 150000, buildDays: 5, upkeep: 350, at: { x: 43, y: 19 }, w: 14, h: 9, building: 'sf_roost_hangar2', room: 'roost_hangar2', sign: 'ROOST · HANGAR 2', hours: ['06:00', '20:00'],
    text: 'A plain steel shed next to the office, with room for two more light bays: the cheapest way to double Roost\'s output.',
    slots: [{ id: 'h2_a', fits: ['light'], x: 1, y: 1, w: 6, h: 6 }, { id: 'h2_b', fits: ['light'], x: 7, y: 1, w: 6, h: 6 }],
  },
  heavy: {
    name: 'Assembly hall — heavy bays', short: 'Assembly hall', build: 450000, buildDays: 8, upkeep: 600, at: { x: 2, y: 38 }, w: 22, h: 12, building: 'sf_roost_heavy', room: 'roost_heavy', sign: 'ROOST · ASSEMBLY HALL', hours: ['06:00', '20:00'],
    text: 'Two heavy bays under one roof, with a gantry crane: airliners, business jets and fighters.',
    slots: [{ id: 'hh_a', fits: ['heavy', 'light'], x: 1, y: 2, w: 10, h: 8 }, { id: 'hh_b', fits: ['heavy', 'light'], x: 11, y: 2, w: 10, h: 8 }],
  },
  wide: {
    name: 'Widebody & secure hall', short: 'Widebody hall', build: 700000, buildDays: 10, upkeep: 800, at: { x: 2, y: 52 }, w: 22, h: 12, building: 'sf_roost_wide', room: 'roost_wide', sign: 'ROOST · WIDEBODY HALL', hours: ['06:00', '20:00'],
    text: 'The biggest roof in the west works: one widebody bay, and a fenced, guarded secure integration bay for defence work.',
    slots: [{ id: 'hw_a', fits: ['wide', 'heavy', 'light'], x: 1, y: 1, w: 11, h: 10 }, { id: 'hw_b', fits: ['secure'], x: 12, y: 2, w: 9, h: 7 }],
  },
  space: {
    name: 'Space systems annex', short: 'Space annex', build: 650000, buildDays: 10, upkeep: 700, at: { x: 2, y: 66 }, w: 22, h: 10, building: 'sf_roost_space', room: 'roost_space', sign: 'ROOST · SPACE SYSTEMS', hours: ['06:00', '20:00'],
    text: 'A rocket integration bay with its cradles and overhead crane, and two clean rooms for satellites.',
    slots: [{ id: 'hs_a', fits: ['rocket'], x: 1, y: 2, w: 12, h: 6 }, { id: 'hs_b', fits: ['clean'], x: 13, y: 2, w: 4, h: 5 }, { id: 'hs_c', fits: ['clean'], x: 17, y: 2, w: 4, h: 5 }],
  },
  lab: {
    name: 'Research laboratory', short: 'Laboratory', build: 320000, buildDays: 7, upkeep: 900, at: { x: 52, y: 30 }, w: 6, h: 9, building: 'sf_roost_lab', room: 'roost_lab', sign: 'ROOST · LABORATORY', hours: ['07:00', '19:00'],
    text: 'Benches, a wind-tunnel model and a very good coffee machine: research takes a quarter less time.', effect: { researchDays: 0.75 }, slots: [],
  },
};

/** Fixed capacities (per company): the finished-aircraft apron, a launch pad, test cells. */
export const FACILITIES = {
  apron: { name: 'Finished-aircraft apron', slots: { roost: 3, meridian: 6 }, text: 'Where finished aircraft wait for their customers. Big aircraft take more room (an airliner 2, a widebody or bomber 3).' },
  pad: { name: 'Launch pad and service tower', build: 1800000, buildDays: 14, upkeep: 2600, text: 'A launch pad with a mobile service tower, a flame trench and a propellant farm. One launch at a time; 2 days to refurbish after each.' },
  engine_cell: { name: 'Engine test cell', build: 140000, buildDays: 4, upkeep: 300, text: 'Engines run up before installation: −25% chance of a failed inspection on any aircraft or rocket.' },
  inspection: { name: 'Advanced inspection equipment', build: 90000, buildDays: 3, upkeep: 200, text: 'X-ray, ultrasound and laser trackers: +8 quality.' },
};

/**
 * Reputation and events (v0.57.0). Every change to a company's reputation is logged with its reason;
 * repeated failures cost more each time (`step` of the base per failure in a row, up to `cap` times)
 * and a run of on-time deliveries earns a little extra. Events are not dice: each one comes from a
 * condition in the company's own books and floor (a reputation to qualify, a bay that has been the
 * bottleneck, a run of failed inspections), is gated by a stable hash of the day (so a reload can't
 * change it), has a cool-down, and works through the same checked methods as everything else.
 */
export const EVENTS = {
  rep: { flawless: 1, streakAt: 3, streakBonus: 1, step: 0.5, cap: 3, failWindowDays: 14, launchFailure: -6 },
  government: { cooldown: 20, chance: 0.4, minReputation: 50, ceilingBoost: 1.12, deposit: 0.35, daysBoost: 1.15, closeDays: 3, reward: 3, kinds: ['government', 'defence'] },
  constellation: { cooldown: 40, chance: 0.35, minReputation: 40, qty: [4, 8], deposit: 0.3, daysBoost: 1.3, closeDays: 3, reward: 4, kinds: ['comms', 'agency', 'science', 'government'] },
  breakthrough: { base: 0.1, lab: 0.08, engineers: 0.05, quality: 2, reputation: 1 },
  expansion: { pressureDays: 3, discount: 0.25, window: 7, cooldown: 30 },
  audit: { failures: 3, cooldown: 30, decideDays: 5, fine: 15000, finePerTech: 150, programme: 20000, programmePerTech: 300, repFine: -3, repIgnored: -4, experience: 3 },
  milestones: {
    first_delivery: { name: 'First delivery', rep: 2, text: 'the first unit out of the door' },
    first_aircraft: { name: 'First aircraft delivered', rep: 1, text: 'an aircraft flown away by its new owner' },
    first_defence: { name: 'First defence contract delivered', rep: 2, text: 'work for a defence buyer, delivered' },
    first_launch: { name: 'First successful launch', rep: 3, text: 'a launch vehicle off the pad and away' },
    first_satellite: { name: 'First satellite in orbit', rep: 3, text: 'a satellite commissioned in orbit' },
    first_government: { name: 'First government order delivered', rep: 2, text: 'a major order for the state, delivered in full' },
    first_constellation: { name: 'First constellation complete', rep: 4, text: 'a whole constellation, delivered on time' },
  },
};

/**
 * Product configuration (v0.57.0): bounded options a customer may ask for. A tender names the
 * configuration it wants (src/aero/config.js makes it from the customer's kind), and the contract,
 * its units and the finished aircraft carry it. Each option changes what the product costs and
 * takes: `cost` is the extra materials as a share of the product's own, laid into the materials
 * listed in `into` (only ones the product's line really uses), `days` extra build time, `markup`
 * what the customer pays over the extra cost, `quality` the extra the customer demands, `needs` the
 * research the company must have, `spec` multipliers on the flight spec (seats, range…), `effects`
 * other changes (launch or commissioning risk, design life, service income).
 */
export const OPTIONS = {
  groups: {
    cabin_pax: { name: 'Cabin', choices: {
      dense: { name: 'High-density cabin', text: 'More seats, closer together: +18% seats.', cost: 0.035, into: ['electronics', 'glazing', 'chemicals'], days: 0.04, markup: 1.5, spec: { seats: 1.18 } },
      premium: { name: 'Premium cabin', text: 'Lie-flat seats and a proper galley: 22% fewer seats, a much better product.', cost: 0.06, into: ['electronics', 'glazing', 'chemicals'], days: 0.07, markup: 1.55, quality: 3, spec: { seats: 0.78 } },
    } },
    cabin_vip: { name: 'Interior', choices: {
      vip: { name: 'VIP interior', text: 'Leather, a galley and a bed: fewer seats, a lot more money.', cost: 0.07, into: ['electronics', 'glazing', 'chemicals'], days: 0.09, markup: 1.6, quality: 4, spec: { seats: 0.7 } },
    } },
    range: { name: 'Range', choices: {
      extended: { name: 'Extended-range tanks', text: 'Extra tanks and a stronger wing box: +25% range.', cost: 0.04, into: ['alu', 'composite', 'fuel'], days: 0.05, markup: 1.5, spec: { range: 1.25, fuel: 1.22 } },
    } },
    avionics_adv: { name: 'Flight deck', choices: {
      advanced: { name: 'Advanced flight deck', text: 'A glass cockpit and a much better autopilot.', cost: 0.05, into: ['avionics', 'instruments', 'electronics'], days: 0.05, markup: 1.5, quality: 5, needs: 'advanced_avionics' },
    } },
    sensors: { name: 'Sensors', choices: {
      advanced: { name: 'Advanced sensor suite', text: 'A better radar and a longer eye.', cost: 0.07, into: ['sensors', 'avionics'], days: 0.06, markup: 1.6, quality: 5, needs: 'advanced_avionics' },
    } },
    endurance: { name: 'Endurance', choices: {
      extended: { name: 'Conformal tanks and a probe', text: 'Longer on station: +30% range.', cost: 0.04, into: ['alu', 'titanium', 'fuel'], days: 0.05, markup: 1.5, spec: { range: 1.3, fuel: 1.25 } },
    } },
    stores: { name: 'Stores', choices: {
      heavy: { name: 'Heavy stores', text: 'Reinforced hardpoints and bomb bay: +40% payload.', cost: 0.05, into: ['steel', 'titanium', 'composite'], days: 0.06, markup: 1.5, spec: { payload: 1.4 } },
    } },
    role_light: { name: 'Role', choices: {
      sprayer: { name: 'Spray gear', text: 'A hopper, pumps and booms: a crop-duster, not a taxi.', cost: 0.13, into: ['alu', 'chemicals', 'steel'], days: 0.12, markup: 1.5, tags: ['sprayer'] },
      trainer: { name: 'Dual controls', text: 'A second set of controls and a very patient instructor\'s seat.', cost: 0.1, into: ['instruments', 'electronics'], days: 0.08, markup: 1.5, tags: ['trainer'] },
    } },
    fairing: { name: 'Fairing', choices: {
      extended: { name: 'Extended fairing', text: 'Room for a bigger payload.', cost: 0.04, into: ['composite', 'alu'], days: 0.04, markup: 1.5 },
    } },
    upper: { name: 'Upper stage', choices: {
      restartable: { name: 'Restartable upper stage', text: 'Can light twice: 15% less risk of losing the mission.', cost: 0.06, into: ['avionics', 'instruments', 'titanium'], days: 0.08, markup: 1.55, quality: 3, effects: { launchRisk: 0.85 } },
    } },
    sat_payload: { name: 'Payload', choices: {
      enhanced: { name: 'Enhanced payload', text: 'A sharper eye and more bandwidth: +25% service income.', cost: 0.09, into: ['sensors', 'comms', 'instruments'], days: 0.1, markup: 1.55, quality: 4, effects: { service: 1.25 } },
    } },
    sat_life: { name: 'Design life', choices: {
      extended: { name: 'Extended design life', text: 'Bigger arrays and more fuel: 50% longer in service.', cost: 0.06, into: ['solar', 'electronics'], days: 0.05, markup: 1.5, effects: { life: 1.5 } },
    } },
    sat_hardened: { name: 'Bus', choices: {
      hardened: { name: 'Radiation-hardened bus', text: 'Redundant everything: 40% less risk at commissioning.', cost: 0.05, into: ['electronics', 'avionics', 'titanium'], days: 0.06, markup: 1.55, quality: 3, effects: { commissionRisk: 0.6 } },
    } },
  },
  /** Which groups a product offers: by id, else by class, else by line. */
  byProduct: { ap_skylark: ['role_light', 'range'], ap_meadowlark: ['role_light', 'cabin_vip', 'range'], ap_puffin: ['cabin_pax', 'range'] },
  byClass: { passenger: ['cabin_pax', 'range', 'avionics_adv'], private: ['cabin_vip', 'range'], fighter: ['sensors', 'endurance'], bomber: ['sensors', 'endurance', 'stores'] },
  byLine: { rocket: ['fairing', 'upper'], satellite: ['sat_payload', 'sat_life', 'sat_hardened'] },
  /** How likely each kind of customer is to ask for a choice (a share of its tenders for a product that offers it). */
  demand: {
    airline: { cabin_pax: { dense: 0.3, premium: 0.2 }, range: { extended: 0.25 }, avionics_adv: { advanced: 0.15 } },
    cargo: { range: { extended: 0.3 } },
    private: { cabin_vip: { vip: 0.35 }, range: { extended: 0.2 }, role_light: { trainer: 0.3 } },
    agriculture: { role_light: { sprayer: 0.85 }, range: { extended: 0.1 } },
    defence: { sensors: { advanced: 0.3 }, endurance: { extended: 0.3 }, stores: { heavy: 0.3 } },
    government: { sat_payload: { enhanced: 0.3 }, sat_life: { extended: 0.3 }, sat_hardened: { hardened: 0.15 } },
    comms: { sat_payload: { enhanced: 0.35 }, sat_life: { extended: 0.3 }, sat_hardened: { hardened: 0.2 } },
    science: { sat_payload: { enhanced: 0.4 }, sat_hardened: { hardened: 0.3 }, sat_life: { extended: 0.2 } },
    agency: { fairing: { extended: 0.3 }, upper: { restartable: 0.3 }, sat_payload: { enhanced: 0.3 }, sat_life: { extended: 0.3 }, sat_hardened: { hardened: 0.25 } },
  },
};

/**
 * Materials (a manageable abstraction): price is per lot at a reference
 * supplier; volume is cargo units per lot. source: who makes it locally if
 * anyone (Ober's Oil makes the petroleum-based inputs, not finished parts).
 */
export const MATERIALS = {
  alu: { name: 'Aluminium alloy', price: 1400, volume: 1, text: 'Sheet, plate and extrusions for skins, frames and stringers.' },
  titanium: { name: 'Titanium & specialty alloys', price: 5200, volume: 1, text: 'Forgings for engine mounts, landing gear and hot structures.' },
  steel: { name: 'Structural steel', price: 450, volume: 1, text: 'Tooling, gear legs, launch-pad fittings.' },
  composite: { name: 'Carbon-fibre composite', price: 4000, volume: 1, text: 'Prepreg rolls and honeycomb. Its resin starts life as petroleum feedstock.' },
  glazing: { name: 'Cockpit glazing', price: 1500, volume: 1, text: 'Stretched acrylic and laminated glass canopies and windows.' },
  engine_light: { name: 'Light engine (piston)', price: 5000, volume: 1, text: 'A complete piston engine and propeller, ready to hang.' },
  engine_jet: { name: 'Turbine engine (turboprop / small turbofan)', price: 36000, volume: 2, text: 'A turboprop or small turbofan, crated, with its own logbook.' },
  engine_large: { name: 'Large turbofan', price: 82000, volume: 3, text: 'An airliner turbofan with a fan you could stand in. Comes on its own trailer.' },
  engine_mil: { name: 'Military turbofan (afterburning)', price: 110000, volume: 2, secure: true, text: 'An afterburning military engine. Export-controlled: shipped under seal.' },
  engine_rocket: { name: 'Rocket engine', price: 120000, volume: 3, text: 'A liquid-fuelled rocket engine with its turbopump.' },
  avionics: { name: 'Avionics suite', price: 16000, volume: 1, text: 'Flight computers, displays and autopilot.' },
  electronics: { name: 'Electrical components', price: 2000, volume: 1, text: 'Wiring looms, connectors, power units.' },
  instruments: { name: 'Precision instruments', price: 8000, volume: 1, text: 'Gyros, star trackers, pressure and flow sensors.' },
  solar: { name: 'Solar cells & power units', price: 12000, volume: 1, text: 'Solar array panels, batteries and power conditioning for spacecraft.' },
  comms: { name: 'Communications equipment', price: 16000, volume: 1, text: 'Transponders, antennas and amplifiers.' },
  sensors: { name: 'Specialised sensors', price: 24000, volume: 1, text: 'Imagers, radiometers and detectors.' },
  stealth: { name: 'Radar-absorbent materials', price: 20000, volume: 1, secure: true, text: 'Coatings and structures for low-observable airframes. Controlled.' },
  fuel: { name: 'Aviation fuel', price: 300, volume: 1, source: 'oil', text: 'Jet fuel for engine runs, test flights and delivery. Refined from crude at Ober\'s Oil.' },
  propellant: { name: 'Rocket propellant', price: 950, volume: 1, source: 'oil', text: 'Refined kerosene (from Ober\'s Oil) and liquid oxygen, for a launch.' },
  chemicals: { name: 'Industrial chemicals & resins', price: 300, volume: 1, source: 'oil', text: 'Solvents, sealants, paint and resin feedstock. Petrochemicals from Ober\'s Oil.' },
};

/**
 * Suppliers. where: 'local' (trucked to the Park) or a port id (shipped to
 * Mill Road Docks, then trucked up). sells: material → price multiplier.
 * stock: lots on hand per material (shared by everyone who buys), restocked
 * by `restock` lots a day up to `stock`. lead: days to prepare an order.
 */
export const SUPPLIERS = {
  sup_oberoil: { name: 'Ober\'s Oil — Refinery No. 1', where: 'local', lead: 0.25, reliability: 0.97, sells: { fuel: 1, propellant: 1.05, chemicals: 1 }, stock: 400, restock: 120, oil: true, text: 'Sir Moneybucks\'s refinery, next door through the Cut. Every lot you buy is barrels the refinery sells.' },
  sup_halver_metals: { name: 'Halver Metals & Forge', where: 'local', lead: 0.5, reliability: 0.95, sells: { alu: 1.08, steel: 1, titanium: 1.15 }, stock: 60, restock: 14, text: 'A Halvermouth stockist on Iron Row. Convenient, a little dear, and never has much titanium.' },
  sup_sal: { name: 'Sal\'s Surplus Electronics', where: 'local', lead: 0.25, reliability: 0.9, sells: { electronics: 0.92 }, stock: 20, restock: 4, text: 'Sal sells looms and connectors by the box. Mostly the right ones.' },
  sup_ostmark_turbine: { name: 'Ostmark Turbine Works', where: 'port_ostmark_east', lead: 1.5, reliability: 0.96, sells: { engine_light: 0.95, engine_jet: 0.96, engine_large: 0.97, engine_mil: 1.0, titanium: 0.92 }, stock: 24, restock: 5, text: 'Seven factories, one turbine design, eight instruction manuals.' },
  sup_sund_alloys: { name: 'Royal Sund Aluminium', where: 'port_kingsfjord', lead: 1, reliability: 0.97, sells: { alu: 0.86, steel: 0.9 }, stock: 120, restock: 30, text: 'Hydro-powered smelters up the fjord. The cheapest aluminium on the sea lanes.' },
  sup_lirre_composites: { name: 'Lirre Advanced Composites', where: 'port_lirre', lead: 1.5, reliability: 0.95, sells: { composite: 0.9, glazing: 0.95, stealth: 1.1 }, stock: 50, restock: 9, text: 'Neutral, precise, and happy to sell carbon fibre to anybody with a permit.' },
  sup_teshvar_avionics: { name: 'Golden Quay Avionics', where: 'port_teshvar_gold', lead: 1.5, reliability: 0.93, sells: { avionics: 0.92, instruments: 0.95, electronics: 0.9 }, stock: 40, restock: 7, text: 'Flight computers in gold-leaf crates. The crates cost extra.' },
  sup_meridian_sciences: { name: 'Meridian Applied Sciences', where: 'port_meridian', lead: 2, reliability: 0.98, sells: { sensors: 0.94, comms: 0.95, solar: 0.96, instruments: 0.92, engine_rocket: 1.0 }, stock: 28, restock: 5, rivalOwned: true, text: 'Meridian\'s own research arm, at the Free Port. It sells to competitors — at a premium, and its own company comes first.' },
  sup_halver_engines: { name: 'Halvermouth Aero Engines (Iron Row)', where: 'local', lead: 1, reliability: 0.93, sells: { engine_light: 1.05, engine_jet: 1.1, engine_large: 1.12 }, stock: 6, restock: 1, text: 'A licensed overhaul shop on Iron Row with a few new engines on the floor. Close by, never cheap, never many.' },
  sup_caldera_mining: { name: 'Caldera Mining Collective', where: 'port_caldera', lead: 1, reliability: 0.88, sells: { titanium: 0.84, steel: 0.85 }, stock: 40, restock: 8, text: 'Ore, sulphur and alarming dynamite paperwork. Cheap titanium; deliveries are an adventure.' },
  sup_morrow_space: { name: 'Morrow Isles Space Components', where: 'port_morrow', lead: 2, reliability: 0.94, sells: { solar: 0.9, comms: 0.97, engine_rocket: 0.95, sensors: 1.02 }, stock: 22, restock: 4, text: 'Two hundred islands, one very good solar-cell fab.' },
};
/** Premium Meridian Applied Sciences charges anyone but Meridian. */
export const RIVAL_SUPPLIER_PREMIUM = 0.18;

/**
 * External shipping (an independent carrier, the normal market rate) for
 * goods from a port: a share of the goods' value plus a rate per cargo unit
 * per 1,000 km. Trucking between the docks or a local supplier and the Park
 * is a flat local charge. Internal shipping (owning Ober & Sons) arrives in v0.57.
 */
export const FREIGHT = {
  carrier: 'Dunmere Parcel Post (aerospace freight)',
  valueShare: 0.02,
  perUnitPerKkm: 14,
  minimum: 600,
  knots: 16, // what the carrier's voyage time is reckoned at
  handling: 140, // per order at Mill Road Docks
  duty: 0.03, // import duty on foreign goods (none from free ports)
  truck: 180, // local trucking per order
  truckHours: 3,
  receivingPort: 'port_millroad',
};

/**
 * Internal shipping (v0.56.0): owning Ober & Sons Maritime, Roost's foreign materials can come in
 * your own ships. The aerospace division pays the shipping division a charge — a share of what an
 * independent carrier would have charged (the equivalent external freight) — and the voyage's real
 * running costs and port fees are paid once, by the shipping line. Group accounts eliminate the charge.
 *   established: a ship already at the supplier's port, on a route your fleet has sailed lately
 *   standard: a ship already at the supplier's port
 *   inefficient: a ship has to go there empty first
 */
export const INTERNAL = {
  rates: { established: 0.01, standard: 0.025, inefficient: 0.05 },
  establishedDays: 30, // a route sailed within this many days counts as established
  fallbackHours: 24, // policy 'fallback': with no ship found in this long, the job goes by carrier
  dispatchEvery: 15, // game minutes between dispatcher passes
};

/**
 * The work: stages each line goes through. share: of the product's days.
 * uses: material groups consumed at that stage (all of the unit's lots of
 * those materials, reserved from delivered stock). bay: the stage occupies a
 * bay (it takes one when its materials are in hand); office: drawing-office work, no bay. kind: 'wait' stages finish when their condition holds; 'inspect'
 * rolls an inspection (once, kept with the unit); 'event' happens at a moment.
 */
export const PIPELINES = {
  aircraft: [
    { id: 'slot', name: 'Contract accepted · production slot reserved', share: 0, kind: 'wait', wait: 'slot' },
    { id: 'engineering', name: 'Engineering configuration & approval', share: 0.06, office: true },
    { id: 'procurement', name: 'Materials procurement & receiving', share: 0, kind: 'wait', wait: 'materials' },
    { id: 'fuselage', name: 'Airframe & fuselage fabrication', share: 0.22, bay: true, uses: ['alu', 'titanium', 'glazing'] },
    { id: 'wings', name: 'Wing & structural assembly', share: 0.18, bay: true, uses: ['composite', 'stealth', 'steel'] },
    { id: 'engines', name: 'Engine installation', share: 0.1, bay: true, uses: ['engine_light', 'engine_jet', 'engine_large', 'engine_mil'] },
    { id: 'avionics', name: 'Avionics & control systems integration', share: 0.12, bay: true, uses: ['avionics', 'electronics', 'instruments', 'sensors', 'comms'] },
    { id: 'systems', name: 'Landing gear & remaining systems', share: 0.1, bay: true },
    { id: 'paint', name: 'Paint & customer configuration', share: 0.08, bay: true, uses: ['chemicals'] },
    { id: 'inspection', name: 'Inspection & systems testing', share: 0.1, bay: true, kind: 'inspect', uses: ['fuel'] },
    { id: 'acceptance', name: 'Final acceptance', share: 0.04, bay: true },
    { id: 'apron', name: 'Transfer to the finished-aircraft apron', share: 0, kind: 'wait', wait: 'apron' },
    { id: 'handover', name: 'Customer handover & departure', share: 0, kind: 'wait', wait: 'departure' },
  ],
  rocket: [
    { id: 'approval', name: 'Contract & mission approval', share: 0, kind: 'wait', wait: 'slot' },
    { id: 'design', name: 'Design & payload compatibility', share: 0.08, office: true },
    { id: 'procurement', name: 'Materials procurement', share: 0, kind: 'wait', wait: 'materials' },
    { id: 'stages', name: 'Stage fabrication', share: 0.3, bay: true, uses: ['alu', 'titanium', 'composite', 'steel'] },
    { id: 'propulsion', name: 'Structural & propulsion integration', share: 0.2, bay: true, uses: ['engine_rocket'] },
    { id: 'mission', name: 'Mission systems integration', share: 0.14, bay: true, uses: ['avionics', 'electronics', 'instruments', 'sensors', 'comms'] },
    { id: 'payload_plan', name: 'Payload integration planning', share: 0.06, bay: true },
    { id: 'certification', name: 'Inspection & certification', share: 0.1, bay: true, kind: 'inspect', uses: ['chemicals'] },
    { id: 'to_pad', name: 'Transport to the launch facilities', share: 0, kind: 'wait', wait: 'pad' },
    { id: 'vertical', name: 'Vertical assembly on the pad', share: 0.05 },
    { id: 'prep', name: 'Launch preparation (propellant loading)', share: 0.04, uses: ['propellant', 'fuel'] },
    { id: 'countdown', name: 'Final checks & countdown', share: 0.03 },
    { id: 'launch', name: 'Launch', share: 0, kind: 'event', event: 'launch' },
    { id: 'deploy', name: 'Orbital deployment / mission completion', share: 0, kind: 'wait', wait: 'deploy' },
    { id: 'settlement', name: 'Financial settlement', share: 0, kind: 'event', event: 'settle' },
  ],
  // Fictional strategic missile products: a defence procurement item delivered by secure convoy — never through the orbital launch pad.
  missile: [
    { id: 'approval', name: 'Contract & security clearance', share: 0, kind: 'wait', wait: 'slot' },
    { id: 'design', name: 'Programme engineering & approval', share: 0.08, office: true },
    { id: 'procurement', name: 'Controlled materials procurement', share: 0, kind: 'wait', wait: 'materials' },
    { id: 'airframe', name: 'Airframe & motor case fabrication', share: 0.32, bay: true, uses: ['alu', 'titanium', 'composite', 'steel', 'engine_rocket'] },
    { id: 'systems', name: 'Systems integration', share: 0.26, bay: true, uses: ['avionics', 'electronics', 'instruments', 'sensors', 'comms'] },
    { id: 'certification', name: 'Inspection & certification', share: 0.18, bay: true, kind: 'inspect', uses: ['chemicals'] },
    { id: 'secure_storage', name: 'Secure storage', share: 0.06 },
    { id: 'convoy', name: 'Secure convoy delivery to the agency', share: 0.1, kind: 'convoy' },
    { id: 'settlement', name: 'Acceptance & settlement', share: 0, kind: 'event', event: 'settle' },
  ],
  satellite: [
    { id: 'requirements', name: 'Mission requirements', share: 0, kind: 'wait', wait: 'slot' },
    { id: 'design', name: 'Design & payload configuration', share: 0.08, office: true },
    { id: 'procurement', name: 'Component procurement', share: 0, kind: 'wait', wait: 'materials' },
    { id: 'structure', name: 'Structural assembly', share: 0.14, bay: true, uses: ['alu', 'composite', 'titanium'] },
    { id: 'power', name: 'Power systems & solar panels', share: 0.14, bay: true, uses: ['solar', 'electronics'] },
    { id: 'payload', name: 'Payload integration', share: 0.2, bay: true, uses: ['comms', 'sensors', 'instruments'] },
    { id: 'onboard', name: 'Onboard systems configuration', share: 0.1, bay: true, uses: ['avionics'] },
    { id: 'testing', name: 'Environmental & functional testing', share: 0.14, bay: true, kind: 'inspect', uses: ['chemicals'] },
    { id: 'calibration', name: 'Calibration & final inspection', share: 0.08, bay: true },
    { id: 'to_launch', name: 'Transfer to launch integration', share: 0, kind: 'wait', wait: 'rocket' },
    { id: 'integration', name: 'Integration with the launch vehicle', share: 0.06 },
    { id: 'launch', name: 'Launch', share: 0, kind: 'wait', wait: 'launched' },
    { id: 'commissioning', name: 'Commissioning', share: 0.06, kind: 'commission' },
    { id: 'activation', name: 'Activation of its role', share: 0, kind: 'event', event: 'activate' },
    { id: 'settlement', name: 'Contract settlement', share: 0, kind: 'event', event: 'settle' },
  ],
};

/**
 * Research: costs money and days (one project at a time per company), and
 * unlocks products or improves the works. effect: { quality, speed, cost }.
 */
export const RESEARCH = {
  light_airframes: { name: 'Light airframes', cost: 0, days: 0, text: 'The basics: small aircraft.' },
  turboprops: { name: 'Turboprops', cost: 40000, days: 2, requires: ['light_airframes'], text: 'Executive turboprops and regional turboprop airliners.' },
  jet_engines: { name: 'Jet integration', cost: 120000, days: 4, requires: ['turboprops'], text: 'Light business jets.' },
  pressurised_cabins: { name: 'Pressurised cabins', cost: 180000, days: 5, requires: ['jet_engines'], text: 'Airliners and long-range jets.' },
  widebody: { name: 'Widebody structures', cost: 420000, days: 8, requires: ['pressurised_cabins'], text: 'Long-haul and high-capacity airliners.' },
  military_airframes: { name: 'Military airframes', cost: 260000, days: 6, requires: ['jet_engines'], clearance: true, text: 'Trainers, multirole fighters and tactical bombers.' },
  supersonic: { name: 'Supersonic flight', cost: 480000, days: 8, requires: ['military_airframes'], text: 'Air-superiority fighters and strategic bombers.' },
  stealth: { name: 'Low-observable design', cost: 900000, days: 12, requires: ['supersonic', 'composite_structures'], text: 'Stealth fighters and bombers.' },
  composite_structures: { name: 'Composite structures', cost: 300000, days: 6, requires: ['pressurised_cabins'], effect: { cost: -0.04 }, text: '−4% materials on aircraft; needed for low-observable airframes.' },
  advanced_avionics: { name: 'Advanced avionics', cost: 260000, days: 6, requires: ['jet_engines'], effect: { quality: 6 }, text: '+6 quality on everything.' },
  next_gen_airliners: { name: 'Next-generation airliners', cost: 1400000, days: 16, requires: ['widebody', 'composite_structures', 'advanced_avionics'], text: 'The high-capacity advanced airliner.' },
  orbital_rockets: { name: 'Orbital rocketry', cost: 380000, days: 8, requires: [], text: 'Small orbital launch vehicles.' },
  medium_lift: { name: 'Medium-lift vehicles', cost: 520000, days: 9, requires: ['orbital_rockets'], text: 'Medium satellite launch vehicles.' },
  heavy_lift: { name: 'Heavy lift', cost: 900000, days: 12, requires: ['medium_lift'], text: 'Heavy-lift transport rockets.' },
  reusable_rockets: { name: 'Reusable boosters', cost: 1100000, days: 14, requires: ['medium_lift'], effect: { launchCost: -0.3 }, text: 'Partially reusable rockets; launches cost 30% less.' },
  crew_vehicles: { name: 'Crew-rated vehicles', cost: 1300000, days: 14, requires: ['heavy_lift', 'advanced_avionics'], text: 'Civilian cargo and crew transport rockets.' },
  satellite_bus: { name: 'Satellite bus', cost: 300000, days: 6, requires: [], text: 'Communications, weather and observation satellites.' },
  earth_observation: { name: 'Earth observation payloads', cost: 260000, days: 5, requires: ['satellite_bus'], text: 'Mapping and infrastructure satellites.' },
  navigation_payloads: { name: 'Navigation & timing', cost: 340000, days: 6, requires: ['satellite_bus'], text: 'Navigation satellites.' },
  comms_constellations: { name: 'Constellation networking', cost: 600000, days: 9, requires: ['satellite_bus'], text: 'High-capacity network satellites; +10% network revenue.' },
  deep_space: { name: 'Deep-space instruments', cost: 700000, days: 10, requires: ['earth_observation'], text: 'Scientific research and deep-space observation satellites.' },
  secure_systems: { name: 'Secure systems', cost: 500000, days: 8, requires: ['satellite_bus'], clearance: true, text: 'Early-warning, secure-communications and space-surveillance satellites.' },
  strategic_systems: { name: 'Strategic systems', cost: 800000, days: 10, requires: ['orbital_rockets', 'secure_systems'], clearance: true, text: 'Fictional strategic missile products for defence agencies.' },
  space_power: { name: 'Space power', cost: 1600000, days: 16, requires: ['comms_constellations', 'heavy_lift'], text: 'Autonomous platforms and solar power satellites.' },
  futuristic_propulsion: { name: 'Exotic propulsion', cost: 2400000, days: 20, requires: ['stealth', 'reusable_rockets'], text: 'Futuristic aircraft and advanced launch vehicles.' },
  experimental: { name: 'Experimental platforms', cost: 3000000, days: 22, requires: ['space_power', 'futuristic_propulsion'], text: 'Experimental satellites and the most advanced airframes.' },
};

/**
 * The catalogue. line: aircraft | rocket | missile | satellite. cls: the
 * class within the line. price: list price per unit (customers' budgets are
 * set around it). days: work days in a bay at standard speed. bay: the bay
 * type it needs. bom: materials in lots. tech: research it needs. quality:
 * the minimum quality customers accept for it. Aircraft carry `spec` (for
 * the flyable-aircraft update) and `apron` (slots); rockets carry `lift`
 * (payload class S/M/H/X); satellites carry `mass` (S/M/H/X) and `role`.
 */
const L = { S: 1, M: 2, H: 3, X: 4 };
export const LIFT = L;

const aircraft = (id, name, cls, price, days, bay, bom, tech, o = {}) => [id, { name, line: 'aircraft', cls, price, days, bay, bom, tech, quality: o.quality ?? 50, apron: o.apron ?? 1, spec: o.spec, tier: o.tier ?? 1, text: o.text, look: o.look }];
const rocket = (id, name, cls, price, days, bom, tech, o = {}) => [id, { name, line: 'rocket', cls, price, days, bay: 'rocket', bom, tech, quality: o.quality ?? 60, lift: o.lift, reusable: Boolean(o.reusable), crew: Boolean(o.crew), launchCost: o.launchCost, tier: o.tier ?? 1, text: o.text, look: o.look }];
const missile = (id, name, price, days, bom, tech, o = {}) => [id, { name, line: 'missile', cls: 'strategic', price, days, bay: 'secure', bom, tech, quality: o.quality ?? 70, tier: o.tier ?? 3, text: o.text, look: o.look }];
const satellite = (id, name, cls, price, days, bom, tech, o = {}) => [id, { name, line: 'satellite', cls, price, days, bay: 'clean', bom, tech, quality: o.quality ?? 58, mass: o.mass, role: o.role, life: o.life, opex: o.opex, service: o.service, tier: o.tier ?? 1, text: o.text, look: o.look }];

/** Flight parameters (fictional, plausibly balanced) kept with every aircraft for the future flight controller. */
const spec = (o) => ({
  length: o.len, span: o.span, mass: o.mass, payload: o.payload, seats: o.seats ?? 0, cargo: o.cargo ?? 0,
  propulsion: o.prop, engines: o.engines ?? 1, fuel: o.fuel, burn: o.burn, range: o.range, endurance: o.endurance,
  cruise: o.cruise, vmax: o.vmax, climb: o.climb, turn: o.turn, roll: o.roll, takeoff: o.takeoff, landing: o.landing,
  runway: o.runway ?? 'any', crewSeats: o.crew ?? 1, vtol: Boolean(o.vtol), military: Boolean(o.military),
});

export const PRODUCTS = Object.fromEntries([
  // ---------------------------------------------------------------- private aircraft
  aircraft('ap_skylark', 'Roost Skylark', 'private', 26000, 1, 'light', { alu: 3, engine_light: 1, glazing: 1, electronics: 1, chemicals: 2, fuel: 2 }, 'light_airframes', {
    quality: 40, tier: 1, text: 'A two-seat high-wing propeller plane. Crop-dusters, flying schools and doctors in a hurry.',
    spec: spec({ len: 7.4, span: 10.9, mass: 760, payload: 300, seats: 2, prop: 'piston', fuel: 160, burn: 30, range: 1100, endurance: 5.5, cruise: 200, vmax: 250, climb: 3.6, turn: 0.9, roll: 1.0, takeoff: 280, landing: 260, runway: 'grass' }),
    look: { kind: 'highwing', len: 3, span: 4, color: '#e8e2d0', trim: '#c8402a' } }),
  aircraft('ap_meadowlark', 'Meadowlark Executive', 'private', 74000, 2, 'light', { alu: 5, engine_light: 2, glazing: 2, avionics: 1, electronics: 2, chemicals: 2, fuel: 2 }, 'turboprops', {
    quality: 48, tier: 2, text: 'A six-seat twin turboprop with leather seats and a tiny fridge.',
    spec: spec({ len: 11.2, span: 14.4, mass: 3900, payload: 1100, seats: 6, prop: 'turboprop', engines: 2, fuel: 1400, burn: 240, range: 2400, endurance: 6.5, cruise: 480, vmax: 540, climb: 9, turn: 0.75, roll: 0.8, takeoff: 650, landing: 600 }),
    look: { kind: 'twinprop', len: 4, span: 5, color: '#f2f2ee', trim: '#2a4a7a' } }),
  aircraft('ap_swift', 'Swift LJ-2 light jet', 'private', 210000, 3, 'light', { alu: 4, titanium: 1, engine_jet: 2, glazing: 1, avionics: 1, electronics: 1, instruments: 1, chemicals: 2, fuel: 2 }, 'jet_engines', {
    quality: 55, tier: 3, text: 'An eight-seat light business jet. Gets a chief executive to the meeting before the meeting.',
    spec: spec({ len: 15.6, span: 15.9, mass: 8100, payload: 1500, seats: 8, prop: 'turbofan', engines: 2, fuel: 3300, burn: 620, range: 3700, endurance: 5.5, cruise: 780, vmax: 830, climb: 18, turn: 0.7, roll: 0.8, takeoff: 1100, landing: 900, runway: 'paved' }),
    look: { kind: 'bizjet', len: 5, span: 5, color: '#f4f4f0', trim: '#1a1a24' } }),
  aircraft('ap_albatross', 'Albatross Grand long-range jet', 'private', 290000, 5, 'heavy', { alu: 8, titanium: 2, composite: 3, glazing: 1, avionics: 1, electronics: 2, instruments: 1, comms: 1, chemicals: 3, fuel: 3, engine_jet: 2 }, 'pressurised_cabins', {
    quality: 64, tier: 4, apron: 2, text: 'A long-range luxury jet: a bedroom, a shower and a range that crosses oceans twice.',
    spec: spec({ len: 30.3, span: 30.4, mass: 22000, payload: 2700, seats: 16, prop: 'turbofan', engines: 2, fuel: 18000, burn: 1500, range: 12000, endurance: 14, cruise: 900, vmax: 950, climb: 20, turn: 0.55, roll: 0.6, takeoff: 1800, landing: 1300, runway: 'paved' }),
    look: { kind: 'bizjet_long', len: 7, span: 7, color: '#f2efe8', trim: '#8a6a2a' } }),
  aircraft('ap_aurora', 'Aurora hypersonic VTOL', 'private', 1150000, 8, 'heavy', { alu: 10, titanium: 12, composite: 14, glazing: 3, avionics: 6, electronics: 8, instruments: 4, sensors: 2, comms: 2, chemicals: 8, fuel: 10, engine_mil: 2 }, 'futuristic_propulsion', {
    quality: 82, tier: 5, apron: 2, text: 'A futuristic private aircraft: lifts straight up off the apron, then goes very fast indeed.',
    spec: spec({ len: 24, span: 14, mass: 16000, payload: 1800, seats: 6, prop: 'hybrid scramjet', engines: 4, fuel: 9000, burn: 2600, range: 9000, endurance: 3.5, cruise: 2900, vmax: 4200, climb: 60, turn: 0.6, roll: 1.2, takeoff: 0, landing: 0, vtol: true }),
    look: { kind: 'futuristic', len: 6, span: 4, color: '#e8eef4', trim: '#4ad8e8' } }),
  // ---------------------------------------------------------------- passenger aircraft
  aircraft('ap_puffin', 'Puffin 40 regional airliner', 'passenger', 260000, 4, 'heavy', { alu: 8, titanium: 1, composite: 1, glazing: 1, avionics: 2, electronics: 3, instruments: 1, chemicals: 3, fuel: 3, engine_jet: 2 }, 'turboprops', {
    quality: 56, tier: 2, apron: 2, text: 'A forty-seat turboprop for island hops and short runways.',
    spec: spec({ len: 22.7, span: 27, mass: 13500, payload: 4800, seats: 40, prop: 'turboprop', engines: 2, fuel: 5000, burn: 700, range: 1500, endurance: 4.5, cruise: 510, vmax: 560, climb: 7, turn: 0.45, roll: 0.5, takeoff: 1200, landing: 1100, crew: 2 }),
    look: { kind: 'turboprop_liner', len: 7, span: 8, color: '#f4f4f4', trim: '#3a7ab8' } }),
  aircraft('ap_tern', 'Tern 150 medium-range airliner', 'passenger', 610000, 6, 'heavy', { alu: 20, titanium: 3, composite: 4, glazing: 2, avionics: 3, electronics: 5, instruments: 1, comms: 1, chemicals: 6, fuel: 6, engine_large: 2 }, 'pressurised_cabins', {
    quality: 62, tier: 3, apron: 2, text: 'A 150-seat narrowbody: the workhorse of every airline that has ever complained about its workhorses.',
    spec: spec({ len: 37.6, span: 35.8, mass: 41000, payload: 20000, seats: 150, prop: 'turbofan', engines: 2, fuel: 20000, burn: 2500, range: 5600, endurance: 7, cruise: 830, vmax: 870, climb: 12, turn: 0.35, roll: 0.4, takeoff: 2100, landing: 1500, crew: 2, runway: 'paved' }),
    look: { kind: 'narrowbody', len: 9, span: 9, color: '#f4f4f4', trim: '#2a5aa8' } }),
  aircraft('ap_condor', 'Condor 300 long-haul widebody', 'passenger', 1080000, 9, 'wide', { alu: 52, titanium: 10, composite: 15, glazing: 3, avionics: 6, electronics: 13, instruments: 3, comms: 2, chemicals: 15, fuel: 13, engine_large: 2 }, 'widebody', {
    quality: 68, tier: 4, apron: 3, text: 'A 300-seat twin-aisle for the long way round. Two engines the size of a bus each.',
    spec: spec({ len: 63.7, span: 60.1, mass: 135000, payload: 50000, seats: 300, cargo: 20, prop: 'turbofan', engines: 2, fuel: 110000, burn: 6800, range: 13500, endurance: 16, cruise: 900, vmax: 945, climb: 10, turn: 0.25, roll: 0.3, takeoff: 2800, landing: 1900, crew: 2, runway: 'paved' }),
    look: { kind: 'widebody', len: 12, span: 12, color: '#f4f4f4', trim: '#c84a2a' } }),
  aircraft('ap_skyliner', 'Skyliner 600 advanced airliner', 'passenger', 1850000, 12, 'wide', { alu: 57, titanium: 15, composite: 33, glazing: 5, avionics: 10, electronics: 18, instruments: 5, comms: 2, sensors: 1, chemicals: 18, fuel: 16, engine_large: 4 }, 'next_gen_airliners', {
    quality: 76, tier: 5, apron: 3, text: 'A high-capacity advanced airliner: blended wing, 600 seats, and windows that dim themselves.',
    spec: spec({ len: 68, span: 78, mass: 240000, payload: 80000, seats: 600, cargo: 30, prop: 'geared turbofan', engines: 4, fuel: 190000, burn: 9800, range: 15000, endurance: 17, cruise: 920, vmax: 960, climb: 9, turn: 0.2, roll: 0.25, takeoff: 3100, landing: 2100, crew: 2, runway: 'paved' }),
    look: { kind: 'blended', len: 12, span: 14, color: '#f2f4f6', trim: '#3a3a8a' } }),
  // ---------------------------------------------------------------- fighters (fictional defence products)
  aircraft('af_kestrel', 'Kestrel T-3 trainer / light combat', 'fighter', 210000, 3, 'secure', { alu: 5, titanium: 2, composite: 1, glazing: 1, avionics: 2, electronics: 2, instruments: 1, chemicals: 2, fuel: 3, engine_jet: 1 }, 'military_airframes', {
    quality: 60, tier: 2, text: 'A two-seat jet trainer that can carry light stores. Every air force starts here.',
    spec: spec({ len: 11.8, span: 9.4, mass: 3300, payload: 1500, seats: 2, prop: 'turbofan', fuel: 1600, burn: 900, range: 1800, endurance: 2.5, cruise: 750, vmax: 1000, climb: 70, turn: 1.4, roll: 2.4, takeoff: 600, landing: 700, crew: 2, military: true }),
    look: { kind: 'trainer', len: 4, span: 4, color: '#c8ccd0', trim: '#c84a2a' } }),
  aircraft('af_falcon', 'Falcon F-9 multirole fighter', 'fighter', 590000, 6, 'secure', { alu: 9, titanium: 5, composite: 4, glazing: 1, avionics: 4, electronics: 4, instruments: 2, sensors: 1, comms: 1, chemicals: 3, fuel: 5, engine_mil: 1 }, 'military_airframes', {
    quality: 68, tier: 3, text: 'A single-engine multirole fighter. Does everything, and is never quite allowed to do any of it.',
    spec: spec({ len: 15, span: 9.8, mass: 8600, payload: 7000, seats: 1, prop: 'afterburning turbofan', fuel: 3200, burn: 2400, range: 3200, endurance: 2.8, cruise: 900, vmax: 2100, climb: 250, turn: 1.9, roll: 3.2, takeoff: 500, landing: 800, military: true }),
    look: { kind: 'fighter', len: 5, span: 4, color: '#8a929a', trim: '#5a626a' } }),
  aircraft('af_gyrfalcon', 'Gyrfalcon F-11 air-superiority fighter', 'fighter', 880000, 8, 'secure', { alu: 9, titanium: 7, composite: 5, glazing: 1, avionics: 5, electronics: 5, instruments: 2, sensors: 2, comms: 1, chemicals: 3, fuel: 6, engine_mil: 2 }, 'supersonic', {
    quality: 72, tier: 4, text: 'A twin-engine air-superiority fighter that turns in its own length.',
    spec: spec({ len: 19, span: 13, mass: 16000, payload: 8000, seats: 1, prop: 'afterburning turbofan', engines: 2, fuel: 7000, burn: 4200, range: 3000, endurance: 2.5, cruise: 950, vmax: 2500, climb: 300, turn: 2.2, roll: 3.4, takeoff: 450, landing: 900, military: true }),
    look: { kind: 'twinfighter', len: 6, span: 5, color: '#7a828c', trim: '#4a525c' } }),
  aircraft('af_wraith', 'Wraith F-14 stealth fighter', 'fighter', 1550000, 10, 'secure', { alu: 8, titanium: 12, composite: 13, stealth: 7, glazing: 1, avionics: 8, electronics: 8, instruments: 4, sensors: 3, comms: 2, chemicals: 7, fuel: 8, engine_mil: 2 }, 'stealth', {
    quality: 80, tier: 4, text: 'A low-observable fighter. On radar it looks like a small, well-behaved bird.',
    spec: spec({ len: 18.9, span: 13.6, mass: 19500, payload: 8100, seats: 1, prop: 'afterburning turbofan', engines: 2, fuel: 8200, burn: 4400, range: 2900, endurance: 2.6, cruise: 1000, vmax: 2400, climb: 280, turn: 2.0, roll: 3.0, takeoff: 500, landing: 900, military: true }),
    look: { kind: 'stealthfighter', len: 6, span: 5, color: '#4a5058', trim: '#2a3038' } }),
  aircraft('af_seraph', 'Seraph X-2 experimental fighter', 'fighter', 2600000, 14, 'secure', { titanium: 23, composite: 27, stealth: 14, glazing: 1, avionics: 16, electronics: 14, instruments: 9, sensors: 7, comms: 3, chemicals: 11, fuel: 14, engine_mil: 2 }, 'futuristic_propulsion', {
    quality: 86, tier: 5, text: 'An experimental futuristic fighter with thrust vectoring in every direction including, rumour says, backwards.',
    spec: spec({ len: 20, span: 12, mass: 21000, payload: 6000, seats: 1, prop: 'variable-cycle turbofan', engines: 2, fuel: 9000, burn: 5200, range: 3600, endurance: 2.4, cruise: 1700, vmax: 3200, climb: 360, turn: 2.8, roll: 4.0, takeoff: 300, landing: 600, military: true }),
    look: { kind: 'futurefighter', len: 6, span: 5, color: '#2a2e38', trim: '#c84ad8' } }),
  // ---------------------------------------------------------------- bombers (fictional defence products)
  aircraft('ab_harrow', 'Harrow B-5 tactical bomber', 'bomber', 960000, 8, 'secure', { alu: 19, titanium: 6, composite: 4, glazing: 1, avionics: 5, electronics: 6, instruments: 3, sensors: 2, comms: 1, chemicals: 6, fuel: 8, engine_mil: 2 }, 'military_airframes', {
    quality: 70, tier: 3, apron: 2, text: 'A two-seat tactical bomber, low and fast.',
    spec: spec({ len: 22, span: 19, mass: 22000, payload: 9000, seats: 2, prop: 'turbofan', engines: 2, fuel: 11000, burn: 3600, range: 4500, endurance: 4, cruise: 850, vmax: 1300, climb: 150, turn: 1.0, roll: 1.6, takeoff: 1200, landing: 1200, crew: 2, military: true }),
    look: { kind: 'tacbomber', len: 7, span: 7, color: '#6a7064', trim: '#3a4034' } }),
  aircraft('ab_thunderhead', 'Thunderhead B-8 strategic bomber', 'bomber', 2250000, 12, 'wide', { alu: 61, titanium: 20, composite: 14, glazing: 2, avionics: 12, electronics: 18, instruments: 6, sensors: 4, comms: 3, chemicals: 18, fuel: 20, engine_mil: 4 }, 'supersonic', {
    quality: 74, tier: 4, apron: 3, text: 'A four-engine long-range strategic bomber. Takes the whole runway and most of the sky.',
    spec: spec({ len: 46, span: 41, mass: 87000, payload: 34000, seats: 4, prop: 'afterburning turbofan', engines: 4, fuel: 88000, burn: 9000, range: 11000, endurance: 12, cruise: 900, vmax: 1500, climb: 60, turn: 0.4, roll: 0.6, takeoff: 2500, landing: 2000, crew: 4, military: true, runway: 'paved' }),
    look: { kind: 'stratbomber', len: 12, span: 12, color: '#5a6064', trim: '#2a3034' } }),
  aircraft('ab_nightjar', 'Nightjar B-10 stealth bomber', 'bomber', 3600000, 15, 'wide', { alu: 34, titanium: 27, composite: 45, stealth: 22, glazing: 2, avionics: 18, electronics: 22, instruments: 9, sensors: 7, comms: 4, chemicals: 22, fuel: 22, engine_large: 4 }, 'stealth', {
    quality: 82, tier: 5, apron: 3, text: 'A flying-wing stealth bomber. Hangs in the hangar like a black boomerang the size of a football field.',
    spec: spec({ len: 21, span: 52, mass: 72000, payload: 18000, seats: 2, prop: 'turbofan', engines: 4, fuel: 75000, burn: 7200, range: 11000, endurance: 14, cruise: 900, vmax: 1010, climb: 40, turn: 0.4, roll: 0.5, takeoff: 2400, landing: 1900, crew: 2, military: true, runway: 'paved' }),
    look: { kind: 'flyingwing', len: 7, span: 14, color: '#2a2e34', trim: '#1a1e24' } }),
  aircraft('ab_leviathan', 'Leviathan B-X heavy aircraft', 'bomber', 5400000, 18, 'wide', { titanium: 46, composite: 70, stealth: 35, glazing: 3, avionics: 26, electronics: 30, instruments: 14, sensors: 12, comms: 7, chemicals: 28, fuel: 28, engine_large: 6 }, 'experimental', {
    quality: 88, tier: 5, apron: 3, text: 'An advanced futuristic heavy aircraft: an airborne command and transport platform that flies for days.',
    spec: spec({ len: 60, span: 70, mass: 210000, payload: 60000, seats: 12, prop: 'hybrid-electric turbofan', engines: 6, fuel: 160000, burn: 8000, range: 20000, endurance: 30, cruise: 980, vmax: 1200, climb: 35, turn: 0.3, roll: 0.35, takeoff: 2600, landing: 2100, crew: 6, military: true, runway: 'paved' }),
    look: { kind: 'futurebomber', len: 12, span: 14, color: '#1e2228', trim: '#4ad8e8' } }),
  // ---------------------------------------------------------------- launch vehicles (orbital; never interchangeable with the strategic products below)
  rocket('rk_sparrow', 'Sparrow small orbital launcher', 'small', 640000, 5, { alu: 8, composite: 4, steel: 3, engine_rocket: 2, avionics: 1, electronics: 2, instruments: 1, chemicals: 3, propellant: 12, fuel: 1 }, 'orbital_rockets', {
    lift: L.S, launchCost: 30000, tier: 2, text: 'A two-stage small launcher for one small satellite or a rideshare of cubesats.', look: { h: 6, w: 1, color: '#f2f2ee', band: '#c8402a' } }),
  rocket('rk_heron', 'Heron medium launch vehicle', 'medium', 1420000, 8, { alu: 14, titanium: 2, composite: 5, steel: 4, engine_rocket: 5, avionics: 1, electronics: 2, instruments: 1, chemicals: 4, propellant: 19, fuel: 1 }, 'medium_lift', {
    lift: L.M, launchCost: 70000, tier: 3, text: 'A medium launcher: one big satellite to high orbit, or several smaller ones.', look: { h: 8, w: 1, color: '#f4f4f0', band: '#2a5aa8' } }),
  rocket('rk_colossus', 'Colossus heavy-lift transport rocket', 'heavy', 3400000, 12, { alu: 36, titanium: 6, composite: 11, steel: 9, engine_rocket: 12, avionics: 3, electronics: 5, instruments: 3, chemicals: 8, propellant: 51, fuel: 3 }, 'heavy_lift', {
    lift: L.H, launchCost: 160000, tier: 4, text: 'A heavy-lift rocket with two strap-on boosters: anything the Flats can build, it can throw.', look: { h: 11, w: 2, color: '#f2f2ee', band: '#1a1a24', boosters: true } }),
  rocket('rk_phoenix', 'Phoenix reusable launcher', 'reusable', 2500000, 10, { alu: 18, titanium: 5, composite: 8, steel: 4, engine_rocket: 9, avionics: 2, electronics: 3, instruments: 2, chemicals: 4, propellant: 27, fuel: 2 }, 'reusable_rockets', {
    lift: L.M, reusable: true, launchCost: 45000, tier: 4, text: 'A partially reusable launcher: the first stage lands back on the Flats on its own legs.', look: { h: 9, w: 1, color: '#e8eaee', band: '#c8a040', legs: true } }),
  rocket('rk_ark', 'Ark crew & cargo transport', 'crew', 3400000, 14, { alu: 23, titanium: 6, composite: 9, steel: 5, engine_rocket: 12, avionics: 3, electronics: 5, instruments: 3, sensors: 1, comms: 1, chemicals: 5, propellant: 37, fuel: 2 }, 'crew_vehicles', {
    lift: L.H, crew: true, launchCost: 190000, quality: 78, tier: 5, text: 'A crew-rated rocket with a capsule on top: cargo to stations, and people who read the waiver.', look: { h: 11, w: 2, color: '#f4f4f4', band: '#e8a040', capsule: true } }),
  rocket('rk_halo', 'Halo advanced launch vehicle', 'advanced', 6200000, 18, { titanium: 46, composite: 76, steel: 18, engine_rocket: 14, avionics: 18, electronics: 21, instruments: 15, sensors: 6, comms: 6, chemicals: 27, propellant: 167, fuel: 9 }, 'futuristic_propulsion', {
    lift: L.X, reusable: true, launchCost: 120000, quality: 84, tier: 5, text: 'An advanced fully reusable vehicle that flies back, lands, and is refuelled for the next morning.', look: { h: 12, w: 2, color: '#d8dee6', band: '#4ad8e8', legs: true } }),
  // ---------------------------------------------------------------- strategic missile products (fictional; delivered by secure convoy, never launched from the Park)
  missile('ms_sentinel', 'Sentinel-class strategic missile product', 1700000, 9, { alu: 23, titanium: 20, composite: 16, steel: 10, engine_rocket: 3, avionics: 8, electronics: 10, instruments: 7, sensors: 3, chemicals: 10 }, 'strategic_systems', {
    text: 'A fictional strategic missile product, delivered unfuelled and inert to a defence agency\'s depot by secure convoy. What the agency does with it is entirely the agency\'s business.', look: { h: 7, w: 1, color: '#6a7064', band: '#3a4034' } }),
  missile('ms_bastion', 'Bastion-class strategic deterrent product', 3100000, 13, { alu: 39, titanium: 39, composite: 35, steel: 17, engine_rocket: 4, avionics: 17, electronics: 19, instruments: 13, sensors: 9, comms: 2, chemicals: 17 }, 'strategic_systems', {
    quality: 78, tier: 4, text: 'A fictional advanced strategic product for defence agencies, delivered by secure convoy. Stored, inspected, and hopefully forgotten about.', look: { h: 8, w: 1, color: '#4a5058', band: '#2a3038' } }),
  // ---------------------------------------------------------------- satellites
  satellite('st_relay', 'Relay-1 communications satellite', 'communications', 280000, 4, { alu: 3, composite: 1, solar: 3, electronics: 2, comms: 4, instruments: 1, avionics: 1, chemicals: 1 }, 'satellite_bus', {
    mass: L.S, role: 'comms', life: 60, opex: 600, service: { comms: 40 }, text: 'A communications satellite: phone, broadcast and data relays.' }),
  satellite('st_beacon', 'Beacon-HC high-capacity network satellite', 'network', 520000, 6, { alu: 4, composite: 3, solar: 5, electronics: 3, comms: 9, instruments: 1, avionics: 1, chemicals: 2 }, 'comms_constellations', {
    mass: L.M, role: 'comms', life: 70, opex: 1100, service: { comms: 110 }, tier: 3, text: 'A high-capacity network satellite built to fly in a constellation.' }),
  satellite('st_nimbus', 'Nimbus weather satellite', 'weather', 300000, 4, { alu: 3, composite: 2, solar: 3, electronics: 2, sensors: 3, instruments: 2, avionics: 1, chemicals: 2 }, 'satellite_bus', {
    mass: L.S, role: 'weather', life: 50, opex: 700, service: { weather: 1 }, text: 'A weather satellite: storm warnings for shipping, forecasts for farmers.' }),
  satellite('st_verdant', 'Verdant agricultural & environmental observer', 'earth observation', 290000, 4, { alu: 3, composite: 1, solar: 3, electronics: 2, sensors: 3, instruments: 1, avionics: 1, chemicals: 1 }, 'satellite_bus', {
    mass: L.S, role: 'earthobs', life: 50, opex: 650, service: { earthobs: 30 }, text: 'Crop health, soil moisture and the environment from orbit.' }),
  satellite('st_cartographer', 'Cartographer mapping & infrastructure satellite', 'mapping', 345000, 5, { alu: 3, composite: 2, solar: 3, electronics: 2, sensors: 4, instruments: 2, avionics: 1, chemicals: 1 }, 'earth_observation', {
    mass: L.S, role: 'earthobs', life: 55, opex: 750, service: { earthobs: 40 }, tier: 2, text: 'High-resolution mapping and infrastructure monitoring: pipelines, roads, ports.' }),
  satellite('st_compass', 'Compass navigation & timing satellite', 'navigation', 365000, 5, { alu: 4, composite: 2, solar: 4, electronics: 3, comms: 3, instruments: 4, avionics: 2, chemicals: 2 }, 'navigation_payloads', {
    mass: L.M, role: 'nav', life: 70, opex: 800, service: { nav: 1 }, tier: 2, text: 'An atomic-clock navigation satellite. A constellation of them tells every ship where it is.' }),
  satellite('st_lyceum', 'Lyceum scientific research satellite', 'science', 440000, 6, { alu: 4, composite: 2, solar: 3, electronics: 2, sensors: 5, instruments: 4, avionics: 1, chemicals: 2 }, 'deep_space', {
    mass: L.M, role: 'science', life: 40, opex: 900, service: { science: 1 }, tier: 3, text: 'A research satellite for a university or an agency: grants, papers and occasionally a discovery.' }),
  satellite('st_farsight', 'Farsight deep-space observatory', 'deep space', 960000, 9, { alu: 5, composite: 5, titanium: 1, solar: 5, electronics: 4, sensors: 11, instruments: 8, avionics: 2, comms: 1, chemicals: 3 }, 'deep_space', {
    mass: L.H, role: 'science', life: 60, opex: 1600, service: { science: 3 }, quality: 70, tier: 4, text: 'A deep-space observatory with a mirror polished by people who never smile.' }),
  satellite('st_vigil', 'Vigil early-warning & secure comms satellite', 'defence', 870000, 8, { alu: 6, composite: 5, titanium: 2, solar: 5, electronics: 5, sensors: 8, comms: 6, instruments: 3, avionics: 2, chemicals: 2 }, 'secure_systems', {
    mass: L.M, role: 'defense', life: 60, opex: 1400, service: { defense: 1 }, quality: 72, tier: 4, text: 'A fictional early-warning and secure-communications satellite for a government.' }),
  satellite('st_watchtower', 'Watchtower space-surveillance satellite', 'surveillance', 790000, 8, { alu: 6, composite: 4, solar: 4, electronics: 4, sensors: 9, comms: 3, instruments: 3, avionics: 2, chemicals: 2 }, 'secure_systems', {
    mass: L.M, role: 'defense', life: 55, opex: 1300, service: { defense: 1 }, quality: 70, tier: 4, text: 'Watches the sky for debris, satellites and anything that shouldn\'t be there.' }),
  satellite('st_atrium', 'Atrium autonomous orbital platform', 'platform', 1600000, 12, { alu: 15, composite: 15, titanium: 7, solar: 15, electronics: 13, comms: 9, sensors: 7, instruments: 9, avionics: 7, chemicals: 7 }, 'space_power', {
    mass: L.H, role: 'platform', life: 90, opex: 2600, service: { platform: 1 }, quality: 78, tier: 5, text: 'An autonomous platform that services other satellites and hosts experiments.' }),
  satellite('st_heliostat', 'Heliostat solar power satellite', 'solar power', 2350000, 14, { alu: 27, composite: 27, titanium: 11, solar: 54, electronics: 22, comms: 5, instruments: 8, avionics: 8, chemicals: 11 }, 'space_power', {
    mass: L.X, role: 'power', life: 100, opex: 3200, service: { power: 1 }, quality: 80, tier: 5, text: 'Collects sunlight in orbit and beams it down as microwaves to a field of receivers.' }),
  satellite('st_quasar', 'Quasar experimental satellite', 'experimental', 3200000, 16, { titanium: 15, composite: 26, solar: 23, electronics: 23, comms: 12, sensors: 23, instruments: 20, avionics: 12, chemicals: 12 }, 'experimental', {
    mass: L.H, role: 'experimental', life: 30, opex: 3600, service: { science: 4 }, quality: 86, tier: 5, text: 'Nobody will say exactly what it does. The brochure is a single word: "Yes."' }),
]);

/**
 * Customers. kind: government | airline | private | cargo | science |
 * comms | agriculture | defence | agency. wants: product classes (or ids) it
 * buys, with a weight. budget: spending per year (spent through tenders;
 * replenished daily). priority: how it weighs bids (price, time, quality,
 * reputation). country: for defence buyers, the arms market's country
 * (embargoes and wars apply). port: where its aircraft are based (the
 * departure heading).
 */
export const CUSTOMERS = {
  cu_lariat_coop: { name: 'Lariat Crop-Dusting Co-op', kind: 'agriculture', budget: 120000, wants: { ap_skylark: 3, st_verdant: 0.2 }, priority: { price: 0.5, time: 0.2, quality: 0.1, reputation: 0.2 }, blurb: 'Six farmers, one hangar and an argument about who flies on Tuesdays.' },
  cu_halver_flying: { name: 'Halvermouth Flying Club', kind: 'private', budget: 160000, wants: { ap_skylark: 2, ap_meadowlark: 1 }, priority: { price: 0.45, time: 0.15, quality: 0.2, reputation: 0.2 }, blurb: 'Members wear scarves. Unironically.' },
  cu_beaumont_charter: { name: 'Beaumont Executive Charter', kind: 'private', budget: 900000, wants: { ap_meadowlark: 1.5, ap_swift: 2, ap_albatross: 1 }, priority: { price: 0.25, time: 0.3, quality: 0.3, reputation: 0.15 }, blurb: 'Julian Beaumont\'s cousin\'s company. They want everything in tan leather.' },
  cu_teshvar_air: { name: 'Teshvar Royal Flight', kind: 'private', budget: 4200000, wants: { ap_albatross: 2, ap_aurora: 1, ap_swift: 1 }, priority: { price: 0.1, time: 0.3, quality: 0.4, reputation: 0.2 }, blurb: 'The sheikh\'s flight department. Gold-leaf cup holders are non-negotiable.' },
  cu_skyward: { name: 'Skyward Airlines', kind: 'airline', budget: 5600000, wants: { ap_tern: 2, ap_condor: 1, ap_puffin: 0.5, ap_skyliner: 0.6 }, priority: { price: 0.4, time: 0.25, quality: 0.2, reputation: 0.15 }, blurb: 'The coast\'s flag carrier. Peanuts included; legroom extra.' },
  cu_morrow_hopper: { name: 'Morrow Island Hopper', kind: 'airline', budget: 1300000, wants: { ap_puffin: 3, ap_meadowlark: 0.6 }, priority: { price: 0.45, time: 0.25, quality: 0.15, reputation: 0.15 }, blurb: 'Two hundred islands, a hundred and ninety-nine runways.' },
  cu_lirre_air: { name: 'Air Lirre', kind: 'airline', budget: 4400000, wants: { ap_tern: 2, ap_condor: 1.2, ap_skyliner: 0.4 }, priority: { price: 0.3, time: 0.2, quality: 0.3, reputation: 0.2 }, blurb: 'Neutral in everything except seat pitch.' },
  cu_dunmere_post: { name: 'Dunmere Parcel Post (air cargo)', kind: 'cargo', budget: 2000000, wants: { ap_puffin: 1, ap_tern: 1, ap_condor: 0.5 }, priority: { price: 0.35, time: 0.4, quality: 0.1, reputation: 0.15 }, blurb: 'Late is their brand. They pay extra for anyone who isn\'t.' },
  cu_brightwave: { name: 'Brightwave Telecom', kind: 'comms', budget: 3200000, wants: { st_relay: 2, st_beacon: 2, rk_sparrow: 0.4, rk_heron: 0.5 }, priority: { price: 0.35, time: 0.3, quality: 0.2, reputation: 0.15 }, blurb: 'Five bars everywhere, eventually.' },
  cu_halver_weather: { name: 'Halvermouth Meteorological Office', kind: 'government', budget: 900000, wants: { st_nimbus: 2, st_cartographer: 0.6 }, priority: { price: 0.4, time: 0.2, quality: 0.3, reputation: 0.1 }, blurb: 'The people who say it will rain, and are right just often enough.' },
  cu_harvest_union: { name: 'Harvest & Habitat Union', kind: 'agriculture', budget: 800000, wants: { st_verdant: 2, st_cartographer: 0.8 }, priority: { price: 0.45, time: 0.15, quality: 0.25, reputation: 0.15 }, blurb: 'Farmers and foresters across six countries who want to see their fields from space.' },
  cu_lyceum: { name: 'The Lyceum Institute', kind: 'science', budget: 1400000, wants: { st_lyceum: 2, st_farsight: 0.5, rk_sparrow: 0.3 }, priority: { price: 0.3, time: 0.15, quality: 0.4, reputation: 0.15 }, blurb: 'A university that measures things nobody else thought to measure.' },
  cu_ostmark_space: { name: 'Ostmark Union Space Agency', kind: 'agency', budget: 6400000, wants: { rk_heron: 1, rk_colossus: 0.6, st_compass: 1.2, st_farsight: 0.4, rk_ark: 0.3, st_atrium: 0.2 }, priority: { price: 0.25, time: 0.2, quality: 0.35, reputation: 0.2 }, blurb: 'Seven provinces\' worth of space programme, agreed in triplicate.' },
  cu_sund_space: { name: 'Royal Sund Space Office', kind: 'agency', budget: 1600000, wants: { rk_sparrow: 1, st_nimbus: 1, st_compass: 0.6 }, priority: { price: 0.35, time: 0.2, quality: 0.3, reputation: 0.15 }, blurb: 'The young king wants a rocket. The treasury wants a small one.' },
  cu_teshvar_space: { name: 'Teshvar Orbital Authority', kind: 'agency', budget: 8000000, wants: { rk_colossus: 0.8, st_heliostat: 0.5, st_atrium: 0.4, st_beacon: 1, rk_halo: 0.2, st_quasar: 0.15 }, priority: { price: 0.1, time: 0.3, quality: 0.4, reputation: 0.2 }, blurb: 'Oil money looking for a sun that never sets.' },
  // defence procurement (fictional): country budgets in this file, the arms market's embargoes and wars apply
  cu_ostmark_air: { name: 'Ostmark Union Air Command', kind: 'defence', country: 'ostmark', budget: 9000000, wants: { af_kestrel: 1, af_falcon: 2, af_gyrfalcon: 1, ab_harrow: 0.6, af_wraith: 0.4, st_vigil: 0.4, ms_sentinel: 0.3 }, priority: { price: 0.25, time: 0.25, quality: 0.35, reputation: 0.15 }, blurb: 'Procurement by committee: seven provinces, one requirement document, eleven appendices.' },
  cu_sund_defence: { name: 'Royal Sund Defence Board', kind: 'defence', country: 'sund', budget: 3000000, wants: { af_kestrel: 2, af_falcon: 1, st_watchtower: 0.3 }, priority: { price: 0.4, time: 0.2, quality: 0.25, reputation: 0.15 }, blurb: 'The smallest air force on the coast, and the shiniest.' },
  cu_teshvar_defence: { name: 'Teshvar Defence Procurement Agency', kind: 'defence', country: 'teshvar', budget: 16000000, wants: { af_gyrfalcon: 1, af_wraith: 1, ab_thunderhead: 0.6, ab_nightjar: 0.4, af_seraph: 0.15, ab_leviathan: 0.1, st_vigil: 0.6, st_watchtower: 0.4, ms_bastion: 0.2 }, priority: { price: 0.1, time: 0.3, quality: 0.4, reputation: 0.2 }, blurb: 'Buys the best of everything, then asks for it in gold.' },
  cu_varn_defence: { name: 'Varnistan Ministry of Air', kind: 'defence', country: 'varn', budget: 4200000, wants: { af_kestrel: 1.5, af_falcon: 1.5, ab_harrow: 0.8, ms_sentinel: 0.3 }, priority: { price: 0.45, time: 0.3, quality: 0.15, reputation: 0.1 }, blurb: 'Wants it cheap and wants it now. Has wanted it now for nineteen years.' },
  cu_caldera_defence: { name: 'Caldera Republic Air Corps', kind: 'defence', country: 'caldera', budget: 3600000, wants: { af_kestrel: 1.5, af_falcon: 1, ab_harrow: 0.6 }, priority: { price: 0.45, time: 0.3, quality: 0.15, reputation: 0.1 }, blurb: 'Every aircraft painted volcano red. Every pilot a little nervous.' },
  cu_morrow_defence: { name: 'Morrow Isles Joint Air Arm', kind: 'defence', country: 'morrow', budget: 4800000, wants: { af_falcon: 1.5, af_gyrfalcon: 0.8, st_watchtower: 0.5, ab_harrow: 0.4 }, priority: { price: 0.3, time: 0.25, quality: 0.3, reputation: 0.15 }, blurb: 'Two hundred navies finally agreed on one air arm. They are still painting the roundels.' },
  cu_lirre_defence: { name: 'Lirre Neutral Air Guard', kind: 'defence', country: 'lirre', budget: 2600000, wants: { af_kestrel: 1, af_falcon: 1, st_watchtower: 0.4 }, priority: { price: 0.3, time: 0.2, quality: 0.35, reputation: 0.15 }, blurb: 'Defends Lirre\'s neutrality from anyone, including other neutrals.' },
  cu_pallas_defence: { name: 'Pallas "Air Force"', kind: 'defence', country: 'pallas', budget: 1600000, wants: { af_kestrel: 2, af_falcon: 0.6 }, priority: { price: 0.6, time: 0.25, quality: 0.05, reputation: 0.1 }, blurb: 'Under international embargo. Nobody may sell them military aircraft — they keep asking anyway.' },
};
/** How often a customer posts a tender: chance per day per unit of total `wants` weight. */
export const TENDER_RATE = 0.28;
/** Budget a customer has at the start (share of its yearly budget) and how fast it comes back (per day). */
export const BUDGET_START = 0.6;
export const BUDGET_DAILY = 1 / 120;

/** Who's who (the people of Starling Flats, see src/content/characters/aerospace.js). */
export const AERO_PEOPLE = {
  seller: 'npc_billie', ceo: 'npc_imogen', pilot: 'npc_ailie', foreman: 'npc_rudy', launch: 'npc_tina', mechanic: 'npc_wrenna',
};
