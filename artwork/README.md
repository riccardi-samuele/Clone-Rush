# Current Candy Sky artwork

`inventory.json` records the exact bytes of the active generated artwork and favicon exports. `prompts.json` retains available generation prompts. Hero and transition prompts were not recorded in the original project; their original source paths and hashes are retained. Reference paths inside prompts describe historical generation inputs, not runtime dependencies.

`favicon-master-v1.png` is the original generated master. Runtime size exports are under `public/assets/candy-sky-v1/icons/`; only those exports ship with the game. All other active source PNGs ship unchanged. Atlas rectangles live in `public/assets/candy-sky-v1/frames.json`.

After intentionally replacing artwork, update the inventory and run `npm run test:cleanup`.

`audio-source/` contains the six original OGG inputs actively used by
`tools/candy-sky/remix-audio.py`. `audio-remix.json` records their hashes, the
offline renderer/settings and measured OGG/MP3 exports. Sources do not ship in
the production build. See `docs/audio/README.md` for reproduction and checks.
