// Versioned localStorage persistence for game progress.
// Structural validation happens here; item-id validation happens in state.js.

const SAVE_KEY = 'english-adventure.save.v1';
const SAVE_VERSION = 1;

export const storage = {
  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), data }));
    } catch (err) {
      // Storage full or blocked (private mode) — the game stays playable without saving.
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== SAVE_VERSION) return null;
      if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return null;
      return parsed.data;
    } catch (err) {
      // Corrupted JSON — treat as no save.
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) {
      // Ignore — nothing to clear.
    }
  },
};
