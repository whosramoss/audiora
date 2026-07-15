# API Reference

## Package entry points

| Import    | Description                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------- |
| `audiora` | Main entry. Exports the `Audiora` class, presets, and helpers for live + offline picture-driven synthesis. |

There are no side-effectful subpaths. Importing `audiora` does not start AudioContext or scan the DOM.

---

## `audiora` exports

```ts
import {
  Audiora,
  PRESETS,
  DEFAULT_PRESET,
  FORMAT,
  RANGE_KEYS,
  SELECT_KEYS,
  type RenderOptions,
  type ImageSource,
  type LiveOptions,
  type PresetData,
} from "audiora";
```

| Export           | Type                         | Description                                                                      |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `Audiora`        | `class`                      | Picture-driven synthesis instrument (live playback + offline render).            |
| `PRESETS`        | `Record<string, PresetData>` | Built-in parameter patches (`Haze`, `Leap`, `Pulse`, `Bite`, `Spark`, `Raw`).    |
| `DEFAULT_PRESET` | `string`                     | Recommended starting preset name (`"Haze"`).                                     |
| `FORMAT`         | `Record<string, (v: number) => string>` | Display formatters for numeric params (UI labels).                      |
| `RANGE_KEYS`     | `(keyof PresetData)[]`       | Numeric param keys that use range controls.                                      |
| `SELECT_KEYS`    | `(keyof PresetData)[]`       | String/select param keys (`osc_type`, `scale_name`, `scan_mode`, `timing_mode`). |
| `RenderOptions`  | `type`                       | Options for `toAudioBuffer` / `toBlob`.                                          |
| `ImageSource`    | `type`                       | `string`, `File`, `Blob`, or `HTMLImageElement`.                                 |
| `LiveOptions`    | `type`                       | Optional canvases + tween callback for the constructor.                          |
| `PresetData`     | `type`                       | Full parameter set that drives synthesis and traversal.                          |

---

## Picture → sound mapping

Each image is downsampled, split into blocks (`block_w` × `block_h`), and traversed by a scan strategy. Per-block HSL drives the musical event:

| Source           | Maps to                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Hue              | Scale degree (pitch), stereo pan, micro-detune                          |
| Lightness        | Octave, primary velocity weight, filter tracking; timing / note duration when expressive |
| Saturation       | Secondary velocity weight                                               |
| Spatial position | Traversal path (`scan_mode`)                                            |

Bright areas slightly accelerate the system; darker areas slow it down. Timing is intentionally restrained so the result stays coherent rather than mechanical. Filter cutoff follows `filter_base + brightness × filter_track` (when `filter_track ≠ 0`).

Cross-origin image URLs need CORS (`crossOrigin = "anonymous"` is set for string sources). Blobs/`File` use object URLs and do not set CORS.

---

## `Audiora`

```js
import { Audiora, PRESETS } from "audiora";
```

### Constructor

```js
new Audiora(options?)
```

- **options** — Partial `LiveOptions`. If both canvases are provided, visuals attach immediately.

```ts
interface LiveOptions {
  waveCanvas?: HTMLCanvasElement; // waveform / analyzer view
  mapCanvas?: HTMLCanvasElement; // image + scan cursor
  onTweenTick?: (key: string, value: number) => void; // fired while params tween
}
```

### Instance properties

| Property  | Type               | Description                      |
| --------- | ------------------ | -------------------------------- |
| `playing` | `boolean` (getter) | Whether live playback is active. |

### Instance methods

| Method                                 | Returns                | Description                                                           |
| -------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `attachVisuals(waveCanvas, mapCanvas)` | `void`                 | Starts (or restarts) the render loop on the given canvases.           |
| `resizeVisuals()`                      | `void`                 | Recomputes canvas sizes after layout/window resize.                   |
| `loadImage(image)`                     | `Promise<void>`        | Loads an `ImageSource`, processes pixels, rebuilds the block grid.    |
| `play()`                               | `Promise<void>`        | Ensures AudioContext, resumes it, starts the live scheduler. No notes until an image grid exists. |
| `stop()`                               | `void`                 | Stops the scheduler, resets sequencer timing, suspends the context.   |
| `warmUp()`                             | `Promise<void>`        | Primes the audio graph (helpful before first gesture-driven `play`).  |
| `getParam(key)`                        | `string \| number`     | Reads one `PresetData` field from live state.                         |
| `setParam(key, value)`                 | `void`                 | Sets one param and applies side effects (volume, reverb, grid, etc.). |
| `applyParams(patch, options?)`         | `void`                 | Merges a partial preset. Default tweens numeric UI keys (~1.5s).      |
| `captureParams()`                      | `Partial<PresetData>`  | Snapshot of current live params (for export / cloning).               |
| `toAudioBuffer(options?)`              | `Promise<AudioBuffer>` | Offline render via `OfflineAudioContext`.                             |
| `toBlob(options?)`                     | `Promise<Blob>`        | Same as `toAudioBuffer`, encoded as WAV `Blob`.                       |

