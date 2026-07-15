import { State } from "./State";
import { AudioEngine } from "./AudioEngine";
import { clamp } from "./utils";
import { EXPRESSIVE_RANGE } from "./constants";

export class Synthesizer {
  constructor(
    private readonly engine: AudioEngine,
    private readonly state: State
  ) {}

  private expressiveCurve(l: number): number {
    return 0.75 + Math.pow(l / 100, 1.3) * 0.5;
  }

  private getIntensity(): number {
    return Math.pow(this.state.timing_intensity ?? 1, 1.5);
  }

  public getStepDur(): number {
    const bpm = isFinite(this.state.bpm) && this.state.bpm > 0 ? this.state.bpm : 120;
    const spd = isFinite(this.state.speed) && this.state.speed > 0 ? this.state.speed : 1;
    return Math.max(0.05, 60 / bpm / clamp(spd, 0.5, 8));
  }

  public getSpeedMod(lastL: number): number {
    const baseMod = this.expressiveCurve(lastL);
    return clamp(
      1 + (baseMod - 1) * this.getIntensity() * EXPRESSIVE_RANGE * 0.6,
      0.85,
      1.2
    );
  }

  public scheduleNote(freq: number, vel: number, brightness: number, pan: number, time: number): number {
    const ctx = this.engine.ctx;
    const dry = this.engine.dry;
    const conv = this.engine.conv;
    if (!ctx || !dry || !conv) return time;

    const jitterAmt = this.state.speed > 2 ? 0.003 : 0.0005;
    const jitter = (Math.random() - 0.5) * jitterAmt;
    time = Math.max(time + jitter, ctx.currentTime + 0.001);
    if (!isFinite(time)) return time;

    const p = this.state;
    const stepDur = this.getStepDur();

    const baseMod = this.expressiveCurve(brightness * 100);
    const durMod = clamp(
      1 + (baseMod - 1) * this.getIntensity() * EXPRESSIVE_RANGE * 0.75,
      0.85,
      1.2
    );

    const dur = clamp(
      isFinite(stepDur) ? stepDur * p.note_mult * (0.6 + 0.8 * vel) * durMod : 0.2,
      0.06,
      2.0
    );

    const cutoff = p.filter_track === 0
      ? p.filter_base
      : clamp(p.filter_base + brightness * p.filter_track, 40, ctx.sampleRate * 0.45);

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = p.resonance;
    filt.frequency.setValueAtTime(cutoff, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);

    const trem = ctx.createGain();
    trem.gain.setValueAtTime(1 - p.tremolo_depth, time);

    const tremLfo = ctx.createOscillator();
    tremLfo.frequency.setValueAtTime(p.tremolo_rate, time);

    const tremGain = ctx.createGain();
    tremGain.gain.setValueAtTime(p.tremolo_depth, time);
    tremLfo.connect(tremGain).connect(trem.gain);

    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.setValueAtTime(200, time);
    bass.gain.setValueAtTime(p.bass_gain, time);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(clamp(pan, -1, 1), time);

    filt.connect(env);
    env.connect(trem);
    trem.connect(bass);
    bass.connect(panner);
    panner.connect(conv);
    panner.connect(dry);

    const peak = 0.2 + vel * 0.6;
    env.gain.linearRampToValueAtTime(peak, time + 0.01);
    env.gain.setTargetAtTime(peak * 0.6, time + 0.03, 0.05);
    env.gain.setTargetAtTime(0.0001, time + dur * 0.7, 0.1);

    const src = ctx.createGain();

    const osc = ctx.createOscillator();
    this.applyWave(osc, ctx);
    osc.frequency.setValueAtTime(freq, time);

    const osc5 = ctx.createOscillator();
    this.applyWave(osc5, ctx);
    osc5.frequency.setValueAtTime(freq * 1.5, time);

    const osc8 = ctx.createOscillator();
    this.applyWave(osc8, ctx);
    osc8.frequency.setValueAtTime(freq * 2.0, time);

    const vib = ctx.createOscillator();
    vib.frequency.setValueAtTime(p.vibrato_rate, time);

    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(freq * (Math.pow(2, p.vibrato_depth / 1200) - 1), time);

    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    vibGain.connect(osc5.frequency);
    vibGain.connect(osc8.frequency);

    const mix5 = ctx.createGain();
    const mix8 = ctx.createGain();

    let fifthLevel = clamp(p.fifth_lvl, 0, 1);
    let octLevel = clamp(p.oct_lvl, 0, 1);

    if (p.osc_type === "bell") {
      fifthLevel *= 0.35;
      octLevel *= 0.25;
    }

    mix5.gain.setValueAtTime(fifthLevel, time);
    mix8.gain.setValueAtTime(octLevel, time);

    osc.connect(src);
    osc5.connect(mix5).connect(src);
    osc8.connect(mix8).connect(src);

    src.connect(filt);

    const end = time + dur + 0.05;

    osc.start(time);
    osc.stop(end);
    osc5.start(time);
    osc5.stop(end);
    osc8.start(time);
    osc8.stop(end);
    vib.start(time);
    vib.stop(end);
    tremLfo.start(time);
    tremLfo.stop(time + dur + 0.1);

    return time;
  }

  private applyWave(oscillator: OscillatorNode, ctx: BaseAudioContext): void {
    const type = this.state.osc_type;

    if (["sine", "square", "sawtooth", "triangle"].includes(type)) {
      oscillator.type = type as OscillatorType;
      return;
    }

    if (type === "pulse") {
      const real = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
      const imag = new Float32Array([0, 1, 0, 0.33, 0, 0.2, 0, 0.14]);
      oscillator.setPeriodicWave(ctx.createPeriodicWave(real, imag));
      return;
    }

    if (type === "organ") {
      const real = new Float32Array([0, 1, 0.8, 0.6, 0.45, 0.3, 0.2]);
      const imag = new Float32Array(real.length);
      oscillator.setPeriodicWave(ctx.createPeriodicWave(real, imag));
      return;
    }

    if (type === "bell") {
      const real = new Float32Array([0, 1, 0.9, 0.55, 0.32, 0.18, 0.09, 0.04]);
      const imag = new Float32Array(real.length);
      oscillator.setPeriodicWave(ctx.createPeriodicWave(real, imag));
      return;
    }

    oscillator.type = "triangle";
  }
}
