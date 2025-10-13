import { DeckEvent, DeckEventName } from './models';

type Listener<T extends DeckEventName> = (event: DeckEvent<T>) => void;

type ListenerMap = Partial<Record<DeckEventName, Listener<DeckEventName>[]>>;

export class DeckObservable {
  private listeners: ListenerMap = {};

  on<T extends DeckEventName>(type: T, listener: Listener<T>): () => void {
    const existing = (this.listeners[type] as Listener<T>[] | undefined) ?? [];
    this.listeners[type] = [...existing, listener] as Listener<DeckEventName>[];
    return () => this.off(type, listener);
  }

  off<T extends DeckEventName>(type: T, listener: Listener<T>): void {
    const existing = (this.listeners[type] as Listener<T>[] | undefined) ?? [];
    this.listeners[type] = existing.filter((l) => l !== listener) as Listener<DeckEventName>[];
  }

  emit<T extends DeckEventName>(event: DeckEvent<T>): void {
    const listeners = (this.listeners[event.type] as Listener<T>[] | undefined) ?? [];
    listeners.forEach((listener) => listener(event));
  }
}
