import { ReactNode } from 'react';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  CardTransform
} from '@deck/core';
import { WebMotionDriver } from './drivers/WebMotionDriver';

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
  onFlip?: () => void;
  onSelect?: () => void;
  renderFace: (props: CardRenderProps) => ReactNode;
  renderBack: (props: CardRenderProps) => ReactNode;
  driver?: WebMotionDriver;
}

export interface DeckViewActions {
  fan: () => Promise<void>;
  shuffle: () => Promise<void>;
  flip: (cardId: string) => Promise<void>;
  animateTo: (cardId: string, target: CardAnimationTarget) => Promise<void>;
  selectCard: (cardId: string) => Promise<void>;
  resetStack: () => Promise<void>;
}

export interface DeckViewProps {
  cards: CardData[];
  driver?: AnimationDriver;
  selectedIds?: string[];
  onSelectCard?: (cardId: string) => void;
  onFlipCard?: (cardId: string, faceUp: boolean) => void;
  renderCardFace: (props: CardRenderProps) => ReactNode;
  renderCardBack: (props: CardRenderProps) => ReactNode;
  autoFan?: boolean;
  onDeckReady?: (actions: DeckViewActions) => void;
  className?: string;
}
