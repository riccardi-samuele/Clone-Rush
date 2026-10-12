# Basic Launch Preparation Implementation Plan

> **For agentic workers:** Execute these steps in order. The user already
> authorized autonomous preparation for both portals; no ads are requested.

**Goal:** Produce uploadable, ad-free CrazyGames and GamePix packages and
storefront materials from the current Clone Rush source.

**Architecture:** The Vite build is the shared runtime. A small packaging
tool makes reproducible per-platform archives and validates contents. Storefront
art and metadata are outside the runtime. Browser lifecycle handling is shared.

**Tech Stack:** Phaser 3, Vite, Node, Playwright, ImageGen, FFmpeg.

---

### Task 1: Establish package contracts

- [x] Create a Node contract for archive root `index.html`, relative
  runtime paths, no SDK/ads, 50 MB/1,500-file CrazyGames limits, and required
  metadata/artwork filenames.
- [x] Add `tools/publishing/package.mjs` to build and package `dist` into
  `release/crazygames/` and `release/gamepix/`, excluding development docs.
- [x] Compress only decorative images in both releases and enforce the 20 MB
  CrazyGames mobile homepage threshold.
- [x] Run the contract and inspect both archives, then ignore `release/` in Git.

### Task 2: Browser lifecycle

- [x] Write a Node check for hidden-tab gameplay and audio.
- [x] Add one visibility controller in the Phaser boot path; pause on hidden,
  clear held input, and require an explicit resume after returning.
- [x] Run the lifecycle check plus existing mobile and campaign checks.

### Task 3: Rights-clear audio

- [x] Check for documented distribution rights. If absent, synthesize a new
  original 6-track set using no samples, melodies or stems from Jumping Clones.
- [x] Export OGG and MP3, replace the runtime files and update provenance.
- [x] Remove copied source audio from the current tree and verify the build and
  audio functionality. Preserve the previous Git commit for historical audit.

### Task 4: Storefront and previews

- [x] Save ImageGen covers and exact-size exports: 1920×1080, 800×1200,
  800×800, plus 512×512 GamePix icon.
- [x] Record real gameplay in 16:9 and 2:3, trim to 15–20 seconds, mute and
  place a matching static cover at the first frame.
- [x] Write platform-specific English metadata and submission instructions.

### Task 5: Final verification and push

- [x] Open packaged builds under a nested URL at 907×510, 800×450 and
  640×480, and inspect lobby, level selection and gameplay.
- [x] Run build, package audit, campaign, mobile and audio checks; record sizes.
- [x] Commit and push source, metadata and storefront assets. Keep distributable
  archives under ignored `release/`; report their local paths and outstanding
  portal-account steps.
