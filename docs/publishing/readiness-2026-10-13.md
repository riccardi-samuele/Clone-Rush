# Clone Rush — CrazyGames Basic Launch readiness, 13 October 2026

**Game developer:** Samuele Riccardi.

## Current game

- Runtime: the Phaser/Matter modules under `src/`, with a fixed 10 ms simulation.
- Campaign: 32 native island maps and an ending, defined in
  `tools/candy-sky/create-campaign.mjs` and shipped in `public/data/levels.json`.
- The retired tile-map format is rejected. The packaged predecessor engine and
  scripts from the sibling offline folder are not dependencies or upload files.
- Runtime graphics use the generated Candy Sky kit; current audio is independent
  synthesis and Fredoka's font license is included.

The earlier publishing assessment misread the cleanup map contract as a copy
of the predecessor's layouts. That inference was incorrect: the contract is
the Candy Sky campaign immediately before cleanup. The test name and the
publishing documents have been corrected.

`public/data/catalog.json` still contains historically sourced actor metadata
(IDs, fixtures and body properties). Its provenance is recorded in `ASSETS.md`.
This is not evidence that the current runtime source or campaign layouts are
the predecessor's. Changing a document or a name does not change provenance;
this report does not certify legal ownership.

## Upload package

- ZIP: `release/crazygames/clone-rush-crazygames.zip`, 16,004,535 bytes.
- Runtime: 42 files, 17,565,049 extracted bytes.
- SHA-256: `e38d4dd6cee78ca9a05112d83b77f0f438bc21690449410d14a5ffdc942aad76`.
- The HTML author metadata, portal submission sheets and package manifests name
  Samuele Riccardi as the game developer. Current game and storefront materials
  use the Clone Rush identity consistently.
- SDK and ads absent, compatible with Basic Launch requirements.
- Archive integrity and both existing package contract tests passed on 13 October.
- All seven cleanup checks passed, including exact reproduction of the shipped
  maps by the current generator without old backups.
- A scan of all archive filenames and text resources found no predecessor title
  or author name. The sibling offline scripts are absent from the archive.
- Three portal covers and two silent 16.32-second gameplay previews are present.
- The approved seven-second full-bleed zoom clips are separate promotional
  material, not the required portal gameplay previews.

## Remaining publication steps

1. Upload the candidate through the developer account and validate the private
   CrazyGames preview, including input, progress persistence, audio interruption,
   pause and transitions.
2. Confirm supported devices using real-device checks where local emulation is
   insufficient, particularly iPhone/Safari and the CrazyGames app safe areas.
3. Complete the developer declarations and submit for CrazyGames review.

Local technical checks support a submission candidate. They cannot substitute
for the portal's approval or establish the submitter's ownership declarations.
