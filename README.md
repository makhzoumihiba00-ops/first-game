# English Adventure 🌟

A playful, child-friendly English learning game built with **HTML5, CSS3, Vanilla JavaScript (ES6 modules) and GSAP**. No frameworks, no build step — just a static folder and a local server.

One continuous adventure with four connected stages, plus a **Quiz Time!** test mode:

| # | Stage | Items |
|---|-------|-------|
| 1 | 🔤 Alphabet A–Z | 26 letters |
| 2 | 🎨 Colors | 12 colors |
| 3 | 🦁 Animals | 40 animals |
| 4 | 🍎 Fruits & Vegetables | 40 items (20 + 20, two tabs) |
| | **Total** | **118 learning items** |

Completing a stage automatically unlocks the next one. The final stage leads to a big celebration screen with a trophy, confetti and accurate totals.

## 🧩 Quiz Time! (test mode)

A separate quiz game reachable from the home screen — no unlocking required, all four categories available. Each quiz:

- **10 randomized questions** (no repeats in a run) with **3 shuffled written options** (never A/B/C labels)
- **5:00 countdown** — the timer turns orange under a minute and red under 15 s; running out ends the quiz early
- **Voice narration** for every question (auto-read on arrival, replay 🔁 button, works with the global sound toggle), including a *listen-and-find* letter question type
- **Gentle immediate feedback** — green sparkle burst + "Great job!" for correct, soft coral shake + the right answer shown kindly for wrong; options lock after one answer and auto-advance (or tap Next)
- **Celebration results** — 1–3 stars (≥80% / ≥50% / effort), animated score, encouraging message, confetti, and Try Again / Categories / Keep Learning buttons
- **Best score per category** is remembered (stars + %) and shown on the picker cards and quiz intros

Alphabet distractors are deliberately *confusable* letters (B/D/P, M/N/W…) for kinder, more useful practice.

## ▶️ How to run

**Easiest:** double-click **`start-game.bat`** in the project folder — it starts the server and opens the game at http://localhost:8000. (Requires Node.js.)

Alternatively, any static server works — from the project folder:

```bash
# Node (bundled server)
node server.cjs

# Python
python -m http.server 8000

# or
npx serve .
```

Then open **http://localhost:8000**. (VS Code "Live Server" works too.)

> The home screen footer shows the version (e.g. **v1.1**). If you don't see it, your browser is running an old cached copy — close that tab, start the server, and reopen the page.

## ✨ Features

- **Tap-to-learn cards** — bounce animation, enlarged preview, English pronunciation, explored ✓ badge. Items can be tapped in any order; repeats still pronounce but never double-count progress.
- **Pronunciation engine** — plays recorded MP3s when present, falls back to the browser's English speech synthesis (`en-US`, slightly slowed, child-friendly). Rapid clicks cancel the previous pronunciation. Mute stops everything instantly.
- **Sound effects & background music** — generated live with the Web Audio API (no audio files needed). Music ducks under pronunciation.
- **Progress that survives refresh** — versioned `localStorage` save with validation; corrupted data is discarded gracefully. Completed stages stay open for review; locked stages can't be entered.
- **Stage & game completion** — confetti, stars, fanfare; "Continue to …" button; final trophy screen. *Play Again* resets progress only after a confirmation dialog; *Home* never resets.
- **Responsive** — phone, tablet and desktop layouts, large touch targets, safe-area support, reduced-motion respected.

## 🗂 Project structure

```text
index.html                  entry page (all screens render inside #app)
css/                        design tokens, layout, keyframes, responsive rules, quiz styles
js/
  main.js                   entry point
  game.js                   route wiring & bootstrapping
  state.js                  central game state (single source of truth)
  storage.js                versioned localStorage save/load
  data/                     learning content (letters, colors, animals, food)
  stages/                   per-stage configs plugged into the shared screen
  systems/                  audio, animations (GSAP), progress, navigation
  ui/                       home, shared learning screen, completion screens
  quiz/                     Quiz Time! mode: data, session, timer, speech, screens
assets/                     drop your final artwork & audio here
```

## 🎨 Replacing placeholders with real assets

The game is fully playable with generated visuals. To upgrade:

1. **Pronunciation audio** — drop MP3s at the paths already referenced by the data files, e.g. `assets/audio/alphabet/a.mp3`, `assets/audio/colors/red.mp3`, `assets/audio/animals/lion.mp3`, `assets/audio/fruits/apple.mp3`, `assets/audio/vegetables/carrot.mp3`. Files are detected automatically (HEAD check, cached) — no code changes.
2. **Animal sounds (optional)** — `assets/audio/animals/<id>-sound.mp3` (e.g. `lion-sound.mp3`). Missing files are skipped silently; the English name is always pronounced first.
3. **Images** — drop PNGs at `assets/images/animals/<id>.png`, `assets/images/food/fruits/<id>.png`, `assets/images/food/vegetables/<id>.png`. Each card shows the image as soon as it loads; the emoji placeholder remains as the fallback for anything missing.

Notes:

- Your server should answer `HEAD` requests (Python's `http.server`, `serve` and Live Server all do) — that's what the audio-existence check uses. Without it, the game simply always uses speech synthesis.
- Speech-synthesis voices vary by browser/OS; the engine prefers an `en-US` voice and never uses a non-English voice for learning words.
