# Risorse attive

Clone Rush è ideato e sviluppato da Samuele Riccardi, con assistenza di un agente AI.

## Kit Candy Sky

Tutta la grafica runtime è in `public/assets/candy-sky-v1/`.
`src/game/AssetManifest.js` elenca le immagini caricate da Phaser e
`frames.json` definisce le regioni utilizzate degli atlas.

| Immagine | Uso |
| --- | --- |
| `sky-background*.png` | Cielo comune, verticale e orizzontale |
| `logo.png`, `hero.png` | Identità, lobby e caricamento |
| `interface-v3.png`, `icons-v2.png` | Pulsanti, selezione, pausa e touch |
| `islands-v2.png` | Isole decorative della selezione |
| `island-profiles-v3.png` | Isole modulari dei livelli |
| `clones.png` | Cinque cloni e particelle |
| `objects-v2.png` | Chiavi, molle, punte e nuclei dei portali |
| `portal-sheet-v3.png` | Portali appoggiati |
| `floating-portals-v1.png` | Portali sospesi senza piedistallo |
| `decor-sheet.png` | Scintille e bagliori |
| `transition.png` | Ante della transizione |

Le immagini generate con imagegen mantengono i byte originali. Dimensioni,
hash e fonti sono in `artwork/inventory.json`; i prompt disponibili in
`artwork/prompts.json`. I prompt del hero e della transizione non erano
registrati nel progetto originale: sono conservati fonte e hash.
I riferimenti storici nei prompt descrivono gli input della generazione.

Le piattaforme usano segmenti ripetuti e terminali; non si allunga l'intera
immagine. I dati del contorno delle nuvole sono in
`src/game/candy-island-contour.json` e vengono verificati contro l'hash del PNG.
Il padding e le mipmap delle texture vengono preparati in memoria.

## Favicon e icone Home

Master generato: `artwork/favicon-master-v1.png`.
`public/assets/candy-sky-v1/icons/` contiene le esportazioni a 16, 32, 180,
192 e 512 pixel; `public/favicon.ico` contiene i formati browser.
Le esportazioni sono ridimensionamenti del master conservato.

## Font

L'interfaccia usa Fredoka locale, `public/assets/fonts/Fredoka.ttf`.
La licenza SIL Open Font License è conservata accanto al font in
`Fredoka-OFL.txt`.

## Audio e dati fisici

I sei suoni runtime sono ora sintesi originali da oscillatori e rumore
deterministico, senza campioni audio importati. Lo script
`tools/publishing/render-original-audio.py` genera i dodici export
`*-original-v2.ogg/mp3` in `public/assets/media/`; il manifest con hash e
durata è `artwork/audio-original-v2.json`. I nomi degli eventi e i volumi
salvati restano quelli del gioco.

Il runtime corrente è implementato nei moduli Phaser/Matter di `src/`.
Le 32 mappe Candy Sky e il finale sono definiti in
`tools/candy-sky/create-campaign.mjs`, che riproduce `public/data/levels.json`.
Il vecchio formato di mappe a tile non viene caricato ed è rifiutato dal runtime.

Il catalogo conserva le fixture, dimensioni, masse, attriti, gruppi di collisione
e audio effettivamente necessari. Il controllo `npm run test:cleanup` confronta
il contratto fisico con quello precedente alla pulizia di Candy Sky. Anche
`docs/cleanup/map-contract.json` riguarda le mappe Candy Sky prima della
pulizia. Questi contratti impediscono che una pulizia dei file modifichi
accidentalmente collisioni, coordinate e comportamento dei livelli.
