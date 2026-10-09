// Pure Web Audio API sound synthesizer with Master Gain Node and granular volume control

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = typeof window !== 'undefined' 
      ? Number(localStorage.getItem('quiz_sound_volume') ?? 0.7) 
      : 0.7;
    this.muted = typeof window !== 'undefined' 
      ? localStorage.getItem('quiz_sound_muted') === 'true' 
      : false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.applyVolume();
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  applyVolume() {
    if (!this.ctx || !this.masterGain) return;
    const effectiveVolume = this.muted ? 0 : Math.max(0, Math.min(1, this.volume));
    this.masterGain.gain.setValueAtTime(effectiveVolume, this.ctx.currentTime);
  }

  setVolume(level) {
    const parsed = Math.max(0, Math.min(1, Number(level)));
    this.volume = parsed;
    if (parsed > 0) this.muted = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_sound_volume', String(parsed));
      localStorage.setItem('quiz_sound_muted', String(this.muted));
    }
    this.init();
    this.applyVolume();
    return this.volume;
  }

  getVolume() {
    return this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_sound_muted', String(this.muted));
    }
    this.init();
    this.applyVolume();
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  getOutputNode() {
    this.init();
    return this.masterGain || (this.ctx ? this.ctx.destination : null);
  }

  playPop() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playCountdownTick() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playStartHorn() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }

  playCorrect() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.25, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.4);
    });
  }

  playWrong() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.3);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playVictory() {
    if (this.muted || this.volume <= 0) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 659.25, t: 0.15, d: 0.15 },
      { f: 783.99, t: 0.30, d: 0.15 },
      { f: 1046.50, t: 0.45, d: 0.6 }
    ];

    notes.forEach(({ f, t, d }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.28, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + t);
      osc.stop(now + t + d + 0.05);
    });
  }
}

export const sounds = new SoundEngine();
