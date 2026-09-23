import { Logger } from './logger';

/**
 * Serviços online OPCIONAIS (P2, offline-first). Implementação padrão "Offline": nada sai do navegador.
 * A implementação "Http" só é usada se a build definir VITE_ONLINE_API e o jogador consentir.
 */
export interface OnlineApi {
  readonly enabled: boolean;
  submitScore(boss: string, difficulty: string, timeSec: number, grade: string): void;
  sendTelemetry(ev: Record<string, unknown>): void;
}

class OfflineService implements OnlineApi {
  readonly enabled = false;
  submitScore(): void {
    /* offline: nada é enviado */
  }
  sendTelemetry(): void {
    /* offline: nada é enviado */
  }
}

class HttpService implements OnlineApi {
  readonly enabled = true;
  private readonly base: string;
  private queue: { path: string; body: unknown; tries: number }[] = [];
  private sending = false;

  constructor(base: string) {
    this.base = base.replace(/\/$/, '');
  }

  private enqueue(path: string, body: unknown): void {
    if (this.queue.length > 50) this.queue.shift();
    this.queue.push({ path, body, tries: 0 });
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.sending) return;
    this.sending = true;
    while (this.queue.length) {
      const item = this.queue[0]!;
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 3000);
        const r = await fetch(`${this.base}${item.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body), signal: ctl.signal });
        clearTimeout(to);
        if (!r.ok && r.status >= 500) throw new Error(`HTTP ${r.status}`);
        this.queue.shift();
      } catch (e) {
        item.tries++;
        if (item.tries > 4) this.queue.shift();
        Logger.debug('Online', 'falha no envio; nova tentativa com backoff', String(e));
        await new Promise((res) => setTimeout(res, 500 * 2 ** item.tries));
        break;
      }
    }
    this.sending = false;
  }

  submitScore(boss: string, difficulty: string, timeSec: number, grade: string): void {
    this.enqueue('/scores', { boss, difficulty, timeSec, grade });
  }

  sendTelemetry(ev: Record<string, unknown>): void {
    this.enqueue('/telemetry', ev);
  }
}

const apiBase = (import.meta.env.VITE_ONLINE_API as string | undefined) ?? '';
export const OnlineService: OnlineApi = apiBase ? new HttpService(apiBase) : new OfflineService();
