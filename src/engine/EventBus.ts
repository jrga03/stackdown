import { EventMap } from './types';

type Callback<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private listeners: Map<keyof EventMap, Set<Callback<any>>> = new Map();

  on<K extends keyof EventMap>(
    event: K,
    callback: Callback<K>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      set!.delete(callback);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const callback of set) {
      callback(payload);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
