// PROPOSAL DATA (not game code): the Oberverse world atlas for the war update — countries, states, cities, military sites and free territories,
// laid on the real coastlines (src/world/geography.js) with Sund redrawn down to the Halvermouth island.
//
// Each state: id, name, seed [lat, lon] (where its heart is), optional `w` (weight: a larger state), `biome` (force the main climate), `wet` (-1 dry … +1 wet),
// and its places. Place codes: c capital · t city/town · p port · a airfield · b base · f fort/pass · m mine/oil/resource · r research/industry.
// `tag` is a one-line feel for the mock-up's legend and the war design (what the state is for).
//
// Sund's government is NOT in a state called "Sund": Sund is the whole kingdom; Halvermouth is the national capital (the boy king lives in Kingsfjord).

export const COUNTRIES = {
  sund: { name: 'Kingdom of Sund', color: '#9ae87a', gov: 'Constitutional monarchy: the boy king (11) is head of state; an elected President governs', capital: 'Halvermouth', royal: 'Kingsfjord', pop: 'about 9 million' },
  ostmark: { name: 'The Ostmark Union', color: '#7aa8e8', gov: 'Federal union of seven provinces, one parliament', capital: 'Hartmannsburg', pop: 'about 60 million' },
  varn: { name: 'Varnistan', color: '#e8a24a', gov: 'Mountain republic, permanently about to hold elections', capital: 'Daghan', pop: 'about 22 million' },
  teshvar: { name: 'Teshvar', color: '#e8d84a', gov: 'Oil sheikdom of five emirates under one sheikh', capital: 'Sarkhan', pop: 'about 14 million' },
  caldera: { name: 'Republic of Caldera', color: '#e86a5a', gov: 'Volcanic republic; presidents come and go with the ash', capital: 'Calderon', pop: 'about 35 million' },
  pallas: { name: 'Free State of Pallas', color: '#d87ae8', gov: 'A free state of three coasts; under embargo', capital: 'Thessal', pop: 'about 6 million' },
  morrow: { name: 'Morrow Isles', color: '#4ad8c8', gov: 'League of two hundred islands, each with a navy', capital: 'Morrow Town', pop: 'about 8 million' },
  lirre: { name: 'Grand Duchy of Lirre', color: '#c8c8e8', gov: 'Armed neutral duchy of six cantons', capital: 'Lirre', pop: 'about 12 million' },
  westreach: { name: 'Westreach League', color: '#e8a0c8', gov: 'A league of free ports on the far western coast; each port keeps its own harbour master', capital: 'Westreach', pop: 'about 3 million' },
  sunmouth: { name: 'Sunmouth Isthmus Compact', color: '#c8e84a', gov: 'A compact of canal towns around the equatorial megaport; everything is licensed and nothing is finished', capital: 'Sunmouth', pop: 'about 5 million' },
  dunmere: { name: 'Free Harbour of Dunmere', color: '#e8c8a0', gov: 'A crossroads harbour republic: everybody passes through and nobody admits to staying', capital: 'Dunmere', pop: 'about 1 million' },
  free: { name: 'Free Territories', color: '#8a8f99', gov: 'Free ports, leagues, clans and nobody-in-particular: no embassy, no army, plenty of contracts', capital: null, pop: 'scattered' },
};

const S = (country, id, name, seed, o = {}) => ({ country, id, name, seed, w: 1, ...o });

