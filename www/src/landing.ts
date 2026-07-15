const BG = "#4820fc";
const WAVE = "#ffffff";

export class WaveBackground {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private raf: number | null = null;
  private t = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
  }

  public start(): void {
    this.resize();
    window.addEventListener("resize", this.resize);
    this.tick();
  }

  public stop(): void {
    window.removeEventListener("resize", this.resize);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const { innerWidth: w, innerHeight: h } = window;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private tick = (): void => {
    this.raf = requestAnimationFrame(this.tick);
    this.t += 0.016;
    this.draw();
  };

  private draw(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ctx = this.ctx;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const layers = [
      { amp: h * 0.045, freq: 0.008, speed: 1.4, alpha: 0.55, y: h * 0.42 },
      { amp: h * 0.07, freq: 0.012, speed: 1.9, alpha: 0.85, y: h * 0.5 },
      { amp: h * 0.035, freq: 0.018, speed: 2.6, alpha: 0.4, y: h * 0.58 },
    ];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.strokeStyle = WAVE;
      ctx.globalAlpha = layer.alpha;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";

      for (let x = 0; x <= w; x += 2) {
        const n1 = Math.sin(x * layer.freq + this.t * layer.speed);
        const n2 = Math.sin(x * layer.freq * 2.3 - this.t * layer.speed * 0.7) * 0.35;
        const n3 = Math.sin(x * layer.freq * 0.4 + this.t * 0.5) * 0.25;
        const y = layer.y + (n1 + n2 + n3) * layer.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

const canvas = document.getElementById("wave_bg") as HTMLCanvasElement;
new WaveBackground(canvas).start();

