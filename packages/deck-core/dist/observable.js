export class DeckObservable {
    constructor() {
        this.listeners = {};
    }
    on(type, listener) {
        const existing = this.listeners[type] ?? [];
        this.listeners[type] = [...existing, listener];
        return () => this.off(type, listener);
    }
    off(type, listener) {
        const existing = this.listeners[type] ?? [];
        this.listeners[type] = existing.filter((l) => l !== listener);
    }
    emit(event) {
        const listeners = this.listeners[event.type] ?? [];
        listeners.forEach((listener) => listener(event));
    }
}
