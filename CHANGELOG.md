# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

## [1.1.0] - 2026-09-09

### Added

- Lifecycle event hooks on the `Audiora` class (`start`, `stop`, `imageload`, `error`) through the `EventTarget` pattern.
- TypeScript types for all event detail payloads (`AudioraStartEvent`, `AudioraStopEvent`, etc.).

### Changed

- Build system migrated from `tsc` to `tsup` (ESM + CJS, minification, declaration emit, source maps, and tree shaking).
- Updated `package.json` exports to follow modern Node.js resolution patterns.
- Added `sideEffects: false` for better tree shaking support.

## [1.0.1] - 2026-07-27

### Fixed

- Reject image loading when `naturalWidth` is 0 in `waitForImage`, instead of hanging indefinitely.
- Apply reverb buffer updates after tween completes when `reverb_time` changes.

### Changed

- Updated homepage URL in `package.json`.
- Updated README and API documentation.

## [1.0.0] - 2026-07-15

### Added

- Initial public release of `audiora`.
- Picture-driven synthesis instrument with live playback and offline WAV render.
- Built-in presets: `Haze`, `Leap`, `Pulse`, `Bite`, `Spark`, `Raw`.
- Scan modes: `linear`, `vertical`, `zigzag`, `drift`, `spiral`.
- Timing modes: `expressive`, `stable`.
- Custom oscillator identities: `pulse`, `organ`, `bell` (plus native Web Audio types).
- UI helpers: `FORMAT`, `RANGE_KEYS`, `SELECT_KEYS`, `DEFAULT_PRESET`.
- API reference in `docs/API.md`.

[1.1.0]: https://github.com/whosramoss/audiora/releases/tag/v1.1.0
[1.0.1]: https://github.com/whosramoss/audiora/releases/tag/v1.0.1
[1.0.0]: https://github.com/whosramoss/audiora/releases/tag/v1.0.0