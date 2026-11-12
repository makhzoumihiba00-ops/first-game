// Stage 1 — Alphabet. Letters are rendered with large colorful typography;
// speech text is the letter itself, so it is pronounced as a letter name.

import { alphabet } from '../data/alphabet.js';
import { el } from '../systems/navigation.js';

const LETTER_COLORS = ['#FF5E5B', '#FF9F1C', '#2ECC8F', '#3FA9F5', '#9B6CF7', '#F0689D'];
const colorFor = (item) => LETTER_COLORS[alphabet.indexOf(item) % LETTER_COLORS.length];

export const alphabetStage = {
  id: 'alphabet',
  icon: '🔤',
  title: 'Alphabet',
  heading: 'The Alphabet A – Z',
  sub: 'Tap any letter to hear its English name!',
  items: alphabet,
  previewPlaceholder: '👆 Tap a letter!',

  completeTitle: 'Alphabet Completed!',
  completeMessage: 'You explored all 26 letters. Amazing work!',

  // Phonetic letter names ("zee", "ay"…) guarantee an English letter-name
  // pronunciation regardless of how the speech engine reads single characters.
  speechFor: (item) => item.speech || item.letter,
  nameFor: (item) => `Letter ${item.letter}`,
  ariaLabel: (item) => `Letter ${item.letter}`,

  cardFor: (item) => el('span', { class: 'letter-big', style: `color:${colorFor(item)}`, text: item.letter }),
  previewFor: (item) => el('span', { class: 'letter-huge', style: `color:${colorFor(item)}`, text: item.letter }),
};
