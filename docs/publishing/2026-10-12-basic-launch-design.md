# Clone Rush: CrazyGames Basic Launch and GamePix delivery

## Decision

Prepare one ad-free HTML5 game build and two independently reviewable submission
folders. Do not integrate an advertising SDK. CrazyGames explicitly permits an
SDK-free Basic Launch. GamePix's submission guidelines say an SDK-free game is
permitted, although its SDK documentation describes an SDK import as mandatory
when integrating that SDK; the platform preview is the final confirmation.

## Release contents

- Reproducible Vite production build, copied into each platform package with
  `index.html` at the package root and only relative in-game resources.
- WebP copies of six decorative images in the upload bundle keep total runtime
  bytes below CrazyGames' 20 MB mobile homepage requirement; collision art
  remains unchanged.
- Separate English descriptions, instructions, controls, keywords and upload
  notes. No cross-promotion or external links in the game.
- Original ImageGen key art exported at CrazyGames' exact landscape, portrait
  and square cover dimensions, plus a 512px square icon for GamePix.
- Two silent 15–20 second gameplay previews for CrazyGames, landscape and
  portrait, with the matching static cover at the start.
- Automated package audit for archive contents, size, URL safety, no ad calls,
  audio provenance, and browser loading from a nested URL. Manual/automated
  checks at CrazyGames' small iframe sizes and GamePix's 640×480 minimum.

## Game behavior

When the document becomes hidden, pause gameplay and audio. On return, leave
the game paused until the player resumes it. Preserve local progress in both
packages. This avoids tab-switch input/audio drift and aligns with GamePix's
pause requirements. Existing control and level behavior stays the same.

## Current implementation and provenance

Corrected on 13 October: the runtime is implemented in Phaser/Matter and all
32 current map layouts are defined by the Candy Sky authoring generator.
The cleanup baseline preserves Candy Sky before cleanup; it is not evidence
that the predecessor's maps remain in the release. Current audio is independent
synthesis. Historically sourced actor metadata remains documented in
`ASSETS.md`. See `readiness-2026-10-13.md` for the current publication assessment.

## Platform sources

- CrazyGames requirements: https://docs.crazygames.com/requirements/intro/
- CrazyGames covers: https://docs.crazygames.com/requirements/game-covers/
- GamePix submission: https://partners.gamepix.com/guidelines/submission
- GamePix SDK: https://partners.gamepix.com/sdk/doc/javascript
