// Final game completion screen — animated trophy, confetti, floating stars,
// accurate learning totals, Play Again (with confirmation) and Home.

import { el, navigateTo, showConfirm } from '../systems/navigation.js';
import { state } from '../state.js';
import { fx } from '../systems/animations.js';
import { audioEngine } from '../systems/audio.js';
import { totalStats } from '../systems/progress.js';

export function buildGameCompleteScreen() {
  const totals = totalStats();

  const trophyWrap = el('div', { class: 'trophy-wrap' }, [
    el('span', { class: 'trophy', 'aria-hidden': 'true', text: '🏆' }),
  ]);

  const statsCard = el('div', { class: 'stats-card' }, [
    el('div', { class: 'stat-total-line' }, [
      el('span', { class: 'stat-total', text: String(totals.explored) }),
      el('span', { class: 'stat-total-label', text: 'items learned' }),
    ]),
    ...totals.stages.map((stage) =>
      el('div', { class: 'stat-row' }, [
        el('span', { class: 'stat-left' }, [
          el('span', { 'aria-hidden': 'true', text: stage.icon }),
          el('span', { text: stage.label }),
        ]),
        el('span', { class: 'stat-check', text: `✓ ${stage.explored}/${stage.total}` }),
      ])
    ),
  ]);

  const againBtn = el('button', { class: 'btn btn-big', type: 'button', text: '🔄 Play Again' });
  const homeBtn = el('button', { class: 'btn btn-soft', type: 'button', text: '🏠 Home' });

  const screen = el('section', { class: 'game-complete' }, [
    trophyWrap,
    el('h1', { class: 'gc-title', text: 'Congratulations!' }),
    el('p', { class: 'gc-sub', text: 'You Completed English Adventure!' }),
    statsCard,
    el('div', { class: 'gc-actions' }, [againBtn, homeBtn]),
  ]);

  againBtn.addEventListener('click', () => {
    showConfirm({
      title: 'Play again?',
      message: 'This will erase all learning progress and start a brand-new adventure!',
      confirmLabel: 'Yes, start over',
      cancelLabel: 'Cancel',
      danger: true,
      onConfirm: () => {
        state.reset();
        navigateTo('home');
      },
    });
  });

  homeBtn.addEventListener('click', () => navigateTo('home'));

  // Celebration runs after the screen is attached to the DOM.
  setTimeout(() => {
    fx.trophyBounce(trophyWrap);
    fx.confetti(screen, { count: 150, duration: 3 });
    fx.stars(screen, { count: 10 });
    audioEngine.playEffect('fanfare');
  }, 300);

  return screen;
}
