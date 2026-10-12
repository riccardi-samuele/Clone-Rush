# Clone Rush — listing and promotional creative

## Message

The first glance should communicate the game's real hook: **one set of moves
guides every clone**. The colorful sky makes it approachable; the shared jump,
spikes and portal make it clear that the player is solving a coordination
puzzle. This is the visual direction of cover variant B.

The existing `artwork/publishing/covers/exports/` remains variant A. The new
`artwork/publishing/covers/v2/exports/` is variant B and is now copied into
both portal delivery folders. It includes 1920×1080 landscape, 800×1200
portrait, 800×800 square and 512×512 icon. Every cover contains only the game
title as text. Original generated PNGs and prompt notes are kept beside the
exports.

## Video

Two 16.32-second muted previews are stored in
`artwork/publishing/previews/v2/`. They begin with the corresponding variant B
cover and then show unaccelerated gameplay from levels 1, 2, 25 and 32. The
landscape video is 1920×1080; the portrait video is 1080×1620. Their source
recordings come from `tools/publishing/capture-marketing.mjs`; the edit is
reproducible after starting the game on `127.0.0.1:5175`:

```sh
npm run dev -- --host 127.0.0.1 --port 5175
node tools/publishing/capture-marketing.mjs
uv run --with imageio-ffmpeg python tools/publishing/render-previews.py
npm run package:portals
```

Run the server in a separate terminal. The published video copies live in
`release/crazygames/previews/`, outside the gameplay ZIP.

The preview uses hard cuts between real levels. It has no cursor, black bars,
opening logo transition, promotional overlay or sound. It does not depict
abilities absent from gameplay. CrazyGames requests 15–20 seconds, matching
static opening frame, full-screen landscape and portrait, and no sound.

## Launch and advertising decision

- **CrazyGames Basic Launch:** use organic discovery through the listing,
  covers and hover previews. Ads and monetization stay off; CrazyGames says
  they are unavailable in Basic Launch. Its dashboard evaluates average play
  time, Day 1 retention and conversion to at least one minute of play.
- **GamePix:** use the same truthful cover set and icon. Keep the current
  submission SDK-free and ad-free. The GamePix guidelines allow this setup;
  their advertising integration can be considered separately after launch.
  If ads are enabled later, interstitial opportunities belong only between
  levels after the portal sequence, with gameplay and audio paused while the
  ad is visible. Do not use timers or interrupt a puzzle attempt. Rewarded ads
  need an optional, clearly stated reward before they are offered.
- **Future paid promotion:** use separate off-platform creative with a short
  text hook such as “Two clones. One move.” The portal covers themselves must
  contain only the game title. Do not spend on acquisition until distribution
  rights for inherited content are resolved and the private portal previews
  are approved.

For the launch review, inspect each cover at thumbnail size, verify the first
video frame matches it, and track the portal's actual engagement metrics after
publication. Do not infer click-through or revenue from the local previews.

## Sources

- https://docs.crazygames.com/requirements/game-covers/
- https://docs.crazygames.com/resources/basic-launch-metrics/
- https://docs.crazygames.com/requirements/intro/
- https://partners.gamepix.com/guidelines/submission
