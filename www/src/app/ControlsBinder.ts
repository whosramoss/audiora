import { Audiora, FORMAT, RANGE_KEYS, SELECT_KEYS, type PresetData } from "audiora";

export class ControlsBinder {
  constructor(private readonly audiora: Audiora) {}

  public setValueLabel(id: string): void {
    const el = document.getElementById(id + "_val");
    if (el && FORMAT[id]) {
      el.textContent = FORMAT[id](this.audiora.getParam(id as keyof PresetData) as number);
    }
  }

  public applyExternalValue(id: string, value: number): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = String(value);
    const lbl = document.getElementById(id + "_val");
    if (lbl && FORMAT[id]) lbl.textContent = FORMAT[id](value);
  }

  public bindRange(id: string): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.value = String(this.audiora.getParam(id as keyof PresetData));
    this.setValueLabel(id);
    el.addEventListener("input", () => {
      this.audiora.setParam(id as keyof PresetData, parseFloat(el.value));
      this.setValueLabel(id);
    });
  }

  public bindSelect(id: string): void {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) return;
    el.value = String(this.audiora.getParam(id as keyof PresetData));
    el.addEventListener("change", () => {
      this.audiora.setParam(id as keyof PresetData, el.value);
    });
  }

  public syncAll(): void {
    for (const k of RANGE_KEYS) {
      const el = document.getElementById(k) as HTMLInputElement | null;
      if (el) {
        el.value = String(this.audiora.getParam(k));
        this.setValueLabel(k);
      }
    }
    for (const k of SELECT_KEYS) {
      const el = document.getElementById(k) as HTMLSelectElement | null;
      if (el) el.value = String(this.audiora.getParam(k));
    }
  }
}
