// Entry point — kicks off the game once the DOM is ready.

import { startGame } from './game.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
