// Late-bound hooks between the engagement code and the strategic layer (v0.103.0), so neither imports the other (the bundler joins modules in order and a cycle would break it).
// src/war/strategic.js fills these in when it loads; src/war/engagements.js calls them if they are there.
export const hooks = { strategicResolved: null, strategicWithdrawn: null };
