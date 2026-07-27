<h1>
  <p align="center">
    <img src="https://raw.githubusercontent.com/whosramoss/audiora/main/www/assets/android-chrome-512x512.png" alt="logo" width="128">
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
  <a href="https://github.com/whosramoss/audiora/blob/main/docs/API.md">API</a>
</p>

## How to install

```bash
npm install audiora
```

## Usage

Minimal HTML shell for live playback (two canvases + a play gesture):

```html
<canvas id="map_canvas" width="640" height="360"></canvas>
<canvas id="wave_canvas" width="640" height="80"></canvas>
<button id="play">Play</button>

<script type="module">
  import { Audiora, PRESETS } from "audiora";

  const audiora = new Audiora({
    waveCanvas: document.getElementById("wave_canvas"),
    mapCanvas: document.getElementById("map_canvas"),
  });

  await audiora.loadImage("/photo.jpg");
  audiora.applyParams(PRESETS.Haze, { tween: false });

  document.getElementById("play").onclick = () => audiora.play();

  // offline WAV — no play() needed; renders via OfflineAudioContext
  const blob = await audiora.toBlob({ params: PRESETS.Bite, duration: 12 });
</script>
```

See the **[API reference](https://github.com/whosramoss/audiora/blob/main/docs/API.md)** for constructors, params, presets, scan modes, and TypeScript types.
