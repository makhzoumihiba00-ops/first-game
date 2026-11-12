// Game bootstrap: wires routes, restores progress, unlocks audio on the
// first user gesture, and shows the home screen.

import { state } from './state.js';
import { registerRoute, navigateTo, showToast } from './systems/navigation.js';
import { buildHomeScreen } from './ui/home.js';
import { buildStageScreen } from './ui/game-screen.js';
import { buildGameCompleteScreen } from './ui/game-complete.js';
import { alphabetStage } from './stages/alphabet-stage.js';
import { colorsStage } from './stages/colors-stage.js';
import { animalsStage } from './stages/animals-stage.js';
import { foodStage } from './stages/food-stage.js';
import { audioEngine } from './systems/audio.js';

const STAGE_CONFIGS = {
  alphabet: alphabetStage,
  colors: colorsStage,
  animals: animalsStage,
  food: foodStage,
};

export function startGame() {
  state.init();

  registerRoute('home', () => buildHomeScreen());

  registerRoute('stage', ({ stageId }) => {
    const config = STAGE_CONFIGS[stageId];
    if (!config) return null;
    // Locked stages can never be entered, even by crafted navigation calls.
    if (!state.isUnlocked(stageId)) {
      showToast('🔒 Finish the previous stages first!');
      audioEngine.playEffect('deny');
      return null;
    }
    state.selectStage(stageId);
    return buildStageScreen(config);
  });

  registerRoute('game-complete', () => {
    if (!state.gameCompleted) return buildHomeScreen();
    return buildGameCompleteScreen();
  });

  // Browser autoplay policy: Web Audio may only start from a user gesture.
  window.addEventListener('pointerdown', () => audioEngine.unlock(), { once: true });

  // Visible indication when no pronunciation voice is available at all.
  document.addEventListener('audio:novoice', () => {
    showToast('🔇 Pronunciation voice is not available on this device');
  });

  navigateTo('home');
}
