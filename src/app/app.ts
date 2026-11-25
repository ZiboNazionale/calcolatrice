import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Meme, memePer } from './memes';

type Operazione = '+' | '-' | '*' | '/';

const SIMBOLI: Record<Operazione, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** Quante cifre si possono scrivere al massimo in un numero. */
const MAX_CIFRE = 15;

/** Le fasi del buco nero che si apre dividendo per zero. */
type BucoNero = 'risucchia' | 'collassa' | 'chiusa';

/** Quando il buco nero collassa e quando l'app si chiude (ms dall'inizio). */
const COLLASSO_MS = 3000;
const CHIUSURA_MS = 3900;

/** Quanti frammenti di "materia" vengono risucchiati insieme ai tasti. */
const DETRITI = 70;

/** Un frammento risucchiato: dove parte, quanto è grande e il suo percorso a spirale. */
interface Detrito {
  x: number;
  y: number;
  size: number;
  dx: string;
  dy: string;
  mx: string;
  my: string;
  giro: string;
  ritardo: string;
}

/**
 * Il percorso a spirale verso il buco per un oggetto che sta a (vx, vy) dal centro:
 * a metà strada è già girato di 70° attorno al buco, alla fine è nel centro.
 */
const spirale = (vx: number, vy: number) => {
  const angolo = (70 * Math.PI) / 180;
  return {
    dx: `${-vx}px`,
    dy: `${-vy}px`,
    mx: `${0.5 * (vx * Math.cos(angolo) - vy * Math.sin(angolo)) - vx}px`,
    my: `${0.5 * (vx * Math.sin(angolo) + vy * Math.cos(angolo)) - vy}px`,
    giro: `${360 + Math.random() * 360}deg`,
  };
};

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown)': 'tastiera($event)',
    '(window:message)': 'messaggioYoutube($event)',
    '[class.terremoto]': "buconero() === 'risucchia'",
  },
})
export class App {
  display = signal('0');
  /** Il video da mostrare prima del risultato, se il numero è "speciale". */
  meme = signal<Meme | null>(null);
  mostraVideo = computed(() => this.meme() !== null);

  private readonly sanitizer = inject(DomSanitizer);

  /** Indirizzo del player YouTube per i meme che stanno su YouTube. */
  youtubeUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.meme()?.youtube;
    if (!id) return null;
    const origin = typeof location === 'undefined' ? '' : location.origin;
    const url =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` +
      `?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
  servePlay = signal(false);
  private readonly memeVideo = viewChild<ElementRef<HTMLVideoElement>>('memeVideo');

  /** Il pulsante "Riproduci con audio", quando il browser blocca l'avvio automatico. */
  riproduci() {
    const video = this.memeVideo()?.nativeElement;
    if (video) this.avviaVideo(video);
  }

  /** Il calcolo in corso, mostrato sopra il risultato (es. "12 +"). */
  espressione = signal('');

