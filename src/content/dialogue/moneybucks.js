// Dialogue for Sir Richard E. Moneybucks, Esq. (imported character).
// Voice: old money, grandiose, "my good fellow", speaks of himself as
// "Sir Moneybucks", everything is a transaction, open contempt for the poor.
// Status tiers (see docs/characters/npc_moneybucks.md):
//   MEANS  — wealth >= 150, 10+ shares, or beat him at the Ledger
//   USEFUL — wealth >= 40, a refinery job, or any shares
//   (otherwise) beneath his notice
export const MEANS = { any: [{ wealth: '>=150' }, { oil: { sharesOwned: '>=10' } }, { flag: 'ledger_won' }] };
export const USEFUL = { any: [{ wealth: '>=40' }, { flag: 'refinery_hired' }, { oil: { sharesOwned: '>=1' } }, MEANS] };
const POOR = { not: USEFUL };
const PROOF = { playerKnows: 'fact_moneybucks_bought_seal', any: [{ playerKnows: 'fact_lens_in_vault' }, { hasItem: 'item_great_lens' }] };

export default {
  id: 'dlg_moneybucks',
  greetings: [
    {
      if: { firstMeeting: true, ...POOR },
      say: [
        'Hm? Who let THAT in?',
        'Sir Richard E. Moneybucks, Esquire. Founder, owner and benefactor of Ober\'s Oil. You may address me as Sir Moneybucks. You may also not address me at all, which I should prefer.',
      ],
    },
    {
      if: { firstMeeting: true },
      say: [
        'Ah. A new face — and, by the cut of you, a face with a little money behind it. Promising.',
        'Sir Richard E. Moneybucks, Esquire. Ober\'s Oil. You will have heard. Everyone has heard. I see to it.',
      ],
    },
    {
      if: { knows: 'fact_player_exposed_moneybucks' },
      variants: [
        ['You. The little reformer. Do enjoy your lighthouse, my good fellow. I hope it keeps you warm when Lanternside runs out of things I haven\'t bought.'],
        ['The crusader returns. Sir Moneybucks never forgets a debt, my good fellow. He merely compounds it.'],
      ],
    },
    {
      if: { knows: 'fact_player_stole_lens' },
      say: ['Something has gone missing from my vault. I mention it to everyone. Everyone. Today. Do you know why I mention it to you, my good fellow?'],
    },
    {
      if: { knows: 'fact_player_backed_strike' },
      say: ['Ah — the strike\'s patron saint. Charity, my good fellow, is merely poverty with better manners.'],
    },
    { if: { mood: 'affronted' }, variants: [['I am in no humour for the lower orders today. Or the middle ones.'], ['Insolence everywhere. EVERYWHERE. What do you want?']] },
    { if: { activity: 'sleep' }, say: ['…compound… interest… *snore*'] },
    {
      if: MEANS,
      variants: [
        ['My good fellow! Do sit. Well — stand, but expensively.'],
        ['Ah, a fellow person of means. One can always tell. It is the posture.'],
        ['There you are. Sir Moneybucks was just saying — to himself, the only audience worth having — that you show promise.'],
      ],
    },
    {
      if: USEFUL,
      variants: [
        ['Yes, yes, my good fellow. Business, then. Briefly.'],
        ['You again. Useful people may have two minutes. Go.'],
      ],
    },
    {
      if: {},
      variants: [
        ['Run along. Poverty is contagious.'],
        ['Do I know you? No. Excellent.'],
        ['If you are selling something, I already own it. If you are begging, I own the street you are begging on.'],
      ],
    },
  ],
  farewells: [
    { if: MEANS, variants: [['Good day, my good fellow. Do keep getting richer. It suits you.'], ['Off you go. Make money. It is the only honest pastime.']] },
    { if: {}, variants: [['Yes, yes. Off you go.'], ['Crisp will see you out. Crisp sees everyone out. It is his gift.'], ['Mind the carpet. It is worth more than you are.']] },
  ],
  topics: [
    {
      id: 't_mb_who', label: '"Who are you, exactly?"', keywords: ['who', 'yourself', 'moneybucks'],
      say: [
        'Sir Richard E. Moneybucks, Esquire. The "E" stands for Enterprise. It does not, but it should.',
        'Twenty years ago I put a drill into a field of cabbages east of this borough. Black gold came up, and the cabbages went down, and so did the farmer\'s asking price. Ober\'s Oil, my good fellow. I named it after the world — I intend to own a respectable portion of it.',
      ],
      effects: [{ learn: 'fact_moneybucks_owns_oil' }],
      repeat: [['As I said: Sir Moneybucks. Ober\'s Oil. Do try to keep up.']],
    },
    {
      id: 't_mb_business_poor', label: '"Tell me about Ober\'s Oil."', keywords: ['oil', 'company', 'refinery', 'business'],
      if: POOR,
      say: ['It is a company. It makes money. You would not recognise either.', 'If you want work, Slate at the refinery hires day labour. Muscle is cheap. That is rather the point of it.'],
      effects: [{ learn: 'fact_moneybucks_owns_oil' }],
    },
    {
      id: 't_mb_business', label: '"Tell me about Ober\'s Oil."', keywords: ['oil', 'company', 'refinery', 'business'],
      if: USEFUL,
      say: [
        'Three derricks, one refinery, a fleet of barrels and a great many people who should be grateful.',
        { if: { oil: { strike: true } }, text: 'Currently producing NOTHING, because the people who should be grateful have decided to be difficult.' },
        { if: { oil: { strike: false } }, text: 'We pumped a satisfying quantity yesterday. We shall pump more tomorrow. That is the entire philosophy, my good fellow. More.' },
        'Shareholders are paid every evening at six, from real barrels. I do not deal in promises. I deal in crude.',
      ],
      effects: [{ learn: 'fact_moneybucks_owns_oil' }],
    },
    {
      id: 't_mb_invest', label: '"I\'d like to invest in Ober\'s Oil."', tag: 'quest', keywords: ['invest', 'shares', 'stock'],
      if: USEFUL,
      say: [
        { if: { wealth: '<30' }, text: 'With what, my good fellow? Lint? Come back when your pockets rattle.' },
        { if: { wealth: '>=30' }, text: 'Splendid. A share in Ober\'s Oil is a share in the future, and the future, I assure you, is mine. Miss Thornbury keeps the register — but I happen to carry certificates. One never knows when greed will strike.' },
        { if: { wealth: '>=30' }, text: 'And if you want a bigger bite: the company has projects in need of capital. Derricks. A pipeline. Something Calder calls "safety".', effects: [{ action: 'invest' }] },
      ],
    },
    {
      id: 't_mb_invest_poor', label: '"I\'d like to invest in Ober\'s Oil."', keywords: ['invest', 'shares'],
      if: POOR,
      say: ['You. Invest. In ME.', 'Ha! Ha. No. Come back with forty obols and a better hat.'],
    },
    {
      id: 't_mb_challenge', label: '"I hear you play cards."', tag: 'quest', keywords: ['cards', 'challenge', 'ledger', 'wager', 'game'],
      if: { not: { flagToday: 'ledger_played' } },
      say: [
        { if: POOR, text: 'I play cards with gentlemen, my good fellow. You are wearing… whatever that is.' },
        { if: USEFUL, text: 'The Ledger. A gentlemen\'s wager. Three hands, twenty obols a side, and ties go to the house — I am the house.' },
        { if: USEFUL, text: 'We play at my card table, in my study, under my rules. Accept with the proper form, or not at all.' },
      ],
      choices: [
        {
          id: 'c_ledger_accept', label: '"I accept your challenge, Sir Moneybucks."',
          if: USEFUL,
          require: { map: 'manor', money: '>=20', time: { from: '15:30', to: '21:00' } },
          lockedHint: 'He only plays at the card table in his study (15:30–21:00), with 20 obols on the table.',
          say: ['Splendid. Crisp! The good deck. The other good deck.', 'Sit. Lose gracefully. It is the only grace available to you.'],
          effects: [{ action: 'ledger' }],
        },
        {
          id: 'c_ledger_rude', label: '"Deal \'em, Moneybags."',
          if: USEFUL,
          say: ['MONEYBAGS?', 'The challenge is withdrawn. Sir Moneybucks does not play cards with people who cannot pronounce him. Crisp! The door. Their side of it.'],
          effects: [{ rel: { respect: -10, trust: -5 } }, { mood: { id: 'affronted', minutes: 240 } }, { flag: { ledger_played: '$day' } }, { memory: { text: '{player} called me Moneybags. MONEYBAGS.', tag: 'moneybags', importance: 6 } }],
          end: true,
        },
        { id: 'c_ledger_decline', label: '"Perhaps another time."', if: USEFUL, say: ['Cowardice is very sensible. I respect it slightly.'] },
      ],
    },
    {
      id: 't_mb_strike', label: '"About the strike…"', tag: 'quest', keywords: ['strike', 'workers', 'picket'],
      if: { oil: { strike: true } },
      say: ['The STRIKE. My own workers, standing at my own gate, refusing my own wages. The ingratitude is almost artistic.'],
      choices: [
        {
          id: 'c_strike_wages', label: '"Pay them what they\'re owed. It ends today."',
          require: { any: [{ oil: { sharesOwned: '>=10' } }, { rel: { respect: '>=20' } }] },
          lockedHint: 'He won\'t take advice from a nobody — own 10+ shares or earn his respect.',
          check: { stat: 'charm', base: 0.35, relScale: { respect: 0.006, trust: 0.004 } },
          say: ['…Higher wages. Lower dividends. Your dividends included, my good fellow — remember that when you count them.', 'Very well. Tell Brandt the company has been GENEROUS. Use that word.'],
          effects: [
            { oil: { set: { strike: false, wageLevel: 2 }, add: { morale: 35 } } }, { flag: { refinery_strike: false } },
            { relNpc: { from: 'npc_otto', to: 'player', trust: 15, affection: 10 } }, { relNpc: { from: 'npc_ruby', to: 'player', trust: 8 } },
            { rel: { respect: -2 } }, { rep: { fac_quay: 6, lanternside: 3 } },
            { npcMemory: { npc: 'npc_otto', text: '{player} got Moneybucks to pay up. Didn\'t think anyone could.', tag: 'strike_won', about: 'player', importance: 8 } },
            { notify: 'The strike is over: wages raised. Dividends will be a little lower.' },
          ],
          fail: { say: ['Absolutely not. I did not become rich by paying people.'], effects: [{ rel: { respect: -3 } }] },
        },
        {
          id: 'c_strike_break', label: '"Let me help you end it. Your way."',
          say: ['NOW you\'re talking like a person of enterprise.', 'Silas! Clear my gate. Gently, if the newspapers are watching. Otherwise, efficiently.'],
          effects: [
            { errand: { npc: 'npc_silas', spot: 'ober_fields:picket_2', activity: 'strikebreak', minutes: 60 } },
            { oil: { set: { strike: false }, add: { morale: -25 } } }, { flag: { refinery_strike: false } },
            { npcLearn: 'fact_player_broke_strike' }, { tell: { npc: 'npc_otto', fact: 'fact_player_broke_strike' } },
            { tell: { npc: 'npc_ruby', fact: 'fact_strike_broken' } }, { tell: { npc: 'npc_otto', fact: 'fact_strike_broken' } },
            { npcMood: { npc: 'npc_otto', id: 'grumpy', minutes: 1440 } },
            { notify: 'The strike is broken. The workers go back — and they will remember who helped.', notifyKind: 'warn' },
          ],
        },
        { id: 'c_strike_nothing', label: '"Just asking."', say: ['Then stop asking and start owning something.'] },
      ],
    },
    {
      id: 't_mb_lighthouse', label: '"What do you know about the lighthouse?"', keywords: ['lighthouse', 'lamp', 'lens', 'point'],
      if: { not: PROOF },
      say: ['A navigational relic. Lights cost money. Darkness is free. I approve of darkness, my good fellow — it is the cheapest commodity on earth.'],
      repeat: [['I have told you. Darkness: free. Next question.']],
    },
    {
      id: 't_mb_confront', label: '"\'M.\' — that was you. The seal, the lens, the dark bay."', tag: 'quest', keywords: ['m.', 'seal', 'vault', 'lens'],
      if: { quest: { id: 'q_seal_of_m', stage: 'decide' }, ...PROOF, notFlag: 'mb_warned' },
      say: [
        '…Miss Thornbury keeps excellent books. Too excellent. I shall have to promote her somewhere very far away.',
        'Very well. Yes. A lit bay is a watched bay, and a watched bay is a TAXED bay. I bought the Harbourmaster\'s old seal at auction for eleven obols, wrote one letter, and the darkness came free. Best investment I ever made.',
        'So, my good fellow. What is it you want? Everyone wants something. That is the only thing I truly believe in.',
      ],
      choices: [
        {
          id: 'c_mb_blackmail', label: '"My silence costs 150 obols."',
          say: ['Blackmail. How… entrepreneurial.', 'One hundred and fifty. Count it. Then spend it quickly, my good fellow — money has a way of finding its way home to me.'],
          effects: [
            { money: 150 }, { rel: { trust: -50, suspicion: 60, respect: 8 } }, { flag: { mb_blackmailed: true } },
            { memory: { text: '{player} blackmailed me over the lighthouse. Noted. Compounded.', tag: 'blackmailed', importance: 10 } },
            { quest: { id: 'q_seal_of_m', complete: 'blackmailed' } },
          ],
          end: true,
        },
        {
          id: 'c_mb_deal', label: '"Make me a partner, and it stays buried."',
          say: ['A partner! Ha! Now THAT is the most sensible thing anyone in Lanternside has ever said to me.', 'Fifteen shares, my good fellow, and the run of my house. Welcome to the right side of the ledger.'],
          effects: [
            { oil: { add: { sharesOwned: 15 } } }, { flag: { manor_invited: true, mb_secret_kept: true } },
            { rel: { trust: 15, respect: 15, affection: 5 } }, { rep: { fac_oil: 15 } },
            { memory: { text: '{player} chose profit over the lighthouse. A sound mind.', tag: 'partner', importance: 9 } },
            { quest: { id: 'q_seal_of_m', complete: 'bargained' } },
          ],
        },
        {
          id: 'c_mb_warn', label: '"I\'m taking this to Osric."',
          say: ['Do. The Civic Office has one employee and no budget. I have both of those, and more. Run along to your clerk, my good fellow.'],
          effects: [{ rel: { trust: -15, suspicion: 30 } }, { mood: { id: 'affronted', minutes: 300 } }, { flag: { mb_warned: true } }],
          end: true,
        },
      ],
    },
    {
      id: 't_mb_workers', label: '"How do you treat your workers?"', keywords: ['workers', 'wages', 'staff', 'pay'],
      say: [
        'Generously. They have work. Some of them have two.',
        'Wages are paid in full — partly in obols and partly in company scrip, which is accepted at the company store at very reasonable prices. Reasonable to me.',
      ],
      effects: [{ learn: 'fact_workers_grievances' }],
    },
    {
      id: 't_mb_buyout', label: '"Why do you want the Kettle & Crumb?"', keywords: ['cafe', 'kettle', 'mags', 'buy'],
      if: { any: [{ playerKnows: 'fact_buyout_offer' }, { knows: 'fact_buyout_offer' }] },
      say: ['Location, my good fellow. The best corner on Canal Row. And — one can admit it among friends — the honey buns.', 'Mrs. Pell refused. They always refuse. Then the rent goes up, the suppliers get busy, the gulls get bolder… and then they stop refusing.'],
    },
  ],
  askAbout: [
    { keywords: ['gull', 'gulls'], say: ['Vermin. I posted a bounty. They appear to have unionised.'] },
    { keywords: ['money', 'rich', 'wealth'], say: ['Money is simply the score, my good fellow. And I am winning.'] },
    { keywords: ['cigar', 'cigars'], say: ['Ober Imperials. Rolled by hand, banded in gold, priced to keep the riffraff coughing on cheaper smoke.'] },
    { keywords: ['obermere', 'city'], say: ['I own a district of it. Several streets have my name on them. On the deeds.'] },
    { keywords: ['osric', 'clerk', 'vane'], say: ['Vane sends me forms. I have a man who burns them. It is his whole job, and he is very good at it.'] },
    { keywords: ['union', 'otto', 'blue thread'], say: ['There is no union on my land. There is a pipe fitter with a thread on his cuff and a short future.'] },
    { keywords: ['monocle', 'hat', 'moustache'], say: ['The monocle is gold. The hat is silk. The moustache is earned.'] },
  ],
  askPrompt: [['Make it quick, my good fellow. Sir Moneybucks bills by the minute.']],
  unknown: [
    ['If I have not heard of it, it is not worth money, and therefore not worth hearing of.'],
    ['I have people who know things like that. I do not pay them to tell you.'],
  ],
  gift: {
    loved: [['An Ober Imperial! You have taste — or you stole it. Either way, Sir Moneybucks approves.']],
    liked: [['Adequate. I shall have Crisp file it under "tribute".']],
    neutral: [['What is this? Give it to Crisp. Crisp! Here is a thing.']],
    disliked: [['Peasant food. In MY house. Remove it, and possibly yourself.']],
    tooMany: [['Steady on, my good fellow. I shall begin to suspect you want something. Which you do. Everyone does.']],
    ownStolen: [['That is MY cigar. From MY desk. You are a thief — a bold one. I almost respect it. Almost.']],
  },
  barks: {
    greet: ['Hm.', 'My good fellow.', 'Mind the carpet.'],
    work: ['Profit is a moral duty.', 'Crisp! My other monocle!', 'Buy low. Sell to Lanternside.'],
    patrol: ['Faster, gentlemen! The oil will not drill itself. Well — it does. But faster!', 'Every minute idle is a minute I am robbed.'],
    business: ['Lovely harbour. Should be mine.', 'That café. That corner. Mine.'],
    eat: ['Caviar again. How tiresome.', 'Crisp, the toast is insufficiently golden.'],
    leisure: ['Ties go to the house.', 'Cards are merely business with better lighting.'],
    sleep: ['…compound interest… *snore*'],
    chat: ['Indeed, indeed.', 'Quite.', 'I shall buy it.', 'And what does it cost?'],
    argue: ['How DARE you.', 'My solicitors will hear of this!', 'I could buy you. Twice.'],
    moods: { affronted: ['Insolence!', 'The NERVE.'], content: ['Splendid. Splendid.'] },
  },
};
