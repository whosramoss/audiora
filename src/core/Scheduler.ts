import { State } from "./State";
import { AudioEngine } from "./AudioEngine";
import { Synthesizer } from "./Synthesizer";
import { Sequencer } from "./Scanner";
import { BlockGrid } from "./ImageProcessor";
import { SCALES } from "./constants";
import { clamp, midiToFreq, freqToMidi } from "./utils";

export class Scheduler {
  private raf: number | null = null;

  constructor(
    private readonly state: State,
    private readonly engine: AudioEngine,
    private readonly synth: Synthesizer,
    private readonly seq: Sequencer,
    private readonly grid: BlockGrid
  ) {}

  public start(): void {
    if (!this.engine.ctx) return;
    this.seq.nextTime = this.engine.ctx.currentTime + 0.03;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.tick();
  }

  public stop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  public resync(): void {
    if (!this.engine.ctx) return;
    const now = this.engine.ctx.currentTime;
    if (this.seq.nextTime < now - 0.02) this.seq.nextTime = now + 0.02;
  }

  public renderRange(startTime: number, endTime: number): void {
    if (!(this.grid.list.length && this.grid.cols && this.grid.rows)) return;

    const stepDur = this.synth.getStepDur();
    let time = startTime;

    while (time < endTime) {
      this.playStep(time);
      if (this.state.timing_mode === "expressive") {
        const speedMod = this.synth.getSpeedMod(this.seq.lastL ?? 50);
        time += stepDur / speedMod;
      } else {
        time += stepDur;
      }
    }
  }

  private tick = (): void => {
    if (!this.state.playing || !this.engine.ctx) return;

    const now = this.engine.ctx.currentTime;
    if (this.seq.nextTime < now - 0.02) this.seq.nextTime = now;

    const stepDur = this.synth.getStepDur();
    const lookahead = clamp(stepDur * 2.5, 0.12, 0.3);

    if (this.grid.list.length && this.grid.cols && this.grid.rows) {
      while (this.seq.nextTime < now + lookahead) {
        this.playStep(this.seq.nextTime);
        if (this.state.timing_mode === "expressive") {
          const speedMod = this.synth.getSpeedMod(this.seq.lastL ?? 50);
          this.seq.nextTime += stepDur / speedMod;
        } else {
          this.seq.nextTime += stepDur;
        }
      }
    }

    this.raf = requestAnimationFrame(this.tick);
  };

  private playStep(time: number): void {
    const sc = this.state.scale ?? SCALES[0];

    if (this.grid.list.length > 0) {
      const idx = this.seq.currentBlockIdx();
      const block = this.grid.list[idx];
      if (block) {
        this.seq.visIdx = idx;
        this.seq.lastL = block.l;
        const note = Sequencer.mapBlockToNote(block, sc, this.state);
        this.synth.scheduleNote(note.freq, note.vel, note.brightness, note.pan, time);
      }
    } else {
      const deg = Math.floor(((this.seq.x % 64) / 64) * (sc.intervals.length - 1));
      const freq = midiToFreq(freqToMidi(this.state.base_note) + sc.intervals[deg]);
      this.seq.lastL = 50;
      this.synth.scheduleNote(freq, 0.6, 0.5, 0, time);
    }

    this.seq.visX = this.seq.x;
    this.seq.visY = this.seq.y;
    if (this.seq.activateAt === 0) this.seq.activateAt = time;
    this.seq.advance(this.state);
  }
}
