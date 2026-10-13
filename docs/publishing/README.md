# Clone Rush — portal delivery

**Game developer:** Samuele Riccardi.

Run `npm run package:portals` to rebuild the two ad-free upload archives in
`release/crazygames/` and `release/gamepix/`. The script audits file count,
size, URL format and the absence of portal SDK or ad calls, then writes SHA-256
manifests. It converts six decorative PNG images to WebP in the release only,
leaving gameplay terrain, clones and portals untouched. Python with Pillow is
required for the packaging step. It leaves previews and browser QA captures in
place. The resulting web bundle is 17,565,049 bytes (42 files), below
CrazyGames' 20 MB mobile homepage threshold; the ZIP is 16,004,535 bytes.

The current pre-submission assessment is `readiness-2026-10-13.md`, including
the package SHA-256 digest and the remaining portal checks.

The CrazyGames folder also includes `previews/clone-rush-landscape-preview.mp4`
and `previews/clone-rush-portrait-preview.mp4` (16.32 seconds, mute,
1920×1080 and 1080×1620). Both begin with the matching static ImageGen cover.
The covers in `artwork/` are 1920×1080, 800×1200, 800×800 and 512×512.
The current delivery artwork and its ImageGen sources are in
`artwork/publishing/covers/`. The creative rationale, source captures
and reproduction commands are in `marketing.md`. The concise browser report is
`marketing-report.html`; its two full-bleed zoom videos are in
`artwork/publishing/promos/`.
The `submission.md` in each release folder contains the English title,
description, controls and portal steps.

Browser checks loaded the extracted, optimized archive from `/web/` and reached lobby,
level selection and gameplay at 907×510, 821×462, 800×450, 640×480 and
390×844. The static package produced no page errors or HTTP failures in those
checks. See ignored `release/crazygames/qa/` for screenshots and recordings.

## Portal review

The current campaign is authored in `tools/candy-sky/create-campaign.mjs` and
the runtime uses the Phaser/Matter modules under `src/`. `ASSETS.md` documents
the active assets and the catalog data used for gameplay.

Upload each ZIP and its materials through the
respective developer portal, keep ads off, preview in each portal iframe, and
submit for review. CrazyGames Basic Launch permits an SDK-free game; GamePix's
submission guidelines also permit SDK-free uploads, although its SDK guide
describes the SDK import as mandatory for SDK integrations. Resolve any portal
review request in its private preview before public release.

Official references:

- https://docs.crazygames.com/requirements/intro/
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/requirements/game-covers/
- https://partners.gamepix.com/guidelines/submission
- https://partners.gamepix.com/sdk/doc/javascript
