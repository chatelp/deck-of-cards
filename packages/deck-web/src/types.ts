import { ReactNode } from 'react';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  CardTransform,
  DeckState,
  ShuffleOptions
} from '@deck/core';

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
  fan: () => Promise<void>;
  ring: () => Promise<void>;
  shuffle: (options?: ShuffleOptions) => Promise<void>;
  flip: (cardId: string) => Promise<void>;
  animateTo: (cardId: string, target: CardAnimationTarget) => Promise<void>;
  selectCard: (cardId: string) => Promise<boolean | undefined>;
  drawCard: (cardId: string) => Promise<CardState | undefined>;
  resetStack: () => Promise<void>;
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
}
