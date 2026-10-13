// Temporary emotional states. Moods change how a character expresses
// themselves and modify persuasion odds; they never rewrite personality.
export const MOODS = {
  neutral: { label: 'Neutral', persuasion: 0, icon: '' },
  content: { label: 'Content', persuasion: 0.08, icon: '♪' },
  cheerful: { label: 'Cheerful', persuasion: 0.1, icon: '☀' },
  irritable: { label: 'Irritable', persuasion: -0.18, icon: '💢' },
  flustered: { label: 'Flustered', persuasion: -0.12, icon: '💦' },
  sheepish: { label: 'Sheepish', persuasion: 0.05, icon: '😅' },
  grumpy: { label: 'Grumpy', persuasion: -0.12, icon: '☁' },
  affronted: { label: 'Affronted', persuasion: -0.25, icon: '!' },
  tired: { label: 'Tired', persuasion: -0.05, icon: 'z' },
};
