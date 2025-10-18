export type CardId = string;

export interface CardData {
  id: CardId;
  name: string;
  description?: string;
  faceAsset?: string;
  backAsset?: string;
  metadata?: Record<string, unknown>;
}

export interface CardState {
  id: CardId;
  faceUp: boolean;
  selected: boolean;
  draggable?: boolean;
  data?: CardData;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface CardLayout extends Vector2 {
  scale: number;
  rotation: number;
  zIndex: number;
}

export interface CardTransform extends CardLayout {
  duration: number;
  easing?: EasingName;
  delay?: number;
}

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring';

export interface DeckStateConfig {
  fanAngle?: number;
  fanRadius?: number;
  spacing?: number;
  seed?: number;
  drawLimit?: number;
}

export type DeckLayoutMode = 'stack' | 'fan' | 'line' | 'custom';

export interface DeckState {
  cards: CardState[];
  drawnCards: CardState[];
  positions: Record<CardId, CardLayout>;
  config: Required<DeckStateConfig>;
  layoutMode: DeckLayoutMode;
}

export interface AnimationStep {
  cardId: CardId;
  target: CardTransform;
}

export interface AnimationSequence {
  steps: AnimationStep[];
  stagger?: number;
  meta?: AnimationSequenceMeta;
}

export type AnimationSequenceMeta =
  | undefined
  | {
      type: 'flip';
    }
  | {
      type: 'shuffle';
      restoreLayoutMode?: DeckLayoutMode;
    };

export interface FanOptions {
  origin?: Vector2;
  spreadAngle?: number;
  radius?: number;
}

export interface ShuffleOptions {
  iterations?: number;
  seed?: number;
  restoreLayout?: boolean;
  restoreLayoutMode?: DeckLayoutMode;
}

export interface AnimateToOptions {
  duration?: number;
  easing?: EasingName;
  delay?: number;
}

export interface FlipOptions {
  duration?: number;
  easing?: EasingName;
}

export interface DeckEventMap {
  select: { cardId: CardId; selected: boolean };
  flip: { cardId: CardId; faceUp: boolean };
  shuffle: { order: CardId[] };
  fan: { layouts: Record<CardId, CardLayout> };
  draw: { cardId: CardId; card: CardState };
}

export type DeckEventName = keyof DeckEventMap;

export interface DeckEvent<T extends DeckEventName = DeckEventName> {
  type: T;
  payload: DeckEventMap[T];
}

export interface AnimationDriver {
  play(sequence: AnimationSequence): Promise<void>;
  cancel?(cardIds?: CardId[]): void;
}