  /** Dividendo per zero si apre un buco nero che si mangia la calcolatrice. */
  buconero = signal<BucoNero | null>(null);
  detriti = signal<Detrito[]>([]);
  private readonly calcolatrice = viewChild<ElementRef<HTMLElement>>('calcolatrice');
  private timerBucoNero: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timerBucoNero.forEach(clearTimeout));
  }

  private primoNumero: number | null = null;
  private operazione: Operazione | null = null;
  private nuovoNumero = false;
  private risultatoInAttesa: string | null = null;
  /** Fin dove è arrivato il video YouTube, per capire quando ricomincia. */
  private ultimoTempo = 0;

  aggiungiNumero(numero: string) {
    if (this.mostraVideo()) return;

    if (this.nuovoNumero || this.display() === 'Errore') {
      this.display.set(numero);
      this.nuovoNumero = false;
    } else if (this.display() === '0') {
      this.display.set(numero);
    } else if (this.display().replace(/[-.]/g, '').length < MAX_CIFRE) {
      this.display.update((valore) => valore + numero);
    }
  }

  aggiungiDecimale() {
    if (this.mostraVideo()) return;

    if (this.nuovoNumero || this.display() === 'Errore') {
      this.display.set('0.');
      this.nuovoNumero = false;
    } else if (!this.display().includes('.')) {
      this.display.update((valore) => valore + '.');
    }
  }

  /** Cancella l'ultima cifra scritta. */
  cancellaUltima() {
    if (this.mostraVideo() || this.nuovoNumero || this.display() === 'Errore') return;

    const valore = this.display().slice(0, -1);
    this.display.set(valore === '' || valore === '-' ? '0' : valore);
  }

  cancella() {
    this.meme.set(null);
    this.servePlay.set(false);
    this.risultatoInAttesa = null;
    this.display.set('0');
    this.espressione.set('');
    this.primoNumero = null;
    this.operazione = null;
    this.nuovoNumero = false;
  }

  cambiaSegno() {
    if (this.mostraVideo() || this.display() === 'Errore') return;

    this.display.set(this.formatta(-Number(this.display())));
  }

  percentuale() {
    if (this.mostraVideo() || this.display() === 'Errore') return;

    this.mostraRisultato(Number(this.display()) / 100);
  }

  scegliOperazione(operazione: Operazione) {
    if (this.mostraVideo() || this.display() === 'Errore') return;

    if (this.operazione !== null && !this.nuovoNumero) {
      // I risultati intermedi non fanno partire il video.
      this.calcola(false);

      if (this.display() === 'Errore') return;
    }

    this.primoNumero = Number(this.display());
    this.operazione = operazione;
    this.nuovoNumero = true;
    this.espressione.set(`${this.leggibile(this.display())} ${SIMBOLI[operazione]}`);
  }

  calcola(conMeme = true) {
    if (this.mostraVideo() || this.primoNumero === null || this.operazione === null || this.nuovoNumero) {
      return;
    }

    const secondoNumero = Number(this.display());

    if (this.operazione === '/' && secondoNumero === 0) {
      this.apriBucoNero();
      return;
    }

    let risultato: number;

    switch (this.operazione) {
      case '+':
        risultato = this.primoNumero + secondoNumero;
        break;
      case '-':
        risultato = this.primoNumero - secondoNumero;
        break;
      case '*':
        risultato = this.primoNumero * secondoNumero;
        break;
      case '/':
        risultato = secondoNumero === 0 ? NaN : this.primoNumero / secondoNumero;
        break;
    }

    this.espressione.set(conMeme ? `${this.espressione()} ${this.leggibile(this.display())} =` : '');
    this.primoNumero = null;
    this.operazione = null;
    this.nuovoNumero = true;

    if (!Number.isFinite(risultato)) {
      this.mostraRisultato(risultato);
      return;
    }

    const testo = this.formatta(risultato);
    const meme = conMeme ? memePer(testo) : null;

    if (meme) {
      // Conserviamo il risultato e lo mostriamo quando il video finisce.
      this.risultatoInAttesa = testo;
      this.servePlay.set(false);
      this.meme.set(meme);
    } else {
      this.display.set(testo);
    }
  }

  async avviaVideo(video: HTMLVideoElement) {
    if (!this.mostraVideo()) return;

    try {
      await video.play();
      this.servePlay.set(false);
    } catch {
      // Se il browser blocca l'audio automatico, mostriamo Play.
      if (this.mostraVideo()) {
        this.servePlay.set(true);
      }
    }
  }

  terminaVideo() {
    const risultato = this.risultatoInAttesa;

    this.risultatoInAttesa = null;
    this.ultimoTempo = 0;
    this.meme.set(null);
    this.servePlay.set(false);

    if (risultato !== null) {
      this.display.set(risultato);
    }
  }

  /** Chiede al player YouTube di avvisarci quando il video finisce. */
  ascoltaYoutube(frame: HTMLIFrameElement) {
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'meme', channel: 'widget' }), '*');
  }

  /** Il player YouTube manda messaggi: allo stato 0 (finito) o in caso di errore mostriamo il risultato. */
  messaggioYoutube(evento: MessageEvent) {
    if (!this.meme()?.youtube || !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(evento.origin)) return;
    try {
      const dati = typeof evento.data === 'string' ? JSON.parse(evento.data) : evento.data;
      const tempo = dati?.info?.currentTime;
      // Gli Shorts ripartono da capo senza mai dire "finito": se il tempo torna indietro, il giro è finito.
      const ricominciato = typeof tempo === 'number' && tempo < this.ultimoTempo - 1;
      if (typeof tempo === 'number') this.ultimoTempo = tempo;
      if (dati?.event === 'onError' || dati?.info?.playerState === 0 || ricominciato) this.terminaVideo();
    } catch {
      // Messaggi non nostri: li ignoriamo.
    }
  }

  /**
   * Divisione per zero: si apre un buco nero al centro dello schermo che risucchia
   * a spirale tutti gli elementi (prima i più vicini), poi collassa e l'app si "chiude".
   */
  private apriBucoNero() {
    this.cancella();
    this.display.set('Errore');
    this.nuovoNumero = true;

    const calcolatrice = this.calcolatrice()?.nativeElement;
    const pochiMovimenti = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (calcolatrice && typeof innerWidth === 'number') {
      const cx = innerWidth / 2;
      const cy = innerHeight / 2;
      const elementi = [...calcolatrice.querySelectorAll<HTMLElement>('h1, .display, .keypad button, .hint')];
      const distanze = elementi.map((el) => {
        const r = el.getBoundingClientRect();
        return { el, vx: r.left + r.width / 2 - cx, vy: r.top + r.height / 2 - cy };
      });
      const massima = Math.max(1, ...distanze.map(({ vx, vy }) => Math.hypot(vx, vy)));

      for (const { el, vx, vy } of distanze) {
        for (const [nome, valore] of Object.entries(spirale(vx, vy))) el.style.setProperty(`--${nome}`, valore);
        el.style.setProperty('--ritardo', `${300 + (Math.hypot(vx, vy) / massima) * 900}ms`);
        el.classList.add('risucchia');
      }

      // Frammenti di materia strappati da tutto lo schermo, dai bordi verso il centro.
      if (!pochiMovimenti) {
        const raggio = Math.hypot(cx, cy);
        this.detriti.set(
          Array.from({ length: DETRITI }, () => {
            const a = Math.random() * 2 * Math.PI;
            const r = raggio * (0.45 + Math.random() * 0.6);
            const vx = Math.cos(a) * r;
            const vy = Math.sin(a) * r;
            return {
              x: cx + vx,
              y: cy + vy,
              size: 2 + Math.random() * 7,
              ...spirale(vx, vy),
              ritardo: `${Math.random() * 1500}ms`,
            };
          }),
        );
      }
    }

    this.buconero.set('risucchia');
    this.timerBucoNero.forEach(clearTimeout);
    this.timerBucoNero = [
      setTimeout(() => this.buconero.set('collassa'), pochiMovimenti ? 300 : COLLASSO_MS),
      setTimeout(() => this.chiudi(), pochiMovimenti ? 600 : CHIUSURA_MS),
    ];
  }

  /**
   * Dopo il buco nero l'app si chiude da sola. I browser lasciano chiudere solo le finestre
   * aperte da uno script (o l'app installata): altrimenti resta lo schermo nero.
   */
  private chiudi() {
    this.detriti.set([]);
    this.buconero.set('chiusa');
    try {
      window.close();
    } catch {
      // Il browser non lo permette: resta il nero.
    }
  }

  /** Riapre la calcolatrice dopo che il buco nero l'ha chiusa. */
  riapri() {
    this.timerBucoNero.forEach(clearTimeout);
    this.timerBucoNero = [];
    this.detriti.set([]);
    this.buconero.set(null);
    this.cancella();
  }

  /** Si può usare anche la tastiera del computer. */
  tastiera(evento: KeyboardEvent) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const tasto = evento.key;

    if (this.buconero()) {
      if (this.buconero() === 'chiusa' && (tasto === 'Enter' || tasto === 'Escape' || tasto === ' ')) {
        evento.preventDefault();
        this.riapri();
      }
      return;
    }

    if (this.mostraVideo()) {
      if (tasto === 'Escape' || tasto === 'Enter' || tasto === ' ') {
        evento.preventDefault();
        this.terminaVideo();
      }
      return;
    }

    if (/^[0-9]$/.test(tasto)) this.aggiungiNumero(tasto);
    else if (tasto === ',' || tasto === '.') this.aggiungiDecimale();
    else if (tasto === '+' || tasto === '-' || tasto === '*' || tasto === '/') this.scegliOperazione(tasto);
    else if (tasto === 'Enter' || tasto === '=') this.calcola();
    else if (tasto === 'Backspace') this.cancellaUltima();
    else if (tasto === 'Escape' || tasto === 'Delete') this.cancella();
    else if (tasto === '%') this.percentuale();
    else return;

    // Evita che Invio "clicchi" anche il pulsante che ha il focus.
    evento.preventDefault();
  }

  /** Il numero come lo leggiamo in Italia: virgola per i decimali. */
  leggibile(valore: string): string {
    return valore.replace('.', ',');
  }

  private formatta(valore: number): string {
    return String(Number(valore.toPrecision(12)));
  }

  private mostraRisultato(valore: number) {
    if (!Number.isFinite(valore)) {
      this.cancella();
      this.display.set('Errore');
      this.nuovoNumero = true;
      return;
    }

    this.display.set(this.formatta(valore));
  }
}
