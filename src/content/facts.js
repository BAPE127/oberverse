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
  // Ober's Oil and Sir Moneybucks
  fact_moneybucks_owns_oil: { text: 'Sir Richard E. Moneybucks, Esq. owns Ober\'s Oil — the refinery, the fields and most of the people in them.', importance: 3, keywords: ['moneybucks', 'oil', 'ober', 'refinery'] },
  fact_harbourmaster_seal: { secretOf: 'npc_moneybucks', text: 'The "old seal" on the lighthouse order belonged to the Harbourmaster\'s office, abolished a year before the letter was written.', importance: 7, keywords: ['seal', 'harbourmaster', 'harbormaster'] },
  fact_moneybucks_bought_seal: { text: 'Ober\'s Oil bought "Lot 14: Harbourmaster\'s seal & effects" at the dissolution auction twelve years ago.', importance: 9, spread: false, keywords: ['lot 14', 'auction', 'seal', 'ledger'] },
  fact_night_tankers: { secretOf: 'npc_moneybucks', text: 'Years ago, Ober\'s Oil tankers crossed the bay at night with their lights off — "when the lighthouse wasn\'t looking".', importance: 6, keywords: ['tanker', 'tankers', 'night', 'bay'] },
  fact_lens_in_vault: { text: 'The lighthouse\'s great lens sits in the vault in Sir Moneybucks\'s study.', importance: 10, spread: false, keywords: ['lens', 'vault'] },
  fact_shard_matches: { text: 'Delphine says the humming lens shard resonates with something large nearby — "in the manor, if I had to guess".', importance: 7, keywords: ['shard', 'resonate', 'hum'] },
  fact_workers_grievances: { text: 'The refinery workers are owed back pay and work double shifts for company scrip.', importance: 4, keywords: ['wages', 'pay', 'scrip', 'workers'] },
  fact_otto_organizing: { text: 'Otto Brandt is quietly organising the refinery workers.', importance: 5, secretOf: 'npc_otto', keywords: ['union', 'organising', 'organizing', 'otto'] },
  fact_refinery_accident: { text: 'There was an accident at the Ober\'s Oil refinery.', importance: 6, keywords: ['accident', 'refinery'] },
  fact_refinery_strike: { text: 'The Ober\'s Oil workers are on strike.', importance: 7, keywords: ['strike', 'picket'] },
  fact_strike_broken: { text: 'Sir Moneybucks had Silas break the refinery strike.', importance: 6, keywords: ['strike', 'broken'] },
  fact_buyout_offer: { text: 'Sir Moneybucks tried to buy the Kettle & Crumb out from under Mags.', importance: 5, keywords: ['buyout', 'buy', 'cafe'] },
  fact_canal_slick: { text: 'There\'s an oily slick on the Lantern Canal, and it smells like Ober\'s Oil.', importance: 6, keywords: ['slick', 'canal', 'oil'] },
  fact_mabel_mags_feud: { text: 'Mabel Quince and Mags Pell have been feuding over a baking competition for nine years.', importance: 2, keywords: ['mabel', 'feud', 'baking'] },
  fact_crisp_insult_ledger: { text: 'Bartholomew Crisp keeps a ledger of every insult Sir Moneybucks has ever paid him.', importance: 4, secretOf: 'npc_crisp', keywords: ['crisp', 'butler', 'insult'] },
  fact_lighthouse_relit: { text: 'The lighthouse on the Point is shining again.', importance: 8, keywords: ['lighthouse', 'relit', 'light'] },
  // Facts about the player. relImpact applies to whoever learns them.
  fact_player_invested: {
    text: 'The newcomer has bought shares in Ober\'s Oil.', importance: 4, aboutPlayer: true,
    relImpact: {}, reputation: { fac_oil: 3 }, keywords: ['shares', 'invested'],
  },
  fact_masons_os: { text: 'Mason\'s Os ("That\'s O plural!") is Mason Nails\'s construction company in Westbrook. His crew — Dee, Barnaby and Quinn — live at the Plumb Line Apartments.', importance: 2, keywords: ['mason', 'construction', 'builder', 'westbrook'] },
  fact_moneybucks_wants_mason: { text: 'Sir Moneybucks tried to hire Mason\'s Os exclusively. Mason refused: "I don\'t take sides — I take measurements."', importance: 4, keywords: ['mason', 'moneybucks', 'exclusive'] },
  fact_dee_pun_tally: { text: 'Dee secretly keeps a tally of every Mason pun that made her laugh (212 and counting).', importance: 3, spread: false, keywords: ['dee', 'tally', 'puns'] },
  fact_gull_feud: { text: 'Barnaby Cole and Tibbs Hollow are feuding over a gull named Margaret, who stole Tibbs\'s sandwich.', importance: 3, keywords: ['gull', 'margaret', 'barnaby', 'tibbs'] },
  fact_player_rushed_site: {
    text: 'The newcomer rushed a job on the Mason\'s Os site.', importance: 2, aboutPlayer: true,
    relImpact: { respect: -1 }, reputation: {}, keywords: ['rushed'],
  },
  fact_player_punned_mason: {
    text: 'The newcomer out-punned Mason Nails.', importance: 3, aboutPlayer: true,
    relImpact: { affection: 2 }, reputation: { lanternside: 1 }, keywords: ['pun'],
  },
  fact_player_assault: {
    text: 'The newcomer attacked someone — in cold blood, in public.', importance: 8, aboutPlayer: true,
    relImpact: { trust: -12, affection: -10, suspicion: 18 }, reputation: { lanternside: -6 }, keywords: ['attack', 'fight', 'assault', 'violence'],
  },
  fact_sums_of_anarchy: {
    text: 'The Sums of Anarchy run calculators out of the Sumps. Arthur Anderson is in charge, and he is always angry.', importance: 5,
    keywords: ['sums', 'anarchy', 'gang', 'arthur', 'calculators', 'abacus'],
  },
  fact_player_dealing: {
    text: 'The newcomer has been dealing calculators.', importance: 6, aboutPlayer: true,
    relImpact: { trust: -5, suspicion: 15 }, keywords: ['dealing', 'calculators', 'selling'],
  },
  fact_player_stole_customer: {
    text: 'The newcomer is selling calculators to the Sums of Anarchy\'s customers.', importance: 7, aboutPlayer: true,
    keywords: ['customers', 'stealing', 'turf'],
  },
  fact_player_explosion: {
    text: 'The newcomer set off explosives in the street.', importance: 10, aboutPlayer: true,
    relImpact: { trust: -25, affection: -15, suspicion: 40 }, reputation: { lanternside: -15 }, keywords: ['explosion', 'rocket', 'missile', 'bomb', 'drone'],
  },
  fact_player_smitten: {
    text: 'The newcomer raised a hand against one of the untouchable — and was struck down by lightning out of a clear sky.', importance: 9,
    keywords: ['lightning', 'smite', 'struck', 'runes', 'wrath'],
  },
  fact_player_murder: {
    text: 'The newcomer killed someone.', importance: 10, aboutPlayer: true,
    relImpact: { trust: -35, affection: -30, suspicion: 40 }, reputation: { lanternside: -25 }, keywords: ['murder', 'killed', 'dead', 'body'],
  },
  fact_player_cut_corners: {
    text: 'The newcomer cut corners on a refinery shift.', importance: 4, aboutPlayer: true,
    relImpact: { respect: -2 }, reputation: {}, keywords: ['corners'],
  },
  fact_player_backed_strike: {
    text: 'The newcomer gave money to the refinery strike fund.', importance: 6, aboutPlayer: true,
    relImpact: {}, reputation: { fac_quay: 5, fac_oil: -8 }, keywords: ['strike fund'],
  },
  fact_player_broke_strike: {
    text: 'The newcomer helped Sir Moneybucks break the strike.', importance: 7, aboutPlayer: true,
    relImpact: {}, reputation: { fac_quay: -10, fac_oil: 8, lanternside: -3 }, keywords: ['strike'],
  },
  fact_player_exposed_moneybucks: {
    text: 'The newcomer proved Sir Moneybucks darkened the lighthouse.', importance: 9, aboutPlayer: true,
    relImpact: {}, reputation: { lanternside: 10, fac_civic: 8, fac_oil: -30 }, keywords: ['exposed'],
  },
  fact_player_stole_lens: {
    text: 'Someone took the great lens from Sir Moneybucks\'s vault.', importance: 9, aboutPlayer: true,
    relImpact: {}, reputation: {}, keywords: ['vault', 'theft'],
  },
  fact_player_won_ledger: {
    text: 'The newcomer beat Sir Moneybucks at the Ledger.', importance: 5, aboutPlayer: true,
    relImpact: { respect: 3 }, reputation: { fac_oil: 2 }, keywords: ['ledger', 'cards'],
  },
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
