export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function freqToMidi(f: number): number {
  return 69 + 12 * Math.log2(f / 440);
}

export interface HSLResult {
  h: number;
  s_hsl: number;
  s_hsv: number;
  l: number;
}

export function rgbToHsl(r: number, g: number, b: number): HSLResult {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s_hsl = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d) {
    s_hsl = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  const s_hsv = max === 0 ? 0 : d / max;
  return { h, s_hsl, s_hsv, l: l * 100 };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
