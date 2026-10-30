// What managers may decide on their own (v0.63.0). Data only: src/corp/management.js judges a decision against it,
// src/systems/management.js carries decisions out through the businesses' own services.

/** The decisions a job may make, and where. Anything not listed decides nothing. */
export const DECIDES = {
  procurement_mgr: { reorder: ['arms', 'aerospace'] },
  manufacturing_mgr: { reorder: ['arms'], expand: ['arms'] },
  aero_ops_mgr: { reorder: ['aerospace'], bid: ['aerospace'], expand: ['aerospace'] },
  gm: { reorder: ['arms', 'aerospace'], hire: ['arms', 'shipping', 'aerospace', 'farming'], bid: ['aerospace'], expand: ['arms', 'shipping', 'aerospace', 'farming'] },
  sales_mgr: { bid: ['aerospace'] },
  farm_mgr: { expand: ['farming'] },
  logistics_mgr: { expand: ['shipping'] },
  cfo: { transfer: ['arms', 'shipping', 'aerospace', 'farming'] },
  hrd: { hire: ['arms', 'shipping', 'aerospace', 'farming'] }, // the parent's HR director hires for its subsidiaries
};

/** What a monthly budget can be set for. A budget is an authorisation to spend, never money. */
export const CATEGORIES = {
  materials: { name: 'Materials and parts', text: 'Reordering what the business uses up.' },
  hiring: { name: 'Hiring', text: 'The recruiting fee and the first month\'s wage of each hire a manager makes.' },
  contracts: { name: 'Contract bids', text: 'What the work of the tenders a manager bids on would cost to build (the commitment, if the bid wins).' },
  treasury: { name: 'Treasury', text: 'Cash a chief financial officer moves between the parent and this subsidiary (both ways added together).' },
  expansion: { name: 'Expansion', text: 'The price of each asset bought or built from a plan you have approved.' },
};

/** Which kinds of decision a business can have, in the order they are made each day. */
export const KINDS = { arms: ['reorder', 'hire', 'expand', 'transfer'], aerospace: ['reorder', 'hire', 'bid', 'expand', 'transfer'], shipping: ['hire', 'expand', 'transfer'], farming: ['hire', 'expand', 'transfer'] };

/** The plans an owner may approve, by type: where, and what the plan says. Placement is a fixed rule for each. */
export const PLAN_TYPES = {
  arms_station: { business: 'arms', name: 'Arms station in a works', rule: 'The first free cell of the works floor, row by row, with a clear ring around it and power for it. The station comes from the works\'s own order and goes in once it reaches the dock.' },
  farm_plot: { business: 'farming', name: 'Farm plot next to your land', rule: 'The cheapest plot for sale across a lane (up to eight tiles) from a plot you already own.' },
  port: { business: 'shipping', name: 'Port', rule: 'The cheapest port for sale, up to the fleet\'s port limit.' },
  aero_bay: { business: 'aerospace', name: 'Aerospace bay', rule: 'The first free slot in a hall you have already built; never builds a hall.' },
  aero_facility: { business: 'aerospace', name: 'Aerospace facility', rule: 'The named facility, if not already built or under construction.' },
};

export const MGMT = {
  expireDays: 7, // a request left unanswered this long lapses; nothing happens by default
  maxPending: 30,
  logKept: 200,
  hiresPerMonth: 2, // per employer, by managers
  maxOrderQty: 60, // arms: most of one part in one order
  shiftHours: 8, // arms: the par stock of a part is this many hours of the staffed stations using it
  reorderAt: 0.5, // arms: order up to par when stock and what is on order fall below this share of it
  minMove: 1000, // the least a treasury decision moves (no dust)
  maxContracts: 3, // active contracts and bids still open, at most, before a manager bids for more
  plotGap: 8, // tiles between two plots (a lane's width) that still count as next to each other
  hireBand: 30, // days of wage counted with the fee against a hire's limits and the budget
  spentMonths: 3,
};
