// What managers may decide on their own (v0.63.0). Data only: src/corp/management.js judges a decision against it,
// src/systems/management.js carries decisions out through the businesses' own services.

/** The decisions a job may make, and where. Anything not listed decides nothing. */
export const DECIDES = {
  procurement_mgr: { reorder: ['arms', 'aerospace'] },
  manufacturing_mgr: { reorder: ['arms'] },
  aero_ops_mgr: { reorder: ['aerospace'] },
  gm: { reorder: ['arms', 'aerospace'], hire: ['arms', 'shipping', 'aerospace', 'farming'] },
  hrd: { hire: ['arms', 'shipping', 'aerospace', 'farming'] }, // the parent's HR director hires for its subsidiaries
};

/** What a monthly budget can be set for. A budget is an authorisation to spend, never money. */
export const CATEGORIES = {
  materials: { name: 'Materials and parts', text: 'Reordering what the business uses up.' },
  hiring: { name: 'Hiring', text: 'The recruiting fee and the first month\'s wage of each hire a manager makes.' },
};

export const MGMT = {
  expireDays: 7, // a request left unanswered this long lapses; nothing happens by default
  maxPending: 30,
  logKept: 200,
  hiresPerMonth: 2, // per employer, by managers
  maxOrderQty: 60, // arms: most of one part in one order
  shiftHours: 8, // arms: the par stock of a part is this many hours of the staffed stations using it
  reorderAt: 0.5, // arms: order up to par when stock and what is on order fall below this share of it
  hireBand: 30, // days of wage counted with the fee against a hire's limits and the budget
  spentMonths: 3,
};
