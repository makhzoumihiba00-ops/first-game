// Quiz screen — one category, three phases inside a single route:
// welcome intro → timed questions → celebratory results.
//
// The screen module owns the DOM; all quiz logic lives in QuizSession,
// narration in quizSpeech, and timing in QuizTimer. Any pending speech
// or auto-advance is cancelled when the phase changes or the child leaves.

import { el, navigateTo, showConfirm, showToast } from '../systems/navigation.js';
import { state } from '../state.js';
import { audioEngine } from '../systems/audio.js';
import { fx } from '../systems/animations.js';
import { mediaVisual } from '../ui/game-screen.js';
import { QUIZ_SIZE } from './quiz-data.js';
import { QuizSession, loadBest, saveBest } from './quiz-session.js';
import { formatClock } from './timer.js';
import { quizSpeech } from './quiz-speech.js';

const DECOR = {
  alphabet: ['✏️', '📚', '✨', '⭐', '🖍️'],
  colors: ['🎨', '🌈', '✨', '🖍️', '⭐'],
  animals: ['🐾', '🌳', '✨', '🍃', '⭐'],
  food: ['🍇', '🥕', '✨', '🍓', '⭐'],
};

const DECOR_SPOTS = [
  'left:5%;top:13%',
  'left:90%;top:10%',
  'left:7%;top:70%',
  'left:91%;top:64%',
  'left:79%;top:88%',
];

const RESULT_COPY = {
  3: { title: 'Amazing! 🌟', sub: 'You are a superstar!', spoken: 'Amazing! You are a superstar!' },
  2: { title: 'Great job! 🎉', sub: 'So close to three stars — one more try!', spoken: 'Great job! So close to three stars!' },
  1: { title: 'Good try! 💪', sub: 'Every hero practices — go again and win more stars!', spoken: 'Good try! Practice makes perfect.' },
};

