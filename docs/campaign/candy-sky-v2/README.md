# Verifica delle mappe Candy Sky

## Esecuzione

Preparazione una tantum:

```sh
npm ci
npx playwright install chromium --only-shell
```

Suite completa:

```sh
npm run test:maps
```

Il comando avvia Vite sulla porta 5175 quando necessario. I browser di prova
hanno salvataggi isolati. Il server già aperto e i progressi del giocatore
non vengono modificati.

Solo test Node: `npm run test:maps:unit`.
Partita con clock normale, tastiera e video: `npm run test:maps:live`.

## Cosa viene controllato

- Presentazione della gravità invertita: viola capovolto, freccia verso l'alto
  associata al personaggio e bordo viola sul lato percorribile delle isole.
  Il tutorial del livello 18 resta fino alla chiave, si nasconde in pausa e
  ritorna al riavvio. Controlli su desktop, telefono, schermi piccoli,
  orientamento orizzontale, densità doppia e rotazione durante la partita.
- Fisica a passi di 10 ms, spawn, salti, recupero e completamento dei 32 livelli e dell'epilogo.
- Dieci ripetizioni delle stesse sequenze sui livelli con gravità invertita:
  posizioni, velocità, contatti, raccolte e uscite devono essere identici.
- Salto verso il basso, ritorno al supporto e uscita dai bordi del livello 18.
- Pausa, riavvio, morte, assorbimento nel portale, salvataggio e transizione
  in tutte le scene di gioco.
- Desktop, telefono, comandi touch e accesso dai vecchi salvataggi.
- Portali sospesi: anelli senza piedistallo, riconosciuti dalla geometria.
  Apertura trasparente centrata sul sensore originale, luci orbitali, pausa,
  stato bloccato, sblocco con chiavi e chiusura del portale rosa.
- Pixel del terreno effettivamente renderizzato, confrontati con la sagoma
  opaca del cubo sulle 11 isole con appoggio inferiore dei primi 24 livelli Candy Sky. La fisica e i
  metodi di movimento del Clone reale vengono ripetuti nei due versi, a 10 ms.
  Campionamento grafico: 4 pixel per unità; tolleranza massima: 0,5 unità.
  Ogni attraversamento deve arrivare all'altro estremo senza perdere appoggio.

## Gravità invertita leggibile

Il viola viene attirato verso l'alto e salta verso il basso. La grafica lo
mostra capovolto; una freccia lo accompagna anche durante il salto, mentre
un bordo violetto e piccole frecce segnalano il lato inferiore delle isole.
Nel livello 18 una scheda spiega la regola fino alla raccolta della chiave.
Le dimensioni del testo tengono conto dei pixel CSS del dispositivo.

Evidenze: `gravity-presentation-checks.json`,
`screens/level-18-gravity-desktop.png`, `screens/level-18-gravity-phone.png`.
Il video `media/level-18-live.webm` mostra una partita dal 18 al 19.
Le indicazioni sono elementi di presentazione: fisica e geometria delle
mappe mantengono gli stessi dati e le stesse sequenze risolutive.

## Portali sospesi

I portali appoggiati alle isole mantengono la struttura con piedistallo.
Quelli senza un'isola sotto il punto di appoggio usano un anello circolare
chiuso con sfere di energia e due luci in orbita. L'azzurro resta riutilizzabile;
il rosa resta monouso. L'orbita si ferma in pausa e segue blocco, sblocco e
chiusura. L'apertura grafica rimane centrata sul sensore originale.

La selezione dipende dalle piattaforme native della mappa. Le mappe del vecchio
formato a tile non sono più supportate.

Grafica generata con `image_gen.imagegen`, copiata senza modifiche:
`public/assets/candy-sky-v1/floating-portals-v1.png`.
Prompt e centri delle aperture:
`artwork/prompts.json`.
Confronto nello stesso livello: `screens/level-23-desktop-checked.png`.

## Regressione riprodotta

Il vecchio rettangolo di collisione e gli angoli quadrati del cubo non
corrispondevano alle nuvole e al personaggio disegnati. Il motore poteva
segnalare appoggio lasciando un distacco visibile. La collisione ora usa il
profilo estratto dall'immagine originale e il cubo ha una sagoma arrotondata.
Durante la camminata l'aggancio segue il profilo; non trattiene i salti e non
crea appoggi nei vuoti.

Riproduzione automatica delle vecchie collisioni, in un browser isolato:

```sh
CONTACT_BASELINE=1 node tools/candy-sky/verify-underside-contact.mjs
```

Questo comando **deve fallire** sul distacco grafico. I rapporti prima/dopo
sono `underside-contact-before.json` e `underside-contact-checks.json`.
Il controllo su sagoma e appoggio è distinto dalla prova della partita completa.
La registrazione con clock normale misura anche i pixel dello sprite animato
reale all'ingresso, prima del salto e dopo il ritorno con la chiave.

Se cambia `island-profiles-v3.png`, rigenerare i dati con
`python3 tools/candy-sky/create-island-contour.py` e ripetere la suite.
Il generatore richiede Pillow e legge l'immagine senza modificarla.
Un test confronta l'hash dell'immagine con quello dei dati di collisione.
