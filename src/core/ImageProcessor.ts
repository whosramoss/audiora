import { BlockData, Point, ScaleDefinition } from "./types";
import { clamp, rgbToHsl } from "./utils";
import { SCALES } from "./constants";
import { State } from "./State";

export class ImageProcessor {
  private _canvas: HTMLCanvasElement | null = null;
  private _pixels: Uint8ClampedArray | null = null;
  private _w: number = 0;
  private _h: number = 0;

  public get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }
  public get pixels(): Uint8ClampedArray | null {
    return this._pixels;
  }
  public get width(): number {
    return this._w;
  }
  public get height(): number {
    return this._h;
  }

  public processImage(img: HTMLImageElement): void {
    const maxD = 2048;
    const ds = Math.min(maxD / img.naturalWidth, maxD / img.naturalHeight, 1);
    const dw = Math.max(1, Math.floor(img.naturalWidth * ds));
    const dh = Math.max(1, Math.floor(img.naturalHeight * ds));
    const cv = document.createElement("canvas");
    cv.width = dw;
    cv.height = dh;
    const cx = cv.getContext("2d")!;
    cx.imageSmoothingEnabled = true;
    cx.drawImage(img, 0, 0, dw, dh);
    this._canvas = cv;

    const maxA = 512;
    const as = Math.min(maxA / img.naturalWidth, maxA / img.naturalHeight, 1);
    const aw = Math.max(1, Math.floor(img.naturalWidth * as));
    const ah = Math.max(1, Math.floor(img.naturalHeight * as));
    const av = document.createElement("canvas");
    av.width = aw;
    av.height = ah;
    const ax = av.getContext("2d", { willReadFrequently: true })!;
    ax.imageSmoothingEnabled = true;
    ax.drawImage(img, 0, 0, aw, ah);

    const px = ax.getImageData(0, 0, aw, ah);
    this._pixels = px.data;
    this._w = aw;
    this._h = ah;
  }

  public loadDefault(src: string, onLoad: (img: HTMLImageElement) => void): void {
    const img = new Image();
    img.onload = () => onLoad(img);
    img.onerror = () => {};
    img.src = src;
  }
}

export class BlockGrid {
  private _list: BlockData[] = [];
  private _cols: number = 0;
  private _rows: number = 0;
  private _spiralPath: Point[] = [];

  public get list(): BlockData[] {
    return this._list;
  }
  public get cols(): number {
    return this._cols;
  }
  public get rows(): number {
    return this._rows;
  }
  public get spiralPath(): Point[] {
    return this._spiralPath;
  }

  public build(imageProcessor: ImageProcessor, state: State): void {
    this._list = [];
    this._cols = 0;
    this._rows = 0;

    if (!imageProcessor.pixels) return;

    const sc: ScaleDefinition = state.scale ?? SCALES[0];
    const bw = Math.max(1, Math.floor(state.block_w));
    const bh = Math.max(1, Math.floor(state.block_h));
    const cols = Math.max(1, Math.floor(imageProcessor.width / bw));
    const rows = Math.max(1, Math.floor(imageProcessor.height / bh));
    this._cols = cols;
    this._rows = rows;

    const nDeg = sc.intervals.length - 1;
    const pixels = imageProcessor.pixels;
    const imgW = imageProcessor.width;

    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const x0 = rx * bw;
        const y0 = ry * bh;
        const x1 = Math.min(x0 + bw, imageProcessor.width);
        const y1 = Math.min(y0 + bh, imageProcessor.height);
        let rs = 0,
          gs = 0,
          bs = 0,
          n = 0;

        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * imgW + x) * 4;
            rs += pixels[i];
            gs += pixels[i + 1];
            bs += pixels[i + 2];
            n++;
          }
        }

        if (n === 0) continue;

        const { h, s_hsv, l } = rgbToHsl(rs / n, gs / n, bs / n);
        const safeH = isFinite(h) ? h : 0;
        const degree = clamp(
          Math.floor(Math.sqrt(safeH / 360) * nDeg),
          0,
          nDeg,
        );
        const oct = Math.floor((l / 100) * 3) - 1;
        const vel = clamp(0.2 + (l / 100) * 0.5 + s_hsv * 0.3, 0.1, 1);
        const pan = (safeH / 360) * 2 - 1;
        this._list.push({ degree, oct, vel, l, pan });
      }
    }

    this._spiralPath = this.buildSpiralPath(cols, rows);
  }

  private buildSpiralPath(cols: number, rows: number): Point[] {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const path: Point[] = [];
    const visited = new Set<string>();
    let x = cx,
      y = cy;
    let step = 1,
      dir = 0;
    const ddx = [1, 0, -1, 0];
    const ddy = [0, 1, 0, -1];

    while (path.length < cols * rows) {
      for (let leg = 0; leg < 2; leg++) {
        for (let i = 0; i < step; i++) {
          const key = `${x},${y}`;
          if (x >= 0 && x < cols && y >= 0 && y < rows && !visited.has(key)) {
            path.push({ x, y });
            visited.add(key);
          }
          x += ddx[dir];
          y += ddy[dir];
        }
        dir = (dir + 1) % 4;
      }
      step++;
      if (path.length >= cols * rows) break;
    }

    if (path.length < cols * rows) {
      for (let fy = 0; fy < rows; fy++) {
        for (let fx = 0; fx < cols; fx++) {
          if (!visited.has(`${fx},${fy}`)) path.push({ x: fx, y: fy });
        }
      }
    }

    return path;
  }
}
