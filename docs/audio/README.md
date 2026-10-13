# Clone Rush — audio originale per la pubblicazione

I sei eventi runtime (salto, morte, uscita, rimbalzo, chiave e musica) sono ora
generati da `tools/publishing/render-original-audio.py` con oscillatori e rumore
pseudo-casuale. Nessun campione, stem o melodia preesistente viene letto dal
renderer. Gli output OGG/MP3 sono in `public/assets/media/` con suffisso
`original-v2`; `artwork/audio-original-v2.json` registra durata e SHA-256.

Per rigenerare:

```sh
uv run --with numpy --with imageio-ffmpeg python tools/publishing/render-original-audio.py
npm run test:audio
```

I sei eventi, il volume configurabile e i trigger di gameplay sono verificati
dalla suite audio insieme alla riproduzione nel browser.
