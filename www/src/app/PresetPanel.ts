import { PRESETS } from "audiora";

export interface PresetPanelOptions {
  container: HTMLElement;
  defaultPreset: string;
  onSelect: (patch: (typeof PRESETS)[string]) => void;
}

export class PresetPanel {
  private readonly container: HTMLElement;
  private readonly onSelect: PresetPanelOptions["onSelect"];

  constructor(options: PresetPanelOptions) {
    this.container = options.container;
    this.onSelect = options.onSelect;
    this.buildBuiltInButtons(options.defaultPreset);
  }

  public highlightByName(name: string): void {
    this.clearActive();
    this.container.querySelectorAll<HTMLElement>(".preset").forEach((b) => {
      if (b.textContent === name) b.classList.add("active");
    });
  }

  private clearActive(): void {
    this.container.querySelectorAll(".preset").forEach((b) => b.classList.remove("active"));
  }

  private buildBuiltInButtons(defaultPreset: string): void {
    Object.keys(PRESETS).forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "preset" + (name === defaultPreset ? " active" : "");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        this.clearActive();
        btn.classList.add("active");
        this.onSelect(PRESETS[name]);
      });
      this.container.appendChild(btn);
    });
  }
}
