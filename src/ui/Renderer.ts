import { AudioEngine } from "../core/AudioEngine";
import { ImageProcessor, BlockGrid } from "../core/ImageProcessor";
import { Sequencer } from "../core/Scanner";

export class Renderer {
  private waveBuf: Uint8Array<ArrayBuffer> | null = null;
  private drawT: number = 0;
  private renderRaf: number | null = null;

  private waveCanvas: HTMLCanvasElement;
  private mapCanvas: HTMLCanvasElement;

  constructor(
    waveCanvas: HTMLCanvasElement,
    mapCanvas: HTMLCanvasElement,
    private readonly engine: AudioEngine,
    private readonly imageProcessor: ImageProcessor,
    private readonly grid: BlockGrid,
    private readonly seq: Sequencer
  ) {
    this.waveCanvas = waveCanvas;
    this.mapCanvas = mapCanvas;
  }

  public start(): void {
    this.resizeCanvases();
    this.renderFrame();
  }

  public stop(): void {
    if (this.renderRaf) {
      cancelAnimationFrame(this.renderRaf);
      this.renderRaf = null;
    }
  }

  public resizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;
    [this.waveCanvas, this.mapCanvas].forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.width = Math.floor(r.width * dpr);
      el.height = Math.floor(r.height * dpr);
      el.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  private renderFrame = (): void => {
    this.renderRaf = requestAnimationFrame(this.renderFrame);
    const now = performance.now();
    if (now - this.drawT < 1000 / 60) return;
    this.drawT = now;

    const waveSize = this.canvasCssSize(this.waveCanvas);
    const mapSize = this.canvasCssSize(this.mapCanvas);
    this.drawWave(waveSize.w, waveSize.h);
    this.drawMap(mapSize.w, mapSize.h);
  };

  private canvasCssSize(el: HTMLCanvasElement): { w: number; h: number } {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  private drawWave(W: number, H: number): void {
    const ctx = this.waveCanvas.getContext("2d")!;

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }

    if (this.engine.analyser) {
      if (!this.waveBuf || this.waveBuf.length !== this.engine.analyser.fftSize) {
        this.waveBuf = new Uint8Array(this.engine.analyser.fftSize);
      }
      this.engine.analyser.getByteTimeDomainData(this.waveBuf);
    }

    const len = this.waveBuf?.length ?? 1024;
    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < len; i++) {
      const v = this.waveBuf ? this.waveBuf[i] / 128.0 : 1.0;
      const x = (i / (len - 1)) * W;
      i === 0 ? ctx.moveTo(x, (v * H) / 2) : ctx.lineTo(x, (v * H) / 2);
    }
    ctx.stroke();
  }

  private drawMap(W: number, H: number): void {
    const ctx = this.mapCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const src = this.imageProcessor.canvas;
    if (!src) return;

    const sc = Math.min(W / src.width, H / src.height);
    const dw = src.width * sc;
    const dh = src.height * sc;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(src, 0, 0, src.width, src.height, dx, dy, dw, dh);

    if (!this.seq.active && this.seq.activateAt > 0 && this.engine.ctx &&
        this.engine.ctx.currentTime >= this.seq.activateAt) {
      this.seq.active = true;
    }

    if (this.seq.active && this.grid.cols > 0 && this.grid.list.length > 0) {
      const lt = 1;
      this.seq.renderX = this.seq.renderX + (this.seq.visX - this.seq.renderX) * lt;
      this.seq.renderY = this.seq.renderY + (this.seq.visY - this.seq.renderY) * lt;
      const cw = dw / this.grid.cols;
      const ch = dh / this.grid.rows;
      const lw = Math.max(1.5, Math.min(cw, ch) * 0.06);
      const cx_ = dx + this.seq.renderX * cw;
      const cy_ = dy + this.seq.renderY * ch;
      const rw = cw - 1;
      const rh = ch - 1;
      const light = this.seq.lastL > 50;
      ctx.strokeStyle = light ? "rgba(30,30,30,0.85)" : "rgba(220,220,220,0.85)";
      ctx.lineWidth = lw;
      ctx.strokeRect(cx_ + 0.5, cy_ + 0.5, rw, rh);
    }
    ctx.restore();
  }
}
