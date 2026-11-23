import type { TimeOfDay, WeatherType } from '../types/game';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private riverGain: GainNode | null = null;
  private riverFilter: BiquadFilterNode | null = null;
  private initialized = false;
  private nextBirdTime = 0;
  private nextCricketTime = 0;

  public init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.initialized = true;
    this.setupWindLoop();
    this.setupRiverLoop();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx) return;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(muted ? 0 : 0.032, this.ctx.currentTime, 0.12);
    }
    if (this.riverGain) {
      this.riverGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    }
  }

  private createNoiseBuffer(durationSec = 2): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.045 * white) / 1.045;
      lastOut = data[i];
    }
    return buffer;
  }

  private setupWindLoop() {
    if (!this.ctx) return;
    const buf = this.createNoiseBuffer(3);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 340;
    this.windFilter.Q.value = 1.4;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = this.muted ? 0 : 0.028;

    src.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    src.start();
  }

  private setupRiverLoop() {
    if (!this.ctx) return;
    const buf = this.createNoiseBuffer(3);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    this.riverFilter = this.ctx.createBiquadFilter();
    this.riverFilter.type = 'bandpass';
    this.riverFilter.frequency.value = 980;
    this.riverFilter.Q.value = 0.75;

    this.riverGain = this.ctx.createGain();
    this.riverGain.gain.value = 0;

    src.connect(this.riverFilter);
    this.riverFilter.connect(this.riverGain);
    this.riverGain.connect(this.ctx.destination);
    src.start();
  }

  public updateAmbience(
    altitudePct: number,
    weather: WeatherType,
    timeOfDay: TimeOfDay,
    riverProximity: number,
  ) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Mountain Wind (intensifies with altitude & storm)
    if (this.windGain && this.windFilter) {
      let base = 0.02 + (altitudePct / 100) * 0.075;
      let freq = 260 + (altitudePct / 100) * 420;
      if (weather === 'badai') {
        base += 0.1;
        freq += 280;
      } else if (weather === 'hujan') {
        base += 0.048;
      } else if (weather === 'berkabut') {
        base += 0.018;
        freq -= 45;
      } else if (weather === 'salju') {
        base += 0.042;
        freq += 150;
      } else if (weather === 'kiamat') {
        base += 0.135;
        freq -= 95;
      }
      if (timeOfDay === 'malam') {
        base += 0.015;
      }
      this.windGain.gain.setTargetAtTime(base, now, 0.25);
      this.windFilter.frequency.setTargetAtTime(Math.max(120, freq), now, 0.25);
    }

    // 2. Babbling River / Waterfall Stream near river & wooden bridge
    if (this.riverGain && this.riverFilter) {
      const rGain = Math.max(0, Math.min(1, riverProximity)) * 0.14;
      this.riverGain.gain.setTargetAtTime(rGain, now, 0.2);
      this.riverFilter.frequency.setTargetAtTime(
        760 + Math.sin(now * 2.1) * 180 + riverProximity * 350,
        now,
        0.18,
      );
    }

    // 3. Daytime Forest Bird Chirps (Pagi / Siang below peak tundra)
    if ((timeOfDay === 'pagi' || timeOfDay === 'siang') && weather !== 'badai' && altitudePct < 78) {
      if (now >= this.nextBirdTime) {
        this.playBirdChirp(now);
        this.nextBirdTime = now + 2.4 + Math.random() * 4.2;
      }
    }

    // 4. Nighttime Crickets (Malam / late Sore)
    if (timeOfDay === 'malam' && weather !== 'badai' && altitudePct < 88) {
      if (now >= this.nextCricketTime) {
        this.playCricketPulse(now);
        this.nextCricketTime = now + 1.3 + Math.random() * 2.1;
      }
    }
  }

  public updateWind(altitudePct: number, weather: WeatherType) {
    this.updateAmbience(altitudePct, weather, 'pagi', 0);
  }

  private playBirdChirp(now: number) {
    if (!this.ctx) return;
    const notes = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < notes; i++) {
      const t = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const base = 1950 + Math.random() * 850;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.38, t + 0.045);
      osc.frequency.exponentialRampToValueAtTime(base * 0.92, t + 0.085);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.028, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  private playCricketPulse(now: number) {
    if (!this.ctx) return;
    const chirps = 3;
    for (let i = 0; i < chirps; i++) {
      const t = now + i * 0.085;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(4150 + Math.random() * 140, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.018, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  public playFootstep(surface: 'dirt' | 'stone' | 'wood' = 'dirt') {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Surface-textured noise brush / gravel scuff
    const buf = this.createNoiseBuffer(0.11);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = surface === 'wood' ? 420 : surface === 'stone' ? 1420 : 620;
      filter.Q.value = surface === 'stone' ? 2.4 : 1.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(surface === 'dirt' ? 0.1 : 0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }

    // 2. Tactile shoe sole impact knock (distinct on stone & hollow wooden planks)
    if (surface === 'stone' || surface === 'wood') {
      const knock = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      knock.type = surface === 'wood' ? 'triangle' : 'sine';
      knock.frequency.setValueAtTime(surface === 'wood' ? 175 : 290, now);
      knock.frequency.exponentialRampToValueAtTime(surface === 'wood' ? 78 : 110, now + 0.065);
      kGain.gain.setValueAtTime(surface === 'wood' ? 0.14 : 0.11, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      knock.connect(kGain);
      kGain.connect(this.ctx.destination);
      knock.start(now);
      knock.stop(now + 0.08);
    }
  }

  public playJump() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // Push-off spring tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.13);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Subtle climber exhale breath puff
    const buf = this.createNoiseBuffer(0.16);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 920;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.055, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(this.ctx.destination);
      src.start(now);
    }
  }

  public playLand(surface: 'dirt' | 'stone' | 'wood' = 'dirt', impactStrength = 1.0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const amp = Math.min(1.4, Math.max(0.5, impactStrength));

    // Heavy boot landing thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = surface === 'wood' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(surface === 'wood' ? 132 : 105, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
    gain.gain.setValueAtTime(0.2 * amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);

    // Surface scuff & landing breath
    const buf = this.createNoiseBuffer(0.15);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = surface === 'stone' ? 1600 : 880;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.13 * amp, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(filter);
      filter.connect(ng);
      ng.connect(this.ctx.destination);
      src.start(now);
    }
  }

  public playLandslide() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(2.4);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.linearRampToValueAtTime(92, now + 2.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 2.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playThunder() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(2.8);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 2.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 2.7);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playKuntilanakLaugh() {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Master limiter/gain so layered eerie cackles stay clear and never clip
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, now);
    masterGain.connect(ctx.destination);

    // Spooky mountain cavern echo chain (Delay -> Lowpass -> Feedback)
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.21;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2800;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const echoMix = ctx.createGain();
    echoMix.gain.value = 0.42;

    delay.connect(echoTone);
    echoTone.connect(fb);
    fb.connect(delay);
    echoTone.connect(echoMix);
    echoMix.connect(masterGain);

    // Human vocal formant filter chain (F1 nasal ~880Hz + F2 shrill ~2350Hz)
    const vocalBus = ctx.createGain();
    vocalBus.gain.value = 1.0;

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(860, now);
    f1.Q.value = 3.2;

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(2250, now);
    f2.Q.value = 4.2;

    const f1Gain = ctx.createGain();
    f1Gain.gain.value = 1.05;
    const f2Gain = ctx.createGain();
    f2Gain.gain.value = 0.72;

    vocalBus.connect(f1);
    vocalBus.connect(f2);
    f1.connect(f1Gain);
    f2.connect(f2Gain);
    f1Gain.connect(masterGain);
    f2Gain.connect(masterGain);
    f1Gain.connect(delay);
    f2Gain.connect(delay);

    // Shared breath noise buffer for ghostly vocal rasp
    const noiseBuf = this.createNoiseBuffer(0.9);

    const scheduleLaughSyllable = (
      offset: number,
      dur: number,
      startFreq: number,
      peakFreq: number,
      endFreq: number,
      amp: number,
      vibRate: number,
      vibDepth: number,
    ) => {
      const t0 = now + offset;
      const tEnd = t0 + dur;

      // Primary sawtooth (rich vocal harmonics) + slightly detuned triangle (eerie shimmer)
      const oscMain = ctx.createOscillator();
      const oscSub = ctx.createOscillator();
      oscMain.type = 'sawtooth';
      oscSub.type = 'triangle';

      oscMain.frequency.setValueAtTime(startFreq, t0);
      oscMain.frequency.exponentialRampToValueAtTime(peakFreq, t0 + dur * 0.34);
      oscMain.frequency.exponentialRampToValueAtTime(endFreq, tEnd);

      oscSub.frequency.setValueAtTime(startFreq * 1.008, t0);
      oscSub.frequency.exponentialRampToValueAtTime(peakFreq * 1.012, t0 + dur * 0.34);
      oscSub.frequency.exponentialRampToValueAtTime(endFreq * 0.994, tEnd);

      // Natural human vocal vibrato (6.5 - 8.5 Hz)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(vibRate, t0);
      lfoGain.gain.setValueAtTime(vibDepth, t0);
      lfo.connect(lfoGain);
      lfoGain.connect(oscMain.frequency);
      lfoGain.connect(oscSub.frequency);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0008, t0);
      env.gain.linearRampToValueAtTime(amp, t0 + Math.min(0.035, dur * 0.18));
      env.gain.setValueAtTime(amp * 0.88, t0 + dur * 0.55);
      env.gain.exponentialRampToValueAtTime(0.0008, tEnd);

      oscMain.connect(env);
      oscSub.connect(env);
      env.connect(vocalBus);

      // Subtle breathy hiss on each "hii..." attack
      if (noiseBuf) {
        const breath = ctx.createBufferSource();
        breath.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1750, t0);
        bp.Q.value = 2.6;
        const bEnv = ctx.createGain();
        bEnv.gain.setValueAtTime(0.0005, t0);
        bEnv.gain.linearRampToValueAtTime(amp * 0.36, t0 + 0.025);
        bEnv.gain.exponentialRampToValueAtTime(0.0005, t0 + Math.min(dur, 0.25));
        breath.connect(bp);
        bp.connect(bEnv);
        bEnv.connect(masterGain);
        breath.start(t0);
        breath.stop(t0 + Math.min(dur, 0.28));
      }

      lfo.start(t0);
      oscMain.start(t0);
      oscSub.start(t0);
      lfo.stop(tEnd + 0.02);
      oscMain.stop(tEnd + 0.02);
      oscSub.stop(tEnd + 0.02);
    };

    // 3 eerie Indonesian Kuntilanak laugh phrases spanning ~4.8 seconds:
    // Phrase 1 (0.00s - 1.38s): "hi-hi-hi-hi-hiiii..." rising sharp then wailing down
    const phrase1: Array<[number, number, number, number, number, number, number, number]> = [
      [0.0, 0.14, 640, 790, 690, 0.11, 7.2, 22],
      [0.16, 0.14, 710, 880, 760, 0.125, 7.4, 24],
      [0.32, 0.15, 790, 960, 820, 0.135, 7.6, 26],
      [0.49, 0.16, 860, 1060, 900, 0.14, 7.8, 28],
      [0.67, 0.72, 940, 1180, 620, 0.135, 6.8, 36],
    ];
    // Phrase 2 (1.65s - 3.12s): sharper second cackle burst circling closer
    const phrase2: Array<[number, number, number, number, number, number, number, number]> = [
      [1.65, 0.13, 740, 920, 790, 0.115, 7.5, 25],
      [1.81, 0.14, 830, 1020, 860, 0.13, 7.8, 28],
      [1.98, 0.14, 920, 1140, 960, 0.14, 8.0, 30],
      [2.15, 0.15, 980, 1240, 1020, 0.135, 8.1, 32],
      [2.33, 0.82, 1080, 1310, 660, 0.13, 6.5, 42],
    ];
    // Phrase 3 (3.42s - 4.75s): haunting distant trailing "hi-hi-hiiii..."
    const phrase3: Array<[number, number, number, number, number, number, number, number]> = [
      [3.42, 0.14, 760, 910, 780, 0.085, 7.0, 22],
      [3.6, 0.15, 820, 980, 820, 0.08, 7.2, 24],
      [3.78, 0.96, 890, 1060, 540, 0.075, 6.2, 34],
    ];

    [...phrase1, ...phrase2, ...phrase3].forEach((p) =>
      scheduleLaughSyllable(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]),
    );
  }

  public playPocongHop() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(142, now);
    osc.frequency.exponentialRampToValueAtTime(46, now + 0.16);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);

    const buf = this.createNoiseBuffer(0.22);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(620, now);
      bp.frequency.exponentialRampToValueAtTime(240, now + 0.2);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.08, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(this.ctx.destination);
      src.start(now);
    }
  }

  public playTigerRoar() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(128, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.78);

    lfo.frequency.value = 28;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.linearRampToValueAtTime(210, now + 0.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.86);
    osc.stop(now + 0.86);

    const buf = this.createNoiseBuffer(0.75);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = 460;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.14, now);
      nGain.gain.exponentialRampToValueAtTime(0.002, now + 0.72);
      src.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.ctx.destination);
      src.start(now);
    }
  }

  public playBearGrowl() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.linearRampToValueAtTime(64, now + 0.65);

    lfo.frequency.value = 22;
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.value = 320;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.68);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.7);
    osc.stop(now + 0.7);
  }

  public playBoarSnort() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [0, 0.16].forEach((off) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(165, now + off);
      osc.frequency.exponentialRampToValueAtTime(75, now + off + 0.11);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.setValueAtTime(0.14, now + off);
      gain.gain.exponentialRampToValueAtTime(0.002, now + off + 0.12);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + off);
      osc.stop(now + off + 0.13);
    });
  }

  public playSnakeHiss() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(0.65);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.62);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playEmoteChime() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCheckpoint() {
    if (!this.ctx || this.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.32);
    });
  }

  public playQuizResult(isCorrect: boolean) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (isCorrect) {
      [587.33, 880].forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.15, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(132, now + 0.32);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  }

  public playLadderClimb() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.08);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.002, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSlideWhoosh() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(0.35);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.exponentialRampToValueAtTime(1250, now + 0.3);
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.004, now + 0.33);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playEarthquake(durationSec = 3.2) {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(Math.min(4.5, durationSec));
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(95, now);
    filter.frequency.linearRampToValueAtTime(60, now + Math.min(4.0, durationSec));

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.004, now + Math.min(4.3, durationSec));

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playWildfireCrackle() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(1.4);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.004, now + 1.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playIceHail() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const buf = this.createNoiseBuffer(1.8);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + 1.6);
      filter.Q.value = 2.1;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 1.7);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }

    // Crisp icy crystal tinkles
    [0.05, 0.24, 0.45, 0.7].forEach((off, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + idx * 320, now + off);
      g.gain.setValueAtTime(0.055, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.14);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now + off);
      osc.stop(now + off + 0.15);
    });
  }

  public playGeyserBlast() {
    if (!this.ctx || this.muted) return;
    const buf = this.createNoiseBuffer(0.75);
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.72);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  public playLightningStrike() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.25);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.004, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
    this.playThunder();
  }

  public playMeteorImpact() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    // Fiery atmospheric entry shriek
    const whistle = this.ctx.createOscillator();
    const wGain = this.ctx.createGain();
    whistle.type = 'sawtooth';
    whistle.frequency.setValueAtTime(720, now);
    whistle.frequency.exponentialRampToValueAtTime(58, now + 0.55);
    wGain.gain.setValueAtTime(0.08, now);
    wGain.gain.exponentialRampToValueAtTime(0.002, now + 0.58);
    whistle.connect(wGain);
    wGain.connect(this.ctx.destination);
    whistle.start(now);
    whistle.stop(now + 0.6);

    // Sub-bass crater shockwave
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now + 0.14);
    sub.frequency.exponentialRampToValueAtTime(30, now + 1.05);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.16);
    subGain.gain.exponentialRampToValueAtTime(0.002, now + 1.15);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 1.18);

    const buf = this.createNoiseBuffer(1.4);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(640, now + 0.12);
      lp.frequency.exponentialRampToValueAtTime(90, now + 1.3);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.001, now);
      ng.gain.linearRampToValueAtTime(0.32, now + 0.16);
      ng.gain.exponentialRampToValueAtTime(0.004, now + 1.35);
      src.connect(lp);
      lp.connect(ng);
      ng.connect(this.ctx.destination);
      src.start(now);
    }
  }
}