export const STATES = [
  // ------------------------------------------------------------------ SUND (capital Halvermouth) ---------
  S('sund', 'sd_crown', 'Halvermouth Crown District', [48.8, -26.3], { w: 0.9, tag: 'The capital: the city, the Crown Quarter, the Yards, the docks, Lanternside', places: ['Halvermouth|49,-26.7|c', 'Lanternside|48,-24.6|p', 'Westbrook|49,-27.9|t', 'Mill Road Docks|49.2,-26.4|p', 'Ober Fields|48,-23.2|m'] }),
  S('sund', 'sd_lariat', 'Lariat Downs', [51.3, -26.8], { w: 0.8, wet: 0.2, tag: 'Farm country, Starling Flats aerospace park', places: ['Lariat|51,-26.5|t', 'Starling Flats|50.4,-25.3|r', 'Chuckie\'s Mills|51.8,-27.8|t'] }),
  S('sund', 'sd_gullwing', 'Gullwing Coast', [46.4, -23.2], { w: 0.7, tag: 'Southern headland and fishing coast', places: ['Gullwing Point|47,-22|p', 'Southmere|45.9,-23.4|t'] }),
  S('sund', 'sd_hald', 'Hald Reach', [52.2, -16.5], { w: 1.1, wet: 0.3, tag: 'The narrow neck of land joining the capital to the north: rail, fog, and the national base', places: ['Haldwick|52.4,-17.6|t', 'Brine End|51.8,-12.5|p', 'Fort Gullcrest|52.6,-21.5|b'] }),
  S('sund', 'sd_gull_isles', 'Thornmonth Isle', [55.8, -32.0], { w: 0.4, tag: 'A rock off the capital with a lighthouse and a reputation', places: ['Thornmonth|55.6,-32.2|t'] }),
  S('sund', 'sd_sundholm', 'Sundholm', [54.8, -6.5], { w: 0.9, tag: 'Royal Sund: the harbour, the royal yacht, the fleet', places: ['Sund Harbour|53.5,-4|p', 'Sundholm|55,-7.5|t', 'Royal Sund Naval Station|54.4,-5|b'] }),
  S('sund', 'sd_fjords', 'Middle Fjords', [62, -11.5], { w: 1.2, biome: 'taiga', tag: 'Fjord towns and herring', places: ['Fjell|61,-12|t', 'Norrby|63.5,-11.5|p', 'Lindqvist|60,-10|t'] }),
  S('sund', 'sd_skarn', 'Skarn Highlands', [67, -9.5], { w: 1.0, biome: 'mountain', tag: 'Granite, mines and the old pass', places: ['Skarn|67,-9.5|m', 'Vik|68.5,-8|t'] }),
  S('sund', 'sd_kings', 'Kingsfjord', [71.8, -5.5], { w: 0.8, biome: 'tundra', tag: 'The boy king\'s castle; the fishing fleet reviewed every Monday', places: ['Kingsfjord|72.5,-4.5|p', 'Kingsfjord Castle|71.4,-5.8|f'] }),

  // ------------------------------------------------------------------ OSTMARK (seven provinces) ----------
  S('ostmark', 'os_west', 'Westmark', [51.6, 3.5], { w: 0.7, wet: 0.3, tag: 'Gate province: the great port, seven colours of crane', places: ['Ostmark Gate|51.5,1.5|p', 'Brandtburg|52.4,5.5|t'] }),
  S('ostmark', 'os_brandt', 'Brandtland', [53.6, 10.5], { w: 0.9, tag: 'Industry belt: Brandt turbines and canals', places: ['Brandt|54,10|r', 'Kessel|52.6,12.5|t'] }),
  S('ostmark', 'os_hart', 'Hartmann March', [54.6, 18], { w: 1.0, tag: 'Federal province and the capital', places: ['Hartmannsburg|54.6,18.4|c', 'Falkenau|53.4,16.5|t'] }),
  S('ostmark', 'os_kessler', 'Kesslerau', [50.8, 25], { w: 0.9, tag: 'Steel and the arms works', places: ['Kessler Works|50.6,25.4|r', 'Rheinbrück|51.6,21.8|t'] }),
  S('ostmark', 'os_rhein', 'Rheinholt', [57.8, 22.5], { w: 1.0, biome: 'taiga', tag: 'Forest province: timber and paper', places: ['Rheinholt|57.4,22|t', 'Falken Pass|55.8,27|f'] }),
  S('ostmark', 'os_falken', 'Falkenmark', [50.2, 31.5], { w: 0.9, tag: 'The southern marches: the Halden shore and the Varn frontier', places: ['Halden Roads|50,32|p', 'Falkenhorst Air Base|50.6,28.2|b'] }),
  S('ostmark', 'os_seventh', 'Seventh Province', [63.5, 38], { w: 1.1, biome: 'taiga', tag: 'Grey ships, grey sheds, the northern fleet', places: ['Seventh Province Naval Yard|63,37|b', 'Grey Harbour|65,40|p'] }),

  // ------------------------------------------------------------------ VARNISTAN ------------------------
  S('varn', 'vr_coast', 'Port Varn Coast', [44.5, 44], { w: 0.8, tag: 'The only real port; election posters nineteen years old', places: ['Port Varn|44,42.5|p', 'Salt Landing|45.6,46|t'] }),
  S('varn', 'vr_orlov', 'Orlov Highlands', [42, 51], { w: 1.0, biome: 'mountain', tag: 'Passes, shepherds and old rifles', places: ['Orlov|42,50|t', 'Ironmark Pass|40.5,53|f'] }),
  S('varn', 'vr_daghan', 'Daghan District', [38, 52], { w: 0.9, biome: 'steppe', tag: 'The capital district: barracks and a parliament building under repair', places: ['Daghan|38,52|c', 'Tashkar|36.5,52|t'] }),
  S('varn', 'vr_ironmark', 'Ironmark Plateau', [42, 60], { w: 1.1, biome: 'steppe', tag: 'Open plateau: armour country and mines', places: ['Ironmark|41.5,60|m', 'Varn Forge|44,64|r'] }),
  S('varn', 'vr_kestrel', 'Kestrel Reaches', [34.5, 59.5], { w: 0.9, biome: 'mountain', tag: 'The pass to the gulf; a small military-ish harbour', places: ['Kestrel Landing|34,64|p', 'Kestrel Pass|35.5,61|f'] }),

  // ------------------------------------------------------------------ TESHVAR (five emirates) -----------
  S('teshvar', 'ts_khoral', 'Khoral Emirate', [37, 74], { w: 1.1, biome: 'desert', tag: 'Dune country and the northern oil road', places: ['Khoral|36.5,75|t', 'Oasis Nine|38,72|m'] }),
  S('teshvar', 'ts_zhan', 'Zhan Oil Coast', [30, 83], { w: 1.0, biome: 'desert', tag: 'Tankers the size of towns', places: ['Teshvar Oil Terminal|28,82|p', 'Zhan Wells|31,84|m'] }),
  S('teshvar', 'ts_sarkhan', 'Sarkhan', [27, 94], { w: 0.9, biome: 'desert', tag: 'The sheikh\'s city', places: ['Sarkhan|27.5,94.5|c', 'Golden Guard Air Base|26,90|b'] }),
  S('teshvar', 'ts_orun', 'Orun Emirate', [22, 99], { w: 0.8, biome: 'savanna', tag: 'Dry hills and the eastern wells', places: ['Orun|22.5,98.6|t'] }),
  S('teshvar', 'ts_baidun', 'Bai-Dun Golden Coast', [17, 102.5], { w: 0.7, biome: 'savanna', tag: 'Gold-leaf bollards and the advanced port', places: ['Golden Quay|17,103|p', 'Bai-Dun|18.2,102|t'] }),

  // ------------------------------------------------------------------ CALDERA --------------------------
  S('caldera', 'cd_crater', 'Crater Province', [-7.5, 34], { w: 1.0, biome: 'volcanic', tag: 'Built on a volcano; the capital is a cone', places: ['Calderon|-8,34|c', 'Ember Gap|-5,36|f'] }),
  S('caldera', 'cd_bay', 'Caldera Bay Coast', [-3, 43], { w: 0.8, biome: 'savanna', tag: 'The warm, suspiciously warm, harbour', places: ['Caldera Bay|-3,44|p', 'Salto|-5.5,40|t'] }),
  S('caldera', 'cd_mesa', 'Northern Mesa', [7, 30], { w: 1.1, biome: 'savanna', tag: 'Plateau farms and the Verdan highlands', places: ['Mesa Verdan|7,31|t', 'Corvane|10,25|t'] }),
  S('caldera', 'cd_horn', 'The Horn', [9.5, 44.5], { w: 0.8, biome: 'desert', tag: 'The long eastern horn; a naval post on a baked headland', places: ['Horn Landing|9.5,48|p', 'Horn Naval Post|9.8,45|b'] }),
  S('caldera', 'cd_ash', 'Ashport Coast', [-16.5, 27], { w: 0.9, biome: 'volcanic', tag: 'Everything is grey, including the tea', places: ['Ashport|-17.5,25|p', 'Greyfield|-14,30|t'] }),
  S('caldera', 'cd_salt', 'Saltlands', [-27, 27], { w: 1.1, biome: 'desert', tag: 'Salt flats and the southern railway', places: ['Saltmarch|-25,28|m', 'Southcape|-34,22|p'] }),

  // ------------------------------------------------------------------ PALLAS ---------------------------
  S('pallas', 'pl_harbour', 'Free Harbour Coast', [15, -30.5], { w: 0.7, biome: 'jungle', tag: 'Several flags, one crane, many questions', places: ['Pallas Free Harbour|15,-27|p', 'Aegir|16,-31.5|t'] }),
  S('pallas', 'pl_mid', 'Pallas Midlands', [9.5, -35.5], { w: 0.8, biome: 'jungle', tag: 'Hills, coffee and the seat of government', places: ['Thessal|10,-35|c', 'Ionis|7.5,-36.5|t'] }),
  S('pallas', 'pl_coup', 'Coup Cove', [2, -39], { w: 0.7, biome: 'jungle', tag: 'Named after the last government. And the one before.', places: ['Coup Cove|1,-39|p', 'Krios|3.5,-38|t'] }),

  // ------------------------------------------------------------------ MORROW ISLES ---------------------
  S('morrow', 'mr_main', 'Main Isle', [-32, 148], { w: 0.9, biome: 'jungle', tag: 'Morrow Town and the League chamber (two hundred chairs)', places: ['Morrow Town|-32,148|c', 'Palmer|-30,146|t'] }),
  S('morrow', 'mr_west', 'Western Harbour', [-30, 137.5], { w: 0.8, biome: 'jungle', tag: 'The one big harbour and one very tired harbour master', places: ['Morrow Main Harbour|-31,137|p'] }),
  S('morrow', 'mr_navies', 'Isle of Navies', [-39, 159], { w: 0.8, biome: 'jungle', tag: 'Every island\'s navy moors here', places: ['Isle of Navies|-39,159.5|b'] }),
  S('morrow', 'mr_reef', 'Reef Islands', [-24.5, 156], { w: 0.9, biome: 'jungle', tag: 'Turquoise water and a smuggling museum', places: ['Reef Town|-24.5,156.5|p', 'Coralline|-26,155|t'] }),
  S('morrow', 'mr_tides', 'Southern Tides', [-41, 150.5], { w: 1.0, biome: 'jungle', tag: 'Kauri islands and the outer fishing fleets', places: ['Kauri|-41,150|t', 'Tideline|-35,153|t'] }),

  // ------------------------------------------------------------------ LIRRE ----------------------------
  S('lirre', 'lr_heart', 'Lirre Canton', [45, -71], { w: 0.9, tag: 'The ducal seat and the museum of neutrality', places: ['Lirre|46,-72|c', 'Montclair|43,-75|t'] }),
  S('lirre', 'lr_south', 'Port Canton', [36, -78], { w: 0.9, tag: 'Neutral waters, neutral harbourmaster, neutral coffee', places: ['Port Lirre|34,-76.5|p', 'Valmont|38,-83|t'] }),
  S('lirre', 'lr_aubrac', 'Aubrac Hills', [41, -92], { w: 1.1, wet: 0.2, tag: 'Hill farms; the cheese border', places: ['Aubrac|40,-91|t', 'Cheddarmouth|42,-96|t'] }),
  S('lirre', 'lr_lorrain', 'Lorrain Marches', [52, -78], { w: 1.2, biome: 'taiga', tag: 'Forest cantons on the northern border', places: ['Lorrain|52,-78|t', 'Duke\'s Watch|49,-68|f'] }),
  S('lirre', 'lr_duchess', 'Duchess Coast', [57, -67], { w: 0.8, biome: 'taiga', tag: 'A pretty harbour with a museum about customs', places: ['Duchess Bay|57,-65.5|p', 'Customs Museum|57.6,-68|t'] }),
  S('lirre', 'lr_west', 'Valley Canton', [45, -100], { w: 1.2, tag: 'Wide valleys: the armed-neutral reserve', places: ['Fairvale|45,-100|t', 'Neutral Watch|46.5,-104|b'] }),

  // ------------------------------------------------------------------ FREE TERRITORIES ----------------
  S('free', 'fr_coldwater', 'Coldwater Cape', [41, -164], { w: 0.9, biome: 'tundra', tag: 'Icebergs in summer; the harbour cat has a coat', places: ['Coldwater|40,-165|p'] }),
  S('westreach', 'wr_coast', 'Westreach Free Coast', [35, -143], { w: 1.0, tag: 'A league of free ports; everything costs more', places: ['Westreach|33,-147.5|c', 'Brass Mile|36,-140|t'] }),
  S('free', 'fr_greyfen', 'Greyfen Marches', [57, -150], { w: 1.4, biome: 'taiga', tag: 'Fen, fog and fur; contracts for anyone who can read a map', places: ['Greyfen|57,-150|t', 'Oldhall|60,-162|t'] }),
  S('free', 'fr_prairie', 'High Prairies', [46, -116], { w: 1.4, biome: 'steppe', tag: 'Open ranch country; a compact of towns', places: ['Broadacre|46,-116|t', 'Harrow Cross|43,-108|t'] }),
  S('free', 'fr_mere', 'Mere Counties', [54, -90], { w: 1.2, biome: 'taiga', tag: 'Lakes and logging', places: ['Meremouth|54,-90|t'] }),
  S('free', 'fr_redrock', 'Redrock Flats', [30, -113], { w: 1.0, biome: 'desert', tag: 'Desert country on the way to the isthmus', places: ['Redrock|30,-113|m'] }),
  S('sunmouth', 'sm_isthmus', 'Sunmouth Isthmus', [12, -121], { w: 1.0, biome: 'jungle', tag: 'The equatorial megaport and the canal that is always almost finished', places: ['Sunmouth|12,-124|c', 'Isthmus Gate|7,-112|t'] }),
  S('free', 'fr_equator', 'Equator Coast', [-3, -102], { w: 1.0, biome: 'jungle', tag: 'Banana republic-in-waiting; the shipping lanes\' southern door', places: ['Quito Bay|-3,-102|t'] }),
  S('free', 'fr_cordillera', 'Great Cordillera', [-13, -97], { w: 1.2, biome: 'mountain', tag: 'The long range down the west of the continent', places: ['High Pass|-12,-97|f'] }),
  S('free', 'fr_saltpan', 'Saltpan Coast', [-25, -96], { w: 1.0, biome: 'desert', tag: 'Dry coast and nitrate mines', places: ['Saltpan|-24,-95|m'] }),
  S('free', 'fr_marrow', 'Marrow Strait', [-22, -133.5], { w: 0.4, biome: 'savanna', tag: 'One island and a lighthouse keeper who charges by the look', places: ['Marrow Strait|-21.5,-133.5|p'] }),
  S('free', 'fr_capelow', 'Cape Low', [-37, -92], { w: 1.0, tag: 'The bottom of the continent: storms, ropes and stories', places: ['Cape Low|-36.5,-96|p'] }),
  S('free', 'fr_greyhook', 'Greyhook Fjords', [-46, -75], { w: 1.2, biome: 'tundra', tag: 'A cold quiet anchorage nobody admits to owning', places: ['Greyhook|-48,-71.5|b'] }),
  S('free', 'fr_oldmoor', 'Oldmoor Coast', [63, -62], { w: 0.9, biome: 'tundra', tag: 'Fog-bound; every boat is called Mary', places: ['Oldmoor|63.5,-62|p'] }),
  S('free', 'fr_frostbay', 'Frostbay', [75, -98], { w: 1.4, biome: 'ice', tag: 'Open three months a year', places: ['Frostbay|76,-104|p'] }),
  S('free', 'fr_ice_teeth', 'Ice Teeth', [72, -52], { w: 2.0, biome: 'tundra', tag: 'Rocks and seals', places: [] }),
  S('free', 'fr_greenmoor', 'Greenmoor', [77, -30], { w: 1.6, biome: 'ice', tag: 'An arctic island; the northern edge of the sea lanes', places: ['Greenmoor|77,-30|t'] }),
  S('dunmere', 'dm_island', 'Dunmere', [20, -6.5], { w: 1.4, biome: 'savanna', tag: 'The crossroads harbour: everybody passes through', places: ['Dunmere|20.5,-6.5|c'] }),
  S('free', 'fr_windfen', 'Windfen Plains', [62, 58], { w: 1.6, biome: 'taiga', tag: 'The northern plains\' west: fen and railway', places: ['Windfen|62,57|t'] }),
  S('free', 'fr_hollow', 'Hollow Steppe', [58, 82], { w: 1.8, biome: 'steppe', tag: 'The great grass: clans, herds and caravans', places: ['Hollow Well|57,82|t', 'Caravan Cross|55,70|t'] }),
  S('free', 'fr_yellow', 'Yellowfen', [56, 104], { w: 1.4, biome: 'steppe', tag: 'Marsh and river towns', places: ['Yellowfen|56,104|t'] }),
  S('free', 'fr_eastwatch', 'Eastwatch Coast', [58, 126], { w: 1.4, biome: 'taiga', tag: 'The northern route\'s last stop before the ice', places: ['Eastwatch|60.5,131.5|p'] }),
  S('free', 'fr_far_east', 'Far East Peninsula', [43, 129], { w: 1.0, tag: 'A long peninsula pointing at nothing in particular', places: ['Far Light|40,131|p'] }),
  S('free', 'fr_basin', 'Dustmark Basin', [44, 91], { w: 1.8, biome: 'desert', tag: 'The great dry basin between Teshvar and the steppe', places: ['Dustmark|44,90|t'] }),
  S('free', 'fr_cinder', 'Cinder Hills', [34, 108], { w: 1.2, biome: 'mountain', tag: 'Old volcanoes, new mines', places: ['Cinder Mine|34,108|m'] }),
  S('free', 'fr_barrens', 'Frost Barrens', [73, 90], { w: 2.5, biome: 'ice', tag: 'Arctic island; empty, which is its point', places: [] }),
  S('free', 'fr_coral', 'Coral Coast', [-26, 126], { w: 1.8, biome: 'savanna', tag: 'The south-eastern continent: coral on one side, dust on the other', places: ['Coral Sound|-36,116.5|p', 'Redland|-26,128|t', 'Bluewater|-30,124|t'] }),
  S('free', 'fr_interior', 'Southeastern Outback', [-30, 133], { w: 1.2, biome: 'desert', tag: 'Red interior; mining and long straight roads', places: ['Outback Junction|-29,134|m'] }),
  S('free', 'fr_meridian', 'Meridian Free Zone', [-19, 63.5], { w: 1.5, biome: 'savanna', tag: 'A gleaming free port on the meridian line; dock robots with union representation', places: ['Meridian Free Port|-19,63|p', 'Applied Sciences|-16,63|r'] }),
  S('free', 'fr_southwind', 'Southwind Isle', [-53, -5], { w: 2.0, biome: 'ice', tag: 'A rock, a hut, a pier. The pier is new.', places: ['Southwind|-52,-5|p'] }),
  S('free', 'fr_southern_ice', 'Southern Ice', [-80, 0], { w: 40, biome: 'ice', tag: 'The polar continent: nobody lives here, which does not stop people claiming it', places: [] }),
];

