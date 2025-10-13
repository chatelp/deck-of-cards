import { DeckEvent, DeckEventName } from './models';
type Listener<T extends DeckEventName> = (event: DeckEvent<T>) => void;
export declare class DeckObservable {
    private listeners;
    on<T extends DeckEventName>(type: T, listener: Listener<T>): () => void;
    off<T extends DeckEventName>(type: T, listener: Listener<T>): void;
    emit<T extends DeckEventName>(event: DeckEvent<T>): void;
}
export {};
//# sourceMappingURL=observable.d.ts.map