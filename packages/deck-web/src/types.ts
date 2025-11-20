import { ReactNode } from 'react';
import {
  AnimationDriver,
  AnimationSequence,
  CardData,
  CardLayout,
  CardState,
  CardTransform,
  DeckState,
  FanOptions,
  RingOptions,
  ShuffleOptions
} from '@deck/core';
import { CSSProperties } from 'react';

export interface CardRenderProps {
  state: CardState;
  data: CardData;
  layout: CardLayout;
  isSelected: boolean;
}

export type CardAnimationTarget = CardTransform;

export interface CardViewProps {
  state: CardState;
  layout: CardLayout;
  isSelected: boolean;
  onFlip?: () => void | Promise<void>;
  onSelect?: () => void | Promise<void>;
  renderFace: (props: CardRenderProps) => ReactNode;
  renderBack: (props: CardRenderProps) => ReactNode;
  driver?: AnimationDriver;
}

export interface DeckViewActions {
  fan: (options?: FanOptions) => Promise<AnimationSequence | undefined>;
  ring: (options?: RingOptions) => Promise<AnimationSequence | undefined>;
  shuffle: (options?: ShuffleOptions) => Promise<AnimationSequence | undefined>;
  flip: (cardId: string) => Promise<AnimationSequence | undefined>;
  animateTo: (cardId: string, target: CardAnimationTarget) => Promise<AnimationSequence | undefined>;
  selectCard: (cardId: string) => Promise<boolean | undefined>;
  drawCard: (cardId: string) => Promise<{ card: CardState; sequence?: AnimationSequence } | undefined>;
  resetStack: () => Promise<AnimationSequence | undefined>;
}

export interface DeckViewProps {
  cards: CardData[];
  driver?: AnimationDriver;
  selectedIds?: string[];
  onSelectCard?: (cardId: string, selected: boolean) => void;
  onDrawCard?: (card: CardState) => void;
  onFlipCard?: (cardId: string, faceUp: boolean) => void;
  onDeckStateChange?: (state: DeckState) => void;
  drawLimit?: number;
  renderCardFace: (props: CardRenderProps) => ReactNode;
  renderCardBack?: (props: CardRenderProps) => ReactNode;
  autoFan?: boolean;
  onDeckReady?: (actions: DeckViewActions) => void;
  className?: string;
  defaultBackAsset?: string;
  ringRadius?: number;
  style?: CSSProperties;
  baselineMode?: boolean;
}
