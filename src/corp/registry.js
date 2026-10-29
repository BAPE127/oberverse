// The company registry (v0.60.0): every company in the Oberverse in one list. Pure functions.
//
//   existingRows(content)   the companies the game already had — the listed ones, the carriers
//   countryName(content,id) where a company is from
//
// The player's four businesses are added by the Corporate service (their names are the player's
// to change); the generated international companies are stored in the save (src/corp/generate.js).
// A row: { id, name, sector, country, kind, ticker?, source }.
// `kind`: 'listed' (public, has a ticker) · 'carrier' (a freight company the arms trade uses) ·
//         'player' · 'generated'.

/** The home country: the island of Halvermouth. (Not named elsewhere in the lore, so it is just its capital's name.) */
export const HOME = { id: 'home', name: 'Halvermouth' };

export function countryName(content, id) {
  if (!id) return '—';
  if (id === HOME.id) return HOME.name;
  return content.arms.countries[id]?.name || id;
}

/** Every country a company can be from: home and the eight on the globe. */
export function countryIds(content) {
  return [HOME.id, ...Object.keys(content.arms.countries)];
}

/** The companies that were already in the game before the registry. Identity only — figures come from their own systems. */
export function existingRows(content) {
  const rows = [];
  rows.push({ id: 'ober_oil', name: 'Ober\'s Oil', sector: 'energy', country: HOME.id, kind: 'listed', ticker: 'OBRO', source: 'oil' });
  rows.push({ id: 'chuckies_cheese', name: content.dairy.config.company, sector: 'agriculture', country: HOME.id, kind: 'listed', ticker: content.dairy.config.ticker, source: 'dairy' });
  const m = content.aerospace.aero.meridian;
  rows.push({ id: 'meridian', name: m.name, sector: 'aerospace', country: HOME.id, kind: 'listed', ticker: m.ticker, source: 'aero' });
  const carrierCountry = { morrow: 'morrow' };
  const carrierSector = { stork: 'transport' };
  for (const [id, s] of Object.entries(content.arms.shippers)) {
    rows.push({ id: `carrier_${id}`, name: s.name, sector: carrierSector[id] || 'shipping', country: carrierCountry[id] || (id === 'ghost' ? null : HOME.id), kind: 'carrier', source: 'arms' });
  }
  return rows;
}
