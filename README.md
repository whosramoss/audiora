<h1>
  <p align="center">
    <img src="./www/assets/android-chrome-512x512.png" alt="logo" width="128">
    <br>audiora
  </p>
</h1>

<p align="center">
  Picture-driven synthesis for the web. Maps color and light into pitch, timing, and texture through scanning and musical rules.
  <br /> <br />
  <a href="#how-to-install">Install</a>
  ·
  <a href="#usage">Usage</a>
  ·
  <a href="#mapping">Mapping</a>
</p>

## How to install

```bash
npm install audiora
```

## Usage

Import the instrument, load an image, and either play live or render offline:

```js
import { Audiora, PRESETS } from "audiora";

const audiora = new Audiora({
  waveCanvas: document.getElementById("wave_canvas"),
  mapCanvas: document.getElementById("map_canvas"),
});

await audiora.loadImage("/photo.jpg");
audiora.applyParams(PRESETS.Haze, { tween: false });

await audiora.play(); // needs a user gesture in most browsers

// offline WAV
const blob = await audiora.toBlob({
  params: PRESETS.Bite,
  duration: 12,
});
```

Importing `audiora` has no side effects — it does not create an `AudioContext` or touch the DOM until you call methods.

See the **[API reference](./docs/API.md)** for constructors, params, presets, scan modes, and TypeScript types.

### Live shell (demo)

The `www/` folder is a Vite app (landing + instrument UI). It is **not** published to npm.

```bash
cd www
npm install
npm run dev
```

Open the demo, load an image, tweak presets, and listen. Use `warmUp()` / Play after a click so the browser can resume audio.

## Mapping

Time is shaped by the image: bright areas slightly accelerate the system, darker areas slow it down. Each block is a musical event.

| Source           | Maps to                                             |
| ---------------- | --------------------------------------------------- |
| Hue              | Scale degree (pitch), stereo position, micro-detune |
| Lightness        | Octave, amplitude, subtle timing / duration         |
| Saturation       | Velocity weighting                                  |
| Spatial position | Traversal path (`scan_mode`)                        |

The goal is coherence of behavior, not literal accuracy of translation. Small parameter changes matter; most adjustments are intentionally subtle.

Built-in scan modes: `linear`, `vertical`, `zigzag`, `drift`, `spiral`. Timing modes: `expressive`, `stable`.

## Presets

| Name                     | Role                                      |
| ------------------------ | ----------------------------------------- |
| `Haze`                   | Default — soft, expressive, higher reverb |
| `Leap` / `Pulse`         | Faster, stable phrasing                   |
| `Bite` / `Spark` / `Raw` | Sharper / drier identities                |

```js
audiora.applyParams(PRESETS.Haze);
audiora.applyParams(PRESETS.Raw, { tween: false }); // hard cut
```

## TypeScript

Types ship with the package source entry. No separate `@types` package required.

```ts
import { Audiora, type PresetData, type RenderOptions } from "audiora";
```

## Notes

- First `play()` may show the scan cursor slightly ahead of audio while the context starts; later plays are stable.
- The visual cursor leads audio by a small lookahead window by design.
- At `reverb_mix = 1.0`, stereo pan spread is reduced (fully wet signal) — lower the mix to restore imaging.
