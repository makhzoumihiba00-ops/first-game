// Stage 3 — Animals. Cards show a real image when available and a large
// emoji placeholder otherwise. The English name is always pronounced first;
// a real animal sound (if the file exists) plays right after it.

import { animals } from '../data/animals.js';
import { el } from '../systems/navigation.js';
import { mediaVisual } from '../ui/game-screen.js';
import { audioEngine } from '../systems/audio.js';

export const animalsStage = {
  id: 'animals',
  icon: '🦁',
  title: 'Animals',
  heading: 'Animal Friends',
  sub: 'Tap an animal to hear its name!',
  items: animals,
  previewPlaceholder: '👆 Tap an animal!',

  completeTitle: 'Amazing! You Know the Animals!',
  completeMessage: 'You met all 20 animal friends!',

  speechFor: (item) => item.name,
  nameFor: (item) => item.name,
  ariaLabel: (item) => item.name,

  cardFor: (item) => [
    mediaVisual(item, 'media-card'),
    el('span', { class: 'card-label', text: item.name }),
  ],
  previewFor: (item) => mediaVisual(item, 'media-xl'),

  // Runs after the English pronunciation finishes; skipped silently when no
  // sound file exists — the English name is always the primary audio.
  afterPronounce: (item) => audioEngine.playOptional(item.animalSound),
};
