// World-map icons (v0.15.1): what each building is, by building id. The map
// (src/ui/maps.js) draws the icon at the building and shows the kind on hover.
// Buildings without an entry (shacks) get no icon.
export const BUILDING_ICONS = {
  // Lanternside
  b_number9: { icon: '🏠', kind: 'Your home' },
  b_vane_house: { icon: '🏡', kind: 'Residence' },
  b_to_let: { icon: '🔑', kind: 'House to let' },
  b_cafe: { icon: '☕', kind: 'Café' },
  b_civic: { icon: '🏛️', kind: 'Civic office' },
  b_workshop: { icon: '🔧', kind: 'Workshop' },
  b_collective: { icon: '🤝', kind: 'Union hall' },
  b_lighthouse: { icon: '🗼', kind: 'Lighthouse' },
  // Ober Fields
  b_manor: { icon: '🎩', kind: 'Manor house' },
  b_refinery: { icon: '🛢️', kind: 'Oil refinery' },
  b_bunkhouse: { icon: '🛏️', kind: 'Workers\' housing' },
  // Westbrook
  b_mason_office: { icon: '🏗️', kind: 'Construction site office' },
  b_plumb_line: { icon: '🏢', kind: 'Apartments' },
  // Halvermouth — towers
  t_mutual: { icon: '📄', kind: 'Insurance company' },
  t_ledgerline: { icon: '💼', kind: 'Office tower' },
  t_crown: { icon: '📄', kind: 'Insurance company' },
  t_meridian: { icon: '💼', kind: 'Trust company' },
  t_herald: { icon: '📰', kind: 'Newspaper' },
  t_exchange: { icon: '📈', kind: 'Stock exchange' },
  t_atlas: { icon: '🍸', kind: 'Private club' },
  t_vantage: { icon: '🏢', kind: 'Office tower' },
  t_telephone: { icon: '☎️', kind: 'Telephone company' },
  t_harbourline: { icon: '🏢', kind: 'Apartments' },
  t_ober: { icon: '🛢️', kind: 'Ober\'s Oil headquarters' },
  t_ironclad: { icon: '🛡️', kind: 'Security firm' },
  t_grand_hotel: { icon: '🏨', kind: 'Hotel' },
  // Halvermouth — streets
  b_bank: { icon: '🏦', kind: 'Bank' },
  b_hall_of_justice: { icon: '⚖️', kind: 'Courts & mayor\'s office' },
  b_police: { icon: '🚓', kind: 'Police station' },
  b_rialto: { icon: '🎭', kind: 'Theatre' },
  b_market_hall: { icon: '🧺', kind: 'Market' },
  b_diner: { icon: '🍳', kind: 'Diner' },
  b_pawn: { icon: '💍', kind: 'Pawn shop' },
  b_bar: { icon: '🍺', kind: 'Bar' },
  b_garage: { icon: '🚗', kind: 'Garage' },
  b_gun_shop: { icon: '🔫', kind: 'Gun shop' },
  b_locksmith: { icon: '🔐', kind: 'Locksmith' },
  b_bail: { icon: '⛓️', kind: 'Bail bonds' },
  b_mission: { icon: '⛪', kind: 'Mission' },
  b_abacus: { icon: '🧮', kind: 'Gang hangout' },
  // Halvermouth — docks
  b_wh7: { icon: '📦', kind: 'Warehouse' },
  b_wh9: { icon: '📦', kind: 'Warehouse' },
  b_wh12: { icon: '📦', kind: 'Warehouse' },
  b_surplus: { icon: '📟', kind: 'Electronics shop' },
  b_port: { icon: '⚓', kind: 'Port authority' },
  b_cold: { icon: '❄️', kind: 'Cold storage' },
  // Mill Road Yards
  b_aw1: { icon: '🏭', kind: 'Arms works' },
  b_aw2: { icon: '🏭', kind: 'Arms works' },
  b_aw3: { icon: '🏭', kind: 'Arms works' },
  b_gatehouse: { icon: '🚧', kind: 'Gatehouse' },
  b_scrapco: { icon: '♻️', kind: 'Scrapyard' },
  // v0.16.0
  b_fender_office: { icon: '🚙', kind: 'Used-car dealership' },
  b_beaumont: { icon: '🏎️', kind: 'Luxury car dealership' },
};
