# Clone Rush — Candy Sky

Puzzle platform in Phaser 3: un solo comando controlla tutti i cloni.
32 livelli, cinque tipi di clone, scena finale, salvataggi locali e controlli
multitouch. Lobby, selezione, caricamento e partita condividono il kit Candy Sky:
cielo azzurro, isole volanti, nuvole e caramelle rosa.

## Avvio

```sh
npm ci
npm run dev
```

Aprire <http://127.0.0.1:5175/>. Vite usa la porta fissa 5175 e ascolta anche
sulla rete locale. Per la build: `npm run build`, poi `npm run preview`.
Su Linux `./Avvia\ Clone\ Rush.sh` apre la build con Python sulla porta 18766;
`CLONE_RUSH_PORT=19000` consente di scegliere un'altra porta.

## Telefono

Collegare telefono e computer alla stessa rete Wi-Fi, lasciare Vite acceso e
aprire l'indirizzo **Network** stampato nel terminale. L'indirizzo del computer
può cambiare quando cambia la rete; `127.0.0.1` sul telefono indica il telefono.

Tenere premuta una freccia e usare un secondo dito sul salto. Verticale,
orizzontale, notch e barra Home sono gestiti dal layout. Pausa offre ripresa,
riavvio e selezione livelli, ora divisi in pagine da 24. È possibile aggiungere il gioco alla schermata
Home; il server del computer resta necessario. I progressi sono locali al
browser e all'origine del sito, con chiave `clone-rush:v1`.

## Comandi

| Azione | Tastiera |
| --- | --- |
| Movimento | A/D oppure Sinistra/Destra |
| Salto | W oppure Su |
| Riavvio | R |
| Selezione livelli | Esc oppure B |
| Conferma nei menu | Invio oppure Spazio |
| Navigazione nei menu | Frecce oppure WASD |

La musica parte al primo gesto; i volumi si regolano nella lobby.
Il clone rosa inverte i comandi, il verde non salta, il giallo continua a
scivolare e il viola cade verso l'alto. I portali azzurri sono riutilizzabili;
quelli rosa accolgono un solo clone. Le chiavi sbloccano i portali azzurri.

## Struttura

- `src/scenes/`: caricamento, lobby, selezione, partita, finale e transizione.
- `src/game/Clone.js`, `LevelWorld.js`: simulazione Matter a passi di 10 ms.
- `CandyIslandStrip.js`, `CandyIslandGeometry.js`: isole modulari e collider.
- `GravityPresentation.js`, `PortalPresentation.js`: gravità e portali sospesi.
- `PortalEntryAnimation.js`, `GeneratedWorldEffects.js`: ingresso nei portali.
- `RoyalLobby.js`, `RoyalLevelSelect.js`, `RoyalPlayHUD.js`: interfacce Candy Sky.
- `AssetManifest.js`: elenco unico delle immagini caricate dal gioco.
- `InputController.js`, `CandySky.js`, `RoyalPlayHUD.js`: input e layout adattivo.
- `ProgressStore.js`, `AudioManager.js`: progressi, migrazione e audio.
- `LoadingScreen.js`: caricamento statico, barra di progresso e riprova.
- `public/data/`: mappe native e metadati fisici/audio degli attori.
- `public/assets/`: soltanto risorse runtime e licenza del font Fredoka.
- `artwork/`: provenienza, prompt disponibili e master della favicon.
- `tools/candy-sky/`: progettazione delle mappe e verifiche ripetibili.
- `docs/campaign/`, `docs/mobile/`: rapporti e immagini delle verifiche.

Il fondale è comune; ogni mappa descrive isole e attori. Le piattaforme lunghe
ripetono il materiale senza stirarlo. La gravità invertita usa il profilo
visibile delle nuvole. I portali sospesi hanno anelli senza piedistallo.
Il caricamento resta statico; le transizioni coprono lo schermo prima del cambio.

## Verifiche

Preparare Chromium una volta: `npx playwright install chromium --only-shell`.

```sh
npm run test:cleanup
npm run test:maps
npm run test:mobile
npm run test:audio
npm run test:maps:live
npm run build
```

`test:maps` avvia il server quando serve. Gli altri test browser richiedono
Vite acceso. Le verifiche usano browser e salvataggi isolati. La suite mobile
usa input touch Chromium emulato; non sostituisce una prova sul telefono reale.

Dettagli: [strumenti](tools/README.md), [campagna](docs/campaign/candy-sky-v2/README.md),
[mobile](docs/mobile/README.md), [risorse](ASSETS.md).
La pulizia è documentata in [docs/cleanup/](docs/cleanup/README.md).
Il remix dei sei audio e le verifiche sono in [docs/audio/](docs/audio/README.md).
