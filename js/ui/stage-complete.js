// Stage completion overlay: congratulations, confetti, and the large
// "Continue to <next stage>" button. Shown on top of the stage screen.

import { el, navigateTo } from '../systems/navigation.js';
import { fx } from '../systems/animations.js';
import { audioEngine } from '../systems/audio.js';

export function showStageComplete({ title, message, nextLabel, nextIcon, onContinue }) {
  const root = document.getElementById('overlays');
  const overlay = el('div', { class: 'overlay stage-complete-overlay' });

  const continueBtn = el('button', { class: 'btn btn-big', type: 'button' }, [`${nextIcon} Continue to ${nextLabel} →`]);
  const homeBtn = el('button', { class: 'btn-link', type: 'button', text: '🏠 Back to home' });

  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'modal-art', 'aria-hidden': 'true', text: '🎉⭐️🎉' }),
    el('h2', { text: title }),
    el('p', { class: 'modal-text', text: message }),
    continueBtn,
    homeBtn,
  ]);

  overlay.append(modal);
  root.append(overlay);
  fx.popIn(modal);
  fx.confetti(overlay, { count: 110, duration: 2.6 });
  fx.stars(overlay, { count: 8 });

  continueBtn.addEventListener('click', () => {
    continueBtn.disabled = true;
    audioEngine.playEffect('pop');
    onContinue && onContinue();
  });
  homeBtn.addEventListener('click', () => {
    homeBtn.disabled = true;
    audioEngine.playEffect('click');
    navigateTo('home');
  });
}
