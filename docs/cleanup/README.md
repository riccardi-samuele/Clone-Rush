# Manutenzione delle risorse attive

Clone Rush è ideato e sviluppato da Samuele Riccardi, con assistenza di un agente AI.

Il progetto mantiene il gioco Candy Sky, le risorse runtime, i materiali finali
per la pubblicazione, i generatori e le verifiche della versione corrente.

La suite `npm run test:cleanup` controlla che tutti i moduli JavaScript siano
raggiungibili da `src/main.js` o dal worker, che `public/` contenga soltanto le
risorse caricate dal gioco e le licenze necessarie, e che il generatore produca
esattamente le mappe distribuite.

`physics-contract.json` e `map-contract.json` sono riferimenti di regressione:
conservano le proprietà fisiche e i layout Candy Sky approvati. Servono ai test;
aggiornarli soltanto dopo una modifica intenzionale e verificata del gameplay.
`runtime-checks.json` è prodotto da `tools/candy-sky/verify-runtime-assets.mjs`
e registra le risorse effettivamente richieste dal browser.

```sh
npm run test:cleanup
npm run test:maps
npm run test:mobile
npm run test:maps:live
npm run build
```

Le verifiche mobile usano Chromium emulato. Per verificare Safari e il telefono
fisico occorre eseguire anche una prova su quei dispositivi.
