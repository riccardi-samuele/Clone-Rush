# Remove unused game material

**Goal:** Retain only the current Candy Sky game, its active artwork/audio,
current map authoring utilities and repeatable regression checks.

**Method:** Trace imports from `src/main.js`, worker URLs, HTML/CSS/manifest,
Boot loader, atlas frames, catalog metadata and all 25 production scenes.
Cross-check two independent read-only source and asset audits. The previous
project is temporarily snapshotted outside the workspace for rollback during
verification; remove that temporary snapshot after validation.

- [x] Record baseline runtime requests and actor fixture/physics contract.
- [x] Add failing checks for unreachable source, obsolete texture loading,
  catalog fixture preservation and unreferenced public assets.
- [x] Remove dead source and obsolete rendering/map-format branches. Keep
  current save migration because existing players still use it.
- [x] Remove legacy texture/bitmap-font/tile loads; keep audio and exact actor
  fixture metadata. Centralize the current runtime artwork list.
- [x] Delete obsolete public sets, backup/study/concept/capture tools and old
  outputs; consolidate current art provenance and rewrite current docs.
- [x] Verify orphan/module/asset audits, all map regressions and 25 live scene
  replays, 5 phone flows, natural level-18 playback and production build.
- [x] Review deletions, compare footprint and runtime requests, save report,
  remove rollback snapshot and leave the game running on port 5175.

No Git repository is present. Dependency installation remains managed by npm;
do not prune arbitrary vendor files from `node_modules`.
