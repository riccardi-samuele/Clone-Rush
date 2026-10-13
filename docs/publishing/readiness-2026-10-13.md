# Clone Rush — CrazyGames Basic Launch readiness, 13 October 2026

**Game developer:** Samuele Riccardi.

## Current game

- Runtime: the Phaser/Matter modules under `src/`, with a fixed 10 ms simulation.
- Campaign: 32 native island maps and an ending, defined in
  `tools/candy-sky/create-campaign.mjs` and shipped in `public/data/levels.json`.
- Maps use the native island format shared by rendering and collisions.
- Runtime graphics use the generated Candy Sky kit; current audio is independent
  synthesis and Fredoka's font license is included.

`public/data/catalog.json` defines the actor IDs, collision shapes, body
properties and audio events consumed by the game. The cleanup contracts
preserve the intended Candy Sky physics and map layouts during maintenance.

## Upload package

- ZIP: `release/crazygames/clone-rush-crazygames.zip`, 16,004,564 bytes.
- Runtime: 42 files, 17,565,064 extracted bytes.
- SHA-256: `cd13764f0e6719c28991b73f79b09ccf6d3f2776d9d54d83f8b8dd0fb9d7e32a`.
- The HTML author metadata, portal submission sheets and package manifests name
  Samuele Riccardi as the game developer. Current game and storefront materials
  use the Clone Rush identity consistently.
- SDK and ads absent, compatible with Basic Launch requirements.
- Mobile movement and jump controls are 76 CSS pixels, or 72 in compact
  landscape, with at least 12 pixels of separation. Five emulated phone flows
  passed with simultaneous movement/jump, pause, rotation and level completion.
- Archive integrity and both existing package contract tests passed on 13 October.
- All seven cleanup checks passed, including exact reproduction of the shipped
  maps by the current generator without old backups.
- The upload contains the current game and its runtime resources. Package
  metadata and submission sheets identify Samuele Riccardi as the developer.
- Three portal covers and two silent 16.32-second gameplay previews are present.
- The approved seven-second full-bleed zoom clips are separate promotional
  material, not the required portal gameplay previews.

## Remaining publication steps

1. Upload the candidate through the developer account and validate the private
   CrazyGames preview, including input, progress persistence, audio interruption,
   pause and transitions.
   In the HTML5 form, drag the contents of `release/crazygames/web/`, not the ZIP.
   Select **Yes, using LocalStorage** for progress saving.
2. Confirm supported devices using real-device checks where local emulation is
   insufficient, particularly iPhone/Safari and the CrazyGames app safe areas.
3. Complete the developer declarations and submit for CrazyGames review.

Local technical checks support a submission candidate. Publication still
requires the portal's review and approval.
