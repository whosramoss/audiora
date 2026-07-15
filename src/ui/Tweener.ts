import { PresetData } from "../core/types";
import { State } from "../core/State";
import { AudioEngine } from "../core/AudioEngine";
import { TWEEN_KEYS, TWEEN_MS } from "../core/constants";
import { easeInOut } from "../core/utils";

export type TweenTickHandler = (key: string, value: number) => void;

export class Tweener {
  private raf: number | null = null;

  constructor(
    private readonly state: State,
    private readonly engine: AudioEngine,
    private readonly onTick?: TweenTickHandler
  ) {}

  public tweenTo(target: Partial<PresetData>): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    const from: Record<string, number> = {};
    TWEEN_KEYS.forEach((k) => {
      const tVal = (target as Record<string, unknown>)[k];
      if (typeof tVal === "number" && isFinite(tVal)) {
        const current = this.state.getNumeric(k);
        from[k] = isFinite(current) ? current : tVal;
      }
    });

    const t0 = performance.now();

    const tick = (): void => {
      const t = Math.min((performance.now() - t0) / TWEEN_MS, 1);
      const e = easeInOut(t);

      TWEEN_KEYS.forEach((k) => {
        if (from[k] === undefined) return;
        const targetVal = (target as Record<string, unknown>)[k] as number;
        const newVal = from[k] + (targetVal - from[k]) * e;
        this.state.setNumeric(k, newVal);
        this.onTick?.(k, newVal);
      });

      if (isFinite(this.state.volume) && this.engine.master) {
        this.engine.master.gain.value = Math.pow(this.state.volume, 2);
      }
      if (isFinite(this.state.reverb_mix) && this.engine.wet) {
        this.engine.wet.gain.value = this.state.reverb_mix;
        this.engine.dry!.gain.value = this.engine.dryVal(this.state.reverb_mix);
      }

      if (t < 1) this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  public cancel(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }
}
