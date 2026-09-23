import type { BattleSim } from '../core/battle';
import { GameState } from './gameState';
import { OnlineService } from './online';
import { SettingsService } from './settings';

interface ParamsLike {
  kind: string;
  id: string;
  difficulty: string;
  coop: boolean;
}

/**
 * Telemetria LOCAL por padrão (IndexedDB): início de batalha, mortes (ataque/fase/tempo), vitórias, retries.
 * Nunca registra dados pessoais. Envio remoto só com consentimento explícito (opt-in).
 */
export const Telemetry = {
  record(ev: Record<string, unknown>): void {
    const e = { ...ev, t: Date.now(), v: __APP_VERSION__ };
    void GameState.store.appendTelemetry(e).catch(() => undefined);
    if (SettingsService.get('telemetryOptIn')) OnlineService.sendTelemetry(e);
  },
  battleStart(p: ParamsLike): void {
    this.record({ type: 'start', id: p.id, diff: p.difficulty, coop: p.coop });
  },
  death(p: ParamsLike, sim: BattleSim): void {
    this.record({
      type: 'death',
      id: p.id,
      diff: p.difficulty,
      phase: sim.boss?.phase.id ?? '',
      attack: sim.lastHitAttack,
      time: Math.round(sim.fightTicks / 6) / 10,
      progress: Math.round(sim.progress * 100),
    });
  },
  retry(p: ParamsLike): void {
    this.record({ type: 'retry', id: p.id, diff: p.difficulty });
  },
  victory(p: ParamsLike, timeSec: number): void {
    this.record({ type: 'victory', id: p.id, diff: p.difficulty, time: Math.round(timeSec * 10) / 10 });
  },
  rank(id: string, grade: string): void {
    this.record({ type: 'rank', id, grade });
  },
  /** Relatório "ataques que mais matam" a partir da telemetria local. */
  async deadliestAttacks(): Promise<{ attack: string; deaths: number }[]> {
    const all = await GameState.store.readTelemetry();
    const m = new Map<string, number>();
    for (const e of all) if (e.type === 'death') m.set(String(e.attack), (m.get(String(e.attack)) ?? 0) + 1);
    return [...m.entries()].map(([attack, deaths]) => ({ attack, deaths })).sort((a, b) => b.deaths - a.deaths);
  },
};