export function buildQuizScreen(category) {
  const screen = el('section', { class: 'quiz-screen', 'data-quiz': category.id });

  const deco = el('div', { class: 'deco-layer', 'aria-hidden': 'true' });
  DECOR[category.id].forEach((emoji, i) => {
    deco.append(el('span', { class: 'deco-item', text: emoji, style: `${DECOR_SPOTS[i]};--i:${i}` }));
  });

  const body = el('div', { class: 'quiz-body' });
  screen.append(deco, body);

  let session = null;
  let pendingNext = null;
  let speakDelay = null;
  const refs = {}; // question-phase DOM references

  // Delayed narration that stays silent if the child already moved on.
  const later = (ms, fn) => {
    speakDelay = setTimeout(() => {
      if (screen.isConnected) fn();
    }, ms);
  };

  const clearPending = () => {
    clearTimeout(pendingNext);
    pendingNext = null;
    clearTimeout(speakDelay);
    speakDelay = null;
  };

  const teardown = () => {
    clearPending();
    if (session) {
      session.destroy();
      session = null;
    }
    quizSpeech.stop();
  };

  /* ========================= INTRO ========================= */

  function showIntro() {
    teardown();
    const best = loadBest(category.id);

    const mascot = el('div', { class: 'quiz-mascot', 'aria-hidden': 'true' }, [
      el('span', { class: 'mascot-blob', text: category.icon }),
      el('span', { class: 'mascot-spark s1', text: '✨' }),
      el('span', { class: 'mascot-spark s2', text: '✨' }),
    ]);

    const startBtn = el('button', { class: 'btn btn-hero', type: 'button', text: '🚀 Start Test' });
    startBtn.addEventListener('click', () => {
      audioEngine.playEffect('pop');
      startQuiz();
    });

    const backLink = el('button', { class: 'btn-link', type: 'button', text: '← Pick another quiz' });
    backLink.addEventListener('click', () => {
      audioEngine.playEffect('click');
      navigateTo('quiz-select');
    });

    const facts = el('div', { class: 'quiz-facts' }, [
      el('span', { class: 'fact', text: `📝 ${QUIZ_SIZE} questions` }),
      el('span', { class: 'fact', text: '⏰ 5 minutes' }),
      el('span', { class: 'fact', text: '⭐ Win 3 stars' }),
    ]);

    const intro = el('div', { class: 'quiz-intro' }, [
      mascot,
      el('h2', { class: 'quiz-title', text: `${category.title} Quiz!` }),
      el('p', { class: 'quiz-sub', text: category.tagline }),
      facts,
      best ? el('span', { class: 'best-badge', text: `🏅 Your best: ${'⭐'.repeat(best.stars)} · ${best.pct}%` }) : null,
      startBtn,
      backLink,
    ]);
    body.replaceChildren(intro);

    fx.popIn(mascot);
    fx.buttonsIn([...facts.children, startBtn]);

    later(500, () => quizSpeech.welcome(category.title));
  }

  /* ======================= QUESTIONS ======================= */

  function startQuiz() {
    clearPending();
    if (session) session.destroy();
    session = new QuizSession(category);
    session.onTick = updateTimer;
    session.onFinish = (results) => {
      clearPending();
      showResults(results);
    };
    buildQuestionArea();
    session.start();
    renderQuestion();
  }

  function buildQuestionArea() {
    const backBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Leave quiz' }, ['🏠']);
    backBtn.addEventListener('click', confirmLeave);

    const muteBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Toggle sound' }, [
      state.soundEnabled ? '🔊' : '🔇',
    ]);
    muteBtn.addEventListener('click', () => {
      const enabled = !state.soundEnabled;
      state.setSoundEnabled(enabled);
      audioEngine.setEnabled(enabled);
      muteBtn.textContent = enabled ? '🔊' : '🔇';
      if (enabled) audioEngine.playEffect('pop');
    });

    const replayBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Hear the question again' }, ['🔁']);
    replayBtn.addEventListener('click', () => {
      if (!session || session.phase !== 'running') return;
      audioEngine.playEffect('click');
      fx.speakerWiggle(replayBtn);
      quizSpeech.question(session.current);
    });

    const timerPill = el('span', { class: 'pill timer-pill', text: '⏰ 5:00', role: 'timer' });
    const countPill = el('span', { class: 'pill count-pill', text: `1 / ${session.total}`, 'aria-live': 'polite' });

    const topbar = el('header', { class: 'topbar quiz-topbar' }, [
      backBtn,
      el('div', { class: 'topbar-title quiz-brand' }, [
        el('span', { class: 'topbar-icon', 'aria-hidden': 'true', text: category.icon }),
        el('span', { class: 'topbar-name', text: `${category.title} Quiz` }),
      ]),
      timerPill,
      countPill,
      replayBtn,
      muteBtn,
    ]);

    const dots = el('div', { class: 'quiz-dots', 'aria-hidden': 'true' });
    for (let i = 0; i < session.total; i++) dots.append(el('span', { class: 'qdot' }));

    const qtarget = el('div', { class: 'qtarget' });
    const qtext = el('p', { class: 'qtext' });
    const qcard = el('div', { class: 'qcard' }, [
      qtarget,
      qtext,
      el('span', { class: 'qcard-spark', 'aria-hidden': 'true', text: '✨' }),
    ]);

    const fbChip = el('span', { class: 'fb-chip' });
    const nextBtn = el('button', { class: 'btn btn-soft btn-next', type: 'button', text: 'Next →', 'aria-hidden': 'true' });
    nextBtn.addEventListener('click', () => {
      if (!session || session.phase !== 'running') return;
      goNext();
    });
    const feedback = el('div', { class: 'q-feedback', 'aria-live': 'polite' }, [
      el('div', { class: 'fb-row' }, [fbChip, nextBtn]),
    ]);

    const options = el('div', { class: 'q-options', role: 'group', 'aria-label': 'Answer options' });

    const main = el('div', { class: 'quiz-main' }, [dots, qcard, feedback, options]);
    body.replaceChildren(topbar, main);

    Object.assign(refs, { timerPill, countPill, dots, qtarget, qtext, qcard, fbChip, nextBtn, feedback, options });
  }

  function visualFor(q) {
    switch (q.kind) {
      case 'letter-show':
        return el('div', { class: 'q-visual' }, [
          el('div', { class: 'letter-badge' }, [el('span', { class: 'q-letter', text: q.item.letter })]),
        ]);
      case 'letter-listen':
        return el('div', { class: 'q-visual' }, [
          el('div', { class: 'listen-badge' }, [
            el('span', { class: 'listen-ring r1' }),
            el('span', { class: 'listen-ring r2' }),
            el('span', { class: 'listen-emoji', text: '👂' }),
          ]),
        ]);
      case 'color':
        return el('div', { class: 'q-visual' }, [
          el('span', {
            class: 'swatch q-blob',
            'data-swatch': q.item.id,
            style: `background:${q.item.hex}`,
            'aria-hidden': 'true',
          }),
        ]);
      default:
        return el('div', { class: 'q-visual' }, [mediaVisual(q.item, 'media-xl')]);
    }
  }

  function renderQuestion() {
    const q = session.current;

    refs.countPill.textContent = `${session.index + 1} / ${session.total}`;
    refs.timerPill.textContent = `⏰ ${formatClock(session.timer.remainingMs())}`;
    updateDots();

    refs.qtarget.replaceChildren(visualFor(q));
    refs.qtext.textContent = q.prompt;

    refs.options.replaceChildren(
      ...q.options.map((opt) => {
        const btn = el(
          'button',
          { class: 'option', type: 'button', dataset: { id: opt.id }, 'aria-label': opt.label },
          [el('span', { class: 'option-text', text: opt.label }), el('span', { class: 'opt-check', text: '✓' })]
        );
        btn.addEventListener('click', () => handleAnswer(btn, opt));
        return btn;
      })
    );

    hideFeedback();
    fx.previewPop(refs.qtarget.firstElementChild);
    fx.cardEntrance([...refs.options.children], { stagger: 0.07 });

    later(420, () => {
      if (session && session.phase === 'running') quizSpeech.question(q);
    });
  }

  function updateDots() {
    [...refs.dots.children].forEach((dot, i) => {
      dot.className = 'qdot';
      if (i < session.log.length) dot.classList.add(session.log[i]);
      else if (i === session.index) dot.classList.add('cur');
    });
  }

  function updateTimer(ms) {
    const secs = Math.ceil(ms / 1000);
    refs.timerPill.textContent = `⏰ ${formatClock(ms)}`;
    refs.timerPill.classList.toggle('warn', secs <= 60 && secs > 15);
    refs.timerPill.classList.toggle('crit', secs <= 15);
  }

  function showFeedback(kind, text, isLast) {
    refs.fbChip.className = `fb-chip ${kind}`;
    refs.fbChip.textContent = text;
    refs.nextBtn.textContent = isLast ? 'See results 🎉' : 'Next →';
    refs.nextBtn.classList.add('show');
    refs.nextBtn.setAttribute('aria-hidden', 'false');
    refs.feedback.classList.add('show');
  }

  function hideFeedback() {
    refs.feedback.classList.remove('show');
    refs.nextBtn.classList.remove('show');
    refs.nextBtn.setAttribute('aria-hidden', 'true');
    refs.fbChip.textContent = '';
  }

  function handleAnswer(btn, opt) {
    if (!session || session.phase !== 'running' || session.locked) return;
    const res = session.selectOption(opt.id);
    if (!res) return;

    clearTimeout(speakDelay);
    speakDelay = null;

    const buttons = [...refs.options.querySelectorAll('.option')];
    buttons.forEach((b) => {
      b.classList.add('locked');
      if (b === btn) return;
      if (!res.isCorrect && b.dataset.id === res.correctOption.id) b.classList.add('reveal');
      else b.classList.add('dim');
    });

    const isLast = session.index === session.total - 1;
    if (res.isCorrect) {
      btn.classList.add('correct');
      audioEngine.playEffect('success');
      fx.sparkleBurst(btn);
      showFeedback('good', '🎉 Great job!', isLast);
      quizSpeech.correct();
    } else {
      btn.classList.add('wrong');
      fx.shake(btn);
      audioEngine.playEffect('wrong');
      showFeedback('try', `💛 Good try! It was ${res.correctOption.label}`, isLast);
      quizSpeech.wrong(res.correctOption);
    }

    updateDots();

    // A wrong answer waits longer so the child can absorb the right one.
    pendingNext = setTimeout(goNext, res.isCorrect ? 1600 : 2900);
  }

  function goNext() {
    clearPending();
    if (!session || session.phase !== 'running') return;
    audioEngine.playEffect('whoosh');
    if (session.advance()) renderQuestion();
  }

  function confirmLeave() {
    audioEngine.playEffect('click');
    if (!session || session.phase !== 'running') {
      teardown();
      navigateTo('quiz-select');
      return;
    }
    showConfirm({
      title: 'Leave the quiz?',
      message: 'You will lose the stars from this run. You can always try again!',
      confirmLabel: 'Leave quiz',
      cancelLabel: 'Keep playing',
      danger: true,
      onConfirm: () => {
        teardown();
        navigateTo('quiz-select');
      },
    });
  }

  /* ======================== RESULTS ======================== */

  function showResults(results) {
    teardown();
    const isBest = saveBest(category.id, results);
    const copy = RESULT_COPY[results.stars];

    const stars = el(
      'div',
      { class: 'stars-row', 'aria-label': `${results.stars} of 3 stars`, role: 'img' },
      [0, 1, 2].map((i) =>
        el('span', {
          class: `big-star ${i === 1 ? 'mid' : ''} ${i < results.stars ? 'earned' : 'empty'}`,
          text: '⭐',
        })
      )
    );

    const scoreNum = el('span', { class: 'score-num', text: '0' });
    const frac = el('div', { class: 'score-frac' }, [scoreNum, el('span', { class: 'score-den', text: `/ ${results.answered}` })]);

    const chips = el('div', { class: 'score-chips' }, [
      el('span', { class: 'stat-chip good', text: `✅ ${results.correct} right` }),
      el('span', { class: 'stat-chip try', text: `💛 ${results.wrong} to practice` }),
      el('span', { class: 'stat-chip', text: `🎯 ${results.pct}%` }),
      el('span', { class: 'stat-chip', text: `⏰ ${results.timeUsedLabel}` }),
    ]);

    const scoreCard = el('div', { class: 'score-card' }, [frac, chips]);

    const againBtn = el('button', { class: 'btn btn-hero', type: 'button', text: '🔁 Try Again' });
    againBtn.addEventListener('click', () => {
      audioEngine.playEffect('pop');
      startQuiz();
    });

    const catsBtn = el('button', { class: 'btn btn-soft', type: 'button', text: '🏠 Categories' });
    catsBtn.addEventListener('click', () => {
      audioEngine.playEffect('click');
      navigateTo('quiz-select');
    });

    const learnBtn = el('button', { class: 'btn', type: 'button', text: '📖 Keep Learning' });
    learnBtn.addEventListener('click', () => {
      audioEngine.playEffect('pop');
      if (state.isUnlocked(category.stageId)) {
        navigateTo('stage', { stageId: category.stageId });
      } else {
        showToast('Finish the earlier stages to unlock this one! 🔒');
        navigateTo('home');
      }
    });

    const wrap = el('div', { class: 'quiz-results' }, [
      stars,
      el('h2', { class: 'result-title', text: copy.title }),
      el('p', { class: 'result-sub', text: copy.sub }),
      results.reason === 'time' && results.answered < results.total
        ? el('span', { class: 'timeup-note', text: `⏰ Time's up — you answered ${results.answered} of ${results.total} questions` })
        : null,
      scoreCard,
      isBest && results.answered > 0 ? el('span', { class: 'best-badge new-best', text: '🏅 New best!' }) : null,
      el('div', { class: 'result-actions' }, [againBtn, catsBtn, learnBtn]),
    ]);
    body.replaceChildren(wrap);

    // Celebration: stars pop in one by one, score counts up, confetti falls.
    fx.confetti(screen, { count: results.stars >= 2 ? 110 : 60, duration: 2.4 });
    if (results.stars === 3) fx.stars(screen, { count: 10 });
    audioEngine.playEffect('fanfare');
    [...stars.children].forEach((star, i) => {
      if (star.classList.contains('earned')) {
        setTimeout(() => {
          if (!star.isConnected) return;
          fx.checkPop(star);
          audioEngine.playEffect('star');
        }, 350 + i * 380);
      }
    });
    fx.countUp(scoreNum, results.correct);

    later(900, () => quizSpeech.say(copy.spoken));
  }

  /* ------------------------- start ------------------------- */

  showIntro();
  return screen;
}
