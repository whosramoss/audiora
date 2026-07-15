import { BlockData, NoteData, ScaleDefinition } from "./types";
import { clamp, midiToFreq, freqToMidi } from "./utils";
import { SCALES } from "./constants";
import { State } from "./State";
import { BlockGrid } from "./ImageProcessor";

export abstract class BaseScanStrategy {
  abstract advance(seq: Sequencer, cols: number, rows: number): void;
  abstract reset(seq: Sequencer, grid: BlockGrid): void;
}

class LinearScan extends BaseScanStrategy {
  advance(seq: Sequencer, cols: number, rows: number): void {
    seq.x++;
    if (seq.x >= cols) {
      seq.x = 0;
      seq.y = (seq.y + 1) % rows;
    }
  }
  reset(seq: Sequencer, _grid: BlockGrid): void {
    seq.x = 0;
    seq.y = 0;
  }
}

class VerticalScan extends BaseScanStrategy {
  advance(seq: Sequencer, cols: number, rows: number): void {
    seq.y++;
    if (seq.y >= rows) {
      seq.y = 0;
      seq.x = (seq.x + 1) % cols;
    }
  }
  reset(seq: Sequencer, _grid: BlockGrid): void {
    seq.x = 0;
    seq.y = 0;
  }
}

class ZigzagScan extends BaseScanStrategy {
  advance(seq: Sequencer, cols: number, rows: number): void {
    seq.x += seq.dx;
    if (seq.x >= cols) {
      seq.x = cols - 1;
      seq.dx = -1;
      seq.y = (seq.y + 1) % rows;
    } else if (seq.x < 0) {
      seq.x = 0;
      seq.dx = 1;
      seq.y = (seq.y + 1) % rows;
    }
  }
  reset(seq: Sequencer, _grid: BlockGrid): void {
    seq.x = 0;
    seq.y = 0;
    seq.dx = 1;
  }
}

class DriftScan extends BaseScanStrategy {
  advance(seq: Sequencer, cols: number, rows: number): void {
    const l = seq.lastL ?? 50;
    let dx = 0, dy = 0;

    if (Math.random() < 0.05) {
      seq.x = Math.floor(Math.random() * cols);
      seq.y = Math.floor(Math.random() * rows);
      return;
    }

    if (l > 60) dx = 1;
    else if (l < 40) dx = -1;
    else dy = Math.random() < 0.5 ? 1 : -1;

    if (Math.random() < 0.15) {
      dx = Math.floor(Math.random() * 3) - 1;
      dy = Math.floor(Math.random() * 3) - 1;
    }

    seq.x = (seq.x + dx + cols) % cols;
    seq.y = (seq.y + dy + rows) % rows;
  }
  reset(seq: Sequencer, _grid: BlockGrid): void {
    seq.x = 0;
    seq.y = 0;
  }
}

class SpiralScan extends BaseScanStrategy {
  advance(seq: Sequencer, _cols: number, _rows: number): void {
    const path = seq.grid.spiralPath;
    if (!path.length) return;
    seq.spiralIdx = (seq.spiralIdx + 1) % path.length;
    const sp = path[seq.spiralIdx];
    seq.x = sp.x;
    seq.y = sp.y;
  }
  reset(seq: Sequencer, grid: BlockGrid): void {
    seq.spiralIdx = 0;
    if (grid.spiralPath.length) {
      seq.x = grid.spiralPath[0].x;
      seq.y = grid.spiralPath[0].y;
    } else {
      seq.x = 0;
      seq.y = 0;
    }
  }
}

export class ScanStrategyFactory {
  private static strategies: Record<string, BaseScanStrategy> = {
    linear: new LinearScan(),
    vertical: new VerticalScan(),
    zigzag: new ZigzagScan(),
    drift: new DriftScan(),
    spiral: new SpiralScan(),
  };

  public static get(mode: string): BaseScanStrategy {
    return this.strategies[mode] ?? this.strategies["linear"];
  }
}

export class Sequencer {
  public x: number = 0;
  public y: number = 0;
  public dx: number = 1;
  public visX: number = 0;
  public visY: number = 0;
  public renderX: number = 0;
  public renderY: number = 0;
  public visIdx: number = 0;
  public nextTime: number = 0;
  public raf: number | null = null;
  public lastL: number = 50;
  public active: boolean = false;
  public spiralIdx: number = 0;
  public activateAt: number = 0;

  constructor(public readonly grid: BlockGrid) {}

  public resetPosition(state: State): void {
    const strategy = ScanStrategyFactory.get(state.scan_mode);
    strategy.reset(this, this.grid);
    this.dx = 1;
    this.visX = 0;
    this.visY = 0;
    this.renderX = 0;
    this.renderY = 0;
    this.visIdx = 0;
    this.lastL = 50;
    this.active = false;
    this.spiralIdx = 0;
    this.activateAt = 0;
  }

  public currentBlockIdx(): number {
    const idx = this.y * this.grid.cols + this.x;
    if (!isFinite(idx)) return 0;
    return clamp(idx, 0, this.grid.list.length - 1);
  }

  public advance(state: State): void {
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    if (cols <= 0 || rows <= 0) return;
    const strategy = ScanStrategyFactory.get(state.scan_mode);
    strategy.advance(this, cols, rows);
  }

  public clampToGrid(): void {
    this.x = Math.min(this.x, Math.max(0, this.grid.cols - 1));
    this.y = Math.min(this.y, Math.max(0, this.grid.rows - 1));
  }

  public static mapBlockToNote(block: BlockData, sc: ScaleDefinition, state: State): NoteData {
    const interval = sc.intervals[block.degree % sc.intervals.length] + 12 * block.oct;
    const hueDetune = block.pan * 5;
    const freq = midiToFreq(freqToMidi(state.base_note) + interval + hueDetune / 100);
    const pan = block.pan * state.pan_amount;
    return { freq, vel: block.vel, brightness: block.l / 100, pan };
  }
}
