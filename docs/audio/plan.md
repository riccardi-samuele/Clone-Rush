# Candy Sky audio remix

Goal: remix every existing sound, including the shared music loop, to match
Candy Sky while retaining event timing, sound identities and player volumes.

Design: rework the five original effects with soft synthesis, harmonic chimes,
short airy tails and controlled peaks. Retain the music's melody and rhythm,
soften its electronic timbre and add a quiet bell/percussion arrangement.
No new gameplay triggers, external audio services or runtime synthesis.

Files:
- `tools/candy-sky/remix-audio.py`: deterministic offline rendering and encoding.
- `tools/candy-sky/audio-regressions.test.mjs`: asset, mix and manager regressions.
- `tools/candy-sky/verify-audio.mjs`: real browser decode, playback, mute and volumes.
- `artwork/audio-source/`: six original OGG inputs required by the remixer.
- `artwork/audio-remix.json`: source/output hashes, measurements and render settings.
- `public/assets/media/`: only the current OGG/MP3 exports, versioned URLs.
- `public/data/catalog.json`: same six IDs/names/keys, new export paths.
- `src/game/AudioManager.js`: adjust only if playback tests expose a real issue.
- README/ASSETS/tools docs: update audio provenance and reproduction commands.

- [x] Inspect decoded originals: duration, channel format, peaks, RMS, music rhythm.
- [x] Write and run failing checks for all six remixed assets, bounded levels,
  decodability, seamless music boundary and existing volume behavior.
- [x] Render all six deterministically from retained source inputs; encode OGG
  and MP3 with headroom, short effect tails and a continuous music loop.
- [x] Integrate versioned files, remove obsolete public encodings, update provenance.
- [x] Verify metrics, browser playback/unlock/mute, game flow and production build.
- [x] Review evidence, document results and leave the game running on port 5175.

The user has already authorized autonomous work. No Git repository is present.
Do not change graphics, map geometry, controls, saved volume values or loading animations.
