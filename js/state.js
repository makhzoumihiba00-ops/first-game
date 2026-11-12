// Central game state — single source of truth for progression.
// Screens and stages read from here; nothing keeps its own copy of progress.

import { storage } from './storage.js';
import { alphabet } from './data/alphabet.js';
import { colors } from './data/colors.js';
import { animals } from './data/animals.js';
import { fruitsVegetables } from './data/fruits-vegetables.js';

export const STAGES = [
  { id: 'alphabet', label: 'Alphabet', icon: '🔤', items: alphabet },
  { id: 'colors', label: 'Colors', icon: '🎨', items: colors },
  { id: 'animals', label: 'Animals', icon: '🦁', items: animals },
  { id: 'food', label: 'Fruits & Vegetables', icon: '🍎', items: fruitsVegetables },
];

const listeners = new Set();

class GameState {
  constructor() {
    this.setDefaults();
  }

  setDefaults() {
    this.screen = 'home';
    this.currentStage = 'alphabet';
    this.unlockedStages = ['alphabet'];
    this.explored = Object.fromEntries(STAGES.map((s) => [s.id, []]));
    this.selectedItemId = null;
    this.soundEnabled = true;
    this.completedStages = [];
    this.gameCompleted = false;
  }

  /* ------------------------- lifecycle ------------------------- */

  init() {
    const saved = storage.load();
    if (saved) this.applyValidated(saved);
    if (!this.isUnlocked(this.currentStage)) this.currentStage = 'alphabet';
    this.notify();
  }

  // Restore a save, dropping anything malformed or unknown.
  applyValidated(data) {
    this.setDefaults();
    const stageIds = STAGES.map((s) => s.id);

    if (Array.isArray(data.unlockedStages)) {
      this.unlockedStages = data.unlockedStages.filter((x) => typeof x === 'string' && stageIds.includes(x));
    }
    if (!this.unlockedStages.includes('alphabet')) this.unlockedStages.unshift('alphabet');

    if (Array.isArray(data.completedStages)) {
      this.completedStages = data.completedStages.filter((x) => typeof x === 'string' && stageIds.includes(x));
    }

    if (typeof data.soundEnabled === 'boolean') this.soundEnabled = data.soundEnabled;

    for (const stage of STAGES) {
      const known = stage.items.map((item) => item.id);
      const saved = data.explored && data.explored[stage.id];
      this.explored[stage.id] = Array.isArray(saved)
        ? saved.filter((id) => typeof id === 'string' && known.includes(id))
        : [];
    }

    if (typeof data.currentStage === 'string' && stageIds.includes(data.currentStage)) {
      this.currentStage = data.currentStage;
    }

    this.gameCompleted = data.gameCompleted === true || this.completedStages.length === STAGES.length;
  }

  /* -------------------------- queries -------------------------- */

  isUnlocked(stageId) {
    return this.unlockedStages.includes(stageId);
  }

  isCompleted(stageId) {
    return this.completedStages.includes(stageId);
  }

  hasProgress() {
    return STAGES.some((s) => this.explored[s.id].length > 0);
  }

  /* -------------------------- mutations ------------------------ */

  selectStage(stageId) {
    if (!this.isUnlocked(stageId)) return false;
    this.currentStage = stageId;
    this.selectedItemId = null;
    this.persist();
    this.notify();
    return true;
  }

  // Returns { newlyExplored, stageCompleted } — stageCompleted is true only on
  // the single transition from incomplete to complete, so completion can't refire.
  markExplored(stageId, itemId) {
    const list = this.explored[stageId];
    if (!list || list.includes(itemId)) return { newlyExplored: false, stageCompleted: false };
    list.push(itemId);
    const total = STAGES.find((s) => s.id === stageId).items.length;
    const justFinished = list.length >= total && !this.isCompleted(stageId);
    this.persist();
    this.notify();
    return { newlyExplored: true, stageCompleted: justFinished };
  }

  // Marks a stage complete, unlocks the next one, and returns the next stage id
  // (or null when this was the final stage and the whole game is complete).
  completeStage(stageId) {
    if (this.isCompleted(stageId)) return this.nextStageId(stageId);
    this.completedStages.push(stageId);
    const next = this.nextStageId(stageId);
    if (next) {
      if (!this.unlockedStages.includes(next)) this.unlockedStages.push(next);
      this.currentStage = next;
    } else {
      this.gameCompleted = true;
    }
    this.persist();
    this.notify();
    return next;
  }

  nextStageId(stageId) {
    const index = STAGES.findIndex((s) => s.id === stageId);
    if (index < 0 || index >= STAGES.length - 1) return null;
    return STAGES[index + 1].id;
  }

  setSoundEnabled(value) {
    this.soundEnabled = value;
    this.persist();
    this.notify();
  }

  reset() {
    this.setDefaults();
    storage.clear();
    this.notify();
  }

  /* ------------------------- persistence ----------------------- */

  persist() {
    storage.save({
      currentStage: this.currentStage,
      explored: this.explored,
      unlockedStages: this.unlockedStages,
      soundEnabled: this.soundEnabled,
      completedStages: this.completedStages,
      gameCompleted: this.gameCompleted,
    });
  }

  /* ------------------------- pub / sub ------------------------- */

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  notify() {
    listeners.forEach((fn) => {
      try {
        fn(this);
      } catch (err) {
        // A broken listener must never break the game loop.
      }
    });
  }
}

export const state = new GameState();
