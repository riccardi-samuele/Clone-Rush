# Risorse attive

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

L'audio e i metadati fisici derivano da Jumping Clones di Robert Alvarez
(rob1221). I sei audio originali OGG in `artwork/audio-source/` sono gli input
del remix Candy Sky: cinque effetti ricostruiti con sintesi morbida e campanelli,
più il tema originale riarrangiato. `tools/candy-sky/remix-audio.py` esegue il
render offline; il gioco carica soltanto i dodici export `*-candy-v1.ogg/mp3`
in `public/assets/media/`. I due formati mantengono la compatibilità dei browser.
Seed, versioni degli strumenti, hash delle sorgenti e degli export, durata,
picco e RMS decodificati sono registrati in `artwork/audio-remix.json`.
I nomi degli eventi e i volumi salvati restano quelli del gioco.
Fonte della distribuzione: `https://files.crazygames.com/jumping-clones/2/assets/`.
Pagina dell'autore: `https://rob1221.itch.io/jumping-clones`.

Il catalogo conserva le fixture, dimensioni, masse, attriti, gruppi di collisione
e audio effettivamente necessari. Il controllo `npm run test:cleanup` confronta
il contratto fisico con quello precedente alla pulizia.
