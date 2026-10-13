// Civic Square notice board. Posts appear when their conditions hold;
// reading a post can teach the player a fact.
export const NOTICES = [
  { text: 'LANTERNSIDE CIVIC OFFICE — Open 08:30–17:00. Closed means closed. — O. Vane, Clerk' },
  { text: 'THE KETTLE & CRUMB — Buns, scones, coffee & conversation. 07:00–21:00. Patio permit pending (5th application).' },
  { text: 'HOLLOW FIXINGS on the Quay — Engines mended, gadgets invented, explosions minimised. We buy junk!' },
  { text: 'LOST: one (1) lucky spanner, Gullwing Park. Reward: gratitude. — T.H.', if: { quest: { id: 'q_lucky_spanner', state: ['not_started', 'active'] } }, learn: 'fact_tibbs_lost_spanner' },
  { text: 'NOTICE OF CITATION: Hollow Fixings, for Excessive Bang (Form 7-B).', if: { flag: 'citation_posted' } },
  { text: 'MISSING: Lighthouse key, Civic property. Return to the Civic Office. No questions asked. (Some questions asked.)', if: { flag: 'key_missing_posted', notFlag: 'key_returned' }, learn: 'fact_key_missing' },
  { text: 'OBER\'S OIL — Day labour wanted at Refinery No. 1. Apply to G. Slate, foreman, from 06:00. Wages per contract.' },
  { text: 'STRIKE! The workers of Ober\'s Oil are out until the back pay is paid. Solidarity from the Quay Collective.', if: { flag: 'refinery_strike' }, learn: 'fact_refinery_strike' },
  { text: 'ACCIDENT at Ober\'s Oil Refinery No. 1. "Nobody hurt," says management. "Several people hurt," says everyone else.', if: { flag: 'accident_posted' }, learn: 'fact_refinery_accident' },
  { text: 'NOTICE: the Lantern Canal is CLOSED to swimming, rowing and breathing deeply until further notice. — O. Vane', if: { flag: 'canal_slick' }, learn: 'fact_canal_slick' },
  { text: 'THE LIGHT IS BACK. The Old Lighthouse shines again over Lanternside Bay. — Civic Office (with thanks)', if: { flag: 'lighthouse_relit' }, learn: 'fact_lighthouse_relit' },
  { text: 'Someone has written underneath in pencil: "THE GULLS KNOW."', learn: 'fact_gulls_organised' },
];
