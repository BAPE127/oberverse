// The living base (v0.100.0 stage 8): pure data. What a day on the base does to the people on it, and how they spend their hours. Every figure is a starting figure to calibrate against
// the wages and prices (a ration is 6 obols, a day's wage for a rifleman 150). Capacity is the test: beds, meals, treatment places and stores are real, and a base that is too small loses
// morale and readiness; it does not magically hold more (docs/PROPOSAL_WAR.md 3.2).
export const BASE = {
  /** A person eats one ration a day from the stores. Without a mess hall nobody has a hot meal; with one, as many as it seats. */
  food: { perPerson: 1, hungry: -20, hot: 8 },
  /** A person's morale drifts a share of the way to its target each day; the target starts at `start` and each condition moves it. */
  morale: { start: 70, overcrowded: -10, unpaid: -15, wounded: -10, tired: -8, rested: 4, settle: 0.15 },
  /** Fatigue (0 to 100) rises with work and falls with rest. */
  fatigue: { post: 8, training: 4, rest: -10, tired: 70, rested: 30 },
  /** Treatment: each treatment place heals one point of wounds a day, with a medicine from the stores; a medic on the books adds one. The untreated heal a point every `slow` days. */
  medical: { perPlace: 1, medicBonus: 1, slow: 4, medicine: 1 },
  /** What readiness is made of (shares add to 1); it is shown with its parts so it can be explained. */
  readiness: { strength: 0.35, morale: 0.25, armed: 0.2, fed: 0.1, housed: 0.1 },
  /** Notices are made at most this often (days) for the same shortage. */
  noticeEvery: 10,
  log: 12,
};

/** The bodies you can see (v0.100.0): at most this many people are drawn at once (the rest are records, doing the same day as counts). Officers and squad leaders are always drawn. */
export const BODIES = { cap: 40 };

/**
 * A soldier's day. `at` is a spot on Hollowmoor Lot (`hm_<slot>_out` is the step outside a facility's door); the first block that covers the time wins. A facility that is not built
 * is skipped: the soldier stands at the gate instead. `sleep` is in the barracks (or the bunkhouse) itself.
 */
export const ROUTINE = [
  { from: '06:00', to: '07:00', activity: 'leisure', at: 'mess' },
  { from: '07:00', to: '12:00', activity: 'work', at: 'duty' },
  { from: '12:00', to: '13:00', activity: 'leisure', at: 'mess' },
  { from: '13:00', to: '17:00', activity: 'work', at: 'duty' },
  { from: '17:00', to: '18:00', activity: 'leisure', at: 'mess' },
  { from: '18:00', to: '22:00', activity: 'leisure', at: 'barracks' },
  { from: '22:00', to: '06:00', activity: 'sleep', at: 'bed' },
];

/** Where a class does its duty hours: the first of these facilities that is built (else the gate). */
export const DUTY = {
  guard: ['site_office'], technician: ['tank_factory', 'helicopter_works'], rifleman: ['range', 'training'], machine_gunner: ['range', 'training'], anti_tank: ['range', 'training'], marksman: ['range', 'training'],
  medic: ['medical', 'hospital'], engineer: ['motor_pool'], signaller: ['command'], officer: ['command'], recon: ['range', 'training'], uav: ['command'],
};
