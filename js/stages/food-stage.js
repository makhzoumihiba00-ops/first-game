// Stage 4 — Fruits & Vegetables. One stage, two tabs; exploration progress
// is shared across both categories and completion needs all 24 items.

import { fruitsVegetables } from '../data/fruits-vegetables.js';
import { el } from '../systems/navigation.js';
import { mediaVisual } from '../ui/game-screen.js';

export const foodStage = {
  id: 'food',
  icon: '🍎',
  title: 'Fruits & Vegetables',
  heading: 'Fruits & Vegetables',
  sub: 'Explore every fruit and vegetable!',
  items: fruitsVegetables,
  previewPlaceholder: '👆 Tap an item!',

  completeTitle: 'Food Stage Completed!',
  completeMessage: 'You learned all 24 fruits and vegetables!',

  groups: [
    { id: 'fruits', label: 'Fruits', icon: '🍓', match: (item) => item.category === 'fruit' },
    { id: 'vegetables', label: 'Vegetables', icon: '🥕', match: (item) => item.category === 'vegetable' },
  ],

  speechFor: (item) => item.name,
  nameFor: (item) => item.name,
  ariaLabel: (item) => item.name,

  cardFor: (item) => [
    mediaVisual(item, 'media-card'),
    el('span', { class: 'card-label', text: item.name }),
  ],
  previewFor: (item) => mediaVisual(item, 'media-xl'),
};
