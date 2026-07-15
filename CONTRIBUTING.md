# Contributing to audiora

Thank you for your interest in contributing. Audiora is a small picture-driven synthesis library — keep changes scoped, preserve the musical balance of the instrument, and verify behavior in the demo when possible.

## Getting started

1. Fork and clone the repository.
2. Install dependencies for the demo app (the library package itself has no runtime dependencies):

   ```bash
   cd www
   npm install
   npm run dev
   ```

3. Library source lives in `src/` at the repository root (`Audiora`, audio engine, scanner, presets). The `www/` folder is a Vite landing + instrument shell and is **not** published to npm.

## Development workflow

1. Create a branch from `main`.
2. Make your changes in `src/` (or `www/` for demo-only UI).
3. Verify live playback and, when relevant, offline render (`toAudioBuffer` / `toBlob`) in `www/`.
4. Update `docs/API.md` for any public API, preset, or param surface change.
5. Open a pull request with a clear description of what changed and how to hear it (preset, scan mode, image, etc.).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) in English:

- `feat:` — new behavior
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change without behavior change
- `chore:` — tooling, metadata

Examples:

```
feat(scan): add spiral outward path mode
fix(synth): apply vibrato to fifth and octave partials
docs: document RenderOptions sampleRate default
```

## Code guidelines

- Match existing style: TypeScript, ES modules, native classes, minimal dependencies.
- Prefer extending `PresetData` / constants over one-off magic numbers.
- Browser APIs only in `src/` — Web Audio, canvas, `OfflineAudioContext`. No Node-specific APIs.
- Keep files focused; split when a module grows beyond ~300 lines.
- Treat timing and mapping as part of the product: aggressive “more expressive” changes often destabilize the instrument. Prefer restrained adjustments that stay coherent.
- Public surface is `src/index.ts`. Do not rely on importing deep `core/*` paths from consumers.

## Audio / mapping specifics

When touching synthesis, scheduling, or image → note mapping:

- Keep hue / lightness / saturation roles consistent with [docs/API.md](./docs/API.md) unless the PR deliberately redesigns the mapping (call that out).
- Resync the scheduler when tempo-related params or `scan_mode` change.
- Validate both `timing_mode: "expressive"` and `"stable"`.
- If you add waveforms or presets, wire them through `PRESETS` / `osc_type` handling and the demo selects when needed.

## Pull requests

- One logical change per PR when possible.
- Do not include unrelated formatting or drive-by refactors.
- Demo-only UI changes should not break the library’s public API.
- Prefer short clips or steps to reproduce audio regressions in the PR description.

## Questions

Open a [GitHub Discussion](https://github.com/whosramoss/audiora/discussions) or an issue for questions before large refactors (new scan strategies, engine rewrites, preset format changes).
