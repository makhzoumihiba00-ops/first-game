// View system: DOM helper, screen registry with guarded transitions,
// toasts and confirmation dialogs.
//
// Transitions are locked while one is running, so rapid button clicks can
// never trigger a double navigation. Navigating also stops any running
// pronunciation and clears overlays to prevent audio/animation leaks.

import { fx } from './animations.js';
import { audioEngine } from './audio.js';
import { state } from '../state.js';

/* ------------------------- DOM helper ------------------------- */

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children || [])) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/* ----------------------- route registry ----------------------- */

const routes = new Map();
let transitioning = false;

// A transition animation must never be able to freeze navigation (e.g. when
// the page is hidden and animation frames stop), so it is raced with a cap.
const withCap = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

export function registerRoute(name, builder) {
  routes.set(name, builder);
}

export function isTransitioning() {
  return transitioning;
}

export function navigateTo(name, params = {}) {
  if (transitioning) return;
  const builder = routes.get(name);
  if (!builder) return;

  let view = null;
  try {
    view = builder(params);
  } catch (err) {
    console.error(`Route "${name}" failed to build.`, err);
    return;
  }
  // A builder returning null declines navigation (e.g. locked stage).
  if (!(view instanceof Element)) return;

  transitioning = true;
  audioEngine.stopPronunciation();

  const app = document.getElementById('app');
  const overlays = document.getElementById('overlays');
  const old = app.querySelector('.screen');

  const swap = () => {
    if (old) {
      fx.killView(old);
      old.remove();
    }
    fx.killView(overlays);
    overlays.replaceChildren();
    view.classList.add('screen');
    app.appendChild(view);
    state.screen = name;
    fx.screenIn(view);
    window.scrollTo(0, 0);
    transitioning = false;
  };

  if (old) {
    withCap(fx.screenOut(old), 500).then(swap);
  } else {
    swap();
  }
}

/* --------------------------- toasts --------------------------- */

export function showToast(text) {
  const toast = el('div', { class: 'toast', text, role: 'status' });
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

/* ---------------------- confirm dialogs ----------------------- */

export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm }) {
  const root = document.getElementById('overlays');
  const overlay = el('div', { class: 'overlay confirm-overlay' });

  const cancelBtn = el('button', { class: 'btn btn-soft', type: 'button', text: cancelLabel });
  const confirmBtn = el('button', { class: `btn ${danger ? 'btn-danger' : ''}`.trim(), type: 'button', text: confirmLabel });

  const modal = el('div', { class: 'modal confirm-modal', role: 'dialog', 'aria-modal': 'true' }, [
    el('h3', { class: 'modal-title', text: title }),
    el('p', { class: 'modal-text', text: message }),
    el('div', { class: 'modal-actions' }, [cancelBtn, confirmBtn]),
  ]);

  overlay.append(modal);
  root.append(overlay);
  fx.popIn(modal);

  const close = () => fx.fadeOutRemove(overlay);
  cancelBtn.addEventListener('click', () => {
    audioEngine.playEffect('click');
    close();
  });
  confirmBtn.addEventListener('click', () => {
    audioEngine.playEffect('click');
    close();
    onConfirm && onConfirm();
  });
}
