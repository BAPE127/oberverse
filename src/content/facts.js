// Fact registry for the knowledge system. Characters know facts only via
// plausible channels (see src/sim/knowledge.js). Fields:
//   text        — how the fact reads in the player's notes
//   importance  — 1..10, drives gossip priority
//   spread      — false = never gossiped
//   aboutPlayer — learner's attitude to the player changes (relImpact; rumors count half)
//   reputation  — applied once, the first time anyone else learns it
//   keywords    — for the "Ask about…" box
export const FACTS = {
  fact_lighthouse_dark: { text: 'The lighthouse on the Point has been dark for eleven years.', importance: 3, keywords: ['lighthouse', 'light', 'point', 'lamp'] },
  fact_osric_sweet_tooth: { text: 'Osric Vane cannot resist a Kettle & Crumb honey bun.', importance: 3, keywords: ['osric', 'honey', 'bun', 'sweet'] },
  fact_osric_has_key: { text: 'The lighthouse key is kept in the top drawer of the Civic Office desk.', importance: 4, spread: false, keywords: ['key', 'desk', 'lighthouse key'] },
  fact_hatch_exists: { text: 'There is a rusted maintenance hatch on the east side of the lighthouse.', importance: 4, keywords: ['hatch', 'maintenance'] },
  fact_keeper_log: { text: 'The last keeper\'s log says the great lens was removed "for safekeeping" the night the light went out — by order of someone signed only "M."', importance: 8, keywords: ['log', 'logbook', 'keeper', 'lens'] },
  fact_lens_missing: { text: 'The lighthouse lens is gone, yet its clockwork has been oiled recently.', importance: 7, keywords: ['lens', 'clockwork', 'gears'] },
  fact_tibbs_lost_spanner: { text: 'Tibbs lost his lucky spanner in Gullwing Park while chasing a gull.', importance: 2, keywords: ['spanner', 'gull'] },
  fact_gulls_organised: { text: 'Some Lanternsiders believe the gulls are organised.', importance: 1, keywords: ['gull', 'gulls', 'birds'] },
  fact_cafe_out_of_buns: { text: 'The Kettle & Crumb has run out of honey buns.', importance: 3, keywords: ['buns', 'cafe'] },
  fact_workshop_bang: { text: 'There was a loud bang at Hollow Fixings.', importance: 4, keywords: ['bang', 'explosion', 'workshop', 'noise'] },
  fact_osric_citation: { text: 'Osric issued Tibbs a formal noise citation.', importance: 4, keywords: ['citation', 'noise', 'complaint'] },
  fact_key_missing: { text: 'The lighthouse key has gone missing from the Civic Office.', importance: 6, keywords: ['key', 'missing', 'theft'] },
  // Facts about the player. relImpact applies to whoever learns them.
  fact_player_trespassed_lighthouse: {
    text: 'The newcomer was seen sneaking into the old lighthouse.', importance: 6, aboutPlayer: true,
    relImpact: { trust: -8, respect: -2 }, reputation: { fac_civic: -6, lanternside: -2 }, keywords: ['trespass'],
  },
  fact_player_stole_from_osric: {
    text: 'The newcomer was seen taking something from Osric\'s desk.', importance: 7, aboutPlayer: true,
    relImpact: { trust: -12, suspicion: 15 }, reputation: { fac_civic: -8, lanternside: -4 }, keywords: ['theft', 'stole'],
  },
  fact_player_suspected_key: {
    text: 'Osric suspects the newcomer took the lighthouse key.', importance: 6, aboutPlayer: true,
    relImpact: { trust: -4, suspicion: 8 }, reputation: { lanternside: -2 }, keywords: ['suspect', 'key'],
  },
  fact_player_helped_tibbs: {
    text: 'The newcomer found Tibbs\'s lucky spanner.', importance: 4, aboutPlayer: true,
    relImpact: { trust: 2, affection: 3 }, reputation: { fac_quay: 6, lanternside: 2 }, keywords: ['spanner', 'helped'],
  },
  fact_player_bribed_osric: {
    text: 'The newcomer tried to bribe Osric Vane. Osric is still talking about it.', importance: 5, aboutPlayer: true,
    relImpact: { respect: -3 }, reputation: { fac_civic: -4 }, keywords: ['bribe'],
  },
  fact_player_reliable_courier: {
    text: 'The newcomer has been running the Kettle & Crumb\'s deliveries.', importance: 3, aboutPlayer: true,
    relImpact: { trust: 2, respect: 1 }, reputation: { fac_merchants: 3 }, keywords: ['delivery', 'courier'],
  },
};
