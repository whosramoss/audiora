import { ScaleDefinition, PresetData, FormatFn } from "./types";

export const SCALES: ScaleDefinition[] = [
  { name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
  { name: "Pentatonic", intervals: [0, 2, 4, 7, 9, 12] },
  { name: "Blues", intervals: [0, 3, 5, 6, 7, 10, 12] },
  { name: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { name: "Whole Tone", intervals: [0, 2, 4, 6, 8, 10, 12] },
  { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10, 12] },
  { name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10, 12] },
  { name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11, 12] },
  { name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11, 12] },
  { name: "In Sen", intervals: [0, 1, 5, 7, 10, 12] },
];

export const STATE_KEYS: (keyof PresetData)[] = [
  "osc_type", "scale_name", "base_note", "bpm", "speed", "note_mult",
  "volume", "vibrato_rate", "vibrato_depth", "tremolo_rate", "tremolo_depth",
  "fifth_lvl", "oct_lvl", "filter_base", "filter_track", "resonance",
  "reverb_mix", "reverb_time", "bass_gain", "block_w", "block_h",
  "scan_mode", "pan_amount", "timing_mode", "timing_intensity",
];

export const FORMAT: Record<string, FormatFn> = {
  volume: (v) => `${Math.round(v * 100)}%`,
  bpm: (v) => String(Math.round(v)),
  speed: (v) => `×${v.toFixed(2)}`,
  note_mult: (v) => `×${v.toFixed(2)}`,
  base_note: (v) => `${Math.round(v)} Hz`,
  fifth_lvl: (v) => `${Math.round(v * 100)}%`,
  oct_lvl: (v) => `${Math.round(v * 100)}%`,
  vibrato_rate: (v) => `${v.toFixed(1)} Hz`,
  vibrato_depth: (v) => `${Math.round(v)} ¢`,
  tremolo_rate: (v) => `${v.toFixed(1)} Hz`,
  tremolo_depth: (v) => `${Math.round(v * 100)}%`,
  filter_base: (v) => `${Math.round(v)} Hz`,
  filter_track: (v) => `${Math.round(v)} Hz`,
  resonance: (v) => v.toFixed(2),
  reverb_mix: (v) => `${Math.round(v * 100)}%`,
  reverb_time: (v) => `${v.toFixed(1)} s`,
  bass_gain: (v) => `${v.toFixed(1)} dB`,
  block_w: (v) => `${Math.round(v)} px`,
  block_h: (v) => `${Math.round(v)} px`,
  pan_amount: (v) => `${Math.round(v * 100)}%`,
  timing_intensity: (v) => `${Math.round(v * 100)}%`,
};

export const RANGE_KEYS = Object.keys(FORMAT) as (keyof PresetData)[];

export const SELECT_KEYS = STATE_KEYS.filter((k) => !(k in FORMAT));

export const KEY = STATE_KEYS.reduce(
  (acc, k) => {
    acc[k] = k;
    return acc;
  },
  {} as Record<string, keyof PresetData>
) as { [K in keyof PresetData]: K };

export const EXPRESSIVE_RANGE = 1.2;
export const TWEEN_MS = 1500;
export const DEFAULT_PRESET = "Haze";

export const TWEEN_KEYS: (keyof PresetData)[] = [
  KEY.volume, KEY.base_note, KEY.vibrato_rate, KEY.vibrato_depth,
  KEY.tremolo_rate, KEY.tremolo_depth, KEY.fifth_lvl, KEY.oct_lvl,
  KEY.filter_base, KEY.filter_track, KEY.resonance, KEY.reverb_mix,
  KEY.reverb_time, KEY.bass_gain, KEY.pan_amount,
];
