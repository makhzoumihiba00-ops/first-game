// Stage 2 — Colors. Pure CSS swatches show the real color; pale colors
// (white, yellow, gold) get a visible border via [data-swatch] CSS rules.
// Labels sit on the white card, so contrast is always readable.

import { colors } from '../data/colors.js';
import { el } from '../systems/navigation.js';

export const colorsStage = {
  id: 'colors',
  icon: '🎨',
  title: 'Colors',
  heading: 'Colorful World',
  sub: 'Tap a color to hear its name!',
  items: colors,
  previewPlaceholder: '👆 Tap a color!',

  completeTitle: 'Great Job! You Know Your Colors!',
  completeMessage: 'You learned all 12 colors!',

  speechFor: (item) => item.name,
  nameFor: (item) => item.name,
  ariaLabel: (item) => item.name,

  cardFor: (item) => [
    el('span', { class: 'swatch', 'data-swatch': item.id, style: `background:${item.hex}`, 'aria-hidden': 'true' }),
    el('span', { class: 'card-label', text: item.name }),
  ],
  previewFor: (item) => el('span', { class: 'swatch swatch-xl', 'data-swatch': item.id, style: `background:${item.hex}` }),
};
