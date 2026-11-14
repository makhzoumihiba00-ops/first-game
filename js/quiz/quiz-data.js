// Quiz Mode — question data.
//
// Each category builds a fresh, randomized question set from the same
// datasets the learning stages use, so quiz content always matches what
// the child can learn in the app. Options are plain written choices
// (never A/B/C) and are shuffled per question.

import { alphabet } from '../data/alphabet.js';
import { colors } from '../data/colors.js';
import { animals } from '../data/animals.js';
import { fruitsVegetables } from '../data/fruits-vegetables.js';

export const QUIZ_SIZE = 10;
export const QUIZ_DURATION_MS = 5 * 60 * 1000;

export const QUIZ_CATEGORIES = [
  {
    id: 'alphabet', icon: '🔤', title: 'Alphabet', stageId: 'alphabet',
    tagline: 'Can you find all the letters?',
    accent: '#4F8DFD', deep: '#2C63D8', soft: '#E3EEFF',
  },
  {
    id: 'colors', icon: '🎨', title: 'Colors', stageId: 'colors',
    tagline: 'Name the rainbow colors!',
    accent: '#9B5CF6', deep: '#7038D6', soft: '#F1E7FF',
  },
  {
    id: 'animals', icon: '🦁', title: 'Animals', stageId: 'animals',
    tagline: 'Who is this cute friend?',
    accent: '#22B573', deep: '#0E8F58', soft: '#E2F8EE',
  },
  {
    id: 'food', icon: '🍎', title: 'Fruits & Vegetables', stageId: 'food',
    tagline: 'Yummy fruits and vegetables!',
    accent: '#FF8A3D', deep: '#E2661C', soft: '#FFEBDD',
  },
];

/* ------------------------- helpers ------------------------- */

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sample(list, n) {
  return shuffle(list).slice(0, n);
}

// Letters that look or sound alike make the kindest, most useful
// distractors for beginners (B/D/P, M/N/W, …).
const CONFUSABLE = {
  A: ['O', 'E', 'H'], B: ['D', 'P', 'R'], C: ['S', 'G', 'Q'], D: ['B', 'P', 'Q'],
  E: ['F', 'C', 'B'], F: ['E', 'T', 'V'], G: ['J', 'C', 'Q'], H: ['N', 'M', 'A'],
  I: ['L', 'J', 'E'], J: ['G', 'I', 'L'], K: ['R', 'X', 'B'], L: ['I', 'T', 'J'],
  M: ['N', 'W', 'H'], N: ['M', 'H', 'U'], O: ['Q', 'C', 'D'], P: ['B', 'D', 'R'],
  Q: ['O', 'G', 'D'], R: ['K', 'B', 'P'], S: ['Z', 'C', 'X'], T: ['I', 'F', 'L'],
  U: ['V', 'Y', 'N'], V: ['W', 'U', 'Y'], W: ['M', 'V', 'U'], X: ['K', 'Y', 'S'],
  Y: ['U', 'V', 'W'], Z: ['S', 'X', 'C'],
};

function letterDistractors(target, count = 2) {
  const preferred = shuffle(CONFUSABLE[target.letter] || []);
  const fill = shuffle(alphabet.map((x) => x.letter).filter((L) => L !== target.letter && !preferred.includes(L)));
  return [...preferred, ...fill]
    .slice(0, count)
    .map((L) => alphabet.find((x) => x.letter === L))
    .filter(Boolean);
}

// Options carry a `speech` form so feedback can name the answer aloud
// (letters use their phonetic name, e.g. M → "em").
function letterOptions(item) {
  const choices = shuffle([item, ...letterDistractors(item)]);
  return {
    options: choices.map((x) => ({ id: x.id, label: x.letter, speech: x.speech })),
    correctId: item.id,
  };
}

function nameOptions(item, pool) {
  const others = shuffle(pool.filter((x) => x.id !== item.id)).slice(0, 2);
  const choices = shuffle([item, ...others]);
  return {
    options: choices.map((x) => ({ id: x.id, label: x.name, speech: x.name })),
    correctId: item.id,
  };
}

/* ---------------------- question kinds ---------------------- */

const letterShow = (item) => ({
  key: `letter-show-${item.id}`,
  kind: 'letter-show',
  prompt: 'Which letter is this?',
  speech: 'Which letter is this?',
  item,
  ...letterOptions(item),
});

// Listening question: the voice names the letter, the child picks it.
// The displayed prompt stays generic so reading it never gives away the answer.
const letterListen = (item) => ({
  key: `letter-listen-${item.id}`,
  kind: 'letter-listen',
  prompt: 'Listen… which letter is it?',
  speech: `Find the letter ${item.speech}.`,
  item,
  ...letterOptions(item),
});

const colorQuestion = (item) => ({
  key: `color-${item.id}`,
  kind: 'color',
  prompt: 'Which color is this?',
  speech: 'Which color is this?',
  item,
  ...nameOptions(item, colors),
});

const animalQuestion = (item) => ({
  key: `animal-${item.id}`,
  kind: 'animal',
  prompt: 'Which animal is this?',
  speech: 'Which animal is this?',
  item,
  ...nameOptions(item, animals),
});

const foodQuestion = (item) => ({
  key: `food-${item.id}`,
  kind: 'food',
  prompt: 'What is this?',
  speech: 'What is this?',
  item,
  ...nameOptions(item, fruitsVegetables),
});

/* ------------------------ entry point ------------------------ */

export function buildQuestions(categoryId, size = QUIZ_SIZE) {
  switch (categoryId) {
    case 'alphabet': {
      const letters = sample(alphabet, size);
      // Alternate the two question types, then shuffle so the mix feels lively.
      return shuffle(letters.map((x, i) => (i % 2 === 0 ? letterShow(x) : letterListen(x))));
    }
    case 'colors':
      return sample(colors, Math.min(size, colors.length)).map(colorQuestion);
    case 'animals':
      return sample(animals, size).map(animalQuestion);
    case 'food':
      return sample(fruitsVegetables, size).map(foodQuestion);
    default:
      return [];
  }
}
