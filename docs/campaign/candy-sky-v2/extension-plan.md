# Candy Sky — estensione 25–32

**Goal:** append eight authored, solvable puzzles to the existing 24-level campaign.
**Architecture:** reuse the existing kit and production physics. The authoring
generator remains the only map source. Store complete fixed-step input witnesses
with the existing solutions. Paginate the selector in groups of 24, keeping the
current mobile target sizes. Existing campaign/version/save keys remain valid.
**Tech stack:** Phaser/Matter, Node, Playwright; no new runtime dependencies.

The user authorized autonomous implementation. Eight new levels are the stated
default while the optional quantity question remains open. Authored combinations
are preferable to random variants: key/exit order, opposite directions and
different movement rules create new puzzles with a concrete completion witness.

## Requirements

- Keep all 24 existing maps and the epilogue byte-equivalent as data objects.
- Add 25–32, with distinct routes, at least two roles, and rising coordination
  demands; combine keys, one-use exits, springs and reverse gravity.
- Initial supports must be stable for 2 seconds; every clone must be able to exit.
- Replay each new solution ten times at 10 ms; verify all solutions in the real
  scene with keyboard, transitions, pause/restart and saved completion.
- Completing 24 unlocks 25. The ending follows 32. Existing saves keep completions,
  volumes and unlocks; players who finished 24 can select 25 immediately.
- Selector shows at most 24 tiles per page, correct page on return, working arrows
  and keyboard page crossing. Hidden tiles cannot receive pointer input.
- Check desktop and phone layouts and actual touch entry on page two.

## Implementation checklist

- [x] Write failing expansion, save and pagination tests. Run with
  `node --test tools/candy-sky/extension-regressions.test.mjs`.
- [x] Author eight maps in `tools/candy-sky/create-campaign.mjs`; derive levelCount
  from maps.length. Generate `public/data/levels.json`.
- [x] Construct and record complete sequences in the existing `solutions.json`
  using `createLab(number, custom)` during iteration and `createLab(number)` for
  final exact map-hash witnesses. Keep originals intact.
- [x] Add `src/game/LevelPages.js`, integrate arrows/page labels/visibility in
  `RoyalLevelSelect.js`; `LevelSelectScene` follows keyboard selection across pages.
- [x] Remove fixed 24-level assumptions from runtime/viewport/asset/selector checks
  and authoring tools. Preserve the cleanup contract for original map numbers;
  validate native fields for the whole extended campaign.
- [x] Run Node regressions, full real-scene campaign checks, all-map visual replays,
  mobile regression suite and new page-two touch/layout/save checks.
- [x] Update campaign gallery/counts and README; build; request independent review;
  resolve concrete findings and leave Vite running on 5175.

No Git repository is present. Graphics, audio and physics behavior are unchanged.
