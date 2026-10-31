// Furnishing the headquarters (v0.88.0): what the parent can choose for the inside of an office it owns. All of it is looks — the desks,
// the floor and rug, the walls, the lamps, the pictures and the plants — and none of it makes or saves a coin: a choice costs obols, paid
// from the parent's own account, once, whenever you change to something that is not already there. Going back to the original is free.
//
// Each slot lists its options; the first is what an office has when it is bought (free, and exactly the hall as it was).
//   price   base obols, multiplied by the office (STYLE_SCALE) — a bigger hall has more of it to do
//   only    the offices that offer it (a luxury only the tower has)
export const STYLE_SCALE = { small: 1, mid: 3, tower: 8 };

export const STYLE_SLOTS = ['desks', 'floor', 'walls', 'lights', 'art', 'plants'];

export const STYLE = {
  desks: { name: 'Desks', icon: '🗄️', text: 'The wood or metal of every desk in the hall.', options: [
    { id: 'walnut', name: 'Walnut', price: 0, color: '#6a4a2e' },
    { id: 'oak', name: 'Oak', price: 400, color: '#b98a56' },
    { id: 'steel', name: 'Steel', price: 500, color: '#7d8794' },
    { id: 'white', name: 'White', price: 450, color: '#e2dfd6' },
    { id: 'ebony', name: 'Ebony', price: 600, color: '#2f2b33' },
    { id: 'gilded', name: 'Gilded', price: 1500, color: '#c9a24a', only: ['tower'] },
  ] },
  floor: { name: 'Floor', icon: '🟫', text: 'The floor of the hall, and the rug by the door.', options: [
    { id: 'checker', name: 'Black & white', price: 0, tile: 4, rug: '#2a3a5a', color: '#d8d2c4' },
    { id: 'marble', name: 'Cream marble', price: 700, tile: 0, rug: '#7a3a3a', color: '#dcd6cc' },
    { id: 'teal', name: 'Teal tile', price: 500, tile: 1, rug: '#d8c9a0', color: '#3f9b98' },
    { id: 'olive', name: 'Olive', price: 400, tile: 2, rug: '#3a2a1e', color: '#5e6248' },
    { id: 'slate', name: 'Slate', price: 450, tile: 3, rug: '#2a2a3a', color: '#b8bcc4' },
  ] },
  walls: { name: 'Walls', icon: '🧱', text: 'The colour and finish of the walls inside.', options: [
    { id: 'grand', name: 'Black & gold', price: 0, wall: 'grand', color: '#4a1a28' },
    { id: 'navy', name: 'Navy', price: 500, wall: 'navy', color: '#c8d0dc' },
    { id: 'stone', name: 'Stone', price: 700, wall: 'stone', color: '#cec8bc' },
    { id: 'cream', name: 'Cream', price: 400, wall: 'cream', color: '#e9dcc3' },
    { id: 'teal', name: 'Teal', price: 450, wall: 'teal', color: '#596370' },
    { id: 'plum', name: 'Plum', price: 450, wall: 'plum', color: '#c2607c' },
    { id: 'starlit', name: 'Starlit', price: 1800, wall: 'arcane', color: '#2a1e44', only: ['tower'] },
  ] },
  lights: { name: 'Lights', icon: '💡', text: 'Brass lamps along the back wall. They glow at night, and only the hall is lit.', options: [
    { id: 'plain', name: 'No lamps', price: 0, glow: null, color: '#3a3a44' },
    { id: 'warm', name: 'Warm lamps', price: 350, glow: '255,214,140', color: '#f2c870' },
    { id: 'cool', name: 'Cool lamps', price: 350, glow: '190,225,255', color: '#bfe0ff' },
    { id: 'rose', name: 'Rose lamps', price: 400, glow: '255,170,190', color: '#ffb0c0' },
  ] },
  art: { name: 'Art', icon: '🖼️', text: 'Pictures for the back wall.', options: [
    { id: 'bare', name: 'Bare walls', price: 0, color: '#3a3a44' },
    { id: 'landscape', name: 'Landscapes', price: 250, color: '#4f8a4a' },
    { id: 'seascape', name: 'Seascapes', price: 300, color: '#2f5f8a' },
    { id: 'abstract', name: 'Abstracts', price: 450, color: '#c0392b' },
  ] },
  plants: { name: 'Plants', icon: '🪴', text: 'Pot plants in the corners of the hall. People walk past them, not through them.', options: [
    { id: 'none', name: 'Just the two', price: 0, count: 0, color: '#3a3a44' },
    { id: 'some', name: 'A few more', price: 300, count: 2, color: '#6aa860' },
    { id: 'lush', name: 'A jungle', price: 700, count: 99, color: '#4f8a4a' },
  ] },
};

