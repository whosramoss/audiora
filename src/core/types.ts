export interface ScaleDefinition {
  name: string;
  intervals: number[];
}

export interface PresetData {
  osc_type: string;
  scale_name: string;
  base_note: number;
  bpm: number;
  speed: number;
  note_mult: number;
  volume: number;
  vibrato_rate: number;
  vibrato_depth: number;
  tremolo_rate: number;
  tremolo_depth: number;
  fifth_lvl: number;
  oct_lvl: number;
  filter_base: number;
  filter_track: number;
  resonance: number;
  reverb_mix: number;
  reverb_time: number;
  bass_gain: number;
  block_w: number;
  block_h: number;
  scan_mode: string;
  pan_amount: number;
  timing_mode: string;
  timing_intensity: number;
}

export interface BlockData {
  degree: number;
  oct: number;
  vel: number;
  l: number;
  pan: number;
}

export interface NoteData {
  freq: number;
  vel: number;
  brightness: number;
  pan: number;
}

export interface Point {
  x: number;
  y: number;
}

export type FormatFn = (v: number) => string;
