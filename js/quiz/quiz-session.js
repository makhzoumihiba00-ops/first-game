// Quiz session — one test run: questions, score, timer and results.
// The screen module drives it; this class never touches the DOM.

import { buildQuestions, QUIZ_DURATION_MS, QUIZ_SIZE } from './quiz-data.js';
import { QuizTimer, formatClock } from './timer.js';

const BEST_KEY = 'english-adventure.quiz-best.v1';

/* ----------------------- best-score store ---------------------- */

export function loadBest(categoryId) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY)) || {};
    const best = all[categoryId];
    return best && typeof best.stars === 'number' ? best : null;
  } catch (err) {
    return null;
  }
}

// Returns true when this run beat the saved best (more stars, or same
// stars with a better percentage).
export function saveBest(categoryId, result) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY)) || {};
    const old = all[categoryId];
    const better = !old || result.stars > old.stars || (result.stars === old.stars && result.pct > old.pct);
    if (!better) return false;
    all[categoryId] = {
      stars: result.stars,
      pct: result.pct,
      correct: result.correct,
      answered: result.answered,
      at: Date.now(),
    };
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
    return true;
  } catch (err) {
    return false;
  }
}

export function bestLabel(best) {
  return `${'⭐'.repeat(best.stars)} · ${best.pct}%`;
}

/* -------------------------- session ---------------------------- */

export class QuizSession {
  constructor(category, { durationMs = QUIZ_DURATION_MS, size = QUIZ_SIZE } = {}) {
    this.category = category;
    this.questions = buildQuestions(category.id, size);
    this.index = 0;
    this.correct = 0;
    this.answered = 0;
    this.log = []; // 'good' | 'try' per answered question
    this.phase = 'intro'; // intro → running → done
    this.endReason = null; // 'done' | 'time'
    this.timeUsedMs = 0;
    this.locked = false; // current question already answered?
    this.onTick = null; // (remainingMs) => void
    this.onFinish = null; // (results) => void
    this.timer = new QuizTimer({
      durationMs,
      onTick: (ms) => this.onTick && this.onTick(ms),
      onEnd: () => this._finish('time'),
    });
  }

  get total() {
    return this.questions.length;
  }

  get current() {
    return this.questions[this.index];
  }

  get timeUp() {
    return this.endReason === 'time';
  }

  start() {
    if (this.phase !== 'intro') return;
    this.phase = 'running';
    this.timer.start();
  }

  // One answer per question; returns null if called twice or after time-up.
  selectOption(optionId) {
    if (this.phase !== 'running' || this.locked) return null;
    this.locked = true;
    const q = this.current;
    const isCorrect = optionId === q.correctId;
    if (isCorrect) this.correct++;
    this.answered++;
    this.log.push(isCorrect ? 'good' : 'try');
    return {
      isCorrect,
      correctOption: q.options.find((o) => o.id === q.correctId),
    };
  }

  // Returns true when another question is ready; finishing the last
  // question ends the session and fires onFinish.
  advance() {
    if (this.phase !== 'running') return false;
    if (this.index < this.total - 1) {
      this.index++;
      this.locked = false;
      return true;
    }
    this._finish('done');
    return false;
  }

  _finish(reason) {
    if (this.phase === 'done') return;
    this.timeUsedMs = reason === 'time' ? this.timer.durationMs : this.timer.elapsedMs();
    this.phase = 'done';
    this.endReason = reason;
    this.locked = true;
    this.timer.stop();
    this.onFinish && this.onFinish(this.results());
  }

  // Score = correct / answered (unanswered questions after time-up don't
  // count against the percentage). Stars: 3 ≥ 80%, 2 ≥ 50%, else 1 for effort.
  results() {
    const pct = this.answered ? Math.round((this.correct / this.answered) * 100) : 0;
    const stars = this.answered === 0 ? 1 : pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    return {
      correct: this.correct,
      wrong: this.answered - this.correct,
      answered: this.answered,
      total: this.total,
      pct,
      stars,
      timeUsedLabel: formatClock(this.timeUsedMs),
      reason: this.endReason,
    };
  }

  destroy() {
    this.timer.stop();
    this.onTick = null;
    this.onFinish = null;
  }
}
