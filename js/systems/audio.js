// Centralized audio engine.
//
// Pronunciation: tries a recorded MP3 first (existence checked with a HEAD
// request, cached, so missing files never spam the console), then falls back
// to English speech synthesis. Only one pronunciation can play at a time —
// rapid clicks cancel/replace the previous one.
//
// Effects & background music are generated with the Web Audio API, so the
// game needs no binary assets. Everything is gated behind the sound toggle
// and unlocked on the first user gesture (browser autoplay policy).

class AudioEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.voice = null;
    this.fileCache = new Map(); // path -> Promise<boolean>
    this.currentAudio = null;
    this.pronounceToken = 0;
    this.musicTimer = null;
    this.musicStep = 0;
    this.lastNoteIndex = 2;
    this.noVoiceNotified = false;
    this.speechPrimed = false;
  }

  // Call on the first user gesture (pointerdown).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.enabled ? 1 : 0;
          this.master.connect(this.ctx.destination);
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 1;
          this.musicGain.connect(this.master);
        } catch (err) {
          this.ctx = null;
        }
      }
      this._pickVoice();
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.addEventListener('voiceschanged', () => this._pickVoice());
          // Reading getVoices() once nudges some browsers into loading voices.
          window.speechSynthesis.getVoices();
        } catch (err) {
          // Voice list unavailable — speech still attempts later.
        }
        this._primeSpeech();
      }
      if (this.enabled && this.ctx) this._startMusic();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) {
      this.stopPronunciation();
      this._stopMusic();
    } else if (this.ctx) {
      this._startMusic();
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value ? 1 : 0, this.ctx.currentTime, 0.05);
    }
  }

  /* ------------------------ pronunciation ---------------------- */

  // Plays `path` if the file exists, otherwise speaks `text` in English.
  async pronounce({ text, path = null, onEnd = null }) {
    this.stopPronunciation();
    const token = ++this.pronounceToken;
    if (!this.enabled) {
      onEnd && onEnd();
      return;
    }
    this._duckMusic(true);
    const settle = () => {
      if (token === this.pronounceToken) this._duckMusic(false);
      onEnd && onEnd();
    };

    if (path) {
      const exists = await this._fileExists(path);
      if (token !== this.pronounceToken) return; // superseded by a newer click
      if (exists) {
        this._playFile(path, {
          onEnd: settle,
          onFail: () => {
            if (token === this.pronounceToken) this._speak(text, settle);
          },
        });
        return;
      }
    }
    this._speak(text, settle);
  }

  // Optional extra audio (e.g. animal sounds): played only if the file exists,
  // skipped silently otherwise.
  playOptional(path, volume = 0.85) {
    if (!this.enabled || !path) return;
    this._fileExists(path).then((exists) => {
      if (exists && this.enabled) {
        this._playFile(path, { onEnd: () => {}, onFail: () => {}, volume });
      }
    });
  }

  stopPronunciation() {
    this.pronounceToken++;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        // Ignore — some engines throw when cancelling an empty queue.
      }
    }
  }

  _playFile(path, { onEnd, onFail, volume = 0.95 }) {
    const audio = new Audio(path);
    audio.volume = volume;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (this.currentAudio === audio) this.currentAudio = null;
      const cb = ok ? onEnd : onFail;
      cb && cb();
    };
    audio.addEventListener('error', () => finish(false));
    audio.addEventListener('ended', () => finish(true));
    this.currentAudio = audio;
    audio.play().catch(() => finish(false));
  }

  async _fileExists(path) {
    if (!this.fileCache.has(path)) {
      const check = (async () => {
        if (!path || location.protocol === 'file:') return false;
        try {
          const res = await fetch(path, { method: 'HEAD' });
          return res.ok;
        } catch (err) {
          return false;
        }
      })();
      this.fileCache.set(path, check);
    }
    return this.fileCache.get(path);
  }

  _speak(text, onEnd) {
    const unsupported = !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined';
    if (unsupported) {
      this._notifyNoVoice();
      onEnd && onEnd();
      return;
    }

    const token = this.pronounceToken;
    let attempts = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guardTimer);
      onEnd && onEnd();
    };
    // Safety net in case the engine fires neither onend nor onerror.
    const guardTimer = setTimeout(finish, Math.min(8000, 1800 + text.length * 160));

    const attempt = () => {
      if (finished || token !== this.pronounceToken) return;
      if (attempts >= 2) {
        finish();
        return;
      }
      attempts++;
      if (!this.voice) this._pickVoice();

      let utterance;
      try {
        utterance = new SpeechSynthesisUtterance(text);
      } catch (err) {
        this._notifyNoVoice();
        finish();
        return;
      }
      utterance.lang = 'en-US';
      if (this.voice) utterance.voice = this.voice;
      utterance.rate = 0.85; // slightly slower, child-friendly
      utterance.pitch = 1.05;
      let started = false;
      utterance.onstart = () => {
        started = true;
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        finish();
        return;
      }

      // Watchdog: Chromium sometimes silently drops an utterance (stuck
      // queue / cancel-speak race). If nothing started soon, retry once.
      setTimeout(() => {
        if (finished || started || token !== this.pronounceToken) return;
        try {
          window.speechSynthesis.cancel();
          attempt();
        } catch (err) {
          finish();
        }
      }, 850);
    };

    // Speaking in the same tick as cancel() is unreliable in Chromium — if
    // anything is still speaking/pending, cancel first and pause briefly.
    let busy = false;
    try {
      busy = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    } catch (err) {
      // State check unsupported — just speak.
    }
    if (busy) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        // Ignore — attempt anyway.
      }
      setTimeout(attempt, 70);
    } else {
      attempt();
    }
  }

  // Warms the speech engine inside the first user gesture: triggers voice
  // loading and removes the "first utterance is silent" quirk some browsers have.
  _primeSpeech() {
    if (this.speechPrimed || !('speechSynthesis' in window)) return;
    this.speechPrimed = true;
    try {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
    } catch (err) {
      // Priming is best-effort.
    }
  }

  _pickVoice() {
    if (!('speechSynthesis' in window)) return;
    let voices = [];
    try {
      voices = window.speechSynthesis.getVoices() || [];
    } catch (err) {
      return;
    }
    if (!voices.length) return;
    const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
    const enUS = (v) => /^en[-_]us/i.test(v.lang || '');
    // Prefer the clearest US-English voices; never fall back to a non-English
    // voice — a wrong-language voice is worse than the system default.
    this.voice =
      english.find((v) => /google us english/i.test(v.name)) ||
      english.find((v) => enUS(v) && /microsoft/i.test(v.name)) ||
      english.find((v) => enUS(v)) ||
      english.find((v) => /aria|jenny|guy|zira|david|mark|samantha|libby|sonia|hazel|susan/i.test(v.name)) ||
      english[0] ||
      null;
  }

  _notifyNoVoice() {
    if (this.noVoiceNotified) return;
    this.noVoiceNotified = true;
    document.dispatchEvent(new CustomEvent('audio:novoice'));
  }

  /* ------------------- sound effects (Web Audio) ---------------- */

  playEffect(name) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + 0.01;
    const note = (freq, at, dur, type, vol, slideTo) => this._tone(freq, t0 + at, dur, type, vol, slideTo);
    switch (name) {
      case 'click':
        note(620, 0, 0.06, 'triangle', 0.12);
        break;
      case 'pop':
        note(320, 0, 0.12, 'sine', 0.2, 680);
        break;
      case 'deny':
        note(190, 0, 0.18, 'square', 0.07, 120);
        break;
      case 'success':
        note(523.25, 0, 0.22, 'sine', 0.16);
        note(659.25, 0.1, 0.22, 'sine', 0.16);
        note(783.99, 0.2, 0.34, 'sine', 0.18);
        break;
      case 'fanfare':
        note(523.25, 0, 0.18, 'triangle', 0.16);
        note(659.25, 0.12, 0.18, 'triangle', 0.16);
        note(783.99, 0.24, 0.18, 'triangle', 0.17);
        note(1046.5, 0.36, 0.5, 'triangle', 0.2);
        note(261.63, 0, 0.8, 'sine', 0.08);
        break;
      case 'wrong':
        // Gentle "good try" — soft two-note droop, never scary.
        note(392, 0, 0.16, 'sine', 0.12);
        note(311.13, 0.14, 0.26, 'sine', 0.1);
        break;
      case 'whoosh':
        // Quick soft sweep when the next question slides in.
        note(520, 0, 0.16, 'sine', 0.06, 1040);
        break;
      case 'star':
        // Little sparkle tinkle for each results-star pop.
        note(1318.5, 0, 0.16, 'sine', 0.12);
        note(1760, 0.08, 0.24, 'sine', 0.1);
        break;
      default:
        break;
    }
  }

  _tone(freq, at, dur, type, vol, slideTo) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /* ------------------ gentle background music ------------------ */

  // A quiet pentatonic walk. Music runs through its own gain node so it can
  // be ducked while a pronunciation plays, and it never competes with speech.

  _startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const playNote = () => {
      if (!this.enabled || !this.ctx) {
        this._stopMusic();
        return;
      }
      const step = Math.floor(Math.random() * 3) - 1;
      this.lastNoteIndex = Math.min(scale.length - 1, Math.max(0, this.lastNoteIndex + step));
      this._softNote(scale[this.lastNoteIndex]);
      if (this.musicStep % 4 === 0) this._softNote(scale[this.lastNoteIndex] / 2, 0.025);
      this.musicStep++;
    };
    playNote();
    this.musicTimer = setInterval(playNote, 1600);
  }

  _stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _softNote(freq, vol = 0.04) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    osc.connect(gain);
    gain.connect(this.musicGain || this.master);
    osc.start(at);
    osc.stop(at + 1.5);
  }

  _duckMusic(duck) {
    if (!this.ctx || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(duck ? 0.12 : 1, this.ctx.currentTime, 0.25);
  }
}

export const audioEngine = new AudioEngine();
