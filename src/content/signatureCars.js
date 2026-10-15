// Signature cars (v0.34.0): one ridiculous, one-of-a-kind car for each of the
// imported characters, built around who they are. Owner's brief: "give them
// their own unique cars that are unique to their personality/positions — as
// insane and absurd as you want." They're parked by where each owner works.
// You can hotwire one (a crime, and its owner takes it very personally); no
// dealer will touch one — everybody knows whose it is.
//
// Extra model fields: sig (which drawing, src/engine/drawSignatureCars.js),
// owner, plate, horn (a horn voice in sfx_horn), trail (what it leaves behind
// while it moves), amphibious (drives on water), unsuspected (officers don't
// suspect it's stolen — and what they do instead), stolenLine (the owner, on
// seeing you in it), lore (shown when you look at it).
// Coordinates are world tiles after the road widening (no shift applied).
export const SIGNATURE_MODELS = {
  bullion: {
    name: 'Moneybucks Bullion', sig: 'bullion', owner: 'npc_moneybucks', dealer: null, price: 250000, plate: 'RICH 1',
    top: 300, accel: 170, grip: 2.2, len: 132, wid: 48, body: 'limo', colors: ['#e8b830'], horn: 'kaching', trail: 'coins',
    blurb: 'A six-wheeled limousine cast from solid gold, with a crystal chandelier on the roof, a marble fountain on the bonnet and a hot tub in the back. It weighs eleven tonnes. It sheds gold leaf at speed, on purpose.',
    lore: 'Sir Moneybucks had it made when his first limousine was "a little bit beige". The fountain runs on champagne. The horn is a cash register.',
    stolenLine: 'My BULLION! Do you have ANY idea what that is worth? I DO. To the obol!',
  },
  plumbbob: {
    name: 'Plumb Bob', sig: 'plumbbob', owner: 'npc_mason', dealer: null, price: 60000, plate: 'LEVEL',
    top: 260, accel: 150, grip: 2.4, len: 104, wid: 48, body: 'pickup', colors: ['#e8a020'], horn: 'reverse', trail: 'dust', offRoad: 0.95,
    blurb: 'A cement mixer hot rod: the drum turns all day, a little tower crane sits on the cab with a brass plumb bob swinging from the jib, and the roll cage is scaffolding. It has a spirit level in the dashboard instead of a speedometer.',
    lore: 'Mason built it himself in a weekend from three skips and a cement mixer. It is perfectly level. He checked. Twice. It does not mind a building site.',
    stolenLine: 'That\'s my Plumb Bob! You put that back EXACTLY where it was. To the inch!',
  },
  gavel: {
    name: 'Gavel', sig: 'gavel', owner: 'npc_lawrence', dealer: null, price: 80000, plate: 'ORDER',
    top: 420, accel: 360, grip: 3.1, len: 112, wid: 50, body: 'police', colors: ['#1a2236'], horn: 'gavel', trail: null,
    unsuspected: 'salute',
    blurb: 'An armoured police interceptor with three light bars, a giant wooden gavel on the roof that bangs down when you sound the horn, a bull bar shaped like the scales of justice and a spare tyre that is actually an enormous doughnut.',
    lore: 'Bought for the Chief out of the evidence fund. It has done four miles, all of them on the lorry that delivered it — Chief Order never leaves the station. Officers who see it assume the Chief is out, and salute.',
    stolenLine: 'Is that… is someone driving my Gavel? …Not my problem. Somebody file a form.',
  },
  hypotenuse: {
    name: 'Hypotenuse', sig: 'hypotenuse', owner: 'npc_arthur', dealer: null, price: 31416, plate: '3.14159',
    top: 440, accel: 460, grip: 3.6, len: 100, wid: 48, body: 'coupe', colors: ['#22282a'], horn: 'pi', trail: 'maths',
    blurb: 'A perfect right-angled wedge on wheels, painted blackboard black and covered in chalk proofs. There is a calculator the size of a door on the roof, a protractor spoiler and a sign on the back that says 3² + 4² = 5² in letters a foot high.',
    lore: 'Arthur designed it on graph paper in one furious night. Its price is exactly 31,416 obols. Its horn plays the digits of pi. It leaves sums behind it, and they are all correct.',
    stolenLine: 'THE HYPOTENUSE! You will return it. You will return it squared. Do the maths, you thief!',
  },
  paranoia: {
    name: 'Paranoia', sig: 'paranoia', owner: 'npc_lucas', dealer: null, price: 45000, plate: 'NOT FBI',
    top: 330, accel: 260, grip: 2.6, len: 108, wid: 50, body: 'estate', colors: ['#2a2e2a'], horn: 'theremin', trail: 'static', offRoad: 0.8,
    unsuspected: 'unseen',
    blurb: 'A blacked-out armoured half-track van wrapped entirely in tinfoil, with two satellite dishes, a forest of antennas, a periscope in a fake gun turret and NOT A SURVEILLANCE VAN stencilled down both sides.',
    lore: 'Lucas swears the foil keeps out "the signals". It does seem to keep out the police: radar, cameras and officers slide right off it. He sleeps in it some nights. Don\'t ask what\'s in the back.',
    stolenLine: 'They took the Paranoia. I KNEW it. I knew this would happen. I wrote it DOWN.',
  },
  landlubber: {
    name: 'Landlubber', sig: 'landlubber', owner: 'npc_ober', dealer: null, price: 52000, plate: 'AHOY',
    top: 300, accel: 200, grip: 2.3, len: 116, wid: 48, body: 'saloon', colors: ['#7a4a26'], horn: 'foghorn', trail: 'spray', amphibious: true, seaSpeed: 1.3,
    blurb: 'A clinker-built wooden boat on four tractor wheels: a figurehead of a mermaid, a mast with a sail that fills as you go, a crow\'s nest, a ship\'s wheel for steering and a foghorn for a horn. It drives straight into the sea and keeps going, faster.',
    lore: 'Captain Ober never learned to drive "a land boat", so he had his old pilot launch put on wheels. He takes it out on the harbour on Restdays and waves at the gulls.',
    stolenLine: 'Belay that! Ye\'ve pinched the Landlubber, ye scallywag! Bring her about!',
  },
  bigcheese: {
    name: 'Big Cheese', sig: 'bigcheese', owner: 'npc_chuckie', dealer: null, price: 40000, plate: 'CHEDDR',
    top: 320, accel: 230, grip: 2.6, len: 104, wid: 52, body: 'saloon', colors: ['#f2c440'], horn: 'moo', trail: 'cheese', offRoad: 1,
    blurb: 'A giant wedge of cheddar on monster-truck wheels, holes and all, with cow-print fenders, a pair of longhorns on the bonnet, a milk-churn exhaust and a moo for a horn. It smells exactly how you think.',
    lore: 'Chuckie had it built for the county fair parade and never took it back. It crosses a ploughed field like a highway, and leaves a little trail of crumbs for the birds.',
    stolenLine: 'Well, I\'ll be! Somebody\'s run off with the Big Cheese! Bring her back, partner, and we\'ll say no more about it. Probably.',
  },
};

/** Where each one is parked (tile x, y; angle in degrees, 0 = east). */
export const SIGNATURE_PARKED = [
  { id: 'car_sig_bullion', model: 'bullion', map: 'ober_fields', x: 22, y: 5, angle: 90 },
  { id: 'car_sig_plumbbob', model: 'plumbbob', map: 'westbrook', x: 36, y: 8, angle: 0 },
  { id: 'car_sig_gavel', model: 'gavel', map: 'halvermouth', x: 70, y: 35, angle: 90 },
  { id: 'car_sig_hypotenuse', model: 'hypotenuse', map: 'halvermouth', x: 34, y: 57, angle: 0 },
  { id: 'car_sig_paranoia', model: 'paranoia', map: 'halvermouth', x: 72, y: 56, angle: 0 },
  { id: 'car_sig_landlubber', model: 'landlubber', map: 'yards', x: 58, y: 40, angle: 0 },
  { id: 'car_sig_bigcheese', model: 'bigcheese', map: 'lariat', x: 41, y: 79, angle: 0 },
].map((p) => ({ ...p, color: SIGNATURE_MODELS[p.model].colors[0], owner: SIGNATURE_MODELS[p.model].owner, plate: SIGNATURE_MODELS[p.model].plate }));
