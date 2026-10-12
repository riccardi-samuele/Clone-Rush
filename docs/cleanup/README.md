# Pulizia del progetto — 12 ottobre 2026

## Risultato

Sono stati eliminati i vecchi kit royal/castle, la grafica pixel originale,
font e joystick dismessi, concept e anteprime obsolete, backup della vecchia
campagna, strumenti di conversione/cattura superati, cache graphify e moduli
scollegati. Rimangono il gioco Candy Sky, gli strumenti per progettare le mappe
e le verifiche ripetibili della versione corrente.

Il caricamento non richiede più le 68 vecchie texture animate. Il catalogo
mantiene i valori fisici necessari; sono stati rimossi i renderer e gli
adattatori delle vecchie mappe a tile. Le mappe native mantengono esattamente
isole, attori, gravità e coordinate. La migrazione dei salvataggi resta attiva.

La grafica runtime è elencata in `src/game/AssetManifest.js`. Prompt disponibili,
fonti, hash e master della favicon sono raccolti in `artwork/`, fuori dalla
build. Il foglio di scintille/bagliori è stato spostato nel kit Candy Sky,
conservandone i byte originali. README e documentazione delle risorse sono
stati aggiornati.

## Controlli

- 97 test Node: fisica, soluzioni, determinismo, progressi, contorni, portali,
  asset e riproducibilità del generatore delle mappe.
- Tutti i 24 livelli e il finale: completamento, pausa, morte, riavvio,
  salvataggio, portali e transizioni nel runtime reale.
- 25 replay Phaser e 50 controlli grafici desktop/telefono.
- Cinque flussi multitouch via LAN, oltre ai due controlli favicon/manifest.
- Livello 18 giocato con RAF normale fino al 19, con video e screenshot.
- Caricamento statico, avanzamento monotono fino al 100%, errore di rete e
  riprova tramite pulsante.
- Build di produzione avviata tramite server statico, lobby e livello 1
  ispezionati negli screenshot, nessuna risorsa HTTP mancante o errore JS.
- Revisione indipendente di codice, asset e strumenti.

Il test negativo `CONTACT_BASELINE=1` riproduce intenzionalmente il vecchio
collider rettangolare in un browser isolato: deve fallire. La prova attuale
passa; entrambi i risultati sono nella cartella della campagna.

## Evidenze e ripetizione

[Report](report.json), [file eliminati](deletions.json),
[risorse e loading](runtime-checks.json), [build](production-checks.json),
[lobby compilata](production-lobby.png), [partita compilata](production-game.png).

```sh
npm run test:cleanup
npm run test:maps
npm run test:mobile
npm run test:maps:live
npm run build
```

`test:maps` include il controllo delle risorse realmente scaricate.
I contratti `physics-contract.json` e `map-contract.json` descrivono il gioco
prima della pulizia. Se si cambiano intenzionalmente fisica o mappe, aggiornare
i contratti soltanto dopo aver verificato le nuove geometrie e soluzioni.

Le verifiche mobile usano Chromium emulato; non attestano una prova su un
telefono fisico o Safari. La build conserva l'avviso Vite già presente sulla
dimensione del bundle Phaser. Le dipendenze installate restano gestite da npm.
