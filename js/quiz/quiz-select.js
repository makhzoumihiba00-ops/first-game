// Quiz category picker — the "Quiz Time!" hub. One beautiful card per
// learning category, each showing the child's best result as motivation.

import { el, navigateTo } from '../systems/navigation.js';
import { audioEngine } from '../systems/audio.js';
import { fx } from '../systems/animations.js';
import { logoWord } from '../ui/home.js';
import { QUIZ_CATEGORIES, QUIZ_SIZE } from './quiz-data.js';
import { loadBest, bestLabel } from './quiz-session.js';
import { quizSpeech } from './quiz-speech.js';

const DECORATIONS = [
  { emoji: '🧩', left: '6%', top: '12%', size: '44px' },
  { emoji: '⭐', left: '90%', top: '10%', size: '36px' },
  { emoji: '✨', left: '16%', top: '58%', size: '30px' },
  { emoji: '🎈', left: '88%', top: '66%', size: '42px' },
  { emoji: '❓', left: '78%', top: '34%', size: '34px' },
];

export function buildQuizSelectScreen() {
  const screen = el('section', { class: 'quiz-select-screen' });

  const deco = el('div', { class: 'deco-layer', 'aria-hidden': 'true' });
  DECORATIONS.forEach((d, i) => {
    deco.append(el('span', { class: 'deco-item', text: d.emoji, style: `left:${d.left};top:${d.top};font-size:${d.size};--i:${i}` }));
  });

  const homeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back to home' }, ['🏠']);
  homeBtn.addEventListener('click', () => {
    audioEngine.playEffect('click');
    navigateTo('home');
  });

  const grid = el('div', { class: 'quiz-grid' });
  QUIZ_CATEGORIES.forEach((cat) => {
    const best = loadBest(cat.id);

    const card = el('button', {
      class: 'quiz-card',
      type: 'button',
      'data-cat': cat.id,
      style: `--card-accent:${cat.accent};--card-soft:${cat.soft}`,
      'aria-label': best
        ? `${cat.title} quiz — best ${best.stars} stars`
        : `${cat.title} quiz`,
    }, [
      el('span', { class: 'quiz-card-blob', 'aria-hidden': 'true', text: cat.icon }),
      el('span', { class: 'quiz-card-name', text: cat.title }),
      el('span', { class: 'quiz-card-meta', text: `📝 ${QUIZ_SIZE} questions · ⏰ 5 min` }),
      el('span', { class: `quiz-card-best${best ? ' won' : ''}`, text: best ? `🏅 Best: ${bestLabel(best)}` : '✨ Not tried yet' }),
    ]);

    card.addEventListener('click', () => {
      audioEngine.playEffect('pop');
      navigateTo('quiz', { categoryId: cat.id });
    });

    grid.append(card);
  });

  const hero = el('div', { class: 'quiz-select-hero' }, [
    el('h1', { class: 'logo' }, [logoWord('Quiz Time!')]),
    el('p', { class: 'tagline', text: 'Pick a quiz, listen carefully and win stars! ⭐' }),
    grid,
  ]);

  screen.append(
    deco,
    el('div', { class: 'select-top' }, [homeBtn]),
    hero,
    el('p', { class: 'home-foot', text: '4 fun quizzes · made with 💙' })
  );

  fx.logoLetters([...screen.querySelectorAll('.logo-letter')]);
  fx.buttonsIn([...grid.children]);

  setTimeout(() => {
    if (screen.isConnected) quizSpeech.say('Choose a quiz and win stars!');
  }, 500);

  return screen;
}
