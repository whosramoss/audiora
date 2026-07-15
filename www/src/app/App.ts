import {
  Audiora,
  DEFAULT_PRESET,
  PRESETS,
  RANGE_KEYS,
  SELECT_KEYS,
  type PresetData,
} from "audiora";
import { ControlsBinder } from "./ControlsBinder";
import { PresetPanel } from "./PresetPanel";
import defaultMapImage from "../../assets/test.jpg";

export class App {
  private readonly audiora: Audiora;
  private readonly controls: ControlsBinder;
  private presetPanel!: PresetPanel;
  private playBtn!: HTMLButtonElement;
  private fileInput!: HTMLInputElement;

  constructor() {
    const waveCanvas = document.getElementById("wave_canvas") as HTMLCanvasElement;
    const mapCanvas = document.getElementById("map_canvas") as HTMLCanvasElement;

    this.audiora = new Audiora({
      waveCanvas,
      mapCanvas,
      onTweenTick: (key, value) => this.controls.applyExternalValue(key, value),
    });
    this.controls = new ControlsBinder(this.audiora);
  }

  public init(): void {
    this.playBtn = document.getElementById("play_btn") as HTMLButtonElement;
    this.fileInput = document.getElementById("file_input") as HTMLInputElement;

    this.presetPanel = new PresetPanel({
      container: document.getElementById("preset_row") as HTMLElement,
      defaultPreset: DEFAULT_PRESET,
      onSelect: (patch) => this.applyPatch(patch),
    });
    this.applyPreset(DEFAULT_PRESET);

    this.playBtn.addEventListener("click", () => {
      this.audiora.playing ? this.stop() : this.start();
    });

    document
      .getElementById("warm_btn")!
      .addEventListener("click", () => this.warmUp());

    this.fileInput.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await this.audiora.loadImage(file);
    });

    for (const id of RANGE_KEYS) this.controls.bindRange(id);
    for (const id of SELECT_KEYS) this.controls.bindSelect(id);

    window.addEventListener("resize", () => this.audiora.resizeVisuals());
    void this.audiora.loadImage(defaultMapImage);
  }

  private async start(): Promise<void> {
    await this.audiora.play();
    this.markAudioReady();
    this.updatePlayBtn();
  }

  private stop(): void {
    this.audiora.stop();
    this.updatePlayBtn();
  }

  private async warmUp(): Promise<void> {
    await this.audiora.warmUp();
    this.markAudioReady();
  }

  private markAudioReady(): void {
    const btn = document.getElementById("warm_btn") as HTMLButtonElement;
    if (btn) {
      btn.textContent = "Audio Ready";
      btn.disabled = true;
    }
  }

  private updatePlayBtn(): void {
    this.playBtn.textContent = this.audiora.playing ? "Stop" : "Play";
    this.playBtn.classList.toggle("active", this.audiora.playing);
  }

  private applyPatch(p: Partial<PresetData>): void {
    this.audiora.applyParams(p);
    this.controls.syncAll();
  }

  private applyPreset(name: string): void {
    const p = PRESETS[name];
    if (!p) return;
    this.applyPatch(p);
    this.presetPanel.highlightByName(name);
  }
}
