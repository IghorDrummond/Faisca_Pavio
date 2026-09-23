import { type SaveData, newSave } from '../core/save';
import type { DifficultyId } from '../core/types';
import { onFlush } from '../platform/lifecycle';
import { SaveStore, type StorageMode } from '../platform/storage';
import { EventBus } from './eventBus';
import { Logger } from './logger';

/**
 * Estado global da partida (slot atual + save) e persistência.
 * Salvamento automático ao entrar/sair de batalhas, ao comprar e ao ocultar a aba.
 */
class GameStateImpl {
  readonly store = new SaveStore();
  save: SaveData | null = null;
  mode: StorageMode = 'memory';
  private sessionStart = 0;
  private pending: Promise<void> = Promise.resolve();
  private flushInstalled = false;

  async init(): Promise<StorageMode> {
    this.mode = await this.store.open();
    if (!this.flushInstalled) {
      this.flushInstalled = true;
      onFlush(() => void this.persist());
    }
    return this.mode;
  }

  async loadSlot(slot: number): Promise<{ ok: boolean; recovered: boolean; corrupt: boolean }> {
    const r = await this.store.load(slot);
    if (r.save) {
      this.save = r.save;
      this.sessionStart = performance.now();
    }
    return { ok: !!r.save, recovered: r.recovered, corrupt: r.corrupt };
  }

  async newGame(slot: number, difficulty: DifficultyId): Promise<void> {
    this.save = newSave(slot, difficulty, Date.now());
    this.sessionStart = performance.now();
    await this.persist();
  }

  /** Aplica uma alteração imutável e persiste. */
  update(fn: (s: SaveData) => SaveData): void {
    if (!this.save) return;
    this.save = fn(this.save);
    void this.persist();
  }

  private accumulateTime(): void {
    if (!this.save || !this.sessionStart) return;
    const now = performance.now();
    this.save = { ...this.save, playTime: this.save.playTime + (now - this.sessionStart) / 1000 };
    this.sessionStart = now;
  }

  persist(): Promise<void> {
    if (!this.save) return Promise.resolve();
    this.accumulateTime();
    const s = this.save;
    this.pending = this.pending
      .then(() => this.store.write(s))
      .then(() => EventBus.emit('save:written', { slot: s.slot }))
      .catch((e: unknown) => Logger.error('GameState', 'falha ao salvar', String(e)));
    return this.pending;
  }

  async listSlots(): Promise<(SaveData | null)[]> {
    const out: (SaveData | null)[] = [];
    for (let i = 0; i < 3; i++) out.push((await this.store.load(i)).save);
    return out;
  }
}

export const GameState = new GameStateImpl();
