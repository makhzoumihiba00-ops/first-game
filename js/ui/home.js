// Home screen — logo, Play/Continue button, sound toggle, per-stage
// progress overview with locked/unlocked states, floating decorations.

import { el, navigateTo, showToast, showConfirm } from '../systems/navigation.js';
import { state, STAGES } from '../state.js';
import { audioEngine } from '../systems/audio.js';
import { fx } from '../systems/animations.js';
import { stageStats, totalStats } from '../systems/progress.js';

const LOGO_COLORS = ['#FF5E5B', '#FF9F1C', '#FFC93C', '#2ECC8F', '#3FA9F5', '#9B6CF7'];

const DECORATIONS = [
  { emoji: '🎈', left: '6%', top: '16%', size: '46px' },
  { emoji: '⭐', left: '88%', top: '12%', size: '38px' },
  { emoji: '🦁', left: '9%', top: '68%', size: '50px' },
  { emoji: '🍎', left: '89%', top: '62%', size: '44px' },
  { emoji: '🎨', left: '77%', top: '84%', size: '40px' },
  { emoji: '🌈', left: '4%', top: '42%', size: '44px' },
  { emoji: '🔤', left: '92%', top: '36%', size: '36px' },
  { emoji: '✨', left: '20%', top: '8%', size: '32px' },
];

function logoWord(word, offset = 0) {
  return el('span', { class: 'logo-word' },
    [...word].map((ch, i) => el('span', {
      class: 'logo-letter',
      text: ch,
      style: `color:${LOGO_COLORS[(i + offset) % LOGO_COLORS.length]}`,
    }))
  );
}

export function buildHomeScreen() {
  const screen = el('section', { class: 'home-screen' });

  const deco = el('div', { class: 'deco-layer', 'aria-hidden': 'true' });
  DECORATIONS.forEach((d, i) => {
    deco.append(el('span', { class: 'deco-item', text: d.emoji, style: `left:${d.left};top:${d.top};font-size:${d.size};--i:${i}` }));
  });

  const soundBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Toggle sound' }, [state.soundEnabled ? '🔊' : '🔇']);
  soundBtn.addEventListener('click', () => {
    const enabled = !state.soundEnabled;
    state.setSoundEnabled(enabled);
    audioEngine.setEnabled(enabled);
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    if (enabled) audioEngine.playEffect('pop');
  });

  const totals = totalStats();
  const primaryLabel = state.gameCompleted
    ? '🔄 Play Again'
    : state.hasProgress()
      ? '▶️ Continue'
      : '▶️ Play';

  const primaryBtn = el('button', { class: 'btn btn-hero', type: 'button', text: primaryLabel });
  primaryBtn.addEventListener('click', () => {
    audioEngine.playEffect('pop');
    if (state.gameCompleted) {
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
      return;
    }
    const target = state.isUnlocked(state.currentStage) ? state.currentStage : 'alphabet';
    navigateTo('stage', { stageId: target });
  });

  const chips = el('div', { class: 'stage-chips' });
  STAGES.forEach((def) => {
    const stats = stageStats(def.id);
    const locked = !state.isUnlocked(def.id);
    const status = locked ? '🔒 Locked' : stats.complete ? '✓ Completed' : `${stats.explored} / ${stats.total}`;

    const chip = el('button', {
      class: `stage-chip${locked ? ' locked' : ''}${stats.complete ? ' complete' : ''}`,
      type: 'button',
      'aria-label': locked ? `${def.label} — locked` : `${def.label} — ${stats.explored} of ${stats.total} explored`,
    }, [
      el('span', { class: 'chip-icon', 'aria-hidden': 'true', text: def.icon }),
      el('span', { class: 'chip-name', text: def.label }),
      el('span', { class: 'chip-status', text: status }),
    ]);

    chip.addEventListener('click', () => {
      if (locked) {
        audioEngine.playEffect('deny');
        fx.shake(chip);
        showToast('Finish the earlier stages to unlock this one! 🔒');
        return;
      }
      audioEngine.playEffect('pop');
      navigateTo('stage', { stageId: def.id });
    });

    chips.append(chip);
  });

  const hero = el('div', { class: 'home-hero' }, [
    el('h1', { class: 'logo' }, [logoWord('English'), logoWord('Adventure', 2)]),
    el('p', { class: 'tagline', text: 'Learn English step by step — letters, colors, animals and yummy food!' }),
    el('span', { class: 'home-progress-pill' }, [`${totals.explored} / ${totals.total} items learned`]),
    primaryBtn,
    chips,
  ]);

  screen.append(
    deco,
    el('div', { class: 'home-top' }, [soundBtn]),
    hero,
    el('p', { class: 'home-foot', text: 'Made with 💙 for young English learners · v1.1' })
  );

  fx.logoLetters([...screen.querySelectorAll('.logo-letter')]);
  fx.buttonsIn([primaryBtn, ...chips.children]);

  return screen;
}
