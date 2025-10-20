import { ReactNode } from 'react';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  CardTransform,
  DeckState,
  RingOptions,
  ShuffleOptions
} from '@deck/core';
import { StyleProp, ViewStyle } from 'react-native';

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
  style?: StyleProp<ViewStyle>;
  driver?: AnimationDriver;
  onFlip?: () => void | Promise<void>;
  onSelect?: () => void | Promise<void>;
  renderFace: (props: CardRenderProps) => ReactNode;
  renderBack: (props: CardRenderProps) => ReactNode;
}

export interface DeckViewActions {
  fan: () => Promise<void>;
  ring: (options?: RingOptions) => Promise<void>;
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
  renderCardFace: (props: CardRenderProps) => ReactNode;
  renderCardBack?: (props: CardRenderProps) => ReactNode;
  drawLimit?: number;
  defaultBackAsset?: string | number;
  ringRadius?: number;
  layoutMode?: 'stack' | 'fan' | 'grid';
  autoFan?: boolean;
  style?: StyleProp<ViewStyle>;
  onDeckReady?: (actions: DeckViewActions) => void;
}
