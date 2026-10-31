// The officers who work at your headquarters (v0.87.0): generated people (src/systems/hq.js profileOf), so these lines are generic —
// they know their desk, their hours and that you pay them.
export const dlgOfficer = {
  id: 'dlg_officer',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*mumbles into a pillow* …the minutes can wait until nine, Chief…'] },
    { if: { activity: 'work' }, variants: [['Chief. I have the figures, if you want them.'], ['Good to see you, Chief. Mind the paper on the floor; it is filed that way.'], ['*looks up from a ledger* Chief.']] },
    { if: { activity: 'leisure' }, variants: [['Chief. Off the clock, but never off the record.'], ['*stirs a cup of something* Chief. A quiet moment, for once.']] },
    { if: {}, variants: [['Chief.'], ['Good day, Chief.']] },
  ],
  farewells: [{ if: {}, variants: [['Back to the desk.'], ['Chief.']] }],
  topics: [
    {
      id: 't_officer_job', label: '"How is the work?"', keywords: ['work', 'job', 'desk', 'office'],
      say: ['Steady. The books balance, the desk is mine and the kettle is never empty. The hours are nine till half past five, with an hour at noon.'],
    },
    {
      id: 't_officer_home', label: '"Where do you sleep?"', keywords: ['sleep', 'home', 'bed', 'quarters'],
      say: ['Behind the hall, in the staff quarters: a cot each, a stove, a table where we do the minutes. It is not the Phonograph Grand, but it is ours.'],
    },
  ],
  askAbout: [],
  unknown: [['I would have to check the files, Chief.'], ['Above my signature, Chief.']],
  gift: { loved: [['For me? Chief, I shall frame it.']], liked: [['Thank you, Chief.']], neutral: [['Noted, with thanks.']], disliked: [['I will file this under "other".']] },
  barks: {
    greet: ['Chief.', 'Good day.'],
    work: ['*signs something*', '*totals a column*', 'Eleven, twelve, carry the two…', '*files a memo*'],
    leisure: ['*stirs a cup*', '*reads the minutes for fun*', 'A quiet half hour.'],
    sleep: ['…zzz…'],
    chat: ['Indeed.', 'Mm.', 'It is in the minutes.'],
    argue: ['I would prefer we put that in writing.'],
  },
};
export default [dlgOfficer];