// Military sites that already exist in the arms-market/port content or that the war update would add to the world map. kind: army | air | naval | fort | hq
export const MIL = [
  ['Fort Gullcrest (national base)', 52.6, -21.5, 'sund', 'hq'],
  ['Royal Sund Naval Station', 54.4, -5, 'sund', 'naval'],
  ['Kingsfjord Coastal Battery', 71.8, -6.5, 'sund', 'fort'],
  ['Seventh Province Naval Yard', 63, 37, 'ostmark', 'naval'],
  ['Falkenhorst Air Base', 50.6, 28.2, 'ostmark', 'air'],
  ['Hartmann Armoured Depot', 54, 20, 'ostmark', 'army'],
  ['Kestrel Pass Fortress', 35.5, 61, 'varn', 'fort'],
  ['Daghan Barracks', 38.5, 53, 'varn', 'army'],
  ['Golden Guard Air Base', 26, 90, 'teshvar', 'air'],
  ['Oil Terminal Garrison', 29, 83, 'teshvar', 'army'],
  ['Crater Command', -7, 35, 'caldera', 'hq'],
  ['Horn Naval Post', 9.8, 45, 'caldera', 'naval'],
  ['Coup Cove Garrison', 2, -38.5, 'pallas', 'army'],
  ['Isle of Navies', -39, 159.5, 'morrow', 'naval'],
  ['Neutral Watch', 46.5, -104, 'lirre', 'fort'],
  ['Duke\'s Watch', 49, -68, 'lirre', 'fort'],
  ['Greyhook anchorage', -48, -71.5, 'free', 'naval'],
];

