# Candy Sky — remix audio

Tutti i sei audio del gioco sono stati remixati e integrati. L'ascolto comparato
è disponibile in [index.html](index.html), servito da Vite.

| Evento | Nuovo suono | Durata del master |
| --- | --- | --- |
| Salto | Goccia ascendente, attacco breve | 0,32 s |
| Morte | Pop discendente con accento di legno | 0,56 s |
| Portale | Arpeggio crescente e scia d'aria | 0,95 s |
| Rimbalzo | Impulso elastico, distinto dal salto | 0,43 s |
| Chiave | Tre campanelli G–B–D | 0,69 s |
| Musica | Tema originale addolcito, campanelli, basso e piccoli accenti ritmici | 164,553 s |

## Produzione

Sintesi e remix offline con NumPy e FFmpeg. Non viene eseguita sintesi durante
il gioco. Le sei sorgenti OGG originali, di Jumping Clones di Robert Alvarez,
restano in `artwork/audio-source/` perché sono input del renderer.
Gli originali MP3 duplicati non vengono conservati. Il pacchetto pubblico
contiene soltanto i dodici nuovi export OGG/MP3, con URL `*-candy-v1`.

Gli ID e gli eventi di `AudioManager` restano invariati. Nessuna modifica a
mappe, fisica, grafica, caricamento, controlli o volumi salvati. I nuovi effetti
iniziano subito con attacchi di pochi millisecondi e code limitate.
La musica conserva il tema e riceve un piccolo raccordo di 18 ms al loop.

`artwork/audio-remix.json` registra hash di renderer, sorgenti ed export,
versioni degli strumenti e misure dei master e delle due codifiche decodificate.
I picchi riportati sono picchi dei campioni, non misure true-peak.
I master degli effetti raggiungono da −12 a −10 dBFS; la musica −8,5 dBFS,
con RMS di circa −23,55 dBFS. Nessun export decodificato raggiunge il clipping.

Per rigenerare: vedere [tools/README.md](../../tools/README.md#remix-audio).
Due render indipendenti con le versioni registrate hanno prodotto dodici file
identici byte per byte: [reproducibility.json](reproducibility.json).

## Verifiche

- `npm run test:audio`: 5 test Node e 2 flussi Chromium, desktop e telefono emulato.
- Entrambi i codec decodificati realmente nel browser: 12 file per flusso.
- Tutti i cinque effetti riprodotti dal sound manager Phaser con volume salvato.
- Musica sbloccata da mouse/touch: una sola istanza, loop reale oltre la fine.
- Muto indipendente di musica/effetti e ripristino dei volumi verificati.
- Livello 1 aperto e salto eseguito con tastiera/touch, con relativo suono.
- Nessun errore JavaScript o richiesta HTTP fallita nei due flussi.
- `npm run test:cleanup`: 7 controlli, inclusi collider, mappe e asset pubblici.
- `npm run build`: completato; rimane l'avviso Vite sulla dimensione del bundle Phaser.
- Build aperta nel browser: livello 1 raggiunto con tastiera, sei remix caricati
  senza errori. Pagina di confronto: dodici player e riproduzione verificata.

Risultati e screenshot: [checks.json](checks.json),
[production-checks.json](production-checks.json), `screens/`.
La prova telefono usa Chromium emulato; non costituisce una prova su iPhone
o Android fisico. La qualità timbrica resta valutabile nella pagina d'ascolto.
