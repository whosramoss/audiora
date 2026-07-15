import { State } from "./State";
import { clamp } from "./utils";

export class AudioEngine {
  private _ctx: BaseAudioContext | null = null;
  private _master: GainNode | null = null;
  private _analyser: AnalyserNode | null = null;
  private _conv: ConvolverNode | null = null;
  private _wet: GainNode | null = null;
  private _dry: GainNode | null = null;

  public get ctx(): BaseAudioContext | null { return this._ctx; }
  public get master(): GainNode | null { return this._master; }
  public get analyser(): AnalyserNode | null { return this._analyser; }
  public get conv(): ConvolverNode | null { return this._conv; }
  public get wet(): GainNode | null { return this._wet; }
  public get dry(): GainNode | null { return this._dry; }

  public ensure(state: State): void {
    if (this._ctx) return;
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.buildGraph(new Ctx(), state);
  }

  public ensureOffline(ctx: OfflineAudioContext, state: State): void {
    this.buildGraph(ctx, state);
  }

  private buildGraph(ctx: BaseAudioContext, state: State): void {
    const master = ctx.createGain();
    const analyser = ctx.createAnalyser();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const conv = ctx.createConvolver();

    master.gain.value = Math.pow(state.volume ?? 0.8, 2);
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.88;
    conv.buffer = this.makeImpulse(ctx, state.reverb_time, 3);
    wet.gain.value = state.reverb_mix;
    dry.gain.value = this.dryVal(state.reverb_mix);

    conv.connect(wet);
    dry.connect(analyser);
    wet.connect(analyser);
    analyser.connect(master);
    master.connect(ctx.destination);

    this._ctx = ctx;
    this._master = master;
    this._analyser = analyser;
    this._conv = conv;
    this._wet = wet;
    this._dry = dry;
  }

  public makeImpulse(ctx: BaseAudioContext, dur: number, decay: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  public dryVal(mix: number): number {
    return mix >= 0.99 ? 0 : 1 - mix;
  }

  public smooth(param: AudioParam, value: number, tau: number = 0.02): void {
    if (!this._ctx || !isFinite(value)) return;
    param.setTargetAtTime(value, this._ctx.currentTime, tau);
  }

  public async resume(): Promise<void> {
    if (this._ctx instanceof AudioContext && this._ctx.state === "suspended") {
      await this._ctx.resume();
    }
  }

  public suspend(): void {
    if (this._ctx instanceof AudioContext && this._ctx.state === "running") {
      this._ctx.suspend().catch(() => {});
    }
  }

  public async warmUp(state: State): Promise<void> {
    this.ensure(state);
    if (!(this._ctx instanceof AudioContext)) return;
    await this.resume();

    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    g.gain.value = 0.00001;
    osc.connect(g).connect(this._master!);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.15);
  }

  public updateReverbBuffer(state: State): void {
    if (!this._ctx || !this._conv) return;
    this._conv.buffer = this.makeImpulse(this._ctx, state.reverb_time, 3);
  }
}
