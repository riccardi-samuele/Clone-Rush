# Current Candy Sky artwork

`inventory.json` records the exact bytes of the active generated artwork and favicon exports. `prompts.json` retains available generation prompts. Hero and transition prompts were not recorded in the original project; their original source paths and hashes are retained. Reference paths inside prompts describe historical generation inputs, not runtime dependencies.

`favicon-master-v1.png` is the original generated master. Runtime size exports are under `public/assets/candy-sky-v1/icons/`; only those exports ship with the game. All other active source PNGs ship unchanged. Atlas rectangles live in `public/assets/candy-sky-v1/frames.json`.

After intentionally replacing artwork, update the inventory and run `npm run test:cleanup`.

`audio-original-v2.json` records the current independently synthesized OGG/MP3
exports. Rebuild them with `tools/publishing/render-original-audio.py`; no input
audio files are used.
