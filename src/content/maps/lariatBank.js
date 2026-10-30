// The Lariat State Bank (v0.78.0): est. 1911, a teller's window, a loan officer's desk, a small vault and a guard by the door. Like the First
// Bank's hall it is made after the street has grown, at exactly the size of its building, so nothing around it moves.
//   west: the loan desk · centre: the teller's window and the vault · east: the rate card and the guard
import { roomTiles } from '../../world/mapBuilder.js';

export const LARIAT_BANK_STAFF = ['npc_hollis', 'npc_dottie', 'npc_clint'];

export function lariatBankInterior(street) {
  const b = street.buildings.find((x) => x.id === 'b_bank');
  const W = b.w;
  const H = b.h;
  if (W < 9 || H < 7) throw new Error(`lariat bank: the hall is too small (${W}×${H})`);
  const dx = b.door.x - b.x;
  const mid = Math.floor(W / 2);
  return {
    id: 'lariat_bank', name: 'Lariat State Bank', kind: 'interior', music: 'mus_civic', ambience: 'amb_indoor',
    wallStyle: 'grand', floorStyle: { t: 4 },
    tiles: roomTiles(W, H, 't', dx),
    doors: [{ id: 'door_lariat_bank_exit', x: dx, y: H - 1, to: { map: 'lariat', spot: 'lariat_bank_door_out' } }],
    spots: {
      entry: { x: dx, y: H - 2, facing: 'up' }, teller: { x: mid, y: 2, facing: 'down' }, loan_front: { x: 2, y: 4, facing: 'up' }, manager: { x: 1, y: 3, facing: 'right' },
      rate_card: { x: W - 3, y: 3, facing: 'up' }, guard_post: { x: W - 2, y: 5, facing: 'left' }, vault_front: { x: mid, y: 2, facing: 'up' },
    },
    keepClear: [[dx, H - 2]],
    props: [
      { id: 'lb_vault', type: 'vault', x: mid - 1, y: 1, w: 2, h: 1, label: 'VAULT', interact: { kind: 'vault', bank: 'lariat' }, examine: 'A small round vault door with "L.S.B. 1911" in brass. It has never been opened in front of a customer, and the customers like it that way.' },
      { id: 'lb_loan_desk', type: 'desk', x: 1, y: 2, w: 2, color: '#5a3a24', label: 'LOANS', interact: { kind: 'bank', tab: 'Loans' }, examine: 'The loan officer\'s desk: loans against the shares and bonds you hold, at a rate fixed on the day you sign. A blotter, a pen on a chain, and a cup of coffee that is nobody\'s.' },
      { id: 'lb_manager_chair', type: 'chair', x: 1, y: 3 },
      { id: 'lb_teller', type: 'counter', x: mid - 1, y: 3, w: 3, color: '#4a3a2e', interact: { kind: 'teller', bank: 'lariat' }, examine: 'The teller\'s window: brass grille, a dish for coins, and a hand-lettered card — "ASK DOTTIE."' },
      { id: 'lb_rate_card', type: 'sign', x: W - 4, y: 1, w: 3, label: 'THE BANK\'S RATE', interact: { kind: 'bank', tab: 'Bank' }, examine: 'The rate card, chalked daily: the First Bank of Halvermouth\'s policy rate, and what the Lariat State Bank adds to it. Under it: "WE LEND AGAINST WHAT YOU HOLD, AND ASK ONLY THAT YOU PAY."' },
      { id: 'lb_boxes', type: 'cabinet', x: W - 2, y: 2, h: 2, examine: 'Safe-deposit boxes, forty of them, each with a tiny brass door. Clint stands in front of them a great deal. They are boxes.' },
      { id: 'lb_clock', type: 'painting', x: mid, y: 0, examine: 'A wall clock stopped, by custom, at ten past ten. It is wound on the first of the month and always right by then.' },
      { id: 'lb_rug', type: 'rug', x: mid - 1, y: H - 3, w: 3, h: 1, color: '#6a2a24' },
      { id: 'lb_plant', type: 'plant', x: 1, y: H - 2 },
      { id: 'lb_bench', type: 'bench', x: 3, y: H - 2 },
      { id: 'lb_win1', type: 'window', x: 3, y: 0 }, { id: 'lb_win2', type: 'window', x: W - 3, y: 0 },
    ],
  };
}
