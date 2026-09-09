import { State } from "./core/State";
import { AudioEngine } from "./core/AudioEngine";
import { Synthesizer } from "./core/Synthesizer";
import { Scheduler } from "./core/Scheduler";
import { Sequencer } from "./core/Scanner";
import { ImageProcessor, BlockGrid } from "./core/ImageProcessor";
import { audioBufferToWavBlob } from "./core/wav";
import { PresetData } from "./core/types";
import { KEY, SCALES } from "./core/constants";
import { Tweener, TweenTickHandler } from "./ui/Tweener";
import { Renderer } from "./ui/Renderer";
import { resolveImageElement, type ImageSource } from "./core/image";
import type { AudioraEventMap, AudioraEventType } from "./core/events";

export type { ImageSource };

export interface RenderOptions {
  image?: ImageSource;
  params?: Partial<PresetData>;
  duration?: number;
  sampleRate?: number;
}

export interface LiveOptions {
  waveCanvas?: HTMLCanvasElement;
  mapCanvas?: HTMLCanvasElement;
  onTweenTick?: TweenTickHandler;
}

const DEFAULT_DURATION_SECONDS = 10;
const DEFAULT_SAMPLE_RATE = 44100;
const OUTPUT_CHANNELS = 2;

export interface Audiora {
  addEventListener<K extends AudioraEventType>(
    type: K,
    listener: (this: Audiora, event: AudioraEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends AudioraEventType>(
    type: K,
    listener: (this: Audiora, event: AudioraEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

export class Audiora extends EventTarget {
  private readonly state = new State();
  private readonly engine = new AudioEngine();
  private readonly imageProcessor = new ImageProcessor();
  private readonly grid = new BlockGrid();
  private readonly seq: Sequencer;
  private readonly synth: Synthesizer;
  private readonly scheduler: Scheduler;
  private readonly tweener: Tweener;
  private renderer: Renderer | null = null;
  private reverbDebounce: ReturnType<typeof setTimeout> | null = null;
  private loadedImage: HTMLImageElement | null = null;
  private playStartTime = 0;

  constructor(options: LiveOptions = {}) {
    super();
    this.seq = new Sequencer(this.grid);
    this.synth = new Synthesizer(this.engine, this.state);
    this.scheduler = new Scheduler(
      this.state,
      this.engine,
      this.synth,
      this.seq,
      this.grid,
      (detail) => this.emit("noteplay", detail),
    );
    this.tweener = new Tweener(this.state, this.engine, options.onTweenTick);

    if (options.waveCanvas && options.mapCanvas) {
      this.attachVisuals(options.waveCanvas, options.mapCanvas);
    }
  }

  public get playing(): boolean {
    return this.state.playing;
  }

  public attachVisuals(
    waveCanvas: HTMLCanvasElement,
    mapCanvas: HTMLCanvasElement,
  ): void {
    this.renderer?.stop();
    this.renderer = new Renderer(
      waveCanvas,
      mapCanvas,
      this.engine,
      this.imageProcessor,
      this.grid,
      this.seq,
    );
    this.renderer.start();
  }

  public resizeVisuals(): void {
    this.renderer?.resizeCanvases();
  }

  public async loadImage(image: ImageSource): Promise<void> {
    try {
      const img = await resolveImageElement(image);
      this.loadedImage = img;
      this.imageProcessor.processImage(img);
      this.rebuildGrid();
      this.emit("imageload", {
        width: img.naturalWidth,
        height: img.naturalHeight,
        blockCount: this.grid.list.length,
      });
    } catch (err) {
      throw this.emitError(err, "loadImage");
    }
  }

  public async play(): Promise<void> {
    try {
      this.engine.ensure(this.state);
      if (!this.engine.ctx) {
        throw new Error("Web Audio API is not available");
      }
      if (this.state.playing) return;
      await this.engine.resume();
    } catch (err) {
      throw this.emitError(err, "play");
    }

    if (!this.engine.ctx || this.state.playing) return;

    this.state.playing = true;
    this.playStartTime = this.engine.ctx.currentTime;
    this.scheduler.start();
    this.emit("start", { timestamp: this.engine.ctx.currentTime });
  }

  public stop(): void {
    if (!this.state.playing) return;

    const timestamp = this.engine.ctx?.currentTime ?? 0;
    const duration = timestamp - this.playStartTime;

    this.state.playing = false;
    this.seq.nextTime = 0;
    this.seq.active = false;
    this.seq.activateAt = 0;
    this.scheduler.stop();
    this.engine.suspend();

    this.emit("stop", { timestamp, duration });
  }

  public async warmUp(): Promise<void> {
    try {
      await this.engine.warmUp(this.state);
    } catch (err) {
      throw this.emitError(err, "warmUp");
    }
  }

  public getParam(key: keyof PresetData): string | number {
    const value = (this.state as unknown as Record<string, unknown>)[key];
    return value as string | number;
  }

  public setParam(key: keyof PresetData, value: string | number): void {
    if (typeof value === "number") this.state.setNumeric(key, value);
    else this.state.setString(key, value);
    this.applyParamSideEffects(key);
  }

  public applyParams(
    patch: Partial<PresetData>,
    options: { tween?: boolean } = {},
  ): void {
    const { tween = true } = options;

    if (tween) {
      this.state.applyPatch(patch);
      this.rebuildGrid();
      this.tweener.tweenTo(patch);
    } else {
      this.tweener.cancel();
      this.state.applyAll(patch);
      this.rebuildGrid();
      this.syncLiveAudioFromState();
    }

    if (patch.scan_mode) {
      this.seq.resetPosition(this.state);
      this.scheduler.resync();
    }
  }

  public captureParams(): Partial<PresetData> {
    return this.state.capture();
  }

  public async toAudioBuffer(options: RenderOptions = {}): Promise<AudioBuffer> {
    try {
      return await this.renderOffline(options);
    } catch (err) {
      throw this.emitError(err, "toAudioBuffer");
    }
  }

  public async toBlob(options: RenderOptions = {}): Promise<Blob> {
    const buffer = await this.toAudioBuffer(options);
    return audioBufferToWavBlob(buffer);
  }

  private async renderOffline(options: RenderOptions): Promise<AudioBuffer> {
    const {
      duration = DEFAULT_DURATION_SECONDS,
      sampleRate = DEFAULT_SAMPLE_RATE,
    } = options;

    const state = new State();
    state.applyAll(options.params ?? this.state.capture());

    const imageProcessor = new ImageProcessor();
    const grid = new BlockGrid();
    const img = options.image
      ? await resolveImageElement(options.image)
      : this.loadedImage;

    if (!img) throw new Error("No image loaded. Pass `image` or call loadImage first.");

    imageProcessor.processImage(img);
    grid.build(imageProcessor, state);

    const seq = new Sequencer(grid);
    seq.resetPosition(state);

    const ctx = new OfflineAudioContext({
      numberOfChannels: OUTPUT_CHANNELS,
      length: Math.max(1, Math.ceil(duration * sampleRate)),
      sampleRate,
    });

    const engine = new AudioEngine();
    engine.ensureOffline(ctx, state);

    const synth = new Synthesizer(engine, state);
    const scheduler = new Scheduler(state, engine, synth, seq, grid);
    scheduler.renderRange(0, duration);

    return ctx.startRendering();
  }

  private rebuildGrid(): void {
    this.grid.build(this.imageProcessor, this.state);
    this.seq.clampToGrid();
    this.scheduler.resync();
  }

  private applyParamSideEffects(key: keyof PresetData): void {
    switch (key) {
      case KEY.volume:
        if (this.engine.master) {
          this.engine.smooth(
            this.engine.master.gain,
            Math.pow(this.state.volume, 2),
          );
        }
        break;
      case KEY.bpm:
      case KEY.speed:
      case KEY.note_mult:
        this.scheduler.resync();
        break;
      case KEY.reverb_mix:
        if (this.engine.wet && this.engine.dry) {
          this.engine.smooth(this.engine.wet.gain, this.state.reverb_mix);
          this.engine.smooth(
            this.engine.dry.gain,
            this.engine.dryVal(this.state.reverb_mix),
          );
        }
        break;
      case KEY.reverb_time:
        if (!this.engine.ctx || !this.engine.conv) return;
        if (this.reverbDebounce) clearTimeout(this.reverbDebounce);
        this.reverbDebounce = setTimeout(
          () => this.engine.updateReverbBuffer(this.state),
          120,
        );
        break;
      case KEY.block_w:
      case KEY.block_h:
        this.rebuildGrid();
        break;
      case KEY.scale_name:
        this.state.scale =
          SCALES.find((s) => s.name === this.state.scale_name) ?? SCALES[0];
        this.rebuildGrid();
        break;
      case KEY.scan_mode:
        this.seq.resetPosition(this.state);
        this.scheduler.resync();
        break;
    }
  }

  private syncLiveAudioFromState(): void {
    if (this.engine.master) {
      this.engine.master.gain.value = Math.pow(this.state.volume, 2);
    }
    if (this.engine.wet && this.engine.dry) {
      this.engine.wet.gain.value = this.state.reverb_mix;
      this.engine.dry.gain.value = this.engine.dryVal(this.state.reverb_mix);
    }
    this.engine.updateReverbBuffer(this.state);
  }

  private emit<K extends AudioraEventType>(
    type: K,
    detail: AudioraEventMap[K]["detail"],
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private emitError(error: unknown, context: string): Error {
    const err = error instanceof Error ? error : new Error(String(error));
    this.emit("error", { error: err, context });
    return err;
  }
}
