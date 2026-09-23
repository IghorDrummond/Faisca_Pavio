import { type SaveData, parseSave } from '../core/save';
import { Logger } from '../services/logger';

const DB_NAME = 'faisca-e-pavio';
const DB_VERSION = 1;
const STORE = 'saves';
const TELEMETRY = 'telemetry';

export type StorageMode = 'indexeddb' | 'memory';

interface Rec {
  key: string;
  data: unknown;
}

/**
 * Persistência de saves em IndexedDB. Cada slot tem a chave principal e um backup
 * com a última versão válida; ambos são escritos numa única transação.
 * Sem IndexedDB (modos restritos), usa memória e avisa o jogador.
 */
export class SaveStore {
  private db: IDBDatabase | null = null;
  private memory = new Map<string, unknown>();
  mode: StorageMode = 'memory';
  private readonly factory: IDBFactory | null;

  constructor(factory?: IDBFactory | null) {
    this.factory = factory === undefined ? (typeof indexedDB !== 'undefined' ? indexedDB : null) : factory;
  }

  async open(): Promise<StorageMode> {
    if (!this.factory) {
      this.mode = 'memory';
      return this.mode;
    }
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = this.factory!.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
          if (!db.objectStoreNames.contains(TELEMETRY)) db.createObjectStore(TELEMETRY, { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB falhou'));
        req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
      });
      this.mode = 'indexeddb';
    } catch (e) {
      Logger.warn('Storage', 'IndexedDB indisponível; usando memória', String(e));
      this.db = null;
      this.mode = 'memory';
    }
    return this.mode;
  }

  private tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }
      const t = this.db.transaction(store, mode);
      const s = t.objectStore(store);
      let result: T | undefined;
      const r = fn(s);
      if (r) r.onsuccess = () => (result = r.result);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error ?? new Error('transação falhou'));
      t.onabort = () => reject(t.error ?? new Error('transação abortada'));
    });
  }

  private async getRaw(key: string): Promise<unknown> {
    if (this.mode === 'memory') return this.memory.get(key);
    const r = await this.tx<Rec | undefined>(STORE, 'readonly', (s) => s.get(key) as IDBRequest<Rec | undefined>);
    return r?.data;
  }

  /** Carrega um slot; se corrompido, tenta o backup; se falhar, retorna null e sinaliza. */
  async load(slot: number): Promise<{ save: SaveData | null; recovered: boolean; corrupt: boolean }> {
    const main = await this.getRaw(`slot${slot}`);
    if (main === undefined || main === null) return { save: null, recovered: false, corrupt: false };
    try {
      return { save: parseSave(main), recovered: false, corrupt: false };
    } catch (e) {
      Logger.warn('Storage', `slot ${slot} corrompido; tentando backup`, String(e));
      const bak = await this.getRaw(`slot${slot}.bak`);
      if (bak !== undefined) {
        try {
          const s = parseSave(bak);
          await this.write(s);
          return { save: s, recovered: true, corrupt: true };
        } catch (e2) {
          Logger.error('Storage', `backup do slot ${slot} também inválido`, String(e2));
        }
      }
      return { save: null, recovered: false, corrupt: true };
    }
  }

  /** Escreve o slot e mantém a versão anterior válida como backup (transação única). */
  async write(s: SaveData): Promise<void> {
    const data: SaveData = { ...s, updatedAt: Date.now() };
    parseSave(data); // nunca grava dado inválido
    const key = `slot${s.slot}`;
    if (this.mode === 'memory') {
      const prev = this.memory.get(key);
      if (prev) this.memory.set(`${key}.bak`, prev);
      this.memory.set(key, structuredClone(data));
      return;
    }
    await this.tx(STORE, 'readwrite', (st) => {
      const get = st.get(key) as IDBRequest<Rec | undefined>;
      get.onsuccess = () => {
        const prev = get.result;
        if (prev) {
          try {
            parseSave(prev.data);
            st.put({ key: `${key}.bak`, data: prev.data });
          } catch {
            /* anterior inválido: não vira backup */
          }
        }
        st.put({ key, data });
      };
    });
  }

  async remove(slot: number): Promise<void> {
    const key = `slot${slot}`;
    if (this.mode === 'memory') {
      this.memory.delete(key);
      this.memory.delete(`${key}.bak`);
      return;
    }
    await this.tx(STORE, 'readwrite', (st) => {
      st.delete(key);
      st.delete(`${key}.bak`);
    });
  }

  /** Grava bruto (apenas para testes de corrupção). */
  async writeRawForTest(key: string, data: unknown): Promise<void> {
    if (this.mode === 'memory') {
      this.memory.set(key, data);
      return;
    }
    await this.tx(STORE, 'readwrite', (st) => void st.put({ key, data }));
  }

  // ---- telemetria local
  async appendTelemetry(ev: Record<string, unknown>): Promise<void> {
    if (this.mode === 'memory') return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.tx(TELEMETRY, 'readwrite', (st) => void st.put({ key, data: ev }));
  }

  async readTelemetry(): Promise<Record<string, unknown>[]> {
    if (this.mode === 'memory') return [];
    const all = await this.tx<Rec[]>(TELEMETRY, 'readonly', (st) => st.getAll() as IDBRequest<Rec[]>);
    return (all ?? []).map((r) => r.data as Record<string, unknown>);
  }

  async clearTelemetry(): Promise<void> {
    if (this.mode === 'memory') return;
    await this.tx(TELEMETRY, 'readwrite', (st) => void st.clear());
  }
}

/** Pede armazenamento persistente (quando suportado). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* sem suporte */
  }
  return false;
}
