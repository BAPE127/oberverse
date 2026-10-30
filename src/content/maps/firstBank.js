// The First Bank of Halvermouth's banking hall (v0.70.0). Like the Phonograph Grand's lobby it is made after the street has
// grown, at exactly the size of its building: the interior is laid over the footprint, so nothing around it moves.
//   west: the bond desk · centre: the tellers' counter and the vault · east: the rate board
import { roomTiles } from '../../world/mapBuilder.js';

export function firstBankInterior(street) {
  const b = street.buildings.find((x) => x.id === 'b_bank');
  const W = b.w;
  const H = b.h;
  if (W < 9 || H < 7) throw new Error(`bank: the First Bank's hall is too small (${W}×${H})`);
  const dx = b.door.x - b.x;
  const mid = Math.floor(W / 2);
  const props = [
    { id: 'bank_vault', type: 'vault', x: mid - 1, y: 1, w: 2, h: 1, label: 'VAULT', examine: 'The vault door: round, shiny, a metre thick, and shut. A brass plate reads "TIME-LOCKED. NO ONE IS EVER ALONE WITH THIS DOOR." Nothing about it is for you.' },
    { id: 'bank_bond_desk', type: 'desk', x: 1, y: 2, w: 2, color: '#5a3a24', label: 'BOND DESK', interact: { kind: 'bank', tab: 'Bonds' }, examine: 'The bond desk: government bonds at par, sold by the First Bank of Halvermouth.' },
    { id: 'bank_bond_chair', type: 'chair', x: 1, y: 3 },
    { id: 'bank_rate_board', type: 'sign', x: W - 4, y: 1, w: 3, label: 'POLICY RATE', interact: { kind: 'bank', tab: 'Bank' }, examine: 'The rate board: the First Bank\'s policy rate and the record of every decision, with the reasons. Under it, a framed card: "THE RATE IS NOT OURS TO SET. IT IS THE ECONOMY\'S."' },
    { id: 'bank_tellers', type: 'counter', x: mid - 1, y: 3, w: 3, color: '#4a3a2e', examine: 'The tellers\' counter, with a brass grille and three windows. All three are marked "PLEASE USE THE BOND DESK OR THE RATE BOARD", which is not what banks say, but this one has been reorganised.' },
    { id: 'bank_rug', type: 'rug', x: mid - 1, y: H - 3, w: 3, h: 1, color: '#2a3a5a' },
    { id: 'bank_plant1', type: 'plant', x: 1, y: H - 2 }, { id: 'bank_plant2', type: 'plant', x: W - 2, y: H - 2 },
    { id: 'bank_bench', type: 'bench', x: W - 4, y: H - 2 },
    { id: 'bank_clock', type: 'painting', x: mid, y: 0, examine: 'A tall clock over the hall. It is right twice a day, and the bank is open from nine until five.' },
    { id: 'bank_win1', type: 'window', x: 2, y: 0 }, { id: 'bank_win2', type: 'window', x: W - 3, y: 0 },
  ];
  return {
    id: 'first_bank', name: 'First Bank of Halvermouth', kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor',
    wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTiles(W, H, 't', dx),
    doors: [{ id: 'door_bank_exit', x: dx, y: H - 1, to: { map: 'halvermouth', spot: 'b_bank_out' } }],
    spots: { entry: { x: dx, y: H - 2, facing: 'up' }, teller: { x: mid, y: 2, facing: 'down' }, bond_desk: { x: 2, y: 3, facing: 'up' }, rate_board: { x: W - 3, y: 2, facing: 'up' }, vault_front: { x: mid, y: 2, facing: 'up' } },
    props,
  };
}
