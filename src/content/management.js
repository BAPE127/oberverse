// What managers may decide on their own (v0.63.0, simplified in v0.89.0). Data only: src/corp/management.js judges a decision against it,
// src/systems/management.js carries decisions out through the businesses' own services. Which things a person may do is ticked on the
// person (src/content/personnel.js lists the boxes); here is only where each kind of decision applies and how it is bounded.

/** Which kinds of decision a business can have, in the order they are made each day. 'transfer' is the group manager's, for subsidiaries. */
export const KINDS = { arms: ['reorder', 'research', 'expand', 'transfer'], aerospace: ['reorder', 'bid', 'research', 'expand', 'transfer'], shipping: ['expand', 'transfer'], farming: ['expand', 'transfer'] };

export const MGMT = {
  expireDays: 7, // a request left unanswered this long lapses; nothing happens by default
  maxPending: 30,
  logKept: 200,
  maxOrderQty: 60, // arms: most of one part in one order
  shiftHours: 8, // arms: the par stock of a part is this many hours of the staffed stations using it
  reorderAt: 0.5, // arms: order up to par when stock and what is on order fall below this share of it
  minMove: 1000, // the least a treasury decision moves (no dust)
  maxContracts: 3, // active contracts and bids still open, at most, before a manager bids for more
  bidMargin: 15, // percent over cost a manager bids at (a bid the customer's ceiling forces lower is asked about)
  plotGap: 8, // tiles between two plots (a lane's width) that still count as next to each other
  spentMonths: 3,
  // v0.76.0: how managers answer a war's effect on what they buy (the cost index of the business's sector above 1)
  costHold: 0.02, // up this much: managers hold back expansion to keep cash (supplies go on)
};
