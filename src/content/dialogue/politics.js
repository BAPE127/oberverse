// The two leaders' dialogue (v0.93.0). Each speaks for a party and a view; neither is a villain. Nothing they say changes any price or law yet.
const open = (tab) => ({ panel: { name: 'tablet', opts: { tab } } });
const gifts = (loved, liked, neutral, disliked) => ({ loved: [[loved]], liked: [[liked]], neutral: [[neutral]], disliked: [[disliked]], tooMany: [['That is generous. Enough, now.']], ownStolen: [['That is mine. I shall not ask how you came by it.']] });

export const dlgVegas = {
  id: 'dlg_vegas',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep on his back, hands folded, a speech open on the quilt*'] },
    { if: { firstMeeting: true }, say: ['Josiah Vegas. The Order Party.', 'You may have seen my face on a wall. It is a good wall. I put a great deal of work into the wall.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['Ah. A friend of order. Sit. Tell me what the city needs.']] },
    { if: {}, variants: [['Good day. Make it brief; the country does not govern itself.'], ['Yes? If it is about the police, I am for them.'], ['A citizen. Excellent. A vote is a vote.']] },
  ],
  farewells: [{ if: {}, variants: [['Good day. Obey the speed limits.'], ['Order be with you.']] }],
  topics: [
    { id: 't_veg_party', label: '"What does the Order Party want?"', keywords: ['party', 'order', 'want', 'platform', 'believe'], say: ['Safe streets, a police force that can arrive, and a state that is not embarrassed to have one. Crime is not weather. It is a choice, and choices have consequences.', 'We are also for a strong defence. A country that cannot defend itself is a country that discusses being defended.'] },
    { id: 't_veg_cost', label: '"Who pays for all that?"', keywords: ['pay', 'cost', 'costs', 'tax', 'budget', 'afford'], say: ['Everyone, in the end. Police and defence are not free, and I will not pretend they are. That is the difference between us and the League: I put the bill on the table.', 'I would say that. You may say it is a weakness. A budget is a promise with a number on it.'] },
    { id: 't_veg_susan', label: '"What do you make of Susan?"', keywords: ['susan', 'league', 'liberty', 'opponent', 'rival'], say: ['Susan is clever, warm and wrong, in that order. She would leave the doors unlocked and call it a philosophy.', 'She is also the only person who has ever out-argued me in public. I have not forgiven her. I do respect her.'] },
    { id: 't_veg_who', label: '"Are you President?"', keywords: ['president', 'government', 'power', 'office', 'halver'], say: ['Sund has a king of eleven, who is admirable, and a President, who governs. I have been the second, and I intend to be it again. Whoever holds Halver House holds the country\'s ear.', 'You can see who governs now in your tablet. I will say only that it is a temporary arrangement; the voters decide in the end.'] },
    { id: 't_veg_tablet', label: '"Where can I read about the government?"', keywords: ['tablet', 'read', 'overview', 'politics', 'government', 'app'], say: ['There is an app for it, I am told. Everything is an app. The Politics page shows who governs, the term, and where the two parties stand.'], effects: [open('Politics')] },
  ],
  askPrompt: [['Ask what you like. I will answer what I like.']],
  unknown: [['That is not a matter for public discussion.'], ['I will have my staff look into it. I will not.']],
  gift: gifts('A cigar. Cuban? No matter. You have taste.', 'Thank you. I shall keep it for a good occasion.', 'Noted. And appreciated.', 'I have a rule about gifts. I shall not tell you what it is.'),
  barks: { greet: ['Good day.', 'Order.'], work: ['Next.', 'Noted.'], chat: ['Quite so.'], argue: ['That is wrong, and I can show you why.'], sleep: ['zzz… order… zzz'], moods: {} },
};

export const dlgSusan = {
  id: 'dlg_susan',
  greetings: [
    { if: { activity: 'sleep' }, say: ['*asleep with a pen in her hand and three speeches on the floor*'] },
    { if: { firstMeeting: true }, say: ['Susan. The Liberty League. Hello!', 'You have the look of someone with an opinion. I am collecting opinions. They are cheaper than votes and nearly as useful.'] },
    { if: { rel: { affection: '>=30' } }, variants: [['There you are! I was just telling someone you\'d be sensible. Tea?']] },
    { if: {}, variants: [['Hello! Walk with me, I have eleven minutes.'], ['Yes? Ask me anything. Well. Almost anything.'], ['A voter! Or a journalist. Or both. Welcome.']] },
  ],
  farewells: [{ if: {}, variants: [['Lovely to meet you. Do vote, if you can bear it.'], ['Bye! Think about it. Properly.']] }],
  topics: [
    { id: 't_sus_party', label: '"What does the Liberty League want?"', keywords: ['party', 'league', 'liberty', 'want', 'platform', 'believe'], say: ['A state that is strong enough to protect people and modest enough not to follow them home. Lighter enforcement of small offences, fewer powers to watch, less regulation where it only costs.', 'And fewer wars. I would like the next war not to be our idea.'] },
    { id: 't_sus_risk', label: '"Isn\'t that risky?"', keywords: ['risk', 'risky', 'crime', 'safe', 'safety', 'danger'], say: ['Of course it is. Everything is. Lower enforcement could save money and lose response time. Less regulation could cut costs and let someone cut corners. I do not pretend otherwise.', 'The honest argument is not "no risk". It is whose risk, and who decides.'] },
    { id: 't_sus_vegas', label: '"What do you make of Josiah Vegas?"', keywords: ['vegas', 'josiah', 'order', 'rival', 'opponent'], say: ['Josiah believes every word. That is what makes him dangerous, and what makes him good at it.', 'I would rather lose to him on the argument than win on a technicality. I say that now. Ask me again after the count.'] },
    { id: 't_sus_who', label: '"Are you the President?"', keywords: ['president', 'government', 'power', 'office', 'halver'], say: ['Sometimes. Sund has a king who is eleven and a President who governs. Whoever sits in Halver House for a term, the other of us does the shouting. It keeps us both honest.'] },
    { id: 't_sus_tablet', label: '"Where can I read about the government?"', keywords: ['tablet', 'read', 'overview', 'politics', 'government', 'app'], say: ['Your tablet has a Politics page: who governs, the term, the date of the vote, where we differ. I wrote none of it, which is why it is fair.'], effects: [open('Politics')] },
  ],
  askPrompt: [['Ask me anything. Well. Almost anything.']],
  unknown: [['Ask me that when the cameras are off.'], ['Honestly? I do not know. I will find out, and then I will tell you something different.']],
  gift: gifts('Coffee! Strong. You are a person of judgement.', 'Oh, thank you. That is kind.', 'Thank you. Truly.', 'I... will find it a home. Possibly not mine.'),
  barks: { greet: ['Hello!', 'Hi.'], work: ['Right. Next.', 'Mm, yes.'], chat: ['Really? Go on.'], argue: ['No, look at the numbers.'], sleep: ['zzz… amendments… zzz'], moods: {} },
};

export default [dlgVegas, dlgSusan];
