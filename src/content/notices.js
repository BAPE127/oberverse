// Civic Square notice board. Posts appear when their conditions hold;
// reading a post can teach the player a fact.
export const NOTICES = [
  { text: 'LANTERNSIDE CIVIC OFFICE — Open 08:30–17:00. Closed means closed. — O. Vane, Clerk' },
  { text: 'THE KETTLE & CRUMB — Buns, scones, coffee & conversation. 07:00–21:00. Patio permit pending (5th application).' },
  { text: 'HOLLOW FIXINGS on the Quay — Engines mended, gadgets invented, explosions minimised. We buy junk!' },
  { text: 'LOST: one (1) lucky spanner, Gullwing Park. Reward: gratitude. — T.H.', if: { quest: { id: 'q_lucky_spanner', state: ['not_started', 'active'] } }, learn: 'fact_tibbs_lost_spanner' },
  { text: 'NOTICE OF CITATION: Hollow Fixings, for Excessive Bang (Form 7-B).', if: { flag: 'citation_posted' } },
  { text: 'MISSING: Lighthouse key, Civic property. Return to the Civic Office. No questions asked. (Some questions asked.)', if: { flag: 'key_missing_posted', notFlag: 'key_returned' }, learn: 'fact_key_missing' },
  { text: 'Someone has written underneath in pencil: "THE GULLS KNOW."', learn: 'fact_gulls_organised' },
];