#### `applyParams(patch, options?)`

```ts
applyParams(patch: Partial<PresetData>, options?: { tween?: boolean })
```

- `tween: true` (default) — applies structural fields immediately, then smoothly interpolates `TWEEN_KEYS` (volume, filter, reverb, etc.).
- `tween: false` — cancels any running tween and applies the full patch immediately, syncing live audio nodes.

Changing `scan_mode` resets the read-head position and resyncs the scheduler.

#### `toAudioBuffer` / `toBlob`

```ts
interface RenderOptions {
  image?: ImageSource; // required if loadImage was never called
  params?: Partial<PresetData>; // defaults to current live capture
  duration?: number; // seconds, default 10
  sampleRate?: number; // default 44100
}
```

Throws if no image is available (`options.image` and prior `loadImage` both missing).

Stereo output: 2 channels.

### Example — live session

```js
const wave = document.getElementById("wave_canvas");
const map = document.getElementById("map_canvas");

const audiora = new Audiora({
  waveCanvas: wave,
  mapCanvas: map,
  onTweenTick: (key, value) => {
    // keep UI sliders in sync during preset morphs
  },
});

await audiora.loadImage("/photo.jpg");
audiora.applyParams(PRESETS.Haze, { tween: false });

await audiora.warmUp(); // optional; after a user gesture
await audiora.play();

// later
audiora.setParam("bpm", 110);
audiora.stop();
```

### Example — offline WAV

```js
const blob = await audiora.toBlob({
  image: fileFromInput,
  params: PRESETS.Bite,
  duration: 15,
  sampleRate: 44100,
});

const url = URL.createObjectURL(blob);
// trigger download or upload
```

---

## `PresetData`

All live and offline synthesis is driven by this shape:

| Key                | Type     | Role                                                           |
| ------------------ | -------- | -------------------------------------------------------------- |
| `osc_type`         | `string` | Waveform identity.                                             |
| `scale_name`       | `string` | Named scale for pitch quantization.                            |
| `base_note`        | `number` | Root frequency (Hz).                                           |
| `bpm`              | `number` | Base tempo.                                                    |
| `speed`            | `number` | Traversal / scheduling multiplier.                             |
| `note_mult`        | `number` | Note duration multiplier.                                      |
| `volume`           | `number` | Master level (0–1; gain uses `volume²`).                       |
| `vibrato_rate`     | `number` | Vibrato LFO rate (Hz).                                         |
| `vibrato_depth`    | `number` | Vibrato depth (cents).                                         |
| `tremolo_rate`     | `number` | Tremolo LFO rate (Hz).                                         |
| `tremolo_depth`    | `number` | Tremolo depth (0–1).                                           |
| `fifth_lvl`        | `number` | Level of fifth partial voice (0–1).                            |
| `oct_lvl`          | `number` | Level of octave partial voice (0–1).                           |
| `filter_base`      | `number` | Filter base cutoff (Hz).                                       |
| `filter_track`     | `number` | How strongly block brightness shifts cutoff (Hz; `0` = fixed). |
| `resonance`        | `number` | Filter Q.                                                      |
| `reverb_mix`       | `number` | Wet level (0–1). At `≥ 0.99`, dry path is muted (less stereo). |
| `reverb_time`      | `number` | Convolution / decay time (s).                                  |
| `bass_gain`        | `number` | Bass shelf (dB).                                               |
| `block_w`          | `number` | Analysis block width (px).                                     |
| `block_h`          | `number` | Analysis block height (px).                                    |
| `scan_mode`        | `string` | Traversal strategy.                                            |
| `pan_amount`       | `number` | Stereo imaging strength (0–1).                                 |
| `timing_mode`      | `string` | `"expressive"` or `"stable"`.                                  |
| `timing_intensity` | `number` | How strongly lightness bends timing when expressive (0–1).     |

`FORMAT` / `RANGE_KEYS` cover the numeric rows above; `SELECT_KEYS` are the four string fields.

### `osc_type` values

| Value                                       | Behavior                                                             |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `sine` / `square` / `sawtooth` / `triangle` | Native Web Audio oscillator types.                                   |
| `pulse`                                     | Custom periodic wave (odd harmonics).                                |
| `organ`                                     | Custom harmonic stack.                                               |
| `bell`                                      | Custom inharmonic-leaning stack; fifth/octave levels are attenuated. |

