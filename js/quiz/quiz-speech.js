// Quiz speech — short, friendly narration built on the shared audio
// engine (which already handles voice picking, cancel-before-speak,
// music ducking and the "slightly slower, kind teacher" voice).

import { audioEngine } from '../systems/audio.js';

const PRAISE = ['Great job!', 'Well done!', 'Awesome!', 'Fantastic!', 'Super!'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const quizSpeech = {
  say(text) {
    audioEngine.pronounce({ text, path: null });
  },

  welcome(title) {
    this.say(`Welcome to the ${title} quiz! Are you ready?`);
  },

  question(q) {
    this.say(q.speech);
  },

  correct() {
    this.say(pick(PRAISE));
  },

  // Names the right answer in a warm way — letters use their phonetic
  // name (M → "em") so text-to-speech says the letter itself.
  wrong(option) {
    this.say(`Good try! The answer is ${option.speech}.`);
  },

  stop() {
    audioEngine.stopPronunciation();
  },
};
