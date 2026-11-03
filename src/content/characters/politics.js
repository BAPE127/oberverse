// The two political leaders (v0.93.0). Josiah Vegas leads the Order Party; Susan leads the Liberty League. Names exactly as the owner gave them.
// They are persistent NPCs for the whole game, in or out of office, with a home, a bed, a sleep block, a schedule and a dialogue. Each is a person
// with supporters and weak points, never a villain or a saint; neither is "good" or "bad" for the player (see docs/PROPOSAL_POLITICS.md).
//
// For now each has a flat in the Staff Flats beside the Crown Quarter's square (Vegas in B, Susan in A) and works the capital by day (v0.94.0 moved them from Crown Court); the Crown Quarter,
// Halver House, party offices and the mansions come with the next releases, which replace these homes and schedules (ids never change).
// No leader changes any price, cost or law in this release.
const local = (o) => ({ tier: 'minor', origin: 'generated', faction: null, walkSpeed: 1, punctuality: 2, impulses: [], notices: [], reactions: {}, knowledge: [], noSnitch: false, ...o });

export const vegas = local({
  id: 'npc_vegas', name: 'Josiah Vegas', shortName: 'Vegas',
  combat: { never: true, maxHealth: 110 },
  role: 'Leader of the Order Party: strict law enforcement, public order, national security and a strong executive. Sometimes President of Sund, always in the papers.',
  dialogue: 'dlg_vegas',
  voice: { wave: 'sawtooth', pitch: 95, variance: 6, rate: 0.82 },
  appearance: { skin: '#c89a78', hair: '#2a2622', hairStyle: 'parted', outfit: '#1e2a44', undershirt: '#f0eee8', tie: '#8a1a24', legs: '#181c2a', shoes: '#101014', accessories: ['lapelpin'], accent: '#b8962e', build: 'broad', height: 1.08 },
  personality: { traits: ['stern', 'disciplined', 'persuasive', 'believes his own speeches'], sociability: 0.6, conscientiousness: 0.95, impulsiveness: 0.1, discretion: 0.8, honesty: 0.55, empathy: 0.4, confidence: 0.95, humor: 0.2 },
  speech: { rumorPrefix: 'Between ourselves, and not for the cameras,', factPrefix: 'The record is clear:', refuse: 'That is not a matter for public discussion.' },
  schedule: [
    { from: '23:00', to: '06:30', activity: 'sleep', spot: 'cq_staff_b_4:bed' },
    { from: '06:30', to: '08:00', activity: 'eat', spot: 'cq_staff_b_4:chair', label: 'breakfast and the overnight briefing papers' },
    { from: '08:00', to: '12:00', activity: 'work', spot: 'crown_quarter__cq_order_hq:desk', label: 'meetings at party headquarters' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'crown_quarter:square_fountain', label: 'a working lunch by the fountain' },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'crown_quarter:press_line', label: 'a public appearance on the Square' },
    { from: '17:00', to: '23:00', activity: 'relax', spot: 'cq_staff_b_4:chair', label: 'rehearsing tomorrow\'s speech' },
  ],
  relationships: { player: { trust: 0, affection: 0, respect: 5, suspicion: 10 }, npc_susan: { trust: 5, affection: 0, respect: 30, suspicion: 40 }, npc_lawrence: { trust: 45, affection: 20, respect: 25, suspicion: 5 } },
  giftPrefs: { item_cigar: 8, item_coffee: 4, tags: { food: 1 } },
  opinions: {
    npc_susan: { warm: 'Susan is the only person in Sund who has ever out-argued me in public. I have not forgiven her. I do respect her.', cool: 'Susan\'s League would leave the doors unlocked and call it a philosophy.' },
    npc_lawrence: { warm: 'Chief Order is a loyal servant of the law. I would be glad of more like him.', cool: 'Chief Order\'s department is under-funded. That is a fact, and a policy.' },
  },
});

export const susan = local({
  id: 'npc_susan', name: 'Susan', shortName: 'Susan',
  combat: { never: true, maxHealth: 90 },
  role: 'Leader of the Liberty League: lighter enforcement, individual freedom, less regulation and less foreign intervention. Sometimes President of Sund, always in the papers.',
  dialogue: 'dlg_susan',
  voice: { wave: 'triangle', pitch: 190, variance: 14, rate: 0.95 },
  appearance: { skin: '#e0b898', hair: '#6a3a24', hairStyle: 'long', outfit: '#2a6a5a', undershirt: '#f8f4ec', tie: null, legs: '#1e3a34', shoes: '#2a1e18', accessories: ['scarf'], accent: '#e8b040', build: 'average', height: 1.0 },
  personality: { traits: ['quick', 'warm in public', 'sceptical of power', 'overcommitted'], sociability: 0.85, conscientiousness: 0.7, impulsiveness: 0.35, discretion: 0.5, honesty: 0.7, empathy: 0.75, confidence: 0.85, humor: 0.65 },
  speech: { rumorPrefix: 'I shouldn\'t say this, but', factPrefix: 'Look at the numbers:', refuse: 'Ask me that when the cameras are off.' },
  schedule: [
    { from: '23:30', to: '07:00', activity: 'sleep', spot: 'cq_staff_a_4:bed' },
    { from: '07:00', to: '08:30', activity: 'eat', spot: 'cq_staff_a_4:chair', label: 'coffee, three newspapers and a phone call' },
    { from: '08:30', to: '12:00', activity: 'work', spot: 'crown_quarter:demonstration', label: 'meeting voters on the Square' },
    { from: '12:00', to: '13:00', activity: 'eat', spot: 'crown_quarter:square_fountain', label: 'lunch by the fountain' },
    { from: '13:00', to: '17:00', activity: 'work', spot: 'crown_quarter__cq_liberty_hq:desk', label: 'committee work at party headquarters' },
    { from: '17:00', to: '23:30', activity: 'relax', spot: 'cq_staff_a_4:chair', label: 'drafting a speech she will rewrite twice' },
  ],
  relationships: { player: { trust: 0, affection: 5, respect: 5, suspicion: 5 }, npc_vegas: { trust: 5, affection: 0, respect: 30, suspicion: 40 }, npc_lawrence: { trust: 10, affection: 0, respect: 10, suspicion: 30 } },
  giftPrefs: { item_coffee: 10, item_honey_bun: 6, tags: { food: 3 } },
  opinions: {
    npc_vegas: { warm: 'Josiah believes every word. That is what makes him dangerous, and what makes him good at it.', cool: 'Josiah would arrest the weather if it had a manifesto.' },
    npc_lawrence: { warm: 'Chief Order is not a bad man. He is a man in a very particular chair.', cool: 'Chief Order\'s mugs are not a policing strategy.' },
  },
});

export default [vegas, susan];
