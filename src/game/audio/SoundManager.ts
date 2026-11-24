import { AudioSettings } from '../core/types';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;

  private settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.38,
    sfxVolume: 0.85,
    muted: false,
  };

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.applyVolumes();
    } catch (err) {
      console.warn('Web Audio API initialization skipped:', err);
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.05);
  }

  private ensureReady(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx || !this.sfxGain) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !this.settings.muted;
  }

  public startBattleMusic(): void {
    this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // 132 BPM sci-fi cybernetic bass & pulse arpeggio
    const stepMs = (60 / 132 / 2) * 1000;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.settings.muted || this.settings.musicVolume <= 0.01) {
        return;
      }
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 49.0, 55];
      const arpNotes = [220, 261.63, 329.63, 392.0, 329.63, 293.66, 261.63, 196.0];

      const barIdx = Math.floor(this.musicStep / 4) % bassNotes.length;
      const subStep = this.musicStep % 8;

      // Driving sub-bass pulse on even steps
      if (subStep % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassNotes[barIdx], now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(subStep === 0 ? 340 : 210, now);
        filter.frequency.exponentialRampToValueAtTime(85, now + 0.18);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.21);
      }

      // Metallic industrial kick on beat 0 and 4
      if (subStep === 0 || subStep === 4) {
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(125, now);
        kick.frequency.exponentialRampToValueAtTime(36, now + 0.13);
        kGain.gain.setValueAtTime(0.28, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        kick.connect(kGain);
        kGain.connect(this.musicGain);
        kick.start(now);
        kick.stop(now + 0.16);
      }

      // High-tech crystalline synth pulse
      if (subStep === 2 || subStep === 5 || subStep === 7) {
        const synth = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        synth.type = 'triangle';
        synth.frequency.setValueAtTime(arpNotes[(this.musicStep + barIdx) % arpNotes.length], now);
        sGain.gain.setValueAtTime(0.06, now);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        synth.connect(sGain);
        sGain.connect(this.musicGain);
        synth.start(now);
        synth.stop(now + 0.17);
      }

      this.musicStep++;
    }, stepMs);
  }

  public stopBattleMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public playFootstep(heavy = false): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Hydraulic thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 95 : 120, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.09);

    gain.gain.setValueAtTime(heavy ? 0.24 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);

    // Subtle servo click
    const servo = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    servo.type = 'sine';
    servo.frequency.setValueAtTime(620, now);
    servo.frequency.linearRampToValueAtTime(840, now + 0.04);
    sGain.gain.setValueAtTime(0.035, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    servo.connect(sGain);
    sGain.connect(this.sfxGain);
    servo.start(now);
    servo.stop(now + 0.05);
  }

  public playDash(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Jet thruster burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(1900, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.3);

    // Turbine whine
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.18);
    oGain.gain.setValueAtTime(0.11, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playSwing(comboStep = 1): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = comboStep === 3 ? 280 : 450;
    filter.frequency.setValueAtTime(baseFreq * 2.2, now);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.16);
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.18);
  }

  public playMetallicHit(heavy = false): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Punch sub impact
    const punch = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(heavy ? 175 : 210, now);
    punch.frequency.exponentialRampToValueAtTime(38, now + (heavy ? 0.22 : 0.13));
    pGain.gain.setValueAtTime(heavy ? 0.55 : 0.38, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.24 : 0.14));
    punch.connect(pGain);
    pGain.connect(this.sfxGain);
    punch.start(now);
    punch.stop(now + 0.25);

    // Metallic clang harmonics
    const freqs = heavy ? [520, 880, 1340] : [680, 1120];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const clang = this.ctx.createOscillator();
      const cGain = this.ctx.createGain();
      clang.type = idx % 2 === 0 ? 'square' : 'triangle';
      clang.frequency.setValueAtTime(f, now);
      clang.frequency.exponentialRampToValueAtTime(f * 0.72, now + 0.18);
      cGain.gain.setValueAtTime(heavy ? 0.14 : 0.09, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      clang.connect(cGain);
      cGain.connect(this.sfxGain);
      clang.start(now);
      clang.stop(now + 0.2);
    });

    // Crunch noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.value = 950;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(heavy ? 0.34 : 0.2, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.13);
  }

  public playLightningStrike(intensity = 1): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Thunder crack noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.45 * intensity);
    filter.Q.value = 0.9;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.65, 0.48 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48 * intensity);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.5 * intensity);

    // Electric arc crackle FM zap
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.055;
      const zap = this.ctx.createOscillator();
      const zGain = this.ctx.createGain();
      zap.type = 'sawtooth';
      zap.frequency.setValueAtTime(1600 - i * 320, now + delay);
      zap.frequency.exponentialRampToValueAtTime(190, now + delay + 0.09);
      zGain.gain.setValueAtTime(0.18 * intensity, now + delay);
      zGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
      zap.connect(zGain);
      zGain.connect(this.sfxGain);
      zap.start(now + delay);
      zap.stop(now + delay + 0.11);
    }
  }

  public playExplosion(scale = 1): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const dur = 0.65 * scale;

    // Deep sub detonation
    const sub = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + dur);
    sGain.gain.setValueAtTime(Math.min(0.75, 0.58 * scale), now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    sub.connect(sGain);
    sGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + dur + 0.05);

    // Roaring explosion noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + dur);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(Math.min(0.68, 0.5 * scale), now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  public playRocketLaunch(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Mechanical latch release + booster roar
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.32);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.linearRampToValueAtTime(1600, now + 0.35);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.36, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.44);
  }

  public playUltimateCharge(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Rising divine reactor chord
    const freqs = [146.83, 220.0, 293.66, 440.0];
    freqs.forEach((f) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.65, now);
      osc.frequency.exponentialRampToValueAtTime(f * 2.0, now + 0.95);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3400, now + 0.95);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.75);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.08);
    });
  }

  public playVictory(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (i === notes.length - 1 ? 0.9 : 0.3));
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.95);
    });
  }

  public playDefeat(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 261.63, 233.08, 196.0];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = now + i * 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.88, start + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  }

  public playUiClick(): void {
    if (!this.ensureReady() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public dispose(): void {
    this.stopBattleMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
