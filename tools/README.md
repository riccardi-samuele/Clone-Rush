# Strumenti della campagna Candy Sky

Eseguire i comandi dalla radice del progetto. Node/npm e Chromium Playwright
servono alle verifiche; Pillow serve soltanto al generatore del contorno.

## Verifiche ripetibili

| Comando | Controllo |
| --- | --- |
| `npm run test:cleanup` | Moduli raggiungibili, asset, collider e integrità della grafica |
| `npm run test:maps:unit` | Soluzioni, determinismo, salvataggi, isole e portali |
| `npm run test:maps` | Suite Node, gravità, contatti, 33 scene, viewport, selezione e asset |
| `npm run test:mobile` | Favicon/manifest e cinque flussi multitouch |
| `npm run test:audio` | Hash e mix, sblocco audio, due codec, loop e volumi su desktop/touch |
| `npm run test:maps:live` | Livello 18 con RAF normale, tastiera e video fino al 19 |

L'estensione 25–32 include dieci replay deterministici per mappa e controlli
del selettore su desktop, telefono verticale, compatto e orizzontale.

`check-campaign.mjs` avvia Vite sulla porta 5175 se necessario.
Gli altri script browser richiedono Vite acceso. Le prove usano contesti isolati.
Rapporti e immagini: `docs/campaign/candy-sky-v2/`, `docs/mobile/`.

## Progettazione delle mappe

- `create-campaign.mjs`: genera `public/data/levels.json` dalle mappe native.
  Sovrascrive le mappe: eseguirlo soltanto quando si intende rigenerarle.
- `puzzle-lab.mjs`: laboratorio deterministico che usa il codice fisico reale;
  esbuild è una dipendenza di sviluppo esplicita.
- `construct-solutions.mjs`, `construct-routes.mjs`: costruzione di sequenze
  risolutive, salvate in `docs/campaign/candy-sky-v2/solutions.json`.
- `search-puzzles.mjs`, `puzzle-navigation.mjs`: ricerca limitata di percorsi.
  Output nella sottocartella `docs/campaign/candy-sky-v2/search/`.
- `replay-campaign.mjs`: registra le soluzioni nel renderer Phaser e aggiorna
  `phaser-replays.json`, usato dalla galleria della campagna.
- `create-island-contour.py`: estrae il profilo dall'asset approvato senza
  modificarlo. Rigenerarlo se cambia `island-profiles-v3.png` e ripetere le suite.

La galleria `docs/campaign/candy-sky-v2/index.html` legge le mappe direttamente
da `public/data/levels.json` attraverso Vite; non esiste una seconda copia.
Non sono necessari bundle o file del vecchio motore per avviare il gioco.

## Remix audio

`candy-sky/remix-audio.py` richiede Python, NumPy e FFmpeg con libvorbis/libmp3lame.
In alternativa al binario di sistema si può installare `imageio-ffmpeg`, oppure
impostare `FFMPEG_BINARY` con il percorso del binario. Sono strumenti di
authoring: il gioco non richiede Python né FFmpeg.

```sh
python3 tools/candy-sky/remix-audio.py
npm run test:audio
npm run test:cleanup
npm run build
```

Il render legge i sei OGG in `artwork/audio-source/`, sovrascrive i dodici export
runtime e aggiorna `artwork/audio-remix.json`. `--output` e `--manifest` consentono
di generare una copia separata per il confronto. A parità di NumPy/FFmpeg e
sorgenti, due render producono gli stessi hash. Il confronto e i test browser
sono registrati in `docs/audio/`; la pagina `docs/audio/index.html` permette
di ascoltare originali e remix attraverso Vite.
