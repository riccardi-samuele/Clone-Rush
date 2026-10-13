# Clone Rush — listing and promotional creative

**Game developer:** Samuele Riccardi.

## Message

The first glance should communicate the game's real hook: **one set of moves
guides every clone**. The colorful sky makes it approachable; the shared jump,
spikes and portal make it clear that the player is solving a coordination
puzzle. This is the visual direction of the final covers.

`artwork/publishing/covers/exports/` is copied into both portal delivery
folders. It includes 1920×1080 landscape, 800×1200
portrait, 800×800 square and 512×512 icon. Every cover contains only the game
title as text. Original generated PNGs and prompt notes are kept beside the
exports.

## Video

The two approved silent animated cover previews live in
`artwork/publishing/promos/`. Each lasts 16 seconds and starts on the matching
static cover. A short smooth push-in leads into the long zoom-out, keeping the
image full-frame without side bands, blurred backdrops or cuts. Landscape is
1920×1080; portrait is 1080×1620. These are cover animations, not recordings of
a gameplay session. Their characters, islands, spikes and portals depict the
game's visual theme. Editorial acceptance remains subject to portal review.

Regenerate and package the final videos with:

```sh
uv run --with imageio-ffmpeg python tools/publishing/render-zoom-promo.py
npm run package:portals
```

The rendering script checks dimensions, duration, absence of audio, size below
50 MB and first-frame similarity to the matching cover, allowing for video
compression. Results and source hashes are in `artwork/publishing/promos/manifest.json`.
Upload copies live in `release/crazygames/previews/`, outside the gameplay ZIP:
`clone-rush-zoom-landscape.mp4` and `clone-rush-zoom-portrait.mp4`.

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
  contain only the game title. Validate the private portal preview and the
  first player engagement results before spending on acquisition.

For the launch review, inspect each cover at thumbnail size, verify the first
video frame matches it, and track the portal's actual engagement metrics after
publication. Do not infer click-through or revenue from the local previews.

## Sources

- https://docs.crazygames.com/requirements/game-covers/
- https://docs.crazygames.com/resources/basic-launch-metrics/
- https://docs.crazygames.com/requirements/intro/
- https://partners.gamepix.com/guidelines/submission
