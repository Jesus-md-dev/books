/**
 * Wheel sound effects synthesized with the Web Audio API (no audio files).
 * The AudioContext is created on the first user gesture, as browsers require.
 */
export function createWheelSounds() {
  let ctx = null;

  const context = () => {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const tone = (frequency, start, length, { type = 'triangle', volume = 0.2, endFrequency } = {}) => {
    const audio = context();
    if (!audio) return;
    const at = audio.currentTime + start;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + length);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + length);
  };

  return {
    unlock: context,
    tick: () => tone(1400, 0, 0.03, { type: 'square', volume: 0.08 }),
    eliminate: () => tone(440, 0, 0.4, { type: 'sawtooth', volume: 0.12, endFrequency: 150 }),
    win: () => {
      [523.25, 659.25, 783.99].forEach((frequency, i) => tone(frequency, i * 0.12, 0.15));
      tone(1046.5, 0.36, 0.6, { volume: 0.25 });
    },
    close: () => {
      ctx?.close();
      ctx = null;
    },
  };
}
