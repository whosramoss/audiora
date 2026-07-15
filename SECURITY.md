# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public GitHub issue with exploit details.

Instead, use one of the following:

1. **[GitHub Security Advisories](https://github.com/whosramoss/audiora/security/advisories/new)** (preferred) — private report on the repository.
2. Contact the maintainer via the email listed on the [npm package page](https://www.npmjs.com/package/audiora) if you cannot use GitHub.

Include:

- A description of the issue and impact
- Steps to reproduce
- Affected versions
- Any suggested fix (optional)

We aim to acknowledge reports within **7 days** and will coordinate disclosure and a fix before publishing details when appropriate.

## Scope

This library runs in the browser. It loads images, samples pixels via canvas, and generates audio with the Web Audio API (live and offline). Reports related to:

- Cross-origin image handling / canvas tainting when string URLs are loaded
- Unexpected network or credentialed requests triggered by library image loading
- Denial of service from pathological images or parameter values that exhaust memory/CPU in **library code paths** (processing, scheduling, offline render)
- Unsafe handling of consumer-supplied `PresetData` / render options that leads to script execution or unexpected privilege (when attributable to the library)

are in scope when they stem from **library behavior**, not from application misuse (e.g. embedding untrusted remote image URLs without CORS awareness, or granting the page unintended permissions).

Out of scope:

- Browser autoplay / AudioContext resume policies
- Vulnerabilities in the demo site hosting (`www/`), third-party CDNs, or consumer apps that embed `audiora` incorrectly
- Hearing-safety / loudness of synthesized audio (callers control `volume` and should clamp for end users)
- Issues that only affect Node or non-browser runtimes (the library targets browsers)
