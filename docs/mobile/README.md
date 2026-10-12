# Clone Rush on a phone

Start `npm run dev` from the project. Vite listens on every network interface,
port **5175**, and prints the Wi-Fi address under **Network**. On the current
network: <http://192.168.0.18:5175/>. Keep the computer and server running and
connect the phone to the same Wi-Fi. The address can change with the network.

Hold left/right and use a second finger for jump. Portrait and landscape are
supported. Pause opens Resume, Restart and Levels. The game respects safe areas
and browser toolbar height; rotation or focus loss releases movement.

Browser and Apple Home icons use the generated pink Candy Sky clone. Add to Home
Screen through the browser menu if desired. This is not an offline version.
Each browser keeps its own progress.

## Verification — 2026-10-12

- `MOBILE_BASE_URL=http://192.168.0.18:5175/ npm run test:mobile`: 2 metadata/asset
  tests and 5 full touch flows passed. Actual Chromium touch input, isolated
  fresh saves, production physics at fixed 10ms. All five reached level 2 by
  completing level 1. Multi-touch, cancellation, focus loss, rotation, safe-area
  sizing, 44px menu targets, 52px movement targets, pause/resume/restart/levels.
- Viewports: 390×844 DPR2, 844×390 DPR2, 320×568 DPR3, 568×320 DPR2,
  320×460 DPR2. Safe-area margins were injected before testing the menus.
- `npm run test:maps`: 97 Node regressions, 25 runtime scenes, 50 desktop/phone
  render checks, 19 gravity presentation checks, underside contact and selector
  checks passed.
- `npm run build`: passed. Existing Vite warning about the bundled Phaser chunk
  exceeding 500kB remains.
- LAN HTTP: game, favicon, Apple icon and manifest returned 200.

These are emulated phone tests, not a test on the user's physical device.
WebKit could not run in this environment because its Linux runtime libraries
are missing; no Safari/iOS browser verification is claimed.

Evidence: [checks.json](checks.json), screenshots in [screens/](screens/).
Generated master: `artwork/favicon-master-v1.png`.
Full built-in imagegen prompt: `artwork/prompts.json`.
Exports are size/format conversions of the unchanged master.
