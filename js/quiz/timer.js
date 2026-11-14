// Quiz timer — a friendly countdown anchored to wall-clock time, so
// throttled background tabs still report honest remaining time.
// Ticks 4× per second; ends exactly once.

export class QuizTimer {
  constructor({ durationMs, onTick = null, onEnd = null }) {
    this.durationMs = durationMs;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.endAt = 0;
    this.handle = null;
    this.ended = false;
  }

  start() {
    this.endAt = Date.now() + this.durationMs;
    this.ended = false;
    this.handle = setInterval(() => this._step(), 250);
    this._step();
  }

  _step() {
    const remaining = this.remainingMs();
    this.onTick && this.onTick(remaining);
    if (remaining <= 0 && !this.ended) {
      this.ended = true;
      this.stop();
      this.onEnd && this.onEnd();
    }
  }

  remainingMs() {
    return Math.max(0, this.endAt - Date.now());
  }

  elapsedMs() {
    return this.durationMs - this.remainingMs();
  }

  stop() {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
