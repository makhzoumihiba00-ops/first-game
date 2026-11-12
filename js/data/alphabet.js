// Stage 1 data — the 26 English letters.
// audio: recorded pronunciation (optional). Falls back to speech synthesis.
// speech: phonetic English letter NAME ("zee", "ay", …) so text-to-speech
// always says the letter itself — never a foreign pronunciation of "z" etc.

export const alphabet = [
  { id: 'a', letter: 'A', speech: 'ay', audio: 'assets/audio/alphabet/a.mp3' },
  { id: 'b', letter: 'B', speech: 'bee', audio: 'assets/audio/alphabet/b.mp3' },
  { id: 'c', letter: 'C', speech: 'see', audio: 'assets/audio/alphabet/c.mp3' },
  { id: 'd', letter: 'D', speech: 'dee', audio: 'assets/audio/alphabet/d.mp3' },
  { id: 'e', letter: 'E', speech: 'ee', audio: 'assets/audio/alphabet/e.mp3' },
  { id: 'f', letter: 'F', speech: 'ef', audio: 'assets/audio/alphabet/f.mp3' },
  { id: 'g', letter: 'G', speech: 'jee', audio: 'assets/audio/alphabet/g.mp3' },
  { id: 'h', letter: 'H', speech: 'aitch', audio: 'assets/audio/alphabet/h.mp3' },
  { id: 'i', letter: 'I', speech: 'eye', audio: 'assets/audio/alphabet/i.mp3' },
  { id: 'j', letter: 'J', speech: 'jay', audio: 'assets/audio/alphabet/j.mp3' },
  { id: 'k', letter: 'K', speech: 'kay', audio: 'assets/audio/alphabet/k.mp3' },
  { id: 'l', letter: 'L', speech: 'ell', audio: 'assets/audio/alphabet/l.mp3' },
  { id: 'm', letter: 'M', speech: 'em', audio: 'assets/audio/alphabet/m.mp3' },
  { id: 'n', letter: 'N', speech: 'en', audio: 'assets/audio/alphabet/n.mp3' },
  { id: 'o', letter: 'O', speech: 'oh', audio: 'assets/audio/alphabet/o.mp3' },
  { id: 'p', letter: 'P', speech: 'pee', audio: 'assets/audio/alphabet/p.mp3' },
  { id: 'q', letter: 'Q', speech: 'cue', audio: 'assets/audio/alphabet/q.mp3' },
  { id: 'r', letter: 'R', speech: 'ar', audio: 'assets/audio/alphabet/r.mp3' },
  { id: 's', letter: 'S', speech: 'ess', audio: 'assets/audio/alphabet/s.mp3' },
  { id: 't', letter: 'T', speech: 'tee', audio: 'assets/audio/alphabet/t.mp3' },
  { id: 'u', letter: 'U', speech: 'you', audio: 'assets/audio/alphabet/u.mp3' },
  { id: 'v', letter: 'V', speech: 'vee', audio: 'assets/audio/alphabet/v.mp3' },
  { id: 'w', letter: 'W', speech: 'double you', audio: 'assets/audio/alphabet/w.mp3' },
  { id: 'x', letter: 'X', speech: 'ex', audio: 'assets/audio/alphabet/x.mp3' },
  { id: 'y', letter: 'Y', speech: 'why', audio: 'assets/audio/alphabet/y.mp3' },
  { id: 'z', letter: 'Z', speech: 'zee', audio: 'assets/audio/alphabet/z.mp3' },
];
