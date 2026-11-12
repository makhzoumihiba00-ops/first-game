// Shared learning screen used by all four stages.
//
// A stage provides a config object (see js/stages/*.js) describing its items,
// card/preview visuals and speech text; this module renders the common
// interface: top bar, heading, preview panel with replay button, optional
// group tabs (Fruits | Vegetables), the learning board and the progress bar.
// All card clicks are handled through one delegated listener.

import { el, navigateTo } from '../systems/navigation.js';
import { state, STAGES } from '../state.js';
import { audioEngine } from '../systems/audio.js';
import { fx } from '../systems/animations.js';
import { stageStats } from '../systems/progress.js';
import { showStageComplete } from './stage-complete.js';

// Emoji placeholder shown until a real image asset exists. When the image
// fails to load it is removed and the emoji stays visible — never a broken
// image icon. Dropping a real PNG at item.image needs no code change.
export function mediaVisual(item, cls = '') {
  const wrap = el('span', { class: `media ${cls}`, 'aria-hidden': 'true' });
  wrap.append(el('span', { class: 'media-emoji', text: item.emoji || '❓' }));
  if (item.image) {
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove(), { once: true });
    wrap.append(img);
  }
  return wrap;
}

export function buildStageScreen(config) {
  const screen = el('section', { class: 'stage-screen', 'data-stage': config.id });

  /* -------------------------- top bar -------------------------- */

  const progressPill = el('span', { class: 'pill', text: '0 / 0', 'aria-live': 'polite' });
  const homeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back to home' }, ['🏠']);
  const soundBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Toggle sound' }, [state.soundEnabled ? '🔊' : '🔇']);

  const topbar = el('header', { class: 'topbar' }, [
    homeBtn,
    el('div', { class: 'topbar-title' }, [
      el('span', { class: 'topbar-icon', 'aria-hidden': 'true', text: config.icon }),
      el('span', { class: 'topbar-name', text: config.title }),
      progressPill,
    ]),
    soundBtn,
  ]);

  /* ------------------------ preview panel ----------------------- */

  const previewStage = el('div', { class: 'preview-stage', 'aria-live': 'polite' }, [
    el('div', { class: 'preview-empty', text: config.previewPlaceholder || '👆 Tap a card!' }),
  ]);
  const previewName = el('p', { class: 'preview-name', text: 'Ready?' });
  const replayBtn = el('button', { class: 'btn btn-replay', type: 'button', disabled: 'disabled' }, ['🔊 Hear it']);
  const previewPanel = el('div', { class: 'preview-panel' }, [
    previewStage,
    el('div', { class: 'preview-info' }, [previewName, replayBtn]),
  ]);

  const stageHead = el('div', { class: 'stage-head' }, [
    el('h2', { class: 'stage-heading', text: config.heading }),
    config.sub ? el('p', { class: 'stage-sub', text: config.sub }) : null,
  ]);

  /* ---------------------- tabs (stage 4) ------------------------ */

  let tabsBar = null;
  let activeGroup = null;
  if (config.groups) {
    activeGroup = config.groups[0].id;
    tabsBar = el('div', { class: 'tabs', role: 'tablist' });
    config.groups.forEach((group) => {
      const tab = el('button', { class: `tab${group.id === activeGroup ? ' active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(group.id === activeGroup), dataset: { group: group.id } }, [
        el('span', { class: 'tab-icon', 'aria-hidden': 'true', text: group.icon }),
        el('span', { class: 'tab-label', text: group.label }),
        el('span', { class: 'tab-count', text: '' }),
      ]);
      tab.addEventListener('click', () => selectGroup(group.id));
      tabsBar.append(tab);
    });
  }

  /* --------------------- board & progress ----------------------- */

  const board = el('div', { class: 'board', role: 'list' });
  const progressFillEl = el('div', { class: 'progress-fill' });
  const progressLabel = el('span', { class: 'progress-label', text: '' });
  const foot = el('footer', { class: 'stage-foot' }, [
    el('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, [progressFillEl]),
    progressLabel,
  ]);

  const main = el('div', { class: 'stage-main' }, [stageHead, previewPanel, tabsBar, board, foot].filter(Boolean));
  screen.append(topbar, main);

  /* ------------------------- behavior --------------------------- */

  let selectedItem = null;
  // A stage that was already completed (revisited for review) never fires
  // the completion celebration again.
  let completionFired = state.isCompleted(config.id);

  const exploredList = () => state.explored[config.id] || [];

  function itemsForGroup(groupId) {
    if (!config.groups) return config.items;
    const group = config.groups.find((grp) => grp.id === groupId);
    return config.items.filter((item) => group.match(item));
  }

  function buildCard(item) {
    const card = el('button', { class: 'card', type: 'button', role: 'listitem', dataset: { id: item.id }, 'aria-label': config.ariaLabel(item) });
    card.append(...[].concat(config.cardFor(item)));
    card.append(el('span', { class: 'card-check', 'aria-hidden': 'true', text: '✓' }));
    if (exploredList().includes(item.id)) card.classList.add('explored');
    return card;
  }

  function renderBoard() {
    board.replaceChildren();
    itemsForGroup(activeGroup).forEach((item) => board.append(buildCard(item)));
    fx.cardEntrance([...board.children]);
    if (config.groups) updateTabCounts();
  }

  function updateProgressUI() {
    const stats = stageStats(config.id);
    progressPill.textContent = `${stats.explored} / ${stats.total}`;
    const pct = stats.total ? Math.round((stats.explored / stats.total) * 100) : 0;
    fx.progressFill(progressFillEl, pct);
    progressFillEl.parentElement.setAttribute('aria-valuenow', String(pct));
    progressLabel.textContent = `${stats.explored} of ${stats.total} explored`;
  }

  function updateTabCounts() {
    [...tabsBar.children].forEach((tab) => {
      const group = config.groups.find((grp) => grp.id === tab.dataset.group);
      const items = config.items.filter(group.match);
      const done = items.filter((item) => exploredList().includes(item.id)).length;
      tab.querySelector('.tab-count').textContent = `${done}/${items.length}`;
    });
  }

  function selectGroup(groupId) {
    if (groupId === activeGroup) return;
    activeGroup = groupId;
    [...tabsBar.children].forEach((tab) => {
      const selected = tab.dataset.group === groupId;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    renderBoard();
  }

  function pronounceItem(item) {
    audioEngine.pronounce({
      text: config.speechFor(item),
      path: item.audio || null,
      onEnd: () => config.afterPronounce && config.afterPronounce(item),
    });
  }

  function setPreview(item) {
    selectedItem = item;
    state.selectedItemId = item.id;
    previewStage.replaceChildren(config.previewFor(item));
    previewName.textContent = config.nameFor(item);
    replayBtn.disabled = false;
    fx.previewPop(previewStage.firstElementChild);
  }

  function celebrateStage() {
    audioEngine.playEffect('fanfare');
    fx.confetti(screen, { count: 120, duration: 2.4 });

    if (config.id === 'food') {
      state.completeStage(config.id); // final stage — unlocks the completion screen
      setTimeout(() => navigateTo('game-complete'), 1100);
      return;
    }
    const nextId = state.completeStage(config.id);
    const nextDef = STAGES.find((s) => s.id === nextId);
    setTimeout(() => {
      showStageComplete({
        title: config.completeTitle,
        message: config.completeMessage,
        nextLabel: nextDef.label,
        nextIcon: nextDef.icon,
        onContinue: () => navigateTo('stage', { stageId: nextId }),
      });
    }, 1000);
  }

  function handleCardClick(card, item) {
    fx.cardBounce(card);
    fx.speakerWiggle(replayBtn);
    setPreview(item);

    const result = state.markExplored(config.id, item.id);
    if (result.newlyExplored) {
      card.classList.add('explored');
      fx.checkPop(card.querySelector('.card-check'));
      updateProgressUI();
      if (config.groups) updateTabCounts();
    }

    pronounceItem(item);

    if (result.stageCompleted && !completionFired) {
      completionFired = true;
      celebrateStage();
    }
  }

  /* ------------------------- listeners -------------------------- */

  board.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    const item = config.items.find((i) => i.id === card.dataset.id);
    if (item) handleCardClick(card, item);
  });

  replayBtn.addEventListener('click', () => {
    if (!selectedItem) return;
    fx.speakerWiggle(replayBtn);
    pronounceItem(selectedItem);
  });

  homeBtn.addEventListener('click', () => navigateTo('home'));

  soundBtn.addEventListener('click', () => {
    const enabled = !state.soundEnabled;
    state.setSoundEnabled(enabled);
    audioEngine.setEnabled(enabled);
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    if (enabled) audioEngine.playEffect('pop');
  });

  /* --------------------------- render --------------------------- */

  renderBoard();
  updateProgressUI();

  // Self-heal: if every item is already explored but the completion event
  // never fired (page closed mid-celebration, interrupted save…), finish the
  // stage now instead of soft-locking progression. Revisits of stages that
  // were properly completed don't celebrate again (completionFired).
  if (!completionFired) {
    const stats = stageStats(config.id);
    if (stats.complete) {
      completionFired = true;
      celebrateStage();
    }
  }

  return screen;
}
