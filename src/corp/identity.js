// Company identity (v0.60.0). Pure functions — no game state, no DOM.
//
//   validateName(raw, taken)   a company name: trimmed, sensible length and characters, not taken
//   SECTORS                    the sectors a company can belong to
//   DEFAULT_NAMES              what a business is called until its owner names it
//
// A name is the one thing about a company the player may change; its id, sector and founding
// day never change. Every name ever used stays in the company's history.

export const NAME_MIN = 3;
export const NAME_MAX = 40;

export const SECTORS = {
  arms: { name: 'Arms manufacturing' },
  shipping: { name: 'Shipping and logistics' },
  aerospace: { name: 'Aerospace engineering' },
  agriculture: { name: 'Farming and agriculture' },
  energy: { name: 'Energy' },
  industrial: { name: 'Industrial manufacturing' },
  transport: { name: 'Transportation' },
  communications: { name: 'Communications' },
  satellites: { name: 'Satellite services' },
  finance: { name: 'Finance' },
};

/** The player's four businesses, their sectors, and the name each carries until it is renamed. */
export const PLAYER_COMPANIES = {
  arms: { sector: 'arms', defaultName: 'Mill Road Arms Works', icon: '🏭', kind: 'Arms manufacturer' },
  shipping: { sector: 'shipping', defaultName: 'Ober & Sons Maritime', icon: '🚢', kind: 'Shipping company' },
  aerospace: { sector: 'aerospace', defaultName: 'Roost Aeroworks', icon: '✈️', kind: 'Aerospace engineer' },
  farming: { sector: 'agriculture', defaultName: 'East Plot Farms', icon: '🌾', kind: 'Farming business' },
};

// letters (any script), digits, spaces and a few marks a firm's name needs
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} &'.,\-]*$/u;

/**
 * Check a proposed name. `taken` are the names already in use (any case). Returns
 * { ok: true, name } with the name tidied, or { ok: false, error }.
 */
export function validateName(raw, taken = []) {
  if (typeof raw !== 'string') return { ok: false, error: 'Enter a name.' };
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, error: 'A company needs a name.' };
  if (name.length < NAME_MIN) return { ok: false, error: `Use at least ${NAME_MIN} characters.` };
  if (name.length > NAME_MAX) return { ok: false, error: `Use at most ${NAME_MAX} characters.` };
  if (!ALLOWED.test(name)) return { ok: false, error: 'Use letters, numbers, spaces and & \' . , - only, starting with a letter or number.' };
  if ((name.match(/\p{L}/gu) || []).length < 2) return { ok: false, error: 'A name needs at least two letters.' };
  if (/[&'.,\-]{2,}/.test(name)) return { ok: false, error: 'Too much punctuation in a row.' };
  const lc = name.toLowerCase();
  if (taken.some((t) => String(t).toLowerCase() === lc)) return { ok: false, error: 'Another company already has that name.' };
  return { ok: true, name };
}
