// TEMPLATE — copy to src/content/dialogue/<name>.js and register in index.js.
// Write in the character's own voice. Keep the last greeting/farewell unconditional.
export default {
  id: 'dlg_example',
  greetings: [
    { if: { firstMeeting: true }, say: ['First-meeting introduction in their voice.'] },
    { if: { mood: 'irritable' }, variants: [['A line that shows the mood without changing who they are.']] },
    { if: { rel: { affection: '>=30' } }, variants: [['Warm greeting for friends.']] },
    { if: {}, variants: [['Default greeting A.'], ['Default greeting B.'], ['Default greeting C.']] },
  ],
  farewells: [{ if: {}, variants: [['Goodbye A.'], ['Goodbye B.']] }],
  topics: [
    {
      id: 't_example_about', label: '"Tell me about yourself."', keywords: ['yourself', 'you'],
      say: ['Page one.', 'Page two.'],
      repeat: [['Shorter line when asked again.']],
    },
    {
      id: 't_example_favour', label: '"Need a hand with anything?"', tag: 'quest',
      if: { quest: { id: 'q_example', state: 'not_started' } },
      say: ['Quest hook in their voice.'],
      effects: [{ quest: { id: 'q_example', start: true } }],
    },
  ],
  askAbout: [{ keywords: ['gulls'], say: ['Their take on gulls.'] }],
  askPrompt: [['How they invite a question.']],
  unknown: [['How they admit they don\'t know.'], ['A second variant.']],
  gift: { loved: [['…']], liked: [['…']], neutral: [['…']], disliked: [['…']], tooMany: [['…']], ownStolen: [['…']] },
  barks: { greet: ['…'], work: ['…'], chat: ['…'], argue: ['…'], sleep: ['…'], moods: {} },
};
