import { PresetData, ScaleDefinition } from "./types";
import { SCALES, STATE_KEYS } from "./constants";

export class State implements PresetData {
  public playing: boolean = false;
  public scale: ScaleDefinition = SCALES[0];

  public osc_type: string = "triangle";
  public scale_name: string = "Minor";
  public base_note: number = 287;
  public bpm: number = 70;
  public speed: number = 4.2;
  public note_mult: number = 0.15;
  public volume: number = 0.99;
  public vibrato_rate: number = 0;
  public vibrato_depth: number = 50;
  public tremolo_rate: number = 1.8;
  public tremolo_depth: number = 0;
  public fifth_lvl: number = 0.37;
  public oct_lvl: number = 0.63;
  public filter_base: number = 1810;
  public filter_track: number = 0;
  public resonance: number = 2.6;
  public reverb_mix: number = 1.0;
  public reverb_time: number = 3.6;
  public bass_gain: number = 13.5;
  public block_w: number = 23;
  public block_h: number = 13;
  public scan_mode: string = "linear";
  public pan_amount: number = 0.6;
  public timing_mode: string = "expressive";
  public timing_intensity: number = 0.4;

  public applyPatch(patch: Partial<PresetData>): void {
    if (patch.osc_type) this.osc_type = patch.osc_type;
    if (patch.scale_name) {
      this.scale_name = patch.scale_name;
      this.scale = SCALES.find((s) => s.name === patch.scale_name) ?? SCALES[0];
    }
    if (patch.scan_mode) this.scan_mode = patch.scan_mode;
    if (patch.timing_mode) this.timing_mode = patch.timing_mode;
    if (typeof patch.bpm === "number") this.bpm = patch.bpm;
    if (typeof patch.speed === "number") this.speed = patch.speed;
    if (typeof patch.note_mult === "number") this.note_mult = patch.note_mult;
    if (typeof patch.timing_intensity === "number") this.timing_intensity = patch.timing_intensity;
    if (typeof patch.block_w === "number") this.block_w = patch.block_w;
    if (typeof patch.block_h === "number") this.block_h = patch.block_h;
  }

  public applyAll(patch: Partial<PresetData>): void {
    STATE_KEYS.forEach((k) => {
      const value = patch[k];
      if (value === undefined) return;
      if (k === "scale_name" && typeof value === "string") {
        this.scale_name = value;
        this.scale = SCALES.find((s) => s.name === value) ?? SCALES[0];
        return;
      }
      (this as unknown as Record<string, unknown>)[k] = value;
    });
  }

  public capture(): Partial<PresetData> {
    const snap: Record<string, unknown> = {};
    STATE_KEYS.forEach((k) => {
      snap[k] = (this as unknown as Record<string, unknown>)[k];
    });
    return snap as Partial<PresetData>;
  }

  public setNumeric(key: string, value: number): void {
    (this as unknown as Record<string, unknown>)[key] = value;
  }

  public getNumeric(key: string): number {
    return (this as unknown as Record<string, unknown>)[key] as number;
  }

  public getString(key: string): string {
    return (this as unknown as Record<string, unknown>)[key] as string;
  }

  public setString(key: string, value: string): void {
    (this as unknown as Record<string, unknown>)[key] = value;
  }
}