/** What an office has when it is bought: the first option of every slot. */
export const STYLE_DEFAULT = Object.fromEntries(STYLE_SLOTS.map((s) => [s, STYLE[s].options[0].id]));

export const optionOf = (slot, id) => STYLE[slot]?.options.find((o) => o.id === id) || null;
export const priceOf = (tier, slot, id) => Math.round((optionOf(slot, id)?.price || 0) * (STYLE_SCALE[tier] || 1));

// Places for the extras, read off the free paving of each hall (the rows by the back wall and the corner beside the boardroom). They are
// fixed, so a hall never gets a lamp or a plant in anyone's way: nobody's desk, chair, stand-point or door is on one of them.
export const STYLE_SPOTS = {
  small: { lamps: [[2, 1], [6, 1]], art: [[4, 1]], plants: [[7, 3], [7, 4]] },
  mid: { lamps: [[2, 1], [5, 1], [9, 1]], art: [[3, 1], [8, 1]], plants: [[10, 4], [10, 6], [8, 6]] },
  tower: { lamps: [[2, 1], [5, 1], [8, 1], [10, 1]], art: [[3, 1], [6, 1], [11, 1]], plants: [[12, 3], [12, 5], [12, 7], [12, 9], [11, 6]] },
};

// What a picture on the wall shows: a frame, a sky, the ground below it and one mark (a sun, a sail, a splash).
export const ART = {
  landscape: { frame: '#b8892e', sky: '#9cc8d8', land: '#4f8a4a', mark: '#f2e2a0' },
  seascape: { frame: '#7a5236', sky: '#cfe0e8', land: '#2f5f8a', mark: '#f4f4f4' },
  abstract: { frame: '#2a2a32', sky: '#c0392b', land: '#e8b83a', mark: '#2a4a8a' },
};

/** The props a hall gets for its style: lamps, pictures and extra plants, each shown only while its option is chosen. */
export function styleProps(tier) {
  const S = STYLE_SPOTS[tier];
  const out = [];
  STYLE.lights.options.filter((o) => o.glow).forEach((o) => S.lamps.forEach(([x, y], i) => out.push({ id: `hq_${tier}_lamp_${o.id}_${i}`, type: 'floorlamp', x, y, glow: o.glow, color: o.color, hiddenUnless: { hqStyle: { tier, slot: 'lights', is: [o.id] } } })));
  STYLE.art.options.filter((o) => ART[o.id]).forEach((o) => S.art.forEach(([x, y], i) => out.push({ id: `hq_${tier}_art_${o.id}_${i}`, type: 'painting', x, y, art: o.id, examine: `${STYLE.art.options.find((q) => q.id === o.id).name}, framed. The parent's accountant has opinions about the price.`, hiddenUnless: { hqStyle: { tier, slot: 'art', is: [o.id] } } })));
  S.plants.forEach(([x, y], i) => out.push({ id: `hq_${tier}_plant_x${i}`, type: 'plant', x, y, hiddenUnless: { hqStyle: { tier, slot: 'plants', is: i < 2 ? ['some', 'lush'] : ['lush'] } } }));
  return out;
}
