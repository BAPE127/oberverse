// The company's soldiers (v0.100.0): generated people (src/war/bodies.js), so these lines are generic: they know their post, their hours and who pays them.
export const dlgSoldier = {
  id: 'dlg_soldier',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*turns over, boots still on the bunk* …Lights were out an hour ago, Boss…'] },
    { if: { activity: 'work' }, variants: [['Boss. At your orders.'], ['*straightens* Boss. All quiet on the lot.'], ['Morning, Boss. The sergeant says we are ahead.']] },
    { if: { activity: 'leisure' }, variants: [['Boss. Off duty, but within earshot.'], ['*cleaning a mug with a rag* Boss. Mess is serving, if you are hungry.']] },
    { if: {}, variants: [['Boss.'], ['Good day, Boss.']] },
  ],
  farewells: [{ if: {}, variants: [['Back to it.'], ['Boss.']] }],
  topics: [
    { id: 't_soldier_job', label: '"How is the work?"', keywords: ['work', 'job', 'duty', 'post'], say: ['Drill, a post, a shift on the line if they are short of hands. The pay comes when it should, and that is more than the last outfit managed.'] },
    { id: 't_soldier_food', label: '"Are you fed?"', keywords: ['food', 'mess', 'eat', 'rations'], say: ['Rations every day, and a hot meal when the mess is open. When the stores run short, you will hear about it first from the cook.'] },
    { id: 't_soldier_bed', label: '"Where do you sleep?"', keywords: ['sleep', 'bed', 'bunk', 'barracks'], say: ['In the barracks: a bunk, a locker and a lamp. There is a bed for everyone, as long as you keep building them.'] },
  ],
  askAbout: [],
  unknown: [['Above my pay, Boss.'], ['You would have to ask the sergeant.']],
  gift: { loved: [['For me? Boss, that is decent of you.']], liked: [['Thanks, Boss.']], neutral: [['Appreciated.']], disliked: [['I will find a use for it.']] },
  barks: {
    greet: ['Boss.', 'Sir.'],
    work: ['*checks a strap*', '*scans the fence line*', 'All quiet.', '*counts rounds twice*'],
    leisure: ['*stirs a mug*', 'Mess is hot.', '*laughs at something*'],
    sleep: ['…zzz…'],
    chat: ['Indeed.', 'Mm.', 'Fair enough.'],
    argue: ['With respect, Boss, no.'],
  },
};
export default [dlgSoldier];
