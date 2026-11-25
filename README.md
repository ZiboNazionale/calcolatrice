# Calcolatrice

Una calcolatrice web con qualche sorpresa.

## Cosa fa

- Le quattro operazioni, con calcoli in catena, percentuale, cambio di segno e cancellazione dell'ultima cifra.
- Virgola all'italiana e risultati senza errori di arrotondamento (0,1 + 0,2 = 0,3).
- Si usa anche da tastiera: numeri, `+ - * /`, Invio, Backspace ed Esc.
- **Numeri speciali:** se il risultato è 67, 21, 69 o 104, prima del risultato parte un video meme (si può saltare).
- **Diviso zero:** un buco nero risucchia la calcolatrice e la chiude.

I video dei meme non sono nel repository, perché sono contenuti di terzi: vanno messi in `public/` con i nomi `six-seven.mp4`, `21.mp4`, `69.mp4` e `104.mp4`. Senza video la calcolatrice mostra subito il risultato.

## Sviluppo

```bash
npm ci
npm start      # http://localhost:4200
npm test
npm run build
```

Realizzata con Angular.
