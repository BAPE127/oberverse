// Emergence (v0.97.0): optional things that turn up because of what the world is doing. Pure data. Nothing here is mandatory, none gates any system, and every one
// that goes unanswered ends with a stated reason. Rewards are reputation, a person's trust or a country's regard: never cash. Each template is a condition on the
// world (the checks are in src/systems/politicsEmergence.js) and a way to answer.

export const EMERGENCE = {
  /** On day % every === offset the world may offer you something: at most `maxOpen` at once, each template at most every `cooldown` days, with this hashed chance; open for `expiresIn` days. */
  every: 7, offset: 3, maxOpen: 2, cooldown: 40, chance: 0.6, expiresIn: 12, kept: 12,
  /** What a good answer earns. */
  reward: { rep: 1, trust: 3, regard: 10, regardDecay: 0.25 },
  templates: {
    farmer_fee: { icon: '🌾', title: 'The farmers want a word', kind: 'act',
      text: 'A farmer from Lariat says the inspection fee is eating the harvest. Will you put their case to the Minister of Agriculture (ask the cabinet to take up lighter farm inspection)?',
      where: 'Influence → the Minister of Agriculture → "Ask them to take up a policy".', done: 'You put the farmers\' case. They will remember it.', gone: 'The inspection fee is gone, and the farmers with it.' },
    contractor_meeting: { icon: '📐', title: 'A contractor wants a meeting', kind: 'act',
      text: 'A contractor who sells to the Space Office wants to meet the Minister of Defence & Security, and would like you to ask: a meeting with the Minister would do.',
      where: 'Influence → the Minister of Defence & Security → "Ask for a meeting".', done: 'The Minister saw you; the contractor says thank you.', gone: 'The contractor found another way in.' },
    journalist_lead: { icon: '🗞️', title: 'A journalist offers a lead', kind: 'choice',
      text: 'A journalist has a lead on the scandal at {party}: "a document, or half of one". Do you pass it to the press? It is an allegation until someone checks it.',
      yes: 'Pass it on', no: 'Not mine to pass', done: 'The press run it as an allegation. Your name is not on it.', gone: 'The story went cold.' },
    embassy_talks: { icon: '🤝', title: 'Trade talks at the embassy', kind: 'choice',
      text: 'The ambassador of {country} invites you to informal talks on trade. They think well of Sund this season. Nothing is promised.',
      yes: 'Attend the talks', no: 'Send regrets', done: 'The talks went well: {country} thinks better of Sund for a while.', fail: 'The talks went nowhere: {country} is a little cooler.', gone: 'The ambassador was recalled.' },
    organisers_invite: { icon: '📣', title: 'The organisers ask you to the square', kind: 'act',
      text: 'The organisers of the demonstration in Sovereign Square ({cause}) would like to hear you speak, or see you support them: your choice, either counts.',
      where: 'World → the demonstration → "Speak for talks" or "Support the organisers".', done: 'You showed your face. The organisers noted it.', gone: 'The demonstration is over.' },
  },
  /** The weekly forecast and opinion piece: at most one a week, only when there is something to say. */
  news: { every: 7, offset: 5 },
  /** Opinion pieces a columnist might write about a policy in force. */
  columnists: ['"{policy}", writes a columnist, "is the sort of thing a government does when it has run out of other things."', '"{policy} will be judged," says a columnist, "by who is still angry in a year."', 'A columnist on {policy}: "Nobody asked, and everybody will have an opinion."'],
};
