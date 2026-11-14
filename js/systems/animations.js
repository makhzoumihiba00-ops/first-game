// GSAP-powered animation helpers.
//
// Every helper is safe by default: when GSAP failed to load (offline) or the
// user prefers reduced motion, tweens collapse to an instant final state or a
// no-op, and the game stays fully playable. Views are built in their final,
// visible state — GSAP only enhances ("from" style), never gates visibility.
// Only transform/opacity are animated.

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const hasGsap = () => typeof window.gsap !== 'undefined';
const motionOK = () => hasGsap() && !reducedQuery.matches;
const g = () => window.gsap;

const CONFETTI_COLORS = ['#FF5E5B', '#FFD166', '#06D6A0', '#4F8DFD', '#9B5CF6', '#FF9F1C'];
const STAR_EMOJIS = ['⭐', '✨', '🌟'];

function fxLayer(root) {
  let layer = root.querySelector(':scope > .fx-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    root.appendChild(layer);
  }
  return layer;
}

export const fx = {
  /* -------------------------- screens -------------------------- */

  screenIn(view) {
    if (!motionOK()) return;
    g().fromTo(view, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out', clearProps: 'transform,opacity' });
  },

  screenOut(view) {
    if (!motionOK()) return Promise.resolve();
    return new Promise((resolve) => {
      g().to(view, { opacity: 0, y: -18, duration: 0.22, ease: 'power2.in', onComplete: resolve });
    });
  },

  killView(view) {
    if (!hasGsap() || !view) return;
    g().killTweensOf(view);
    g().killTweensOf(view.querySelectorAll('*'));
  },

  /* --------------------------- cards --------------------------- */

  cardEntrance(cards, { stagger = 0.03 } = {}) {
    if (!motionOK() || !cards.length) return;
    g().fromTo(
      cards,
      { opacity: 0, y: 26, scale: 0.85 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)', stagger, clearProps: 'transform,opacity' }
    );
  },

  cardBounce(card) {
    if (!motionOK()) return;
    g().killTweensOf(card);
    g().fromTo(
      card,
      { transformOrigin: '50% 100%' },
      {
        keyframes: [
          { scaleY: 0.82, scaleX: 1.14, duration: 0.1 },
          { scaleY: 1.08, scaleX: 0.94, duration: 0.12 },
          { scaleY: 1, scaleX: 1, duration: 0.34, ease: 'elastic.out(1.1, 0.5)' },
        ],
      }
    );
  },

  checkPop(badge) {
    if (!motionOK() || !badge) return;
    g().fromTo(badge, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
  },

  /* -------------------------- preview -------------------------- */

  previewPop(node) {
    if (!motionOK() || !node) return;
    g().fromTo(node, { scale: 0.35, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)', clearProps: 'transform,opacity' });
  },

  speakerWiggle(btn) {
    if (!motionOK() || !btn) return;
    g().killTweensOf(btn);
    g().to(btn, {
      keyframes: [
        { rotation: -12, duration: 0.07 },
        { rotation: 10, duration: 0.09 },
        { rotation: -6, duration: 0.09 },
        { rotation: 0, duration: 0.12 },
      ],
    });
  },

  /* -------------------------- feedback ------------------------- */

  shake(node) {
    if (!motionOK() || !node) return;
    g().killTweensOf(node);
    g().fromTo(node, { x: 0 }, { keyframes: [{ x: -7 }, { x: 7 }, { x: -5 }, { x: 5 }, { x: 0 }], duration: 0.4, clearProps: 'x' });
  },

  progressFill(fillEl, pct) {
    if (!fillEl) return;
    if (!motionOK()) {
      fillEl.style.width = `${pct}%`;
      return;
    }
    g().to(fillEl, { width: `${pct}%`, duration: 0.5, ease: 'back.out(1.4)', overwrite: 'auto' });
  },

  popIn(node) {
    if (!motionOK() || !node) return;
    g().fromTo(node, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.8)', clearProps: 'transform,opacity' });
  },

  fadeOutRemove(node, duration = 0.25) {
    if (!node) return;
    // Safety timer: remove even if animation frames never tick (hidden page).
    const safety = setTimeout(() => node.remove(), Math.ceil(duration * 1000) + 150);
    if (!motionOK()) {
      clearTimeout(safety);
      node.remove();
      return;
    }
    g().to(node, {
      opacity: 0,
      duration,
      onComplete: () => {
        clearTimeout(safety);
        node.remove();
      },
    });
  },

  /* ------------------------- entrances ------------------------- */

  logoLetters(spans) {
    if (!motionOK() || !spans.length) return;
    g().fromTo(
      spans,
      { y: -70, opacity: 0, rotation: () => g().utils.random(-28, 28) },
      { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'bounce.out', stagger: 0.045, clearProps: 'transform,opacity' }
    );
  },

  buttonsIn(nodes) {
    if (!motionOK() || !nodes.length) return;
    g().fromTo(nodes, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08, clearProps: 'transform,opacity' });
  },

  /* ------------------------ celebrations ----------------------- */

  confetti(root, { count = 90, duration = 2.4 } = {}) {
    if (!motionOK() || !root) return;
    const layer = fxLayer(root);
    const height = root.clientHeight || window.innerHeight;
    for (let i = 0; i < count; i++) {
      const isStar = i % 8 === 0;
      const piece = document.createElement(isStar ? 'span' : 'i');
      piece.className = isStar ? 'cf star' : 'cf';
      if (isStar) {
        piece.textContent = STAR_EMOJIS[i % STAR_EMOJIS.length];
      } else {
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      }
      piece.style.left = `${Math.random() * 100}%`;
      layer.appendChild(piece);
      g().fromTo(
        piece,
        { y: -30, x: 0, rotation: 0, opacity: 1 },
        {
          y: height + 80,
          x: g().utils.random(-70, 70),
          rotation: g().utils.random(-280, 280),
          duration: duration * g().utils.random(0.75, 1.35),
          delay: g().utils.random(0, 0.8),
          ease: 'power1.in',
          onComplete: () => piece.remove(),
        }
      );
    }
  },

  stars(root, { count = 8 } = {}) {
    if (!motionOK() || !root) return;
    const layer = fxLayer(root);
    const height = root.clientHeight || window.innerHeight;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('span');
      star.className = 'float-star';
      star.textContent = STAR_EMOJIS[i % STAR_EMOJIS.length];
      star.style.left = `${5 + Math.random() * 90}%`;
      layer.appendChild(star);
      const tl = g().timeline({ onComplete: () => star.remove() });
      tl.fromTo(star, { y: 0, opacity: 0, rotation: 0 }, { opacity: 1, duration: 0.5 }, 0);
      tl.to(star, { y: -height - 60, duration: g().utils.random(3, 5), ease: 'none' }, 0);
      tl.to(star, { rotation: g().utils.random(-120, 120), duration: 1, ease: 'none' }, 0);
      tl.to(star, { opacity: 0, duration: 0.6 }, '>-0.6');
      tl.delay(g().utils.random(0, 2.5));
    }
  },

  trophyBounce(trophyWrap) {
    if (!motionOK() || !trophyWrap) return;
    g().fromTo(trophyWrap, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' });
  },

  /* --------------------------- quiz ---------------------------- */

  // Radial burst of tiny stars from the center of a node (correct answer).
  sparkleBurst(node) {
    if (!motionOK() || !node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:150;overflow:hidden;';
    document.body.appendChild(layer);
    const emojis = ['✨', '⭐', '🌟', '💫'];
    for (let i = 0; i < 9; i++) {
      const spark = document.createElement('span');
      spark.textContent = emojis[i % emojis.length];
      spark.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-size:${g().utils.random(16, 26)}px;will-change:transform,opacity;`;
      layer.appendChild(spark);
      const angle = (Math.PI * 2 * i) / 9 + g().utils.random(-0.3, 0.3);
      const dist = g().utils.random(60, 110);
      g().fromTo(
        spark,
        { x: 0, y: 0, scale: 0.3, opacity: 1 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 30,
          scale: 1.1,
          opacity: 0,
          duration: g().utils.random(0.6, 0.95),
          ease: 'power2.out',
          onComplete: () => spark.remove(),
        }
      );
    }
    setTimeout(() => layer.remove(), 1200);
  },

  // Number count-up for the results score. The final value is set first so
  // the score is always correct; the tween only adds counting delight and
  // is skipped entirely without motion (frozen frames, reduced motion).
  countUp(node, to, { duration = 1.1 } = {}) {
    if (!node) return;
    node.textContent = String(to);
    if (!motionOK()) return;
    const counter = { v: 0 };
    g().to(counter, {
      v: to,
      duration,
      ease: 'power1.out',
      onUpdate: () => {
        node.textContent = String(Math.round(counter.v));
      },
    });
  },
};