// The strategic theatres the war update would use: each is a group of states where two rivals meet (the arms market's own rivalries).
export const THEATRES = [
  { id: 'th_halden', name: 'The Halden Front', between: ['ostmark', 'varn'], kind: 'land', states: ['os_falken', 'vr_coast', 'vr_orlov'], note: 'The one big land front: the Halden shore road and the Falken marches.' },
  { id: 'th_northern', name: 'The Northern Sea', between: ['ostmark', 'sund'], kind: 'sea + air + landing', states: ['os_west', 'os_seventh', 'sd_sundholm', 'sd_hald'], note: 'Ostmark\'s northern fleet against Sund\'s coast; landings on the Hald Reach.' },
  { id: 'th_kestrel', name: 'The Kestrel Theatre', between: ['varn', 'teshvar'], kind: 'mountain + desert', states: ['vr_kestrel', 'ts_khoral', 'ts_zhan'], note: 'The pass and the gulf: no armies yet, but every oil convoy passes it.' },
  { id: 'th_rift', name: 'The Rift', between: ['varn', 'caldera'], kind: 'sea + landing', states: ['vr_daghan', 'cd_horn', 'cd_bay'], note: 'Across the southern sea: landings, volcanoes and the Horn.' },
  { id: 'th_atlantic', name: 'The Grey Ocean', between: ['caldera', 'pallas', 'lirre'], kind: 'sea + air', states: ['cd_ash', 'pl_harbour', 'lr_south'], note: 'Long-range: convoys, blockade and the Pallas embargo.' },
  { id: 'th_oilbelt', name: 'The Oil Belt', between: ['teshvar', 'morrow'], kind: 'sea + air', states: ['ts_baidun', 'mr_west', 'mr_main'], note: 'Tankers against two hundred navies.' },
  { id: 'th_marches', name: 'The Free Marches', between: ['free'], kind: 'contracts', states: ['fr_greyfen', 'fr_prairie', 'fr_hollow', 'fr_equator', 'fr_interior'], note: 'No flag, no army: where small contracts and mercenary work begin.' },
];