Unknown types fall back to `triangle`.

### `scale_name` values

Built-in scales (from `SCALES` in core constants):

`Major`, `Minor`, `Pentatonic`, `Blues`, `Chromatic`, `Whole Tone`, `Dorian`, `Phrygian`, `Lydian`, `Harmonic Minor`, `In Sen`.

### `scan_mode` values

| Value      | Path                                                 |
| ---------- | ---------------------------------------------------- |
| `linear`   | Left-to-right rows.                                  |
| `vertical` | Top-to-bottom columns.                               |
| `zigzag`   | Alternating row direction.                           |
| `drift`    | Soft irregular walk.                                 |
| `spiral`   | Outward from near center along a precomputed spiral. |

Unknown modes fall back to `linear`.

### `timing_mode` values

| Value        | Behavior                                                                |
| ------------ | ----------------------------------------------------------------------- |
| `expressive` | Lightness modulates interval / duration (scaled by `timing_intensity`). |
| `stable`     | Fixed rhythmic grid; ignores lightness timing bend.                     |

---

## `PRESETS`

| Name    | Character (summary)                                                    |
| ------- | ---------------------------------------------------------------------- |
| `Haze`  | Soft triangle / pentatonic, expressive timing, higher reverb. Default. |
| `Leap`  | Fast square / major, stable timing.                                    |
| `Pulse` | Square with strong tremolo, stable.                                    |
| `Bite`  | Dark sawtooth / chromatic, high resonance & bass.                      |
| `Spark` | High square / chromatic, short notes, fast tempo.                      |
| `Raw`   | Dry square, large blocks, no effects stack.                            |

Apply with:

```js
audiora.applyParams(PRESETS.Haze);
// or hard-cut without morph:
audiora.applyParams(PRESETS.Raw, { tween: false });
```

---

## Helpers for UI hosts

The demo app (`audiora/www`) uses these exports to bind controls without redefining param lists:

```js
import {
  FORMAT,
  RANGE_KEYS,
  SELECT_KEYS,
  DEFAULT_PRESET,
  PRESETS,
} from "audiora";

for (const key of RANGE_KEYS) {
  // range input id === key; label via FORMAT[key](value)
}

for (const key of SELECT_KEYS) {
  // select id === key
}

audiora.applyParams(PRESETS[DEFAULT_PRESET], { tween: false });
```

| Helper               | Use                                                   |
| -------------------- | ----------------------------------------------------- |
| `RANGE_KEYS`         | Iterate numeric sliders.                              |
| `SELECT_KEYS`        | Iterate `<select>` bindings.                          |
| `FORMAT[key](value)` | Human-readable label (`"92"`, `"×1.70"`, `"45%"`, …). |
| `DEFAULT_PRESET`     | Initial highlight / first apply (`"Haze"`).           |

---

## Browser / runtime requirements

- **Live playback**: Web Audio API (`AudioContext`), user gesture before `resume` in most browsers.
- **Offline render**: `OfflineAudioContext`.
- **Visuals** (optional): 2D canvas contexts for wave + map.
- **Images**: max analysis path is capped internally (pixel buffer ≤ 512px on the long side; display canvas ≤ 2048px).

### Known timing notes

- First `play()` may show the scan cursor slightly ahead of audio while the context starts; subsequent plays are stable.
- The visual cursor leads audio by a small lookahead window by design (avoids audible glitches).
- Live `play()` without a loaded image keeps the scheduler running but schedules no notes until `loadImage` builds a grid.
- `reverb_mix ≥ 0.99` mutes the dry path; reduce mix to restore pan spread.

---

## Import patterns

### Library-only (embed in your app)

```js
import { Audiora, PRESETS } from "audiora";

const audiora = new Audiora();
await audiora.loadImage(userFile);
const wav = await audiora.toBlob({ params: PRESETS.Pulse, duration: 12 });
```

### Live instrument shell

```js
import { Audiora, PRESETS, RANGE_KEYS, SELECT_KEYS } from "audiora";

const audiora = new Audiora({
  waveCanvas: document.getElementById("wave_canvas"),
  mapCanvas: document.getElementById("map_canvas"),
});

window.addEventListener("resize", () => audiora.resizeVisuals());
await audiora.loadImage("/assets/map.jpg");
audiora.applyParams(PRESETS.Haze, { tween: false });
```

Wire `RANGE_KEYS` / `SELECT_KEYS` to DOM controls calling `setParam` / `applyParams` as in `audiora/www`.
