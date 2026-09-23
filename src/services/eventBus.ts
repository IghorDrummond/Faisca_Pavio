/** Barramento de eventos tipado entre serviços e cenas. */
export interface AppEvents {
  'settings:changed': { key: string };
  'app:pause': { reason: 'blur' | 'hidden' | 'fullscreen' | 'gamepad' | 'user' | 'context' };
  'app:resume': undefined;
  'gamepad:connected': { index: number; id: string };
  'gamepad:disconnected': { index: number };
  'device:changed': { player: number; device: 'keyboard' | 'gamepad' };
  'save:written': { slot: number };
  'pwa:update': undefined;
  'webgl:lost': undefined;
  'webgl:restored': undefined;
  'audio:unlocked': undefined;
}

type Handler<T> = (payload: T) => void;

class EventBusImpl {
  private handlers = new Map<keyof AppEvents, Set<Handler<unknown>>>();

  on<K extends keyof AppEvents>(key: K, fn: Handler<AppEvents[K]>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(fn as Handler<unknown>);
    return () => this.off(key, fn);
  }

  off<K extends keyof AppEvents>(key: K, fn: Handler<AppEvents[K]>): void {
    this.handlers.get(key)?.delete(fn as Handler<unknown>);
  }

  emit<K extends keyof AppEvents>(key: K, ...payload: AppEvents[K] extends undefined ? [] : [AppEvents[K]]): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const fn of [...set]) fn(payload[0]);
  }

  listenerCount(key: keyof AppEvents): number {
    return this.handlers.get(key)?.size ?? 0;
  }
}

export const EventBus = new EventBusImpl();
