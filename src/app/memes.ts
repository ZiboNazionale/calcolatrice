/**
 * I numeri "speciali": quando il risultato di un calcolo è uno di questi,
 * prima di mostrarlo parte il video. Per aggiungerne uno basta una riga qui sotto,
 * con un file in `public/` (video) oppure l'id di un video YouTube (youtube).
 */
export interface Meme {
  /** Nome per l'accessibilità (letto dagli screen reader). */
  nome: string;
  /** File del video dentro `public/`. */
  video?: string;
  /** Id del video YouTube (la parte dopo "watch?v="), mostrato con il player ufficiale. */
  youtube?: string;
  /** Riconosce il risultato, già formattato come testo (es. "67", "6.7"). */
  riconosce: (risultato: string) => boolean;
}

export const MEMES: Meme[] = [
  {
    nome: 'Six Seven',
    video: 'six-seven.mp4',
    // 67, 6,7 e anche 6767, 676767…
    riconosce: (r) => /^(?:6\.7|(?:67)+)$/.test(r),
  },
  {
    nome: 'Whats 9 + 10? 21',
    video: '21.mp4', // "21 Vine": un solo giro, stabilizzato, senza scritte
    riconosce: (r) => r === '21',
  },
  {
    nome: 'Sixty Nine',
    video: '69.mp4', // Michael Rosen: solo "click" e "nice"
    riconosce: (r) => r === '69' || r === '6.9',
  },
  {
    nome: '104',
    video: '104.mp4', // Ricky Berwick (AI) "Devo fare lo SPID"
    riconosce: (r) => r === '104',
  },
];

/** Il meme legato a un risultato, se c'è. */
export const memePer = (risultato: string): Meme | null => MEMES.find((m) => m.riconosce(risultato)) ?? null;
