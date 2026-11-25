import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';
import { MEMES, Meme, memePer } from './memes';

describe('App', () => {
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    app = TestBed.createComponent(App).componentInstance;
  });

  /** Preme i tasti come farebbe l'utente, es. premi('12+55='). */
  const premi = (tasti: string) => {
    for (const t of tasti) {
      if (/[0-9]/.test(t)) app.aggiungiNumero(t);
      else if (t === ',') app.aggiungiDecimale();
      else if (t === '=') app.calcola();
      else app.scegliOperazione(t as '+' | '-' | '*' | '/');
    }
  };

  it('mostra il titolo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Calcolatrice');
  });

  it('fa le quattro operazioni', () => {
    premi('12+30=');
    expect(app.display()).toBe('42');
    premi('9-12=');
    expect(app.display()).toBe('-3');
    premi('7*8=');
    expect(app.display()).toBe('56');
    premi('1/4=');
    expect(app.display()).toBe('0.25');
  });

  it('calcola in catena e mostra il calcolo in corso', () => {
    premi('2+3*');
    expect(app.display()).toBe('5');
    expect(app.espressione()).toBe('5 ×');
  });

  it('dà errore dividendo per zero', () => {
    premi('5/0=');
    expect(app.display()).toBe('Errore');
  });

  it('evita gli errori di arrotondamento', () => {
    premi('0,1+0,2=');
    expect(app.display()).toBe('0.3');
  });

  it('cancella l\'ultima cifra', () => {
    premi('123');
    app.cancellaUltima();
    expect(app.display()).toBe('12');
  });

  it('fa partire il video del 67 e poi mostra il risultato', () => {
    premi('60+7=');
    expect(app.meme()?.video).toBe('six-seven.mp4');
    expect(app.display()).toBe('7');
    app.terminaVideo();
    expect(app.meme()).toBeNull();
    expect(app.display()).toBe('67');
  });

  it('usa i video sistemati per il 21 e il 69', () => {
    premi('9+12=');
    expect(app.meme()?.video).toBe('21.mp4');
    app.terminaVideo();
    expect(app.display()).toBe('21');
    premi('60+9=');
    expect(app.meme()?.video).toBe('69.mp4');
  });

  describe('con un meme su YouTube', () => {
    const memeYoutube: Meme = { nome: 'Prova', youtube: 'abc123', riconosce: (r) => r === '777' };
    beforeEach(() => MEMES.push(memeYoutube));
    afterEach(() => MEMES.splice(MEMES.indexOf(memeYoutube), 1));

  it('usa il player di YouTube', () => {
    premi('700+77=');
    expect(String(app.youtubeUrl())).toContain('youtube-nocookie.com/embed/abc123');
  });

  it('mostra il risultato quando il video YouTube finisce', () => {
    premi('700+77=');
    app.messaggioYoutube(
      new MessageEvent('message', {
        origin: 'https://www.youtube-nocookie.com',
        data: JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }),
      }),
    );
    expect(app.meme()).toBeNull();
    expect(app.display()).toBe('777');
  });

  it('fa partire il video del 104', () => {
    premi('100+4=');
    expect(app.meme()?.video).toBe('104.mp4');
    app.terminaVideo();
    expect(app.display()).toBe('104');
  });

  it('chiude uno Short di YouTube quando ricomincia da capo', () => {
    premi('700+77=');
    const tempo = (t: number) =>
      app.messaggioYoutube(
        new MessageEvent('message', {
          origin: 'https://www.youtube-nocookie.com',
          data: JSON.stringify({ event: 'infoDelivery', info: { currentTime: t } }),
        }),
      );
    tempo(10);
    tempo(27.5);
    expect(app.meme()).not.toBeNull();
    tempo(0.2);
    expect(app.meme()).toBeNull();
    expect(app.display()).toBe('777');
  });
  });

  it('dividendo per zero apre il buco nero e poi chiude la calcolatrice', () => {
    vi.useFakeTimers();
    const chiudi = vi.spyOn(window, 'close').mockImplementation(() => {});
    try {
      premi('5/0=');
      expect(app.buconero()).toBe('risucchia');
      vi.advanceTimersByTime(3100);
      expect(app.buconero()).toBe('collassa');
      vi.advanceTimersByTime(1000);
      expect(app.buconero()).toBe('chiusa');
      expect(chiudi).toHaveBeenCalled();
      app.riapri();
      expect(app.buconero()).toBeNull();
      expect(app.display()).toBe('0');
    } finally {
      chiudi.mockRestore();
      vi.useRealTimers();
    }
  });

  it('non fa partire il video per i risultati intermedi', () => {
    premi('60+7+');
    expect(app.meme()).toBeNull();
    expect(app.display()).toBe('67');
  });

  it('riconosce i numeri speciali', () => {
    expect(memePer('67')?.nome).toBe('Six Seven');
    expect(memePer('6.7')?.nome).toBe('Six Seven');
    expect(memePer('6767')?.nome).toBe('Six Seven');
    expect(memePer('21')?.nome).toBe('Whats 9 + 10? 21');
    expect(memePer('69')?.nome).toBe('Sixty Nine');
    expect(memePer('104')?.nome).toBe('104');
    expect(memePer('68')).toBeNull();
  });
});
